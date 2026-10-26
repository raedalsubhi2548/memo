import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './lib/api.js'
import { unitPrice, chosenOptions, cleanSelection } from './lib/format.js'
import { mergeSettings } from './lib/theme.js'
import { applyStore } from './lib/store.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

const CART_KEY = 'mimi:cart'
const NO_FEEDBACK = { reviews: [], questions: [] }
const loadCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') } catch { return [] } }

// initialCatalog: the catalog baked into the page at build time, so the first render already has products
export function AppProvider({ children, initialCatalog }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [categories, setCategories] = useState(initialCatalog?.categories || [])
  const [products, setProducts] = useState(initialCatalog?.products || [])
  // published reviews and answered questions (supabase/reviews-2026-10.sql)
  const [feedback, setFeedback] = useState(initialCatalog?.feedback || NO_FEEDBACK)
  const [catalogReady, setCatalogReady] = useState(!!initialCatalog)
  // the store designer's settings (logo, colours, hero…); `preview` holds an unsaved draft shown in the designer's preview
  const [savedSettings, setSavedSettings] = useState(initialCatalog?.settings || null)
  const [preview, setPreview] = useState(null)
  const settings = useMemo(() => mergeSettings(preview || savedSettings), [preview, savedSettings])
  applyStore(settings.store) // before anything renders a phone link or a store name (same on the server and in the browser)
  // the page was built with a snapshot of these settings: only re-render when the live ones differ, and as a transition
  // so it never lands in the middle of hydration
  const refreshSettings = useCallback(() => api.getSettings().then((s) => {
    startTransition(() => setSavedSettings((cur) => (JSON.stringify(cur || null) === JSON.stringify(s || null) ? cur : s || null)))
  }).catch(() => {}), [])
  // a pre-rendered page was built with an empty cart: read the saved one right after hydration, not during it
  const [cart, setCart] = useState(() => (initialCatalog ? [] : loadCart()))
  const cartLoaded = useRef(!initialCatalog)
  const [cartOpen, setCartOpen] = useState(false)
  const [wishlist, setWishlistState] = useState([])
  const [toast, setToast] = useState(null)
  const toastTimer = useRef()

  const notify = useCallback((text, kind = 'ok') => {
    clearTimeout(toastTimer.current)
    setToast({ text, kind, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const refreshCatalog = useCallback(async () => {
    const [c, p, fb] = await Promise.all([api.getCategories(), api.getProducts(), api.getFeedback().catch(() => null)])
    // a transition, like the settings: an update that lands while a lazy page is still hydrating would throw it away
    startTransition(() => { setCategories(c); setProducts(p.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))); if (fb) setFeedback((cur) => (JSON.stringify(cur) === JSON.stringify(fb) ? cur : fb)); setCatalogReady(true) })
  }, [])

  const sameUser = (a, b) => a === b || (!!a && !!b && a.id === b.id && a.role === b.role && a.name === b.name && a.phone === b.phone && a.email === b.email)
  const applyUser = useCallback((u) => startTransition(() => { setUser((prev) => (sameUser(prev, u) ? prev : u)); setAuthReady(true) }), [])

  useEffect(() => {
    refreshCatalog().catch(() => startTransition(() => setCatalogReady(true)))
    refreshSettings()
    let alive = true, gotEvent = false
    api.currentUser().then((u) => { if (alive && !gotEvent) applyUser(u) }, () => alive && startTransition(() => setAuthReady(true)))
    const off = api.onAuth((u) => { gotEvent = true; if (alive) applyUser(u) })
    return () => { alive = false; off() }
  }, [refreshCatalog, refreshSettings, applyUser])

  useEffect(() => {
    let alive = true
    api.getWishlist().then((w) => { if (alive) startTransition(() => setWishlistState(Array.isArray(w) ? w : [])) }).catch(() => {})
    return () => { alive = false }
  }, [user?.id])
  useEffect(() => {
    if (!cartLoaded.current) { cartLoaded.current = true; const saved = loadCart(); if (saved.length) startTransition(() => setCart(saved)); return }
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch { /* ignore */ }
  }, [cart])

  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products])

  // cart lines store only id + chosen options + qty + note; prices always come from the live catalog.
  // The same service with different options is its own line (key = id + options).
  const lineKey = (productId, options = []) => [productId, ...[...options].sort()].join('|')
  const lines = useMemo(() => cart.map((l) => {
    const product = byId[l.productId]
    if (!product) return null
    const options = cleanSelection(product, l.options)
    return { ...l, key: l.key || lineKey(l.productId, l.options), options, product, chosen: chosenOptions(product, options), unit: unitPrice(product, options) }
  }).filter(Boolean), [cart, byId])
  const subtotal = lines.reduce((s, l) => s + l.unit * l.qty, 0)
  const count = lines.reduce((s, l) => s + l.qty, 0)

  const keyOf = (l) => l.key || lineKey(l.productId, l.options)
  const addToCart = (productId, qty = 1, note = '', options = []) => {
    const key = lineKey(productId, options)
    setCart((c) => {
      const i = c.findIndex((l) => keyOf(l) === key)
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], key, qty: n[i].qty + qty, note: note || n[i].note }; return n }
      return [...c, { key, productId, options: [...options].sort(), qty, note }]
    })
    setCartOpen(true)
  }
  const setQty = (key, qty) => setCart((c) => (qty <= 0 ? c.filter((l) => keyOf(l) !== key) : c.map((l) => (keyOf(l) === key ? { ...l, qty } : l))))
  const setNote = (key, note) => setCart((c) => c.map((l) => (keyOf(l) === key ? { ...l, note } : l)))
  const clearCart = () => setCart([])

  const toggleWish = async (productId) => {
    const has = wishlist.includes(productId)
    const next = has ? wishlist.filter((x) => x !== productId) : [...wishlist, productId]
    setWishlistState(next)
    notify(has ? 'أُزيلت من المفضلة' : 'أُضيفت إلى المفضلة')
    try { await api.setWishlist(next) } catch (e) { notify(e.message, 'err') }
  }

  const value = {
    user, authReady, applyUser, categories, products, feedback, byId, catalogReady, refreshCatalog,
    lines, subtotal, count, addToCart, setQty, setNote, clearCart, cartOpen, setCartOpen,
    wishlist, toggleWish, toast, notify,
    settings, savedSettings, refreshSettings, setPreview,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
