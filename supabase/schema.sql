-- =====================================================================
-- Store — Supabase schema
-- Run once in Supabase → SQL Editor, then run seed.sql, hardening.sql and options.sql.
-- NOTE: options.sql replaces place_order/check_coupon with the current versions (options pricing, limits).
--       If you ever re-run this file, run options.sql again afterwards.
-- =====================================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), new.email, coalesce(new.raw_user_meta_data->>'phone', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- customers may edit their name/phone, never their role or email
create or replace function public.protect_role() returns trigger
language plpgsql as $$
begin
  -- auth.uid() is null for the SQL editor and service role, which may change roles
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- ---------- catalog ----------
create table if not exists public.categories (
  id text primary key,
  name text not null,
  blurb text default '',
  icon text default 'spark',
  sort int default 0
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  sale_price numeric(10,2),
  category_id text references public.categories(id) on update cascade,
  image text,
  badge text,
  featured boolean not null default false,
  sort int not null default 0,
  summary text default '',
  description text default '',
  active boolean not null default true,
  digital boolean not null default false,
  per_unit text,
  created_at timestamptz not null default now()
);

-- private download paths for digital products (never readable by customers directly)
create table if not exists public.product_files (
  product_id text primary key references public.products(id) on delete cascade,
  path text not null
);

-- ---------- orders ----------
create sequence if not exists public.order_number_seq start 10001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint not null default nextval('public.order_number_seq'),
  user_id uuid references auth.users(id) on delete set null,
  customer jsonb not null default '{}',
  items jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  coupon text,
  total numeric(10,2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'in_progress', 'review', 'completed', 'cancelled')),
  notes text default '',
  payment_method text not null default 'card' check (payment_method in ('card', 'bank')),
  payment_ref text,
  history jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);

create table if not exists public.wishlists (
  user_id uuid references auth.users(id) on delete cascade,
  product_id text references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);

create table if not exists public.coupons (
  code text primary key,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(10,2) not null check (value > 0),
  active boolean not null default true,
  expires_at timestamptz
);

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_files enable row level security;
alter table public.orders enable row level security;
alter table public.wishlists enable row level security;
alter table public.coupons enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (id = auth.uid() or public.is_admin());

drop policy if exists "categories public" on public.categories;
create policy "categories public" on public.categories for select using (true);
drop policy if exists "categories admin" on public.categories;
create policy "categories admin" on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products public" on public.products;
create policy "products public" on public.products for select using (active or public.is_admin());
drop policy if exists "products admin" on public.products;
create policy "products admin" on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "files admin" on public.product_files;
create policy "files admin" on public.product_files for all using (public.is_admin()) with check (public.is_admin());

-- orders are created only through place_order(); customers read their own
drop policy if exists "orders own read" on public.orders;
create policy "orders own read" on public.orders for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "wishlist own" on public.wishlists;
create policy "wishlist own" on public.wishlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "coupons admin" on public.coupons;
create policy "coupons admin" on public.coupons for all using (public.is_admin()) with check (public.is_admin());

-- ---------- functions ----------
create or replace function public.check_coupon(p_code text) returns public.coupons
language sql stable security definer set search_path = public as $$
  select * from public.coupons
  where code = upper(p_code) and active and (expires_at is null or expires_at > now())
$$;

-- Builds the order from catalog prices so the browser can never set the amount.
create or replace function public.place_order(
  p_items jsonb, p_customer jsonb, p_notes text, p_coupon text, p_payment_method text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb := '[]';
  v_sub numeric := 0;
  v_disc numeric := 0;
  v_c public.coupons;
  v_line jsonb;
  v_p public.products;
  v_qty int;
  v_price numeric;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'سجّل دخولك أولاً'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'السلة فاضية'; end if;

  for v_line in select * from jsonb_array_elements(p_items) loop
    select * into v_p from public.products where id = v_line->>'product_id' and active;
    if not found then raise exception 'منتج غير متوفر: %', v_line->>'product_id'; end if;
    v_qty := greatest(1, least(999, coalesce((v_line->>'qty')::int, 1)));
    v_price := case when v_p.sale_price is not null and v_p.sale_price < v_p.price then v_p.sale_price else v_p.price end;
    v_sub := v_sub + v_price * v_qty;
    v_items := v_items || jsonb_build_object(
      'productId', v_p.id, 'name', v_p.name, 'price', v_price, 'qty', v_qty,
      'image', v_p.image, 'digital', v_p.digital, 'note', coalesce(v_line->>'note', ''));
  end loop;

  if p_coupon is not null and p_coupon <> '' then
    v_c := public.check_coupon(p_coupon);
    if v_c.code is null then raise exception 'الكود غير صالح أو منتهي'; end if;
    v_disc := least(v_sub, case when v_c.type = 'percent' then round(v_sub * v_c.value / 100, 2) else v_c.value end);
  end if;

  insert into public.orders (user_id, customer, items, subtotal, discount, coupon, total, notes, payment_method, history)
  values (auth.uid(), p_customer, v_items, v_sub, v_disc, nullif(upper(p_coupon), ''), v_sub - v_disc,
          coalesce(p_notes, ''), coalesce(p_payment_method, 'card'),
          jsonb_build_array(jsonb_build_object('status', 'pending', 'at', now())))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.set_order_status(p_order uuid, p_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'هذه العملية للإدارة فقط'; end if;
  update public.orders
     set status = p_status,
         history = history || jsonb_build_object('status', p_status, 'at', now(), 'note', coalesce(p_note, ''))
   where id = p_order;
end $$;

create or replace function public.admin_customers() returns table (
  id uuid, name text, email text, phone text, "createdAt" timestamptz, orders bigint, spent numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'هذه العملية للإدارة فقط'; end if;
  return query
    select p.id, p.name, p.email, p.phone, p.created_at,
           count(o.id),
           coalesce(sum(o.total) filter (where o.status not in ('pending', 'cancelled')), 0)
      from public.profiles p
      left join public.orders o on o.user_id = p.id
     where p.role = 'customer'
     group by p.id
     order by p.created_at desc;
end $$;

-- admin-only: set or clear the private file path of a digital product
create or replace function public.set_product_file(p_product text, p_path text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'هذه العملية للإدارة فقط'; end if;
  if coalesce(p_path, '') = '' then delete from public.product_files where product_id = p_product;
  else insert into public.product_files values (p_product, p_path) on conflict (product_id) do update set path = excluded.path;
  end if;
end $$;

-- ---------- explicit grants (works even with "Automatically expose new tables" turned off) ----------
grant usage on schema public to anon, authenticated, service_role;
grant select on public.categories, public.products to anon, authenticated;
grant insert, update, delete on public.categories, public.products to authenticated;
grant select, insert, update, delete on public.product_files, public.coupons to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.orders to authenticated;
grant select, insert, delete on public.wishlists to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.check_coupon(text) to anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, text, text, text) to authenticated;
grant execute on function public.set_order_status(uuid, text, text) to authenticated;
grant execute on function public.admin_customers() to authenticated;
grant execute on function public.set_product_file(text, text) to authenticated;

-- ---------- storage ----------
insert into storage.buckets (id, name, public) values ('products', 'products', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('downloads', 'downloads', false) on conflict (id) do nothing;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects for select using (bucket_id = 'products');
drop policy if exists "product images admin write" on storage.objects;
create policy "product images admin write" on storage.objects for insert with check (bucket_id in ('products', 'downloads') and public.is_admin());
drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects for update using (bucket_id in ('products', 'downloads') and public.is_admin());
drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects for delete using (bucket_id in ('products', 'downloads') and public.is_admin());

-- ---------- make yourself admin (after signing up on the site) ----------
-- update public.profiles set role = 'admin' where email = '<owner email>';

-- 2) Order contact details are trimmed to sane sizes, and the email always comes from the signed-in account
--    (the browser can't put someone else's email on an order or flood it with huge text).
create or replace function public.orders_sanitize() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.customer := jsonb_build_object(
    'name',  left(coalesce(new.customer->>'name', ''), 120),
    'phone', left(coalesce(new.customer->>'phone', ''), 20),
    'email', coalesce((select u.email from auth.users u where u.id = new.user_id), left(coalesce(new.customer->>'email', ''), 160))
  );
  new.notes := left(new.notes, 2000);
  if jsonb_array_length(coalesce(new.items, '[]'::jsonb)) > 50 then
    raise exception 'too many items';
  end if;
  return new;
end $$;
drop trigger if exists orders_sanitize on public.orders;
create trigger orders_sanitize before insert on public.orders
  for each row execute function public.orders_sanitize();

-- 4) Remembers which order emails were already sent (so a retry or webhook never sends one twice).
alter table public.orders add column if not exists notified text[] not null default '{}';
