-- Store — security fixes (October 2026). Run once in Supabase → SQL Editor, AFTER the other files. Safe to run again.

-- 1) A cancelled unpaid order gives its coupon use back (admin cancel, or the customer starting a new checkout).
create or replace function public.orders_coupon_release() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status = 'cancelled' and new.coupon is not null then
    update public.coupons set used = greatest(used - 1, 0) where code = new.coupon;
  end if;
  return new;
end $$;
drop trigger if exists orders_coupon_release on public.orders;
create trigger orders_coupon_release after update of status on public.orders
  for each row execute function public.orders_coupon_release();

-- 2) place_order: same as before, plus the "one open checkout per code" rule above.
create or replace function public.place_order(
  p_items jsonb, p_customer jsonb, p_notes text, p_coupon text, p_payment_method text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb := '[]';
  v_sub numeric := 0;
  v_disc numeric := 0;
  v_c public.coupons;
  v_line jsonb;
  v_p public.products;
  v_qty int;
  v_price numeric;
  v_id uuid;
  v_sel text[];
  v_o jsonb;
  v_v jsonb;
  v_n int;
  v_add numeric;
  v_chosen jsonb;
begin
  if auth.uid() is null then raise exception 'سجّل دخولك أولاً'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'السلة فاضية'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'عدد الخدمات في الطلب كبير'; end if;
  -- no flooding: at most 15 orders an hour per account
  if (select count(*) from public.orders where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 15 then
    raise exception 'محاولات كثيرة، حاول بعد شوي';
  end if;

  for v_line in select * from jsonb_array_elements(p_items) loop
    select * into v_p from public.products where id = v_line->>'product_id' and active;
    if not found then raise exception 'منتج غير متوفر: %', v_line->>'product_id'; end if;
    v_qty := greatest(1, least(999, coalesce((v_line->>'qty')::int, 1)));
    v_price := case when v_p.sale_price is not null and v_p.sale_price < v_p.price then v_p.sale_price else v_p.price end;

    -- options: only choices that exist on the product count; required ones must be chosen; "pick one" means one
    v_sel := array(select jsonb_array_elements_text(case when jsonb_typeof(v_line->'options') = 'array' then v_line->'options' else '[]'::jsonb end) limit 50);
    v_add := 0;
    v_chosen := '[]';
    for v_o in select * from jsonb_array_elements(coalesce(v_p.options, '[]'::jsonb)) loop
      v_n := 0;
      for v_v in select * from jsonb_array_elements(coalesce(v_o->'values', '[]'::jsonb)) loop
        if ((v_o->>'id') || ':' || (v_v->>'id')) = any(v_sel) then
          v_n := v_n + 1;
          v_add := v_add + greatest(0, coalesce((v_v->>'price')::numeric, 0));
          v_chosen := v_chosen || jsonb_build_object('option', v_o->>'name', 'value', v_v->>'name', 'price', greatest(0, coalesce((v_v->>'price')::numeric, 0)));
        end if;
      end loop;
      if coalesce((v_o->>'required')::boolean, false) and v_n = 0 then raise exception 'اختر «%» في %', v_o->>'name', v_p.name; end if;
      if v_o->>'type' = 'radio' and v_n > 1 then raise exception 'اختيار واحد بس في «%»', v_o->>'name'; end if;
    end loop;
    v_price := v_price + v_add;

    v_sub := v_sub + v_price * v_qty;
    v_items := v_items || jsonb_build_object(
      'productId', v_p.id, 'name', v_p.name, 'price', v_price, 'qty', v_qty,
      'image', v_p.image, 'digital', v_p.digital, 'note', left(coalesce(v_line->>'note', ''), 500), 'options', v_chosen);
  end loop;

  if p_coupon is not null and p_coupon <> '' then
    -- one open checkout per account per code: an earlier unpaid order with the same code is cancelled
    -- (the release trigger gives its use back), so unpaid orders can't eat up a limited coupon
    update public.orders
       set status = 'cancelled',
           history = history || jsonb_build_array(jsonb_build_object('status', 'cancelled', 'at', now(), 'note', 'استُبدل بطلب أحدث بنفس كود الخصم'))
     where user_id = auth.uid() and status = 'pending' and coupon = upper(p_coupon);
    v_c := public.check_coupon(p_coupon);
    if v_c.code is null then raise exception 'الكود غير صالح أو منتهي'; end if;
    v_disc := least(v_sub, case when v_c.type = 'percent' then round(v_sub * least(v_c.value, 100) / 100, 2) else greatest(v_c.value, 0) end);
    -- count the use; a coupon with max_uses stops once it is used up
    update public.coupons set used = used + 1 where code = v_c.code and (max_uses is null or used < max_uses);
    if not found then raise exception 'كود الخصم انتهى عدد استخداماته'; end if;
  end if;

  insert into public.orders (user_id, customer, items, subtotal, discount, coupon, total, notes, payment_method, history, terms_accepted_at, terms_version)
  values (auth.uid(), p_customer, v_items, v_sub, v_disc, nullif(upper(p_coupon), ''), v_sub - v_disc,
          left(coalesce(p_notes, ''), 2000), 'card',  -- payment is online only (Tap); bank transfer was removed
          jsonb_build_array(jsonb_build_object('status', 'pending', 'at', now())),
          now(), '2026-10')  -- checkout can't submit without accepting the terms (src/data/terms.js TERMS_VERSION)
  returning id into v_id;
  return v_id;
end $$;

-- 3) Order status: only the store's known statuses, and a paid order can't go back to "awaiting payment"
--    (that would let a second card payment be taken for it).
create or replace function public.set_order_status(p_order uuid, p_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  if not public.is_admin() then raise exception 'هذه العملية للإدارة فقط'; end if;
  if p_status not in ('pending', 'paid', 'in_progress', 'review', 'completed', 'cancelled') then raise exception 'حالة غير معروفة'; end if;
  select status into v_old from public.orders where id = p_order for update;
  if v_old is null then raise exception 'الطلب غير موجود'; end if;
  if p_status = 'pending' and v_old <> 'pending' then raise exception 'ما يصير ترجع الطلب لـ«بانتظار الدفع» بعد ما تغيّرت حالته'; end if;
  update public.orders
     set status = p_status,
         history = history || jsonb_build_object('status', p_status, 'at', now(), 'note', left(coalesce(p_note, ''), 500))
   where id = p_order;
end $$;

-- 4) Re-apply the tighter grants (re-running schema.sql would have opened these again)
revoke execute on function public.check_coupon(text) from anon, public;
revoke execute on function public.place_order(jsonb, jsonb, text, text, text) from anon, public;
revoke execute on function public.set_order_status(uuid, text, text) from anon, public;
grant execute on function public.check_coupon(text) to authenticated;
grant execute on function public.place_order(jsonb, jsonb, text, text, text) to authenticated;
grant execute on function public.set_order_status(uuid, text, text) to authenticated;
revoke update on public.profiles from authenticated;
grant update (name, phone) on public.profiles to authenticated;

-- 5) The public images bucket takes images only, up to 5 MB (the private downloads bucket is unchanged).
update storage.buckets
   set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'],
       file_size_limit = 5242880
 where id = 'products';
