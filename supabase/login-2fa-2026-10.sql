-- Store — two-step sign-in: password, then a code by email (October 2026).
-- Run once in Supabase → SQL Editor, AFTER login-code-2026-10.sql. Safe to run again.
-- How it works: the store's server checks the password (api/login-start.js), records it here, and only then emails a
-- code. The dashboard accepts a session only when it signed in with that code right after a recorded password,
-- so neither the password alone nor a code requested straight from Supabase opens it.

-- 1) Correct passwords, recorded by the server (no one else can read or write them)
create table if not exists public.login_checks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists login_checks_user_at on public.login_checks(user_id, at desc);
alter table public.login_checks enable row level security; -- no policies: only the server (service role) uses it
revoke all on public.login_checks from anon, authenticated;

-- 2) Owner powers: a code session that follows a recorded password within 15 minutes, never a password session
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  with s as (
    select coalesce(auth.jwt() -> 'amr', '[]'::jsonb) as amr
  ), t as (
    select to_timestamp(max((m ->> 'timestamp')::bigint)) as signed_in,
           bool_or(m ->> 'method' = 'password') as by_password
    from s, jsonb_array_elements(s.amr) m
  )
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
     and coalesce((select not by_password from t), false)
     and exists (
       select 1 from public.login_checks c, t
       where c.user_id = auth.uid()
         and c.at between t.signed_in - interval '15 minutes' and t.signed_in + interval '1 minute'
     )
$$;

-- 3) Old checks are not needed after a day
create or replace function public.login_checks_prune() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.login_checks where at < now() - interval '1 day';
  return null;
end $$;
drop trigger if exists login_checks_prune on public.login_checks;
create trigger login_checks_prune after insert on public.login_checks for each statement execute function public.login_checks_prune();
