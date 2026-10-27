import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import Social from '@/components/Social.jsx'
import PayIcons from '@/components/brand/PayIcons.jsx'
import { useApp } from '@/state.jsx'
import { DEFAULT_FOOTER_LINKS as FOOTER_LINKS } from '@/lib/theme.js'
import { EMAIL, waLink, localPhone } from '@/lib/format.js'

/** A soft rose-wine close with rounded shoulders: the logo and a line about the store, four short columns, payments. */
export default function SiteFooter() {
  const { categories, settings } = useApp()
  const col = 'mb-3 text-[13.5px] font-bold text-white'
  const item = 'flex min-h-8 items-center text-[13.5px] text-white/75 transition-colors hover:text-white'
  return (
    <footer className="mt-16 rounded-t-[40px] bg-primary text-white sm:rounded-t-[56px]">
      <div className="container-w pt-12 sm:pt-16">
        {settings.footer.cta && (
          <div className="mx-auto mb-12 max-w-xl text-center">
            <h2 className="font-display text-[1.7rem] font-semibold leading-[1.4]">{settings.footer.ctaTitle}</h2>
            {settings.footer.ctaText && <p className="mt-2 text-[14.5px] leading-7 text-white/75">{settings.footer.ctaText}</p>}
            <a href={waLink('السلام عليكم، أبي أستفسر عن منتجاتكم')} target="_blank" rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-white py-2 ps-2 pe-5 text-primary shadow-[0_16px_30px_-16px_rgb(0_0_0/0.5)] transition-transform hover:-translate-y-0.5">
              <span className="grid size-9 place-items-center rounded-full bg-primary text-white"><MessageCircle className="size-[18px]" /></span>
              <span className="text-start leading-tight"><span className="block text-[11px] text-primary/70">كلمينا على واتساب</span><b dir="ltr" className="tabular text-[15px]">{localPhone()}</b></span>
            </a>
          </div>
        )}

        <div className="grid gap-10 border-t border-white/10 pt-10 lg:grid-cols-[1fr_2fr]">
          <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-start">
            <Link to="/" className="flex items-center gap-3" aria-label={`${settings.store.name} — الرئيسية`}>
              <img src={settings.logoLight} alt="" width="56" height="56" className="size-14 rounded-full object-cover ring-2 ring-white/20" />
              <span className="font-display text-[1.6rem] font-semibold">{settings.store.name}</span>
            </Link>
            {settings.footer.about && <p className="max-w-[34ch] text-[13.5px] leading-7 text-white/70">{settings.footer.about}</p>}
            <Social className="foot-social" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            <nav aria-label="الأقسام">
              <h2 className={col}>الأقسام</h2>
              <ul>{categories.map((c) => <li key={c.id}><Link to={`/${c.id}`} className={item}>{c.name}</Link></li>)}</ul>
            </nav>
            <nav aria-label={settings.store.name}>
              <h2 className={col}>{settings.store.name}</h2>
              <ul>
                {(settings.footer.links || FOOTER_LINKS).filter((l) => !categories.some((c) => l.to === `/${c.id}`)).map((l) => (
                  <li key={l.label + l.to}>{/^https:/i.test(l.to) ? <a href={l.to} target="_blank" rel="noopener noreferrer" className={item}>{l.label}</a> : <Link to={l.to} className={item}>{l.label}</Link>}</li>
                ))}
              </ul>
            </nav>
            <nav aria-label="حسابك">
              <h2 className={col}>حسابك</h2>
              <ul>
                <li><Link to="/account" className={item}>طلباتي</Link></li>
                <li><Link to="/account/wishlist" className={item}>المفضلة</Link></li>
                <li><Link to="/cart" className={item}>السلة</Link></li>
              </ul>
            </nav>
            <div>
              <h2 className={col}>خدمة العملاء</h2>
              <ul>
                <li><a href={waLink('السلام عليكم')} target="_blank" rel="noreferrer" className={item}>واتساب<span dir="ltr" className="tabular ms-1.5">{localPhone()}</span></a></li>
                {EMAIL && <li><a href={`mailto:${EMAIL}`} className={item}><span dir="ltr">{EMAIL}</span></a></li>}
                <li><Link to="/contact" className={item}>صفحة التواصل</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 border-t border-white/10 py-6 lg:flex-row-reverse lg:justify-between">
          {settings.footer.payments && <PayIcons size="sm" className="w-full max-w-[260px]" />}
          <div className="text-center text-[12px] leading-6 text-white/55 lg:text-start">
            <p>جميع الحقوق محفوظة لـ{settings.store.name} <span dir="ltr" className="tabular" suppressHydrationWarning>© {new Date().getFullYear()}</span></p>
          </div>
        </div>
      </div>
    </footer>
  )
}
