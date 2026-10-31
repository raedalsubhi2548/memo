// One payment box for the checkout and for a pending order: Apple Pay on top (on Apple devices), then Tap's card
// fields, then the pay button. Card data stays in Tap's fields: we only ever get a one-time
// token (tok_…), and the server charges the order's own total (api/tap-charge.js).
// With Tabby set up (VITE_TABBY_*), she picks card or Tabby first; Tabby is checked for her in the background and
// opens Tabby's own checkout page (api/_tabby.js).
import { useEffect, useRef, useState } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import { money } from '@/lib/format.js'
import { isDemo } from '@/lib/api.js'
import { Button } from '@/components/ui/button'
import TapCard, { TAP_PUBLIC_KEY } from '@/components/TapCard.jsx'
import TapApplePay from '@/components/TapApplePay.jsx'
import { TABBY_ON, TabbyCard, TabbyLogo } from '@/components/Tabby.jsx'
import { api } from '@/lib/api.js'
import { cn } from '@/lib/utils'

export const EMBED = !!TAP_PUBLIC_KEY && !isDemo

const BRANDS = [
  { name: 'مدى', src: '/brand/pay/mada.webp' },
  { name: 'Visa', src: '/brand/pay/visa.webp' },
  { name: 'Mastercard', src: '/brand/pay/mastercard.webp' },
]
const Brands = () => (
  <span className="flex items-center gap-1.5" aria-label="مدى، فيزا، ماستركارد">
    {BRANDS.map((b) => <span key={b.name} className="grid h-6 w-10 place-items-center rounded-[5px] bg-white px-1 ring-1 ring-black/10"><img src={b.src} alt={b.name} className="max-h-[70%] max-w-full object-contain" /></span>)}
  </span>
)

/**
 * amount, customer {name, phone, email}
 * apple: Apple Pay can be offered on this device (checked after hydration by the page)
 * validate(): page checks (phone, agreement…) before any payment starts; returns true when OK
 * ready: the same checks, passively (Apple's button only works when they already pass)
 * onPay({ token, via }): creates/charges the order (token null in demo mode or for a 0 total)
 * above: shown right above the pay button (e.g. the agreement)
 */
export default function PaymentForm({ amount, customer, apple, validate, ready, onPay, busy, error, above }) {
  const card = useRef(null)
  const [cardOk, setCardOk] = useState(false)
  const [cardState, setCardState] = useState('loading')
  const [localErr, setLocalErr] = useState('')
  const [method, setMethod] = useState('card')
  const [tabby, setTabby] = useState({ ok: true }) // the background check: { ok } or { ok: false, reason }
  const free = !(amount > 0)
  const phone = String(customer?.phone || '').replace(/\s/g, '')

  // Tabby's background check, once her phone and the total are known (a change re-checks)
  useEffect(() => {
    if (!TABBY_ON || free || !/^(\+?966|0)?5\d{8}$/.test(phone)) return
    let gone = false
    const t = setTimeout(() => api.tabbyCheck?.(amount, { phone, name: customer?.name })
      .then((r) => { if (!gone) setTabby(r?.reason ? { ok: false, reason: r.reason } : { ok: true }) })
      .catch(() => {}), 600)
    return () => { gone = true; clearTimeout(t) }
  }, [amount, phone, free]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!tabby.ok && method === 'tabby') setMethod('card') }, [tabby.ok, method])
  const viaTabby = TABBY_ON && !free && method === 'tabby'

  const go = async (fn) => { setLocalErr(''); try { await fn() } catch (e) { setLocalErr(e.message); if (EMBED) card.current?.reset?.() } }
  const payCard = () => go(async () => {
    if (!validate()) return
    if (viaTabby) return onPay({ token: null, via: 'tabby' })
    if (free || !EMBED) return onPay({ token: null, via: 'card' })
    if (!cardOk) throw new Error(cardState === 'failed' ? 'نموذج البطاقة ما تحمّل، حدّث الصفحة' : 'اكتب بيانات البطاقة كاملة')
    const token = await card.current.tokenize()
    await onPay({ token, via: 'card' })
  })
  const payApple = (token) => go(() => onPay({ token, via: 'applepay' }))
  const msg = localErr || error

  return (
    <div className="grid gap-5">
      {!free && TABBY_ON && (
        <div role="radiogroup" aria-label="طريقة الدفع" className="grid gap-2">
          {[
            { id: 'card', title: 'بطاقة أو Apple Pay', logo: <Brands /> },
            { id: 'tabby', title: 'تابي: قسّميها على دفعات', logo: <TabbyLogo />, off: !tabby.ok },
          ].map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={method === m.id} disabled={m.off} onClick={() => setMethod(m.id)}
              className={cn('flex min-h-13 items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-start ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60', method === m.id ? 'ring-2 ring-primary' : 'ring-border hover:ring-border-strong')}>
              <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border-[1.5px]', method === m.id ? 'border-primary' : 'border-border-strong')}>{method === m.id && <span className="size-2.5 rounded-full bg-primary" />}</span>
              <span className="flex-1 text-sm font-bold text-primary">{m.title}</span>
              {m.logo}
            </button>
          ))}
          {!tabby.ok && tabby.reason && <p className="px-1 text-[13px] leading-6 text-muted-foreground">{tabby.reason}</p>}
          {viaTabby && <TabbyCard price={amount} className="mt-1" />}
        </div>
      )}

      {!free && (
        <div className={cn('grid gap-4', viaTabby && 'hidden')}>
          {apple && EMBED && (
            <>
              <TapApplePay amount={amount} customer={customer} ready={ready} onBlocked={validate} onToken={payApple} onError={setLocalErr} />
              <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />أو ادفعي بالبطاقة<span className="h-px flex-1 bg-border" /></div>
            </>
          )}
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-border sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-primary">بيانات البطاقة</p>
              {!TABBY_ON && <Brands />}
            </div>
            {EMBED ? <TapCard ref={card} amount={amount} customer={customer} onValid={setCardOk} onState={setCardState} />
              : <p className="rounded-lg border border-dashed border-accent bg-accent/15 p-3 text-sm text-accent-text">{isDemo ? 'وضع العرض: الدفع يُسجَّل كمدفوع بدون خصم أي مبلغ.' : 'بننقلك لصفحة الدفع الآمنة لإدخال بيانات البطاقة.'}</p>}
          </div>
        </div>
      )}

      {above}
      {msg && <p className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{msg}</p>}

      <Button type="button" size="lg" className="h-13 w-full text-base" onClick={payCard} disabled={busy}><Lock />{busy ? (viaTabby ? 'نفتح لك تابي…' : 'جاري تأكيد الدفع…') : free ? 'أكمل الطلب' : viaTabby ? `ادفعي ${money(amount)} مع تابي` : `ادفعي ${money(amount)}`}</Button>

      {!free && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-success" />{viaTabby ? 'تكملين الدفع في صفحة تابي الآمنة، وترجعين لطلبك بعدها' : 'دفع آمن ومشفّر عبر بوابة Tap المرخّصة، وما نحفظ بيانات بطاقتك'}
        </p>
      )}
    </div>
  )
}
