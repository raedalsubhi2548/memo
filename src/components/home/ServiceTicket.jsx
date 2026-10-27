import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Heart, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/state.jsx'
import { money, effectivePrice } from '@/lib/format.js'
import { coverFor } from '@/lib/cover.js'
import { productPath } from '@/lib/slug.js'
import { trackAddToCart } from '@/lib/analytics.js'
import OptionsDialog from '@/components/OptionsDialog.jsx'

/** Adding a product: one with options opens its choices first; one without goes straight to the cart and says so for a moment. */
export function useAddToCart(p) {
  const { addToCart } = useApp()
  const [choose, setChoose] = useState(false)
  const [added, setAdded] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const add = () => {
    if (p.options?.length) return setChoose(true)
    addToCart(p.id); trackAddToCart(p, 1, effectivePrice(p))
    setAdded(true); clearTimeout(timer.current); timer.current = setTimeout(() => setAdded(false), 1600)
  }
  return { add, added, choose, setChoose }
}

export function AddButton({ add: { add, added, choose, setChoose }, p, className, compact }) {
  return (
    <>
      <button type="button" onClick={add} aria-haspopup={p.options?.length ? 'dialog' : undefined} aria-live="polite"
        className={cn('relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-bold transition-[background-color,scale,box-shadow] duration-200 active:scale-[0.97]',
          compact ? 'h-9 px-3 text-[12.5px]' : 'h-11 px-6 text-[14px]',
          added ? 'bg-[var(--p-gold-700)] text-white' : 'bg-primary text-white shadow-[0_10px_20px_-12px_rgb(125_63_76/0.9)] hover:bg-primary-hover', className)}>
        <span key={added ? 'y' : 'n'} className="inline-flex items-center gap-2 motion-safe:animate-[rise-in_.3s_var(--p-ease-emphasized)_both]">
          {added ? <><Check className="size-4" />تمت الإضافة</> : <><ShoppingCart className="size-4" />{p.options?.length ? 'اختاري' : 'أضيفي للسلة'}</>}
        </span>
      </button>
      {p.options?.length > 0 && <OptionsDialog p={p} open={choose} onOpenChange={setChoose} />}
    </>
  )
}

/** The store's product card: the photo on a blush ground, the section, the name, a line about it, the price and the add button. */
export default function ServiceTicket({ p, className }) {
  const { toggleWish, wishlist, categories } = useApp()
  const cat = categories?.find((c) => c.id === p.categoryId)
  const wished = wishlist.includes(p.id)
  const sale = p.salePrice && p.salePrice < p.price
  const add = useAddToCart(p)
  return (
    <article className={cn('group relative flex h-full flex-col rounded-[20px] bg-white p-1.5 shadow-[0_1px_2px_rgb(125_63_76/0.05),0_20px_40px_-30px_rgb(125_63_76/0.5)] ring-1 ring-[var(--p-cream-200)] transition-[translate,box-shadow] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:shadow-[0_2px_4px_rgb(125_63_76/0.06),0_30px_50px_-28px_rgb(125_63_76/0.55)] hover:ring-[var(--p-gold-200)]', className)}>
      <Link to={productPath(p.id)} className="relative block overflow-hidden rounded-[15px] bg-[radial-gradient(120%_90%_at_50%_20%,#fff,var(--p-cream-100))]" tabIndex={-1} aria-hidden="true">
        <img src={p.image} sizes="(max-width: 640px) 46vw, 190px" alt="" loading="lazy" decoding="async" width="900" height="1125"
          onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = 1; e.currentTarget.src = coverFor(p) } }}
          className="aspect-square w-full object-cover object-[50%_55%] transition-transform duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]" />
      </Link>
      <button type="button" onClick={() => toggleWish(p.id)} aria-pressed={wished} aria-label={wished ? `إزالة ${p.name} من المفضلة` : `إضافة ${p.name} إلى المفضلة`}
        className={cn('absolute top-3 end-3 z-10 grid size-8 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-[color,scale] duration-200 active:scale-90', wished ? 'text-danger' : 'text-primary/60 hover:text-primary')}>
        <Heart className="size-[14px]" fill={wished ? 'currentColor' : 'none'} />
      </button>
      {(p.badge || sale) && <span className="absolute top-3.5 start-3.5 z-10 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-medium leading-none text-white">{sale ? 'خصم' : p.badge}</span>}
      <div className="flex flex-1 flex-col px-1.5 pt-3 pb-1 text-center">
        {cat && <span className="block truncate text-[11px] font-medium text-[var(--p-gold-700)]">{cat.name}</span>}
        <h3 className="mt-0.5 line-clamp-2 text-[14px] font-bold leading-6 text-primary">
          <Link to={productPath(p.id)}>{p.name}</Link>
        </h3>
                <p className="tabular mt-auto pt-2 leading-tight">
          <span className={cn('text-[15px] font-bold', sale ? 'text-danger' : 'text-primary')}>{money(effectivePrice(p))}</span>
          {sale && <s className="ms-1.5 text-xs text-muted-foreground">{money(p.price)}</s>}
        </p>
        <AddButton add={add} p={p} compact className="mt-2.5 w-full" />
      </div>
    </article>
  )
}
