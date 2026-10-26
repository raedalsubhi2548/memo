import { lazy as reactLazy, Suspense } from 'react'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// After a release an open tab may ask for page files that no longer exist: reload, at most once per 30 seconds.
const KEY = 'mimi:chunk-reload'
const lazy = (load) => reactLazy(() => load().catch((err) => {
  let last
  try { last = Number(sessionStorage.getItem(KEY)) || 0 } catch { throw err }
  if (Date.now() - last > 30000) {
    try { sessionStorage.setItem(KEY, String(Date.now())) } catch { throw err }
    location.reload()
    return new Promise(() => {})
  }
  throw err
}))
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useApp } from './state.jsx'
import { fromSlug, toSlug } from './lib/slug.js'
import { ADMIN_HOST, ADMIN_ORIGIN, LIVE_STORE } from './lib/host.js'
import { usePageViews } from './lib/analytics.js'
import { DirectionProvider } from '@radix-ui/react-direction'
import { AppProvider } from './state.jsx'
import Layout, { PageFallback } from './components/Layout.jsx'
import Toast from './components/Toast.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import Product from './pages/Product.jsx'
const Cart = lazy(() => import('./pages/Cart.jsx'))
const Checkout = lazy(() => import('./pages/Checkout.jsx'))
const Order = lazy(() => import('./pages/Order.jsx'))
const Review = lazy(() => import('./pages/Review.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const Policies = lazy(() => import('./pages/Policies.jsx'))
const Reviews = lazy(() => import('./pages/Reviews.jsx'))
import NotFound from './pages/NotFound.jsx'
const AccountLayout = lazy(() => import('./pages/account/AccountLayout.jsx'))
const MyOrders = lazy(() => import('./pages/account/Orders.jsx'))
const Wishlist = lazy(() => import('./pages/account/Wishlist.jsx'))
const Profile = lazy(() => import('./pages/account/Profile.jsx'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const Overview = lazy(() => import('./pages/admin/Overview.jsx'))
const AdminOrders = lazy(() => import('./pages/admin/Orders.jsx'))
const Products = lazy(() => import('./pages/admin/Products.jsx'))
const ProductForm = lazy(() => import('./pages/admin/ProductForm.jsx'))
const Categories = lazy(() => import('./pages/admin/Categories.jsx'))
const Customers = lazy(() => import('./pages/admin/Customers.jsx'))
const Coupons = lazy(() => import('./pages/admin/Coupons.jsx'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'))
const Reports = lazy(() => import('./pages/admin/Reports.jsx'))
const Designer = lazy(() => import('./pages/admin/Designer.jsx'))
const Team = lazy(() => import('./pages/admin/Team.jsx'))
const Feedback = lazy(() => import('./pages/admin/Feedback.jsx'))
const DesignPreview = lazy(() => import('./pages/admin/DesignPreview.jsx'))

function PageViews() { usePageViews(); return null }

// on the admin subdomain everything except sign-in leads to the dashboard
function AdminHostGate() {
  const { pathname, search } = useLocation()
  // the store itself never shows the dashboard: it opens on the admin subdomain
  if (LIVE_STORE && pathname.startsWith('/admin')) { location.replace(ADMIN_ORIGIN + pathname + search); return null }
  if (!ADMIN_HOST || pathname.startsWith('/admin')) return null
  return <Navigate to="/admin" replace />
}

// /<slug>: a category or a service (fixed pages above win). Unknown → 404 once the catalog has loaded.
function SlugPage() {
  const { slug } = useParams()
  const { categories, byId, catalogReady } = useApp()
  if (categories.some((c) => c.id === slug)) return <Shop categoryId={slug} />
  const id = fromSlug(slug)
  if (byId[id] || !catalogReady) return <Product slug={slug} />
  return <NotFound />
}
// the old /c/… and /p/… addresses (the server redirects them too)
function OldPath() {
  const { slug } = useParams()
  return <Navigate to={`/${toSlug(fromSlug(slug))}`} replace />
}

// The router is passed in: BrowserRouter in the browser (main.jsx), StaticRouter when pages are pre-rendered (entry-server.jsx).
export default function App({ Router, routerProps = {}, initialCatalog }) {
  return (
    <DirectionProvider dir="rtl">
    <AppProvider initialCatalog={initialCatalog}>
      <ErrorBoundary>
      <Router {...routerProps}>
        <PageViews />
        <AdminHostGate />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="c/:slug" element={<OldPath />} />
            <Route path="p/:slug" element={<OldPath />} />
            <Route path=":slug" element={<SlugPage />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order/:id" element={<Order />} />
            <Route path="review/:id" element={<Review />} />
            <Route path="login" element={<Login />} />
            <Route path="contact" element={<Contact />} />
            <Route path="policies" element={<Policies />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="account" element={<AccountLayout />}>
              <Route index element={<MyOrders />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="admin/preview" element={<Suspense fallback={null}><DesignPreview /></Suspense>}>
            <Route index element={<Home />} />
          </Route>
          <Route path="admin/login" element={<Suspense fallback={<div className="min-h-dvh bg-[#0b1322]" />}><AdminLogin /></Suspense>} />
          <Route path="admin" element={<Suspense fallback={<PageFallback />}><AdminLayout /></Suspense>}>
            <Route index element={<Overview />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="reports" element={<Reports />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductForm />} />
            <Route path="categories" element={<Categories />} />
            <Route path="customers" element={<Customers />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="design" element={<Designer />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="team" element={<Team />} />
          </Route>
        </Routes>
        <Toast />
      </Router>
      </ErrorBoundary>
    </AppProvider>
    </DirectionProvider>
  )
}
