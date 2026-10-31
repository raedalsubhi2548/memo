// Tabby's own snippets: the promo under the price (product page) and the card under the Tabby option (checkout).
// They need only the public key and the store's merchant code; payments go through api/_tabby.js.
import { useEffect, useRef } from 'react'

export const TABBY_PUBLIC_KEY = (import.meta.env.VITE_TABBY_PUBLIC_KEY || '').trim()
export const TABBY_MERCHANT = (import.meta.env.VITE_TABBY_MERCHANT_CODE || '').trim()
export const TABBY_ON = !!TABBY_PUBLIC_KEY && !!TABBY_MERCHANT

const scripts = {}
const load = (src, name) => (scripts[src] ||= new Promise((ok, no) => {
  if (window[name]) return ok(window[name])
  const s = Object.assign(document.createElement('script'), { src, async: true })
  s.onload = () => (window[name] ? ok(window[name]) : no(new Error(name)))
  s.onerror = () => { delete scripts[src]; no(new Error(name)) }
  document.head.appendChild(s)
}))

// one snippet in a container of its own (Tabby's rule: the id must not be the component's name), redrawn when the price changes
function Snippet({ kind, price, source, className }) {
  const id = useRef('tabby-' + kind.toLowerCase() + '-' + Math.random().toString(36).slice(2, 8)).current
  useEffect(() => {
    if (!TABBY_ON || !(Number(price) > 0)) return
    let gone = false
    load(`https://checkout.tabby.ai/tabby-${kind === 'TabbyCard' ? 'card' : 'promo'}.js`, kind).then((C) => {
      if (gone || !document.getElementById(id)) return
      document.getElementById(id).innerHTML = ''
      new C({ selector: '#' + id, currency: 'SAR', price: Number(price).toFixed(2), lang: 'ar', publicKey: TABBY_PUBLIC_KEY, merchantCode: TABBY_MERCHANT, ...(source ? { source } : {}) })
    }).catch(() => { /* the snippet is a hint only: the option itself still works */ })
    return () => { gone = true }
  }, [kind, price, source, id])
  if (!TABBY_ON) return null
  return <div id={id} className={className} />
}

export const TabbyPromo = ({ price, source = 'product', className }) => <Snippet kind="TabbyPromo" price={price} source={source} className={className} />
export const TabbyCard = ({ price, className }) => <Snippet kind="TabbyCard" price={price} className={className} />

export const TabbyLogo = ({ className = '' }) => (
  <span className={'grid h-6 w-12 place-items-center rounded-[5px] bg-[#3bffc1] px-1.5 ' + className}><img src="/brand/pay/tabby.svg" alt="تابي" className="max-h-[65%] max-w-full object-contain" /></span>
)
