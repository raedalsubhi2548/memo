// GET ?order=<id>  →  the order's PDF invoice (owner or admin, paid orders only).
// The order's shipping waybill through OTO (api/_oto.js), the other document of an order:
//   POST ?op=ship { orderId, weight, count }  → creates the waybill (dashboard, «orders» area)
//   GET  ?op=awb&order=<id>                  → its print link
//   GET  ?op=quotes&order=<id>&weight=<kg>   → the delivery companies and their prices for this order
//   POST ?op=cancel { orderId }              → cancels the shipment (before the courier picks it up)
//   POST ?op=return { orderId }              → a return shipment for a delivered order (GET ?op=awb&ret=1 prints it)
//   GET  ?op=addr&code=<short address>       → the national address behind a short code (checkout, signed-in customer)
//   POST ?op=oto&k=<key>                     → OTO's status updates (the key is in the address OTO was given)
import { admin, userFromRequest, adminFromRequest } from './_shared.js'
import { invoicePdf } from './_invoice.js'
import { loadSeller } from './_mail.js'
import { createShipment, shipmentLabel, otoWebhook, shippingQuotes, cancelShipment, returnShipment, returnLabel, nationalAddress, otoReady } from './_oto.js'

const ORDER_ID = /^[0-9a-f-]{36}$/i

async function shipping(req, res, op) {
  res.setHeader('Cache-Control', 'no-store')
  if (op === 'oto') return req.method === 'POST' ? otoWebhook(req, res) : res.status(405).json({ ok: false })
  if (op === 'addr') {
    // the customer's own address at checkout: signed in only, and only a well-formed code reaches OTO
    if (!(await userFromRequest(req))) return res.status(401).json({ error: 'سجّلي دخولك أولاً' })
    if (!otoReady()) return res.status(200).json({ ok: true, address: null })
    try { return res.status(200).json({ ok: true, address: await nationalAddress(req.query.code) }) } catch { return res.status(200).json({ ok: true, address: null }) }
  }
  if (!(await adminFromRequest(req, 'orders'))) return res.status(403).json({ error: `غير مسموح (${req.staffWhy || 'perm'})` })
  const id = String(req.method === 'POST' ? req.body?.orderId || '' : req.query.order || '')
  if (!ORDER_ID.test(id)) return res.status(400).json({ error: 'طلب غير صالح' })
  const { data: order } = await admin.from('orders').select('*').eq('id', id).single()
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' })
  try {
    if (op === 'ship' && req.method === 'POST') {
      const weight = Math.round(Number(req.body?.weight) * 1000) / 1000, count = Math.round(Number(req.body?.count) || 1)
      if (!(weight > 0 && weight <= 100)) return res.status(400).json({ error: 'اكتبي وزن الطرد بالكيلو' })
      if (!(count >= 1 && count <= 20)) return res.status(400).json({ error: 'عدد الطرود غير صحيح' })
      // the company the owner picked from the price list (its option id and name), else the default one
      const oid = Number(req.body?.optionId)
      const option = Number.isInteger(oid) && oid > 0 ? { id: oid, name: String(req.body?.optionName || '').slice(0, 80) } : null
      const o = await createShipment(order, { weight, count, option })
      return res.status(200).json({ ok: true, status: o.status, shipment: o.shipment })
    }
    if (op === 'awb' && req.method === 'GET') return res.status(200).json({ ok: true, shipment: await (req.query.ret ? returnLabel(order) : shipmentLabel(order)) })
    if (op === 'quotes' && req.method === 'GET') {
      const weight = Number(req.query.weight)
      if (!(weight > 0 && weight <= 100)) return res.status(400).json({ error: 'اكتبي وزن الطرد بالكيلو' })
      return res.status(200).json({ ok: true, ...(await shippingQuotes(order, weight)) })
    }
    if (op === 'cancel' && req.method === 'POST') return res.status(200).json({ ok: true, shipment: await cancelShipment(order) })
    if (op === 'return' && req.method === 'POST') return res.status(200).json({ ok: true, shipment: await returnShipment(order) })
  } catch (e) { return res.status(400).json({ error: e.message }) }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default async function handler(req, res) {
  const op = String(req.query.op || '')
  if (['ship', 'awb', 'oto', 'quotes', 'cancel', 'return', 'addr'].includes(op)) return shipping(req, res, op)
  const user = await userFromRequest(req)
  if (!user) return res.status(401).json({ error: 'سجّلي دخولك أولاً' })
  const { data: order } = await admin.from('orders').select('*').eq('id', String(req.query.order || '')).single()
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' })
  if (order.user_id !== user.id && !(await adminFromRequest(req, 'orders'))) return res.status(404).json({ error: 'الطلب غير موجود' })
  if (['pending', 'cancelled'].includes(order.status)) return res.status(402).json({ error: 'الفاتورة تصدر بعد تأكيد الدفع' })
  const pdf = await invoicePdf(order, await loadSeller())
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.number}.pdf"`)
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).send(pdf)
}
