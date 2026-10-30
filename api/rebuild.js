// POST (owner, or staff with products / categories / design / blog / reviews) → rebuilds the site through the Vercel deploy hook, so the pre-rendered pages, link previews and
// search engines pick up a new design from the store designer. The hook URL is a secret: VERCEL_DEPLOY_HOOK.
// GET ?op=feed (also /merchant.xml) → the live product feed for Google Merchant Center, read from the database on every
// request, so a product the owner adds or changes in the dashboard is in the next fetch with no rebuild.
import { admin, adminFromRequest, siteUrl } from './_shared.js'

let last = 0

export default async function handler(req, res) {
  if (req.method === 'GET' && req.query.op === 'feed') return feed(res)
  if (req.method !== 'POST') return res.status(405).json({ ok: false })
  if (!(await adminFromRequest(req, ['products', 'categories', 'design', 'blog', 'reviews'])) && !(await freshReview(req.body))) return res.status(403).json({ ok: false })
  const hook = process.env.VERCEL_DEPLOY_HOOK
  if (!hook || !/^https:\/\/api\.vercel\.com\//.test(hook)) return res.status(200).json({ ok: false, reason: 'no-hook' })
  // several quick publishes need one rebuild, not five
  if (Date.now() - last < 60_000) return res.status(200).json({ ok: true, queued: true })
  last = Date.now()
  const r = await fetch(hook, { method: 'POST' }).catch(() => null)
  return res.status(200).json({ ok: !!r?.ok })
}

// a customer's review that was just published on its own (4–5 stars) also rebuilds the pages it shows on:
// allowed only with that order's private review token, and only in the minutes after the review was published
async function freshReview(b) {
  const id = String(b?.order || ''), t = String(b?.token || '')
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(t)) return false
  const { data: o } = await admin.from('orders').select('id').eq('id', id).eq('review_token', t).maybeSingle()
  if (!o) return false
  const { data: r } = await admin.from('reviews').select('published_at').eq('order_id', id).eq('status', 'published').maybeSingle()
  return !!r?.published_at && Date.now() - new Date(r.published_at).getTime() < 10 * 60_000
}

// ---- Google Merchant Center feed (RSS 2.0 with the g: namespace) ----
const CAT_ART = { 'hair-care': '/brand/cat-hair-care-v2.webp', 'skin-care': '/brand/cat-skin-care-v2.webp' }
const GOOGLE_CAT = { 'hair-care': 'Health & Beauty > Personal Care > Hair Care', 'skin-care': 'Health & Beauty > Personal Care > Cosmetics > Bath & Body' }
const x = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
// the page text is light markdown (## headings, - lists): the feed wants plain sentences
const plain = (t) => String(t || '').replace(/^#+\s*/gm, '').replace(/^-\s*/gm, '• ').replace(/\n{2,}/g, '\n').trim().slice(0, 4900)
const money = (n) => `${Number(n).toFixed(2)} SAR`

async function feed(res) {
  const site = siteUrl() || 'https://www.memecare1.com'
  const abs = (p) => (/^https?:/.test(p) ? p : site + p)
  const [{ data: products, error }, { data: cats }, { data: settings }] = await Promise.all([
    admin.from('products').select('*').eq('active', true).order('sort'),
    admin.from('categories').select('id,name'),
    admin.from('site_settings').select('data').eq('id', 'main').maybeSingle(),
  ])
  if (error) return res.status(500).send('feed unavailable')
  const ship = settings?.data?.shipping || {}
  const fee = Math.min(500, Math.max(0, Number(ship.fee ?? 35) || 0))
  const store = settings?.data?.store?.name || 'عناية ميمي'
  const catName = Object.fromEntries((cats || []).map((c) => [c.id, c.name]))
  const items = (products || []).filter((p) => !p.digital).map((p) => {
    const sale = p.sale_price != null && Number(p.sale_price) < Number(p.price)
    const image = p.image && !p.image.startsWith('data:') ? p.image : CAT_ART[p.category_id]
    return `    <item>
      <g:id>${x(p.id)}</g:id>
      <g:title>${x(p.name)}</g:title>
      <g:description>${x(plain(p.description || p.summary || p.name))}</g:description>
      <g:link>${x(abs('/' + p.id))}</g:link>
      ${image ? `<g:image_link>${x(abs(image))}</g:image_link>` : ''}
      <g:availability>in_stock</g:availability>
      <g:price>${money(p.price)}</g:price>
      ${sale ? `<g:sale_price>${money(p.sale_price)}</g:sale_price>` : ''}
      <g:brand>${x(store)}</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      ${GOOGLE_CAT[p.category_id] ? `<g:google_product_category>${x(GOOGLE_CAT[p.category_id])}</g:google_product_category>` : ''}
      ${catName[p.category_id] ? `<g:product_type>${x(catName[p.category_id])}</g:product_type>` : ''}
      <g:shipping><g:country>SA</g:country><g:price>${money(fee)}</g:price></g:shipping>
    </item>`.replace(/\n\s*\n/g, '\n')
  })
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${x(store)}</title>
    <link>${x(site + '/')}</link>
    <description>${x(store)}: منتجات المتجر</description>
${items.join('\n')}
  </channel>
</rss>
`)
}
