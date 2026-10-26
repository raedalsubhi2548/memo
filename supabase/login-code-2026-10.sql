-- Store — every sign-in is an email code (October 2026).
-- Run once in Supabase → SQL Editor, AFTER the other files. Safe to run again.

-- 1) No passwords: every existing account loses its password, so no password can open any account any more,
--    not even straight through the Supabase API. Customers and the owner sign in with the code emailed to them
--    (the store's login pages only ever ask for that code).
update auth.users set encrypted_password = '' where coalesce(encrypted_password, '') <> '';

-- 2) Owner powers come only from a session that signed in with a code. A session that signed in with a password
--    (one still open from before this change, or a password set again later through the API) is treated as a
--    customer session: it sees the customer's own data, never the dashboard's.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
     and not exists (
       select 1 from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) m
       where m ->> 'method' = 'password'
     )
$$;
