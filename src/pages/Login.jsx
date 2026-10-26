import { useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, Receipt, Heart } from 'lucide-react'
import { api, isDemo } from '@/lib/api.js'
import { DEMO_ADMIN, DEMO_CODE } from '@/lib/local.js'
import { useApp } from '@/state.jsx'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/kit.jsx'
import HumanCheck, { TURNSTILE_KEY } from '@/components/HumanCheck.jsx'
import { ADMIN_HOST } from '@/lib/host.js'
import { maskEmail } from '@/lib/format.js'
import { useCountdown, mmss } from '@/lib/useCountdown.js'

const PERKS = [
  { icon: Receipt, t: 'تتبّع كل طلب لحظة بلحظة' },
  { icon: Heart, t: 'مفضلتك محفوظة على أي جهاز' },
  { icon: ShieldCheck, t: 'دفع آمن عبر Tap' },
]

export default function Login() {
  const { user, authReady, notify, applyUser, settings } = useApp()
  const [params] = useSearchParams()
  // only same-site paths (blocks //evil.com and /\\evil.com open redirects)
  const rawNext = params.get('next') || ''
  const next = /^\/(?![\/\\])[^\\\s]*$/.test(rawNext) ? rawNext : '' // a same-site path only: no //, no backslash or space anywhere
  const [mode, setMode] = useState(['up', 'forgot'].includes(params.get('mode')) ? params.get('mode') : 'in') // in · otp (the emailed code after the password) · up · code (confirm sign-up) · forgot · reset
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', code: '' })
  const [info, setInfo] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [captcha, setCaptcha] = useState('') // Turnstile token; each one works once
  const human = useRef(null)
  const [wait, startWait] = useCountdown() // a new code once a minute

  if (authReady && user) return <Navigate to={ADMIN_HOST ? '/admin' : next && !next.startsWith('/admin') ? next : '/account'} replace />

  const done = (u, msg) => { notify(msg); applyUser(u) } // the <Navigate> above takes over once the user is set
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    const needsHuman = TURNSTILE_KEY && (mode === 'in' || mode === 'up' || mode === 'forgot')
    if (needsHuman && !captcha) { setErr('انتظر لين يكتمل «تأكيد إنك إنسان»'); return }
    setBusy(true)
    try {
      if (mode === 'in') { await api.loginStart(form.email, form.password, captcha); setMode('otp'); setForm((x) => ({ ...x, code: '' })); setInfo(`كلمة المرور صحيحة. أرسلنا رمز التحقق إلى ${maskEmail(form.email)}`); startWait() }
      else if (mode === 'otp') { const u = await api.verifyLoginCode(form.email, form.code); done(u, `أهلاً ${u.name || ''}`) }
      else if (mode === 'up') {
        const r = await api.signUp(form, captcha)
        if (r?.needsCode) { setMode('code'); setInfo(`أرسلنا رمز تحقق إلى ${maskEmail(r.email)}`); startWait() } else done(r, 'تم إنشاء حسابك')
      }
      else if (mode === 'code') { const u = await api.verifySignup(form.email, form.code); done(u, 'تم تفعيل حسابك') }
      else if (mode === 'forgot') { await api.sendResetCode(form.email, captcha); setMode('reset'); setInfo(`أرسلنا رمز التحقق إلى ${maskEmail(form.email)}`); startWait() }
      else if (mode === 'reset') { const u = await api.resetWithCode(form.email, form.code, form.password); done(u, 'تم تغيير كلمة المرور') }
    } catch (e2) { setErr(e2.message) } finally { setBusy(false); if (needsHuman) human.current?.reset() }
  }
  const resend = async () => {
    setErr('')
    if (wait > 0) return
    if (TURNSTILE_KEY && !captcha) { setErr('انتظر لين يكتمل «تأكيد إنك إنسان» تحت'); return }
    try { mode === 'otp' ? await api.loginStart(form.email, form.password, captcha) : mode === 'code' ? await api.resendSignup(form.email, captcha) : await api.sendResetCode(form.email, captcha); setInfo('أرسلنا رمز جديد، شيّك بريدك (والرسائل غير المهمة)'); startWait() } catch (e2) { setErr(e2.message) } finally { if (TURNSTILE_KEY) human.current?.reset() }
  }
  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) })
  const swap = (m) => { setMode(m); setErr(''); setInfo(''); setForm((x) => ({ ...x, code: '' })) }
  const codeStep = mode === 'code' || mode === 'reset' || mode === 'otp'
  const TITLE = { otp: 'رمز التحقق', in: 'تسجيل الدخول', up: 'حساب جديد', code: 'فعّلي حسابك', forgot: 'نسيت كلمة المرور', reset: 'كلمة مرور جديدة' }
  const LEAD = { otp: 'اكتبي الرمز اللي وصلك على بريدك لإكمال الدخول.', in: 'تابعي طلباتك ومفضلتك من مكان واحد.', up: 'سجّلي مرة وحدة، وتابعي كل طلباتك من حسابك.', code: 'اكتبي الرمز اللي وصلك على بريدك.', forgot: 'اكتبي بريدك ونرسل لك رمز تحقق.', reset: 'اكتبي الرمز وكلمة المرور الجديدة.' }
  const CTA = { otp: 'دخول', in: 'متابعة', up: 'أنشئي حسابي', code: 'فعّلي الحساب', forgot: 'أرسلي الرمز', reset: 'احفظي كلمة المرور' }

  return (
    <div className="container-w grid items-stretch gap-8 py-10 sm:py-16 lg:grid-cols-[1fr_480px]">
      <aside className="relative hidden overflow-hidden rounded-xl bg-inverse p-10 text-on-inverse lg:flex lg:flex-col lg:justify-between">
        <div className="grid w-44 place-items-center rounded-2xl bg-white px-5 py-4"><img src={settings.logo} alt={settings.store.name} className="w-full" /></div>
        <div>
          <h2 className="text-balance font-display text-display-md font-semibold leading-tight">حسابك: طلباتك ومفضلتك في مكان واحد.</h2>
          <ul className="mt-8 grid gap-4">
            {PERKS.map(({ icon: I, t }) => (
              <li key={t} className="flex items-center gap-3 text-[17px]"><span className="grid size-10 place-items-center rounded-full bg-accent text-accent-foreground"><I className="size-5" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <span className="pointer-events-none absolute -bottom-24 -start-24 size-72 rounded-full border-[28px] border-accent/15" aria-hidden="true" />
      </aside>

      <div className="rounded-xl bg-surface p-6 shadow-card ring-1 ring-border sm:p-10">
        <h1 className="font-display text-display-sm font-semibold text-primary">{TITLE[mode]}</h1>
        <p className="mt-1 text-muted-foreground">{LEAD[mode]}</p>

        {(mode === 'in' || mode === 'up') && <div className="mt-6 grid grid-cols-2 rounded-full bg-sunken p-1" role="tablist">
          {[['in', 'دخول'], ['up', 'حساب جديد']].map(([m, l]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => swap(m)}
              className={cn('h-11 rounded-full text-sm font-bold transition-colors', mode === m ? 'bg-primary text-accent shadow-hairline' : 'text-muted-foreground hover:text-primary')}>{l}</button>
          ))}
        </div>}

        <form onSubmit={submit} className="mt-6 grid gap-4">
          {info && <p className="rounded-md bg-sunken px-4 py-3 text-sm text-primary" role="status">{info}</p>}
          {mode === 'up' && <Field label="الاسم"><Input required {...f('name')} autoComplete="name" /></Field>}
          {!codeStep && <Field label="البريد الإلكتروني"><Input type="email" required {...f('email')} dir="ltr" autoComplete="email" /></Field>}
          {mode === 'up' && <Field label="رقم الجوال"><Input required {...f('phone')} dir="ltr" inputMode="tel" placeholder="05xxxxxxxx" autoComplete="tel" /></Field>}
          {codeStep && (
            <Field label="رمز التحقق">
              <Input required {...f('code')} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, '').slice(0, 8) })} dir="ltr" inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" className="text-center text-2xl tracking-[0.5em]" minLength={6} maxLength={8} autoFocus />
            </Field>
          )}
          {(mode === 'in' || mode === 'up' || mode === 'reset') && (
            <Field label={mode === 'reset' ? 'كلمة المرور الجديدة' : 'كلمة المرور'} hint={mode !== 'in' ? '6 أحرف على الأقل' : undefined}><Input type="password" required minLength={6} {...f('password')} dir="ltr" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></Field>
          )}
          {mode === 'in' && <button type="button" onClick={() => swap('forgot')} className="-mt-2 justify-self-start text-sm font-semibold text-primary underline-offset-4 hover:underline">نسيت كلمة المرور؟</button>}
          <HumanCheck key={mode} ref={human} onToken={setCaptcha} />
          {err && <p className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{err}</p>}
          <Button size="lg" disabled={busy} className="mt-2 w-full">{busy ? 'لحظة…' : CTA[mode]}</Button>
          {codeStep && <p className="text-center text-sm text-muted-foreground">ما وصلك؟ {wait > 0 ? <span className="tabular">تقدر تطلب رمز جديد بعد {mmss(wait)}</span> : <button type="button" onClick={resend} className="font-semibold text-primary underline underline-offset-4">أرسل رمز جديد</button>}</p>}
          {(mode === 'forgot' || codeStep) && <button type="button" onClick={() => swap('in')} className="text-center text-sm text-muted-foreground hover:text-primary">رجوع لتسجيل الدخول</button>}
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          بالمتابعة توافق على <Link to="/policies" className="font-semibold text-primary underline underline-offset-4">السياسات والشروط</Link>
        </p>

        {isDemo && import.meta.env.DEV && DEMO_ADMIN && (
          <div className="mt-6 rounded-md border-2 border-dashed border-accent bg-accent/10 p-4 text-sm leading-7">
            <strong>وضع العرض</strong> — البيانات محفوظة في متصفحك فقط. دخول الإدارة:{' '}
            <button type="button" className="font-bold text-primary underline underline-offset-4" onClick={() => { setMode('in'); setForm({ ...form, email: DEMO_ADMIN.email, password: DEMO_ADMIN.password }) }}>
              <span dir="ltr">{DEMO_ADMIN.email}</span>
            </button> · رمز التحقق في وضع العرض: <b dir="ltr">{DEMO_CODE}</b>
          </div>
        )}
      </div>
    </div>
  )
}
