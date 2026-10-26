// Saudi national short address (العنوان الوطني المختصر): 4 letters + 4 digits, e.g. RRRD2929.
// The same rule runs in place_order (supabase/store-2026-10.sql).
export const cleanShortAddress = (v) => String(v || '').toUpperCase().replace(/[\s-]/g, '')
export const SHORT_ADDRESS_OK = (v) => /^[A-Z]{4}\d{4}$/.test(cleanShortAddress(v))

/** One line for emails, invoices and the dashboard. */
export const addressLine = (s) => (s ? [s.shortAddress, s.city, s.district, s.street, s.details].filter((x) => String(x || '').trim()).join('، ') : '')

// the last address used on this device fills the form next time
const KEY = 'mimi:address'
export const loadAddress = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
export const saveAddress = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* private mode */ } }
