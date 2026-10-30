// Google Analytics 4 (G-ZBE23JK8SD, or VITE_GA_ID). Loaded from a file, not an inline <script>, so the strict CSP stays on.
// Page views are sent on every route change (the store is a single-page app); admin pages are left out.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { isDemo, api } from './api.js'
import { LIVE_STORE } from './host.js'

// the store's own GA4 property (memecare1.com, Oct 2026); VITE_GA_ID overrides it
export const GA_ID = (import.meta.env.VITE_GA_ID || 'G-ZBE23JK8SD').trim()
const on = LIVE_STORE && /^G-[A-Z0-9]+$/.test(GA_ID)

if (on) {
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() { window.dataLayer.push(arguments) } // eslint-disable-line prefer-rest-params
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { send_page_view: false })
  const s = Object.assign(document.createElement('script'), { async: true, src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}` })
  document.head.appendChild(s)
}

export const track = (name, params = {}) => { if (on) window.gtag('event', name, params) }

// ---- Snap Pixel (id from VITE_SNAP_PIXEL) ------------------------------------------------------------------------
// Same rule as GA: a file loaded from sc-static.net (allowed in vercel.json's CSP), only on the real store, never on admin.
export const SNAP_PIXEL = (import.meta.env.VITE_SNAP_PIXEL || '').trim()
const snapOn = LIVE_STORE && /^[0-9a-f-]{36}$/i.test(SNAP_PIXEL) && !location.pathname.startsWith('/admin')
if (snapOn) {
  const q = (window.snaptr = function snaptr() { q.handleRequest ? q.handleRequest.apply(q, arguments) : q.queue.push(arguments) }) // eslint-disable-line prefer-rest-params
  q.queue = []
  document.head.appendChild(Object.assign(document.createElement('script'), { async: true, src: 'https://sc-static.net/scevent.min.js' }))
  window.snaptr('init', SNAP_PIXEL, {})
}
export const snap = (name, params = {}) => { if (snapOn) window.snaptr('track', name, params) }

// ---- Our own visitor count (لوحة التحكم ← التقارير) --------------------------------------------------------------
// Sent to /api/hit on the store's own domain, so ad blockers and missing cookie consent don't hide visitors.
// The owner's own visits are left out: «عرض المتجر» in the dashboard opens the store with ?notrack=1, which marks that browser.
const mine = LIVE_STORE
const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { return null } }
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)))
if (typeof window !== 'undefined') {
  const q = new URLSearchParams(location.search).get('notrack')
  if (q === '1') ls('mimi:notrack', '1'); else if (q === '0') ls('mimi:notrack', null)
  if (q) { const u = new URL(location.href); u.searchParams.delete('notrack'); history.replaceState(history.state, '', u.pathname + u.search + u.hash) }
}
const counting = () => typeof window !== 'undefined' && (mine || isDemo) && !/^admin\./.test(location.hostname) && ls('mimi:notrack') !== '1' && (isDemo || !navigator.webdriver)
function ids() {
  let vid = ls('mimi:vid')
  if (!vid) { vid = uid(); ls('mimi:vid', vid) }
  // a visit (session) ends after 30 minutes with nothing happening
  let sid = null
  try { const x = JSON.parse(sessionStorage.getItem('mimi:sid') || 'null'); if (x && Date.now() - x.at < 30 * 60e3) sid = x.id } catch { /* new one */ }
  sid ||= uid()
  try { sessionStorage.setItem('mimi:sid', JSON.stringify({ id: sid, at: Date.now() })) } catch { /* ignore */ }
  return { vid, sid }
}
function send(body) {
  if (isDemo) { api.recordVisit?.({ ...body, at: new Date().toISOString(), ua: navigator.userAgent }).catch(() => {}); return }
  const data = JSON.stringify(body)
  if (!(navigator.sendBeacon && navigator.sendBeacon('/api/hit', new Blob([data], { type: 'application/json' }))))
    fetch('/api/hit', { method: 'POST', body: data, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {})
}
const utm = (() => { try { const p = new URLSearchParams(location.search); return { u: p.get('utm_source') || '', c: p.get('utm_campaign') || '' } } catch { return { u: '', c: '' } } })()
let current = null // the page on screen: its id and how long it has been visible
const shown = () => (current ? current.ms + (document.visibilityState === 'visible' && current.since ? Date.now() - current.since : 0) : 0)
function leave() {
  if (!current) return
  send({ t: 'leave', id: current.id, ...ids(), d: Math.round(shown() / 1000) })
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!current) return
    if (document.visibilityState === 'hidden') { current.ms = shown(); current.since = 0; leave() } else current.since = Date.now()
  })
}
let firstRef = typeof document !== 'undefined' ? document.referrer : ''
export function hit(kind, path) {
  if (!counting()) return
  const id = uid()
  if (kind === 'view') {
    leave()
    current = { id, ms: 0, since: Date.now() }
  }
  send({ t: kind, id, ...ids(), p: path || location.pathname, r: firstRef, u: utm.u, c: utm.c })
  firstRef = '' // only the landing page carries where the visitor came from
}

const item = (l) => ({ item_id: l.productId || l.product?.id, item_name: l.name || l.product?.name, price: Number(l.unit ?? l.price) || 0, quantity: l.qty || 1 })
export const trackAddToCart = (p, qty, unit) => {
  hit('cart')
  track('add_to_cart', { currency: 'SAR', value: unit * qty, items: [{ item_id: p.id, item_name: p.name, price: unit, quantity: qty }] })
  snap('ADD_CART', { item_ids: [p.id], item_category: p.categoryId, price: unit * qty, currency: 'SAR', number_items: qty })
}
export const trackBeginCheckout = (lines, value) => {
  hit('checkout')
  track('begin_checkout', { currency: 'SAR', value, items: lines.map(item) })
  snap('START_CHECKOUT', { item_ids: lines.map((l) => l.productId || l.product?.id), price: value, currency: 'SAR', number_items: lines.reduce((n, l) => n + (l.qty || 1), 0) })
}
export const trackViewProduct = (p, price) => snap('VIEW_CONTENT', { item_ids: [p.id], item_category: p.categoryId, price, currency: 'SAR' })
export const trackPurchase = (order) => {
  // once per order, even if the return page is reloaded
  const k = 'mimi:ga-purchase:' + order.id
  try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1') } catch { /* ignore */ }
  track('purchase', { transaction_id: String(order.number), currency: 'SAR', value: Number(order.total) || 0, items: (order.items || []).map(item) })
  // client_dedup_id = the order id, the same event_id the server sends to the Conversions API
  snap('PURCHASE', { transaction_id: String(order.number), client_dedup_id: String(order.id), price: Number(order.total) || 0, currency: 'SAR', item_ids: (order.items || []).map((l) => l.productId), number_items: (order.items || []).reduce((n, l) => n + (l.qty || 1), 0) })
}

/** Sends a page_view for each page the visitor opens. */
export function usePageViews() {
  const loc = useLocation()
  useEffect(() => { if (!loc.pathname.startsWith('/admin')) hit('view', loc.pathname) }, [loc.pathname])
  useEffect(() => {
    if (!on || loc.pathname.startsWith('/admin')) return
    // let the page set its <title> first
    const t = setTimeout(() => { track('page_view', { page_location: location.href, page_path: loc.pathname + loc.search, page_title: document.title }); snap('PAGE_VIEW') }, 50)
    return () => clearTimeout(t)
  }, [loc.pathname, loc.search])
}
