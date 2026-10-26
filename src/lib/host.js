// The store's own domain comes from VITE_SITE_URL (set in Vercel, e.g. https://example.com); admin.<domain> opens the dashboard.
// Until the domain is set, the dashboard simply lives at /admin on whatever address serves the store.
const SITE = (import.meta.env.VITE_SITE_URL || '').trim().replace(/\/$/, '')
const DOMAIN = SITE.replace(/^https?:\/\/(www\.)?/, '')
export const ADMIN_HOST = typeof location !== 'undefined' && !!DOMAIN && location.hostname === 'admin.' + DOMAIN
export const STORE_ORIGIN = SITE || (typeof location !== 'undefined' ? location.origin : '')
export const ADMIN_ORIGIN = DOMAIN ? 'https://admin.' + DOMAIN : '/admin'
export const ADMIN_LABEL = DOMAIN ? 'admin.' + DOMAIN : '/admin'
// the live store (not previews or local): the dashboard lives only on admin.<domain> there
export const LIVE_STORE = typeof location !== 'undefined' && !!DOMAIN && (location.hostname === DOMAIN || location.hostname === 'www.' + DOMAIN)
/** A store page address that also works from the admin subdomain (opens on the store). */
export const storeUrl = (path) => (ADMIN_HOST ? STORE_ORIGIN + path : path)
