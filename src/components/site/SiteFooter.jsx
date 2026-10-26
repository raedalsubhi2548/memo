import { Link } from 'react-router-dom'
import Social from '@/components/Social.jsx'
import Reveal from '@/components/Reveal.jsx'
import PayIcons from '@/components/brand/PayIcons.jsx'
import { useApp } from '@/state.jsx'
import { DEFAULT_FOOTER_LINKS as FOOTER_LINKS } from '@/lib/theme.js'
import { PICTURE_CREDITS } from '@/data/world.js'
import { EMAIL, waLink, localPhone } from '@/lib/format.js'

/** The close: the page inverts to a wine field, four short columns on top, the name across the full width below. */
export default function SiteFooter() {
  const { categories, settings } = useApp()
  const col = 'mb-4 text-[16px] font-extrabold text-on-inverse'
  const item = 'flex min-h-10 items-center text-[16px] text-on-inverse/80 transition-colors hover:text-on-inverse'
  return (
    <footer className="mt-20 bg-primary text-on-inverse">
      <div className="container-w grid min-h-[86svh] grid-rows-[auto_1fr_auto] pt-16 md:pt-20">
        <Reveal className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
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
              <li><a href={waLink('السلام عليكم')} target="_blank" rel="noreferrer" className={item}>واتساب <span dir="ltr" className="tabular ms-2">{localPhone()}</span></a></li>
              {EMAIL && <li><a href={`mailto:${EMAIL}`} className={item}><span dir="ltr">{EMAIL}</span></a></li>}
              <li><Link to="/contact" className={item}>صفحة التواصل</Link></li>
            </ul>
            <Social className="foot-social mt-4" />
          </div>
        </Reveal>

        <div className="flex flex-col justify-end gap-6 py-12">
          {settings.footer.about && <p className="max-w-[46ch] text-[18px] leading-[1.7] text-on-inverse">{settings.footer.about}</p>}
          {settings.footer.payments && <PayIcons size="sm" className="w-full max-w-[300px]" />}
        </div>

        <div className="pb-6">
          <Reveal as="p" delay={120} className="whitespace-nowrap font-display text-[clamp(56px,16.4vw,300px)] font-extrabold leading-[1.05] text-on-inverse" aria-hidden="true">{settings.store.name}</Reveal>
          <div className="mt-4 flex flex-col gap-2 text-[15px] leading-[1.7] text-on-inverse/75 md:flex-row md:justify-between md:gap-6">
            <p>جميع الحقوق محفوظة لـ{settings.store.name} <span dir="ltr" className="tabular" suppressHydrationWarning>© {new Date().getFullYear()}</span></p>
            <p className="max-w-[90ch]">صور المكونات: {PICTURE_CREDITS.join(" · ")}</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
