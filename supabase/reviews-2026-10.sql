-- Store — customer reviews and service questions (October 2026).
-- Run once in Supabase → SQL Editor, AFTER blog-2026-10.sql. Safe to run again.
--  · When an order is marked «مكتمل», its email carries a private review link (/review/<order>?t=<token>).
--    The customer rates the service and the store (1–5) and writes a few words. 4 or 5 on both is published
--    at once; anything lower waits in لوحة التحكم ← التقييمات والأسئلة until the owner publishes or deletes it.
--  · Anyone can ask a question on a service page; it waits there until it is answered and published.
--  · Published ones show under the service, on the home page and on /reviews (after the automatic rebuild).

-- 1) A private token per order for its review link
alter table public.orders add column if not exists review_token uuid not null default gen_random_uuid();

-- 2) Reviews: one per order
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique references public.orders(id) on delete set null,
  products text[] not null default '{}' check (cardinality(products) <= 30),
  name text not null check (length(name) between 1 and 60),
  service_rating int not null check (service_rating between 1 and 5),
  store_rating int not null check (store_rating between 1 and 5),
  body text not null default '' check (length(body) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists reviews_status_idx on public.reviews(status, created_at desc);

-- 3) Questions on a service
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  product_id text references public.products(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  contact text not null default '' check (length(contact) <= 120),
  question text not null check (length(question) between 3 and 600),
  answer text not null default '' check (length(answer) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists questions_status_idx on public.questions(status, created_at desc);

-- 4) «التقييمات والأسئلة» becomes one of the areas a staff member can be given
do $$
declare c text;
begin
  if to_regclass('public.staff') is null then return; end if;
  for c in select conname from pg_constraint where conrelid = 'public.staff'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%perms%' loop
    execute format('alter table public.staff drop constraint %I', c);
  end loop;
  alter table public.staff add constraint staff_perms_check
    check (perms <@ array['orders', 'reports', 'products', 'categories', 'customers', 'coupons', 'design', 'blog', 'reviews']::text[]);
end $$;

create or replace function public.my_access() returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when not public.strong_session() then jsonb_build_object('owner', false, 'role', '', 'perms', '[]'::jsonb, 'strong', false)
    when exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      then jsonb_build_object('owner', true, 'role', 'المالك', 'perms', to_jsonb(array['orders', 'reports', 'products', 'categories', 'customers', 'coupons', 'design', 'blog', 'reviews', 'team']), 'strong', true)
    else coalesce((select jsonb_build_object('owner', false, 'role', s.role, 'perms', to_jsonb(s.perms), 'strong', true)
                     from public.staff s join auth.users u on lower(u.email) = s.email where u.id = auth.uid()),
                  jsonb_build_object('owner', false, 'role', '', 'perms', '[]'::jsonb, 'strong', true))
  end
$$;
revoke execute on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;

-- 5) The dashboard reads and manages both tables; the public never reads them directly
alter table public.reviews enable row level security;
alter table public.questions enable row level security;
drop policy if exists "reviews admin" on public.reviews;
create policy "reviews admin" on public.reviews for all using ((select public.has_perm('reviews'))) with check ((select public.has_perm('reviews')));
drop policy if exists "questions admin" on public.questions;
create policy "questions admin" on public.questions for all using ((select public.has_perm('reviews'))) with check ((select public.has_perm('reviews')));
revoke all on public.reviews, public.questions from anon;
grant select, update, delete on public.reviews, public.questions to authenticated;
grant all on public.reviews, public.questions to service_role;

-- 6) What the site shows: published reviews and answered questions, without order ids or contact details
create or replace function public.public_feedback() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'products', to_jsonb(r.products),
        'service', r.service_rating, 'store', r.store_rating, 'text', r.body, 'date', to_char(coalesce(r.published_at, r.created_at), 'YYYY-MM-DD'))
        order by coalesce(r.published_at, r.created_at) desc)
      from public.reviews r where r.status = 'published'), '[]'::jsonb),
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'productId', q.product_id, 'name', q.name,
        'question', q.question, 'answer', q.answer, 'date', to_char(coalesce(q.answered_at, q.created_at), 'YYYY-MM-DD'))
        order by coalesce(q.answered_at, q.created_at) desc)
      from public.questions q where q.status = 'published' and q.answer <> ''), '[]'::jsonb))
$$;

-- 7) The review page: what the link opens (only a completed order, only with its own token)
create or replace function public.review_form(p_order uuid, p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order and review_token = p_token;
  if o.id is null then return jsonb_build_object('ok', false, 'reason', 'not-found'); end if;
  if o.status <> 'completed' then return jsonb_build_object('ok', false, 'reason', 'not-completed'); end if;
  return jsonb_build_object('ok', true, 'number', o.number,
    'name', split_part(coalesce(o.customer->>'name', ''), ' ', 1),
    'items', coalesce((select jsonb_agg(jsonb_build_object('productId', it->>'productId', 'name', it->>'name'))
                        from jsonb_array_elements(o.items) it), '[]'::jsonb),
    'done', exists (select 1 from public.reviews where order_id = o.id));
end $$;

create or replace function public.submit_review(p_order uuid, p_token uuid, p_name text, p_service int, p_store int, p_body text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare o public.orders; v_status text; v_name text := left(trim(coalesce(p_name, '')), 60);
begin
  select * into o from public.orders where id = p_order and review_token = p_token;
  if o.id is null then raise exception 'رابط التقييم غير صالح'; end if;
  if o.status <> 'completed' then raise exception 'التقييم يفتح بعد اكتمال الطلب'; end if;
  if exists (select 1 from public.reviews where order_id = o.id) then raise exception 'قيّمت هذا الطلب من قبل، شكراً لك'; end if;
  if p_service not between 1 and 5 or p_store not between 1 and 5 then raise exception 'اختر التقييم من 1 إلى 5'; end if;
  if v_name = '' then v_name := left(coalesce(nullif(split_part(o.customer->>'name', ' ', 1), ''), 'عميل'), 60); end if;
  v_status := case when p_service >= 4 and p_store >= 4 then 'published' else 'pending' end;
  insert into public.reviews (order_id, products, name, service_rating, store_rating, body, status, published_at)
  values (o.id,
          coalesce((select array_agg(distinct it->>'productId') from jsonb_array_elements(o.items) it where coalesce(it->>'productId', '') <> ''), '{}'),
          v_name, p_service, p_store, left(trim(coalesce(p_body, '')), 1000), v_status,
          case when v_status = 'published' then now() end);
  return v_status;
end $$;

-- 8) A question from a service page (waits for an answer); a light cap keeps the inbox from flooding
create or replace function public.ask_question(p_product text, p_name text, p_contact text, p_question text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_q text := trim(coalesce(p_question, '')); v_name text := left(trim(coalesce(p_name, '')), 60);
begin
  if not exists (select 1 from public.products where id = p_product and active) then raise exception 'الخدمة غير موجودة'; end if;
  if length(v_q) < 3 then raise exception 'اكتب سؤالك'; end if;
  if v_name = '' then raise exception 'اكتب اسمك'; end if;
  if (select count(*) from public.questions where created_at > now() - interval '1 hour') >= 60 then raise exception 'حاول بعد شوي'; end if;
  insert into public.questions (product_id, name, contact, question) values (p_product, v_name, left(trim(coalesce(p_contact, '')), 120), left(v_q, 600));
  return true;
end $$;

revoke execute on function public.public_feedback(), public.review_form(uuid, uuid), public.submit_review(uuid, uuid, text, int, int, text), public.ask_question(text, text, text, text) from public;
grant execute on function public.public_feedback(), public.review_form(uuid, uuid), public.submit_review(uuid, uuid, text, int, int, text), public.ask_question(text, text, text, text) to anon, authenticated;

-- should show the two tables and the new staff rule
select (select count(*) from public.reviews) as "التقييمات", (select count(*) from public.questions) as "الأسئلة",
       exists (select 1 from pg_constraint where conname = 'staff_perms_check' and pg_get_constraintdef(oid) like '%reviews%') as "صلاحية التقييمات";
