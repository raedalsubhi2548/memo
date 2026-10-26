import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, Search, User, ShoppingBag, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/state.jsx'
import Social from '@/components/Social.jsx'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { SearchDialog } from '@/components/site/SearchDialog.jsx'
import AccountSheet from '@/components/site/AccountSheet.jsx'

const iconBtn = 'relative grid size-10 place-items-center rounded-full text-primary transition-colors hover:bg-white/80 active:scale-95'

/** A soft bar over the blush page: the logo and name, four links, search, account and the bag. */
export default function SiteHeader() {
  const { count, setCartOpen, user, categories, products, settings } = useApp()
  const [menu, setMenu] = useState(false)
  const [acct, setAcct] = useState(false)
  const [search, setSearch] = useState(false)
  const loc = useLocation()
  useEffect(() => { setMenu(false); setAcct(false) }, [loc.pathname, loc.search])
  const accountTo = user ? '/account' : '/login'
  const link = ({ isActive }) => cn('rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-colors', isActive ? 'bg-white text-primary shadow-hairline' : 'text-foreground/80 hover:text-primary')

  return (
    <header className="sticky top-0 z-40 bg-[var(--background)]/80 backdrop-blur-xl">
      <div className="container-w flex h-[var(--header-height)] items-center gap-4">
        <button className={cn(iconBtn, '-ms-2.5 lg:hidden')} onClick={() => setMenu(true)} aria-label="القائمة">
          <Menu className="size-6" />
        </button>
        <Link to="/" className="flex items-center gap-3" aria-label={`${settings.store.name} — الرئيسية`}>
          <img src={settings.logo} alt="" width="44" height="44" className="size-11 rounded-full object-cover ring-1 ring-[var(--p-gold-400)]" />
          <span className="font-display text-[20px] font-semibold leading-none text-primary">{settings.store.name}</span>
        </Link>
        <nav className="ms-6 hidden items-center lg:flex" aria-label="الرئيسية">
          {settings.header.links.map((l) => /^https:/i.test(l.to)
            ? <a key={l.label + l.to} href={l.to} target="_blank" rel="noopener noreferrer" className={link({ isActive: false })}>{l.label}</a>
            : <NavLink key={l.label + l.to} to={l.to} className={link}>{l.label}</NavLink>)}
        </nav>
        <div className="ms-auto flex items-center gap-1">
          {settings.header.search && <button className={cn(iconBtn, 'hidden sm:grid')} onClick={() => setSearch(true)} aria-label="بحث"><Search className="size-[21px]" /></button>}
          <Link className={cn(iconBtn, 'hidden lg:grid')} to={accountTo} aria-label={user ? 'حسابي' : 'تسجيل الدخول'}><User className="size-[21px]" /></Link>
          <button className={cn(iconBtn, 'lg:hidden')} onClick={() => setAcct(true)} aria-label={user ? 'حسابي' : 'تسجيل الدخول'}><User className="size-[21px]" /></button>
          <button onClick={() => setCartOpen(true)} aria-label={`السلة، ${count} عناصر`}
            className="ms-1 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-[13.5px] font-bold text-primary-foreground shadow-[0_8px_18px_-10px_rgb(125_63_76/0.8)] transition-colors hover:bg-primary-hover active:scale-[.98]">
            <ShoppingBag className="size-[18px]" /><span className="hidden sm:inline">السلة</span><span className="tabular">{count}</span>
          </button>
        </div>
      </div>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="start" className="overflow-y-auto p-6">
          <SheetTitle className="sr-only">القائمة</SheetTitle>
          <SheetDescription className="sr-only">أقسام {settings.store.name} وروابط حسابك</SheetDescription>
          <Link to="/" className="flex items-center gap-3 self-start pe-14">
            <img src={settings.logo} alt="" width="48" height="48" className="size-12 rounded-full object-cover" />
            <span className="font-display text-[20px] font-semibold text-primary">{settings.store.name}</span>
          </Link>
          <ul className="mt-10 grid gap-1">
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/${c.id}`} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-sunken px-4 font-display text-[17px] font-semibold text-primary active:bg-[var(--p-cream-200)]">
                  {c.name}<span className="tabular text-[13px] font-normal text-muted-foreground">{products.filter((p) => p.categoryId === c.id).length} منتجات</span>
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-6 grid text-[15px] font-medium">
            {settings.header.links.filter((l) => !categories.some((c) => l.to === `/${c.id}`)).map((l) => (
              <li key={l.label + l.to}>{/^https:/i.test(l.to)
                ? <a href={l.to} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-between text-foreground">{l.label}<ArrowLeft className="size-4" /></a>
                : <Link to={l.to} className="flex min-h-12 items-center justify-between text-foreground">{l.label}<ArrowLeft className="size-4" /></Link>}</li>
            ))}
            <li><button type="button" onClick={() => { setMenu(false); setSearch(true) }} className="flex min-h-12 w-full items-center justify-between text-foreground">بحث<Search className="size-4" /></button></li>
          </ul>
          <Social className="mt-auto pt-6" />
        </SheetContent>
      </Sheet>

      <AccountSheet open={acct} onOpenChange={setAcct} />
      <SearchDialog open={search} onOpenChange={setSearch} />
    </header>
  )
}
