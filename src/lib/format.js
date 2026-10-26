const nf = new Intl.NumberFormat('ar-SA-u-nu-latn', { maximumFractionDigits: 2 })
export const money = (n) => `${nf.format(Number(n) || 0)} ر.س`
export const num = (n) => nf.format(Number(n) || 0)
export const date = (d) => new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d))
export const dateTime = (d) => new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(d))
export const effectivePrice = (p) => (p.salePrice && p.salePrice < p.price ? p.salePrice : p.price)
// The store's WhatsApp/phone and email: 0502953556 unless the owner sets others in the store designer (src/lib/store.js).
export let WHATSAPP = '966502953556'
export let EMAIL = ''
export function setContact(whatsapp, email) { WHATSAPP = whatsapp; EMAIL = email }
/** 966502953556 → 0502953556 */
export const localPhone = (w = WHATSAPP) => (w.startsWith('966') ? '0' + w.slice(3) : '+' + w)
export const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`
/** A saved wa.me link made with the original number follows the store's current number. */
export const liveWa = (href) => (typeof href === 'string' ? href.replace(/^https:\/\/wa\.me\/966502953556/, `https://wa.me/${WHATSAPP}`) : href)

// Product descriptions use a light format: first paragraph, then "## heading" + "- item" lines.
export function parseDescription(text = '') {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const intro = []
  const sections = []
  for (const l of lines) {
    if (l.startsWith('## ')) sections.push({ title: l.slice(3), items: [] })
    else if (sections.length) sections[sections.length - 1].items.push(l.replace(/^-\s*/, ''))
    else intro.push(l)
  }
  return { intro: intro.join(' '), sections }
}

// ---- product options (same rules as place_order in the database) ----
// A selection is a list of "optionId:valueId" keys. Unknown keys are ignored.
export const optKey = (o, v) => `${o.id}:${v.id}`
export function chosenOptions(p, sel = []) {
  const set = new Set(sel), out = []
  for (const o of p?.options || []) for (const v of o.values) if (set.has(optKey(o, v))) out.push({ option: o.name, value: v.name, price: Number(v.price) || 0 })
  return out
}
export const unitPrice = (p, sel) => effectivePrice(p) + chosenOptions(p, sel).reduce((s, c) => s + c.price, 0)
// required choices still missing (names), for the add-to-cart check
export const missingOptions = (p, sel = []) => (p?.options || []).filter((o) => o.required && !o.values.some((v) => sel.includes(optKey(o, v)))).map((o) => o.name)
// keeps only keys that still exist on the product (an option may have been removed since it was added to the cart)
export const cleanSelection = (p, sel = []) => { const ok = new Set((p?.options || []).flatMap((o) => o.values.map((v) => optKey(o, v)))); return [...new Set(sel)].filter((k) => ok.has(k)).sort() }

/** An email shown back on screen without giving it away: r•••d@r•••.com */
export const maskEmail = (e) => {
  const [u = '', d = ''] = String(e || '').trim().split('@')
  if (!d) return '•••'
  const part = (s) => (s.length <= 2 ? s[0] + '•••' : s[0] + '•••' + s.slice(-1))
  const dot = d.lastIndexOf('.')
  return `${part(u)}@${dot > 0 ? d[0] + '•••' + d.slice(dot) : '•••'}`
}
