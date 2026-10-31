// OTO shipping (tryoto.com, «أوتو API» sales channel): the waybill for a paid order, its print link, and the status
// updates OTO pushes back. Docs: https://apis.tryoto.com — works on OTO's free plan (no getDeliveryOptions there, so
// OTO picks the delivery company itself).
// Env: OTO_REFRESH_TOKEN (Secret, from «ربط القناة» in OTO), optional OTO_PICKUP_CODE (the pickup location's code;
// without it the first active location in OTO is used), optional OTO_CARRIER (default smsa; auto = OTO picks).
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
async function pickupLocation() {
  const set = (process.env.OTO_PICKUP_CODE || '').trim()
  const { ok, b } = await call('/getPickupLocationList?status=active')
  const all = ok ? [...(b.warehouses || []), ...(b.branches || [])].filter((l) => l.code) : []
  const loc = set ? all.find((l) => String(l.code) === set) || { code: set } : all[0]
  if (!loc) throw new Error('أضيفي موقع استلام في أوتو (الإعدادات ← مواقع المرسل) وجربي مرة ثانية')
  return { code: String(loc.code), city: loc.city || '' }
}

// the delivery company: OTO_CARRIER (default «smsa»; «auto» lets OTO pick). The free plan has no default-company
// setting, so the store asks OTO's own price list for that company's option and names it on every shipment.
// The option id belongs to the company's service, not the route: asked once with the pickup city on both ends.
let carrierCache = { key: '', v: null }
async function deliveryFees(originCity, destinationCity, weight) {
  const { ok, b } = await call('/checkOTODeliveryFee', { method: 'POST', body: { originCity, destinationCity, weight: Math.max(1, Math.ceil(weight)) } })
  if (!ok) throw new Error(otoError(b))
  return (b.deliveryCompany || []).filter((o) => o.deliveryOptionId)
}
// the company's ordinary service to her door first (not same-day, locker or branch pickup), then the cheapest
function preferred(list, want) {
  const mine = list.filter((o) => `${o.deliveryCompanyName || ''} ${o.deliveryOptionName || ''}`.toLowerCase().includes(want))
  const plain = mine.filter((o) => (!o.deliveryType || o.deliveryType === 'toCustomerDoorstep') && !/sameDay|bullet|pudo|locker/i.test(`${o.serviceType} ${o.deliveryOptionName}`))
  return [...(plain.length ? plain : mine)].sort((x, y) => Number(x.price) - Number(y.price))[0] || null
}
async function carrierOption(city, weight) {
  const want = (process.env.OTO_CARRIER || 'smsa').trim().toLowerCase()
  if (want === 'auto') return null
  if (carrierCache.key === want + city && carrierCache.v) return carrierCache.v
  if (!city) throw new Error('ما عرفنا مدينة موقع الاستلام في أوتو، تأكد منها في «مواقع المرسل»')
  const list = await deliveryFees(city, city, weight)
  const pick = preferred(list, want)
  if (!pick) throw new Error(`شركة «${want}» مو ضمن شركات أوتو المتاحة لك: ${[...new Set(list.map((o) => o.deliveryCompanyName))].join('، ') || 'ما رجعت أي شركة'}`)
  carrierCache = { key: want + city, v: { id: pick.deliveryOptionId, name: pick.deliveryOptionName || pick.deliveryCompanyName } }
  return carrierCache.v
}

/** Creates the OTO order with its shipment. { weight (kg), count } come from the owner, never guessed. */
export async function createShipment(order, { weight, count, option }) {
  if (!otoReady()) throw new Error('أوتو مو مربوط: أضف OTO_REFRESH_TOKEN في Vercel')
  if (!('shipment' in order)) throw new Error('شغّل ملف supabase/shipping-2026-10.sql في Supabase أولاً')
  if (!order.shipping) throw new Error('الطلب ما فيه عنوان شحن')
  if (!['paid', 'in_progress'].includes(order.status)) throw new Error('البوليصة تنسوّى للطلبات المدفوعة فقط')
  if (order.shipment?.otoId && !order.shipment.error && order.shipment.status !== 'cancelled') throw new Error('البوليصة منشأة من قبل')
  await ensureWebhook().catch((e) => console.error('oto webhook', e?.message))
  const s = order.shipping, c = order.customer || {}
  const seller = await loadSeller()
  const pickup = await pickupLocation()
  // the company the owner picked from the price list, else the default one (OTO_CARRIER)
  const carrier = option?.id ? option : await carrierOption(pickup.city, weight)
  const dc = carrier ? { deliveryOptionId: carrier.id } : {}
  const d = new Date(new Date(order.created_at).getTime() + 3 * 3600_000), p = (n) => String(n).padStart(2, '0') // Saudi time
  const items = (order.items || []).map((it) => ({
    // OTO takes a numeric productId only (the store's ids are text: it rides in the sku instead)
    ...(/^\d+$/.test(String(it.productId || '')) ? { productId: Number(it.productId) } : {}), name: String(it.name || '').slice(0, 120), price: Number(it.price), quantity: Number(it.qty) || 1,
    rowTotal: Number(it.price) * (Number(it.qty) || 1), sku: String(it.productId || it.name || '').slice(0, 60),
    ...(it.image && /^https?:/.test(it.image) ? { image: it.image } : it.image ? { image: siteUrl() + it.image } : {}),
  }))
  // a retry: the OTO order is there already, only its shipment failed
  let res = order.shipment?.otoId
    ? await call('/createShipment', { method: 'POST', body: { orderId: ref(order), packageWeight: weight, packageCount: count, ...dc } })
    : await call('/createOrder', { method: 'POST', body: {
    orderId: ref(order), createShipment: true, payment_method: 'paid', amount: Number(order.total), amount_due: 0, currency: 'SAR',
    packageCount: count, packageWeight: weight, senderName: seller.name,
    orderDate: `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
    pickupLocationCode: pickup.code, ...dc,
    customer: {
      name: c.name, email: c.email, mobile: String(c.phone || '').replace(/\D/g, '').replace(/^(966|0)/, ''),
      address: [s.street, s.district, s.city, s.details].filter((x) => String(x || '').trim()).join('، ') || s.shortAddress,
      district: s.district, city: s.city, country: 'SA', shortAddressCode: s.shortAddress, refID: order.user_id || undefined,
    },
    items,
  } })
  // the OTO order is there from an earlier try that wasn't saved: ask for the shipment only
  if (!res.ok && /exist/i.test(res.b.otoErrorMessage || '')) res = await call('/createShipment', { method: 'POST', body: { orderId: ref(order), packageWeight: weight, packageCount: count, ...dc } })
  if (!res.ok) throw new Error(otoError(res.b))
  const saved = await saveShipment(order, { ref: ref(order), otoId: res.b.otoId || order.shipment?.otoId || null, weight, count, requestedAt: new Date().toISOString(), status: 'requested', error: null, trackingNumber: null, awbUrl: null, trackingUrl: null, ...(carrier ? { company: carrier.name || null } : {}) })
  return advance(saved, 'in_progress', 'أُنشئت بوليصة الشحن في أوتو').then((o) => ({ ...o, shipment: saved.shipment }))
}

/** The waybill's print link (and the tracking number, once the delivery company gave one). */
export async function shipmentLabel(order) {
  if (!order.shipment?.ref) throw new Error('ما فيه بوليصة لهذا الطلب')
  const { ok, b } = await call(`/print/${encodeURIComponent(order.shipment.ref)}`)
  // OTO has the order but no carrier took the shipment (an empty wallet, or no delivery company active)
  if (b.otoErrorCode === 'OTO1113') {
    const error = 'أوتو استلم الطلب بس شركة الشحن ما أنشأت الشحنة. الغالب إن رصيد محفظة أوتو ما يكفي أو ما فيه شركة شحن مفعّلة، صحّحيها وأعيدي الإنشاء'
    await saveShipment(order, { status: 'error', error })
    throw new Error(error)
  }
  if (!ok || !b.printAWBURL) throw new Error(ok ? 'البوليصة لسا تتجهّز عند شركة الشحن، جربي بعد دقيقة' : otoError(b))
  const saved = await saveShipment(order, { awbUrl: b.printAWBURL, trackingNumber: b.trackingNumber || order.shipment.trackingNumber || null, company: b.deliveryCompany || order.shipment.company || null })
  return saved.shipment
}

/** The delivery companies for this order's route with OTO's prices (free plan: OTO's own rates). */
export async function shippingQuotes(order, weight) {
  if (!otoReady()) throw new Error('أوتو مو مربوط: أضف OTO_REFRESH_TOKEN في Vercel')
  const pickup = await pickupLocation()
  // OTO's price list knows English city names: the national address gives hers, else the city she typed
  const to = (await nationalAddress(order.shipping?.shortAddress).catch(() => null))?.city || order.shipping?.city || pickup.city
  const list = await deliveryFees(pickup.city, to, weight)
  const want = (process.env.OTO_CARRIER || 'smsa').trim().toLowerCase()
  const best = preferred(list, want)
  return {
    from: pickup.city, to,
    options: list.map((o) => ({
      id: o.deliveryOptionId, name: o.deliveryOptionName || o.deliveryCompanyName, company: o.deliveryCompanyName,
      price: Number(o.price) || 0, days: o.avgDeliveryTime || '', logo: /^https:\/\//.test(o.logo || '') ? o.logo : '',
      door: !o.deliveryType || o.deliveryType === 'toCustomerDoorstep', preferred: best?.deliveryOptionId === o.deliveryOptionId,
    })).sort((x, y) => (y.preferred - x.preferred) || (x.price - y.price)),
  }
}

/** Cancels the shipment at the delivery company (only before the courier picks it up). The order stays in OTO,
 *  so a new waybill can be made for it. */
export async function cancelShipment(order) {
  const sh = order.shipment
  if (!sh?.ref) throw new Error('ما فيه شحنة لهذا الطلب')
  if (sh.status === 'cancelled') throw new Error('الشحنة ملغية من قبل')
  if (MOVING.test(sh.status || '') || sh.status === 'delivered') throw new Error('ما تنلغي الشحنة بعد ما يستلمها المندوب')
  let id = sh.trackingNumber
  if (!id) id = (await shipmentLabel(order).catch(() => null))?.trackingNumber
  if (!id) throw new Error('الشحنة ما لها رقم عند شركة الشحن للحين، فما فيه شي ينلغي')
  const { ok, b } = await call('/cancelShipment', { method: 'POST', body: { orderId: sh.ref, shipmentId: String(id) } })
  if (!ok) throw new Error(otoError(b).replace('أوتو رفض الطلب', 'ما انلغت الشحنة'))
  return (await saveShipment(order, { status: 'cancelled', error: null, cancelledAt: new Date().toISOString() })).shipment
}

/** A return shipment for a delivered order: the delivery company collects the whole order from her and brings it
 *  back to the pickup location. Its waybill is printed like the first one (ref «<number>-R1»). */
export async function returnShipment(order) {
  const sh = order.shipment
  if (!sh?.ref) throw new Error('الطلب ما انشحن عن طريق أوتو')
  if (!['review', 'completed'].includes(order.status)) throw new Error('شحنة الإرجاع للطلبات اللي انشحنت أو وصلت')
  if (sh.ret?.ref) throw new Error('فيه شحنة إرجاع لهذا الطلب من قبل')
  const pickup = await pickupLocation()
  const carrier = await carrierOption(pickup.city, Number(sh.weight) || 1)
  const { ok, b } = await call('/createReturnShipment', { method: 'POST', body: {
    orderId: sh.ref, pickupLocationCode: pickup.code, pickingType: 'PICKUP_BY_DC', ...(carrier ? { deliveryOptionId: String(carrier.id) } : {}),
    items: (order.items || []).map((it) => ({ quantity: Number(it.qty) || 1, sku: String(it.productId || it.name || '').slice(0, 60) })),
  } })
  if (!ok || !b.returnOrderId) throw new Error(otoError(b).replace('أوتو رفض الطلب', 'ما انسوّت شحنة الإرجاع'))
  return (await saveShipment(order, { ret: { ref: String(b.returnOrderId), status: 'requested', at: new Date().toISOString() } })).shipment
}

/** The return shipment's waybill. */
export async function returnLabel(order) {
  const r = order.shipment?.ret
  if (!r?.ref) throw new Error('ما فيه شحنة إرجاع لهذا الطلب')
  const { ok, b } = await call(`/print/${encodeURIComponent(r.ref)}`)
  if (!ok || !b.printAWBURL) throw new Error(ok || b.otoErrorCode === 'OTO1113' ? 'بوليصة الإرجاع لسا تتجهّز عند شركة الشحن، جربي بعد دقيقة' : otoError(b))
  return (await saveShipment(order, { ret: { ...r, awbUrl: b.printAWBURL, trackingNumber: b.trackingNumber || r.trackingNumber || null } })).shipment
}

// the full national address behind a short code (English names, as the delivery companies use them)
const addrCache = new Map()
export async function nationalAddress(code) {
  const c = String(code || '').toUpperCase().replace(/[\s-]/g, '')
  if (!/^[A-Z]{4}\d{4}$/.test(c)) return null
  if (addrCache.has(c)) return addrCache.get(c)
  const { ok, b } = await call('/getNationalAddressFromShortCode', { method: 'POST', body: { shortAddressCode: c } })
  const d = ok && b.data
  const v = d && (d.cityName || d.city?.name) ? {
    city: d.cityName || d.city?.name || '', district: d.districtName || d.district?.name || '', street: d.streetName || '',
    building: d.buildingName || '', secondary: d.secondary || '', zip: d.zipCode || '', full: d.formattedFullAddress || '',
  } : null
  if (addrCache.size > 500) addrCache.clear()
  addrCache.set(c, v)
  return v
}

// OTO's statuses → the store's: on the road = «تم الشحن», delivered = «تم التوصيل»
const MOVING = /^(pickedUp|inTransit|shipmentInProgress|outForDelivery|arrivedTerminal|arrivedDestinationTerminal)$/

/** POST from OTO (orderStatus or shipmentError). */
export async function otoWebhook(req, res) {
  const k = String(req.query.k || ''), want = hookKey()
  if (k.length !== want.length || !timingSafeEqual(Buffer.from(k), Buffer.from(want))) return res.status(401).json({ ok: false })
  const b = req.body || {}
  // a return shipment reports as «<number>-R1»: it updates the return, not the order
  const [main, retNo] = String(b.orderId || '').split(/-R(?=\d+$)/)
  const number = Number(main.replace(/\D/g, ''))
  if (!number) return res.status(200).json({ ok: true, skipped: 'no-order' })
  const { data: order } = await admin.from('orders').select('*').eq('number', number).maybeSingle()
  if (!order) return res.status(200).json({ ok: true, skipped: 'unknown-order' })

  if (retNo && order.shipment?.ret) {
    const r = order.shipment.ret
    await saveShipment(order, { ret: { ...r, status: b.errorMessage ? 'error' : String(b.status || r.status), error: b.errorMessage || null,
      ...(b.dcTrackingNumber || b.trackingNumber ? { trackingNumber: b.dcTrackingNumber || b.trackingNumber } : {}),
      ...(b.printAWBURL ? { awbUrl: b.printAWBURL } : {}) } })
    return res.status(200).json({ ok: true })
  }

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
