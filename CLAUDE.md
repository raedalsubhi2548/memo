# CLAUDE.md — عناية ميمي (Mimi Care)

Project memory for Claude Code. Read this before any change.

## Who / how to talk
- Built and run by Raed for his client (the store owner, a woman). Reply to Raed in Arabic, Saudi dialect, short and direct.
- Store copy talks to women customers: feminine forms (أضيفي، تسوّقي، اطلبي).
- Never invent numbers, prices, facts, reviews or ratings. Leave a blank and ask.
- Never ask for or paste secrets. They live in Vercel / Supabase; Raed enters them himself.
- Ask before anything irreversible (deleting data, account/settings changes, submitting forms, payments).

## What this is
A custom-coded store for hair and skin care products, forked (Oct 2026) from Raed's own platform (rraed.com) and adapted:
- Physical products with shipping: checkout asks for the national short address (4 letters + 4 digits), city, district, street, details.
- Shipping fee: owner-editable in لوحة التحكم ← مصمم المتجر ← معلومات المتجر ← «الشحن» (fee, free-over amount). Default 35 SAR.
  The database computes it (`shipping_fee_for` in `supabase/store-2026-10.sql`) — the browser never sets totals.
  A coupon can also give free shipping (`coupons.free_shipping`, switch «مع شحن مجاني» in كوبونات الخصم; a free-shipping code may have no discount). `place_order` lives in `supabase/coupons-shipping-2026-10.sql` now.
- Removed from the fork: blog, portfolio, Tamara, Snap Conversions API, the old services catalog, the business-verification seal.
- Order statuses keep the database ids, with store labels: pending بانتظار الدفع → paid تم الدفع → in_progress قيد التجهيز → review تم الشحن → completed تم التوصيل (+ cancelled).
- Reviews: only real ones, written by customers through the private link in the «تم التوصيل» email. No made-up reviews anywhere.

## Stack
- React 18 + Vite, Tailwind v4, Radix, lucide. Build-time prerender: `npm run build` must pass.
- Supabase (auth, Postgres + RLS + SECURITY DEFINER RPCs, storage). No env → demo mode (`src/lib/local.js`, localStorage).
- Vercel functions in `api/` (Hobby plan: 12 max — merge with `?op=`, don't add files). Files starting with `_` are helpers.
- Payments: Tap hosted page (`api/tap-charge.js`), confirmed server-side (`api/_shared.js confirmCharge`) + webhook.
- Domain: `VITE_SITE_URL` / `SITE_URL` env. `admin.<domain>` opens the dashboard; until a domain is set, use `/admin`.

## Key places
- Brand: `src/styles/tokens.css` (rose wine #7d3f4c, blush #e7c2bb, rose-gold #b98572, soft blush ground #fbf6f4), `src/lib/theme.js` (defaults, home blocks, shipping settings, `mergeSettings`).
- Design (27 Oct 2026, from Raed's own reference screenshot of a store he likes): formal and soft. Almarai for headings (soft and formal — Raed: «ناعم ورسمي»; Reem Kufi was too hard), IBM Plex Sans Arabic for text,
  modest sizes, rounded corners, soft wine-tinted shadows, a fixed blush background (`body` in `src/index.css`).
  Raed rejected a big-type «name as a monument» design (26 Oct) — don't go back to it. When he sends a reference, build from it.
- Home: `src/pages/Home.jsx` — the hero: three banners, marketing words over soft pictures (`hero-*-v4.webp`) with the store's own product photos
  fanned on them like cards (`HeroProducts`, the logo is on the labels). Raed wants his real products (with the logo) in the hero, never staged look-alikes. Motion: slow zoom, headline unmask, progress line per banner.
  Under them: round section pictures (`categories`), then each section as one frame (`shelf`): its banner, joined to its products.
  The parts melt into each other (no thread or dividers, see below). Then the order steps as one chain across (a light runs step to step while on screen; on phones the current step's line shows under it) and questions.
  «أسرار العطارة» was removed from the home page (`src/data/world.js` kept for the blog later).
  Product card: `src/components/home/ServiceTicket.jsx` — small and calm (square photo on blush, section, name, price, «أضيفي للسلة» → «تمت الإضافة»).
  Cards are one fixed width (188px, half the row on phones) in a centred wrapping row, so products the owner adds later line up beside the others.
  Footer bottom line: «تصميم وتنفيذ منصة رائد» linking to https://rraed.com (Raed asked, 27 Oct).
- Catalog seed: `src/data/seed.js` → `node scripts/seed-sql.mjs` writes `supabase/seed.sql`.
- Checkout + address: `src/pages/Checkout.jsx`, `src/lib/address.js`. Admin order sheet shows the address + «نسخ العنوان للشحن».
- Shipping waybills (OTO, free plan, 30 Oct 2026): `api/_oto.js`, routed through `api/invoice.js?op=ship|awb|oto`. The owner types the parcel weight and presses «إنشاء بوليصة» in the order sheet (never auto, never a guessed weight). OTO picks the carrier. The webhook (registered automatically, key in the URL) moves orders to تم الشحن / تم التوصيل. Env `OTO_REFRESH_TOKEN` (Secret), optional `OTO_PICKUP_CODE` (without it: the first active location in OTO «مواقع المرسل»). Column `orders.shipment` from `supabase/shipping-2026-10.sql`.
- Policies: `src/data/terms.js` (DRAFT — the owner reviews returns/shipping wording and adds her CR / freelance number).
- Images: `public/brand/` (`hero-silk|hair|herbs-v4.webp`, `products/*-v4.webp`; `cat-*-v2.webp` still used by SEO and the dashboard). `/brand/*` is cached 30 days: a new image = a new file name.
  Generated with Codex (gpt-image) on 27 Oct 2026. Products copy Raed's real containers: the saboonia jar (clear PET, only a little taller than wide, smooth flat cream — never swirled «ice cream») and the oil (PET bottle, white screw cap, dark brown oil, label = the woman drawn large with no ring and no text, green leaves on the left — exactly his photo), soap labels: logo and the name, on a travertine pedestal over blush. Hero pictures keep the right half empty for the words. Recipe: scene with the exact Arabic label text and no reference image, then an edit pass with the HD logo as reference.
  `scripts/brand-art.mjs` is the old code-drawn fallback (writes the pre-v2 names); don't run it over the photos.

- 27 Oct 2026 (Raed): the store is ONE blended picture — no threads, beads, dots or dividers between sections, no white boxes around them.
  Hero and shelf pictures run full width and fade into the blush ground (mask-image); shelf products rise out of their picture.
  Footer: silk waves (blush behind wine) + rose-gold sprig drawings. Products kept modest in size (shelf grid max 880px).
  On phones the hero's product cards sit in the flow above the words, never under them. Copy: no invented details («دقائق» was wrong).

## Database
- New project: run `supabase/install.sql` once in the SQL Editor (generated by `node scripts/install-sql.mjs` from the files in order). Then make the owner admin:
  `update public.profiles set role = 'admin' where email = '<owner email>';`
- Later changes: a new SQL file in `supabase/`, add it to `scripts/install-sql.mjs`, test it locally (PGlite with stubbed auth works), and Raed runs it. Never run SQL on production yourself.

## Env vars (names only; see .env.example)
`VITE_SITE_URL`, `SITE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TAP_SECRET_KEY`, `VITE_TAP_PUBLIC_KEY` (optional), `VITE_TAP_MERCHANT_ID` (optional, Apple Pay), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `ORDER_NOTIFY_TO`, `STORE_EMAIL`, `VERCEL_DEPLOY_HOOK`, `OTO_REFRESH_TOKEN`, optional `OTO_PICKUP_CODE`, `VITE_GA_ID`, `VITE_SNAP_PIXEL`, `VITE_TURNSTILE_SITE_KEY`.

## Rules that broke things before (inherited)
- The server is the only place prices and totals are computed (`place_order`). Test the demo checkout after touching checkout/payments.
- Hydration: anything that differs between server and first client render (cart, dates) loads after hydration.
- `mergeSettings` is the only way settings reach the page.
- Demo mode keeps the catalog in localStorage; `SEED_VERSION` in `src/lib/local.js` includes the product image paths so a renamed picture re-seeds it (old paths showed broken images).
- Prerendered pages need a redeploy after catalog rows change (the dashboard triggers it via `VERCEL_DEPLOY_HOOK`).
