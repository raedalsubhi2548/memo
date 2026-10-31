// Tabby (pay in 4) through Tabby's own API, Saudi endpoint. The secret key stays here (server side); the browser only
// gets the hosted checkout link. Routed through api/tap-charge.js (?op=tabby, ?op=tabby-check), api/tap-verify.js
// (?op=tabby) and api/tap-webhook.js (?op=tabby).
// Env: TABBY_SECRET_KEY (Secret), VITE_TABBY_PUBLIC_KEY + VITE_TABBY_MERCHANT_CODE (the snippets and the store's code).
import crypto from 'node:crypto'
import { admin, siteUrl, markPaid } from './_shared.js'

const API = 'https://api.tabby.sa'
const key = () => (process.env.TABBY_SECRET_KEY || '').trim()
const merchant = () => (process.env.TABBY_MERCHANT_CODE || process.env.VITE_TABBY_MERCHANT_CODE || '').trim()
export const tabbyReady = () => !!key() && !!merchant()

async function call(path, { method = 'GET', body, headers } = {}) {
  const r = await fetch(API + path, {
    method,
    headers: { authorization: `Bearer ${key()}`, 'content-type': 'application/json', ...headers },
    body: body && JSON.stringify(body),
  })
  const b = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, b }
}

// Tabby's own reasons, in her words (shown instead of the Tabby option, never as an error)
const REASONS = {
  order_amount_too_high: 'مبلغ الطلب أعلى من الحد المتاح لك في تابي. جرّبي سلة أصغر أو ادفعي بالبطاقة.',
  order_amount_too_low: 'مبلغ الطلب أقل من الحد الأدنى لتابي. أضيفي منتجات أو ادفعي بالبطاقة.',
  not_available: 'تابي ما تقدر توافق على هالطلب. ادفعي بطريقة ثانية.',
}
const reason = (s) => REASONS[s?.configuration?.products?.installments?.rejection_reason] || REASONS.not_available

const money = (n) => (Math.round(Number(n || 0) * 100) / 100).toFixed(2)
const phone = (p) => String(p || '').replace(/\D/g, '').replace(/^(966|0)/, '')

/** Background check before Tabby is offered: can this buyer pay this amount with Tabby? → { ok, reason } */
export async function tabbyCheck({ amount, buyer }) {
  if (!tabbyReady()) return { ok: false, off: true }
  const { ok, b } = await call('/api/v2/checkout', { method: 'POST', body: {
    lang: 'ar', merchant_code: merchant(),
    payment: { amount: money(amount), currency: 'SAR', buyer: { name: buyer.name || 'عميلة', email: buyer.email, phone: phone(buyer.phone) },
      shipping_address: { city: '-', address: '-', zip: '-' }, order: { reference_id: 'check', items: [] }, buyer_history: { registered_since: buyer.since } },
  } })
  if (!ok) return { ok: false, reason: REASONS.not_available }
  return b.status === 'created' ? { ok: true } : { ok: false, reason: reason(b) }
}

// what Tabby asks about her: when she joined, and her earlier orders here (real values only)
async function history(order) {
  const { data: u } = await admin.auth.admin.getUserById(order.user_id).catch(() => ({ data: null }))
  const { data: past } = await admin.from('orders').select('created_at,total,status,customer,shipping,items')
    .eq('user_id', order.user_id).neq('id', order.id).order('created_at', { ascending: false }).limit(10)
  const STATUS = { pending: 'new', paid: 'processing', in_progress: 'processing', review: 'processing', completed: 'complete', cancelled: 'canceled' }
  return {
    since: u?.user?.created_at || order.created_at,
    done: (past || []).filter((o) => o.status === 'completed').length,
    orders: (past || []).map((o) => ({
      purchased_at: o.created_at, amount: money(o.total), status: STATUS[o.status] || 'unknown', payment_method: 'card',
      buyer: { name: o.customer?.name, email: o.customer?.email, phone: phone(o.customer?.phone) },
      ...(o.shipping?.city ? { shipping_address: { city: o.shipping.city, address: [o.shipping.district, o.shipping.street].filter(Boolean).join('، ') || o.shipping.city, zip: o.shipping.shortAddress || '-' } } : {}),
    })),
  }
}

/** A fresh Tabby checkout for a pending order (one per click, never reused) → { url } or { rejected: reason } */
export async function tabbySession(order) {
  const h = await history(order)
  const ids = [...new Set((order.items || []).map((it) => it.productId).filter(Boolean))]
  const { data: prods } = ids.length ? await admin.from('products').select('id,category_id,categories(name)').in('id', ids) : { data: [] }
  const cat = Object.fromEntries((prods || []).map((p) => [p.id, p.categories?.name || p.category_id || 'العناية']))
  const base = siteUrl()
  const back = (s) => `${base}/order/${order.id}?tabby=${s}`
  const sh = order.shipping || {}
  const { ok, b } = await call('/api/v2/checkout', { method: 'POST', body: {
    lang: 'ar', merchant_code: merchant(),
    merchant_urls: { success: back('success'), cancel: back('cancel'), failure: back('failure') },
    payment: {
      amount: money(order.total), currency: 'SAR', description: `طلب عناية ميمي #${order.number}`,
      buyer: { name: order.customer?.name || 'عميلة', email: order.customer?.email, phone: phone(order.customer?.phone) },
      shipping_address: { city: sh.city || '-', address: [sh.district, sh.street, sh.details].filter(Boolean).join('، ') || sh.city || '-', zip: sh.shortAddress || '-' },
      order: {
        reference_id: String(order.number),
        shipping_amount: money(order.shipping_fee), discount_amount: money(order.discount), tax_amount: '0.00',
        items: (order.items || []).map((it) => ({
          title: it.name, quantity: Number(it.qty) || 1, unit_price: money(it.price), category: cat[it.productId] || 'العناية',
          reference_id: String(it.productId || ''), ...(/^https?:/.test(it.image || '') ? { image_url: it.image } : it.image ? { image_url: base + it.image } : {}),
          ...(it.productId ? { product_url: `${base}/${encodeURIComponent(it.productId)}` } : {}),
        })),
      },
      buyer_history: { registered_since: h.since, loyalty_level: h.done },
      order_history: h.orders,
      meta: { order_id: order.id, customer: order.user_id },
    },
  } })
  if (!ok) throw new Error(b?.error || 'تعذّر فتح الدفع مع تابي، جرّبي بعد شوي أو ادفعي بالبطاقة')
  const url = b.configuration?.available_products?.installments?.[0]?.web_url
  if (b.status !== 'created' || !url || !b.payment?.id) return { rejected: reason(b) }
  await admin.from('orders').update({ payment_ref: 'tabby:' + b.payment.id }).eq('id', order.id).eq('status', 'pending')
  await ensureWebhook().catch((e) => console.error('tabby webhook', e.message))
  return { url }
}

/** Asks Tabby for the payment (never trusts the redirect or the webhook body), captures it once and marks the order
 *  paid. A payment for an order that is no longer waiting is closed, so Tabby never takes money for nothing. */
export async function confirmTabby(paymentId) {
  if (!/^[\w-]{8,80}$/.test(String(paymentId || ''))) return { ok: false, reason: 'bad-id' }
  const { ok, b: pay } = await call(`/api/v2/payments/${encodeURIComponent(paymentId)}`)
  if (!ok) return { ok: false, reason: 'payment-not-found' }
  // a payment from somewhere else on the same Tabby account (another store) has no order of ours
  const orderId = pay.meta?.order_id
  if (!orderId) return { ok: false, reason: 'not-ours' }
  const { data: order } = await admin.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (!order) return { ok: false, reason: 'order-not-found', status: pay.status }
  const ref = 'tabby:' + pay.id
  if (!['AUTHORIZED', 'CLOSED'].includes(pay.status)) return { ok: false, status: pay.status, orderId }
  if (Math.abs(Number(pay.amount) - Number(order.total)) > 0.01 || pay.currency !== 'SAR') return { ok: false, reason: 'amount-mismatch', orderId }
  const captured = (pay.captures || []).reduce((s, c) => s + Number(c.amount || 0), 0)
  if (pay.status === 'AUTHORIZED' && !captured) {
    if (order.status !== 'pending') {
      // already paid another way (or cancelled): release her Tabby payment instead of taking it
      await call(`/api/v2/payments/${encodeURIComponent(pay.id)}/close`, { method: 'POST' })
      return { ok: order.status !== 'cancelled', orderId }
    }
    const cap = await call(`/api/v2/payments/${encodeURIComponent(pay.id)}/captures`, { method: 'POST', body: { amount: money(pay.amount), reference_id: `capture-${order.id}` } })
    if (!cap.ok) { console.error('tabby capture', cap.status, JSON.stringify(cap.b).slice(0, 300)); return { ok: false, reason: 'capture-failed', orderId } }
  }
  await markPaid(order, { ref, amount: pay.amount, via: 'تابي', where: 'لوحة تابي' })
  return { ok: true, orderId }
}

// the webhook knows us by a header only Tabby has (derived from the secret key, so nothing extra to keep)
export const webhookSecret = () => crypto.createHash('sha256').update('mimi-tabby-hook:' + key()).digest('hex').slice(0, 40)
let hooked = false
async function ensureWebhook() {
  if (hooked) return
  const url = `${siteUrl()}/api/tap-webhook?op=tabby`
  const headers = { 'x-merchant-code': merchant() }
  const { ok, b } = await call('/api/v1/webhooks', { headers })
  const list = Array.isArray(b) ? b : b?.webhooks || []
  if (ok && list.some((w) => w.url === url)) { hooked = true; return }
  const r = await call('/api/v1/webhooks', { method: 'POST', headers, body: { url, header: { title: 'X-Mimi-Hook', value: webhookSecret() } } })
  if (r.ok) hooked = true
  else console.error('tabby webhook register', r.status, JSON.stringify(r.b).slice(0, 300))
}

/** Tabby's status posts: answered at once, then the payment is looked up and confirmed. */
export async function tabbyWebhook(req, res) {
  if (String(req.headers['x-mimi-hook'] || '') !== webhookSecret()) return res.status(401).json({ ok: false })
  const id = String(req.body?.id || '')
  const status = String(req.body?.status || '').toLowerCase()
  if (status === 'authorized' || status === 'closed') {
    const out = await confirmTabby(id)
    // the order isn't there yet: a non-200 makes Tabby try again
    if (out.reason === 'order-not-found') return res.status(404).json({ ok: false })
  }
  return res.status(200).json({ ok: true })
}
