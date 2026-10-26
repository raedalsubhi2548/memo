import { Suspense } from 'react'
import { NavLink, Navigate, Outlet, Link, useLocation } from 'react-router-dom'
import { Receipt, Heart, UserRound, LogOut, LayoutDashboard } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { api } from '@/lib/api.js'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/kit.jsx'
import { ADMIN_ORIGIN } from '@/lib/host.js'

const TABS = [
  { to: '/account', end: true, icon: Receipt, label: 'طلباتي' },
  { to: '/account/wishlist', icon: Heart, label: 'المفضلة' },
  { to: '/account/profile', icon: UserRound, label: 'بياناتي' },
]

export default function AccountLayout() {
  const { user, authReady } = useApp()
  const { pathname } = useLocation()
  const guestOk = pathname.endsWith('/wishlist')
  if (!authReady) return <div className="container-w py-14"><Skeleton className="h-64" /></div>
  if (!user && !guestOk) return <Navigate to={`/login?next=${pathname}`} replace />
  const initial = (user?.name || user?.email || '؟').trim().charAt(0)
  return (
    <div className="container-w py-10 sm:py-14">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user && <span className="grid size-14 place-items-center rounded-full bg-primary font-display text-xl font-semibold text-accent" aria-hidden="true">{initial}</span>}
          <div>
            <h1 className="font-display text-display-sm font-semibold text-primary">{user ? `أهلاً ${user.name || ''}` : 'المفضلة'}</h1>
            {user && <p className="text-sm text-muted-foreground" dir="ltr">{user.email}</p>}
          </div>
        </div>
        {user?.role === 'admin' && <Button asChild variant="accent"><a href={ADMIN_ORIGIN} target="_blank" rel="noreferrer"><LayoutDashboard className="size-4" />لوحة التحكم</a></Button>}
      </header>
      {user && (
        <nav className="-mx-4 mb-8 flex gap-2 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0" aria-label="حسابي">
          {TABS.map(({ to, end, icon: I, label }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('-mb-px flex h-12 shrink-0 items-center gap-2 border-b-[3px] px-4 text-sm font-bold transition-colors', isActive ? 'border-accent text-primary' : 'border-transparent text-muted-foreground hover:text-primary')}>
              <I className="size-4" />{label}
            </NavLink>
          ))}
          <button onClick={() => api.signOut()} className="-mb-px ms-auto flex h-12 shrink-0 items-center gap-2 border-b-[3px] border-transparent px-4 text-sm font-bold text-muted-foreground hover:text-danger">
            <LogOut className="size-4" />خروج
          </button>
        </nav>
      )}
      <Suspense fallback={<Skeleton className="h-64" />}><Outlet /></Suspense>
    </div>
  )
}
