import { Link } from 'react-router-dom'
import { ArrowLeft, Quote } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { FAQ } from '@/data/content.js'
import { ALL_REVIEWS } from '@/data/reviews.js'
import { testimonials } from '@/lib/feedback.js'
import { money, effectivePrice, liveWa, waLink } from '@/lib/format.js'
import { cn } from '@/lib/utils'
import StarsSvg from '@/components/brand/Stars.jsx'
import { useInView } from '@/lib/useInView.js'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import LineArt from '@/components/home/LineArt.jsx'
import ServiceTicket from '@/components/home/ServiceTicket.jsx'
import PayIcons from '@/components/brand/PayIcons.jsx'

/** Fades/rises its children in once, when scrolled into view. */
function Reveal({ as: T = 'div', className, delay = 0, children, ...p }) {
  const [ref, on] = useInView()
  return <T ref={ref} className={cn('transition-[opacity,translate,scale] duration-[1000ms] ease-[cubic-bezier(.16,1,.3,1)]', on ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0', className)} style={{ transitionDelay: `${delay}ms` }} {...p}>{children}</T>
}

/** A thin rose-gold line with a small leaf in the middle, under section titles. */
const Flourish = ({ className }) => (
  <svg viewBox="0 0 160 16" fill="none" className={cn('h-4 w-40', className)} aria-hidden="true">
    <path d="M4 8 H66 M94 8 H156" stroke="var(--p-gold-500)" strokeWidth="1" strokeLinecap="round" />
    <path d="M80 14 C74 10 74 5 80 2 C86 5 86 10 80 14 Z" fill="var(--p-gold-500)" />
    <circle cx="70" cy="8" r="1.5" fill="var(--p-gold-500)" /><circle cx="90" cy="8" r="1.5" fill="var(--p-gold-500)" />
  </svg>
)

function Title({ eyebrow, title, className }) {
  if (!title && !eyebrow) return null
  return (
    <Reveal className={cn('container-w flex flex-col items-center text-center', className)}>
      {eyebrow && <p className="text-[13.5px] font-medium tracking-wide text-accent-text">{eyebrow}</p>}
      {title && <h2 className="mt-1 text-balance font-display text-[2rem] leading-[1.45] text-primary sm:text-[2.6rem]">{title}</h2>}
      <Flourish className="mt-2" />
    </Reveal>
  )
}

const ViewAll = ({ to, children = 'عرض الكل' }) => (
  <div className="mt-10 text-center">
    <Button asChild variant="outline" className="font-medium"><Link to={to}>{children}<ArrowLeft className="size-4" /></Link></Button>
  </div>
)

/** linkProps: an internal path opens in the store, an https address in a new tab. */
const linkTo = (link) => (!link ? {} : /^https:/i.test(link) ? { href: liveWa(link) } : { to: link })
const Go = ({ link, className, children }) => {
  const l = linkTo(link)
  return l.href ? <a href={l.href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a> : <Link to={l.to || '/shop'} className={className}>{children}</Link>
}

/* ---------------- Hero: the store's own scene melting into a blush page, the logo in the middle ---------------- */
const PETALS = Array.from({ length: 12 }, (_, i) => ({ l: (i * 83) % 100, d: 14 + (i % 5) * 3, w: i * 1.3, s: 8 + (i % 4) * 3, r: (i * 47) % 360 }))

function Hero({ b: h, first }) {
  const { settings } = useApp()
  const H = first ? 'h1' : 'h2'
  const img = h.image || '/brand/hero.webp'
  const imgM = h.imageMobile || h.image || '/brand/hero-mobile.webp'
  return (
    <section className={cn('relative isolate overflow-hidden', first && '-mt-[var(--header-height)]')}>
      <picture className="absolute inset-0 -z-20">
        <source media="(max-width: 767px)" srcSet={imgM} />
        <img src={img} alt="" width="1600" height="900" fetchpriority="high" className="size-full object-cover object-center motion-safe:animate-[kenburns_30s_ease-in-out_infinite_alternate]" />
      </picture>
      {/* a blush veil in the middle for the words, melting into the page at the bottom */}
      <span className="absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_50%_45%,color-mix(in_srgb,var(--background)_88%,transparent),color-mix(in_srgb,var(--background)_45%,transparent)_70%,transparent)]" aria-hidden="true" />
      <span className="absolute inset-x-0 top-0 -z-10 h-40 bg-[linear-gradient(var(--background),transparent)]" aria-hidden="true" />
      {PETALS.map((p, i) => (
        <span key={i} className="pointer-events-none absolute -top-8 -z-10 rounded-[60%_0_60%_0] bg-[linear-gradient(135deg,#f6d6d1,#e9b8b0)] opacity-0 motion-safe:animate-[petal_var(--d)_linear_infinite]" style={{ left: `${p.l}%`, width: p.s, height: p.s * 0.8, '--d': `${p.d}s`, '--r': `${p.r}deg`, animationDelay: `${p.w}s` }} aria-hidden="true" />
      ))}

      <div className={cn('container-w relative flex min-h-[620px] flex-col items-center justify-center pb-40 text-center sm:min-h-[700px] md:min-h-[min(94vh,820px)]', first ? 'pt-[calc(var(--header-height)+40px)]' : 'pt-20')}>
        <span className="relative grid size-28 place-items-center rounded-full bg-white/70 p-1.5 shadow-[0_20px_50px_-20px_color-mix(in_srgb,var(--p-green-900)_60%,transparent)] ring-1 ring-[var(--p-gold-500)]/60 backdrop-blur motion-safe:animate-[rise-in_900ms_var(--p-ease-emphasized)_both] sm:size-32">
          <img src={settings.logo} alt="" width="128" height="128" className="size-full rounded-full object-cover" />
          <span className="absolute -inset-2 rounded-full border border-[var(--p-gold-500)]/40" aria-hidden="true" />
        </span>
        <p className="mt-6 inline-flex items-center gap-3 text-[14px] font-medium text-accent-text motion-safe:animate-[rise-in-solid_700ms_var(--p-ease-emphasized)_both]">
          <span className="h-px w-10 bg-[linear-gradient(90deg,transparent,var(--p-gold-500))]" />{h.eyebrow}<span className="h-px w-10 bg-[linear-gradient(270deg,transparent,var(--p-gold-500))]" />
        </p>
        <H className="mt-3 font-display text-[3rem] leading-[1.3] text-primary sm:text-[4rem] lg:text-[4.8rem] motion-safe:animate-[rise-in-solid_850ms_var(--p-ease-emphasized)_both]">
          <span className="block">{h.title1}</span>
          {h.title2 && <span className="mt-1 block text-[0.5em] font-normal text-[var(--p-green-700)]">{h.title2}</span>}
        </H>
        {h.text && <p className="mx-auto mt-4 max-w-[34ch] text-[17px] leading-[1.9] text-foreground/80 motion-safe:animate-[rise-in-solid_1s_var(--p-ease-emphasized)_both]">{h.text}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3 motion-safe:animate-[rise-in-solid_1.15s_var(--p-ease-emphasized)_both]">
          <Button asChild size="lg" className="px-9 font-semibold shadow-[0_18px_36px_-16px_color-mix(in_srgb,var(--p-green-900)_80%,transparent)]"><Go link={h.ctaLink}>{h.cta}<ArrowLeft className="size-4" /></Go></Button>
          <Button asChild size="lg" variant="outline" className="bg-white/60 px-7 font-medium backdrop-blur"><a href={waLink('السلام عليكم، عندي استفسار عن منتجات عناية ميمي')} target="_blank" rel="noopener noreferrer">كلمينا على واتساب</a></Button>
        </div>
      </div>
      <span className="pointer-events-none absolute inset-x-0 -bottom-px h-56 bg-[linear-gradient(180deg,transparent,color-mix(in_srgb,var(--background)_75%,transparent)_50%,var(--background)_88%)]" aria-hidden="true" />
    </section>
  )
}

/* ---------------- Categories: tall arches, each with its own picture ---------------- */
const CAT_ART = { 'hair-care': '/brand/cat-hair-care.webp', 'skin-care': '/brand/cat-skin-care.webp' }

function CategoriesBlock({ b, afterHero }) {
  const { categories, products, settings } = useApp()
  if (!categories.length) return null
  return (
    <section className={cn('cv-auto relative z-10 pb-12 sm:pb-16', afterHero ? '-mt-24 sm:-mt-32' : 'pt-12 sm:pt-16')}>
      <Title eyebrow={b.eyebrow} title={b.title} className="mb-8 sm:mb-12" />
      <ul className={cn('container-w mx-auto grid max-w-[880px] gap-4 sm:gap-8', categories.length === 1 ? 'grid-cols-1 max-w-[420px]' : categories.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {categories.map((c, i) => {
          const n = products.filter((p) => p.categoryId === c.id).length
          const src = settings.categoryImages[c.id] || CAT_ART[c.id]
          return (
            <Reveal as="li" key={c.id} delay={i * 120}>
              <Link to={`/${c.id}`} className="group block text-center">
                <span className="relative block aspect-[3/4] overflow-hidden rounded-t-[999px] rounded-b-[28px] bg-[radial-gradient(80%_60%_at_50%_30%,#fffaf8,var(--p-gold-200))] shadow-[0_30px_60px_-34px_color-mix(in_srgb,var(--p-green-900)_70%,transparent)] ring-1 ring-[var(--p-gold-400)]">
                  {src && <img src={src} alt={c.name} loading="lazy" decoding="async" width="600" height="800" className="absolute inset-0 size-full object-cover transition-transform duration-[1.6s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]" />}
                  <span className="absolute inset-[7px] rounded-t-[999px] rounded-b-[22px] border border-white/70" aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(transparent,color-mix(in_srgb,var(--p-green-950)_55%,transparent))]" aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 grid justify-items-center gap-1 p-4 text-white sm:p-6">
                    <b className="font-display text-[19px] font-normal sm:text-[26px]">{c.name}</b>
                    <span className="tabular text-[12px] text-white/80 sm:text-[13px]">{n} {n === 1 ? 'منتج' : 'منتجات'}</span>
                  </span>
                </span>
              </Link>
            </Reveal>
          )
        })}
      </ul>
    </section>
  )
}

/* ---------------- Blended banner: the picture dissolves into a blush panel, words beside it ---------------- */
function ImageTextBlock({ b }) {
  const { byId } = useApp()
  const p = b.priceOf && byId[b.priceOf]
  return (
    <Reveal className="container-w mx-auto max-w-[1160px] py-6 sm:py-8">
      <Go link={b.link} className="group relative grid overflow-hidden rounded-[32px] bg-[linear-gradient(100deg,var(--p-gold-100),var(--background)_55%,var(--p-gold-100))] ring-1 ring-[var(--p-gold-400)]/60 sm:min-h-[380px] sm:grid-cols-[1.05fr_0.95fr]">
        {b.image && (
          <span className="relative block aspect-[4/3] sm:order-2 sm:aspect-auto">
            <img src={b.image} alt="" loading="lazy" decoding="async" width="1200" height="800"
              className="absolute inset-0 size-full object-cover transition-transform duration-[2s] ease-[cubic-bezier(.16,1,.3,1)] [mask-image:linear-gradient(to_bottom,black_55%,transparent)] group-hover:scale-[1.04] sm:[mask-image:linear-gradient(to_right,black_50%,transparent_98%)]" />
          </span>
        )}
        <div className="relative flex flex-col justify-center px-6 pb-8 sm:px-12 sm:py-12">
          {b.kicker && <span className="text-[13.5px] font-medium tracking-wide text-accent-text">{b.kicker}</span>}
          <h2 className="mt-1 font-display text-[2rem] leading-[1.4] text-primary sm:text-[2.7rem]"><span className="block">{b.title}</span>{b.accent && <span className="block text-[0.62em] text-[var(--p-green-700)]">{b.accent}</span>}</h2>
          {b.text && <p className="mt-3 max-w-md text-[15px] leading-[1.9] text-muted-foreground">{b.text}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {b.cta && <span className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[14px] font-semibold text-on-inverse shadow-[0_14px_30px_-14px_color-mix(in_srgb,var(--p-green-900)_80%,transparent)] transition-transform group-hover:-translate-x-1">{b.cta}<ArrowLeft className="size-4" /></span>}
            {p && <span className="tabular flex items-baseline gap-2">{effectivePrice(p) < p.price && <s className="text-base text-muted-foreground">{money(p.price)}</s>}<span className={cn('text-xl font-semibold', effectivePrice(p) < p.price ? 'text-danger' : 'text-primary')}>{money(effectivePrice(p))}</span></span>}
            {b.payIcons && <PayIcons className="w-full max-w-[460px]" />}
          </div>
        </div>
      </Go>
    </Reveal>
  )
}

function BannerBlock({ b }) {
  if (!b.image) return null
  const pic = (
    <picture>
      {b.imageMobile && <source media="(max-width: 767px)" srcSet={b.imageMobile} />}
      <img src={b.image} alt={b.alt || ''} loading="lazy" decoding="async" className={cn('block h-auto w-full', b.size === 'container' && 'rounded-[28px]')} />
    </picture>
  )
  const l = linkTo(b.link)
  const body = l.to ? <Link to={l.to} className="block">{pic}</Link> : l.href ? <a href={l.href} target="_blank" rel="noopener noreferrer" className="block">{pic}</a> : pic
  return <Reveal className={cn('py-4 sm:py-6', b.size === 'container' && 'container-w mx-auto max-w-[1160px]')}>{body}</Reveal>
}

function TextBlock({ b }) {
  const l = linkTo(b.link)
  return (
    <section className={cn('container-w mx-auto max-w-3xl py-12 sm:py-16', b.align === 'center' ? 'text-center' : 'text-start')}>
      <Reveal>
        {b.eyebrow && <p className="mb-1 text-[13.5px] font-medium text-accent-text">{b.eyebrow}</p>}
        {b.title && <h2 className="text-balance font-display text-[2rem] leading-[1.45] text-primary sm:text-[2.5rem]">{b.title}</h2>}
        {b.text && <p className="mt-4 whitespace-pre-line text-[16px] leading-[2] text-muted-foreground">{b.text}</p>}
        {b.cta && (l.to || l.href) && (
          <div className="mt-7">
            <Button asChild size="lg" className="px-7"><Go link={b.link}>{b.cta}<ArrowLeft className="size-4" /></Go></Button>
          </div>
        )}
      </Reveal>
    </section>
  )
}

/* ---------------- Promise strip (true facts only) ---------------- */
function Promises({ b }) {
  const items = b.items
  if (!items.length) return null
  return (
    <section className="container-w py-10 sm:py-14">
      <ul className={cn('mx-auto grid max-w-4xl gap-3 rounded-[28px] bg-white/60 p-4 ring-1 ring-[var(--p-gold-400)]/60 backdrop-blur sm:gap-6 sm:p-8', ['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-2 sm:grid-cols-4'][items.length - 1])}>
        {items.map((x, i) => (
          <Reveal as="li" key={x.title + i} delay={i * 100} className="flex flex-col items-center gap-2 text-center">
            <LineArt name={x.icon} tone="green" className="size-10 text-primary sm:size-12" delay={i * 0.15} />
            <b className="text-[13px] font-semibold text-primary sm:text-[15px]">{x.title}</b>
            <span className="text-[11.5px] leading-5 text-muted-foreground sm:text-sm">{x.text}</span>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

function ProductsBlock({ b }) {
  const { products, byId, catalogReady } = useApp()
  if (!catalogReady) return <div className="container-w grid grid-cols-2 gap-6 py-16 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-[26px] bg-sunken" />)}</div>
  const list = b.source === 'picked' ? b.ids.map((id) => byId[id]).filter(Boolean)
    : b.source === 'category' ? products.filter((p) => p.categoryId === b.category)
      : b.source === 'featured' ? products.filter((p) => p.featured)
        : [...products].sort((x, y) => String(y.createdAt || '').localeCompare(String(x.createdAt || '')))
  const items = list.slice(0, b.limit)
  if (!items.length) return null
  return (
    <section className="cv-auto py-10 sm:py-14">
      <Title eyebrow={b.eyebrow} title={b.title} className="mb-8 sm:mb-12" />
      <div className="container-w">
        <ul className={cn('mx-auto grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-8', items.length === 1 ? 'max-w-[300px] !grid-cols-1' : items.length === 2 ? 'max-w-[640px]' : items.length === 3 ? 'max-w-[960px] sm:grid-cols-3' : 'max-w-[1160px] sm:grid-cols-3 lg:grid-cols-4')}>
          {items.map((p, i) => <Reveal as="li" key={p.id} delay={(i % 4) * 90} className="min-w-0"><ServiceTicket p={p} /></Reveal>)}
        </ul>
        {b.viewAll && list.length > items.length && <ViewAll to={b.viewAllTo || (b.source === 'category' && b.category ? `/${b.category}` : '/shop')} />}
      </div>
    </section>
  )
}

/* ---------------- Reviews: only real ones, written by customers after delivery ---------------- */
function Reviews({ b }) {
  const { feedback } = useApp()
  const all = testimonials(ALL_REVIEWS, feedback.reviews)
  if (!all.length) return null
  return (
    <section className="cv-auto py-12 sm:py-16">
      <Title eyebrow={b.eyebrow} title={b.title} className="mb-8 sm:mb-12" />
      <ul className="container-w mx-auto grid max-w-[1100px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {all.slice(0, 6).map((r, i) => (
          <Reveal as="li" key={r.id || i} delay={(i % 3) * 90}>
            <figure className="flex h-full flex-col rounded-[24px] bg-white/80 p-5 ring-1 ring-[var(--p-gold-400)]/60">
              <div className="flex items-center justify-between"><StarsSvg size={14} value={r.stars ?? 5} className="text-[var(--p-gold-600)]" /><Quote className="size-5 text-primary/20" strokeWidth={1.4} /></div>
              <blockquote className="mt-3 line-clamp-5 flex-1 text-[14px] leading-7">{r.text}</blockquote>
              <figcaption className="mt-4 border-t border-border pt-3 text-xs font-semibold text-primary">{r.name}</figcaption>
            </figure>
          </Reveal>
        ))}
      </ul>
      {all.length > 6 && <ViewAll to="/reviews">كل الآراء ({all.length})</ViewAll>}
    </section>
  )
}

function FaqBlock({ b }) {
  const { settings } = useApp()
  const fee = settings.shipping.fee
  // the shipping answer follows the fee set in the dashboard
  const list = FAQ.map((q) => (q.q === 'كم رسوم الشحن؟' ? { ...q, a: fee > 0 ? `رسوم الشحن ${money(fee)} للطلب${settings.shipping.freeOver > 0 ? `، ومجاني للطلبات من ${money(settings.shipping.freeOver)}` : ''}، وتظهر لك في صفحة الدفع قبل ما تدفعين.` : 'الشحن مجاني.' } : q))
  return (
    <section className="cv-auto container-w mx-auto max-w-3xl py-14 sm:py-20">
      <Title eyebrow={b.eyebrow} title={b.title} className="mb-8 sm:mb-10" />
      <Accordion type="single" collapsible className="grid gap-3">
        {list.map((q, i) => (
          <AccordionItem key={q.q} value={String(i)}>
            <AccordionTrigger>{q.q}</AccordionTrigger>
            <AccordionContent>{q.a} {q.link && <Link className="font-semibold text-primary underline underline-offset-4" to={q.link}>السياسات والشروط</Link>}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}

const RENDER = {
  hero: Hero, banner: BannerBlock, promises: Promises, products: ProductsBlock, categories: CategoriesBlock,
  imageText: ImageTextBlock, text: TextBlock, reviews: Reviews, faq: FaqBlock,
}

// The home page is the owner's list of blocks (store designer); the original layout until they change it.
export default function Home() {
  const { settings } = useApp()
  const blocks = settings.home.filter((b) => b.on)
  const top = blocks[0]?.type === 'hero' ? blocks[0] : null
  const rest = top ? blocks.slice(1) : blocks
  return (
    <>
      {top ? <div data-block={top.id}><Hero b={top} first /></div> : <h1 className="sr-only">{settings.store.name}</h1>}
      <div className={cn('relative isolate', !top && 'pt-6')}>
        {settings.background.decor && (
          <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(45%_14%_at_100%_18%,color-mix(in_srgb,var(--p-gold-400)_30%,transparent),transparent),radial-gradient(40%_12%_at_0%_40%,color-mix(in_srgb,var(--p-gold-400)_26%,transparent),transparent),radial-gradient(50%_14%_at_100%_64%,color-mix(in_srgb,var(--p-gold-400)_24%,transparent),transparent),radial-gradient(45%_12%_at_0%_86%,color-mix(in_srgb,var(--p-gold-400)_22%,transparent),transparent)]" aria-hidden="true" />
        )}
        {rest.map((b, i) => {
          const C = RENDER[b.type]
          return C ? <div key={b.id} data-block={b.id}><C b={b} afterHero={i === 0 && !!top} /></div> : null
        })}
      </div>
    </>
  )
}
