-- Store designer (لوحة التحكم ← مصمم المتجر): one row of look-and-feel settings. Safe to run more than once.
create table if not exists public.site_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint site_settings_size check (pg_column_size(data) < 32000)
);
alter table public.site_settings enable row level security;

drop policy if exists "settings public read" on public.site_settings;
create policy "settings public read" on public.site_settings for select using (true);
drop policy if exists "settings admin write" on public.site_settings;
create policy "settings admin write" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
