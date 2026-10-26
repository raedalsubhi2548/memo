// Apple Pay through Tap, with Tap's own React button (@tap-payments/apple-pay-button). Tap must register the store domain with
// Apple (the domain file Tap gives goes in public/.well-known/apple-developer-merchantid-domain-association). The button opens Apple's
// sheet and hands back a one-time token (tok_…) that api/tap-charge.js charges, like the card fields.
// (Their CDN script keeps a single button per page and returns the old one on a second draw, so it went blank.)
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { TAP_PUBLIC_KEY, TAP_MERCHANT_ID } from '@/components/TapCard.jsx'

const Button = lazy(() => import('@tap-payments/apple-pay-button').then((m) => ({ default: m.ApplePayButton })))

/** true on a device/browser where Apple Pay can be used (Safari on iPhone, iPad, Mac with a card in Wallet) */
export const canApplePay = () => {
  try { return !!TAP_MERCHANT_ID && typeof window !== 'undefined' && !!window.ApplePaySession && window.ApplePaySession.canMakePayments() } catch { return false }
}

/**
 * amount: the order total shown in Apple's sheet (the server charges the order's own total).
 * onToken(tokenId) is called after the customer approves; onError(message) on failure.
 */
export default function TapApplePay({ amount, customer, onToken, onError, ready = true, onBlocked }) {
  const [state, setState] = useState('loading') // loading | ready | failed
  const cb = useRef({ onToken, onError })
  cb.current = { onToken, onError }
  // if Tap never says it's ready, don't leave an empty grey box
  useEffect(() => { setState('loading'); const t = setTimeout(() => setState((s) => (s === 'loading' ? 'failed' : s)), 12000); return () => clearTimeout(t) }, [amount])

  const phone = String(customer?.phone || '').replace(/\D/g, '').replace(/^(966|0)/, '')
  const [first, ...rest] = String(customer?.name || 'عميل').trim().split(/\s+/)

  // Tap's button loads in the background; until it's ready the same black pill stands in its place, so the
  // button never disappears. While the page checks (name, phone, agreement) don't pass, a clear layer over it
  // catches the tap and shows what's missing instead of opening Apple's sheet.
  const stand = (
    <button type="button" onClick={() => onBlocked?.()} aria-label="شراء باستخدام Apple Pay"
      className="flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-black text-[19px] font-medium text-white">
      شراء باستخدام <span dir="ltr" className="font-semibold"> Pay</span>
    </button>
  )
  if (state === 'failed') return <p className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">زر Apple Pay ما اشتغل الحين. تقدر تدفع بالبطاقة تحت.</p>
  return (
    <div className="relative h-12">
      {state !== 'ready' && stand}
      <div className={state === 'ready' ? '' : 'invisible absolute inset-0'} aria-hidden={state !== 'ready' || undefined}>
        <Suspense fallback={null}>
          <Button
            key={amount}
            scope="TapToken"
            publicKey={TAP_PUBLIC_KEY}
            environment="production"
            merchant={{ id: TAP_MERCHANT_ID, domain: window.location.hostname.replace(/^www\./, '') }}
            transaction={{ amount: Number(amount).toFixed(2), currency: 'SAR' }}
            acceptance={{ supportedBrands: ['mada', 'masterCard', 'visa'] }}
            features={{ supportsCouponCode: false }}
            customer={{
              name: [{ lang: 'ar', first: first || 'عميل', last: rest.join(' ') || '-' }],
              contact: { email: customer?.email || '', phone: { countryCode: '966', number: phone } },
            }}
            interface={{ locale: 'ar', theme: 'dark', type: 'buy', edges: 'circular' }}
            onReady={() => setState('ready')}
            onSuccess={async (data) => {
              const tok = data?.id || data?.token?.id || ''
              if (/^tok_/.test(tok)) cb.current.onToken?.(tok)
              else cb.current.onError?.('ما اكتمل الدفع بـ Apple Pay، حاول مرة ثانية')
            }}
            onError={(e) => { console.warn('apple pay', e); if (state === 'loading') setState('failed'); else cb.current.onError?.('ما اكتمل الدفع بـ Apple Pay، حاول مرة ثانية أو ادفع بالبطاقة') }}
            onCancel={() => {}}
          />
        </Suspense>
      </div>
      {state === 'ready' && !ready && <button type="button" onClick={() => onBlocked?.()} aria-label="شراء باستخدام Apple Pay" className="absolute inset-0 z-10 rounded-full" />}
    </div>
  )
}
