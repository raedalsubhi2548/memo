-- Store — product options + security hardening (run in Supabase → SQL Editor). Safe to run again.
-- Adds the options column, teaches place_order to price them,
-- and tightens abuse limits (coupon guessing, order flooding, oversized input). Prices are always computed here.


alter table public.products add column if not exists options jsonb not null default '[]'::jsonb;


-- Each order records when the customer accepted the terms & declaration, and which version (shown on the invoice)
alter table public.orders add column if not exists terms_accepted_at timestamptz;
alter table public.orders add column if not exists terms_version text;

-- Coupons: optional usage cap
alter table public.coupons add column if not exists max_uses int;
alter table public.coupons add column if not exists used int not null default 0;

-- a used-up coupon reads as invalid
create or replace function public.check_coupon(p_code text) returns public.coupons
language sql stable security definer set search_path = public as $$
  select * from public.coupons
  where code = upper(p_code) and active and (expires_at is null or expires_at > now())
    and (max_uses is null or used < max_uses)
$$;

-- p_items: [{ product_id, qty, note, options: ["optionId:valueId", ...] }]
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

-- Guests can't call order/coupon functions (checkout needs an account anyway) — stops coupon guessing by bots
revoke execute on function public.check_coupon(text) from anon, public;
revoke execute on function public.place_order(jsonb, jsonb, text, text, text) from anon, public;
grant execute on function public.check_coupon(text) to authenticated;
grant execute on function public.place_order(jsonb, jsonb, text, text, text) to authenticated;

-- Customers may edit only their name and phone, at sane lengths
revoke update on public.profiles from authenticated;
grant update (name, phone) on public.profiles to authenticated;
do $$ begin
  alter table public.profiles add constraint profiles_sizes check (length(name) <= 120 and length(phone) <= 20) not valid;
exception when duplicate_object then null; end $$;

-- No negative prices or over-100% coupons, even by a typo in the dashboard
do $$ begin
  alter table public.products add constraint products_sale_price_ok check (sale_price is null or sale_price >= 0) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.coupons add constraint coupons_value_ok check (value >= 0 and (type <> 'percent' or value <= 100)) not valid;
exception when duplicate_object then null; end $$;
