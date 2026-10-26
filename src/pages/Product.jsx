import { coverFor } from '@/lib/cover.js'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Heart, ShieldCheck, Truck, MessageCircle, Check, ChevronDown, ShoppingBag } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { cn } from '@/lib/utils'
import ServiceTicket from '@/components/home/ServiceTicket.jsx'
import { Button } from '@/components/ui/button'
import { Qty, Skeleton } from '@/components/ui/kit.jsx'
import { money, effectivePrice, parseDescription, waLink, optKey, unitPrice, missingOptions } from '@/lib/format.js'
import { fromSlug, toSlug, productPath } from '@/lib/slug.js'
import { trackAddToCart, trackViewProduct } from '@/lib/analytics.js'
import NotFound from './NotFound.jsx'
import Stars from '@/components/brand/Stars.jsx'
import { SERVICE_RATINGS } from '@/data/reviews.js'
import { SEO_H1 } from '@/lib/seo.js'
import { SERVICE_FAQ } from '@/data/serviceFaq.js'
import OptionNote from '@/components/OptionNote.jsx'
import ServiceQuestions from '@/components/ServiceQuestions.jsx'
import { serviceScore } from '@/lib/feedback.js'

export default function Product({ slug: fromProps }) {
  const { id: fromUrl } = useParams()
  const slug = fromProps ?? fromUrl
  const id = fromSlug(slug)
  const { byId, categories, products, feedback, addToCart, toggleWish, wishlist, catalogReady, settings } = useApp()
  const [qty, setQty] = useState(1)
  const [sel, setSel] = useState([]) // chosen options as "optionId:valueId"
  const [optErr, setOptErr] = useState('')
  useEffect(() => { setSel([]); setOptErr(''); setQty(1) }, [id])
  const seen = !!byId[id]
  useEffect(() => { if (seen) trackViewProduct(byId[id], effectivePrice(byId[id])) }, [id, seen]) // eslint-disable-line react-hooks/exhaustive-deps
  const p = byId[id]
  if (toSlug(id) !== slug) return <Navigate to={productPath(id)} replace />
  if (!p) return catalogReady ? <NotFound /> : <div className="container-w py-14"><Skeleton className="h-[480px]" /></div>

  const cat = categories.find((c) => c.id === p.categoryId)
  const { intro, sections } = parseDescription(p.description)
  const related = products.filter((x) => x.id !== p.id).sort((a, b) => (a.categoryId === p.categoryId ? -1 : 0) - (b.categoryId === p.categoryId ? -1 : 0)).slice(0, 4)
  const wished = wishlist.includes(p.id)
  const onSale = p.salePrice && p.salePrice < p.price
  const total = unitPrice(p, sel) * qty
  const rating = SERVICE_RATINGS[p.id]
  const score = serviceScore(rating, feedback.reviews, p.id) // published reviews of this product
  const written = [...(score?.mine || []).map((r) => ({ key: r.id, name: r.name, text: r.text, stars: r.service })), ...(rating?.reviews || []).map((r) => ({ key: r.name + r.date, name: r.name, text: r.text, stars: 5 }))]
  const fee = settings.shipping.fee
  const pick = (o, v) => {
    const k = optKey(o, v)
    setOptErr('')
    setSel((cur) => {
      if (cur.includes(k)) return cur.filter((x) => x !== k) // a second tap clears it
      const rest = o.type === 'radio' ? cur.filter((x) => !x.startsWith(o.id + ':')) : cur
      return [...rest, k]
    })
  }
  const add = () => {
    const miss = missingOptions(p, sel)
    if (miss.length) { setOptErr(`اختاري: ${miss.join('، ')}`); return }
    addToCart(p.id, qty, '', sel)
    trackAddToCart(p, qty, unitPrice(p, sel))
  }

  return (
    <div className="relative isolate">
      <span className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(60%_60%_at_80%_20%,color-mix(in_srgb,var(--p-gold-400)_40%,transparent),transparent),radial-gradient(50%_50%_at_10%_60%,color-mix(in_srgb,var(--p-gold-400)_25%,transparent),transparent)]" aria-hidden="true" />
      <div className="container-w py-8 sm:py-12">
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground" aria-label="المسار">
          <Link to="/" className="hover:underline">الرئيسية</Link><span>/</span>
          {cat && <><Link to={`/${cat.id}`} className="hover:underline">{cat.name}</Link><span>/</span></>}
          <span className="text-foreground">{p.name}</span>
        </nav>

        <div className="grid items-start gap-8 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div className="lg:sticky lg:top-[calc(var(--header-height)+24px)]">
            <div className="relative mx-auto max-w-[520px] overflow-hidden rounded-t-[999px] rounded-b-[36px] bg-[radial-gradient(80%_60%_at_50%_35%,#fffaf8,var(--p-gold-200))] p-2 shadow-[0_40px_80px_-40px_color-mix(in_srgb,var(--p-green-900)_70%,transparent)] ring-1 ring-[var(--p-gold-400)]">
              <img src={p.image} alt={p.name} width="600" height="750" onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = 1; e.currentTarget.src = coverFor(p) } }} className="aspect-[4/5] w-full rounded-t-[999px] rounded-b-[30px] object-cover" />
              <span className="pointer-events-none absolute inset-[14px] rounded-t-[999px] rounded-b-[24px] border border-white/70" aria-hidden="true" />
              {p.badge && <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-4 py-1.5 text-sm font-semibold text-primary shadow-sm">{p.badge}</span>}
            </div>
          </div>

          <div className="lg:pt-8">
            {cat && <Link to={`/${cat.id}`} className="text-[13.5px] font-medium tracking-wide text-accent-text hover:underline">{cat.name}</Link>}
            <h1 className="mt-1 text-balance font-display text-[2.4rem] leading-[1.35] text-primary sm:text-[3rem]">{SEO_H1[p.id] || p.name}</h1>
            {score && (
              <a href={written.length ? '#reviews' : undefined} className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Stars size={15} value={score.avg} /><span className="tabular font-semibold text-foreground">{score.avg.toFixed(1)}</span><span>({score.count} تقييم)</span>
              </a>
            )}
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className={cn('tabular font-display text-[2.2rem]', onSale ? 'text-danger' : 'text-primary')}>{money(effectivePrice(p))}</span>
              {onSale && <s className="tabular text-lg text-muted-foreground">{money(p.price)}</s>}
            </div>
            <p className="mt-4 text-[17px] leading-8 text-foreground/80">{p.summary}</p>

            <div className="mt-7 grid gap-5 rounded-[28px] bg-white/75 p-5 ring-1 ring-[var(--p-gold-400)]/70 backdrop-blur sm:p-6">
              {p.options?.map((o) => (
                <fieldset key={o.id} className="grid gap-2">
                  <legend className="mb-2 text-sm font-bold">{o.name} <span className="font-normal text-muted-foreground">{o.required ? '(مطلوب)' : o.type === 'checkbox' ? '(اختاري اللي تبين)' : '(اختياري)'}</span></legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {o.values.map((v) => {
                      const on = sel.includes(optKey(o, v))
                      return (
                        <button key={v.id} type="button" role={o.type === 'radio' ? 'radio' : 'checkbox'} aria-checked={on} onClick={() => pick(o, v)}
                          className={cn('flex min-h-12 items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-2.5 text-start text-sm transition-colors', on ? 'border-primary bg-sunken' : 'border-border hover:border-border-strong')}>
                          <span className={cn('grid size-5 shrink-0 place-items-center border-[1.5px]', o.type === 'radio' ? 'rounded-full' : 'rounded-[6px]', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong')}>{on && <Check className="size-3" strokeWidth={3.5} />}</span>
                          <span className="flex-1 leading-6">{v.name}</span>
                          {Number(v.price) > 0 && <span className="tabular shrink-0 font-semibold text-primary">+{money(v.price)}</span>}
                        </button>
                      )
                    })}
                  </div>
                  <OptionNote o={o} />
                </fieldset>
              ))}
              {optErr && <p className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{optErr}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <Qty value={qty} onChange={(v) => setQty(Math.max(1, v))} />
                <Button size="lg" className="min-w-0 flex-1" onClick={add}>
                  <ShoppingBag />أضيفي للسلة <span className="tabular opacity-80">{money(total)}</span>
                </Button>
                <button
                  onClick={() => toggleWish(p.id)} aria-pressed={wished} aria-label={wished ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                  className={cn('grid size-14 place-items-center rounded-full border-[1.5px] border-border-strong bg-white transition-colors', wished ? 'text-danger' : 'text-primary hover:border-primary')}
                ><Heart className="size-5" fill={wished ? 'currentColor' : 'none'} /></button>
              </div>
              <ul className="grid gap-2.5 border-t border-border pt-4 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5"><Truck className="size-4 text-primary" />{fee > 0 ? `الشحن ${money(fee)}${settings.shipping.freeOver > 0 ? `، ومجاني للطلبات من ${money(settings.shipping.freeOver)}` : ''}` : 'شحن مجاني'}، وتتابعين طلبك من حسابك</li>
                <li className="flex items-center gap-2.5"><ShieldCheck className="size-4 text-primary" />دفع آمن: مدى، فيزا، ماستركارد وApple Pay</li>
                <li><a href={waLink(`السلام عليكم، عندي سؤال عن: ${p.name}`)} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 font-semibold text-primary hover:underline"><MessageCircle className="size-4" />اسألينا عن المنتج على واتساب</a></li>
              </ul>
            </div>
          </div>
        </div>

        <section className="mt-16 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <h2 className="font-display text-[1.9rem] text-primary">عن المنتج</h2>
            <p className="mt-3 max-w-[60ch] text-[17px] leading-9">{intro}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {sections.map((s) => (
              <div key={s.title} className="rounded-[24px] bg-white/75 p-5 ring-1 ring-[var(--p-gold-400)]/60">
                <h3 className="mb-3 font-display text-lg font-normal text-primary">{s.title}</h3>
                <ul className="grid gap-2">
                  {s.items.map((it) => <li key={it} className="flex gap-2 text-[15px] leading-7"><Check className="mt-1.5 size-3.5 shrink-0 rounded-full bg-accent p-0.5 text-primary" strokeWidth={3} />{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {SERVICE_FAQ[p.id]?.length > 0 && (
          <section className="mt-16" aria-labelledby="faq">
            <h2 id="faq" className="mb-5 font-display text-[1.9rem] text-primary">أسئلة شائعة</h2>
            <div className="grid max-w-[860px] gap-2.5">
              {SERVICE_FAQ[p.id].map((f) => (
                <details key={f.q} className="group rounded-2xl bg-white/75 ring-1 ring-[var(--p-gold-400)]/60 open:ring-primary/30">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-5 py-4 font-semibold leading-7 text-primary">{f.q}<ChevronDown className="mt-1.5 size-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
                  <p className="px-5 pb-5 text-[15.5px] leading-8 text-foreground/80">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {written.length > 0 && (
          <section id="reviews" className="mt-16 scroll-mt-28">
            <h2 className="font-display text-[1.9rem] text-primary">آراء العميلات</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Stars size={14} value={score.avg} />{score.avg.toFixed(1)} من {score.count} تقييم</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {written.map((r) => (
                <figure key={r.key} className="grid content-start gap-3 rounded-[24px] bg-white/75 p-5 ring-1 ring-[var(--p-gold-400)]/60">
                  <Stars size={13} value={r.stars} />
                  {r.text && <blockquote className="text-[15px] leading-7">{r.text}</blockquote>}
                  <figcaption className="text-sm font-semibold text-primary">{r.name}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <ServiceQuestions productId={p.id} questions={feedback.questions} />

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-center font-display text-[1.9rem] text-primary">قد يعجبك أيضاً</h2>
            <div className="mx-auto grid max-w-[1160px] grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 lg:grid-cols-4">{related.map((r) => <div key={r.id} className="min-w-0"><ServiceTicket p={r} /></div>)}</div>
          </section>
        )}
      </div>
    </div>
  )
}
