import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Trash2 } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { money } from '@/lib/format.js'
import { productPath } from '@/lib/slug.js'
import OptionList from '@/components/OptionList.jsx'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Qty } from '@/components/ui/kit.jsx'

export { Qty }

export default function CartDrawer() {
  const { cartOpen, setCartOpen, lines, subtotal, setQty, count } = useApp()
  const nav = useNavigate()
  const close = () => setCartOpen(false)
  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="end" className="w-[min(420px,92vw)]">
        <header className="border-b border-border px-5 py-5 pe-16">
          <SheetTitle className="font-display text-xl font-semibold text-primary">السلة <span className="tabular text-base font-semibold text-muted-foreground">({count})</span></SheetTitle>
          <SheetDescription className="sr-only">المنتجات اللي أضفتيها للسلة</SheetDescription>
        </header>
        {lines.length === 0 ? (
          <div className="grid flex-1 place-content-center justify-items-center gap-4 p-8 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-sunken text-primary"><ShoppingBag className="size-7" /></span>
            <p className="text-muted-foreground">سلتك فاضية. اختاري من منتجاتنا اللي تدلّعك.</p>
            <Button asChild><Link to="/shop" onClick={close}>تصفّحي المنتجات</Link></Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
              {lines.map(({ key, product: p, qty, chosen, unit }) => (
                <li key={key} className="flex gap-3 py-4">
                  <img src={p.image} alt="" className="size-20 shrink-0 rounded-md object-cover" />
                  <div className="grid min-w-0 flex-1 content-start gap-1.5">
                    <Link to={productPath(p.id)} onClick={close} className="font-semibold leading-6 hover:underline">{p.name}</Link>
                    <OptionList items={chosen} />
                    <span className="tabular font-display font-semibold text-primary">{money(unit * qty)}</span>
                    <div className="flex items-center justify-between">
                      <Qty size="sm" value={qty} onChange={(q) => setQty(key, q)} />
                      <button onClick={() => setQty(key, 0)} className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label={`حذف ${p.name}`}><Trash2 className="size-4" /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="grid gap-3 border-t border-border bg-surface p-5">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">المجموع</span><strong className="tabular font-display text-2xl text-primary">{money(subtotal)}</strong></div>
              <Button size="lg" onClick={() => { close(); nav('/checkout') }}>إتمام الطلب</Button>
              <Button asChild variant="ghost"><Link to="/cart" onClick={close}>عرض السلة</Link></Button>
            </footer>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
