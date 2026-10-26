// Build-time renderer for the public pages (used by scripts/prerender.mjs, never shipped to the browser).
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from './App.jsx'
import { api, isDemo } from './lib/api.js'
import { seedCategories, seedProducts } from './data/seed.js'

/** The live catalog (Supabase) at build time; the demo seed when the store isn't configured. */
export async function loadCatalog() {
  if (isDemo) return { categories: seedCategories, products: seedProducts.filter((p) => p.active !== false), settings: null, feedback: { reviews: [], questions: [] } }
  const [categories, products, settings, feedback] = await Promise.all([api.getCategories(), api.getProducts(), api.getSettings().catch(() => null), api.getFeedback().catch(() => ({ reviews: [], questions: [] }))])
  return { categories, products: products.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)), settings, feedback }
}

// renderToString, not the streaming renderer: React 18's node stream can drop NUL bytes into Arabic text at its
// buffer edges. A lazy page suspends on its first pass (its fallback is marked <!--$!-->), so render again once
// the page's module has loaded.
export async function render(url, initialCatalog) {
  for (let i = 0; i < 20; i++) {
    const html = renderToString(<App Router={StaticRouter} routerProps={{ location: url }} initialCatalog={initialCatalog} />)
    if (!html.includes('<!--$!-->')) return html
    await new Promise((r) => setTimeout(r, 25))
  }
  throw new Error('SSR: ' + url + ' still suspended')
}
