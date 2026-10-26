-- Store — fixes the customers list (October 2026): "column reference email is ambiguous".
-- Same list as before (customers only, no owner or team accounts), with every column named by its table.
create or replace function public.admin_customers() returns table (
  id uuid, name text, email text, phone text, "createdAt" timestamptz, orders bigint, spent numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('customers') then raise exception 'هذه العملية للإدارة فقط'; end if;
  return query
    select p.id, p.name, p.email, p.phone, p.created_at,
           count(o.id),
           coalesce(sum(o.total) filter (where o.status not in ('pending', 'cancelled')), 0)
      from public.profiles p
      left join public.orders o on o.user_id = p.id
     where p.role = 'customer'
       and not exists (select 1 from public.staff s where s.email = lower(p.email))
     group by p.id
     order by p.created_at desc;
end $$;
revoke execute on function public.admin_customers() from public, anon;
grant execute on function public.admin_customers() to authenticated;

-- any account that signed up without a profile row gets one
insert into public.profiles (id, name, email, phone)
select u.id, coalesce(u.raw_user_meta_data->>'name', ''), coalesce(u.email, ''), coalesce(u.raw_user_meta_data->>'phone', '')
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
