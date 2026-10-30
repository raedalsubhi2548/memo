// After `vite build` (+ the SSR build in dist-ssr): write a real HTML file for every public page, rendered by the
// app itself with the live catalog (own title, description, canonical, Open Graph, JSON-LD), plus sitemap.xml and
// robots.txt. The browser hydrates that HTML with the same catalog, so the first paint needs no JavaScript.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FAQ } from '../src/data/content.js'
import { ALL_REVIEWS } from '../src/data/reviews.js'
import { testimonials } from '../src/lib/feedback.js'
import { SITE, seoFor, headHtml } from '../src/lib/seo.js'
import { productPath, categoryPath, toSlug, RESERVED } from '../src/lib/slug.js'
import { render, loadCatalog } from '../dist-ssr/entry-server.js'
import { mergeSettings } from '../src/lib/theme.js'
import { applyStore } from '../src/lib/store.js'

const DIST = fileURLToPath(new URL('../dist/', import.meta.url))
// The stylesheet is inlined into every page: no render-blocking request before the first paint.
const template = readFileSync(join(DIST, 'index.html'), 'utf8').replace(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/, (_, href) => `<style>${readFileSync(join(DIST, href.slice(1)), 'utf8').replace(/<\/style/gi, '<\\/style')}</style>`)
const catalog = await loadCatalog()
applyStore(mergeSettings(catalog.settings).store) // the owner's store name, phone and email in titles, JSON-LD and links
const { categories, products } = catalog
const feedback = catalog.feedback || { reviews: [], questions: [] }
const data = { products, categories, faq: FAQ, reviews: testimonials(ALL_REVIEWS, feedback.reviews), feedback, settings: mergeSettings(catalog.settings) }
// embedded for hydration; `<` escaped so no product text can close the script tag
const catalogFor = () => catalog
const catalogJson = (c) => `<script type="application/json" id="__catalog">${JSON.stringify(c).replace(/</g, '\\u003c')}</script>`
// the home hero is the biggest thing on the first screen: start fetching it with the HTML, not after the app runs
const hero = mergeSettings(catalog.settings).home.find((b) => b.on && b.type === 'hero') || { image: '', imageMobile: '' }
const attr = (u) => u.replace(/["<>&]/g, encodeURIComponent)
// warm connections and the two fonts of the first screen (only while the original fonts are in use)
const S0 = mergeSettings(catalog.settings)
const assets = readdirSync(join(DIST, 'assets'))
const font = (re) => assets.find((f) => re.test(f))
const sb = (process.env.VITE_SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
const EARLY = [
  ...(/^https:\/\/[\w.-]+$/.test(sb) ? [`<link rel="preconnect" href="${sb}" crossorigin />`] : []),
  '<link rel="dns-prefetch" href="https://www.googletagmanager.com" />',
  ...(S0.fonts.heading === 'almarai' ? [font(/^almarai-arabic-700-normal-.*\.woff2$/)] : []),
  ...(S0.fonts.body === 'plex' ? [font(/^ibm-plex-sans-arabic-arabic-400-normal-.*\.woff2$/)] : []),
].filter(Boolean).map((x) => (x.startsWith('<') ? x : `<link rel="preload" as="font" type="font/woff2" href="/assets/${x}" crossorigin />`)).join('\n    ')
const HERO_PRELOAD = `    <link rel="preload" as="image" href="${attr(hero.image || '/brand/hero-silk-v4.webp')}" fetchpriority="high" />
`

// categories and products share the top level with the fixed pages: a clash would hide one of them
const taken = new Set(RESERVED)
for (const slug of [...categories.map((c) => c.id), ...products.map((p) => toSlug(p.id))]) {
  if (taken.has(slug)) throw new Error(`address clash: /${slug}`)
  taken.add(slug)
}
const productSet = new Set(products.filter((p) => p.active !== false).map((p) => productPath(p.id)))

const routes = ['/', '/shop', '/reviews', '/contact', '/policies',
  ...categories.map((c) => categoryPath(c.id)), ...products.filter((p) => p.active !== false).map((p) => productPath(p.id))]

const xml = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
for (const path of routes) {
  // ids come from the database: only plain slugs may become file names (no "../", no slashes)
  if (path !== '/' && !/^\/[\p{L}\p{N}_-]+$/u.test(path) && !['/shop', '/reviews', '/contact', '/policies'].includes(path)) throw new Error(`bad page address: ${path}`)
  const s = seoFor(path, data)
  let html = template
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta name="description"[^>]*>\s*/, '')
    // title, description and Open Graph come first in <head>: link previews (WhatsApp, X…) read only the start of the
    // page, and the inlined stylesheet would otherwise push them past that point
    .replace(/(<meta name="viewport"[^>]*>\r?\n)/, `$1    ${headHtml(s)}\n    ${EARLY}\n`)
    .replace('</head>', `${path === '/' ? HERO_PRELOAD : ''}  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${await render(path, catalogFor(path))}</div>${catalogJson(catalogFor(path))}`)
  const file = path === '/' ? join(DIST, 'index.html') : join(DIST, path.slice(1) + '.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
}

// The SPA fallback for every other route keeps a neutral, crawlable head.
writeFileSync(join(DIST, '200.html'), template
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${SITE.name.replace(/</g, '')}</title>`)
  .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${SITE.description.replace(/["<>]/g, '')}" />`)
  .replace(/<meta name="author"[^>]*>/, `<meta name="author" content="${SITE.name.replace(/["<>]/g, '')}" />`))

// Addresses that match no page get this file with a real 404 status (vercel.json only sends app routes to 200.html),
// so search engines drop dead links instead of reporting them as soft 404s.
writeFileSync(join(DIST, '404.html'), template
  .replace(/<title>[\s\S]*?<\/title>\s*/, '')
  .replace(/<meta name="description"[^>]*>\s*/, '')
  .replace(/<meta name="robots"[^>]*>\s*/, '')
  .replace(/(<meta name="viewport"[^>]*>\r?\n)/, `$1    ${headHtml({ ...seoFor('/404'), title: `الصفحة غير موجودة | ${SITE.name}`, robots: 'noindex,follow' })}\n`)
  // no embedded catalog: the browser renders this page fresh for whatever address it was served at, instead of hydrating
  .replace('<div id="root"></div>', `<div id="root">${await render('/404/missing', catalogFor('/404/missing'))}</div>`))

const today = new Date().toISOString().slice(0, 10)
const url = (p) => SITE.url.replace(/\/$/, '') + p
// Google Images: each product page lists its photo, each section the photos of its products
const photo = (p) => (p.image && !p.image.startsWith('data:') ? [p.image.startsWith('http') ? p.image : url(p.image)] : [])
const live = products.filter((p) => p.active !== false)
const pics = {
  '/': [url(SITE.ogImage)],
  ...Object.fromEntries(live.map((p) => [productPath(p.id), photo(p)])),
  ...Object.fromEntries(categories.map((c) => [categoryPath(c.id), live.filter((p) => p.categoryId === c.id).flatMap(photo)])),
}
const indexed = routes.filter((r) => !/noindex/.test(seoFor(r, data).robots))
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${indexed.map((r) => `  <url><loc>${xml(url(r === '/' ? '/' : r))}</loc><lastmod>${today}</lastmod><changefreq>${r === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${r === '/' ? '1.0' : productSet.has(r) ? '0.8' : '0.6'}</priority>${(pics[r] || []).map((src) => `<image:image><image:loc>${xml(src)}</image:loc></image:image>`).join('')}</url>`).join('\n')}
</urlset>
`)
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /cart
Disallow: /order/
Disallow: /login
Disallow: /api/

Sitemap: ${url('/sitemap.xml')}
`)
console.log(`prerendered ${routes.length} pages (${products.length} products), sitemap.xml, robots.txt`)
process.exit(0) // the Supabase client keeps timers alive
