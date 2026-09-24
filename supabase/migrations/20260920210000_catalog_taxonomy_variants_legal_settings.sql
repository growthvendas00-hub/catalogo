-- Categorias religiosas, preços por modelagem e dados legais da Laus Sit.
-- Execute depois de 20260917222234_secure_catalog_payments_operations.sql.

begin;

-- Preserva a modelagem dos pedidos antigos antes de converter a antiga categoria.
alter table public.orders
  add column if not exists selected_model text;

update public.orders as orders
set selected_model = products.category
from public.products as products
where orders.product_id = products.id
  and orders.selected_model is null
  and products.category in ('Tradicional', 'Baby Look', 'Oversized');

alter table public.orders
  drop constraint if exists orders_selected_model_check;

alter table public.orders
  add constraint orders_selected_model_check
  check (selected_model is null or selected_model in ('Tradicional', 'Baby Look', 'Oversized'));

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  model text not null check (model in ('Tradicional', 'Baby Look', 'Oversized')),
  price numeric(10,2) not null check (price >= 0),
  promotional_price numeric(10,2) check (promotional_price is null or promotional_price >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  constraint product_variants_product_model_key unique (product_id, model),
  constraint product_variants_active_price_floor check (not active or price >= 0.50),
  constraint product_variants_active_promotional_floor check (not active or promotional_price is null or promotional_price >= 0.50),
  constraint product_variants_promotion_is_lower check (promotional_price is null or promotional_price < price)
);

alter table public.product_variants enable row level security;

drop policy if exists "public reads active product variants" on public.product_variants;
drop policy if exists "admins manage product variants" on public.product_variants;

create policy "public reads active product variants"
on public.product_variants for select to anon, authenticated
using (
  (active and exists (
    select 1 from public.products as product
    where product.id = product_id and product.active
  )) or (select public.is_admin())
);

create policy "admins manage product variants"
on public.product_variants for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;
grant all on public.product_variants to service_role;

-- Todas as peças atuais começam com as três modelagens e o preço que já estava
-- publicado. O painel permite ajustar cada uma depois da migration.
insert into public.product_variants (product_id, model, price, promotional_price, active, sort_order)
select product.id, model.name, product.price, product.promotional_price, true, model.position
from public.products as product
cross join (values
  ('Tradicional', 0),
  ('Baby Look', 1),
  ('Oversized', 2)
) as model(name, position)
on conflict (product_id, model) do nothing;

alter table public.products
  drop constraint if exists products_category_check;

update public.products
set category = 'Cristianismo'
where category not in ('Cristianismo', 'Matriz africana', 'Ocultismo e misticismo');

alter table public.products
  add constraint products_category_check
  check (category in ('Cristianismo', 'Matriz africana', 'Ocultismo e misticismo'));

alter table public.catalog_settings
  add column if not exists legal_name text,
  add column if not exists tax_id text,
  add column if not exists contact_email text,
  add column if not exists business_address text;

-- Salva produto e relações em uma única transação. O preço-base legado é
-- derivado do menor preço ativo; checkout e vitrine usam product_variants.
create or replace function public.save_product_with_relations(p_product jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_product->>'id', '')::uuid;
  v_base_price numeric(10,2);
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Acesso administrativo necessário.';
  end if;

  select min(coalesce(nullif(item->>'promotionalPrice', '')::numeric, (item->>'price')::numeric))
  into v_base_price
  from jsonb_array_elements(coalesce(p_product->'variants', '[]'::jsonb)) as x(item)
  where coalesce((item->>'active')::boolean, false);

  if (p_product->>'active')::boolean and (v_base_price is null or v_base_price < 0.50) then
    raise exception 'Produto ativo precisa de ao menos uma modelagem válida.';
  end if;

  if v_id is null then
    insert into public.products (
      name, slug, category, price, promotional_price, short_description,
      description, active, sort_order, main_image_url, main_image_alt, fabric,
      composition, thread_type, gsm, fit, printing_method, finish,
      technical_notes, care_instructions, observations
    ) values (
      p_product->>'name', p_product->>'slug', p_product->>'category',
      coalesce(v_base_price, 0), null,
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
      price = coalesce(v_base_price, 0), promotional_price = null,
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
  delete from public.product_variants where product_id = v_id;

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

  insert into public.product_variants(product_id, model, price, promotional_price, active, sort_order)
  select v_id, item->>'model', (item->>'price')::numeric,
         nullif(item->>'promotionalPrice', '')::numeric,
         coalesce((item->>'active')::boolean, false), ordinality - 1
  from jsonb_array_elements(coalesce(p_product->'variants', '[]'::jsonb)) with ordinality as x(item, ordinality);

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
  insert into public.product_variants(product_id, model, price, promotional_price, active, sort_order)
  select v_new_id, model, price, promotional_price, active, sort_order from public.product_variants where product_id = p_source_id;

  return v_new_id;
end;
$$;

revoke all on function public.duplicate_product_with_relations(uuid) from public, anon;
grant execute on function public.duplicate_product_with_relations(uuid) to authenticated;

commit;
