// POST { email, password, captchaToken }  — step 1 of every sign-in.
// The password is checked here, on the server, and only then is a one-time code emailed. The password session is
// thrown away at once: the visitor is signed in only by the code (step 2, verifyOtp in the browser). Each correct
// password is recorded in login_checks, and the owner's dashboard accepts a code session only when it follows one
// (public.is_admin(), adminFromRequest), so the code alone, requested straight from Supabase, never opens it.
import { createClient } from '@supabase/supabase-js'
import { admin } from './_shared.js'
import { sendLoginCodeEmail } from './_mail.js'

const URL_ = (process.env.VITE_SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
const EMAIL = /^[^\s@<>"]{1,120}@[^\s@<>"]{1,120}\.[a-z]{2,}$/i
const recent = new Map() // per-instance guard: at most 10 tries a minute from one address
const BAD = 'البريد أو كلمة المرور غير صحيحة. إذا ما عندك كلمة مرور، اضغط «نسيت كلمة المرور؟»'

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  const now = Date.now(), r = recent.get(ip)
  if (r && now - r.t < 60_000) { if (++r.n > 10) return res.status(429).json({ error: 'محاولات كثيرة، انتظر دقيقة وحاول مرة ثانية' }) } else recent.set(ip, { t: now, n: 1 })
  if (recent.size > 5000) recent.clear()

  const { email, password, captchaToken } = req.body || {}
  if (typeof email !== 'string' || !EMAIL.test(email.trim()) || typeof password !== 'string' || password.length < 6 || password.length > 128) return res.status(400).json({ error: BAD })
  const mail = email.trim().toLowerCase()

  // 1) the password, checked by Supabase itself (with the human check when Turnstile is on)
  const anon = createClient(URL_, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await anon.auth.signInWithPassword({ email: mail, password, options: typeof captchaToken === 'string' && captchaToken ? { captchaToken } : undefined })
  if (error || !data?.user) {
    if (/captcha/i.test(error?.message || '')) return res.status(400).json({ error: 'انتهى «تأكيد إنك إنسان»، أعده وحاول مرة ثانية' })
    if (/Email not confirmed/i.test(error?.message || '')) return res.status(400).json({ error: 'فعّل بريدك أولاً بالرمز اللي وصلك عند التسجيل' })
    return res.status(401).json({ error: BAD })
  }
  await anon.auth.signOut().catch(() => {}) // the password session is never handed out

  // 2) one code a minute per account (the page waits the same minute before offering «أرسل رمز جديد»)
  const { count: recentCodes } = await admin.from('login_checks').select('*', { count: 'exact', head: true })
    .eq('user_id', data.user.id).gte('at', new Date(Date.now() - 55_000).toISOString())
  if (recentCodes) return res.status(429).json({ error: 'أرسلنا لك رمز قبل أقل من دقيقة، شيّك بريدك أو انتظر شوي' })

  // 3) remember the correct password for the dashboard gate, then send the code
  const { error: e1 } = await admin.from('login_checks').insert({ user_id: data.user.id })
  if (e1) { console.error('login_checks insert', e1.message); return res.status(500).json({ error: 'تعذّر تسجيل الدخول الحين، حاول بعد شوي' }) }
  const { data: link, error: e2 } = await admin.auth.admin.generateLink({ type: 'magiclink', email: mail })
  const code = link?.properties?.email_otp
  if (e2 || !code) return res.status(500).json({ error: 'تعذّر تجهيز رمز التحقق، حاول بعد شوي' })
  try { await sendLoginCodeEmail(mail, code) } catch (err) {
    console.error('login code mail', err?.message)
    return res.status(502).json({ error: 'تعذّر إرسال رمز التحقق الحين، حاول بعد شوي أو تواصل معنا على واتساب' })
  }
  return res.status(200).json({ ok: true })
}
