// Tap posts here after every charge update. We re-fetch the charge from Tap before trusting it,
// so a forged post can't mark anything paid; it can only make us look the charge up.
import { confirmCharge } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const id = String(req.body?.id || '')
  if (/^chg_[\w]+$/.test(id)) await confirmCharge(id)
  return res.status(200).json({ received: true })
}
