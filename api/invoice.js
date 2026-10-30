// GET ?order=<id>  →  the order's PDF invoice (owner or admin, paid orders only).
// The order's shipping waybill through OTO (api/_oto.js), the other document of an order:
//   POST ?op=ship { orderId, weight, count }  → creates the waybill (dashboard, «orders» area)
//   GET  ?op=awb&order=<id>                  → its print link
//   POST ?op=oto&k=<key>                     → OTO's status updates (the key is in the address OTO was given)
import { admin, userFromRequest, adminFromRequest } from './_shared.js'
import { invoicePdf } from './_invoice.js'
import { loadSeller } from './_mail.js'
import { createShipment, shipmentLabel, otoWebhook } from './_oto.js'

const ORDER_ID = /^[0-9a-f-]{36}$/i

async function shipping(req, res, op) {
  res.setHeader('Cache-Control', 'no-store')
  if (op === 'oto') return req.method === 'POST' ? otoWebhook(req, res) : res.status(405).json({ ok: false })
  if (!(await adminFromRequest(req, 'orders'))) return res.status(403).json({ error: 'غير مسموح' })
  const id = String(op === 'ship' ? req.body?.orderId || '' : req.query.order || '')
  if (!ORDER_ID.test(id)) return res.status(400).json({ error: 'طلب غير صالح' })
  const { data: order } = await admin.from('orders').select('*').eq('id', id).single()
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' })
  try {
    if (op === 'ship' && req.method === 'POST') {
      const weight = Math.round(Number(req.body?.weight) * 1000) / 1000, count = Math.round(Number(req.body?.count) || 1)
      if (!(weight > 0 && weight <= 100)) return res.status(400).json({ error: 'اكتبي وزن الطرد بالكيلو' })
      if (!(count >= 1 && count <= 20)) return res.status(400).json({ error: 'عدد الطرود غير صحيح' })
      const o = await createShipment(order, { weight, count })
      return res.status(200).json({ ok: true, status: o.status, shipment: o.shipment })
    }
    if (op === 'awb' && req.method === 'GET') return res.status(200).json({ ok: true, shipment: await shipmentLabel(order) })
  } catch (e) { return res.status(400).json({ error: e.message }) }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default async function handler(req, res) {
  const op = String(req.query.op || '')
  if (['ship', 'awb', 'oto'].includes(op)) return shipping(req, res, op)
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
