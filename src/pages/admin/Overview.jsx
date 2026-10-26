import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Hourglass, CreditCard, Users, Package, Plus, ArrowUpLeft, ArrowUp, ArrowDown, Inbox } from 'lucide-react'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import { money, num, dateTime } from '@/lib/format.js'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Panel, Skeleton, StatusPill } from '@/components/ui/kit.jsx'
import { AdminHead, TableCard, Table, Th, Td } from '@/components/admin/ui.jsx'
import { ORDER_STATUSES } from '@/data/seed.js'

const isRevenue = (o) => !['pending', 'cancelled'].includes(o.status)
const DAY = 864e5
const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

function sumRange(orders, from, to) {
  return orders.filter((o) => isRevenue(o) && new Date(o.createdAt) >= from && new Date(o.createdAt) < to).reduce((s, o) => s + o.total, 0)
}

function SalesChart({ orders, days }) {
  const data = useMemo(() => {
    const today = startOfDay()
    return Array.from({ length: days }, (_, k) => {
      const d = new Date(today.getTime() - (days - 1 - k) * DAY)
      return { d, v: sumRange(orders, d, new Date(d.getTime() + DAY)) }
    })
  }, [orders, days])
  const max = Math.max(...data.map((x) => x.v), 1)
  const total = data.reduce((s, x) => s + x.v, 0)
  const W = 720, H = 200, pad = 8
  const step = (W - pad * 2) / Math.max(days - 1, 1)
  // RTL: today on the left edge, older days to the right
  const pts = data.map((x, i) => [W - pad - i * step, H - 12 - (x.v / max) * (H - 36)])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts.at(-1)[0]},${H} L${pts[0][0]},${H} Z`
  const tickEvery = days > 14 ? 5 : days > 7 ? 2 : 1
  return (
    <figure>
      <p className="tabular font-display text-3xl font-semibold text-primary">{money(total)}</p>
      <figcaption className="text-sm text-muted-foreground">المبيعات المدفوعة آخر {days} يوم · أعلى يوم {money(max === 1 ? 0 : max)}</figcaption>
      <svg viewBox={`0 0 ${W} ${H + 26}`} className="mt-4 w-full" role="img" aria-label={`رسم المبيعات آخر ${days} يوم`}>
        <defs>
          <linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".45" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H - 12 - f * (H - 36)} y2={H - 12 - f * (H - 36)} stroke="var(--border)" strokeDasharray="4 6" />)}
        <line x1="0" x2={W} y1={H - 12} y2={H - 12} stroke="var(--border-strong)" />
        <path d={area} fill="url(#sales-fill)" />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((x, i) => (
          <g key={i}>
            {x.v > 0 && <circle cx={pts[i][0]} cy={pts[i][1]} r="4" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2"><title>{x.d.toLocaleDateString('ar-SA-u-nu-latn-ca-gregory')}: {money(x.v)}</title></circle>}
            {i % tickEvery === 0 && <text x={pts[i][0]} y={H + 18} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)" className="tabular">{x.d.getDate()}/{x.d.getMonth() + 1}</text>}
          </g>
        ))}
      </svg>
    </figure>
  )
}

function Kpi({ icon: I, label, value, delta, to, tone }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <span className={cn('grid size-9 place-items-center rounded-full', tone || 'bg-sunken text-primary')}><I className="size-[18px]" /></span>
      </div>
      <p className="tabular mt-3 font-display text-2xl font-semibold text-primary sm:text-[28px]">{value}</p>
      {delta != null && (
        <p className={cn('mt-1 flex items-center gap-1 text-xs font-bold', delta >= 0 ? 'text-success' : 'text-danger')}>
          {delta >= 0 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
          <span className="tabular">{Math.abs(delta)}%</span><span className="font-normal text-muted-foreground">عن الأسبوع السابق</span>
        </p>
      )}
    </>
  )
  const cls = 'block rounded-lg bg-surface p-5 shadow-hairline ring-1 ring-border transition-shadow'
  return to ? <Link to={to} className={cn(cls, 'hover:shadow-card')}>{body}</Link> : <div className={cls}>{body}</div>
}

export default function Overview() {
  const { products, user } = useApp()
  const [orders, setOrders] = useState(null)
  const [customers, setCustomers] = useState([])
  const [days, setDays] = useState(14)
  useEffect(() => {
    api.allOrders().then(setOrders).catch(() => setOrders([]))
    api.listCustomers().then(setCustomers).catch(() => {})
  }, [])

  if (!orders) return <div className="grid gap-4"><Skeleton className="h-10 w-60" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div><Skeleton className="h-80" /></div>

  const revenue = orders.filter(isRevenue).reduce((s, o) => s + o.total, 0)
  const today = startOfDay()
  const thisWeek = sumRange(orders, new Date(today.getTime() - 6 * DAY), new Date(today.getTime() + DAY))
  const lastWeek = sumRange(orders, new Date(today.getTime() - 13 * DAY), new Date(today.getTime() - 6 * DAY))
  const delta = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null
  const open = orders.filter((o) => ['paid', 'in_progress', 'review'].includes(o.status))
  const awaiting = orders.filter((o) => o.status === 'pending')
  const top = Object.values(orders.filter(isRevenue).flatMap((o) => o.items).reduce((m, it) => {
    m[it.productId] = m[it.productId] || { id: it.productId, name: it.name, image: it.image, qty: 0, total: 0 }
    m[it.productId].qty += it.qty; m[it.productId].total += it.price * it.qty; return m
  }, {})).sort((a, b) => b.total - a.total).slice(0, 5)
  const topMax = top[0]?.total || 1
  const dist = ORDER_STATUSES.map((s) => ({ ...s, n: orders.filter((o) => o.status === s.id).length })).filter((s) => s.n)
  const hour = new Date().getHours()

  return (
    <>
      <AdminHead
        title={`${hour < 12 ? 'صباح الخير' : 'مساء الخير'}، ${user.name || ''}`}
        lead={open.length ? `عندك ${num(open.length)} طلب يحتاج تنفيذ.` : 'كل الطلبات المدفوعة منفّذة.'}
        action={<><Button asChild variant="outline"><Link to="/admin/orders">الطلبات</Link></Button><Button asChild><Link to="/admin/products/new"><Plus className="size-4" />منتج جديد</Link></Button></>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icon={Wallet} label="إجمالي المبيعات" value={money(revenue)} delta={delta} tone="bg-primary text-accent" />
        <Kpi icon={Hourglass} label="تحتاج تنفيذ" value={num(open.length)} to="/admin/orders?status=paid" tone="bg-accent/30 text-accent-text" />
        <Kpi icon={CreditCard} label="بانتظار الدفع" value={num(awaiting.length)} to="/admin/orders?status=pending" />
        <Kpi icon={Users} label="العملاء" value={num(customers.filter((c) => !c.kind || c.kind === 'customer').length)} to="/admin/customers" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="المبيعات" action={
          <div className="flex rounded-full bg-sunken p-1" role="tablist" aria-label="المدة">
            {[7, 14, 30].map((d) => <button key={d} role="tab" aria-selected={days === d} onClick={() => setDays(d)} className={cn('tabular h-8 rounded-full px-3 text-xs font-bold', days === d ? 'bg-surface text-primary shadow-hairline' : 'text-muted-foreground')}>{d} يوم</button>)}
          </div>
        }>
          <SalesChart orders={orders} days={days} />
        </Panel>

        <Panel title="الأكثر مبيعاً" action={<Link to="/admin/products" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">المنتجات</Link>}>
          {top.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">ما فيه مبيعات للحين.</p> : (
            <ol className="grid gap-4">
              {top.map((t, i) => (
                <li key={t.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                  <span className="tabular w-4 text-center font-display text-sm font-semibold text-accent-text">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.name}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-primary" style={{ width: `${(t.total / topMax) * 100}%` }} /></div>
                  </div>
                  <div className="text-end"><p className="tabular text-sm font-bold text-primary">{money(t.total)}</p><p className="tabular text-xs text-muted-foreground">{t.qty} مبيع</p></div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {dist.length > 0 && (
        <Panel title="توزيع الطلبات" className="mt-4">
          <div className="flex h-3 overflow-hidden rounded-full bg-sunken" role="img" aria-label="توزيع الطلبات حسب الحالة">
            {dist.map((s) => <span key={s.id} className={cn('h-full border-s-2 border-surface first:border-0', { pending: 'bg-warning', paid: 'bg-success', in_progress: 'bg-[#23507c]', review: 'bg-[#6a3a8a]', completed: 'bg-primary', cancelled: 'bg-danger' }[s.id])} style={{ width: `${(s.n / orders.length) * 100}%` }} />)}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {dist.map((s) => <li key={s.id}><Link to={`/admin/orders?status=${s.id}`} className="flex items-center gap-2 text-sm hover:underline"><StatusPill status={s.id} /><span className="tabular font-bold text-primary">{s.n}</span></Link></li>)}
          </ul>
        </Panel>
      )}

      <section className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-primary">أحدث الطلبات</h2>
          <Link to="/admin/orders" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">كل الطلبات<ArrowUpLeft className="size-4" /></Link>
        </div>
        {orders.length === 0 ? (
          <div className="grid justify-items-center gap-2 rounded-lg border-2 border-dashed border-border-strong py-12 text-center"><Inbox className="size-8 text-muted-foreground" /><p className="text-muted-foreground">ما فيه طلبات للحين.</p></div>
        ) : (
          <>
          <ul className="grid gap-2 md:hidden">
            {orders.slice(0, 6).map((o) => (
              <li key={o.id}>
                <Link to={`/admin/orders?open=${o.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-surface p-4 shadow-hairline ring-1 ring-border">
                  <div className="min-w-0"><div className="flex items-center gap-2"><strong className="tabular text-primary">#{o.number}</strong><StatusPill status={o.status} /></div><p className="mt-1 truncate text-sm text-muted-foreground">{o.customer?.name}</p></div>
                  <strong className="tabular shrink-0 text-sm text-primary">{money(o.total)}</strong>
                </Link>
              </li>
            ))}
          </ul>
          <TableCard className="hidden md:block">
            <Table>
              <thead><tr><Th>الطلب</Th><Th>العميل</Th><Th>الحالة</Th><Th>الإجمالي</Th><Th>التاريخ</Th></tr></thead>
              <tbody>{orders.slice(0, 6).map((o) => (
                <tr key={o.id} className="hover:bg-sunken/50">
                  <Td><Link to={`/admin/orders?open=${o.id}`} className="tabular font-bold text-primary hover:underline">#{o.number}</Link></Td>
                  <Td>{o.customer?.name}</Td>
                  <Td><StatusPill status={o.status} /></Td>
                  <Td className="tabular font-semibold">{money(o.total)}</Td>
                  <Td className="text-muted-foreground">{dateTime(o.createdAt)}</Td>
                </tr>
              ))}</tbody>
            </Table>
          </TableCard>
          </>
        )}
      </section>

      <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Package className="size-4" />{num(products.length)} منتج ظاهر في المتجر</p>
    </>
  )
}
