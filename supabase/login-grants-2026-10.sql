-- Store — fix: the server may record correct passwords (October 2026). Run once in Supabase → SQL Editor.
-- login_checks was created without a grant for the server (service_role), so every check silently failed to save
-- and the dashboard never recognised a two-step sign-in. Safe to run again.
grant all on public.login_checks to service_role;
grant all on public.staff to service_role;
grant usage, select on all sequences in schema public to service_role;

-- should show «نعم» twice
select 'login_checks' as "الجدول", case when has_table_privilege('service_role', 'public.login_checks', 'insert') then 'نعم' else 'لا' end as "الخادم يقدر يكتب"
union all
select 'staff', case when has_table_privilege('service_role', 'public.staff', 'insert') then 'نعم' else 'لا' end;
