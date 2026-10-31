// GET ?order=<id>&tap_id=<charge id>  — called when Tap redirects the customer back.
// GET ?op=tabby&order=<id>              — called when Tabby sends her back: the order's own Tabby payment is checked.
import { admin, confirmCharge } from './_shared.js'
import { confirmTabby } from './_tabby.js'

export default async function handler(req, res) {
  if (req.query.op === 'tabby') {
    const { data: order } = await admin.from('orders').select('status,payment_ref').eq('id', String(req.query.order || '')).maybeSingle()
    if (!order) return res.status(200).json({ ok: false })
    if (order.status !== 'pending') return res.status(200).json({ ok: order.status !== 'cancelled' })
    if (!/^tabby:/.test(order.payment_ref || '')) return res.status(200).json({ ok: false })
    const out = await confirmTabby(order.payment_ref.slice(6))
    return res.status(200).json({ ok: !!out.ok, status: out.status })
  }
  const tapId = String(req.query.tap_id || '')
  const orderId = String(req.query.order || '')
  if (!/^chg_[\w]+$/.test(tapId)) return res.status(400).json({ ok: false })
  const out = await confirmCharge(tapId)
  // answer only about the order the visitor is looking at
  if (out.orderId && orderId && out.orderId !== orderId) return res.status(200).json({ ok: false })
  return res.status(200).json({ ok: !!out.ok, status: out.status })
}
