-- Laus Sit: endurecimento de storage/pagamentos e operações atômicas.
-- Esta migration é aditiva. Não remove colunas ou dados legados.

-- Originais ficam em bucket privado; product-images continua público apenas
-- para resultados finais. A coluna antiga original_image_url permanece apenas
-- por compatibilidade e deixa de ser preenchida pela aplicação.
alter table public.products
  add column if not exists original_image_path text;

-- RLS filtra linhas, não colunas. Removemos o SELECT de tabela e devolvemos
-- somente as colunas públicas para impedir acesso direto pelo Data API.
revoke select on public.products from anon, authenticated;
grant select (
  id, name, slug, category, price, promotional_price, short_description,
  description, fabric, composition, thread_type, gsm, fit, printing_method,
  finish, technical_notes, care_instructions, observations, active, sort_order,
  main_image_url, main_image_alt, processed_image_url, created_at, updated_at
) on public.products to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-originals',
  'product-originals',
  false,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'brand-assets';

drop policy if exists "admins read private product originals" on storage.objects;
drop policy if exists "admins upload private product originals" on storage.objects;
drop policy if exists "admins update private product originals" on storage.objects;
drop policy if exists "admins delete private product originals" on storage.objects;

create policy "admins read private product originals"
on storage.objects for select to authenticated
using (bucket_id = 'product-originals' and (select public.is_admin()));

create policy "admins upload private product originals"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-originals' and (select public.is_admin()));

create policy "admins update private product originals"
on storage.objects for update to authenticated
using (bucket_id = 'product-originals' and (select public.is_admin()))
with check (bucket_id = 'product-originals' and (select public.is_admin()));

create policy "admins delete private product originals"
on storage.objects for delete to authenticated
using (bucket_id = 'product-originals' and (select public.is_admin()));

-- Idempotência de checkout e trilha normalizada de pagamentos.
alter table public.orders
  add column if not exists checkout_attempt_id uuid,
  add column if not exists checkout_fingerprint text;

create unique index if not exists orders_checkout_attempt_id_uidx
  on public.orders (checkout_attempt_id)
  where checkout_attempt_id is not null;

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  external_payment_id text not null unique,
  status text not null,
  status_detail text,
  transaction_amount numeric(10,2) not null check (transaction_amount >= 0),
  payment_method text,
  payment_type text,
  date_approved timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists payment_attempts_order_id_idx
  on public.payment_attempts (order_id, last_seen_at desc);

alter table public.payment_attempts enable row level security;

drop policy if exists "admins read payment attempts" on public.payment_attempts;
create policy "admins read payment attempts"
on public.payment_attempts for select to authenticated
using ((select public.is_admin()));

revoke all on public.payment_attempts from anon;
grant select on public.payment_attempts to authenticated;
grant all on public.payment_attempts to service_role;

-- Uma chamada repetida atualiza a mesma tentativa. O estado consolidado do
-- pedido só regride de approved quando o MESMO pagamento vira reversão.
create or replace function public.record_mercado_pago_payment(
  p_order_id uuid,
  p_payment_id text,
  p_status text,
  p_status_detail text,
  p_transaction_amount numeric,
  p_payment_method text,
  p_payment_type text,
  p_date_approved timestamptz
)
returns table(order_id uuid, payment_status text, changed boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_amount_matches boolean;
  v_effective_status text;
  v_should_change boolean := true;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido associado ao pagamento não encontrado.';
  end if;

  v_amount_matches := round(v_order.total_amount * 100) = round(coalesce(p_transaction_amount, 0) * 100);
  v_effective_status := case when v_amount_matches then coalesce(nullif(p_status, ''), 'pending') else 'amount_mismatch' end;

  if exists (
    select 1 from public.payment_attempts pa
    where pa.external_payment_id = p_payment_id and pa.order_id <> p_order_id
  ) then
    raise exception 'Pagamento já associado a outro pedido.';
  end if;

  insert into public.payment_attempts (
    order_id, external_payment_id, status, status_detail, transaction_amount,
    payment_method, payment_type, date_approved
  ) values (
    p_order_id, p_payment_id, v_effective_status,
    case when v_amount_matches then p_status_detail else 'Valor recebido diverge do pedido.' end,
    coalesce(p_transaction_amount, 0), p_payment_method, p_payment_type, p_date_approved
  )
  on conflict (external_payment_id) do update
  set status = excluded.status,
      status_detail = excluded.status_detail,
      transaction_amount = excluded.transaction_amount,
      payment_method = excluded.payment_method,
      payment_type = excluded.payment_type,
      date_approved = coalesce(public.payment_attempts.date_approved, excluded.date_approved),
      last_seen_at = now()
  where public.payment_attempts.order_id = excluded.order_id;

  if v_order.payment_status = 'approved'
     and coalesce(v_order.mercado_pago_payment_id, '') <> p_payment_id then
    v_should_change := false;
  elsif v_order.payment_status in ('refunded', 'charged_back') then
    v_should_change := false;
  elsif v_order.payment_status = 'approved'
     and v_order.mercado_pago_payment_id = p_payment_id
     and v_effective_status not in ('approved', 'refunded', 'charged_back') then
    v_should_change := false;
  end if;

  if v_should_change then
    update public.orders
    set payment_status = v_effective_status,
        payment_status_detail = case when v_amount_matches then p_status_detail else 'Valor recebido diverge do pedido.' end,
        mercado_pago_payment_id = p_payment_id,
        mercado_pago_payment_method = p_payment_method,
        mercado_pago_payment_type = p_payment_type,
        paid_at = case
          when v_effective_status = 'approved' then coalesce(v_order.paid_at, p_date_approved, now())
          else v_order.paid_at
        end,
        checkout_error = null
    where id = p_order_id;
  end if;

  return query
  select p_order_id,
         case when v_should_change then v_effective_status else v_order.payment_status end,
         v_should_change;
end;
$$;

revoke all on function public.record_mercado_pago_payment(uuid, text, text, text, numeric, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_mercado_pago_payment(uuid, text, text, text, numeric, text, text, timestamptz) to service_role;

-- O piso de venda do admin passa a ser o mesmo do checkout.
alter table public.products
  drop constraint if exists products_active_price_floor,
  drop constraint if exists products_active_promotional_price_floor;

alter table public.products
  add constraint products_active_price_floor
    check (not active or price >= 0.50),
  add constraint products_active_promotional_price_floor
    check (not active or promotional_price is null or promotional_price >= 0.50);

-- RPC transacional: produto e todas as relações salvam ou revertem juntos.
create or replace function public.save_product_with_relations(p_product jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_product->>'id', '')::uuid;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Acesso administrativo necessário.';
  end if;

  if v_id is null then
    insert into public.products (
      name, slug, category, price, promotional_price, short_description,
      description, active, sort_order, main_image_url, main_image_alt, fabric,
      composition, thread_type, gsm, fit, printing_method, finish,
      technical_notes, care_instructions, observations
    ) values (
      p_product->>'name', p_product->>'slug', p_product->>'category',
      (p_product->>'price')::numeric, nullif(p_product->>'promotionalPrice', '')::numeric,
      p_product->>'shortDescription', p_product->>'description',
      (p_product->>'active')::boolean, (p_product->>'sortOrder')::integer,
      p_product->>'mainImageUrl', p_product->>'mainImageAlt', p_product->>'fabric',
      p_product->>'composition', p_product->>'threadType', p_product->>'gsm',
      p_product->>'fit', p_product->>'printingMethod', p_product->>'finish',
      p_product->>'technicalNotes', p_product->>'careInstructions', p_product->>'observations'
    ) returning id into v_id;
  else
    update public.products set
      name = p_product->>'name', slug = p_product->>'slug', category = p_product->>'category',
      price = (p_product->>'price')::numeric,
      promotional_price = nullif(p_product->>'promotionalPrice', '')::numeric,
      short_description = p_product->>'shortDescription', description = p_product->>'description',
      active = (p_product->>'active')::boolean, sort_order = (p_product->>'sortOrder')::integer,
      main_image_url = p_product->>'mainImageUrl', main_image_alt = p_product->>'mainImageAlt',
      fabric = p_product->>'fabric', composition = p_product->>'composition',
      thread_type = p_product->>'threadType', gsm = p_product->>'gsm', fit = p_product->>'fit',
      printing_method = p_product->>'printingMethod', finish = p_product->>'finish',
      technical_notes = p_product->>'technicalNotes', care_instructions = p_product->>'careInstructions',
      observations = p_product->>'observations'
    where id = v_id;
    if not found then raise exception 'Produto não encontrado.'; end if;
  end if;

  delete from public.product_images where product_id = v_id;
  delete from public.product_colors where product_id = v_id;
  delete from public.product_sizes where product_id = v_id;
  delete from public.product_measurements where product_id = v_id;

  insert into public.product_images(product_id, image_url, alt_text, sort_order)
  select v_id, item->>'url', coalesce(item->>'alt', ''), ordinality - 1
  from jsonb_array_elements(coalesce(p_product->'images', '[]'::jsonb)) with ordinality as x(item, ordinality);

  insert into public.product_colors(product_id, name, hex, sort_order)
  select v_id, item->>'name', nullif(item->>'hex', ''), ordinality - 1
  from jsonb_array_elements(coalesce(p_product->'colors', '[]'::jsonb)) with ordinality as x(item, ordinality);

  insert into public.product_sizes(product_id, name, sort_order)
  select v_id, value, ordinality - 1
  from jsonb_array_elements_text(coalesce(p_product->'sizes', '[]'::jsonb)) with ordinality as x(value, ordinality);

  insert into public.product_measurements(product_id, size, width, length, extra, sort_order)
  select v_id, item->>'size', (item->>'width')::numeric, (item->>'length')::numeric,
         coalesce(item->'extra', '{}'::jsonb), ordinality - 1
  from jsonb_array_elements(coalesce(p_product->'measurements', '[]'::jsonb)) with ordinality as x(item, ordinality);

  return v_id;
end;
$$;

revoke all on function public.save_product_with_relations(jsonb) from public, anon;
grant execute on function public.save_product_with_relations(jsonb) to authenticated;

create or replace function public.duplicate_product_with_relations(p_source_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new_id uuid;
  v_suffix text := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Acesso administrativo necessário.';
  end if;

  insert into public.products (
    name, slug, category, price, promotional_price, short_description,
    description, fabric, composition, thread_type, gsm, fit, printing_method,
    finish, technical_notes, care_instructions, observations, active, sort_order,
    main_image_url, main_image_alt, processed_image_url
  )
  select
    name || ' — cópia', slug || '-copia-' || v_suffix,
    category, price, promotional_price, short_description, description, fabric,
    composition, thread_type, gsm, fit, printing_method, finish, technical_notes,
    care_instructions, observations, false, sort_order + 1,
    main_image_url, main_image_alt, processed_image_url
  from public.products where id = p_source_id
  returning id into v_new_id;
  if v_new_id is null then raise exception 'Produto não encontrado.'; end if;

  insert into public.product_images(product_id, image_url, alt_text, sort_order)
  select v_new_id, image_url, alt_text, sort_order from public.product_images where product_id = p_source_id;
  insert into public.product_colors(product_id, name, hex, sort_order)
  select v_new_id, name, hex, sort_order from public.product_colors where product_id = p_source_id;
  insert into public.product_sizes(product_id, name, sort_order)
  select v_new_id, name, sort_order from public.product_sizes where product_id = p_source_id;
  insert into public.product_measurements(product_id, size, width, length, extra, sort_order)
  select v_new_id, size, width, length, extra, sort_order from public.product_measurements where product_id = p_source_id;

  return v_new_id;
end;
$$;

revoke all on function public.duplicate_product_with_relations(uuid) from public, anon;
grant execute on function public.duplicate_product_with_relations(uuid) to authenticated;
