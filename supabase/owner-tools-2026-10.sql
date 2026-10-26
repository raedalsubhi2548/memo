-- Store — owner tools (October 2026): design backups, manual orders, deleting orders.
-- Run once in Supabase → SQL Editor, AFTER staff-2026-10.sql. Safe to run again.

-- =====================================================================================================
-- 1) Design backups: every save of the store design (site_settings) is kept as a dated copy.
--    Only the owner can list them or bring one back (from مصمم المتجر ← النسخ الاحتياطية).
-- =====================================================================================================
create table if not exists public.settings_versions (
  id bigserial primary key,
  data jsonb not null,
  at timestamptz not null default now(),
  by_email text not null default '',
  note text not null default ''
);
create index if not exists settings_versions_at_idx on public.settings_versions (at desc);
alter table public.settings_versions enable row level security; -- no policies: only the functions below read it
revoke all on public.settings_versions from anon, authenticated;
grant all on public.settings_versions to service_role;

create or replace function public.settings_keep_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.data is not distinct from old.data then return new; end if;
  insert into public.settings_versions (data, by_email, note)
  values (new.data,
          coalesce((select u.email from auth.users u where u.id = auth.uid()), ''),
          coalesce(nullif(current_setting('raed.version_note', true), ''), ''));
  -- keep the latest 200
  delete from public.settings_versions where id in (select id from public.settings_versions order by at desc, id desc offset 200);
  return new;
end $$;
drop trigger if exists site_settings_keep_version on public.site_settings;
create trigger site_settings_keep_version after insert or update on public.site_settings
  for each row execute function public.settings_keep_version();

-- the design as it is now becomes the first backup
insert into public.settings_versions (data, at, note)
select s.data, s.updated_at, 'التصميم قبل تفعيل النسخ الاحتياطية'
  from public.site_settings s
 where s.id = 'main' and not exists (select 1 from public.settings_versions);

-- the list (owner only)
create or replace function public.owner_design_versions() returns table (id bigint, at timestamptz, by_email text, note text, current boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'النسخ الاحتياطية للمالك فقط'; end if;
  return query
    select v.id, v.at, v.by_email, v.note,
           v.id = (select max(x.id) from public.settings_versions x where x.data = (select s.data from public.site_settings s where s.id = 'main'))
      from public.settings_versions v
     order by v.at desc, v.id desc;
end $$;

-- bring one back (owner only); the restore itself is kept as a new version too
create or replace function public.owner_restore_design(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v public.settings_versions;
begin
  if not public.is_admin() then raise exception 'النسخ الاحتياطية للمالك فقط'; end if;
  select * into v from public.settings_versions where id = p_id;
  if v.id is null then raise exception 'النسخة غير موجودة'; end if;
  perform set_config('raed.version_note', 'استرجاع نسخة ' || to_char(v.at at time zone 'Asia/Riyadh', 'YYYY-MM-DD HH24:MI'), true);
  insert into public.site_settings (id, data, updated_at) values ('main', v.data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
end $$;

revoke execute on function public.owner_design_versions() from public, anon;
revoke execute on function public.owner_restore_design(bigint) from public, anon;
grant execute on function public.owner_design_versions() to authenticated;
grant execute on function public.owner_restore_design(bigint) to authenticated;

-- =====================================================================================================
-- 2) A new order from the dashboard (whoever has the «orders» area).
--    p_items: [{ product_id, qty, options: ["optionId:valueId"] }] or a free line [{ name, price, qty }]
--    Prices of store services come from the database, like checkout. p_status: 'pending' or 'paid'.
-- =====================================================================================================
create or replace function public.admin_create_order(
  p_user uuid, p_items jsonb, p_status text, p_notes text, p_discount numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb := '[]'; v_sub numeric := 0; v_disc numeric; v_line jsonb; v_p public.products;
  v_qty int; v_price numeric; v_id uuid; v_sel text[]; v_o jsonb; v_v jsonb; v_add numeric; v_chosen jsonb;
  v_prof public.profiles;
begin
  if not public.has_perm('orders') then raise exception 'ما عندك صلاحية الطلبات'; end if;
  if p_status not in ('pending', 'paid') then raise exception 'حالة غير صالحة'; end if;
  select * into v_prof from public.profiles where id = p_user;
  if v_prof.id is null then raise exception 'العميل غير موجود'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'أضف خدمة واحدة على الأقل'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'عدد الخدمات كبير'; end if;

  for v_line in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, least(999, coalesce((v_line->>'qty')::int, 1)));
    if coalesce(v_line->>'product_id', '') <> '' then
      select * into v_p from public.products where id = v_line->>'product_id';
      if v_p.id is null then raise exception 'خدمة غير موجودة: %', v_line->>'product_id'; end if;
      v_price := case when v_p.sale_price is not null and v_p.sale_price < v_p.price then v_p.sale_price else v_p.price end;
      v_sel := array(select jsonb_array_elements_text(case when jsonb_typeof(v_line->'options') = 'array' then v_line->'options' else '[]'::jsonb end) limit 50);
      v_add := 0; v_chosen := '[]';
      for v_o in select * from jsonb_array_elements(coalesce(v_p.options, '[]'::jsonb)) loop
        for v_v in select * from jsonb_array_elements(coalesce(v_o->'values', '[]'::jsonb)) loop
          if ((v_o->>'id') || ':' || (v_v->>'id')) = any(v_sel) then
            v_add := v_add + greatest(0, coalesce((v_v->>'price')::numeric, 0));
            v_chosen := v_chosen || jsonb_build_object('option', v_o->>'name', 'value', v_v->>'name', 'price', greatest(0, coalesce((v_v->>'price')::numeric, 0)));
          end if;
        end loop;
      end loop;
      v_price := v_price + v_add;
      v_items := v_items || jsonb_build_object('productId', v_p.id, 'name', v_p.name, 'price', v_price, 'qty', v_qty,
        'image', v_p.image, 'digital', v_p.digital, 'note', left(coalesce(v_line->>'note', ''), 500), 'options', v_chosen);
    else
      -- a free line written by the admin (custom work)
      if coalesce(trim(v_line->>'name'), '') = '' then raise exception 'اكتب اسم البند'; end if;
      v_price := round(coalesce((v_line->>'price')::numeric, -1), 2);
      if v_price < 0 or v_price > 1000000 then raise exception 'سعر البند غير صالح'; end if;
      v_items := v_items || jsonb_build_object('productId', null, 'name', left(trim(v_line->>'name'), 120), 'price', v_price, 'qty', v_qty,
        'image', null, 'digital', false, 'note', left(coalesce(v_line->>'note', ''), 500), 'options', '[]'::jsonb);
    end if;
    v_sub := v_sub + v_price * v_qty;
  end loop;

  v_disc := least(v_sub, greatest(0, round(coalesce(p_discount, 0), 2)));

  insert into public.orders (user_id, customer, items, subtotal, discount, total, notes, payment_method, payment_ref, status, history, terms_version)
  values (p_user,
          jsonb_build_object('name', v_prof.name, 'phone', v_prof.phone, 'email', v_prof.email),
          v_items, v_sub, v_disc, v_sub - v_disc, left(coalesce(p_notes, ''), 2000), 'card',
          case when p_status = 'paid' then 'manual' else null end,
          p_status,
          case when p_status = 'paid'
               then jsonb_build_array(jsonb_build_object('status', 'paid', 'at', now(), 'note', 'طلب يدوي من لوحة التحكم'))
               else jsonb_build_array(jsonb_build_object('status', 'pending', 'at', now(), 'note', 'طلب يدوي من لوحة التحكم')) end,
          'manual')
  returning id into v_id;
  return v_id;
end $$;

-- =====================================================================================================
-- 3) Delete an order (owner only)
-- =====================================================================================================
create or replace function public.owner_delete_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'حذف الطلبات للمالك فقط'; end if;
  delete from public.orders where id = p_order;
  if not found then raise exception 'الطلب غير موجود'; end if;
end $$;

revoke execute on function public.admin_create_order(uuid, jsonb, text, text, numeric) from public, anon;
revoke execute on function public.owner_delete_order(uuid) from public, anon;
grant execute on function public.admin_create_order(uuid, jsonb, text, text, numeric) to authenticated;
grant execute on function public.owner_delete_order(uuid) to authenticated;
