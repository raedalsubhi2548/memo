-- Store — the customers page lists every account (October 2026): customers, the owner and the team,
-- each with its kind ('owner' / 'staff' / 'customer') and the team role name.
drop function if exists public.admin_customers();
create function public.admin_customers() returns table (
  id uuid, name text, email text, phone text, "createdAt" timestamptz, orders bigint, spent numeric, kind text, "staffRole" text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('customers') then raise exception 'هذه العملية للإدارة فقط'; end if;
  return query
    select p.id, p.name, p.email, p.phone, p.created_at,
           count(o.id),
           coalesce(sum(o.total) filter (where o.status not in ('pending', 'cancelled')), 0),
           case when p.role = 'admin' then 'owner' when s.email is not null then 'staff' else 'customer' end,
           coalesce(s.role, '')
      from public.profiles p
      left join public.staff s on s.email = lower(p.email)
      left join public.orders o on o.user_id = p.id
     group by p.id, s.email, s.role
     order by p.created_at desc;
end $$;
revoke execute on function public.admin_customers() from public, anon;
grant execute on function public.admin_customers() to authenticated;
