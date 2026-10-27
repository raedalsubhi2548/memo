import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/state.jsx'
import { money, effectivePrice } from '@/lib/format.js'
import { coverFor } from '@/lib/cover.js'
import { productPath } from '@/lib/slug.js'
import { trackAddToCart } from '@/lib/analytics.js'
import OptionsDialog from '@/components/OptionsDialog.jsx'

/** A clean white product card: the picture, the section, the name, the price and a round cart button. */
export default function ServiceTicket({ p, className }) {
  const { addToCart, toggleWish, wishlist, categories } = useApp()
  const cat = categories?.find((c) => c.id === p.categoryId)
  const wished = wishlist.includes(p.id)
  const sale = p.salePrice && p.salePrice < p.price
  // a product with options opens its choices first; one without goes straight to the cart
  const [choose, setChoose] = useState(false)
  const add = () => { if (p.options?.length) setChoose(true); else { addToCart(p.id); trackAddToCart(p, 1, effectivePrice(p)) } }
  return (
    <div className={cn('group relative h-full', className)}>
      <article className="relative flex h-full flex-col rounded-[18px] bg-white p-2.5 shadow-[0_1px_2px_rgb(125_63_76/0.06),0_18px_34px_-24px_rgb(125_63_76/0.45)] ring-1 ring-[var(--p-cream-200)] transition-[translate,box-shadow] duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-1 group-hover:shadow-[0_2px_4px_rgb(125_63_76/0.06),0_28px_44px_-24px_rgb(125_63_76/0.5)]">
        <Link to={productPath(p.id)} className="relative block overflow-hidden rounded-[14px] bg-[var(--p-cream-100)]">
          <img src={p.image} sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 260px" alt={p.name} loading="lazy" decoding="async" width="600" height="750"
            onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = 1; e.currentTarget.src = coverFor(p) } }}
            className="aspect-square w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.05]" />
        </Link>
        <button type="button" onClick={() => toggleWish(p.id)} aria-pressed={wished} aria-label={wished ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          className={cn('absolute top-[16px] end-[16px] z-10 grid size-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-colors', wished ? 'text-danger' : 'text-primary/60 hover:text-primary')}>
          <Heart className="size-[15px]" fill={wished ? 'currentColor' : 'none'} />
        </button>
        {(p.badge || sale) && <span className="absolute top-[20px] start-[18px] z-10 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-medium leading-none text-white">{sale ? 'خصم' : p.badge}</span>}
        <div className="flex flex-1 flex-col px-1.5 pt-3">
          {cat && <span className="mb-0.5 block truncate text-[11.5px] text-muted-foreground">{cat.name}</span>}
          <h3 className="line-clamp-2 min-h-[2.6rem] text-[14px] font-bold leading-[1.3rem] text-primary">
            <Link to={productPath(p.id)} className="after:absolute after:inset-0">{p.name}</Link>
          </h3>
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--p-cream-200)] pt-2.5">
            <p className="tabular leading-tight">
              <span className={cn('text-[15px] font-bold', sale ? 'text-danger' : 'text-primary')}>{money(effectivePrice(p))}</span>
              {sale && <s className="ms-1.5 text-xs text-muted-foreground">{money(p.price)}</s>}
            </p>
            <button type="button" onClick={add} aria-haspopup={p.options?.length ? 'dialog' : undefined} aria-label={p.options?.length ? `اختاري خيارات ${p.name}` : `أضيفي ${p.name} للسلة`}
              className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-primary text-white shadow-[0_8px_16px_-8px_rgb(125_63_76/0.8)] transition-[background-color,scale] duration-300 hover:scale-105 hover:bg-primary-hover active:scale-95">
              <ShoppingCart className="size-[17px]" />
            </button>
          </div>
        </div>
      </article>
      {p.options?.length > 0 && <OptionsDialog p={p} open={choose} onOpenChange={setChoose} />}
    </div>
  )
}
