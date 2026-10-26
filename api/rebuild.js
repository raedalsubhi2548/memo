// POST (owner, or staff with products / categories / design / blog / reviews) → rebuilds the site through the Vercel deploy hook, so the pre-rendered pages, link previews and
// search engines pick up a new design from the store designer. The hook URL is a secret: VERCEL_DEPLOY_HOOK.
import { admin, adminFromRequest } from './_shared.js'

let last = 0

export default async function handler(req, res) {
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
