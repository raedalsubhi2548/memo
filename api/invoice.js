// GET ?order=<id>  →  the order's PDF invoice (owner or admin, paid orders only).
import { admin, userFromRequest, adminFromRequest } from './_shared.js'
import { invoicePdf } from './_invoice.js'
import { loadSeller } from './_mail.js'

export default async function handler(req, res) {
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
