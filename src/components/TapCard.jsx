// Tap's card fields (Web Card SDK v2) inside our own checkout. The card number never touches our page or server:
// Tap draws the fields in its own frame and hands back a one-time token (tok_…) that api/tap-charge.js charges.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export const TAP_PUBLIC_KEY = (import.meta.env.VITE_TAP_PUBLIC_KEY || '').trim()
export const TAP_MERCHANT_ID = (import.meta.env.VITE_TAP_MERCHANT_ID || '').trim()
const MERCHANT_ID = TAP_MERCHANT_ID
const SDK = 'https://tap-sdks.b-cdn.net/card/1.0.2/index.js'

let loading
const loadSdk = () => (loading ||= new Promise((ok, no) => {
  if (window.CardSDK) return ok(window.CardSDK)
  const s = Object.assign(document.createElement('script'), { src: SDK, async: true })
  s.onload = () => (window.CardSDK ? ok(window.CardSDK) : no(new Error('sdk')))
  s.onerror = () => { loading = null; no(new Error('sdk')) }
  document.head.appendChild(s)
}))

const TapCard = forwardRef(function TapCard({ amount, customer, onValid, onState }, ref) {
  const pendingRef = useRef(null)
  const [state, setState] = useState('loading') // loading | ready | failed
  const id = 'tap-card-' + useRef(Math.random().toString(36).slice(2, 8)).current

  useImperativeHandle(ref, () => ({
    // resolves with the token id, or rejects with a message to show
    tokenize: () => new Promise((resolve, reject) => {
      if (!window.CardSDK) return reject(new Error('نموذج البطاقة ما تحمّل، حدّث الصفحة'))
      const t = setTimeout(() => { pendingRef.current = null; reject(new Error('تعذّر قراءة البطاقة، حاول مرة ثانية')) }, 30000)
      pendingRef.current = { resolve: (v) => { clearTimeout(t); resolve(v) }, reject: (e) => { clearTimeout(t); reject(e) } }
      window.CardSDK.tokenize()
    }),
    reset: () => window.CardSDK?.resetCardInputs?.(),
  }), [])

  useEffect(() => { onState?.(state) }, [state, onState])

  useEffect(() => {
    let unmount, gone = false
    loadSdk().then((C) => {
      if (gone) return
      const phone = String(customer?.phone || '').replace(/\D/g, '').replace(/^(966|0)/, '')
      const out = C.renderTapCard(id, {
        publicKey: TAP_PUBLIC_KEY,
        ...(MERCHANT_ID ? { merchant: { id: MERCHANT_ID } } : {}),
        transaction: { amount: Math.max(Number(amount) || 1, 1), currency: C.Currencies.SAR },
        customer: {
          name: [{ lang: C.Locale.AR, first: String(customer?.name || 'عميل').split(' ')[0], last: String(customer?.name || '').split(' ').slice(1).join(' ') || '-' }],
          nameOnCard: customer?.name || '',
          editable: true,
          contact: { email: customer?.email || '', phone: { countryCode: '966', number: phone } },
        },
        acceptance: { supportedBrands: ['MADA', 'VISA', 'MASTERCARD', 'AMERICAN_EXPRESS'], supportedCards: 'ALL' },
        fields: { cardHolder: true },
        addons: { displayPaymentBrands: false, loader: true, saveCard: false },
        interface: { locale: C.Locale.AR, theme: C.Theme.LIGHT, edges: C.Edges.CURVED, direction: C.Direction.RTL },
        onReady: () => setState('ready'),
        // both report a boolean: onValidInput(true) when the card is complete, onInvalidInput(true) when it isn't
        onValidInput: (v) => onValid?.(v === true),
        onInvalidInput: (v) => { if (v === true) onValid?.(false) },
        onSuccess: (data) => { const p = pendingRef.current; pendingRef.current = null; if (data?.id) p?.resolve(data.id); else p?.reject(new Error('تعذّر قراءة البطاقة، حاول مرة ثانية')) },
        onError: (err) => {
          const p = pendingRef.current; pendingRef.current = null
          p?.reject(new Error('تأكد من بيانات البطاقة'))
          if (!p) console.warn('tap card', err)
        },
      })
      unmount = out?.unmount
    }).catch(() => !gone && setState('failed'))
    return () => { gone = true; try { unmount?.() } catch { /* already gone */ } }
    // the card fields are drawn once; the charged amount always comes from the order on the server
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative min-h-[60px]">
      {state === 'loading' && <div className="absolute inset-0 animate-pulse rounded-md bg-sunken" aria-hidden="true" />}
      {state === 'failed' && <p className="text-sm text-danger" role="alert">تعذّر تحميل نموذج البطاقة. حدّث الصفحة أو اختر «صفحة الدفع من Tap».</p>}
      <div id={id} />
    </div>
  )
})

export default TapCard
