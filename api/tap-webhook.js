// Tap posts here after every charge update. We re-fetch the charge from Tap before trusting it,
// so a forged post can't mark anything paid; it can only make us look the charge up.
// ?op=tabby: Tabby's status posts (api/_tabby.js checks its header and looks the payment up the same way).
import { confirmCharge } from './_shared.js'
import { tabbyWebhook } from './_tabby.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (req.query.op === 'tabby') return tabbyWebhook(req, res)
  const id = String(req.body?.id || '')
  if (/^chg_[\w]+$/.test(id)) await confirmCharge(id)
  return res.status(200).json({ received: true })
}
