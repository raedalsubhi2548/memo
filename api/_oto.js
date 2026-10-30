// OTO shipping (tryoto.com, «أوتو API» sales channel): the waybill for a paid order, its print link, and the status
// updates OTO pushes back. Docs: https://apis.tryoto.com — works on OTO's free plan (no getDeliveryOptions there, so
// OTO picks the delivery company itself).
// Env: OTO_REFRESH_TOKEN (Secret, from «ربط القناة» in OTO), optional OTO_PICKUP_CODE (the pickup location's code;
// without it the first active location in OTO is used).
import { createHmac, timingSafeEqual } from 'node:crypto'
import { admin, siteUrl } from './_shared.js'
import { sendOrderEmail, sendAdminAlert, loadSeller } from './_mail.js'

const OTO = 'https://api.tryoto.com/rest/v2'
export const otoReady = () => !!(process.env.OTO_REFRESH_TOKEN || '').trim()

// the access token lives one hour: keep it while the function stays warm
let access = { token: '', exp: 0 }
async function token() {
  if (access.token && Date.now() < access.exp) return access.token
  const r = await fetch(`${OTO}/refreshToken`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refresh_token: process.env.OTO_REFRESH_TOKEN.trim() }) })
  const b = await r.json().catch(() => ({}))
  if (!r.ok || !b.access_token) throw new Error('ما قدرنا ندخل أوتو: تأكد من OTO_REFRESH_TOKEN في Vercel')
  access = { token: b.access_token, exp: Date.now() + 50 * 60_000 }
  return access.token
}
async function call(path, { method = 'GET', body } = {}) {
  const r = await fetch(OTO + path, { method, headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' }, body: body && JSON.stringify(body) })
  const b = await r.json().catch(() => ({}))
  return { ok: r.ok && b.success !== false, status: r.status, b }
}
const otoError = (b) => {
  if (b.otoErrorCode === 'OTO1006') return 'رصيد محفظة أوتو ما يكفي، اشحني الرصيد وجربي مرة ثانية'
  // OTO's code and any field list it sends, so a refusal names what is missing
  const extra = Object.entries(b).filter(([k]) => !/^(success|otoErrorMessage|message)$/.test(k)).map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`).join(' ')
  return `أوتو رفض الطلب: ${String(b.otoErrorMessage || b.message || 'خطأ غير معروف').slice(0, 120)}${extra ? ` (${extra.slice(0, 200)})` : ''}`
}

// OTO knows the order by the store's order number
const ref = (o) => String(o.number)
const RANK = { pending: 0, paid: 1, in_progress: 2, review: 3, completed: 4 }

/** Moves the order forward only (never back, never out of cancelled) and sends that status's email once. */
async function advance(order, status, note) {
  if (!(status in RANK) || !(order.status in RANK) || RANK[status] <= RANK[order.status]) return order
  const { data } = await admin.from('orders').update({
    status, history: [...(order.history || []), { status, at: new Date().toISOString(), note }],
  }).eq('id', order.id).eq('status', order.status).select('*')
  if (!data?.[0]) return order
  await sendOrderEmail(data[0], status).catch(() => {})
  return data[0]
}
const saveShipment = async (order, patch) => {
  const shipment = { ...(order.shipment || {}), ...patch, at: new Date().toISOString() }
  await admin.from('orders').update({ shipment }).eq('id', order.id)
  return { ...order, shipment }
}

// the webhook address carries a key made from the server's own secret: only OTO (which we gave it to) knows it
const hookKey = () => createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || '').update('oto-webhook').digest('hex').slice(0, 40)
const hookUrl = () => `${siteUrl()}/api/invoice?op=oto&k=${hookKey()}`
async function ensureWebhook() {
  const { ok, b } = await call('/webhook')
  if (!ok || (b.webhooks || []).some((w) => w.url === hookUrl())) return
  for (const webhookType of ['orderStatus', 'shipmentError']) await call('/webhook', { method: 'POST', body: { method: 'post', url: hookUrl(), webhookType } })
}

// where the courier collects: OTO_PICKUP_CODE, else the first active pickup location in OTO («مواقع المرسل»)
async function pickupCode() {
  const set = (process.env.OTO_PICKUP_CODE || '').trim()
  if (set) return set
  const { ok, b } = await call('/getPickupLocationList?status=active')
  const code = ok && [...(b.warehouses || []), ...(b.branches || [])].find((l) => l.code)?.code
  if (!code) throw new Error('أضيفي موقع استلام في أوتو (الإعدادات ← مواقع المرسل) وجربي مرة ثانية')
  return String(code)
}

/** Creates the OTO order with its shipment. { weight (kg), count } come from the owner, never guessed. */
export async function createShipment(order, { weight, count }) {
  if (!otoReady()) throw new Error('أوتو مو مربوط: أضف OTO_REFRESH_TOKEN في Vercel')
  if (!('shipment' in order)) throw new Error('شغّل ملف supabase/shipping-2026-10.sql في Supabase أولاً')
  if (!order.shipping) throw new Error('الطلب ما فيه عنوان شحن')
  if (!['paid', 'in_progress'].includes(order.status)) throw new Error('البوليصة تنسوّى للطلبات المدفوعة فقط')
  if (order.shipment?.otoId && !order.shipment.error) throw new Error('البوليصة منشأة من قبل')
  await ensureWebhook().catch((e) => console.error('oto webhook', e?.message))
  const s = order.shipping, c = order.customer || {}
  const seller = await loadSeller()
  const pickup = await pickupCode()
  const d = new Date(new Date(order.created_at).getTime() + 3 * 3600_000), p = (n) => String(n).padStart(2, '0') // Saudi time
  const items = (order.items || []).map((it) => ({
    // OTO takes a numeric productId only (the store's ids are text: it rides in the sku instead)
    ...(/^\d+$/.test(String(it.productId || '')) ? { productId: Number(it.productId) } : {}), name: String(it.name || '').slice(0, 120), price: Number(it.price), quantity: Number(it.qty) || 1,
    rowTotal: Number(it.price) * (Number(it.qty) || 1), sku: String(it.productId || it.name || '').slice(0, 60),
    ...(it.image && /^https?:/.test(it.image) ? { image: it.image } : it.image ? { image: siteUrl() + it.image } : {}),
  }))
  let res = await call('/createOrder', { method: 'POST', body: {
    orderId: ref(order), createShipment: true, payment_method: 'paid', amount: Number(order.total), amount_due: 0, currency: 'SAR',
    packageCount: count, packageWeight: weight, senderName: seller.name,
    orderDate: `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
    pickupLocationCode: pickup,
    customer: {
      name: c.name, email: c.email, mobile: String(c.phone || '').replace(/\D/g, '').replace(/^(966|0)/, ''),
      address: [s.street, s.district, s.city, s.details].filter((x) => String(x || '').trim()).join('، ') || s.shortAddress,
      district: s.district, city: s.city, country: 'SA', shortAddressCode: s.shortAddress, refID: order.user_id || undefined,
    },
    items,
  } })
  // the OTO order is there from an earlier try (its shipment failed): ask for the shipment again
  if (!res.ok && /exist/i.test(res.b.otoErrorMessage || '') && order.shipment?.otoId) res = await call('/createShipment', { method: 'POST', body: { orderId: ref(order) } })
  if (!res.ok) throw new Error(otoError(res.b))
  const saved = await saveShipment(order, { ref: ref(order), otoId: res.b.otoId || order.shipment?.otoId || null, weight, count, requestedAt: new Date().toISOString(), status: 'requested', error: null })
  return advance(saved, 'in_progress', 'أُنشئت بوليصة الشحن في أوتو').then((o) => ({ ...o, shipment: saved.shipment }))
}

/** The waybill's print link (and the tracking number, once the delivery company gave one). */
export async function shipmentLabel(order) {
  if (!order.shipment?.ref) throw new Error('ما فيه بوليصة لهذا الطلب')
  const { ok, b } = await call(`/print/${encodeURIComponent(order.shipment.ref)}`)
  if (!ok || !b.printAWBURL) throw new Error(ok ? 'البوليصة لسا تتجهّز عند شركة الشحن، جربي بعد دقيقة' : otoError(b))
  const saved = await saveShipment(order, { awbUrl: b.printAWBURL, trackingNumber: b.trackingNumber || order.shipment.trackingNumber || null, company: b.deliveryCompany || order.shipment.company || null })
  return saved.shipment
}

// OTO's statuses → the store's: on the road = «تم الشحن», delivered = «تم التوصيل»
const MOVING = /^(pickedUp|inTransit|shipmentInProgress|outForDelivery|arrivedTerminal|arrivedDestinationTerminal)$/

/** POST from OTO (orderStatus or shipmentError). */
export async function otoWebhook(req, res) {
  const k = String(req.query.k || ''), want = hookKey()
  if (k.length !== want.length || !timingSafeEqual(Buffer.from(k), Buffer.from(want))) return res.status(401).json({ ok: false })
  const b = req.body || {}
  const number = Number(String(b.orderId || '').replace(/\D/g, ''))
  if (!number) return res.status(200).json({ ok: true, skipped: 'no-order' })
  const { data: order } = await admin.from('orders').select('*').eq('number', number).maybeSingle()
  if (!order) return res.status(200).json({ ok: true, skipped: 'unknown-order' })

  if (b.errorMessage || b.errorCode) {
    const error = [b.errorMessage, b.deliveryCompanyResponse].filter(Boolean).join(' · ').slice(0, 300)
    await saveShipment(order, { status: 'error', error })
    await sendAdminAlert(`ما انشحن الطلب #${order.number}`, `شركة الشحن (${b.deliveryCompany || 'أوتو'}) رفضت إنشاء الشحنة:\n${error}\n\nافتحي الطلب في لوحة التحكم وجربي «إنشاء بوليصة» مرة ثانية بعد التصحيح.`).catch(() => {})
    return res.status(200).json({ ok: true })
  }

  const status = String(b.status || '')
  const saved = await saveShipment(order, {
    status, dcStatus: b.dcStatus || null, error: null,
    ...(b.trackingNumber || b.dcTrackingNumber ? { trackingNumber: b.dcTrackingNumber || b.trackingNumber } : {}),
    ...(b.brandedTrackingURL || b.trackingUrl ? { trackingUrl: b.brandedTrackingURL || b.trackingUrl } : {}),
    ...(b.printAWBURL ? { awbUrl: b.printAWBURL } : {}),
    ...(b.deliveryCompany ? { company: b.deliveryCompany } : {}),
  })
  if (status === 'delivered') await advance(saved, 'completed', 'تم التوصيل (أوتو)')
  else if (MOVING.test(status)) await advance(saved, 'review', 'استلمت شركة الشحن الطلب (أوتو)')
  else if (/^(returned|undelivered)$/.test(status)) await sendAdminAlert(`الطلب #${order.number}: ${status === 'returned' ? 'رجعت الشحنة' : 'ما تم التوصيل'}`, `حالة الشحنة في أوتو: ${status}${b.attemptFailureReason ? `\nالسبب: ${b.attemptFailureReason}` : ''}`).catch(() => {})
  return res.status(200).json({ ok: true })
}
