import { Suspense, useEffect, useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import SiteHeader from './site/SiteHeader.jsx'
import SiteFooter from './site/SiteFooter.jsx'
import CartDrawer from './CartDrawer.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { ThemeStyle, AnnouncementBar } from './site/StoreTheme.jsx'
import { useApp } from '../state.jsx'
import { useSeo } from '../lib/useSeo.js'
import { FAQ } from '../data/content.js'
import { ALL_REVIEWS } from '../data/reviews.js'
import { testimonials } from '../lib/feedback.js'

export function PageFallback() {
  return <div className="container-w py-16"><div className="h-80 animate-pulse rounded-xl bg-sunken" /></div>
}

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  // content protection on the public pages: no selecting, copying, right-click or dragging images.
  // Forms and the customer's own pages (cart, checkout, order, account, login) stay copyable.
  const guarded = !/^\/(cart|checkout|order|review|account|login)(\/|$)/.test(pathname)
  useEffect(() => {
    if (!guarded) return
    const root = document.documentElement
    root.classList.add('no-copy')
    const editable = (t) => t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"]')
    const block = (e) => { if (!editable(e.target)) e.preventDefault() }
    const keys = (e) => { if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a', 's', 'u'].includes(e.key.toLowerCase()) && !editable(e.target)) e.preventDefault() }
    const events = ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart']
    events.forEach((n) => document.addEventListener(n, block))
    document.addEventListener('keydown', keys)
    return () => {
      root.classList.remove('no-copy')
      events.forEach((n) => document.removeEventListener(n, block))
      document.removeEventListener('keydown', keys)
    }
  }, [guarded])
  const { products, categories, feedback, catalogReady, settings } = useApp()
  // the store name/description (store designer) is part of every title, so a change re-applies the head
  const seoData = useMemo(() => ({ products, categories, feedback, faq: FAQ, reviews: testimonials(ALL_REVIEWS, feedback.reviews), store: settings.store, settings }), [products, categories, feedback, settings])
  // single-segment paths may be a category or a service: wait for the catalog before naming the page
  useSeo(pathname === '/admin/preview' ? null : catalogReady || /^\/(shop|reviews|contact|policies|cart|checkout|login|account|order)(\/|$)/.test(pathname) || pathname === '/' ? pathname.replace(/\/$/, '') || '/' : null, seoData)
  return (
    <>
      <ThemeStyle />
      <a href="#main" className="skip">انتقلي للمحتوى</a>
      <AnnouncementBar />
      <SiteHeader />
      <main id="main" className="site-main relative isolate overflow-x-clip">
        <ErrorBoundary resetKey={pathname}><Suspense fallback={<PageFallback />}><Outlet /></Suspense></ErrorBoundary>
      </main>
      <SiteFooter />
      <CartDrawer />
    </>
  )
}
