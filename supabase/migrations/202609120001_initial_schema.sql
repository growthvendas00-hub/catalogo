-- Laus Sit — schema inicial, RLS, storage e seed demonstrativo.
create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null check (category in ('Baby Look', 'Tradicional', 'Oversized')),
  price numeric(10,2) not null check (price >= 0),
  promotional_price numeric(10,2) check (promotional_price is null or promotional_price >= 0),
  short_description text not null default '', description text not null default '',
  fabric text not null default '', composition text not null default '', thread_type text not null default '',
  gsm text not null default '', fit text not null default '', printing_method text not null default '',
  finish text not null default '', technical_notes text not null default '', care_instructions text not null default '',
  observations text not null default '', active boolean not null default true, sort_order integer not null default 0,
  main_image_url text not null default '', main_image_alt text not null default '',
  original_image_url text, processed_image_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null, alt_text text not null default '', sort_order integer not null default 0
);
create table if not exists public.product_colors (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  name text not null, hex text check (hex is null or hex ~ '^#[0-9A-Fa-f]{6}$'), sort_order integer not null default 0
);
create table if not exists public.product_sizes (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  name text not null, sort_order integer not null default 0
);
create table if not exists public.product_measurements (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  size text not null, width numeric(8,2) not null check (width >= 0), length numeric(8,2) not null check (length >= 0),
  extra jsonb not null default '{}'::jsonb, sort_order integer not null default 0
);
create table if not exists public.catalog_settings (
  id smallint primary key default 1 check (id = 1), brand_name text not null default 'Laus Sit', logo_url text,
  subtitle text not null default '', institutional_text text not null default '', whatsapp text, instagram text,
  whatsapp_message text not null default 'Olá! Gostaria de saber mais sobre a peça {produto}.', footer_text text not null default '',
  show_colors boolean not null default true, show_measurements boolean not null default true,
  show_technical_sheet boolean not null default true, updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists settings_set_updated_at on public.catalog_settings;
create trigger settings_set_updated_at before update on public.catalog_settings for each row execute function public.set_updated_at();

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_profiles where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admin_profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_colors enable row level security;
alter table public.product_sizes enable row level security;
alter table public.product_measurements enable row level security;
alter table public.catalog_settings enable row level security;

-- As políticas não aceitam `create policy if not exists`. Removê-las antes
-- permite retomar com segurança uma execução parcial desta migração.
drop policy if exists "admin reads own profile" on public.admin_profiles;
drop policy if exists "public reads active products" on public.products;
drop policy if exists "admins manage products" on public.products;
drop policy if exists "public reads images of active products" on public.product_images;
drop policy if exists "admins manage product images" on public.product_images;
drop policy if exists "public reads colors of active products" on public.product_colors;
drop policy if exists "admins manage product colors" on public.product_colors;
drop policy if exists "public reads sizes of active products" on public.product_sizes;
drop policy if exists "admins manage product sizes" on public.product_sizes;
drop policy if exists "public reads measurements of active products" on public.product_measurements;
drop policy if exists "admins manage product measurements" on public.product_measurements;
drop policy if exists "public reads catalog settings" on public.catalog_settings;
drop policy if exists "admins manage catalog settings" on public.catalog_settings;

create policy "admin reads own profile" on public.admin_profiles for select to authenticated using (user_id = auth.uid());
create policy "public reads active products" on public.products for select to anon, authenticated using (active or public.is_admin());
create policy "admins manage products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads images of active products" on public.product_images for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.active or public.is_admin())));
create policy "admins manage product images" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads colors of active products" on public.product_colors for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.active or public.is_admin())));
create policy "admins manage product colors" on public.product_colors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads sizes of active products" on public.product_sizes for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.active or public.is_admin())));
create policy "admins manage product sizes" on public.product_sizes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads measurements of active products" on public.product_measurements for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.active or public.is_admin())));
create policy "admins manage product measurements" on public.product_measurements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads catalog settings" on public.catalog_settings for select to anon, authenticated using (true);
create policy "admins manage catalog settings" on public.catalog_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 12582912, array['image/jpeg','image/png','image/webp']),
  ('brand-assets', 'brand-assets', true, 5242880, array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "public reads catalog assets" on storage.objects;
drop policy if exists "admins upload catalog assets" on storage.objects;
drop policy if exists "admins update catalog assets" on storage.objects;
drop policy if exists "admins delete catalog assets" on storage.objects;
create policy "public reads catalog assets" on storage.objects for select to anon, authenticated using (bucket_id in ('product-images','brand-assets'));
create policy "admins upload catalog assets" on storage.objects for insert to authenticated with check (bucket_id in ('product-images','brand-assets') and public.is_admin());
create policy "admins update catalog assets" on storage.objects for update to authenticated using (bucket_id in ('product-images','brand-assets') and public.is_admin()) with check (bucket_id in ('product-images','brand-assets') and public.is_admin());
create policy "admins delete catalog assets" on storage.objects for delete to authenticated using (bucket_id in ('product-images','brand-assets') and public.is_admin());

insert into public.catalog_settings (id, brand_name, subtitle, institutional_text, whatsapp, instagram, footer_text)
values (1, 'Laus Sit', 'Peças, modelagens e personalizações.', 'Camisetas feitas em pequena escala, com escolhas de tecido, modelagem e estampa para vestir ideias com intenção.', null, null, 'Laus Sit — feito com cuidado, para vestir do seu jeito.')
on conflict (id) do nothing;

-- SEED DEMONSTRATIVO: confirme medidas, gramaturas, tecidos, acabamentos e preços com a costureira antes de publicar.
insert into public.products (id,name,slug,category,price,short_description,description,fabric,composition,thread_type,gsm,fit,printing_method,finish,technical_notes,care_instructions,observations,sort_order,main_image_url,main_image_alt) values
('10000000-0000-0000-0000-000000000001','Oversized Algodão 40.1','oversized-algodao-40-1','Oversized',120,'Oversized em algodão, confortável e pronta para personalizar.','Peça versátil feita para vestir com conforto e personalidade.','Meia malha de algodão','100% algodão','Fio 40.1 penteado','180 g/m² (demonstrativo)','Oversized','Aceita personalização — sob consulta','Gola canelada e reforço ombro a ombro','Dados demonstrativos; confirmar antes de publicar.','Lavar do avesso, ciclo suave e secar à sombra.','Cores e medidas podem variar entre lotes.',1,'/demo-products/product-01.svg','Oversized Algodão 40.1 — imagem demonstrativa'),
('10000000-0000-0000-0000-000000000002','Camiseta Tradicional Algodão','camiseta-tradicional-algodao','Tradicional',100,'Camiseta clássica em algodão.','Modelagem tradicional para uso diário e personalização.','Meia malha de algodão','100% algodão','Fio 30.1 penteado','165 g/m² (demonstrativo)','Tradicional','Aceita personalização — sob consulta','Gola canelada','Dados demonstrativos; confirmar antes de publicar.','Lavar do avesso, ciclo suave e secar à sombra.','Cores e medidas podem variar.',2,'/demo-products/product-02.svg','Camiseta Tradicional Algodão — imagem demonstrativa'),
('10000000-0000-0000-0000-000000000003','Camiseta PV Antipilling','camiseta-pv-antipilling','Tradicional',70,'Praticidade e toque leve com tratamento antipilling.','Camiseta tradicional de secagem rápida.','Malha PV antipilling','67% poliéster, 33% viscose','','165 g/m² (demonstrativo)','Tradicional','Aceita personalização — sob consulta','Tratamento antipilling','Dados demonstrativos; confirmar antes de publicar.','Lavar do avesso e secar à sombra.','Cores e medidas podem variar.',3,'/demo-products/product-03.svg','Camiseta PV Antipilling — imagem demonstrativa'),
('10000000-0000-0000-0000-000000000004','Camiseta PP','camiseta-pp','Tradicional',60,'Uma opção acessível para projetos e eventos.','Camiseta tradicional em malha PP.','Malha PP','Malha PP','','165 g/m² (demonstrativo)','Tradicional','Aceita personalização — sob consulta','Gola canelada','Dados demonstrativos; confirmar antes de publicar.','Lavar do avesso e secar à sombra.','Cores e medidas podem variar.',4,'/demo-products/product-04.svg','Camiseta PP — imagem demonstrativa'),
('10000000-0000-0000-0000-000000000005','Baby Look Algodão','baby-look-algodao','Baby Look',85,'Baby look de algodão com modelagem próxima ao corpo.','Peça confortável em pequena escala.','Meia malha de algodão','100% algodão','Fio 30.1 penteado','165 g/m² (demonstrativo)','Baby Look','Aceita personalização — sob consulta','Gola canelada','Dados demonstrativos; confirmar antes de publicar.','Lavar do avesso e secar à sombra.','Cores e medidas podem variar.',5,'/demo-products/product-05.svg','Baby Look Algodão — imagem demonstrativa'),
('10000000-0000-0000-0000-000000000006','Baby Look PV Antipilling','baby-look-pv-antipilling','Baby Look',75,'Modelagem baby look em malha prática.','Leve, versátil e de secagem rápida.','Malha PV antipilling','67% poliéster, 33% viscose','','165 g/m² (demonstrativo)','Baby Look','Aceita personalização — sob consulta','Tratamento antipilling','Dados demonstrativos; confirmar antes de publicar.','Lavar do avesso e secar à sombra.','Cores e medidas podem variar.',6,'/demo-products/product-06.svg','Baby Look PV Antipilling — imagem demonstrativa'),
('10000000-0000-0000-0000-000000000007','Oversized Essentials','oversized-essentials','Oversized',125,'Volume generoso e visual essencial.','Oversized para composições contemporâneas.','Meia malha de algodão','100% algodão','Fio 30.1 premium','180 g/m² (demonstrativo)','Oversized','Aceita personalização — sob consulta','Reforço ombro a ombro','Dados demonstrativos; confirmar antes de publicar.','Lavar do avesso e secar à sombra.','Cores e medidas podem variar.',7,'/demo-products/product-07.svg','Oversized Essentials — imagem demonstrativa'),
('10000000-0000-0000-0000-000000000008','Oversized Personalizada','oversized-personalizada','Oversized',140,'Base oversized para projetos personalizados.','Escolha cor, tamanho e técnica de aplicação.','Meia malha de algodão','100% algodão','Fio 30.1 premium','180 g/m² (demonstrativo)','Oversized','DTF, silk ou bordado — sob consulta','Reforço ombro a ombro','Dados demonstrativos; confirmar antes de publicar.','Lavar do avesso e secar à sombra.','Preço pode variar conforme a arte.',8,'/demo-products/product-08.svg','Oversized Personalizada — imagem demonstrativa'),
('10000000-0000-0000-0000-000000000009','Tradicional Personalizada','tradicional-personalizada','Tradicional',115,'Camiseta tradicional personalizada.','Base clássica para marcas, equipes e eventos.','Meia malha de algodão','100% algodão','Fio 30.1 penteado','165 g/m² (demonstrativo)','Tradicional','DTF ou silk — sob consulta','Gola canelada','Dados demonstrativos; confirmar antes de publicar.','Lavar do avesso e secar à sombra.','Preço pode variar conforme a arte.',9,'/demo-products/product-09.svg','Tradicional Personalizada — imagem demonstrativa'),
('10000000-0000-0000-0000-000000000010','Baby Look Personalizada','baby-look-personalizada','Baby Look',95,'Baby look pronta para receber sua ideia.','Modelagem ajustada para personalizações especiais.','Meia malha de algodão','100% algodão','Fio 30.1 penteado','165 g/m² (demonstrativo)','Baby Look','DTF ou silk — sob consulta','Gola canelada','Dados demonstrativos; confirmar antes de publicar.','Lavar do avesso e secar à sombra.','Preço pode variar conforme a arte.',10,'/demo-products/product-10.svg','Baby Look Personalizada — imagem demonstrativa')
on conflict (id) do nothing;

insert into public.product_sizes (product_id,name,sort_order)
select p.id, s.name, s.ord from public.products p cross join lateral unnest(case p.category when 'Oversized' then array['P','M','G','GG','G1'] when 'Baby Look' then array['PP','P','M','G','GG'] else array['P','M','G','GG'] end) with ordinality as s(name,ord)
where p.id::text like '10000000-0000-0000-0000-%' and not exists (select 1 from public.product_sizes x where x.product_id=p.id);

insert into public.product_colors (product_id,name,hex,sort_order)
select p.id, c.name, c.hex, c.ord from public.products p cross join lateral (
  select * from (values ('Preto','#171717',1),('Off-white','#EEEAE0',2)) v(name,hex,ord) where p.category='Oversized'
  union all select * from (values ('Branco','#FFFFFF',1),('Vinho','#6D2635',2)) v(name,hex,ord) where p.category='Tradicional'
  union all select * from (values ('Off-white','#EEEAE0',1),('Cinza','#888985',2)) v(name,hex,ord) where p.category='Baby Look'
) c
where p.id::text like '10000000-0000-0000-0000-%' and not exists (select 1 from public.product_colors x where x.product_id=p.id);

insert into public.product_measurements (product_id,size,width,length,sort_order)
select p.id, m.size, m.width, m.length, m.ord from public.products p join lateral (
  select * from (values ('PP',39,58,1),('P',42,60,2),('M',45,62,3),('G',48,64,4),('GG',51,66,5)) v(size,width,length,ord) where p.category='Baby Look'
  union all select * from (values ('P',50,68,1),('M',53,70,2),('G',56,72,3),('GG',59,74,4)) v(size,width,length,ord) where p.category='Tradicional'
  union all select * from (values ('P',58,72,1),('M',61,74,2),('G',64,76,3),('GG',67,78,4),('G1',70,80,5)) v(size,width,length,ord) where p.category='Oversized'
) m on true where p.id::text like '10000000-0000-0000-0000-%' and not exists (select 1 from public.product_measurements x where x.product_id=p.id);
