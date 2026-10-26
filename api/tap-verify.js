// GET ?order=<id>&tap_id=<charge id>  — called when Tap redirects the customer back.
import { confirmCharge } from './_shared.js'

export default async function handler(req, res) {
  const tapId = String(req.query.tap_id || '')
  const orderId = String(req.query.order || '')
  if (!/^chg_[\w]+$/.test(tapId)) return res.status(400).json({ ok: false })
  const out = await confirmCharge(tapId)
  // answer only about the order the visitor is looking at
  if (out.orderId && orderId && out.orderId !== orderId) return res.status(200).json({ ok: false })
  return res.status(200).json({ ok: !!out.ok, status: out.status })
}
