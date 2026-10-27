import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import Social from '@/components/Social.jsx'
import PayIcons from '@/components/brand/PayIcons.jsx'
import { useApp } from '@/state.jsx'
import { DEFAULT_FOOTER_LINKS as FOOTER_LINKS } from '@/lib/theme.js'
import { EMAIL, waLink, localPhone } from '@/lib/format.js'

const LEAVES = [[104, 214, -50], [112, 176, 40], [100, 140, -58], [108, 104, 34], [96, 74, -64], [101, 44, 30]]
/** A sprig drawn in fine rose-gold lines: a stem, its leaves and a small flower, like the herbs in the store's blends. */
function Sprig({ className }) {
  return (
    <svg viewBox="0 0 220 270" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M110 268C98 205 122 150 100 84C94 62 96 36 108 18" />
      {LEAVES.map(([x, y, r]) => (
        <g key={y} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path d="M0 0C12-16 38-16 52 0C38 16 12 16 0 0Z" />
          <path d="M4 0H44" strokeWidth=".8" />
        </g>
      ))}
      <g transform="translate(108 16)">
        {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-11" rx="6" ry="11" transform={`rotate(${r})`} />)}
        <circle r="3.5" fill="currentColor" />
      </g>
    </svg>
  )
}

/** The close of every page: silk waves rise from the blush ground into rose wine, with sprigs drawn in rose-gold at its sides. */
export default function SiteFooter() {
  const { categories, settings } = useApp()
  const col = 'mb-3 text-[13.5px] font-bold text-white'
  const item = 'flex min-h-8 items-center text-[13.5px] text-white/75 transition-colors hover:text-white'
  return (
    <footer className="relative mt-24 text-white">
      {/* two waves, like folds of silk: a light blush one behind the wine one */}
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute bottom-[calc(100%-1px)] h-[70px] w-full sm:h-[110px]" aria-hidden="true">
        <path d="M0 64C220 8 420 8 640 46S1100 112 1440 30V120H0Z" fill="var(--p-gold-400)" opacity=".55" />
        <path d="M0 96C260 40 470 40 720 74S1180 120 1440 64V120H0Z" fill="var(--primary)" />
      </svg>
      <div className="relative overflow-hidden bg-primary">
      <Sprig className="pointer-events-none absolute -bottom-6 -start-6 hidden w-[220px] text-[var(--p-gold-400)] opacity-20 sm:block" />
      <Sprig className="pointer-events-none absolute -bottom-6 -end-6 w-[150px] -scale-x-100 text-[var(--p-gold-400)] opacity-20 sm:w-[220px]" />
      <div className="container-w relative pt-8 sm:pt-10">
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
      </div>
    </footer>
  )
}
