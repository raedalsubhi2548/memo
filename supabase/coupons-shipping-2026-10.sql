-- Coupons with free shipping (October 2026): a code can take money off, make shipping free, or both.
-- Run AFTER store-2026-10.sql (install.sql already has it in order). Safe to run again.

alter table public.coupons add column if not exists free_shipping boolean not null default false;
-- a free-shipping code may take nothing else off (value 0); any other code still needs a value
alter table public.coupons drop constraint if exists coupons_value_check;
alter table public.coupons drop constraint if exists coupons_value_or_shipping;
alter table public.coupons add constraint coupons_value_or_shipping check (value > 0 or free_shipping);

-- the row type gained a column: rebuild the function that returns it
create or replace function public.check_coupon(p_code text) returns public.coupons
language sql stable security definer set search_path = public as $$
  select * from public.coupons
  where code = upper(p_code) and active and (expires_at is null or expires_at > now())
    and (max_uses is null or used < max_uses)
$$;
revoke execute on function public.check_coupon(text) from anon, public;
grant execute on function public.check_coupon(text) to authenticated;

-- place_order: the same as store-2026-10.sql, except a free-shipping coupon makes the shipping fee 0.
create or replace function public.place_order(
  p_items jsonb, p_customer jsonb, p_shipping jsonb, p_notes text, p_coupon text, p_payment_method text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb := '[]';
  v_sub numeric := 0;
  v_disc numeric := 0;
  v_fee numeric := 0;
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
  v_short text;
  v_ship jsonb;
begin
  if auth.uid() is null then raise exception 'سجّلي دخولك أولاً'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'السلة فاضية'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'عدد المنتجات في الطلب كبير'; end if;
  -- no flooding: at most 15 orders an hour per account
  if (select count(*) from public.orders where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 15 then
    raise exception 'محاولات كثيرة، حاولي بعد شوي';
  end if;

  -- the shipping address: the short national address is required and checked, the rest is trimmed and capped
  if p_shipping is null or jsonb_typeof(p_shipping) <> 'object' then raise exception 'اكتبي عنوان الشحن'; end if;
  v_short := upper(regexp_replace(coalesce(p_shipping->>'shortAddress', ''), '[\s-]', '', 'g'));
  if v_short !~ '^[A-Z]{4}[0-9]{4}$' then raise exception 'العنوان الوطني المختصر غير صحيح (4 حروف و4 أرقام)'; end if;
  if btrim(coalesce(p_shipping->>'city', '')) = '' then raise exception 'اكتبي المدينة'; end if;
  if btrim(coalesce(p_shipping->>'district', '')) = '' then raise exception 'اكتبي الحي'; end if;
  v_ship := jsonb_build_object(
    'shortAddress', v_short,
    'city', left(btrim(p_shipping->>'city'), 60),
    'district', left(btrim(p_shipping->>'district'), 80),
    'street', left(btrim(coalesce(p_shipping->>'street', '')), 120),
    'details', left(btrim(coalesce(p_shipping->>'details', '')), 300));

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
      if coalesce((v_o->>'required')::boolean, false) and v_n = 0 then raise exception 'اختاري «%» في %', v_o->>'name', v_p.name; end if;
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

  v_fee := case when coalesce(v_c.free_shipping, false) then 0 else public.shipping_fee_for(v_sub) end;

  insert into public.orders (user_id, customer, items, subtotal, discount, coupon, total, notes, payment_method, history, terms_accepted_at, terms_version, shipping, shipping_fee)
  values (auth.uid(), p_customer, v_items, v_sub, v_disc, nullif(upper(p_coupon), ''), v_sub - v_disc + v_fee,
          left(coalesce(p_notes, ''), 2000), 'card',  -- payment is online only (Tap)
          jsonb_build_array(jsonb_build_object('status', 'pending', 'at', now())),
          now(), '2026-10',  -- checkout can't submit without accepting the terms (src/data/terms.js TERMS_VERSION)
          v_ship, v_fee)
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.place_order(jsonb, jsonb, jsonb, text, text, text) from anon, public;
grant execute on function public.place_order(jsonb, jsonb, jsonb, text, text, text) to authenticated;
