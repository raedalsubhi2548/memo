-- Store — security hardening (run once in Supabase → SQL Editor). Safe to run again.

-- 1) Customers may change only their name and phone: role AND email are locked for non-admins.
create or replace function public.protect_role() returns trigger
language plpgsql as $$
begin
  -- auth.uid() is null for the SQL editor and service role, which may change anything
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
  end if;
  return new;
end $$;

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
