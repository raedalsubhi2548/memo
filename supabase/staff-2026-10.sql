-- Store — staff and permissions (October 2026).
-- Run once in Supabase → SQL Editor, AFTER login-2fa-2026-10.sql. Safe to run again.
-- The owner (profiles.role = 'admin') keeps everything. Staff are added by email from لوحة التحكم ← الفريق والصلاحيات
-- (api/staff.js), each with the dashboard areas they may open. Staff sign in exactly like the owner: password, then
-- the emailed code; no area opens for a password-only session.

-- 1) The team (only the server reads or writes it; the dashboard goes through api/staff.js)
create table if not exists public.staff (
  email text primary key check (email = lower(email) and email like '%_@_%'),
  name text not null default '',
  role text not null default '',
  perms text[] not null default '{}' check (perms <@ array['orders', 'reports', 'products', 'categories', 'customers', 'coupons', 'design']::text[]),
  added_at timestamptz not null default now()
);
alter table public.staff enable row level security; -- no policies
revoke all on public.staff from anon, authenticated;
grant all on public.staff to service_role;

-- 2) A two-step session: signed in by the emailed code, right after a correct password (see login-2fa-2026-10.sql)
create or replace function public.strong_session() returns boolean
language sql stable security definer set search_path = public as $$
  with s as (
    select coalesce(auth.jwt() -> 'amr', '[]'::jsonb) as amr
  ), t as (
    select to_timestamp(max((m ->> 'timestamp')::bigint)) as signed_in,
           bool_or(m ->> 'method' = 'password') as by_password
    from s, jsonb_array_elements(s.amr) m
  )
  select auth.uid() is not null
     and coalesce((select not by_password from t), false)
     and exists (
       select 1 from public.login_checks c, t
       where c.user_id = auth.uid()
         and c.at between t.signed_in - interval '15 minutes' and t.signed_in + interval '1 minute'
     )
$$;

-- 3) The owner (unchanged meaning: role admin + two-step session) — used where only the owner may act
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') and public.strong_session()
$$;

-- 4) May this session use one dashboard area? The owner may use all of them.
create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.strong_session() and (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or exists (select 1 from public.staff s join auth.users u on lower(u.email) = s.email where u.id = auth.uid() and p = any(s.perms))
  )
$$;

-- 5) What the signed-in person may open (the dashboard draws its menu from this)
create or replace function public.my_access() returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when not public.strong_session() then jsonb_build_object('owner', false, 'role', '', 'perms', '[]'::jsonb, 'strong', false)
    when exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      then jsonb_build_object('owner', true, 'role', 'المالك', 'perms', to_jsonb(array['orders', 'reports', 'products', 'categories', 'customers', 'coupons', 'design', 'team']), 'strong', true)
    else coalesce((select jsonb_build_object('owner', false, 'role', s.role, 'perms', to_jsonb(s.perms), 'strong', true)
                     from public.staff s join auth.users u on lower(u.email) = s.email where u.id = auth.uid()),
                  jsonb_build_object('owner', false, 'role', '', 'perms', '[]'::jsonb, 'strong', true))
  end
$$;

revoke execute on function public.strong_session() from public;
revoke execute on function public.my_access() from public, anon;
grant execute on function public.strong_session(), public.has_perm(text), public.is_admin() to anon, authenticated;
grant execute on function public.my_access() to authenticated;

-- 6) Each table follows its own area
drop policy if exists "categories admin" on public.categories;
create policy "categories admin" on public.categories for all using ((select public.has_perm('categories'))) with check ((select public.has_perm('categories')));

drop policy if exists "products public" on public.products;
create policy "products public" on public.products for select using (active or (select public.has_perm('products')));
drop policy if exists "products admin" on public.products;
create policy "products admin" on public.products for all using ((select public.has_perm('products'))) with check ((select public.has_perm('products')));

drop policy if exists "files admin" on public.product_files;
create policy "files admin" on public.product_files for all using ((select public.has_perm('products'))) with check ((select public.has_perm('products')));

drop policy if exists "orders own read" on public.orders;
create policy "orders own read" on public.orders for select using (user_id = auth.uid() or (select public.has_perm('orders')));

drop policy if exists "coupons admin" on public.coupons;
create policy "coupons admin" on public.coupons for all using ((select public.has_perm('coupons'))) with check ((select public.has_perm('coupons')));

drop policy if exists "settings admin write" on public.site_settings;
create policy "settings admin write" on public.site_settings for all using ((select public.has_perm('design'))) with check ((select public.has_perm('design')));

-- images: products and the store designer upload to «products»; the private «downloads» files are products only
drop policy if exists "product images admin write" on storage.objects;
create policy "product images admin write" on storage.objects for insert with check (
  (bucket_id = 'products' and (public.has_perm('products') or public.has_perm('design'))) or (bucket_id = 'downloads' and public.has_perm('products')));
drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects for update using (
  (bucket_id = 'products' and (public.has_perm('products') or public.has_perm('design'))) or (bucket_id = 'downloads' and public.has_perm('products')));
drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects for delete using (
  (bucket_id = 'products' and (public.has_perm('products') or public.has_perm('design'))) or (bucket_id = 'downloads' and public.has_perm('products')));

-- 7) The dashboard functions check their own area (same bodies, only the check changes; grants are kept)
do $$
declare f record; d text;
begin
  for f in select * from (values
    ('public.set_order_status(uuid,text,text)', 'orders'),
    ('public.admin_customers()', 'customers'),
    ('public.set_product_file(text,text)', 'products'),
    ('public.admin_report(timestamptz,timestamptz)', 'reports')
  ) v(fn, perm) loop
    if to_regprocedure(f.fn) is null then continue; end if;
    d := pg_get_functiondef(f.fn::regprocedure);
    d := replace(d, 'not public.is_admin()', format('not public.has_perm(%L)', f.perm));
    execute d;
  end loop;
end $$;

-- 8) Staff are not customers: keep them out of the customers list
do $$
declare d text;
begin
  d := pg_get_functiondef('public.admin_customers()'::regprocedure);
  if position('public.staff' in d) = 0 then
    d := replace(d, 'where p.role = ''customer''', 'where p.role = ''customer'' and lower(p.email) not in (select email from public.staff)');
    execute d;
  end if;
end $$;
