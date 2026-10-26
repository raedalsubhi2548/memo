// POST { orderId, event }  — sends the email for an order moment, once.
//  · the customer may only trigger "created" for their own bank-transfer order (card orders get "paid" from Tap)
//  · an admin may trigger the email for the order's current status (after changing it in the dashboard),
//    or «created» for an order still awaiting payment (a new order made from the dashboard)
import { admin, userFromRequest, adminFromRequest } from './_shared.js'
import { sendOrderEmail, sendAdminAlert, EVENT_IDS } from './_mail.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const user = await userFromRequest(req)
  if (!user) return res.status(401).json({ error: 'سجّلي دخولك أولاً' })
  const { orderId, event, test } = req.body || {}
  if (test) {
    // the admin checks the store's notification email from the dashboard
    if (!(await adminFromRequest(req, 'orders'))) return res.status(403).json({ error: 'غير مسموح' })
    try {
      const out = await sendAdminAlert('تجربة إشعار الطلبات', 'هذي رسالة تجربة من لوحة التحكم. إذا وصلتك، إشعارات الطلبات الجديدة المدفوعة توصل على هذا الإيميل.')
      return res.status(200).json(out)
    } catch (err) { return res.status(200).json({ sent: false, reason: 'smtp-error', detail: String(err?.message || '').slice(0, 200) }) }
  }
  if (!orderId || !EVENT_IDS.includes(event)) return res.status(400).json({ error: 'طلب غير صالح' })

  const { data: order } = await admin.from('orders').select('*').eq('id', orderId).single()
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' })
  const isAdmin = !!(await adminFromRequest(req, 'orders'))

  const allowed = isAdmin ? event === order.status || (event === 'created' && order.status === 'pending') : order.user_id === user.id && event === 'created' && order.payment_method === 'bank' && order.status === 'pending'
  if (!allowed) return res.status(403).json({ error: 'غير مسموح' })

  const out = await sendOrderEmail(order, event)
  return res.status(200).json(out)
}
