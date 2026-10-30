import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Lock, ChevronDown, Truck } from 'lucide-react'
import { canApplePay } from '@/components/TapApplePay.jsx'
import PaymentForm from '@/components/PaymentForm.jsx'
import { DECLARATION } from '@/data/terms.js'
import { useApp } from '@/state.jsx'
import { api, isDemo } from '@/lib/api.js'
import { money } from '@/lib/format.js'
import { shippingFor } from '@/lib/theme.js'
import { SHORT_ADDRESS_OK, cleanShortAddress, loadAddress, saveAddress } from '@/lib/address.js'
import { cn } from '@/lib/utils'
import OptionList from '@/components/OptionList.jsx'
import { trackBeginCheckout } from '@/lib/analytics.js'
import { Button } from '@/components/ui/button'
import { PageHead, Panel, Field, Input, Textarea, Skeleton } from '@/components/ui/kit.jsx'

const PHONE_OK = (p) => /^0?5\d{8}$|^\+?9665\d{8}$/.test(String(p || '').replace(/\s/g, ''))
const EMPTY_ADDRESS = { shortAddress: '', city: '', district: '', street: '', details: '' }

export default function Checkout() {
  const { user, authReady, lines, subtotal, clearCart, notify, settings } = useApp()
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [addr, setAddr] = useState(EMPTY_ADDRESS)
  const [addrErr, setAddrErr] = useState({})
  const [code, setCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [couponErr, setCouponErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [agreed, setAgreed] = useState(false) // the declaration must be accepted for every order
  const [agreeErr, setAgreeErr] = useState(false)
  const [leaving, setLeaving] = useState(false) // on the way to the bank: keep this screen, don't bounce to the empty cart
  const [phoneErr, setPhoneErr] = useState('') // every hook sits above the early returns below, so each render runs the same hooks
  const [apple, setApple] = useState(false) // Apple Pay is known only in the browser, after hydration
  useEffect(() => { setApple(canApplePay()); const a = loadAddress(); if (a) setAddr((x) => ({ ...x, ...a })) }, [])
  // an order whose payment didn't finish (failed to start, or the customer came back from the bank) is reused, not duplicated
  const pending = useRef(null)
  if (pending.current === null) { try { pending.current = JSON.parse(sessionStorage.getItem('mimi:pending-order') || 'false') || undefined } catch { pending.current = undefined } }

  // back button from the bank restores this page from the cache with the old "leaving" state
  useEffect(() => {
    const back = (e) => { if (e.persisted) { setLeaving(false); setBusy(false) } }
    window.addEventListener('pageshow', back)
    return () => window.removeEventListener('pageshow', back)
  }, [])

  const counted = useRef(false)
  useEffect(() => { if (!counted.current && lines.length) { counted.current = true; trackBeginCheckout(lines, subtotal) } }, [lines, subtotal])
  useEffect(() => { if (user) setForm((f) => ({ ...f, name: f.name || user.name, phone: f.phone || user.phone, email: user.email })) }, [user])

  // on the way to the bank (3-D Secure): a full-screen hold, so the page never shows its footer while the browser leaves
  if (leaving) return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-background px-6" role="status" aria-live="polite">
      <div className="grid justify-items-center gap-5 text-center">
        <Lock className="size-9 text-primary" />
        <span className="size-9 animate-spin rounded-full border-[3px] border-primary/15 border-t-primary" aria-hidden="true" />
        <p className="text-lg font-semibold text-primary">{leaving === 'bank' ? 'نحوّلك لبنكك لتأكيد الدفع…' : 'نحوّلك لبوابة الدفع الآمنة…'}</p>
      </div>
    </div>
  )
  if (!authReady) return <div className="container-w py-14"><Skeleton className="h-96" /></div>
  if (!user) return <Navigate to="/login?next=/checkout" replace />
  if (lines.length === 0) return <Navigate to="/cart" replace />

  const discount = coupon ? Math.min(subtotal, coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value) : 0
  const shippingFee = coupon?.freeShipping ? 0 : shippingFor(settings.shipping, subtotal) // the server applies the same rule
  const total = Math.max(0, subtotal - discount) + shippingFee

  const applyCoupon = async () => {
    setCouponErr('')
    try { const c = await api.validateCoupon(code); setCoupon(c); notify(c.freeShipping && !(c.value > 0) ? 'تم تطبيق الشحن المجاني' : c.freeShipping ? 'تم تطبيق الخصم والشحن المجاني' : 'تم تطبيق الخصم') } catch (e) { setCoupon(null); setCouponErr(e.message) }
  }

  const addressErrors = (a) => ({
    ...(!SHORT_ADDRESS_OK(a.shortAddress) && { shortAddress: 'اكتبي العنوان المختصر: 4 حروف إنجليزية و4 أرقام، مثل RRRD2929' }),
    ...(!a.city.trim() && { city: 'اكتبي المدينة' }),
    ...(!a.district.trim() && { district: 'اكتبي الحي' }),
  })
  const ready = !!form.name.trim() && PHONE_OK(form.phone) && !Object.keys(addressErrors(addr)).length && agreed
  // the page's own checks, before any card is read or order created
  const validate = () => {
    setErr('')
    if (!form.name.trim()) { setErr('اكتبي اسمك'); return false }
    if (!PHONE_OK(form.phone)) { setPhoneErr('اكتبي رقم جوال سعودي صحيح، مثل 05xxxxxxxx'); document.getElementById('checkout-phone')?.focus(); return false }
    setPhoneErr('')
    const ae = addressErrors(addr)
    setAddrErr(ae)
    if (Object.keys(ae).length) { document.getElementById('addr-' + Object.keys(ae)[0])?.focus(); return false }
    if (!agreed) { setAgreeErr(true); document.getElementById('checkout-agree')?.scrollIntoView({ block: 'center', behavior: 'smooth' }); return false }
    return true
  }

  // creates the order (or reuses the one from a payment that didn't finish), then pays it
  const placeOrder = async (start) => {
    setBusy(true)
    try {
      const shipping = { ...addr, shortAddress: cleanShortAddress(addr.shortAddress) }
      saveAddress(shipping)
      const items = lines.map(({ product: p, qty, note, options, chosen, unit }) => ({ productId: p.id, name: p.name, price: unit, qty, note: note || '', image: p.image, digital: !!p.digital, optionKeys: options, options: chosen }))
      const key = `${total}|${coupon?.code || ''}|${JSON.stringify(shipping)}|${lines.map((l) => l.key + 'x' + l.qty).join(',')}`
      const order = (pending.current?.key === key && pending.current.order) || await api.createOrder({
        items, customer: { name: form.name, phone: form.phone, email: form.email }, shipping,
        notes: form.notes, coupon: coupon?.code || null, subtotal, discount, shippingFee, total, paymentMethod: 'card',
      })
      if (isDemo) { clearCart(); nav(`/order/${order.id}?new=1`, { replace: true }); return }
      pending.current = { key, order }
      try { sessionStorage.setItem('mimi:pending-order', JSON.stringify({ key, order: { id: order.id, number: order.number } })) } catch { /* private mode */ }
      const { redirect, free, paid, kind } = await start(order)
      if (free || paid) { // paid on the spot (no 3-D Secure step), or a 100% coupon
        pending.current = undefined; try { sessionStorage.removeItem('mimi:pending-order') } catch { /* ignore */ }
        clearCart(); nav(`/order/${order.id}?new=1`, { replace: true }); return
      }
      // the cart is emptied only after the payment is confirmed (on the order page), so a cancelled payment keeps it
      setLeaving(kind)
      window.location.href = redirect
    } catch (e) {
      // a remembered order that's already paid or gone can't be reused; the next try starts a fresh one
      if (/مدفوع|غير موجود/.test(e.message)) { pending.current = undefined; try { sessionStorage.removeItem('mimi:pending-order') } catch { /* ignore */ } }
      setBusy(false)
      throw e
    }
  }
  const onPay = ({ token }) => placeOrder(async (order) => ({ ...(await api.startPayment(order, token)), kind: token ? 'bank' : 'gateway' }))

  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) })
  const a = (k) => ({ id: 'addr-' + k, value: addr[k], 'aria-invalid': !!addrErr[k] || undefined, onChange: (e) => { setAddr({ ...addr, [k]: e.target.value }); if (addrErr[k]) setAddrErr({ ...addrErr, [k]: '' }) } })

  return (
    <div className="container-w py-10 sm:py-14">
      <PageHead title="إتمام الطلب" />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
        <Panel title="بيانات التواصل" className="lg:col-start-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الاسم"><Input required {...f('name')} autoComplete="name" /></Field>
            <Field label="رقم الجوال" error={phoneErr}><Input id="checkout-phone" required {...f('phone')} type="tel" name="tel" inputMode="tel" dir="ltr" placeholder="05xxxxxxxx" autoComplete="tel" aria-invalid={!!phoneErr || undefined} className="text-end" /></Field>
            <Field label="البريد الإلكتروني" className="sm:col-span-2"><Input type="email" required {...f('email')} dir="ltr" readOnly className="text-end" /></Field>
          </div>
        </Panel>

        {/* on phones the order total comes before shipping and payment; on desktop it sits beside the panels */}
        <Panel title="طلبك" className="lg:sticky lg:top-[calc(var(--header-height)+24px)] lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <ul className="grid gap-3">
            {lines.map(({ key, product: p, qty, chosen, unit }) => (
              <li key={key} className="flex items-center gap-3 text-sm">
                <img src={p.image} alt="" className="size-12 rounded-sm object-cover" />
                <span className="grid flex-1 gap-0.5 leading-6"><span>{p.name}{qty > 1 && <span className="text-muted-foreground"> × {qty}</span>}</span><OptionList items={chosen} /></span>
                <strong className="tabular">{money(unit * qty)}</strong>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (code.trim()) applyCoupon() } }} name="coupon" autoComplete="off" spellCheck={false} autoCapitalize="characters" enterKeyHint="done" placeholder="كود الخصم" aria-label="كود الخصم" aria-invalid={!!couponErr || undefined} dir="ltr" className="h-11 text-end" />
            <Button type="button" variant="outline" size="sm" className="h-11" onClick={applyCoupon} disabled={!code.trim()}>تطبيق</Button>
          </div>
          {couponErr && <p className="mt-2 text-sm text-danger" role="alert">{couponErr}</p>}
          <dl className="mt-5 grid gap-2 border-t border-border pt-4 text-[15px]">
            <div className="flex justify-between"><dt className="text-muted-foreground">المجموع</dt><dd className="tabular">{money(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-success"><dt>خصم {coupon.code}</dt><dd className="tabular">− {money(discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted-foreground">الشحن</dt><dd className="tabular">{shippingFee > 0 ? money(shippingFee) : coupon?.freeShipping ? <span className="text-success">مجاني بكود {coupon.code}</span> : 'مجاني'}</dd></div>
            <div className="flex items-baseline justify-between border-t border-border pt-3"><dt className="font-bold">الإجمالي</dt><dd className="tabular font-display text-2xl font-semibold text-primary">{money(total)}</dd></div>
          </dl>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><Truck className="size-5" />عنوان الشحن</span>} className="lg:col-start-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="العنوان الوطني المختصر" hint="4 حروف و4 أرقام، تلقينه في تطبيق سبل أو موقع العنوان الوطني" error={addrErr.shortAddress} className="sm:col-span-2">
              <Input required {...a('shortAddress')} dir="ltr" placeholder="RRRD2929" maxLength={9} autoCapitalize="characters" autoComplete="off" spellCheck={false} className="text-end uppercase tracking-[0.2em]" />
            </Field>
            <Field label="المدينة" error={addrErr.city}><Input required {...a('city')} autoComplete="address-level2" maxLength={60} /></Field>
            <Field label="الحي" error={addrErr.district}><Input required {...a('district')} autoComplete="address-level3" maxLength={80} /></Field>
            <Field label="الشارع (اختياري)" className="sm:col-span-2"><Input {...a('street')} autoComplete="address-line1" maxLength={120} /></Field>
            <Field label="تفاصيل العنوان (اختياري)" className="sm:col-span-2"><Textarea rows={2} {...a('details')} maxLength={300} placeholder="رقم المبنى، الدور، الشقة، أو علامة قريبة" /></Field>
            <Field label="ملاحظات للطلب (اختياري)" className="sm:col-span-2"><Textarea rows={2} {...f('notes')} maxLength={1000} /></Field>
          </div>
        </Panel>

        <Panel title="الدفع" className="lg:col-start-1">
          <PaymentForm
            amount={total} customer={form} apple={apple}
            validate={validate} ready={ready} onPay={onPay} busy={busy} error={err}
            above={(
              <div className="grid gap-2">
                <label id="checkout-agree" className={cn('flex cursor-pointer items-start gap-3 rounded-xl bg-sunken p-3.5 text-sm leading-6 ring-1 transition-colors', agreeErr && !agreed ? 'bg-danger-soft ring-danger' : 'ring-transparent')}>
                  <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setAgreeErr(false); setErr('') }} aria-invalid={(agreeErr && !agreed) || undefined} className="mt-1 size-4 shrink-0 accent-[var(--primary)]" />
                  <span>أوافق على <Link to="/policies" target="_blank" className="font-semibold text-primary underline">السياسات والشروط</Link> وعلى الإقرار التالي.</span>
                </label>
                {agreeErr && !agreed && <p className="-mt-1 px-1 text-[13px] font-semibold text-danger" role="alert">لازم توافقين على السياسات والشروط قبل الدفع</p>}
                <details className="group rounded-xl ring-1 ring-border">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-sm font-semibold text-primary">{DECLARATION.h}<ChevronDown className="size-4 transition-transform group-open:rotate-180" /></summary>
                  <div className="border-t border-border px-3.5 py-3 text-[13px] leading-6 text-muted-foreground">
                    <p>{DECLARATION.intro}</p>
                    <ol className="mt-2 grid list-decimal gap-1.5 ps-5">{DECLARATION.items.map((x) => <li key={x}>{x}</li>)}</ol>
                  </div>
                </details>
              </div>
            )}
          />
        </Panel>
      </div>
    </div>
  )
}
