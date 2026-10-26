// Supabase when configured, otherwise the in-browser demo store.
// The backend code (and the Supabase library, ~60 KB) loads in the background, so the page paints first.
const configured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
export const isDemo = !configured

let backend
const load = () => (backend ||= configured ? import('./supa.js').then((m) => m.supa) : import('./local.js').then((m) => m.local))
if (typeof window !== 'undefined') load() // start fetching right away, without blocking the first render

export const api = new Proxy({}, {
  get(_, name) {
    // onAuth must hand back its unsubscribe function synchronously
    if (name === 'onAuth') return (fn) => { let off, gone = false; load().then((b) => { if (!gone) off = b.onAuth(fn) }); return () => { gone = true; off?.() } }
    return (...args) => load().then((b) => b[name](...args))
  },
})
