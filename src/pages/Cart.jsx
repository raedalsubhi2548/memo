import { Link } from 'react-router-dom'
import { ShoppingBag, Trash2 } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { money } from '@/lib/format.js'
import { shippingFor } from '@/lib/theme.js'
import { productPath } from '@/lib/slug.js'
import OptionList from '@/components/OptionList.jsx'
import { Button } from '@/components/ui/button'
import { PageHead, Empty, Qty, Panel } from '@/components/ui/kit.jsx'

export default function Cart() {
  const { lines, subtotal, setQty, settings } = useApp()
  const ship = shippingFor(settings.shipping, subtotal)
  return (
    <div className="container-w py-10 sm:py-14">
      <PageHead title="السلة" />
      {lines.length === 0 ? (
        <Empty icon={ShoppingBag} title="سلتك فاضية" action={<Button asChild><Link to="/shop">تصفّحي المنتجات</Link></Button>}>اختاري من منتجاتنا اللي تدلّعك.</Empty>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
          <ul className="grid gap-3">
            {lines.map(({ key, product: p, qty, chosen, unit }) => (
              <li key={key} className="grid grid-cols-[72px_1fr] gap-4 rounded-[22px] bg-white/80 p-4 ring-1 ring-[var(--p-gold-400)]/60 sm:grid-cols-[88px_1fr_auto]">
                <img src={p.image} alt="" className="size-[72px] rounded-2xl object-cover sm:size-[88px]" />
                <div className="grid min-w-0 gap-1.5">
                  <Link to={productPath(p.id)} className="font-semibold leading-6 hover:underline">{p.name}</Link>
                  <OptionList items={chosen} />
                  <span className="tabular text-sm text-muted-foreground">{money(unit)} {p.perUnit || ''}</span>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:grid sm:justify-items-end">
                  <strong className="tabular font-display text-lg text-primary">{money(unit * qty)}</strong>
                  <div className="flex items-center gap-2">
                    <Qty size="sm" value={qty} onChange={(q) => setQty(key, q)} />
                    <button onClick={() => setQty(key, 0)} className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label={`حذف ${p.name}`}><Trash2 className="size-4" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Panel title="ملخص الطلب" className="lg:sticky lg:top-[calc(var(--header-height)+24px)]">
            <dl className="grid gap-2 border-b border-border pb-4">
              <div className="flex items-center justify-between text-sm"><dt className="text-muted-foreground">المنتجات</dt><dd className="tabular">{money(subtotal)}</dd></div>
              <div className="flex items-center justify-between text-sm"><dt className="text-muted-foreground">الشحن</dt><dd className="tabular">{ship > 0 ? money(ship) : 'مجاني'}</dd></div>
              <div className="flex items-center justify-between pt-1"><dt className="font-bold">الإجمالي</dt><dd className="tabular font-display text-2xl text-primary">{money(subtotal + ship)}</dd></div>
            </dl>
            <p className="my-4 text-sm text-muted-foreground">عنوان الشحن وكود الخصم والدفع في الخطوة التالية.</p>
            <div className="grid gap-2">
              <Button asChild size="lg"><Link to="/checkout">إتمام الطلب</Link></Button>
              <Button asChild variant="ghost"><Link to="/shop">كمّلي التسوّق</Link></Button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
