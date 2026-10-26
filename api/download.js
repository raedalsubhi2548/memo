// GET ?order=<id>&product=<id>  →  { url }  — signed 10-minute link for a paid digital product.
import { admin, userFromRequest } from './_shared.js'

export default async function handler(req, res) {
  const user = await userFromRequest(req)
  if (!user) return res.status(401).json({ error: 'سجّلي دخولك أولاً' })
  const { order: orderId, product } = req.query
  const { data: order } = await admin.from('orders').select('*').eq('id', orderId).single()
  if (!order || order.user_id !== user.id) return res.status(404).json({ error: 'الطلب غير موجود' })
  if (['pending', 'cancelled'].includes(order.status)) return res.status(402).json({ error: 'يتاح التحميل بعد تأكيد الدفع' })
  if (!order.items.some((i) => i.productId === product && i.digital)) return res.status(404).json({ error: 'الملف غير موجود في هذا الطلب' })
  const { data: file } = await admin.from('product_files').select('path').eq('product_id', product).single()
  if (!file) return res.status(404).json({ error: 'الملف لم يُرفع بعد، تواصل معنا' })
  const { data, error } = await admin.storage.from('downloads').createSignedUrl(file.path, 600, { download: true })
  if (error) return res.status(500).json({ error: 'تعذّر تجهيز رابط التحميل' })
  return res.status(200).json({ url: data.signedUrl })
}
