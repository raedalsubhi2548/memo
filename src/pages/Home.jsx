import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ShoppingBag, CreditCard, Gift, Truck, ShieldCheck, MessageCircle } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { FAQ } from '@/data/content.js'
import { ALL_REVIEWS } from '@/data/reviews.js'
import { INGREDIENTS } from '@/data/world.js'
import { testimonials } from '@/lib/feedback.js'
import { money, effectivePrice, liveWa, waLink } from '@/lib/format.js'
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

const PETALS = [[8, 18, 22, -20], [88, 12, 16, 30], [16, 78, 14, 60], [80, 70, 20, -40], [52, 6, 12, 10], [94, 44, 12, 80]]
const Petal = ({ x, y, s, r }) => (
  <span className="pointer-events-none absolute motion-safe:animate-[float_7s_ease-in-out_infinite]" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(x % 5) * 0.6}s` }} aria-hidden="true">
    <span className="block rounded-[60%_0_60%_0] bg-[linear-gradient(135deg,#f6d6d1,#dfa59c)] opacity-80" style={{ width: s, height: s * 0.8, rotate: `${r}deg` }} />
  </span>
)

/* ---------------- Hero: the words on one side, the products in an arch on the other ---------------- */
function Hero({ b: h, first }) {
  const { settings, byId } = useApp()
  const H = first ? 'h1' : 'h2'
  const oil = byId['hair-oil']
  return (
    <section className="relative overflow-hidden">
      <div className="container-w grid items-center gap-10 py-10 md:grid-cols-[1fr_1.05fr] md:gap-14 md:py-16 lg:py-20">
        <div className="text-center md:text-start">
          <p className="inline-flex items-center gap-2.5 text-[13px] font-medium text-[var(--p-gold-700)] motion-safe:animate-[rise-in_.7s_var(--p-ease-emphasized)_both]">
            <span className="h-px w-8 bg-[var(--p-gold-500)]" />{h.eyebrow || 'زيوت وصابونيات للعناية'}<span className="h-px w-8 bg-[var(--p-gold-500)] md:hidden" />
          </p>
          <H className="mt-4 font-display text-[2.6rem] font-semibold leading-[1.3] text-primary sm:text-[3.2rem] lg:text-[3.6rem] motion-safe:animate-[rise-in_.8s_var(--p-ease-emphasized)_80ms_both]">
            {h.title1 || settings.store.name}
            {h.title2 && <span className="mt-1 block text-[0.52em] font-medium text-[var(--p-gold-700)]">{h.title2}</span>}
          </H>
          {h.text && <p className="mx-auto mt-4 max-w-[38ch] text-[15.5px] leading-8 text-foreground/80 md:mx-0 motion-safe:animate-[rise-in_.8s_var(--p-ease-emphasized)_160ms_both]">{h.text}</p>}
          <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start motion-safe:animate-[rise-in_.8s_var(--p-ease-emphasized)_240ms_both]">
            {h.cta && <Button asChild size="lg"><Go link={h.ctaLink}>{h.cta}<ArrowLeft /></Go></Button>}
            <Button asChild size="lg" variant="outline"><a href={waLink('السلام عليكم، عندي استفسار عن منتجات عناية ميمي')} target="_blank" rel="noopener noreferrer"><MessageCircle />كلمينا على واتساب</a></Button>
          </div>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground md:justify-start motion-safe:animate-[rise-in_.8s_var(--p-ease-emphasized)_320ms_both]">
            <li className="flex items-center gap-1.5"><Truck className="size-4 text-[var(--p-gold-600)]" />شحن لباب بيتك</li>
            <li className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-[var(--p-gold-600)]" />دفع آمن</li>
            <li className="flex items-center gap-1.5"><MessageCircle className="size-4 text-[var(--p-gold-600)]" />خدمة عملاء على واتساب</li>
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[330px] motion-safe:animate-[fade-in_1.2s_ease-out_both] sm:max-w-[460px]">
          <span className="absolute -inset-x-5 -bottom-4 top-10 arch [--arch-b:40px] bg-[var(--p-gold-100)]/70" aria-hidden="true" />
          <span className="arch absolute inset-x-3 -top-3 bottom-6 border border-[var(--p-gold-500)]/60 [--arch-b:28px]" aria-hidden="true" />
          <div className="relative overflow-hidden arch [--arch-b:28px] bg-white p-2.5 shadow-[0_30px_60px_-30px_rgb(125_63_76/0.55)]">
            <img src={h.image || '/brand/hero-v2.webp'} alt="منتجات عناية ميمي" width="900" height="1200" fetchpriority="high" className="aspect-[4/5] w-full arch [--arch-b:22px] object-cover" />
          </div>
          {PETALS.map(([x, y, s, r], i) => <Petal key={i} x={x} y={y} s={s} r={r} />)}
          {oil && (
            <Link to={productPath(oil.id)} className="absolute start-0 bottom-10 flex items-center gap-3 rounded-2xl bg-white/90 p-2 pe-4 shadow-[0_18px_36px_-18px_rgb(125_63_76/0.5)] ring-1 ring-white backdrop-blur transition-transform hover:-translate-y-0.5 md:-start-10 motion-safe:animate-[float_6s_ease-in-out_infinite]">
              <img src={oil.image} alt="" width="48" height="48" className="size-12 rounded-xl object-cover" />
              <span className="leading-tight"><b className="block text-[13px] text-primary">{oil.name}</b><span className="tabular text-[12px] text-muted-foreground">{money(effectivePrice(oil))}</span></span>
            </Link>
          )}
          <span className="absolute end-2 top-16 rounded-2xl bg-white/90 px-3.5 py-2 text-[12.5px] font-bold text-primary shadow-[0_18px_36px_-18px_rgb(125_63_76/0.5)] ring-1 ring-white backdrop-blur md:-end-8 motion-safe:animate-[float_7s_ease-in-out_1s_infinite]">صابونيات تقليدية</span>
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

/* ---------------- Ingredients: three arches with the real pictures ---------------- */
function IngredientsBlock({ b }) {
  const { byId } = useApp()
  return (
    <section className="py-14 sm:py-20" aria-labelledby={`h-${b.id}`}>
      <div className="container-w">
        <Title title={<span id={`h-${b.id}`}>{b.title}</span>} lead="مكونات عرفتها جداتنا في خلطات العناية، وجبناها لك في صابونيات ناعمة." />
        <ul className="mx-auto mt-10 grid max-w-[1000px] gap-6 sm:grid-cols-3 sm:gap-7">
          {INGREDIENTS.map((x, i) => {
            const p = byId[x.product]
            return (
              <Reveal as="li" key={x.name} delay={i * 100} className="group rounded-[26px] bg-white/80 p-3 pb-6 text-center shadow-[0_18px_40px_-28px_rgb(125_63_76/0.5)] ring-1 ring-white">
                <div className="overflow-hidden arch [--arch-b:18px]">
                  <img src={x.src} alt={x.alt} width="1200" height="1500" loading="lazy" className="aspect-[5/4] w-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105 sm:aspect-[4/5]" />
                </div>
                <h3 className="mt-4 font-display text-[1.35rem] font-semibold text-primary">{x.name}</h3>
                <p className="mx-auto mt-1.5 max-w-[30ch] px-2 text-[13.5px] leading-7 text-muted-foreground">{x.text}</p>
                {p && <Link to={productPath(p.id)} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--p-cream-100)] px-4 py-1.5 text-[12.5px] font-bold text-primary transition-colors hover:bg-[var(--p-cream-200)]">{p.name} · {money(effectivePrice(p))}<ArrowLeft className="size-3.5" /></Link>}
              </Reveal>
            )
          })}
        </ul>
        <p className="mt-5 text-center text-[11.5px] text-muted-foreground">الصور توضّح المكوّنات نفسها.</p>
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
function CategoriesBlock({ b }) {
  const { categories, products } = useApp()
  if (!categories.length) return null
  const ART = { 'hair-care': '/brand/cat-hair-care-v2.webp', 'skin-care': '/brand/cat-skin-care-v2.webp' }
  return (
    <section className="py-14 sm:py-20">
      <div className="container-w">
        <Title title={b.title} />
        <ul className="mx-auto mt-10 grid max-w-[760px] grid-cols-2 gap-5">
          {categories.map((c) => (
            <li key={c.id}><Link to={`/${c.id}`} className="group block text-center">
              <span className="block overflow-hidden arch [--arch-b:22px] bg-white p-2 shadow-[0_20px_40px_-28px_rgb(125_63_76/0.6)]"><img src={ART[c.id] || '/brand/cat-skin-care-v2.webp'} alt="" loading="lazy" className="aspect-[3/4] w-full arch [--arch-b:16px] object-cover transition-transform duration-700 group-hover:scale-105" /></span>
              <b className="mt-3 block font-display text-[1.2rem] font-semibold text-primary">{c.name}</b>
              <span className="tabular text-[12.5px] text-muted-foreground">{countLabel(products.filter((p) => p.categoryId === c.id).length)}</span>
            </Link></li>
          ))}
        </ul>
      </div>
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
  hero: Hero, products: ProductsBlock, ingredients: IngredientsBlock, journey: JourneyBlock, reviews: Reviews, faq: FaqBlock,
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
