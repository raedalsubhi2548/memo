import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Lock, Mail, KeyRound, ShieldCheck, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import HumanCheck, { TURNSTILE_KEY } from '@/components/HumanCheck.jsx'
import { STORE_ORIGIN } from '@/lib/host.js'
import { maskEmail } from '@/lib/format.js'
import { useCountdown, mmss } from '@/lib/useCountdown.js'

/** The owner's own sign-in for the dashboard — no store header, no store look. */
export default function AdminLogin() {
  const { user, authReady, applyUser } = useApp()
  const [form, setForm] = useState({ email: '', password: '', code: '' })
  const [sent, setSent] = useState(false) // the password was right and the code is on its way
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const human = useRef(null)
  const [wait, startWait] = useCountdown() // a new code once a minute

  useEffect(() => {
    document.title = 'تسجيل الدخول | لوحة التحكم'
    let m = document.querySelector('meta[name="robots"]'); if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m) }
    m.content = 'noindex,nofollow'
  }, [])

  if (authReady && user) return <Navigate to="/admin" replace />

  // step 1: email + password, checked on the server, which emails a code · step 2: the code signs in
  const start = async () => {
    if (TURNSTILE_KEY && !captcha) { setErr('انتظري لين يكتمل التحقق'); return }
    setBusy(true)
    try { await api.loginStart(form.email, form.password, captcha); setSent(true); setForm((x) => ({ ...x, code: '' })); startWait() } catch (e2) { setErr(e2.message) } finally { setBusy(false); human.current?.reset() }
  }
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (!sent) return start()
    setBusy(true)
    try { applyUser(await api.verifyLoginCode(form.email, form.code)) } catch (e2) { setErr(e2.message) } finally { setBusy(false) }
  }
  const field = 'h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-11 pr-4 text-left text-[15px] text-white placeholder:text-white/35 outline-none transition focus:border-white/40 focus:bg-white/[0.09]'

  return (
    <div dir="rtl" className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#2a1519] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_80%_0%,#7d3f4c_0%,transparent_60%),radial-gradient(60%_50%_at_0%_100%,#5a2a35_0%,transparent_65%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" aria-hidden="true" />

      <main className="relative w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/logo-300.png" alt="" width="96" height="96" className="size-20 rounded-full object-cover ring-1 ring-white/30" />
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/75 ring-1 ring-white/15">لوحة التحكم</span>
        </div>

        <form onSubmit={submit} className="grid gap-4 rounded-[22px] bg-white/[0.04] p-6 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.8)] ring-1 ring-white/10 backdrop-blur-xl sm:p-8">
          <div>
            <h1 className="text-2xl font-bold">دخول لوحة التحكم</h1>
            <p className="mt-1 text-sm text-white/55">{sent ? <>كلمة المرور صحيحة. أرسلنا رمز التحقق إلى <span dir="ltr">{maskEmail(form.email)}</span></> : 'أدري متجرك وطلباتك ومنتجاتك من مكان واحد.'}</p>
          </div>

          {!sent && <>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-white/80">البريد الإلكتروني</span>
            <span className="relative"><Mail className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-white/40" />
              <input type="email" required dir="ltr" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={field} placeholder="name@example.com" /></span>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-white/80">كلمة المرور</span>
            <span className="relative"><KeyRound className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-white/40" />
              <input type="password" required minLength={6} dir="ltr" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={field} placeholder="••••••••" /></span>
          </label>
          </>}
          {sent && <label className="grid gap-1.5">
            <span className="text-sm font-semibold text-white/80">رمز التحقق</span>
            <input required dir="ltr" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={8} autoFocus value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, '').slice(0, 8) })} className={field.replace('pl-11', 'pl-4') + ' text-center text-2xl tracking-[0.5em]'} placeholder="••••••" />
          </label>}

          {TURNSTILE_KEY && <div className="rounded-xl bg-white p-1 text-foreground"><HumanCheck ref={human} onToken={setCaptcha} /></div>}
          {err && <p className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/30" role="alert">{err}</p>}

          <button disabled={busy} className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-bold text-[#2a1519] transition hover:bg-[#f6e6e3] disabled:opacity-60">
            <Lock className="size-4" />{busy ? 'لحظة…' : sent ? 'دخول للوحة التحكم' : 'متابعة'}
          </button>
          {sent ? <div className="flex justify-between text-sm text-white/55">
            <button type="button" onClick={() => { setSent(false); setErr('') }} className="underline-offset-4 hover:text-white hover:underline">رجوع</button>
            {wait > 0 ? <span className="tabular">رمز جديد بعد {mmss(wait)}</span> : <button type="button" disabled={busy} onClick={() => { setErr(''); start() }} className="underline-offset-4 hover:text-white hover:underline">أرسل رمز جديد</button>}
          </div>
          : <a href={`${STORE_ORIGIN}/login?mode=forgot`} className="justify-self-center text-sm text-white/55 underline-offset-4 hover:text-white hover:underline">نسيت كلمة المرور؟</a>}
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-white/40">
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" />اتصال مشفّر ومحمي</span>
          <a href={STORE_ORIGIN} className="flex items-center gap-1.5 hover:text-white/80"><ExternalLink className="size-3.5" />عرض المتجر</a>
        </div>
      </main>
    </div>
  )
}
