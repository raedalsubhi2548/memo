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

/** A product: its picture large and square-cornered, then the name, the price and the bag button. No frame around it. */
export default function ServiceTicket({ p, className }) {
  const { addToCart, toggleWish, wishlist, categories } = useApp()
  const cat = categories?.find((c) => c.id === p.categoryId)
  const wished = wishlist.includes(p.id)
  const sale = p.salePrice && p.salePrice < p.price
  // a product with options opens its choices first; one without goes straight to the cart
  const [choose, setChoose] = useState(false)
  const add = () => { if (p.options?.length) setChoose(true); else { addToCart(p.id); trackAddToCart(p, 1, effectivePrice(p)) } }
  return (
    <article className={cn('group relative flex h-full flex-col', className)}>
      <Link to={productPath(p.id)} className="relative block overflow-hidden bg-sunken">
        <img src={p.image} sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 280px" alt={p.name} loading="lazy" decoding="async" width="600" height="750"
          onError={(e) => { if (!e.currentTarget.dataset.fb) { e.currentTarget.dataset.fb = 1; e.currentTarget.src = coverFor(p) } }}
          className="aspect-[4/5] w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.05]" />
        {(p.badge || sale) && <span className="absolute top-0 start-0 bg-primary px-3 py-1.5 text-[13px] font-bold text-primary-foreground">{sale ? 'خصم' : p.badge}</span>}
      </Link>
      <button type="button" onClick={() => toggleWish(p.id)} aria-pressed={wished} aria-label={wished ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        className={cn('absolute top-2 end-2 z-10 grid size-10 place-items-center bg-background transition-colors', wished ? 'text-danger' : 'text-primary hover:bg-sunken')}>
        <Heart className="size-[17px]" fill={wished ? 'currentColor' : 'none'} />
      </button>
      <div className="flex flex-1 flex-col pt-4">
        <h3 className="font-display text-[19px] font-extrabold leading-snug text-primary sm:text-[21px]">
          <Link to={productPath(p.id)} className="hover:underline">{p.name}</Link>
        </h3>
        <p className="tabular mt-1 text-[17px] font-bold text-primary">
          <span className={cn(sale && 'text-danger')}>{money(effectivePrice(p))}</span>
          {sale && <s className="ms-2 text-[14px] font-normal text-muted-foreground">{money(p.price)}</s>}
        </p>
        {cat && <p className="text-[16px] text-muted-foreground">{cat.name}</p>}
        <button type="button" onClick={add} aria-haspopup={p.options?.length ? 'dialog' : undefined} aria-label={p.options?.length ? `اختاري خيارات ${p.name}` : `أضيفي ${p.name} للسلة`}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 bg-primary text-[15px] font-bold text-primary-foreground transition-colors hover:bg-primary-hover active:scale-[.98]">
          <ShoppingBag className="size-4" />أضيفي للسلة
        </button>
      </div>
      {p.options?.length > 0 && <OptionsDialog p={p} open={choose} onOpenChange={setChoose} />}
    </article>
  )
}
