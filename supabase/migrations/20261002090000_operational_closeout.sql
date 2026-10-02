-- Laus Sit: fechamento operacional (categorias, atribuição, cupons, estoque e vendedores).
-- NÃO EXECUTE automaticamente: cole este arquivo no SQL Editor do Supabase.

begin;

alter table public.products drop constraint if exists products_category_check;
update public.products set category = 'Cristianismo'
where category in ('Baby Look', 'Tradicional', 'Oversized');
update public.products set category = 'Personalizadas'
where lower(category) in ('personalizados', 'personalizadas');
alter table public.products add constraint products_category_check
  check (category in ('Matriz africana', 'Ocultismo e misticismo', 'Cristianismo', 'Personalizadas'));

update public.products
set active = false
where lower(trim(name)) = 'teste'
   or lower(trim(slug)) = 'testi'
   or coalesce(main_image_url, '') like '/demo-products/%.svg'
   or coalesce(processed_image_url, '') like '/demo-products/%.svg';

alter table public.catalog_settings
  add column if not exists order_whatsapp_template text not null
  default 'Oi {nome}, sou {vendedora} e estou entrando em contato sobre o seu pedido {numero}. Tudo bem?';

create table if not exists public.seller_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  whatsapp text not null check (whatsapp ~ '^55[0-9]{10,11}$'),
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{2,40}$'),
  source_name text not null check (char_length(trim(source_name)) between 2 and 120),
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  max_discount numeric(10,2) check (max_discount is null or max_discount > 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  product_id uuid references public.products(id) on delete set null,
  category text check (category is null or category in ('Matriz africana', 'Ocultismo e misticismo', 'Cristianismo', 'Personalizadas')),
  owner_type text not null default 'admin' check (owner_type in ('admin', 'seller')),
  seller_id uuid references public.seller_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_period_check check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint coupons_percentage_check check (discount_type <> 'percentage' or discount_value <= 100),
  constraint coupons_owner_check check ((owner_type = 'admin' and seller_id is null) or (owner_type = 'seller' and seller_id is not null))
);

create table if not exists public.attribution_visits (
  id bigint generated always as identity primary key,
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  coupon_code text not null,
  landing text not null default '/',
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  model text,
  size text,
  color text,
  quantity integer check (quantity is null or quantity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inventory_items_selection_uidx
  on public.inventory_items(product_id, model, size, color) nulls not distinct;

alter table public.orders
  add column if not exists subtotal_amount numeric(10,2),
  add column if not exists discount_amount numeric(10,2) not null default 0,
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
  add column if not exists coupon_code text,
  add column if not exists attribution_source text not null default 'direta',
  add column if not exists seller_id uuid references public.seller_profiles(user_id) on delete set null,
  add column if not exists inventory_item_id uuid references public.inventory_items(id) on delete set null,
  add column if not exists reservation_expires_at timestamptz;

update public.orders set subtotal_amount = unit_price * quantity where subtotal_amount is null;
alter table public.orders alter column subtotal_amount set not null;
alter table public.orders drop constraint if exists orders_total_matches_items;
alter table public.orders drop constraint if exists orders_totals_check;
alter table public.orders add constraint orders_totals_check check (
  subtotal_amount = unit_price * quantity
  and discount_amount >= 0
  and discount_amount <= subtotal_amount
  and total_amount = subtotal_amount - discount_amount
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  payment_id text unique,
  status text not null default 'reserved' check (status in ('reserved', 'approved', 'released')),
  reserved_until timestamptz not null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists coupons_seller_idx on public.coupons(seller_id) where seller_id is not null;
create index if not exists coupon_redemptions_coupon_status_idx on public.coupon_redemptions(coupon_id, status, reserved_until);
create index if not exists attribution_visits_coupon_created_idx on public.attribution_visits(coupon_id, created_at desc);
create index if not exists inventory_items_product_idx on public.inventory_items(product_id);
create index if not exists orders_coupon_idx on public.orders(coupon_id) where coupon_id is not null;
create index if not exists orders_seller_idx on public.orders(seller_id, created_at desc) where seller_id is not null;

drop trigger if exists seller_profiles_set_updated_at on public.seller_profiles;
create trigger seller_profiles_set_updated_at before update on public.seller_profiles for each row execute function public.set_updated_at();
drop trigger if exists coupons_set_updated_at on public.coupons;
create trigger coupons_set_updated_at before update on public.coupons for each row execute function public.set_updated_at();
drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at before update on public.inventory_items for each row execute function public.set_updated_at();

alter table public.seller_profiles enable row level security;
alter table public.coupons enable row level security;
alter table public.attribution_visits enable row level security;
alter table public.inventory_items enable row level security;
alter table public.coupon_redemptions enable row level security;

drop policy if exists "admins manage sellers" on public.seller_profiles;
create policy "admins manage sellers" on public.seller_profiles for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "sellers read own profile" on public.seller_profiles;
create policy "sellers read own profile" on public.seller_profiles for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "admins manage coupons" on public.coupons;
create policy "admins manage coupons" on public.coupons for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "sellers read own coupons" on public.coupons;
create policy "sellers read own coupons" on public.coupons for select to authenticated
using (seller_id = (select auth.uid()) and exists (
  select 1 from public.seller_profiles s where s.user_id = (select auth.uid()) and s.active
));

drop policy if exists "admins read attribution" on public.attribution_visits;
create policy "admins read attribution" on public.attribution_visits for select to authenticated using ((select public.is_admin()));
drop policy if exists "admins manage inventory" on public.inventory_items;
create policy "admins manage inventory" on public.inventory_items for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admins read redemptions" on public.coupon_redemptions;
create policy "admins read redemptions" on public.coupon_redemptions for select to authenticated using ((select public.is_admin()));

drop policy if exists "sellers read attributed orders" on public.orders;
create policy "sellers read attributed orders" on public.orders for select to authenticated
using (seller_id = (select auth.uid()) and exists (
  select 1 from public.seller_profiles s where s.user_id = (select auth.uid()) and s.active
));

revoke all on public.seller_profiles, public.coupons, public.attribution_visits, public.inventory_items, public.coupon_redemptions from anon;
grant select, insert, update, delete on public.seller_profiles, public.coupons, public.inventory_items to authenticated;
grant select on public.attribution_visits, public.coupon_redemptions to authenticated;
grant all on public.seller_profiles, public.coupons, public.attribution_visits, public.inventory_items, public.coupon_redemptions to service_role;

create or replace function public.record_attribution_visit(p_code text, p_landing text, p_user_agent text)
returns table(code text, ends_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare v_coupon public.coupons%rowtype;
begin
  select * into v_coupon from public.coupons c
  where c.code = upper(trim(p_code)) and c.active
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at > now())
    and (c.max_uses is null or c.max_uses > (
      select count(*) from public.coupon_redemptions r
      where r.coupon_id = c.id and (r.status = 'approved' or (r.status = 'reserved' and r.reserved_until > now()))
    ));
  if not found then return; end if;
  insert into public.attribution_visits(coupon_id, coupon_code, landing, user_agent)
  values (v_coupon.id, v_coupon.code, left(coalesce(p_landing, '/'), 500), left(coalesce(p_user_agent, ''), 300));
  return query select v_coupon.code, v_coupon.ends_at;
end;
$$;
revoke all on function public.record_attribution_visit(text,text,text) from public;
grant execute on function public.record_attribution_visit(text,text,text) to anon, authenticated, service_role;

create or replace function public.create_checkout_order(p_payload jsonb, p_coupon_code text)
returns table(order_id uuid, public_token uuid, unit_price numeric, subtotal_amount numeric, discount_amount numeric, total_amount numeric, coupon_code text)
language plpgsql security invoker set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_coupon public.coupons%rowtype;
  v_inventory public.inventory_items%rowtype;
  v_order public.orders%rowtype;
  v_subtotal numeric(10,2);
  v_discount numeric(10,2) := 0;
  v_used integer := 0;
  v_quantity integer := (p_payload->>'quantity')::integer;
  v_expired record;
begin
  select * into v_product from public.products where id = (p_payload->>'productId')::uuid and active for share;
  if not found or v_product.category = 'Personalizadas' then raise exception 'Produto indisponível.'; end if;

  for v_expired in
    select o.id, o.inventory_item_id, o.quantity
    from public.orders o
    where o.product_id = v_product.id and o.inventory_item_id is not null
      and o.reservation_expires_at <= now() and o.payment_status <> 'approved'
    order by o.id for update skip locked
  loop
    update public.inventory_items set quantity = quantity + v_expired.quantity
    where id = v_expired.inventory_item_id and quantity is not null;
    update public.orders set inventory_item_id = null where id = v_expired.id;
    update public.coupon_redemptions set status = 'released'
    where order_id = v_expired.id and status = 'reserved';
  end loop;
  select * into v_variant from public.product_variants
  where product_id = v_product.id and model = p_payload->>'model' and active for share;
  if not found then raise exception 'Modelagem indisponível.'; end if;
  if exists (select 1 from public.product_sizes where product_id=v_product.id)
     and not exists (select 1 from public.product_sizes where product_id=v_product.id and name=p_payload->>'size') then raise exception 'Tamanho indisponível.'; end if;
  if exists (select 1 from public.product_colors where product_id=v_product.id)
     and not exists (select 1 from public.product_colors where product_id=v_product.id and name=p_payload->>'color') then raise exception 'Cor indisponível.'; end if;
  if v_quantity < 1 or v_quantity > 10 then raise exception 'Quantidade inválida.'; end if;

  v_subtotal := round(coalesce(v_variant.promotional_price, v_variant.price) * v_quantity, 2);

  if nullif(upper(trim(coalesce(p_coupon_code,''))), '') is not null then
    select * into v_coupon from public.coupons c where c.code=upper(trim(p_coupon_code)) for update;
    if found and v_coupon.active
       and (v_coupon.starts_at is null or v_coupon.starts_at <= now())
       and (v_coupon.ends_at is null or v_coupon.ends_at > now())
       and (v_coupon.product_id is null or v_coupon.product_id=v_product.id)
       and (v_coupon.category is null or v_coupon.category=v_product.category) then
      select count(*) into v_used from public.coupon_redemptions r
      where r.coupon_id=v_coupon.id and (r.status='approved' or (r.status='reserved' and r.reserved_until>now()));
      if v_coupon.max_uses is null or v_used < v_coupon.max_uses then
        v_discount := case when v_coupon.discount_type='percentage' then round(v_subtotal*v_coupon.discount_value/100,2) else least(v_subtotal,v_coupon.discount_value) end;
        if v_coupon.max_discount is not null then v_discount := least(v_discount,v_coupon.max_discount); end if;
      else v_coupon.id := null;
      end if;
    else v_coupon.id := null;
    end if;
  end if;

  select * into v_inventory from public.inventory_items i
  where i.product_id=v_product.id and i.active
    and (i.model is null or i.model=p_payload->>'model')
    and (i.size is null or i.size=nullif(p_payload->>'size',''))
    and (i.color is null or i.color=nullif(p_payload->>'color',''))
  order by (i.model is not null)::int+(i.size is not null)::int+(i.color is not null)::int desc limit 1 for update;
  if found and v_inventory.quantity is not null then
    if v_inventory.quantity < v_quantity then raise exception 'Estoque insuficiente.'; end if;
    update public.inventory_items set quantity=quantity-v_quantity where id=v_inventory.id;
  end if;

  insert into public.orders(
    checkout_attempt_id, checkout_fingerprint, product_id, product_name, product_slug, product_image_url,
    selected_model, selected_size, selected_color, quantity, unit_price, subtotal_amount, discount_amount,
    total_amount, customer_name, customer_email, customer_phone, customer_notes, payment_status,
    coupon_id, coupon_code, attribution_source, seller_id, inventory_item_id, reservation_expires_at
  ) values (
    (p_payload->>'checkoutAttemptId')::uuid, p_payload->>'fingerprint', v_product.id, v_product.name, v_product.slug,
    coalesce(v_product.processed_image_url,v_product.main_image_url), p_payload->>'model', nullif(p_payload->>'size',''), nullif(p_payload->>'color',''),
    v_quantity, coalesce(v_variant.promotional_price,v_variant.price), v_subtotal, v_discount, v_subtotal-v_discount,
    p_payload#>>'{customer,name}', p_payload#>>'{customer,email}', p_payload#>>'{customer,phone}', coalesce(p_payload#>>'{customer,notes}',''), 'created',
    v_coupon.id, case when v_coupon.id is null then null else v_coupon.code end,
    case when v_coupon.id is null then 'direta' else v_coupon.source_name end, v_coupon.seller_id,
    v_inventory.id, now()+interval '30 minutes'
  ) returning * into v_order;
  if v_coupon.id is not null then
    insert into public.coupon_redemptions(coupon_id,order_id,reserved_until) values(v_coupon.id,v_order.id,v_order.reservation_expires_at);
  end if;
  return query select v_order.id,v_order.public_token,v_order.unit_price,v_order.subtotal_amount,v_order.discount_amount,v_order.total_amount,v_order.coupon_code;
end;
$$;
revoke all on function public.create_checkout_order(jsonb,text) from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb,text) to service_role;

create or replace function public.release_checkout_reservation(p_order_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found or v_order.payment_status='approved' then return; end if;
  if v_order.inventory_item_id is not null then
    update public.inventory_items set quantity=quantity+v_order.quantity where id=v_order.inventory_item_id and quantity is not null;
    update public.orders set inventory_item_id=null where id=p_order_id;
  end if;
  update public.coupon_redemptions set status='released' where order_id=p_order_id and status='reserved';
end;
$$;
revoke all on function public.release_checkout_reservation(uuid) from public, anon, authenticated;
grant execute on function public.release_checkout_reservation(uuid) to service_role;

create or replace function public.record_mercado_pago_payment(
  p_order_id uuid, p_payment_id text, p_status text, p_status_detail text,
  p_transaction_amount numeric, p_payment_method text, p_payment_type text, p_date_approved timestamptz
)
returns table(order_id uuid, payment_status text, changed boolean)
language plpgsql security invoker set search_path = '' as $$
declare v_order public.orders%rowtype; v_matches boolean; v_status text; v_change boolean:=true;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pedido associado ao pagamento não encontrado.'; end if;
  v_matches:=round(v_order.total_amount*100)=round(coalesce(p_transaction_amount,0)*100);
  v_status:=case when v_matches then coalesce(nullif(p_status,''),'pending') else 'amount_mismatch' end;
  if exists(select 1 from public.payment_attempts where external_payment_id=p_payment_id and order_id<>p_order_id) then raise exception 'Pagamento já associado a outro pedido.'; end if;
  insert into public.payment_attempts(order_id,external_payment_id,status,status_detail,transaction_amount,payment_method,payment_type,date_approved)
  values(p_order_id,p_payment_id,v_status,case when v_matches then p_status_detail else 'Valor recebido diverge do pedido.' end,coalesce(p_transaction_amount,0),p_payment_method,p_payment_type,p_date_approved)
  on conflict(external_payment_id) do update set status=excluded.status,status_detail=excluded.status_detail,transaction_amount=excluded.transaction_amount,
    payment_method=excluded.payment_method,payment_type=excluded.payment_type,date_approved=coalesce(public.payment_attempts.date_approved,excluded.date_approved),last_seen_at=now()
  where public.payment_attempts.order_id=excluded.order_id;
  if v_order.payment_status='approved' and coalesce(v_order.mercado_pago_payment_id,'')<>p_payment_id then v_change:=false;
  elsif v_order.payment_status in ('refunded','charged_back') then v_change:=false;
  elsif v_order.payment_status='approved' and v_order.mercado_pago_payment_id=p_payment_id and v_status not in ('approved','refunded','charged_back') then v_change:=false; end if;
  if v_change then
    update public.orders set payment_status=v_status,payment_status_detail=case when v_matches then p_status_detail else 'Valor recebido diverge do pedido.' end,
      mercado_pago_payment_id=p_payment_id,mercado_pago_payment_method=p_payment_method,mercado_pago_payment_type=p_payment_type,
      paid_at=case when v_status='approved' then coalesce(v_order.paid_at,p_date_approved,now()) else v_order.paid_at end,checkout_error=null where id=p_order_id;
    if v_status='approved' then update public.coupon_redemptions set status='approved',payment_id=p_payment_id,approved_at=coalesce(approved_at,p_date_approved,now()) where order_id=p_order_id and status<>'approved'; end if;
  end if;
  return query select p_order_id,case when v_change then v_status else v_order.payment_status end,v_change;
end;
$$;
revoke all on function public.record_mercado_pago_payment(uuid,text,text,text,numeric,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_mercado_pago_payment(uuid,text,text,text,numeric,text,text,timestamptz) to service_role;

commit;
