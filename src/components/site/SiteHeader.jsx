import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, Search, Heart, User, ShoppingBag, MessageCircle, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/state.jsx'
import Icon from '@/components/Icon.jsx'
import Social from '@/components/Social.jsx'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { SearchDialog } from '@/components/site/SearchDialog.jsx'
import AccountSheet from '@/components/site/AccountSheet.jsx'

const iconBtn = 'relative grid size-11 place-items-center rounded-full transition-colors'

/** A hairline of gold under the header that fills as you read the page. */
function ScrollLine() {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const on = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; const h = document.documentElement.scrollHeight - innerHeight; setP(h > 0 ? scrollY / h : 0) }) }
    on(); addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  return <span className="absolute inset-x-0 bottom-0 h-px origin-right bg-gradient-to-l from-accent via-white to-accent" style={{ transform: `scaleX(${p})` }} aria-hidden="true" />
}

export default function SiteHeader() {
  const { count, setCartOpen, user, categories, products, wishlist, settings } = useApp()
  const [menu, setMenu] = useState(false)
  const [acct, setAcct] = useState(false)
  const [search, setSearch] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const loc = useLocation()
  useEffect(() => { setMenu(false); setAcct(false) }, [loc.pathname, loc.search])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const accountTo = user ? '/account' : '/login'

  // the clear header floats over the blush hero (which shows the big logo): only when the home page starts with one (the designer previews it at /admin/preview)
  const home = (loc.pathname === '/' || loc.pathname === '/admin/preview') && settings.home.find((b) => b.on)?.type === 'hero'
  const clear = home && !scrolled
  const ink = clear ? 'text-primary hover:bg-white/60' : 'text-primary hover:bg-sunken'
  const link = ({ isActive }) => cn('relative px-2.5 py-2 text-[14.5px] font-medium transition-colors after:absolute after:inset-x-2.5 after:bottom-1 after:h-px after:origin-center after:scale-x-0 after:bg-accent after:transition-transform after:duration-500 hover:after:scale-x-100', isActive ? 'text-primary after:scale-x-100' : 'text-foreground/80 hover:text-primary')

  return (
    <header className={cn('sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-500', !scrolled ? 'bg-transparent' : 'bg-background/80 shadow-[0_10px_30px_-20px_color-mix(in_srgb,var(--p-green-900)_35%,transparent)] backdrop-blur-xl')}>
      <div className="container-w grid h-[var(--header-height)] grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-1">
          <button className={cn(iconBtn, ink, 'lg:hidden')} onClick={() => setMenu(true)} aria-label="أقسام المتجر">
            <Menu className="size-6" />
          </button>
          <button className={cn(iconBtn, ink, 'lg:hidden')} onClick={() => setAcct(true)} aria-label={user ? 'حسابي' : 'تسجيل الدخول'}>
            <User className="size-[22px]" />
            {user && <span className="absolute top-2 end-2 size-2 rounded-full bg-success ring-2 ring-background" aria-hidden="true" />}
          </button>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="الرئيسية">
            {settings.header.links.map((l) => /^https:/i.test(l.to)
              ? <a key={l.label + l.to} href={l.to} target="_blank" rel="noopener noreferrer" className={link({ isActive: false })}>{l.label}</a>
              : <NavLink key={l.label + l.to} to={l.to} className={link}>{l.label}</NavLink>)}
          </nav>
        </div>

        <Link to="/" className="relative grid h-full w-36 place-items-center sm:w-44" aria-label={`${settings.store.name} — الرئيسية`}>
          {/* over the hero the big logo is already on the page: the small one appears once you scroll */}
          <img src={settings.logo} alt={settings.store.name} width="96" height="96" className={cn('relative size-[calc(48px*var(--logo-scale,1))] rounded-full object-cover ring-1 ring-[var(--p-gold-500)]/50 transition-[opacity,scale] duration-700 ease-[cubic-bezier(.16,1,.3,1)] sm:size-[calc(54px*var(--logo-scale,1))]', clear ? 'scale-75 opacity-0' : 'scale-100 opacity-100')} />
        </Link>

        <div className="flex items-center justify-end gap-0.5">
          {settings.header.search && <button className={cn(iconBtn, ink)} onClick={() => setSearch(true)} aria-label="بحث"><Search className="size-[21px]" /></button>}
{settings.header.wishlist && (
          <Link className={cn(iconBtn, ink, 'hidden sm:grid')} to="/account/wishlist" aria-label={`المفضلة (${wishlist.length})`}>
            <Heart className="size-[21px]" />
            {wishlist.length > 0 && <span className="absolute top-1.5 end-1.5 size-2 rounded-full bg-danger" />}
          </Link>
          )}
          <Link className={cn(iconBtn, ink, 'hidden lg:grid')} to={accountTo} aria-label={user ? 'حسابي' : 'تسجيل الدخول'}><User className="size-[21px]" /></Link>
          <button
            onClick={() => setCartOpen(true)}
            aria-label={`السلة، ${count} عناصر`}
            className="ms-1 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-3.5 text-primary-foreground shadow-[0_8px_20px_-8px_color-mix(in_srgb,var(--p-green-900)_80%,transparent)] transition-colors hover:bg-primary-hover"
          >
            <ShoppingBag className="size-[18px] text-on-inverse" />
            <span className="tabular text-sm font-semibold">{count}</span>
          </button>
        </div>
      </div>
      <ScrollLine />

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="start" className="overflow-y-auto p-5">
          <SheetTitle className="sr-only">أقسام المتجر</SheetTitle>
          <SheetDescription className="sr-only">تصفّحي أقسام {settings.store.name} وروابط حسابك</SheetDescription>
          <Link to="/" className="self-start pe-14"><img src={settings.logo} alt={settings.store.name} width="96" height="96" className="size-[calc(56px*var(--logo-scale,1))] rounded-full object-cover" /></Link>
          <p className="mt-6 mb-2 text-xs font-bold text-muted-foreground">أقسام المتجر</p>
          <ul className="grid gap-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/${c.id}`} className="flex min-h-14 items-center gap-3 rounded-md border border-border bg-surface p-2 pe-3 font-display font-semibold text-primary active:bg-sunken">
                  <span className="grid size-10 place-items-center rounded-sm bg-primary text-accent"><Icon name={c.icon} size={19} /></span>
                  <span className="flex-1">{c.name}</span>
                  <span className="tabular rounded-full bg-sunken px-2 text-xs font-bold text-accent-text">{products.filter((p) => p.categoryId === c.id).length}</span>
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-5 grid border-t border-border pt-3 text-[15px] font-semibold">
            {settings.header.links.map((l, i) => {
              const I = [Search, ArrowLeft, ArrowLeft, MessageCircle][i] || ArrowLeft
              const cls = 'flex min-h-12 items-center gap-3 text-foreground'
              return <li key={l.label + l.to}>{/^https:/i.test(l.to) ? <a href={l.to} target="_blank" rel="noopener noreferrer" className={cls}><I className="size-5 text-primary" />{l.label}</a> : <Link to={l.to} className={cls}><I className="size-5 text-primary" />{l.label}</Link>}</li>
            })}
          </ul>
          <Social className="mt-auto pt-6" />
        </SheetContent>
      </Sheet>

      <AccountSheet open={acct} onOpenChange={setAcct} />
      <SearchDialog open={search} onOpenChange={setSearch} />
    </header>
  )
}
