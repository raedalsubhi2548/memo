import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'

// Cloudflare Turnstile: the real "are you human" check. Supabase verifies the token on sign-in,
// sign-up and password reset (Authentication → Attack Protection). Off until VITE_TURNSTILE_SITE_KEY is set.
export const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading
const loadScript = () => (loading ||= new Promise((ok, fail) => {
  if (window.turnstile) return ok(window.turnstile)
  const s = Object.assign(document.createElement('script'), { src: SRC, async: true, defer: true })
  s.onload = () => ok(window.turnstile); s.onerror = () => { loading = null; fail(new Error('turnstile')) }
  document.head.appendChild(s)
}))

/** A card in the store's style holding the Turnstile widget. `onToken(token|'')` reports each pass or expiry. */
const HumanCheck = forwardRef(function HumanCheck({ onToken }, ref) {
  const box = useRef(null), id = useRef(null)
  const [state, setState] = useState('checking') // checking · ok · error
  useImperativeHandle(ref, () => ({ reset() { if (id.current != null) { window.turnstile?.reset(id.current); setState('checking'); onToken('') } } }))

  useEffect(() => {
    if (!TURNSTILE_KEY) return
    let gone = false
    loadScript().then((ts) => {
      if (gone || !box.current) return
      id.current = ts.render(box.current, {
        sitekey: TURNSTILE_KEY, language: 'ar', theme: 'light', size: 'flexible',
        callback: (t) => { setState('ok'); onToken(t) },
        'expired-callback': () => { setState('checking'); onToken('') },
        'error-callback': () => { setState('error'); onToken('') },
      })
    }).catch(() => setState('error'))
    return () => { gone = true; if (id.current != null) window.turnstile?.remove(id.current); id.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!TURNSTILE_KEY) return null
  return (
    <div className="rounded-xl bg-sunken p-4 ring-1 ring-border">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-display font-semibold text-primary"><ShieldCheck className="size-5" />تأكيد إنك إنسان</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">يتم التحقق تلقائياً خلال ثواني، وإذا طُلب منك اضغط على المربع.</p>
        </div>
        <span className={`mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${state === 'ok' ? 'bg-success-soft text-success' : state === 'error' ? 'bg-danger-soft text-danger' : 'bg-surface text-muted-foreground'}`}>
          <span className={`size-1.5 rounded-full ${state === 'ok' ? 'bg-success' : state === 'error' ? 'bg-danger' : 'animate-pulse bg-muted-foreground'}`} />
          {state === 'ok' ? 'تم التحقق' : state === 'error' ? 'تعذّر التحقق' : 'جاري التحقق…'}
        </span>
      </div>
      <div ref={box} className="min-h-[65px]" />
      {state === 'error' && <button type="button" onClick={() => location.reload()} className="mt-2 text-sm font-semibold text-primary underline underline-offset-4">حدّث الصفحة وجرّب مرة ثانية</button>}
    </div>
  )
})
export default HumanCheck
