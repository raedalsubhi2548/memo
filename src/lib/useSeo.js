import { useEffect } from 'react'
import { seoFor } from './seo.js'

const set = (sel, make, attrs) => {
  let el = document.head.querySelector(sel)
  if (!el) { el = make(); document.head.appendChild(el) }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
}
const meta = (key, val, prop) => set(`meta[${prop ? 'property' : 'name'}="${key}"]`, () => { const m = document.createElement('meta'); m.setAttribute(prop ? 'property' : 'name', key); return m }, { content: String(val ?? '') })

/** Keep <head> in step with the current route (title, description, canonical, social cards, JSON-LD). */
export function useSeo(path, data) {
  useEffect(() => {
    if (!path) return
    const s = seoFor(path, data)
    document.title = s.title
    meta('description', s.description)
    meta('robots', s.robots)
    if (s.keywords) meta('keywords', s.keywords)
    set('link[rel="canonical"]', () => { const l = document.createElement('link'); l.rel = 'canonical'; return l }, { href: s.canonical })
    meta('og:type', s.type, true); meta('og:title', s.title, true); meta('og:description', s.description, true)
    meta('og:url', s.canonical, true); meta('og:image', s.image, true)
    meta('twitter:card', 'summary_large_image'); meta('twitter:title', s.title); meta('twitter:description', s.description); meta('twitter:image', s.image)
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((n) => n.remove())
    for (const j of s.jsonLd) {
      const sc = document.createElement('script'); sc.type = 'application/ld+json'; sc.textContent = JSON.stringify(j); document.head.appendChild(sc)
    }
  }, [path, data])
}
