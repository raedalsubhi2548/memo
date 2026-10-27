import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronLeft, ShoppingBag, CreditCard, Gift, Truck, ShieldCheck, MessageCircle } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { FAQ } from '@/data/content.js'
import { ALL_REVIEWS } from '@/data/reviews.js'
import { testimonials } from '@/lib/feedback.js'
import { money, effectivePrice, liveWa } from '@/lib/format.js'
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

/* ---------------- Hero: marketing banners that take turns — words first, a soft picture behind them ---------------- */
// the first banner is the owner's (store designer → الواجهة الرئيسية); the other two speak for the two sections
const MORE_SLIDES = [
  { title1: 'شعرك يستاهل دلع أكثر', title2: 'زيت الشعر من عناية ميمي', text: 'زيت تستخدمينه ثلاث مرات بالأسبوع على فروة الشعر وأطرافه، لروتين عناية يدلّع شعرك.', cta: 'اطلبي زيت الشعر', ctaLink: '/hair-oil', image: '/brand/hero-hair-v4.webp', show: ['hair-oil'] },
  { title1: 'خلطات جداتنا بلمسة اليوم', title2: 'صابونيات تقليدية لبشرتك', text: 'الكركم والعكر الفارسي والنيلة المغربية، في صابونيات ناعمة تخلي وقت الاستحمام لحظة عناية.', cta: 'تسوّقي الصابونيات', ctaLink: '/skin-care', image: '/brand/hero-herbs-v4.webp', show: ['persian-akar-soap', 'turmeric-soap', 'moroccan-nila-soap'] },
]
const FIRST_SHOW = ['turmeric-soap', 'hair-oil', 'moroccan-nila-soap']
const TILT = { 1: [-3], 3: [7, 0, -7] }
/** The banner's products as photo cards, fanned like a hand of cards; the middle one stands in front. */
function HeroProducts({ ids }) {
  const { byId } = useApp()
  const list = ids.map((id) => byId[id]).filter(Boolean)
  if (!list.length) return null
  const tilt = TILT[list.length] || list.map(() => 0)
  const mid = (list.length - 1) / 2
  return (
    <div className="pointer-events-none relative mt-8 flex h-[210px] shrink-0 items-center justify-center md:absolute md:inset-y-0 md:end-0 md:mt-0 md:h-auto md:w-[44%]" aria-hidden="true">
      {list.map((p, k) => (
        <span key={p.id} className={cn('hero-card relative block overflow-hidden rounded-[20px] bg-white p-1.5 shadow-[0_26px_44px_-24px_rgb(90_40_50/0.6)]',
          list.length === 1 ? 'w-[40%] max-w-[170px] md:w-[52%] md:max-w-[250px]' : 'w-[30%] max-w-[150px] md:w-[31%] md:max-w-[190px]', k !== mid && list.length > 1 && '-mx-[3%] scale-[0.9]', k === mid && 'z-10')}
          style={{ '--r': `${tilt[k] || 0}deg`, '--k': k, rotate: `${tilt[k] || 0}deg` }}>
          <img src={p.image} alt="" width="900" height="1125" loading="eager" className="aspect-[4/5] w-full rounded-[15px] object-cover" />
        </span>
      ))}
    </div>
  )
}
const SLIDE_MS = 7000
function Hero({ b: h, first }) {
  const { settings } = useApp()
  const slides = [{ ...h, image: h.image || '/brand/hero-silk-v4.webp', show: FIRST_SHOW }, ...MORE_SLIDES]
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setTimeout(() => setI((x) => (x + 1) % slides.length), SLIDE_MS)
    return () => clearTimeout(t)
  }, [i, paused, slides.length])
  return (
    <section className="relative" aria-roledescription="carousel" aria-label="عناية ميمي"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="relative isolate grid overflow-hidden">
        {slides.map((x, n) => {
          const H = first && n === 0 ? 'h1' : 'h2'
          const on = n === i
          return (
            <div key={n} data-on={on} aria-roledescription="slide" aria-label={`${n + 1} من ${slides.length}`} aria-hidden={!on} inert={on ? undefined : ''}
              className="hero-slide relative col-start-1 row-start-1 min-h-[600px] transition-opacity duration-700 ease-out data-[on=false]:opacity-0 md:min-h-[540px] lg:min-h-[600px]">
              {/* the picture and its wash fade out at the edges, so the banner is part of the page's ground */}
              <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,#000_10%,#000_68%,transparent)]" aria-hidden="true">
                <picture>
                  {x.imageMobile && <source media="(max-width: 767px)" srcSet={x.imageMobile} />}
                  <img src={x.image} alt="" width="1600" height="900" fetchpriority={n === 0 ? 'high' : undefined} loading={n === 0 ? 'eager' : 'lazy'}
                    className="hero-pic absolute inset-0 size-full object-cover object-[30%_50%]" />
                </picture>
                <span className="absolute inset-0 bg-[linear-gradient(to_top,var(--p-cream-50)_45%,rgb(251_246_244/0.8)_70%,transparent)] md:bg-[linear-gradient(to_left,var(--p-cream-50)_28%,rgb(251_246_244/0.8)_50%,transparent_75%)]" />
              </div>
              <div className="container-w relative flex min-h-[inherit] flex-col md:block">
                <HeroProducts ids={x.show || []} />
                <div className="relative flex flex-1 flex-col justify-center pt-6 pb-24 text-center md:min-h-[inherit] md:w-[56%] md:pt-10 md:pb-24 md:text-start">
                  <H className="hero-line font-display text-[2.05rem] font-extrabold leading-[1.3] text-primary sm:text-[2.6rem] lg:text-[3.1rem]">
                    <span className="hero-mask"><span>{x.title1 || settings.store.name}</span></span>
                  </H>
                  {x.title2 && <p className="hero-line mt-2 text-[1.08rem] font-medium text-[var(--p-gold-700)] sm:text-[1.22rem]" style={{ '--d': '120ms' }}>{x.title2}</p>}
                  {x.text && <p className="hero-line mx-auto mt-3 max-w-[42ch] text-[15px] leading-8 text-foreground/80 md:mx-0" style={{ '--d': '220ms' }}>{x.text}</p>}
                  <div className="hero-line mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start" style={{ '--d': '320ms' }}>
                    {x.cta && <Button asChild size="lg"><Go link={x.ctaLink}>{x.cta}<ArrowLeft /></Go></Button>}
                    <Button asChild size="lg" variant="outline" className="bg-white/70"><Link to="/shop">كل المنتجات</Link></Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {/* which banner: numbered marks whose line fills while it shows */}
        <div className="container-w absolute inset-x-0 bottom-12 z-10 flex justify-center gap-3 md:justify-start">
          {slides.map((_, n) => (
            <button key={n} type="button" onClick={() => setI(n)} aria-label={`البانر ${n + 1}`} aria-current={n === i}
              className="group flex w-14 flex-col items-start gap-1.5 py-1 text-[11px] font-bold text-primary/50 aria-[current=true]:text-primary">
              <span className="tabular">{String(n + 1).padStart(2, '0')}</span>
              <span className="relative h-[2px] w-full overflow-hidden rounded-full bg-primary/15">
                <span key={n === i ? `on-${i}` : 'off'} data-run={n === i && !paused} className="hero-bar absolute inset-0 origin-right rounded-full bg-primary" style={{ '--t': `${SLIDE_MS}ms` }} />
              </span>
            </button>
          ))}
        </div>
      </div>
      <ul className="container-w -mt-6 grid grid-cols-3 gap-2 text-center text-[12.5px] text-foreground/80 sm:text-[13.5px]">
        <li className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2"><Truck className="size-[18px] text-[var(--p-gold-600)]" />شحن لباب بيتك</li>
        <li className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2"><ShieldCheck className="size-[18px] text-[var(--p-gold-600)]" />دفع آمن</li>
        <li className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2"><MessageCircle className="size-[18px] text-[var(--p-gold-600)]" />خدمة عملاء واتساب</li>
      </ul>
    </section>
  )
}

/* ---------------- A section of the store: its banner (words on a soft picture), joined to its own products ---------------- */
const SHELF_ART = { 'hair-care': '/brand/hero-hair-v4.webp', 'skin-care': '/brand/hero-herbs-v4.webp' }
function ShelfBlock({ b }) {
  const { products, categories, catalogReady } = useApp()
  const cat = categories.find((c) => c.id === b.category)
  const list = products.filter((p) => p.categoryId === b.category).slice(0, b.limit)
  if (!catalogReady || !cat || !list.length) return null
  const to = `/${cat.id}`
  return (
    <section id={b.id} className="scroll-mt-[var(--header-height)] pt-6" aria-labelledby={`h-${b.id}`}>
      <Link to={to} className="group relative isolate block">
        <div className="absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_16%,#000_62%,transparent)]" aria-hidden="true">
          <img src={b.image || SHELF_ART[cat.id] || '/brand/hero-silk-v4.webp'} alt="" width="1600" height="900" loading="lazy"
            className="size-full object-cover object-[30%_40%] transition-transform duration-[1.6s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]" />
          <span className="absolute inset-0 bg-[linear-gradient(to_top,var(--p-cream-50)_40%,rgb(251_246_244/0.7)_65%,transparent)] md:bg-[linear-gradient(to_left,var(--p-cream-50)_26%,rgb(251_246_244/0.75)_50%,transparent_75%)]" />
        </div>
        <Reveal className="container-w flex min-h-[380px] flex-col justify-end pt-40 pb-24 text-center md:min-h-[420px] md:justify-center md:pt-16 md:pb-28 md:text-start">
          <span className="md:w-[50%]">
            <span id={`h-${b.id}`} className="block font-display text-[1.75rem] font-extrabold leading-[1.35] text-primary sm:text-[2.1rem]">{b.title || cat.name}</span>
            {b.text && <span className="mx-auto mt-2 block max-w-[40ch] text-[15px] leading-7 text-foreground/80 md:mx-0">{b.text}</span>}
            <span className="mx-auto mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[14px] font-bold text-white shadow-[0_12px_22px_-12px_rgb(125_63_76/0.9)] transition-[gap] duration-300 group-hover:gap-3">{b.cta || 'تسوّقي الآن'}<ArrowLeft className="size-4" /></span>
          </span>
        </Reveal>
      </Link>
      <div className="container-w relative -mt-14 md:-mt-20">
        <div className="mx-auto max-w-[1000px]">
          <div className="flex items-center justify-between gap-3 px-1 pb-4">
            <h2 className="font-display text-[1.15rem] font-bold text-primary sm:text-[1.3rem]">منتجات {cat.name}</h2>
            <Link to={to} className="inline-flex items-center gap-1 text-[13.5px] font-bold text-primary/80 hover:text-primary">عرض الكل<ChevronLeft className="size-4" /></Link>
          </div>
          <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {list.map((p, n) => <Reveal as="li" key={p.id} delay={(n % 5) * 60} className="w-[calc(50%-6px)] min-w-0 sm:w-[188px]"><ServiceTicket p={p} /></Reveal>)}
          </ul>
        </div>
      </div>
    </section>
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
    <section id={b.id === 'products' ? 'products' : undefined} className="scroll-mt-[var(--header-height)] py-6 sm:py-8">
      <div className="container-w">
        <Title title={b.title} lead="صابونيات تقليدية وزيت للشعر، تختارينها وتوصلك لباب بيتك." />
        {tabs.length > 1 && (
          <Reveal className="mt-7 flex flex-wrap justify-center gap-2" role="tablist" aria-label="الأقسام">
            <button type="button" role="tab" aria-selected={!tab} onClick={() => setTab('')} className={pill(!tab)}>الكل</button>
            {tabs.map((c) => <button key={c.id} type="button" role="tab" aria-selected={tab === c.id} onClick={() => setTab(c.id)} className={pill(tab === c.id)}>{c.name}</button>)}
          </Reveal>
        )}
        <ul className="mx-auto mt-9 flex max-w-[1000px] flex-wrap justify-center gap-3 sm:gap-4">
          {list.map((p, i) => <Reveal as="li" key={p.id} delay={(i % 5) * 60} className="w-[calc(50%-6px)] min-w-0 sm:w-[188px]"><ServiceTicket p={p} /></Reveal>)}
        </ul>
        {b.viewAll && <div className="mt-10 text-center"><Button asChild variant="outline"><Link to={b.source === 'category' && b.category ? `/${b.category}` : '/shop'}>كل المنتجات<ArrowLeft /></Link></Button></div>}
      </div>
    </section>
  )
}

/* ---------------- The journey: four steps in one chain across; a light runs along it, step by step ---------------- */
function JourneyBlock({ b }) {
  const { settings } = useApp()
  const fee = settings.shipping.fee
  const STEPS = [
    { icon: ShoppingBag, t: 'اختاري منتجاتك', d: 'أضيفي اللي يعجبك للسلة' },
    { icon: CreditCard, t: 'ادفعي بأمان', d: 'مدى، فيزا، ماستركارد وApple Pay' },
    { icon: Gift, t: 'نجهّز طلبك', d: 'نغلّفه بعناية ويوصلك إيميل بالتحديث' },
    { icon: Truck, t: 'يوصلك لباب بيتك', d: fee > 0 ? `شحن ${money(fee)} لعنوانك الوطني` : 'شحن مجاني لعنوانك' },
  ]
  const [step, setStep] = useState(0)
  const [live, setLive] = useState(false)
  const box = useRef(null)
  // runs only while the chain is on screen, and never for reduced motion
  useEffect(() => {
    const el = box.current
    if (!el || typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!live) return
    const t = setTimeout(() => setStep((x) => (x + 1) % STEPS.length), step === STEPS.length - 1 ? 3200 : 2000)
    return () => clearTimeout(t)
  }, [live, step, STEPS.length])
  return (
    <section className="py-10 sm:py-14" aria-labelledby={`h-${b.id}`}>
      <div className="container-w">
        <Title title={<span id={`h-${b.id}`}>{b.title}</span>} lead={b.text} />
        <div ref={box} className="mx-auto mt-10 max-w-[980px] sm:px-8">
          <ol className="relative grid grid-cols-4">
            {/* the chain, and the light filling it up to the current step (from the right: the reading direction) */}
            <span className="absolute inset-x-[12.5%] top-[27px] h-[3px] rounded-full bg-[var(--p-cream-200)] sm:top-[35px]" aria-hidden="true" />
            <span className="absolute inset-x-[12.5%] top-[27px] h-[3px] origin-right rounded-full bg-[linear-gradient(to_left,var(--p-gold-500),var(--primary))] transition-[scale] duration-700 ease-[cubic-bezier(.16,1,.3,1)] sm:top-[35px]"
              style={{ scale: `${step / (STEPS.length - 1)} 1` }} aria-hidden="true" />
            {STEPS.map(({ icon: I, t, d }, n) => {
              const state = n < step ? 'done' : n === step ? 'now' : 'next'
              return (
                <li key={t} className="relative flex flex-col items-center text-center">
                  <button type="button" onClick={() => setStep(n)} aria-current={state === 'now' ? 'step' : undefined} aria-label={`${n + 1}. ${t}`}
                    className={cn('relative grid size-[56px] place-items-center rounded-full ring-[5px] transition-[background-color,color,scale,box-shadow] duration-500 sm:size-[72px]',
                      state === 'next' ? 'bg-white text-primary/70 ring-[var(--p-cream-100)] shadow-[0_10px_20px_-14px_rgb(125_63_76/0.5)]'
                        : 'bg-primary text-white ring-[var(--p-gold-100)] shadow-[0_14px_26px_-12px_rgb(125_63_76/0.75)]',
                      state === 'now' && 'scale-110')}>
                    {state === 'now' && <span className="absolute -inset-2 rounded-full border border-[var(--p-gold-500)]/60 motion-safe:animate-[ping-soft_2s_ease-out_infinite]" aria-hidden="true" />}
                    <I className="size-6 sm:size-7" strokeWidth={1.6} />
                  </button>
                  <b className={cn('mt-3 block text-[12.5px] leading-5 transition-colors duration-500 sm:mt-4 sm:text-[15px]', state === 'next' ? 'text-primary/60' : 'text-primary')}>{t}</b>
                  <span className="mt-1 hidden text-[13px] leading-6 text-muted-foreground sm:block">{d}</span>
                </li>
              )
            })}
          </ol>
          {/* on phones, the current step's line under the chain */}
          <p key={step} className="mt-6 text-center text-[14px] text-foreground/80 motion-safe:animate-[rise-in_.4s_var(--p-ease-emphasized)_both] sm:hidden" aria-live="polite">{STEPS[step].d}</p>
        </div>
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
    <section className="py-6 sm:py-8">
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
    <section className="py-6 sm:py-8">
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
  // each circle shows the section's own first product; «كل المنتجات» shows the soft silk of the first banner
  const items = [...categories.map((c) => { const mine = products.filter((p) => p.categoryId === c.id); return { to: `/${c.id}`, name: c.name, img: mine[0]?.image || c.image, n: mine.length } }),
    { to: '/shop', name: 'كل المنتجات', img: '/brand/hero-silk-v4.webp', n: products.length }]
  return (
    <section className="pt-8 pb-2" aria-label={b.title}>
      <ul className="container-w mx-auto flex max-w-[760px] justify-center gap-5 sm:gap-12">
        {items.map((x) => (
          <li key={x.to} className="w-[30%] max-w-[150px]"><Link to={x.to} className="group block text-center">
            <span className="mx-auto block aspect-square w-full max-w-[120px] overflow-hidden rounded-full bg-white p-1.5 shadow-[0_14px_28px_-18px_rgb(125_63_76/0.7)] ring-1 ring-[var(--p-gold-200)] transition-transform duration-500 group-hover:-translate-y-1">
              <img src={x.img} alt="" width="240" height="240" loading="lazy" className="size-full rounded-full object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-110" />
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
