import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronLeft, Leaf, ShoppingBag, ShoppingCart, CreditCard, Gift, Truck, ShieldCheck, MessageCircle } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { FAQ } from '@/data/content.js'
import { ALL_REVIEWS } from '@/data/reviews.js'
import { testimonials } from '@/lib/feedback.js'
import { money, effectivePrice, liveWa } from '@/lib/format.js'
import { trackAddToCart } from '@/lib/analytics.js'
import { productPath } from '@/lib/slug.js'
import { cn } from '@/lib/utils'
import Reveal from '@/components/Reveal.jsx'
import { Button } from '@/components/ui/button'
import { Ornament } from '@/components/ui/kit.jsx'
import ServiceTicket from '@/components/home/ServiceTicket.jsx'

/** A centred section title with the rose-gold ornament under it. */
function Title({ title, lead, className }) {
  return (
    <Reveal className={cn('mx-auto max-w-xl text-center', className)}>
      <h2 className="font-display text-[1.9rem] font-semibold leading-[1.4] text-primary sm:text-[2.25rem]">{title}</h2>
      <Ornament className="mx-auto mt-1.5" />
      {lead && <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{lead}</p>}
    </Reveal>
  )
}

/** linkProps: an internal path opens in the store, an https address in a new tab, #id scrolls. */
const Go = ({ link, className, children }) => {
  if (!link) return <Link to="/shop" className={className}>{children}</Link>
  if (link.startsWith('#')) return <a href={link} className={className}>{children}</a>
  if (/^https:/i.test(link)) return <a href={liveWa(link)} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  return <Link to={link} className={className}>{children}</Link>
}

/* ---------------- Hero: wide banners that take turns, each with its own words and button ---------------- */
// the first banner is the owner's (store designer → الواجهة الرئيسية); the other two show the two sections
const MORE_SLIDES = [
  { eyebrow: 'العناية بالشعر', title1: 'زيت الشعر', title2: 'روتين أسبوعي يدلّع شعرك', text: 'ثلاث مرات بالأسبوع على فروة الشعر وأطرافه.', cta: 'اطلبيه الآن', ctaLink: '/hair-oil', image: '/brand/banner-oil-v3.webp', price: 'hair-oil' },
  { eyebrow: 'العناية بالبشرة', title1: 'الصابونيات التقليدية', title2: 'كركم · عكر فارسي · نيلة مغربية', text: 'ثلاث خلطات تختارين منها اللي يناسب بشرتك.', cta: 'تسوّقي الصابونيات', ctaLink: '/skin-care', image: '/brand/banner-soap-v3.webp' },
]
function Hero({ b: h, first }) {
  const { settings, byId } = useApp()
  const slides = [{ ...h, image: h.image || '/brand/banner-all-v3.webp' }, ...MORE_SLIDES]
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => setI((x) => (x + 1) % slides.length), 6500)
    return () => clearTimeout(t)
  }, [i, paused, slides.length])
  return (
    <section className="container-w pt-5 sm:pt-7" aria-roledescription="carousel" aria-label="عروض عناية ميمي"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="relative overflow-hidden rounded-[22px] bg-[var(--p-cream-100)] shadow-[0_24px_50px_-34px_rgb(125_63_76/0.55)] ring-1 ring-white">
        {slides.map((x, n) => {
          const H = first && n === 0 ? 'h1' : 'h2'
          const p = x.price && byId[x.price]
          return (
            <div key={n} aria-roledescription="slide" aria-label={`${n + 1} من ${slides.length}`} aria-hidden={n !== i} inert={n !== i ? '' : undefined}
              className={cn('transition-opacity duration-700 ease-out', n === i ? 'relative opacity-100' : 'absolute inset-0 opacity-0')}>
              <picture>
                {x.imageMobile && <source media="(max-width: 767px)" srcSet={x.imageMobile} />}
                <img src={x.image} alt="" width="1600" height="900" fetchpriority={n === 0 ? 'high' : undefined} loading={n === 0 ? 'eager' : 'lazy'}
                  className="aspect-[16/10] w-full object-cover object-left md:aspect-[16/7.6] lg:aspect-[16/7]" />
              </picture>
              {/* the words sit on the calm right side of the picture, over a soft wash (under it on phones) */}
              <div className="relative bg-[var(--p-cream-50)] px-6 pt-6 pb-12 text-center md:absolute md:inset-y-0 md:start-0 md:flex md:w-[52%] md:flex-col md:justify-center md:bg-[linear-gradient(to_left,rgb(253_247_244/0.96)_45%,rgb(253_247_244/0.75)_75%,transparent)] md:px-14 md:pb-6 md:text-start lg:px-20">
                <p className="text-[13px] font-semibold text-[var(--p-gold-700)]">{x.eyebrow}</p>
                <H className="mt-2 font-display text-[2rem] font-semibold leading-[1.35] text-primary sm:text-[2.5rem] lg:text-[2.9rem]">{x.title1 || settings.store.name}</H>
                {x.title2 && <p className="mt-1 font-display text-[1.15rem] text-primary/80 sm:text-[1.3rem]">{x.title2}</p>}
                {x.text && <p className="mx-auto mt-3 max-w-[40ch] text-[15px] leading-7 text-foreground/75 md:mx-0">{x.text}</p>}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4 md:justify-start">
                  {x.cta && <Button asChild size="lg"><Go link={x.ctaLink}>{x.cta}<ArrowLeft /></Go></Button>}
                  {p && <span className="tabular text-[15px] font-bold text-primary">{money(effectivePrice(p))}</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 md:bottom-6 md:right-14 md:left-auto md:translate-x-0 lg:right-20">
          {slides.map((_, n) => (
            <button key={n} type="button" onClick={() => setI(n)} aria-label={`البانر ${n + 1}`} aria-current={n === i}
              className={cn('h-2 rounded-full transition-all duration-300', n === i ? 'w-7 bg-primary' : 'w-2 bg-primary/25 hover:bg-primary/45')} />
          ))}
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-2 rounded-[18px] bg-white/80 px-3 py-3.5 text-center text-[12.5px] text-foreground/80 ring-1 ring-white sm:text-[13.5px]">
        <li className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2"><Truck className="size-[18px] text-[var(--p-gold-600)]" />شحن لباب بيتك</li>
        <li className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2"><ShieldCheck className="size-[18px] text-[var(--p-gold-600)]" />دفع آمن</li>
        <li className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2"><MessageCircle className="size-[18px] text-[var(--p-gold-600)]" />خدمة عملاء واتساب</li>
      </ul>
    </section>
  )
}

/* ---------------- A section of the store: its banner, joined to its own products in one frame ---------------- */
const SHELF_ART = { 'hair-care': '/brand/banner-oil-v3.webp', 'skin-care': '/brand/banner-soap-v3.webp' }
function ShelfBlock({ b }) {
  const { products, categories, catalogReady } = useApp()
  const cat = categories.find((c) => c.id === b.category)
  const list = products.filter((p) => p.categoryId === b.category).slice(0, b.limit)
  if (!catalogReady || !cat || !list.length) return null
  const to = `/${cat.id}`
  return (
    <section id={b.id} className="scroll-mt-[var(--header-height)] py-5 sm:py-7" aria-labelledby={`h-${b.id}`}>
      <div className="container-w">
        <Reveal className="overflow-hidden rounded-[24px] bg-white/75 p-2.5 shadow-[0_24px_50px_-38px_rgb(125_63_76/0.55)] ring-1 ring-white sm:p-3.5">
          <Link to={to} className="group relative block overflow-hidden rounded-[18px] bg-[var(--p-cream-100)]">
            <img src={b.image || SHELF_ART[cat.id] || '/brand/banner-all-v3.webp'} alt="" width="1600" height="900" loading="lazy"
              className="aspect-[16/8] w-full object-cover object-left transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03] md:aspect-[16/6]" />
            <span className="relative block bg-[var(--p-cream-50)] px-5 py-5 text-center md:absolute md:inset-y-0 md:start-0 md:flex md:w-1/2 md:flex-col md:justify-center md:bg-[linear-gradient(to_left,rgb(253_247_244/0.96)_50%,transparent)] md:px-12 md:text-start">
              <span id={`h-${b.id}`} className="block font-display text-[1.75rem] font-semibold leading-[1.4] text-primary sm:text-[2.1rem]">{b.title || cat.name}</span>
              {b.text && <span className="mx-auto mt-1.5 block max-w-[38ch] text-[14.5px] leading-7 text-foreground/75 md:mx-0">{b.text}</span>}
              <span className="mx-auto mt-4 inline-flex h-10 items-center gap-2 self-start rounded-full bg-primary px-5 text-[14px] font-bold text-white shadow-[0_10px_20px_-12px_rgb(125_63_76/0.9)] md:mx-0">{b.cta || 'تسوّقي الآن'}<ArrowLeft className="size-4" /></span>
            </span>
          </Link>
          <div className="flex items-center justify-between gap-3 px-2 pt-6 pb-3">
            <h2 className="flex items-center gap-2 font-display text-[1.25rem] font-semibold text-primary sm:text-[1.4rem]"><Leaf className="size-5 text-[var(--p-gold-600)]" />منتجات {cat.name}</h2>
            <Link to={to} className="inline-flex items-center gap-1 text-[13.5px] font-bold text-primary/80 hover:text-primary">عرض الكل<ChevronLeft className="size-4" /></Link>
          </div>
          <ul className={cn('grid gap-3 px-1 pb-1 sm:gap-4', list.length === 1 ? 'grid-cols-1' : list.length === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4')}>
            {list.map((p, n) => <Reveal as="li" key={p.id} delay={(n % 4) * 70} className="min-w-0">{list.length === 1 ? <FeaturedProduct p={p} /> : <ServiceTicket p={p} />}</Reveal>)}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

/** A section with one product shows it wide: the picture, a line about it, the price and the add button. */
function FeaturedProduct({ p }) {
  const { addToCart } = useApp()
  return (
    <article className="grid items-center gap-5 rounded-[18px] bg-white p-3 ring-1 ring-[var(--p-cream-200)] sm:grid-cols-[minmax(0,280px)_1fr] sm:gap-8 sm:p-4">
      <Link to={productPath(p.id)} className="block overflow-hidden rounded-[14px] bg-[var(--p-cream-100)]">
        <img src={p.image} alt={p.name} width="600" height="750" loading="lazy" className="aspect-square w-full object-cover" />
      </Link>
      <div className="px-2 pb-3 text-center sm:px-0 sm:pb-0 sm:text-start">
        <h3 className="font-display text-[1.5rem] font-semibold text-primary"><Link to={productPath(p.id)}>{p.name}</Link></h3>
        {p.summary && <p className="mt-2 max-w-[52ch] text-[14.5px] leading-7 text-foreground/75">{p.summary}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
          <span className="tabular text-[1.35rem] font-bold text-primary">{money(effectivePrice(p))}</span>
          <Button onClick={() => { addToCart(p.id); trackAddToCart(p, 1, effectivePrice(p)) }}><ShoppingCart />أضيفي للسلة</Button>
          <Link to={productPath(p.id)} className="text-[13.5px] font-bold text-primary/80 underline-offset-4 hover:underline">التفاصيل</Link>
        </div>
      </div>
    </article>
  )
}

/* ---------------- Products: soft cards side by side, with the sections as tabs ---------------- */
function ProductsBlock({ b }) {
  const { products, categories, byId, catalogReady } = useApp()
  const [tab, setTab] = useState('')
  if (!catalogReady) return <div className="container-w grid grid-cols-2 gap-5 py-16 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-[20px] bg-white/70" />)}</div>
  const base = b.source === 'picked' ? b.ids.map((id) => byId[id]).filter(Boolean)
    : b.source === 'category' ? products.filter((p) => p.categoryId === b.category)
      : b.source === 'featured' ? products.filter((p) => p.featured) : [...products]
  const list = base.filter((p) => !tab || p.categoryId === tab).slice(0, b.limit)
  const tabs = b.source === 'category' ? [] : categories.filter((c) => base.some((p) => p.categoryId === c.id))
  const pill = (on) => cn('h-9 rounded-full px-4 text-[13px] font-bold transition-colors', on ? 'bg-primary text-white shadow-[0_8px_16px_-10px_rgb(125_63_76/0.9)]' : 'bg-white/80 text-primary ring-1 ring-[var(--p-cream-200)] hover:bg-white')
  if (!base.length) return null
  return (
    <section id={b.id === 'products' ? 'products' : undefined} className="scroll-mt-[var(--header-height)] py-14 sm:py-20">
      <div className="container-w">
        <Title title={b.title} lead="صابونيات تقليدية وزيت للشعر، تختارينها وتوصلك لباب بيتك." />
        {tabs.length > 1 && (
          <Reveal className="mt-7 flex flex-wrap justify-center gap-2" role="tablist" aria-label="الأقسام">
            <button type="button" role="tab" aria-selected={!tab} onClick={() => setTab('')} className={pill(!tab)}>الكل</button>
            {tabs.map((c) => <button key={c.id} type="button" role="tab" aria-selected={tab === c.id} onClick={() => setTab(c.id)} className={pill(tab === c.id)}>{c.name}</button>)}
          </Reveal>
        )}
        <ul className="mx-auto mt-9 grid max-w-[1080px] grid-cols-2 gap-x-3.5 gap-y-7 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p, i) => <Reveal as="li" key={p.id} delay={(i % 4) * 80} className="min-w-0"><ServiceTicket p={p} /></Reveal>)}
        </ul>
        {b.viewAll && <div className="mt-10 text-center"><Button asChild variant="outline"><Link to={b.source === 'category' && b.category ? `/${b.category}` : '/shop'}>كل المنتجات<ArrowLeft /></Link></Button></div>}
      </div>
    </section>
  )
}

/* ---------------- The journey: four steps linked like a chain ---------------- */
function JourneyBlock({ b }) {
  const { settings } = useApp()
  const fee = settings.shipping.fee
  const STEPS = [
    { icon: ShoppingBag, t: 'اختاري منتجاتك', d: 'أضيفي اللي يعجبك للسلة' },
    { icon: CreditCard, t: 'ادفعي بأمان', d: 'مدى، فيزا، ماستركارد وApple Pay' },
    { icon: Gift, t: 'نجهّز طلبك', d: 'نغلّفه بعناية ويوصلك إيميل بالتحديث' },
    { icon: Truck, t: 'يوصلك لباب بيتك', d: fee > 0 ? `شحن ${money(fee)} لعنوانك الوطني` : 'شحن مجاني لعنوانك' },
  ]
  return (
    <section className="py-14 sm:py-20" aria-labelledby={`h-${b.id}`}>
      <div className="container-w">
        <Title title={<span id={`h-${b.id}`}>{b.title}</span>} lead={b.text} />
        <ol className="relative mx-auto mt-12 grid max-w-[1000px] gap-8 md:grid-cols-4 md:gap-4">
          {/* the chain: a rose-gold line through the four stones (across on desktop, down on phones) */}
          <span className="absolute inset-x-[12.5%] top-[38px] hidden h-[2px] bg-[repeating-linear-gradient(90deg,var(--p-gold-500)_0_10px,transparent_10px_18px)] md:block" aria-hidden="true" />
          <span className="absolute inset-y-[38px] start-[38px] w-[2px] bg-[repeating-linear-gradient(180deg,var(--p-gold-500)_0_10px,transparent_10px_18px)] md:hidden" aria-hidden="true" />
          {STEPS.map(({ icon: I, t, d }, i) => (
            <Reveal as="li" key={t} delay={i * 120} className="relative flex items-center gap-4 md:flex-col md:text-center">
              <span className="relative grid size-[76px] shrink-0 place-items-center rounded-full bg-white shadow-[0_16px_30px_-18px_rgb(125_63_76/0.6)] ring-[6px] ring-[var(--p-cream-100)]">
                <I className="size-7 text-primary" strokeWidth={1.6} />
                <span className="tabular absolute -top-1 -end-1 grid size-6 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">{i + 1}</span>
              </span>
              <span className="md:mt-3">
                <b className="block text-[15px] text-primary">{t}</b>
                <span className="mt-0.5 block text-[13px] leading-6 text-muted-foreground">{d}</span>
              </span>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ---------------- Reviews: only real ones, written after delivery ---------------- */
function Reviews({ b }) {
  const { feedback } = useApp()
  const all = testimonials(ALL_REVIEWS, feedback.reviews)
  if (!all.length) return null
  return (
    <section className="py-14 sm:py-20">
      <div className="container-w">
        <Title title={b.title} />
        <ul className="mx-auto mt-10 grid max-w-[1000px] gap-5 md:grid-cols-3">
          {all.slice(0, 6).map((r, i) => (
            <Reveal as="li" key={r.id || i} delay={(i % 3) * 90} className="rounded-[22px] bg-white/85 p-6 shadow-[0_18px_40px_-30px_rgb(125_63_76/0.5)] ring-1 ring-white">
              <blockquote className="text-[14.5px] leading-7">{r.text}</blockquote>
              <p className="mt-3 text-[13px] font-bold text-primary">{r.name}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------------- Questions ---------------- */
function FaqBlock({ b }) {
  const { settings } = useApp()
  const fee = settings.shipping.fee
  const list = FAQ.map((q) => (q.q === 'كم رسوم الشحن؟' ? { ...q, a: fee > 0 ? `رسوم الشحن ${money(fee)} للطلب${settings.shipping.freeOver > 0 ? `، ومجاني للطلبات من ${money(settings.shipping.freeOver)}` : ''}، وتظهر لك في صفحة الدفع قبل ما تدفعين.` : 'الشحن مجاني.' } : q))
  return (
    <section className="py-14 sm:py-20">
      <div className="container-w">
        <Title title={b.title} />
        <div className="mx-auto mt-9 grid max-w-2xl gap-3">
          {list.map((q, i) => (
            <Reveal as="details" delay={i * 60} key={q.q} className="group rounded-[18px] bg-white/85 px-5 shadow-[0_12px_30px_-26px_rgb(125_63_76/0.6)] ring-1 ring-white open:bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-bold text-primary [&::-webkit-details-marker]:hidden">
                {q.q}<ChevronDown className="size-4 shrink-0 text-[var(--p-gold-600)] transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="pb-5 text-[14.5px] leading-7 text-muted-foreground">{q.a} {q.link && <Link className="font-bold text-primary underline underline-offset-4" to={q.link}>السياسات والشروط</Link>}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Blocks the owner can add from the designer ---------------- */
function ImageTextBlock({ b }) {
  return (
    <section className="py-12 sm:py-16">
      <Reveal className="container-w mx-auto grid max-w-[1080px] items-center gap-8 overflow-hidden rounded-[30px] bg-white/80 p-4 shadow-[0_20px_50px_-34px_rgb(125_63_76/0.5)] ring-1 ring-white md:grid-cols-2 md:p-6">
        {b.image && <img src={b.image} alt="" width="1200" height="800" loading="lazy" className="aspect-[4/3] w-full rounded-[22px] object-cover" />}
        <div className="p-2 md:p-6">
          <h2 className="font-display text-[1.9rem] font-semibold leading-[1.4] text-primary">{b.title}</h2>
          {b.accent && <p className="mt-1 text-[16px] text-[var(--p-gold-700)]">{b.accent}</p>}
          {b.text && <p className="mt-3 text-[15px] leading-8 text-muted-foreground">{b.text}</p>}
          {b.cta && <Button asChild className="mt-6"><Go link={b.link}>{b.cta}<ArrowLeft /></Go></Button>}
        </div>
      </Reveal>
    </section>
  )
}
function BannerBlock({ b }) {
  if (!b.image) return null
  const pic = <picture>{b.imageMobile && <source media="(max-width: 767px)" srcSet={b.imageMobile} />}<img src={b.image} alt={b.alt || ''} loading="lazy" className={cn('block h-auto w-full', b.size === 'container' && 'rounded-[26px]')} /></picture>
  return <section className={cn('py-8', b.size === 'container' && 'container-w')}>{b.link ? <Go link={b.link} className="block">{pic}</Go> : pic}</section>
}
function TextBlock({ b }) {
  return (
    <section className="py-12 sm:py-16">
      <Reveal className={cn('container-w max-w-3xl', b.align === 'center' && 'text-center')}>
        {b.title && <h2 className="font-display text-[1.9rem] font-semibold leading-[1.4] text-primary">{b.title}</h2>}
        {b.text && <p className="mt-4 whitespace-pre-line text-[15.5px] leading-8 text-muted-foreground">{b.text}</p>}
        {b.cta && b.link && <Button asChild className="mt-6"><Go link={b.link}>{b.cta}<ArrowLeft /></Go></Button>}
      </Reveal>
    </section>
  )
}
const countLabel = (n) => (n === 1 ? 'منتج واحد' : n === 2 ? 'منتجان' : `${n} منتجات`)
/** The sections as round pictures under the banners: a tap takes her to the section (or its frame on this page). */
function CategoriesBlock({ b }) {
  const { categories, products } = useApp()
  if (!categories.length) return null
  const ART = { 'hair-care': '/brand/cat-hair-care-v2.webp', 'skin-care': '/brand/cat-skin-care-v2.webp' }
  const items = [...categories.map((c) => ({ to: `/${c.id}`, name: c.name, img: ART[c.id] || c.image, n: products.filter((p) => p.categoryId === c.id).length })),
    { to: '/shop', name: 'كل المنتجات', img: '/brand/banner-all-v3.webp', n: products.length }]
  return (
    <section className="py-8 sm:py-10" aria-label={b.title}>
      <ul className="container-w mx-auto flex max-w-[760px] justify-center gap-5 sm:gap-12">
        {items.map((x) => (
          <li key={x.to} className="w-[30%] max-w-[150px]"><Link to={x.to} className="group block text-center">
            <span className="mx-auto block aspect-square w-full max-w-[120px] overflow-hidden rounded-full bg-white p-1.5 shadow-[0_14px_28px_-18px_rgb(125_63_76/0.7)] ring-1 ring-[var(--p-gold-200)] transition-transform duration-500 group-hover:-translate-y-1">
              <img src={x.img} alt="" width="240" height="240" loading="lazy" className="size-full rounded-full object-cover" />
            </span>
            <b className="mt-3 block text-[14px] text-primary sm:text-[15px]">{x.name}</b>
            <span className="tabular text-[12px] text-muted-foreground">{countLabel(x.n)}</span>
          </Link></li>
        ))}
      </ul>
    </section>
  )
}
function Promises({ b }) {
  if (!b.items.length) return null
  return (
    <section className="py-10">
      <ul className="container-w mx-auto grid max-w-4xl gap-4 rounded-[26px] bg-white/80 p-6 text-center shadow-[0_18px_40px_-30px_rgb(125_63_76/0.5)] sm:grid-cols-3">
        {b.items.map((x) => <li key={x.title}><p className="text-[15px] font-bold text-primary">{x.title}</p><p className="mt-0.5 text-[13px] text-muted-foreground">{x.text}</p></li>)}
      </ul>
    </section>
  )
}

const RENDER = {
  hero: Hero, products: ProductsBlock, shelf: ShelfBlock, journey: JourneyBlock, reviews: Reviews, faq: FaqBlock,
  imageText: ImageTextBlock, banner: BannerBlock, text: TextBlock, categories: CategoriesBlock, promises: Promises,
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
      {rest.map((b) => {
        const C = RENDER[b.type]
        return C ? <div key={b.id} data-block={b.id}><C b={b} /></div> : null
      })}
    </>
  )
}
