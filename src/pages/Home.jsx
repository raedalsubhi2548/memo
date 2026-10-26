import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Check, ShoppingBag } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { FAQ } from '@/data/content.js'
import { ALL_REVIEWS } from '@/data/reviews.js'
import { HERO_PICTURE, INGREDIENTS } from '@/data/world.js'
import { testimonials } from '@/lib/feedback.js'
import { money, effectivePrice, liveWa } from '@/lib/format.js'
import { shippingFor } from '@/lib/theme.js'
import { productPath } from '@/lib/slug.js'
import { trackAddToCart } from '@/lib/analytics.js'
import { cn } from '@/lib/utils'
import Reveal from '@/components/Reveal.jsx'
import { Button } from '@/components/ui/button'
import ServiceTicket from '@/components/home/ServiceTicket.jsx'

const Heading = ({ children, className }) => <h2 className={cn('font-display text-[clamp(2.25rem,1.5rem+3.2vw,4.25rem)] font-extrabold leading-[1.1] text-primary', className)}>{children}</h2>

/** linkProps: an internal path opens in the store, an https address in a new tab, #id scrolls. */
const Go = ({ link, className, children }) => {
  if (!link) return <Link to="/shop" className={className}>{children}</Link>
  if (link.startsWith('#')) return <a href={link} className={className}>{children}</a>
  if (/^https:/i.test(link)) return <a href={liveWa(link)} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  return <Link to={link} className={className}>{children}</Link>
}

/* ---------------- Hero: a picture of the trade, and under it the name as a monument ---------------- */
function Hero({ b: h, first }) {
  const { settings } = useApp()
  const name = (h.title1 || settings.store.name).trim()
  const [w1, ...rest] = name.split(/\s+/)
  const word = useRef(null)
  // the signature move: the name settles a few percent as the first screen leaves (scroll-linked, transform only)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const on = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; const p = Math.min(1, Math.max(0, scrollY / innerHeight)); if (word.current) word.current.style.scale = String(1 - p * 0.07) }) }
    on(); addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  const H = first ? 'h1' : 'h2'
  return (
    <section className="flex h-[calc(100svh-var(--header-height))] min-h-[560px] flex-col overflow-hidden" aria-labelledby="hero-name">
      <picture className="block min-h-0 w-full flex-1 overflow-hidden bg-sunken">
        <source media="(max-width: 767px)" srcSet={h.imageMobile || h.image || HERO_PICTURE.mobile} />
        <img src={h.image || HERO_PICTURE.src} alt={h.image ? '' : HERO_PICTURE.alt} width="2400" height="1400" fetchpriority="high"
          className="size-full object-cover motion-safe:animate-[kenburns_30s_ease-in-out_infinite_alternate]" />
      </picture>
      <div className="container-w shrink-0">
        <H id="hero-name" ref={word} className="mt-3 flex origin-top items-center justify-between gap-[0.12em] whitespace-nowrap font-display text-[clamp(52px,15.4vw,280px)] font-extrabold leading-[1.15] text-primary">
          <span>{w1}</span>
          <img src={settings.logo} alt="" aria-hidden="true" width="300" height="300" className="size-[0.6em] shrink-0 rounded-full object-cover" />
          {rest.length > 0 && <span>{rest.join(' ')}</span>}
        </H>
        <div className="flex flex-col gap-4 pb-6 pt-2 md:flex-row md:items-center md:justify-between md:pb-8">
          <p className="max-w-[56ch] text-[20px] font-bold leading-[1.6]">{h.text}</p>
          {h.cta && <Button asChild size="lg" className="self-start px-8 md:self-auto"><Go link={h.ctaLink}>{h.cta}<ArrowLeft /></Go></Button>}
        </div>
      </div>
    </section>
  )
}

/* ---------------- The line-up: every product at one size, and the routine you tick together ---------------- */
function ProductsBlock({ b }) {
  const { products, categories, byId, catalogReady, addToCart, settings } = useApp()
  const [picked, setPicked] = useState([])
  if (!catalogReady) return <div className="container-w py-24"><div className="h-80 animate-pulse bg-sunken" /></div>
  const list = (b.source === 'picked' ? b.ids.map((id) => byId[id]).filter(Boolean)
    : b.source === 'category' ? products.filter((p) => p.categoryId === b.category)
      : b.source === 'featured' ? products.filter((p) => p.featured) : [...products]).slice(0, b.limit)
  if (!list.length) return null
  const groups = categories.map((c) => ({ c, items: list.filter((p) => p.categoryId === c.id) })).filter((g) => g.items.length)
  const sum = picked.reduce((s, id) => s + (byId[id] ? effectivePrice(byId[id]) : 0), 0)
  const ship = picked.length ? shippingFor(settings.shipping, sum) : 0
  const toggle = (id) => setPicked((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))
  const addAll = () => { picked.forEach((id) => { const p = byId[id]; if (!p) return; addToCart(p.id); trackAddToCart(p, 1, effectivePrice(p)) }); setPicked([]) }
  return (
    <section id={b.id === 'products' ? 'products' : undefined} className="scroll-mt-[var(--header-height)] py-[clamp(72px,8vw,140px)]">
      <div className="container-w">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <Heading>{b.title}</Heading>
          <p className="max-w-[40ch] text-[18px] leading-[1.7]">اختاري اللي يناسبك من القائمة، ونحسب لك المجموع مع الشحن.</p>
        </Reveal>
        <div className="mt-10 grid gap-10 md:mt-14">
          {groups.map(({ c, items }) => (
            <div key={c.id}>
              <h3 className="sticky top-[var(--header-height)] z-10 bg-background py-3 font-display text-[20px] font-extrabold text-[var(--p-gold-700)]">
                <Link to={`/${c.id}`} className="hover:underline">{c.name}</Link>
              </h3>
              <ul>
                {items.map((p, i) => {
                  const on = picked.includes(p.id)
                  const sale = effectivePrice(p) < p.price
                  return (
                    <Reveal as="li" delay={i * 80} key={p.id} className={cn('group grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 py-4 transition-colors md:grid-cols-[auto_1.3fr_1fr_auto_auto] md:gap-x-10 md:py-3', on && 'bg-sunken')}>
                      <Link to={productPath(p.id)} className="block size-24 shrink-0 overflow-hidden bg-sunken md:h-44 md:w-36" tabIndex={-1} aria-hidden="true">
                        <img src={p.image} alt="" width="160" height="200" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      </Link>
                      <Link to={productPath(p.id)} className="min-w-0 font-display text-[clamp(22px,3vw,44px)] font-extrabold leading-tight text-primary hover:underline">{p.name}</Link>
                      <p className="col-start-2 row-start-2 text-[15px] text-muted-foreground md:col-start-3 md:row-start-1 md:text-[18px] md:text-foreground">{(p.summary || '').split('،')[0]}</p>
                      <p className="tabular col-start-3 row-span-2 row-start-1 text-end font-display text-[clamp(18px,1.9vw,28px)] font-extrabold text-primary md:col-start-4 md:row-span-1">
                        {money(effectivePrice(p))}{sale && <s className="ms-2 text-[15px] font-normal text-muted-foreground">{money(p.price)}</s>}
                      </p>
                      <button type="button" onClick={() => toggle(p.id)} aria-pressed={on} aria-label={on ? `إزالة ${p.name} من اختياري` : `اختيار ${p.name}`}
                        className={cn('col-span-3 inline-flex h-11 items-center justify-center gap-2 px-4 text-[15px] font-bold transition-colors md:col-span-1 md:col-start-5 md:w-36', on ? 'bg-primary text-primary-foreground' : 'bg-sunken text-primary hover:bg-[var(--p-cream-200)]')}>
                        {on ? <><Check className="size-4" />مختارة</> : 'اختاريها'}
                      </button>
                    </Reveal>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
        {/* the live routine: what's ticked, its total with shipping, one tap into the bag */}
        <Reveal className="mt-10 bg-primary text-primary-foreground" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8 md:py-5">
            <p className="tabular text-[17px] leading-[1.6]">
              {picked.length
                ? <>اخترتي {picked.length} {picked.length === 1 ? 'منتج' : 'منتجات'}: {money(sum)} + الشحن {ship > 0 ? money(ship) : 'مجاني'} = <b className="font-extrabold">{money(sum + ship)}</b></>
                : <>رتّبي روتينك: اختاري من القائمة ونحسب لك المجموع مع الشحن ({money(settings.shipping.fee)}).</>}
            </p>
            <Button type="button" variant="inverse" onClick={addAll} disabled={!picked.length} className="px-6"><ShoppingBag />أضيفيها للسلة</Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- Ingredients: the pictures of the trade pass under a pinned title ---------------- */
function IngredientsBlock({ b }) {
  const { byId } = useApp()
  return (
    <section className="bg-sunken py-[clamp(80px,10vw,160px)]" aria-labelledby={`h-${b.id}`}>
      <div className="container-w">
        <Reveal><Heading className="text-[clamp(2.75rem,1rem+6vw,7rem)] leading-[1.05]"><span id={`h-${b.id}`}>{b.title}</span></Heading></Reveal>
        <ol className="mt-10 grid gap-[clamp(64px,9vw,140px)] md:mt-16" aria-label={b.title}>
          {INGREDIENTS.map((x, i) => {
            const p = byId[x.product]
            return (
              <Reveal as="li" key={x.name} className={cn('grid items-center gap-6 md:grid-cols-12 md:gap-10')}>
                <figure className={cn('md:col-span-5', i % 2 ? 'md:col-start-8' : 'md:col-start-1')}>
                  <img src={x.src} alt={x.alt} width="1200" height="1500" loading="lazy" className="aspect-[4/5] w-full object-cover" />
                </figure>
                <div className={cn('md:col-span-5 md:row-start-1', i % 2 ? 'md:col-start-2' : 'md:col-start-7')}>
                  <h3 className="font-display text-[clamp(2rem,1.2rem+2.6vw,3.5rem)] font-extrabold leading-tight text-primary">{x.name}</h3>
                  <p className="mt-4 max-w-[42ch] text-[18px] leading-[1.75]">{x.text}</p>
                  <p className="mt-3 text-[16px] text-muted-foreground">في الصورة: {x.caption}</p>
                  {p && <Link to={productPath(p.id)} className="mt-6 inline-flex items-center gap-2 text-[18px] font-bold text-primary underline decoration-2 underline-offset-8 hover:decoration-[var(--p-gold-400)]">{p.name} · {money(effectivePrice(p))}<ArrowLeft className="size-4" /></Link>}
                </div>
              </Reveal>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* ---------------- The journey: from the order to the door, printed as a receipt ---------------- */
function JourneyBlock({ b }) {
  const { settings } = useApp()
  const fee = settings.shipping.fee
  const ROWS = [
    ['الطلب', [['اختاري منتجاتك', 'السلة'], ['ادفعي', 'مدى · فيزا · Apple Pay']]],
    ['التجهيز', [['نجهّز طلبك ونغلّفه', 'إيميل بالتحديث'], ['نشحنه لعنوانك الوطني', fee > 0 ? money(fee) : 'مجاني']]],
  ]
  return (
    <section className="py-[clamp(96px,12vw,200px)]" aria-labelledby={`h-${b.id}`}>
      <div className="container-w grid items-start gap-12 md:grid-cols-12">
        <Reveal className="md:col-span-5">
          <Heading><span id={`h-${b.id}`}>{b.title}</span></Heading>
          {b.text && <p className="mt-6 max-w-[34ch] text-[18px] leading-[1.75]">{b.text}</p>}
          <Button asChild size="lg" className="mt-8 px-8"><a href="#products">ابدئي طلبك<ArrowLeft /></a></Button>
        </Reveal>
        <Reveal delay={90} className="md:col-span-6 md:col-start-7">
          <div className="mx-auto w-full max-w-[480px] bg-[#f7f1f0] px-7 pb-14 pt-8 text-[16px] text-foreground [clip-path:polygon(0_0,100%_0,100%_calc(100%-14px),95%_100%,90%_calc(100%-14px),85%_100%,80%_calc(100%-14px),75%_100%,70%_calc(100%-14px),65%_100%,60%_calc(100%-14px),55%_100%,50%_calc(100%-14px),45%_100%,40%_calc(100%-14px),35%_100%,30%_calc(100%-14px),25%_100%,20%_calc(100%-14px),15%_100%,10%_calc(100%-14px),5%_100%,0_calc(100%-14px))]">
            <p className="text-center font-display text-[20px] font-extrabold text-primary">{settings.store.name}</p>
            {ROWS.map(([head, rows]) => (
              <div key={head} className="mt-7">
                <p className="font-bold text-primary">{head}</p>
                <ul className="mt-2 grid gap-2">
                  {rows.map(([what, val]) => (
                    <li key={what} className="flex min-w-0 items-baseline gap-2">
                      <span>{what}</span>
                      <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-muted-foreground" aria-hidden="true">{'.'.repeat(80)}</span>
                      <span className="tabular text-end font-bold">{val}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="-mx-7 mt-8 flex h-12 items-center justify-between bg-primary px-7 font-bold text-primary-foreground">
              <span>طلبك عند بابك</span><span>تتابعينه من حسابك</span>
            </p>
          </div>
        </Reveal>
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
    <section className="py-[clamp(96px,12vw,200px)]" aria-labelledby={`h-${b.id}`}>
      <div className="container-w">
        <Heading><span id={`h-${b.id}`}>{b.title}</span></Heading>
        <ul className="mt-14 grid gap-10 md:grid-cols-2">
          {all.slice(0, 6).map((r, i) => (
            <Reveal as="li" key={r.id || i} delay={(i % 2) * 90}>
              <blockquote className="text-[clamp(18px,1.5vw,22px)] leading-[1.7]">{r.text}</blockquote>
              <p className="mt-3 font-bold text-primary">{r.name}</p>
            </Reveal>
          ))}
        </ul>
        {all.length > 6 && <Link to="/reviews" className="mt-10 inline-flex items-center gap-2 font-bold text-primary underline underline-offset-8">كل الآراء ({all.length})<ArrowLeft className="size-4" /></Link>}
      </div>
    </section>
  )
}

/* ---------------- Questions: a wide heading, the questions indented under it ---------------- */
function FaqBlock({ b }) {
  const { settings } = useApp()
  const fee = settings.shipping.fee
  const list = FAQ.map((q) => (q.q === 'كم رسوم الشحن؟' ? { ...q, a: fee > 0 ? `رسوم الشحن ${money(fee)} للطلب${settings.shipping.freeOver > 0 ? `، ومجاني للطلبات من ${money(settings.shipping.freeOver)}` : ''}، وتظهر لك في صفحة الدفع قبل ما تدفعين.` : 'الشحن مجاني.' } : q))
  return (
    <section className="pb-[clamp(72px,8vw,140px)] pt-[clamp(48px,5vw,80px)]" aria-labelledby={`h-${b.id}`}>
      <div className="container-w">
        <Heading className="text-[clamp(2.5rem,1rem+5vw,6rem)]"><span id={`h-${b.id}`}>{b.title}</span></Heading>
        <div className="mt-10 grid gap-1 md:mt-12 md:ms-[33%]">
          {list.map((q, i) => (
            <Reveal as="details" delay={i * 60} key={q.q} className="group -mx-4 px-4 py-3 open:bg-sunken md:-mx-6 md:px-6 md:py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[clamp(20px,1.9vw,28px)] font-bold text-primary [&::-webkit-details-marker]:hidden">
                {q.q}<ChevronDown className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-180" strokeWidth={2.5} />
              </summary>
              <p className="mt-3 max-w-[48ch] text-[18px] leading-[1.75]">{q.a} {q.link && <Link className="font-bold text-primary underline underline-offset-4" to={q.link}>السياسات والشروط</Link>}</p>
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
    <section className="py-[clamp(72px,9vw,140px)]">
      <Reveal className="container-w grid items-center gap-8 md:grid-cols-12 md:gap-12">
        {b.image && <img src={b.image} alt="" width="1200" height="800" loading="lazy" className="aspect-[4/3] w-full object-cover md:col-span-7" />}
        <div className={cn(b.image ? 'md:col-span-5' : 'md:col-span-8')}>
          <h2 className="font-display text-[clamp(2rem,1.3rem+3vw,3.75rem)] font-extrabold leading-[1.1] text-primary">{b.title}</h2>
          {b.accent && <p className="mt-2 text-[20px] font-bold text-[var(--p-gold-700)]">{b.accent}</p>}
          {b.text && <p className="mt-4 max-w-[44ch] text-[18px] leading-[1.75]">{b.text}</p>}
          {b.cta && <Button asChild size="lg" className="mt-7 px-8"><Go link={b.link}>{b.cta}<ArrowLeft /></Go></Button>}
        </div>
      </Reveal>
    </section>
  )
}
function BannerBlock({ b }) {
  if (!b.image) return null
  const pic = <picture>{b.imageMobile && <source media="(max-width: 767px)" srcSet={b.imageMobile} />}<img src={b.image} alt={b.alt || ''} loading="lazy" className="block h-auto w-full" /></picture>
  return <section className={cn('py-8', b.size === 'container' && 'container-w')}>{b.link ? <Go link={b.link} className="block">{pic}</Go> : pic}</section>
}
function TextBlock({ b }) {
  return (
    <section className="py-[clamp(72px,9vw,140px)]">
      <Reveal className={cn('container-w max-w-4xl', b.align === 'center' && 'text-center')}>
        {b.title && <h2 className="font-display text-[clamp(2rem,1.3rem+3vw,3.75rem)] font-extrabold leading-[1.1] text-primary">{b.title}</h2>}
        {b.text && <p className="mt-5 whitespace-pre-line text-[18px] leading-[1.8]">{b.text}</p>}
        {b.cta && b.link && <Button asChild size="lg" className="mt-8 px-8"><Go link={b.link}>{b.cta}<ArrowLeft /></Go></Button>}
      </Reveal>
    </section>
  )
}
function CategoriesBlock({ b }) {
  const { categories, products } = useApp()
  if (!categories.length) return null
  return (
    <section className="py-[clamp(72px,9vw,140px)]">
      <div className="container-w">
        <Heading>{b.title}</Heading>
        <ul className="mt-10 grid gap-2">
          {categories.map((c) => (
            <li key={c.id}><Link to={`/${c.id}`} className="flex items-baseline justify-between gap-4 py-3 font-display text-[clamp(28px,4vw,64px)] font-extrabold text-primary hover:text-[var(--p-gold-700)]">{c.name}<span className="tabular text-[17px] font-bold text-muted-foreground">{products.filter((p) => p.categoryId === c.id).length} منتجات</span></Link></li>
          ))}
        </ul>
      </div>
    </section>
  )
}
function Promises({ b }) {
  if (!b.items.length) return null
  return (
    <section className="bg-sunken py-14">
      <ul className="container-w grid gap-8 sm:grid-cols-3">
        {b.items.map((x) => <li key={x.title}><p className="text-[20px] font-extrabold text-primary">{x.title}</p><p className="mt-1 text-[16px]">{x.text}</p></li>)}
      </ul>
    </section>
  )
}
function ShelfBlock({ b }) { // kept for saved home pages that still show a product shelf
  const { products } = useApp()
  const items = products.slice(0, b.limit || 4)
  return <section className="container-w grid grid-cols-2 gap-4 py-16 lg:grid-cols-4">{items.map((p) => <ServiceTicket key={p.id} p={p} />)}</section>
}

const RENDER = {
  hero: Hero, products: ProductsBlock, ingredients: IngredientsBlock, journey: JourneyBlock, reviews: Reviews, faq: FaqBlock,
  imageText: ImageTextBlock, banner: BannerBlock, text: TextBlock, categories: CategoriesBlock, promises: Promises, shelf: ShelfBlock,
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
