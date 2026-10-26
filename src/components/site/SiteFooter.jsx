import { Link } from 'react-router-dom'
import { MessageCircle, Mail } from 'lucide-react'
import Social from '@/components/Social.jsx'
import PayIcons from '@/components/brand/PayIcons.jsx'
import { useApp } from '@/state.jsx'
import { cn } from '@/lib/utils'
import { DEFAULT_FOOTER_LINKS as FOOTER_LINKS } from '@/lib/theme.js'
import { EMAIL, waLink, localPhone } from '@/lib/format.js'

/** The page settles into deep rose wine: no hard edge, the round logo sits right on it. */
export default function SiteFooter() {
  const { categories, settings } = useApp()
  const col = 'mb-4 text-[13px] font-semibold text-on-inverse/55'
  const item = 'group flex min-h-9 items-center gap-2 text-[14px] text-on-inverse/80 transition-colors hover:text-white'
  return (
    <footer className="relative mt-10 text-on-inverse">
      {/* cream melts into green */}
      <div className="h-40 bg-[linear-gradient(180deg,var(--background),var(--p-green-800)_85%,var(--p-green-900))] sm:h-56" aria-hidden="true" />
      <div className="relative -mt-px overflow-hidden bg-[linear-gradient(180deg,var(--p-green-900),var(--p-green-950))]">
        <span className="pointer-events-none absolute top-0 left-1/2 size-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.06),transparent)]" aria-hidden="true" />

        <div className="container-w relative pb-10">
          {/* closing invitation */}
          {settings.footer.cta && <div className="mx-auto max-w-xl text-center">
            <h2 className="font-script text-[2rem] font-bold leading-[1.5] sm:text-[2.6rem]">{settings.footer.ctaTitle}</h2>
            {settings.footer.ctaText && <p className="mt-2 text-[15.5px] leading-8 text-on-inverse/75">{settings.footer.ctaText}</p>}
            <a href={waLink('السلام عليكم، أبي أستفسر عن منتجاتكم')} target="_blank" rel="noreferrer"
              className="mt-6 inline-flex items-center gap-3 rounded-full bg-background py-2 ps-2 pe-6 text-primary shadow-[0_18px_36px_-16px_rgb(0_0_0/0.6)] transition-transform hover:-translate-y-0.5">
              <span className="grid size-10 place-items-center rounded-full bg-primary text-on-inverse"><MessageCircle className="size-5" /></span>
              <span className="text-start leading-tight"><span className="block text-[11.5px] text-primary/70">كلمينا على واتساب</span><b dir="ltr" className="tabular text-[17px]">{localPhone()}</b></span>
            </a>
          </div>}

          <div className={cn('grid gap-12 lg:grid-cols-[1fr_2.2fr] lg:gap-16', settings.footer.cta ? 'mt-16 border-t border-white/10 pt-12' : 'pt-4')}>
            {/* brand */}
            <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-start">
              <Link to="/" className="block" aria-label={`${settings.store.name} — الرئيسية`}>
                <img src={settings.logoLight} alt={settings.store.name} width="96" height="96" loading="lazy" className="size-[calc(88px*var(--logo-scale,1))] rounded-full object-cover ring-1 ring-white/30" />
              </Link>
              <p className="max-w-[30ch] text-[14.5px] leading-7 text-on-inverse/70">{settings.footer.about}</p>
              <Social className="foot-social" />
            </div>

            {/* links: two tidy columns on phones, four on desktop */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
              <nav aria-label="الأقسام">
                <h2 className={col}>الأقسام</h2>
                <ul>{categories.map((c) => <li key={c.id}><Link to={`/${c.id}`} className={item}>{c.name}</Link></li>)}</ul>
              </nav>
              <nav aria-label={settings.store.name}>
                <h2 className={col}>{settings.store.name}</h2>
                <ul>
                  {(settings.footer.links || FOOTER_LINKS).map((l) => (
                    <li key={l.label + l.to}>{/^https:/i.test(l.to) ? <a href={l.to} target="_blank" rel="noopener noreferrer" className={item}>{l.label}</a> : <Link to={l.to} className={item}>{l.label}</Link>}</li>
                  ))}
                </ul>
              </nav>
              <nav aria-label="حسابك">
                <h2 className={col}>حسابك</h2>
                <ul>
                  <li><Link to="/account" className={item}>تتبّع طلباتك</Link></li>
                  <li><Link to="/account/wishlist" className={item}>المفضلة</Link></li>
                  <li><Link to="/cart" className={item}>السلة</Link></li>
                </ul>
              </nav>
              <div>
                <h2 className={col}>تواصلي معنا</h2>
                <ul>
                  <li><a href={waLink('السلام عليكم')} target="_blank" rel="noreferrer" className={item}><MessageCircle className="size-4 opacity-60" /><span dir="ltr" className="tabular">{localPhone()}</span></a></li>
                  {EMAIL && <li><a href={`mailto:${EMAIL}`} className={item}><Mail className="size-4 opacity-60" /><span dir="ltr">{EMAIL}</span></a></li>}
                  <li><Link to="/contact" className={item}>صفحة التواصل</Link></li>
                </ul>
              </div>
            </div>
          </div>

          {/* bottom bar: payments + rights, on one clean line on desktop */}
          <div className="mt-12 flex flex-col items-center gap-5 border-t border-white/10 pt-7 lg:flex-row-reverse lg:justify-between">
            {settings.footer.payments && <PayIcons size="sm" className="w-full max-w-[320px]" />}
            <p className="text-center text-[13px] text-on-inverse/55 lg:text-start">
              جميع الحقوق محفوظة لـ<b className="font-semibold text-on-inverse/80">{settings.store.name}</b> <span dir="ltr" className="tabular" suppressHydrationWarning>© {new Date().getFullYear()}</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
