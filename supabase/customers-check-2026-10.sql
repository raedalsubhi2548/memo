-- Store — customers list check (October 2026). Safe to run any time.
-- 1) Any account that signed up without a profile row gets one (the customers list reads profiles).
insert into public.profiles (id, name, email, phone)
select u.id, coalesce(u.raw_user_meta_data->>'name', ''), coalesce(u.email, ''), coalesce(u.raw_user_meta_data->>'phone', '')
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- 2) Every account and why it is (or isn't) in the customers list
select u.email,
       u.created_at::date as created,
       coalesce(p.role, 'no profile') as role,
       (s.email is not null) as in_team,
       case when p.role = 'admin' then 'مالك: ما يظهر في العملاء'
            when s.email is not null then 'من الفريق: ما يظهر في العملاء'
            when p.role = 'customer' then 'عميل: يظهر'
            else 'بدون ملف' end as status
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.staff s on s.email = lower(u.email)
 order by u.created_at desc;
