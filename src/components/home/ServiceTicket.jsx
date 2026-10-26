import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/state.jsx'
import { money, effectivePrice } from '@/lib/format.js'
import { coverFor } from '@/lib/cover.js'
import { productPath } from '@/lib/slug.js'
import { trackAddToCart } from '@/lib/analytics.js'
import OptionsDialog from '@/components/OptionsDialog.jsx'

/** A product on a blush stage: tall photo, a soft glow under it, name and price, and a bag button. */
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
      <article className="relative flex h-full flex-col overflow-hidden rounded-[26px] bg-white/80 p-2 shadow-[0_1px_2px_color-mix(in_srgb,var(--p-green-900)_6%,transparent),0_24px_44px_-30px_color-mix(in_srgb,var(--p-green-900)_55%,transparent)] ring-1 ring-[var(--p-gold-400)]/50 backdrop-blur transition-[translate,box-shadow] duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-1.5 group-hover:shadow-[0_2px_4px_color-mix(in_srgb,var(--p-green-900)_6%,transparent),0_34px_60px_-30px_color-mix(in_srgb,var(--p-green-900)_65%,transparent)]">
        <Link to={productPath(p.id)} className="relative block overflow-hidden rounded-[20px] bg-[radial-gradient(90%_70%_at_50%_30%,#fffaf8,var(--p-gold-100)_60%,var(--p-gold-200))]">
          <img src={p.image} sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 280px" alt={p.name} loading="lazy" decoding="async" width="600" height="750" onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = 1; e.currentTarget.src = coverFor(p) } }}
            className="aspect-[4/5] w-full object-cover transition-transform duration-[1.6s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]" />
          {/* a soft sheen that crosses the photo on hover */}
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_35%,rgb(255_255_255/0.45)_50%,transparent_65%)] transition-transform duration-[1.2s] ease-out group-hover:translate-x-full" aria-hidden="true" />
        </Link>
        <button type="button" onClick={() => toggleWish(p.id)} aria-pressed={wished} aria-label={wished ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          className={cn('absolute top-4 end-4 z-10 grid size-10 place-items-center rounded-full bg-white/85 shadow-sm ring-1 ring-white backdrop-blur transition-colors', wished ? 'text-danger' : 'text-primary/60 hover:text-primary')}>
          <Heart className="size-[16px]" fill={wished ? 'currentColor' : 'none'} />
        </button>
        {(p.badge || sale) && (
          <span className="absolute top-5 start-5 z-10 max-w-[calc(100%-80px)] truncate rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold leading-none text-primary shadow-sm backdrop-blur">{sale ? 'خصم' : p.badge}</span>
        )}
        <div className="flex flex-1 flex-col px-2.5 pt-3.5 pb-1.5 text-center">
          {cat && <span className="mb-0.5 block truncate text-[11.5px] tracking-wide text-accent-text">{cat.name}</span>}
          <h3 className="line-clamp-2 font-display text-[16px] leading-[1.6] text-primary sm:text-[17px]">
            <Link to={productPath(p.id)} className="after:absolute after:inset-0">{p.name}</Link>
          </h3>
          <p className="tabular mt-1 leading-tight">
            <span className={cn('text-[16px] font-bold', sale ? 'text-danger' : 'text-primary')}>{money(effectivePrice(p))}</span>
            {sale && <s className="ms-1.5 text-xs text-muted-foreground">{money(p.price)}</s>}
          </p>
          <button type="button" onClick={add} aria-haspopup={p.options?.length ? 'dialog' : undefined} aria-label={p.options?.length ? `اختاري خيارات ${p.name}` : `أضيفي ${p.name} للسلة`}
            className="relative z-10 mx-auto mt-3 inline-flex h-10 w-full max-w-[190px] items-center justify-center gap-2 rounded-full bg-primary text-[13.5px] font-semibold text-on-inverse shadow-[0_10px_20px_-12px_color-mix(in_srgb,var(--p-green-900)_80%,transparent)] transition-[background-color,scale] duration-300 hover:bg-primary-hover active:scale-95">
            <ShoppingBag className="size-4" />أضيفي للسلة
          </button>
        </div>
      </article>
      {p.options?.length > 0 && <OptionsDialog p={p} open={choose} onOpenChange={setChoose} />}
    </div>
  )
}
