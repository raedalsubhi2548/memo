import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, ChevronLeft } from 'lucide-react'
import { api } from '@/lib/api.js'
import { money, date } from '@/lib/format.js'
import { Button } from '@/components/ui/button'
import { Empty, Skeleton, StatusPill } from '@/components/ui/kit.jsx'

export default function Orders() {
  const [orders, setOrders] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { api.myOrders().then(setOrders).catch((e) => setErr(e.message)) }, [])
  if (err) return <p className="rounded-md bg-danger-soft p-4 text-danger" role="alert">{err}</p>
  if (!orders) return <div className="grid gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
  if (!orders.length) return (
    <Empty icon={Receipt} title="ما عندك طلبات للحين" action={<Button asChild><Link to="/shop">تصفّحي المنتجات</Link></Button>}>أول طلب لك يبدأ من هنا.</Empty>
  )
  const active = orders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length
  const spent = orders.filter((o) => !['pending', 'cancelled'].includes(o.status)).reduce((s, o) => s + o.total, 0)
  return (
    <>
      <dl className="mb-6 grid grid-cols-3 gap-1 overflow-hidden">
        {[['كل الطلبات', orders.length], ['قيد المتابعة', active], ['إجمالي مشترياتك', money(spent)]].map(([l, v]) => (
          <div key={l} className="bg-sunken p-4 sm:p-5">
            <dt className="text-xs text-muted-foreground sm:text-sm">{l}</dt>
            <dd className="tabular mt-1 font-display text-lg font-semibold text-primary sm:text-2xl">{v}</dd>
          </div>
        ))}
      </dl>
      <ul className="grid gap-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link to={`/order/${o.id}`} className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg bg-surface p-4 shadow-hairline ring-1 ring-border transition-shadow hover:shadow-card">
              <div className="flex -space-x-4 space-x-reverse">
                {o.items.slice(0, 3).map((it) => <img key={it.productId} src={it.image} alt="" className="size-12 rounded-md object-cover ring-2 ring-surface" />)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><strong className="tabular font-display text-primary">طلب #{o.number}</strong><StatusPill status={o.status} /></div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{o.items.map((i) => i.name).join('، ')}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-end">
                  <strong className="tabular block font-display text-primary">{money(o.total)}</strong>
                  <span className="text-xs text-muted-foreground">{date(o.createdAt)}</span>
                </div>
                <ChevronLeft className="hidden size-5 text-muted-foreground transition-transform group-hover:-translate-x-1 sm:block" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
