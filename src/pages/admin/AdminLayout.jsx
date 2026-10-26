import { Suspense, useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Receipt, Package, Tags, Users, TicketPercent, ExternalLink, LogOut, Menu, Plus, Palette, ChartColumn, UsersRound, MessageSquareText } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { api, isDemo } from '@/lib/api.js'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/kit.jsx'
import { ConfirmProvider } from '@/components/admin/ui.jsx'
import ErrorBoundary from '@/components/ErrorBoundary.jsx'
import { ADMIN_HOST, STORE_ORIGIN } from '@/lib/host.js'
import { areaOf, can } from '@/lib/perms.js'

const NAV = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'نظرة عامة', area: 'overview' },
  { to: '/admin/orders', icon: Receipt, label: 'الطلبات', badge: 'orders', area: 'orders' },
  { to: '/admin/reports', icon: ChartColumn, label: 'التقارير', area: 'reports' },
  { to: '/admin/products', icon: Package, label: 'المنتجات', area: 'products' },
  { to: '/admin/categories', icon: Tags, label: 'التصنيفات', area: 'categories' },
  { to: '/admin/customers', icon: Users, label: 'العملاء', area: 'customers' },
  { to: '/admin/coupons', icon: TicketPercent, label: 'كوبونات الخصم', area: 'coupons' },
  { to: '/admin/feedback', icon: MessageSquareText, label: 'التقييمات والأسئلة', badge: 'feedback', area: 'reviews' },
  { to: '/admin/design', icon: Palette, label: 'مصمم المتجر', area: 'design' },
  { to: '/admin/team', icon: UsersRound, label: 'الفريق والصلاحيات', area: 'team' },
]

function Nav({ pending, onNavigate, dark, access }) {
  return (
    <nav className="grid gap-0.5" aria-label="لوحة التحكم">
      {NAV.filter((n) => can(access, n.area)).map(({ to, end, icon: I, label, badge }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          className={({ isActive }) => cn('group flex h-11 items-center gap-3 rounded-md px-3 text-[15px] font-semibold transition-colors',
            dark ? (isActive ? 'bg-white text-primary shadow-[0_10px_24px_-12px_rgb(0_0_0/0.6)]' : 'text-white/70 hover:bg-white/[0.07] hover:text-white')
              : (isActive ? 'bg-primary text-on-inverse shadow-hairline' : 'text-foreground/80 hover:bg-sunken hover:text-primary'))}>
          {({ isActive }) => (<>
            <I className={cn('size-[18px]', dark ? (isActive ? 'text-primary' : 'text-white/50 group-hover:text-white') : (isActive ? 'text-accent' : 'text-muted-foreground group-hover:text-primary'))} />
            <span className="flex-1">{label}</span>
            {badge && pending[badge] > 0 && <span className={cn('tabular min-w-6 rounded-full px-1.5 text-center text-xs font-bold leading-6', isActive ? 'bg-primary text-primary-foreground' : dark ? 'bg-white/15 text-white' : 'bg-accent/30 text-accent-text')}>{pending[badge]}</span>}
          </>)}
        </NavLink>
      ))}
    </nav>
  )
}

function SideFoot({ user, dark, access }) {
  return (
    <div className={cn('grid gap-1 border-t pt-4', dark ? 'border-white/10 [&_a]:text-white/70 [&_a:hover]:bg-white/[0.07] [&_a:hover]:text-white [&>button]:text-white/70' : 'border-border')}>
      <a href={STORE_ORIGIN + "/?notrack=1"} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground hover:bg-sunken hover:text-primary"><ExternalLink className="size-4" />عرض المتجر</a>
      <button onClick={() => api.signOut()} className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground hover:bg-danger-soft hover:text-danger"><LogOut className="size-4" />خروج</button>
      <div className={cn('mt-2 flex items-center gap-3 rounded-md p-3', dark ? 'bg-white/[0.06] [&_p:first-child]:text-white' : 'bg-sunken')}>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-display font-semibold text-accent">{(user.name || user.email).charAt(0)}</span>
        <div className="min-w-0"><p className="truncate text-sm font-bold text-primary">{user.name || access?.role || 'المدير'}{access && !access.owner && access.role && user.name && <span className="ms-1.5 text-xs font-semibold text-muted-foreground">· {access.role}</span>}</p><p className="truncate text-xs text-muted-foreground" dir="ltr">{user.email}</p></div>
      </div>
    </div>
  )
}

function Brand({ dark }) {
  const { settings } = useApp()
  return (
  <Link to="/admin" className="flex items-center gap-3">
    <img src={dark ? settings.logoLight : settings.logo} alt={settings.store.name} className="size-11 rounded-full object-cover" />
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', dark ? 'bg-white/10 text-white/80' : 'bg-accent/25 text-accent-text')}>لوحة التحكم</span>
  </Link>
  )
}

export default function AdminLayout() {
  useEffect(() => { let m = document.querySelector('meta[name="robots"]'); if (!m) { m = document.createElement('meta'); m.name = 'robots'; document.head.appendChild(m) } m.content = 'noindex,nofollow'; document.title = 'لوحة التحكم' }, [])
  const { user, authReady } = useApp()
  const { pathname } = useLocation()
  const [menu, setMenu] = useState(false)
  const [pending, setPending] = useState({ orders: 0, feedback: 0 })
  const [access, setAccess] = useState(null) // { owner, role, perms, strong } from my_access
  useEffect(() => {
    if (!user) { setAccess(null); return }
    let on = true
    api.myAccess().then((a) => on && setAccess(a)).catch(() => on && setAccess(user.role === 'admin' ? { owner: true, role: 'المالك', perms: ['orders', 'reports', 'products', 'categories', 'customers', 'coupons', 'design', 'blog', 'reviews', 'team'], strong: true } : { owner: false, role: '', perms: [], strong: true }))
    return () => { on = false }
  }, [user?.id, user?.role])
  const isAdmin = !!access && (access.owner || access.perms.length > 0)
  const area = areaOf(pathname)
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    if (!isAdmin) return
    if (can(access, 'orders')) api.allOrders().then((o) => setPending((p) => ({ ...p, orders: o.filter((x) => ['paid', 'in_progress', 'review'].includes(x.status)).length }))).catch(() => {})
    if (can(access, 'reviews')) Promise.all([api.listReviews(), api.listQuestions()]).then(([r, q]) => setPending((p) => ({ ...p, feedback: r.filter((x) => x.status === 'pending').length + q.filter((x) => x.status === 'pending').length }))).catch(() => {})
  }, [isAdmin, access, pathname])

  if (!authReady || (user && !access)) return <div className="p-8"><Skeleton className="h-96" /></div>
  if (!user) return <Navigate to={ADMIN_HOST ? '/admin/login' : '/login?next=/admin'} replace />
  if (!isAdmin) {
    if (!ADMIN_HOST) return <Navigate to="/account" replace />
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
        <div className="grid max-w-sm justify-items-center gap-4">
          <Brand />
          <h1 className="font-display text-2xl font-semibold text-primary">{access?.strong === false ? 'أكمل الدخول برمز التحقق' : 'هذا الحساب ما عنده صلاحية لوحة التحكم'}</h1>
          <p className="text-muted-foreground">{access?.strong === false ? 'سجّل خروج، ثم ادخل من صفحة لوحة التحكم بكلمة المرور والرمز اللي يوصلك.' : 'سجّلي دخولك بحساب المالك أو بحساب موظف أضافه المالك لفريقه.'}</p>
          <button onClick={() => api.signOut()} className="h-11 rounded-full bg-primary px-6 font-semibold text-primary-foreground">تسجيل خروج</button>
          <a href={STORE_ORIGIN} className="text-sm font-semibold text-primary underline underline-offset-4">الذهاب للمتجر</a>
        </div>
      </div>
    )
  }

  if (!can(access, area)) {
    const first = NAV.find((n) => can(access, n.area))
    return <Navigate to={first ? first.to : '/admin/team'} replace />
  }

  return (
    <ConfirmProvider>
      <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[264px_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-5 overflow-hidden bg-[radial-gradient(120%_60%_at_100%_0%,#2c4470,#1b2b44_45%,#0f1a2c)] p-5 text-white lg:flex">
          <span className="pointer-events-none absolute -bottom-24 -start-24 size-72 rounded-full border-[14px] border-white/[0.04]" aria-hidden="true" />
          <div className="relative pt-1"><Brand dark /></div>
          <div className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><Nav access={access} pending={pending} dark /></div>
          <div className="relative"><SideFoot access={access} user={user} dark /></div>
        </aside>

        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setMenu(true)} className="grid size-11 place-items-center rounded-full text-primary hover:bg-sunken" aria-label="القائمة"><Menu className="size-6" /></button>
          <Brand />
          {can(access, 'products') ? <Link to="/admin/products/new" className="grid size-11 place-items-center rounded-full bg-primary text-accent" aria-label="منتج جديد"><Plus className="size-5" /></Link> : <span className="size-11" />}
        </header>
        <Sheet open={menu} onOpenChange={setMenu}>
          <SheetContent side="start" className="gap-6 bg-surface p-5">
            <SheetTitle className="sr-only">قائمة لوحة التحكم</SheetTitle>
            <Brand />
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><Nav access={access} pending={pending} onNavigate={() => setMenu(false)} /></div>
            <SideFoot access={access} user={user} />
          </SheetContent>
        </Sheet>

        <main id="main" className="min-w-0 overflow-x-clip px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-[1180px]">
            {isDemo && <p className="mb-6 rounded-md border-2 border-dashed border-accent bg-accent/10 px-4 py-3 text-sm leading-7"><strong>وضع العرض:</strong> التعديلات محفوظة في هذا المتصفح فقط.</p>}
            <ErrorBoundary resetKey={pathname}><Suspense fallback={<Skeleton className="h-96" />}><Outlet context={access} /></Suspense></ErrorBoundary>
          </div>
        </main>
      </div>
    </ConfirmProvider>
  )
}
