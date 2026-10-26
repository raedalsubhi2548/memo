-- Store — Reports (التقارير): first-party visitor tracking + one admin report function.
-- Run once in Supabase → SQL Editor (after the other files). Safe to run again.

-- 1) Every page view / cart / checkout from the store. Written only by the server (/api/hit, service role);
--    nobody reads it directly — the admin sees it through admin_report below.
create table if not exists public.visits (
  id uuid primary key,
  at timestamptz not null default now(),
  kind text not null default 'view' check (kind in ('view', 'cart', 'checkout')),
  vid text not null,              -- random id kept in the visitor's browser (no name, email or IP)
  sid text not null,              -- one visit; a new one after 30 minutes of no activity
  path text not null default '/',
  ref text,                       -- the referring site (host only)
  source text not null default 'مباشر',
  campaign text,
  country text,
  city text,
  device text,
  os text,
  browser text,
  dur int                         -- seconds the page was on screen
);
create index if not exists visits_at_idx on public.visits (at);
create index if not exists visits_vid_idx on public.visits (vid, at);
alter table public.visits enable row level security;
revoke all on public.visits from anon, authenticated;
grant all on public.visits to service_role;

-- 2) The whole report for a period, in one call (admins only).
create or replace function public.admin_report(p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_len interval := p_to - p_from;
  v_out jsonb;
begin
  if not public.is_admin() then raise exception 'هذه العملية للإدارة فقط'; end if;
  if p_to <= p_from or v_len > interval '400 days' then raise exception 'فترة غير صالحة'; end if;

  with
  v    as (select * from public.visits where at >= p_from and at < p_to),
  pv   as (select * from v where kind = 'view'),
  prv  as (select * from public.visits where kind = 'view' and at >= p_from - v_len and at < p_from),
  sess as (select sid, count(*) as n, coalesce(sum(dur), 0) as d, min(at) as first_at from pv group by sid),
  firsts as (select distinct on (sid) sid, source from pv order by sid, at),
  o    as (select * from public.orders where created_at >= p_from and created_at < p_to),
  paid as (select * from o where status not in ('pending', 'cancelled')),
  ppaid as (select * from public.orders where created_at >= p_from - v_len and created_at < p_from and status not in ('pending', 'cancelled')),
  days as (select generate_series((p_from at time zone 'Asia/Riyadh')::date, ((p_to - interval '1 second') at time zone 'Asia/Riyadh')::date, interval '1 day')::date as d),
  dv   as (select (at at time zone 'Asia/Riyadh')::date as d, count(distinct vid) as visitors, count(*) as views from pv group by 1),
  ds   as (select (created_at at time zone 'Asia/Riyadh')::date as d, count(*) as orders, sum(total) as revenue from paid group by 1),
  items as (select i from paid, jsonb_array_elements(paid.items) as i)
  select jsonb_build_object(
    'visitors',    (select count(distinct vid) from pv),
    'views',       (select count(*) from pv),
    'sessions',    (select count(*) from sess),
    'bounce',      (select coalesce(round(100.0 * count(*) filter (where n = 1) / nullif(count(*), 0), 1), 0) from sess),
    'avgDuration', (select coalesce(round(avg(d)), 0) from sess),
    'newVisitors', (select count(distinct pv.vid) from pv where not exists (select 1 from public.visits x where x.vid = pv.vid and x.at < p_from)),
    'live',        (select count(distinct vid) from public.visits where at > now() - interval '5 minutes'),
    'liveList',    (select coalesce(jsonb_agg(l order by l.at desc), '[]') from (
                      select distinct on (vid) vid, path, country, city, device, source, at
                        from public.visits where kind = 'view' and at > now() - interval '5 minutes'
                       order by vid, at desc limit 30) l),
    'carts',       (select count(distinct vid) from v where kind = 'cart'),
    'checkouts',   (select count(distinct vid) from v where kind = 'checkout'),
    'revenue',     (select coalesce(sum(total), 0) from paid),
    'paidOrders',  (select count(*) from paid),
    'buyers',      (select count(distinct user_id) from paid),
    'discount',    (select coalesce(sum(discount), 0) from paid),
    'pending',     (select count(*) from o where status = 'pending'),
    'cancelled',   (select count(*) from o where status = 'cancelled'),
    'newCustomers',(select count(*) from public.profiles where role = 'customer' and created_at >= p_from and created_at < p_to),
    'prev', jsonb_build_object(
      'visitors', (select count(distinct vid) from prv),
      'views',    (select count(*) from prv),
      'revenue',  (select coalesce(sum(total), 0) from ppaid),
      'orders',   (select count(*) from ppaid)),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', days.d, 'visitors', coalesce(dv.visitors, 0), 'views', coalesce(dv.views, 0),
                                                           'orders', coalesce(ds.orders, 0), 'revenue', coalesce(ds.revenue, 0)) order by days.d), '[]')
                from days left join dv on dv.d = days.d left join ds on ds.d = days.d),
    'pages',     (select coalesce(jsonb_agg(x), '[]') from (select path as k, count(*) as n, count(distinct vid) as u from pv group by path order by n desc limit 12) x),
    'sources',   (select coalesce(jsonb_agg(x), '[]') from (select source as k, count(*) as n from firsts group by source order by n desc limit 10) x),
    'campaigns', (select coalesce(jsonb_agg(x), '[]') from (select campaign as k, count(distinct sid) as n from pv where campaign is not null group by campaign order by n desc limit 10) x),
    'countries', (select coalesce(jsonb_agg(x), '[]') from (select coalesce(country, '??') as k, count(distinct vid) as n from pv group by 1 order by n desc limit 10) x),
    'cities',    (select coalesce(jsonb_agg(x), '[]') from (select city as k, count(distinct vid) as n from pv where city is not null group by city order by n desc limit 10) x),
    'devices',   (select coalesce(jsonb_agg(x), '[]') from (select coalesce(device, 'غير معروف') as k, count(distinct vid) as n from pv group by 1 order by n desc) x),
    'browsers',  (select coalesce(jsonb_agg(x), '[]') from (select coalesce(browser, 'غير معروف') as k, count(distinct vid) as n from pv group by 1 order by n desc limit 8) x),
    'systems',   (select coalesce(jsonb_agg(x), '[]') from (select coalesce(os, 'غير معروف') as k, count(distinct vid) as n from pv group by 1 order by n desc limit 8) x),
    'hours',     (select coalesce(jsonb_agg(x order by x.k), '[]') from (select extract(hour from at at time zone 'Asia/Riyadh')::int as k, count(*) as n from pv group by 1) x),
    'products',  (select coalesce(jsonb_agg(x), '[]') from (
                    select i->>'productId' as id, max(i->>'name') as k, sum((i->>'qty')::int) as qty, sum((i->>'price')::numeric * (i->>'qty')::int) as n
                      from items group by i->>'productId' order by n desc limit 10) x),
    'coupons',   (select coalesce(jsonb_agg(x), '[]') from (select coupon as k, count(*) as n, sum(discount) as d from paid where coupon is not null group by coupon order by n desc limit 10) x)
  ) into v_out;
  return v_out;
end $$;

revoke execute on function public.admin_report(timestamptz, timestamptz) from anon, public;
grant execute on function public.admin_report(timestamptz, timestamptz) to authenticated;
