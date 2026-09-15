-- Pedidos, pagamentos e acompanhamento de produção da Laus Sit.
-- Execute depois de 202609120001_initial_schema.sql.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null default gen_random_uuid() unique,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  product_slug text not null,
  product_image_url text,
  selected_size text,
  selected_color text,
  quantity integer not null check (quantity between 1 and 10),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_notes text not null default '',
  payment_status text not null default 'created',
  payment_status_detail text,
  fulfillment_status text not null default 'new'
    check (fulfillment_status in ('new', 'in_production', 'ready', 'delivered', 'cancelled')),
  admin_notes text not null default '',
  mercado_pago_preference_id text unique,
  mercado_pago_payment_id text unique,
  mercado_pago_payment_method text,
  mercado_pago_payment_type text,
  checkout_url text,
  checkout_error text,
  raw_payment jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_matches_items check (total_amount = unit_price * quantity)
);

create index if not exists orders_product_id_idx on public.orders(product_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_payment_status_idx on public.orders(payment_status);
create index if not exists orders_fulfillment_status_idx on public.orders(fulfillment_status);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.orders enable row level security;

drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders"
on public.orders for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders"
on public.orders for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

revoke all on public.orders from anon;
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;

-- Grants explícitos para projetos em que o Data API não concede acesso automaticamente.
-- As policies RLS continuam sendo a barreira de autorização por linha.
grant usage on schema public to anon, authenticated;
grant select on public.products, public.product_images, public.product_colors,
  public.product_sizes, public.product_measurements, public.catalog_settings
  to anon, authenticated;
grant select on public.admin_profiles to authenticated;
grant insert, update, delete on public.products, public.product_images,
  public.product_colors, public.product_sizes, public.product_measurements,
  public.catalog_settings to authenticated;
