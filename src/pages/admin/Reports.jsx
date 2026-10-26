// التقارير: visitors (our own count, see api/hit.js) and sales for a chosen period, compared with the period before it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Eye, MousePointerClick, Timer, Wallet, Receipt, Percent, UserPlus, ArrowUp, ArrowDown, Download, RefreshCw, Globe, Smartphone, Clock3 } from 'lucide-react'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import { money, num } from '@/lib/format.js'
import { productPath, categoryPath } from '@/lib/slug.js'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Panel, Skeleton } from '@/components/ui/kit.jsx'
import { AdminHead, TableCard, Table, Th, Td } from '@/components/admin/ui.jsx'

const DAY = 864e5
const midnight = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const RANGES = [
  { id: 'today', label: 'اليوم', get: () => [midnight(), new Date()] },
  { id: 'yesterday', label: 'أمس', get: () => [new Date(midnight() - DAY), midnight()] },
  { id: '7', label: '٧ أيام', get: () => [new Date(midnight() - 6 * DAY), new Date()] },
  { id: '30', label: '٣٠ يوم', get: () => [new Date(midnight() - 29 * DAY), new Date()] },
  { id: '90', label: '٩٠ يوم', get: () => [new Date(midnight() - 89 * DAY), new Date()] },
  { id: 'month', label: 'هذا الشهر', get: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), n] } },
  { id: 'lastMonth', label: 'الشهر الماضي', get: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 1)] } },
]
const FIXED = { '/': 'الرئيسية', '/shop': 'كل المنتجات', '/reviews': 'آراء العملاء', '/contact': 'تواصل معنا', '/policies': 'السياسات', '/cart': 'السلة', '/checkout': 'إتمام الطلب', '/login': 'تسجيل الدخول', '/account': 'حسابي' }
const regions = (() => { try { return new Intl.DisplayNames(['ar'], { type: 'region' }) } catch { return null } })()
const country = (c) => (c && c !== '??' ? `${String.fromCodePoint(...[...c].map((x) => 0x1f1a5 + x.charCodeAt(0)))} ${regions?.of(c) || c}` : 'غير معروف')
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0)
const delta = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : null)
const dur = (s) => { s = Math.round(s || 0); if (s < 60) return `${s} ث`; const m = Math.floor(s / 60); return m < 60 ? `${m} د ${s % 60 ? `${s % 60} ث` : ''}`.trim() : `${Math.floor(m / 60)} س ${m % 60} د` }
const dayLabel = (d) => { const x = new Date(d + 'T12:00:00'); return `${x.getDate()}/${x.getMonth() + 1}` }
const longDay = (d) => new Date(d + 'T12:00:00').toLocaleDateString('ar-SA-u-nu-latn-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' })

function Kpi({ icon: I, label, value, change, hint, tone }) {
  return (
    <div className="rounded-lg bg-surface p-4 shadow-hairline ring-1 ring-border sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', tone || 'bg-sunken text-primary')}><I className="size-4" /></span>
      </div>
      <p className="tabular mt-2 font-display text-2xl font-semibold text-primary">{value}</p>
      {change != null ? (
        <p className={cn('mt-1 flex items-center gap-1 text-xs font-bold', change >= 0 ? 'text-success' : 'text-danger')}>
          {change >= 0 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
          <span className="tabular">{Math.abs(change)}%</span><span className="font-normal text-muted-foreground">عن الفترة السابقة</span>
        </p>
      ) : hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/** One series over the days, with a crosshair + tooltip on hover/touch. kind: 'line' | 'bars' */
function DayChart({ data, value, format, tip, kind = 'line', label }) {
  const [hov, setHover] = useState(null)
  const box = useRef(null)
  const hover = hov != null && hov < data.length ? hov : null
  const W = 720, H = 210, padX = 14, top = 14, base = H - 26
  const n = data.length
  const max = Math.max(...data.map(value), 1)
  const step = (W - padX * 2) / Math.max(n - (kind === 'bars' ? 0 : 1), 1)
  // RTL: the oldest day on the right, today on the left
  const x = (i) => (n === 1 ? W / 2 : kind === 'bars' ? W - padX - (i + 0.5) * step : W - padX - i * step)
  const y = (v) => base - (v / max) * (base - top)
  const pts = data.map((d, i) => [x(i), y(value(d))])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const tickEvery = Math.ceil(n / 8)
  const onMove = (e) => {
    const r = box.current.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    let best = 0
    pts.forEach((p, i) => { if (Math.abs(p[0] - px) < Math.abs(pts[best][0] - px)) best = i })
    setHover(best)
  }
  const bw = Math.max(2, Math.min(28, step - 4))
  return (
    <div className="relative">
      <svg ref={box} viewBox={`0 0 ${W} ${H}`} className="w-full touch-pan-y" role="img" aria-label={label}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        <defs><linearGradient id={`fill-${kind}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity=".18" /><stop offset="1" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
        {[0.5, 1].map((f) => <line key={f} x1="0" x2={W} y1={y(max * f)} y2={y(max * f)} stroke="var(--border)" strokeDasharray="3 6" />)}
        <line x1="0" x2={W} y1={base} y2={base} stroke="var(--border-strong)" />
        {kind === 'bars'
          ? data.map((d, i) => { const v = value(d); const h = base - y(v); return v > 0 && <path key={d.day} d={`M${x(i) - bw / 2},${base} v${-Math.max(h - 4, 0)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${Math.max(h - 4, 0)} z`} fill="var(--primary)" opacity={hover == null || hover === i ? 1 : 0.45} /> })
          : <>
            {n > 1 && <path d={`${line} L${pts.at(-1)[0]},${base} L${pts[0][0]},${base} Z`} fill={`url(#fill-${kind})`} />}
            {n > 1 ? <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /> : <circle cx={pts[0][0]} cy={pts[0][1]} r="4" fill="var(--primary)" />}
          </>}
        {hover != null && <>
          <line x1={pts[hover][0]} x2={pts[hover][0]} y1={top} y2={base} stroke="var(--muted-foreground)" strokeDasharray="2 4" />
          {kind !== 'bars' && <circle cx={pts[hover][0]} cy={pts[hover][1]} r="5" fill="var(--primary)" stroke="var(--surface)" strokeWidth="2" />}
        </>}
        {data.map((d, i) => i % tickEvery === 0 && <text key={d.day} x={x(i)} y={H - 6} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)" className="tabular">{dayLabel(d.day)}</text>)}
        <text x={W - 2} y={top - 2} textAnchor="end" fontSize="11" fill="var(--muted-foreground)" className="tabular">{format(max)}</text>
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-md bg-primary px-3 py-2 text-xs text-on-inverse shadow-card"
          style={{ left: `clamp(0px, calc(${(pts[hover][0] / W) * 100}% - 80px), calc(100% - 160px))` }}>
          <p className="mb-1 font-bold">{longDay(data[hover].day)}</p>
          {tip(data[hover]).map(([k, v]) => <p key={k} className="flex justify-between gap-4"><span className="opacity-75">{k}</span><span className="tabular font-bold">{v}</span></p>)}
        </div>
      )}
    </div>
  )
}

/** A ranked list with thin bars. rows: [{k, label, n, sub}] */
function BarList({ rows, total, empty = 'ما فيه بيانات في هذي الفترة.', unit = '' }) {
  if (!rows?.length) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
  const max = Math.max(...rows.map((r) => r.n), 1)
  return (
    <ol className="grid gap-3">
      {rows.map((r) => (
        <li key={r.k} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold" title={r.title || r.label}>{r.label}</span>
            <span className="tabular inline-flex shrink-0 items-baseline gap-2 font-bold text-primary"><span>{r.value ?? num(r.n)}{unit}</span>{total ? <span className="text-xs font-normal text-muted-foreground">{pct(r.n, total)}%</span> : null}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((r.n / max) * 100, 2)}%` }} /></div>
          {r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}
        </li>
      ))}
    </ol>
  )
}

function Funnel({ steps }) {
  const first = steps[0].n || 0
  return (
    <ol className="grid gap-3">
      {steps.map((s, i) => (
        <li key={s.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
          <span className="text-sm font-semibold">{s.label}</span>
          <span className="tabular text-sm font-bold text-primary">{num(s.n)} <span className="text-xs font-normal text-muted-foreground">{i ? `${pct(s.n, first)}%` : '100%'}</span></span>
          <div className="col-span-2 h-2.5 overflow-hidden rounded-full bg-sunken"><div className="h-full rounded-full bg-primary" style={{ width: `${first ? Math.max((s.n / first) * 100, s.n ? 2 : 0) : 0}%`, opacity: 1 - i * 0.18 }} /></div>
        </li>
      ))}
    </ol>
  )
}

function Hours({ rows }) {
  const by = Object.fromEntries((rows || []).map((r) => [r.k, r.n]))
  const max = Math.max(1, ...Object.values(by))
  const peak = Object.entries(by).sort((a, b) => b[1] - a[1])[0]
  const h12 = (h) => `${h % 12 || 12}${h < 12 ? 'ص' : 'م'}`
  return (
    <div>
      <div dir="ltr" className="flex h-28 items-end gap-[3px]" role="img" aria-label="الزيارات حسب ساعات اليوم">
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="group relative flex h-full flex-1 items-end">
            <div className="w-full rounded-t-[3px] bg-primary transition-opacity group-hover:opacity-70" style={{ height: `${by[h] ? Math.max((by[h] / max) * 100, 4) : 0}%` }} />
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[11px] text-on-inverse group-hover:block">{h12(h)}: {num(by[h] || 0)}</span>
          </div>
        ))}
      </div>
      <div className="tabular mt-1.5 flex justify-between text-[11px] text-muted-foreground" dir="ltr">{["12 ص", "6 ص", "12 م", "6 م", "11 م"].map((t) => <span key={t} dir="rtl">{t}</span>)}</div>
      {peak && <p className="mt-3 text-sm text-muted-foreground">أكثر وقت زيارات: <strong className="text-primary">{h12(+peak[0])} – {h12((+peak[0] + 1) % 24)}</strong></p>}
    </div>
  )
}

export default function Reports() {
  const { products, categories } = useApp()
  const [range, setRange] = useState('7')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [updated, setUpdated] = useState(null)

  const pageName = useMemo(() => {
    const m = { ...FIXED }
    for (const p of products || []) m[productPath(p.id)] = p.name
    for (const c of categories || []) m[categoryPath(c.id)] = c.name
    return (path) => m[path] || (path.startsWith('/order/') ? 'صفحة الطلب' : path)
  }, [products, categories])

  const load = useCallback(async (quiet) => {
    const [from, to] = RANGES.find((r) => r.id === range).get()
    if (!quiet) setBusy(true)
    try {
      const r = await api.adminReport(from.toISOString(), to.toISOString())
      setData(r); setError(''); setUpdated(new Date())
    } catch (e) {
      setError(/admin_report|function|schema cache/i.test(e.message) ? 'التقارير تحتاج تشغيل ملف reports.sql في Supabase أول مرة.' : e.message)
    } finally { setBusy(false) }
  }, [range])
  useEffect(() => { load() }, [load])
  // the live count and today's numbers refresh by themselves every minute
  useEffect(() => { const t = setInterval(() => document.visibilityState === 'visible' && load(true), 60e3); return () => clearInterval(t) }, [load])

  const exportCsv = () => {
    const rows = [['اليوم', 'الزوار', 'مشاهدات الصفحات', 'الطلبات المدفوعة', 'المبيعات'], ...data.daily.map((d) => [d.day, d.visitors, d.views, d.orders, d.revenue])]
    const blob = new Blob(['﻿' + rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `report-${range}-${new Date().toISOString().slice(0, 10)}.csv` })
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const head = (
    <AdminHead title="التقارير"
      action={<>
        <Button variant="outline" onClick={() => load()} disabled={busy} aria-label="تحديث"><RefreshCw className={cn('size-4', busy && 'animate-spin')} />تحديث</Button>
        {data && <Button variant="outline" onClick={exportCsv}><Download className="size-4" />تصدير Excel</Button>}
      </>} />
  )
  const chips = (
    <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="الفترة">
      {RANGES.map((r) => (
        <button key={r.id} type="button" role="tab" aria-selected={range === r.id} onClick={() => setRange(r.id)}
          className={cn('h-10 shrink-0 rounded-full px-4 text-sm font-semibold ring-1 transition-colors', range === r.id ? 'bg-primary text-on-inverse ring-primary' : 'bg-surface text-primary ring-border hover:ring-primary')}>{r.label}</button>
      ))}
    </div>
  )

  if (error && !data) return <>{head}{chips}<Panel><p className="py-8 text-center text-muted-foreground">{error}</p></Panel></>
  if (!data) return <>{head}{chips}<div className="grid gap-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-72" /></div></>

  const d = data
  const conv = pct(d.paidOrders, d.sessions)
  const aov = d.paidOrders ? d.revenue / d.paidOrders : 0
  const days = d.daily.length

  return (
    <>
      {head}
      {chips}

      {/* live */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary px-5 py-4 text-on-inverse">
        <div className="flex items-center gap-3">
          <span className="relative flex size-3"><span className={cn('absolute inline-flex size-full rounded-full bg-success opacity-75', d.live > 0 && 'motion-safe:animate-ping')} /><span className="relative inline-flex size-3 rounded-full bg-success" /></span>
          <p className="text-sm"><strong className="tabular font-display text-2xl">{num(d.live)}</strong> <span className="opacity-80">{d.live === 1 ? 'زائر' : 'زوار'} على المتجر الحين</span></p>
        </div>
        <p className="text-xs opacity-70">{updated && `${updated.toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' })}`}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icon={Users} label="الزوار" value={num(d.visitors)} change={delta(d.visitors, d.prev.visitors)} tone="bg-primary text-accent" />
        <Kpi icon={Eye} label="مشاهدات الصفحات" value={num(d.views)} change={delta(d.views, d.prev.views)} hint={d.sessions ? `${(d.views / d.sessions).toFixed(1)} صفحة لكل زيارة` : null} />
        <Kpi icon={MousePointerClick} label="الزيارات" value={num(d.sessions)} hint={`ارتداد ${d.bounce}%`} />
        <Kpi icon={Timer} label="متوسط مدة الزيارة" value={dur(d.avgDuration)} hint={`زوار جدد ${pct(d.newVisitors, d.visitors)}%`} />
        <Kpi icon={Wallet} label="المبيعات" value={money(d.revenue)} change={delta(d.revenue, d.prev.revenue)} tone="bg-accent/30 text-accent-text" />
        <Kpi icon={Receipt} label="الطلبات المدفوعة" value={num(d.paidOrders)} change={delta(d.paidOrders, d.prev.orders)} hint={d.pending ? `${num(d.pending)} بانتظار الدفع` : null} />
        <Kpi icon={Percent} label="معدل التحويل" value={`${conv}%`} />
        <Kpi icon={UserPlus} label="عملاء جدد" value={num(d.newCustomers)} hint={d.paidOrders ? `متوسط الطلب ${money(aov)}` : null} />
      </div>


      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="الزوار يومياً">
          <DayChart data={d.daily} value={(x) => x.visitors} format={num} label={`الزوار يومياً لآخر ${days} يوم`}
            tip={(x) => [['الزوار', num(x.visitors)], ['المشاهدات', num(x.views)], ['طلبات مدفوعة', num(x.orders)]]} />
        </Panel>
        <Panel title="المبيعات يومياً">
          <DayChart kind="bars" data={d.daily} value={(x) => x.revenue} format={(v) => money(v)} label={`المبيعات يومياً لآخر ${days} يوم`}
            tip={(x) => [['المبيعات', money(x.revenue)], ['الطلبات', num(x.orders)], ['الزوار', num(x.visitors)]]} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="رحلة الشراء">
          <Funnel steps={[
            { label: 'زاروا المتجر', n: d.visitors },
            { label: 'أضافوا للسلة', n: d.carts },
            { label: 'بدأوا الدفع', n: d.checkouts },
            { label: 'اشتروا', n: d.buyers },
          ]} />
        </Panel>
        <Panel title="أوقات الزيارات"><Hours rows={d.hours} /></Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="أكثر الصفحات زيارة">
          <BarList rows={d.pages.map((p) => ({ k: p.k, label: pageName(p.k), title: p.k, n: p.n, sub: `${num(p.u)} زائر` }))} />
        </Panel>
        <Panel title="من وين جو الزوار">
          <BarList total={d.sessions} rows={d.sources.map((s) => ({ k: s.k, label: s.k, n: s.n }))} />
          {d.campaigns.length > 0 && <>
            <h3 className="mb-3 mt-6 text-sm font-bold text-muted-foreground">الحملات (utm_campaign)</h3>
            <BarList rows={d.campaigns.map((s) => ({ k: s.k, label: s.k, n: s.n }))} />
          </>}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title={<span className="flex items-center gap-2"><Globe className="size-4 text-muted-foreground" />الدول</span>}>
          <BarList total={d.visitors} rows={d.countries.map((c) => ({ k: c.k, label: country(c.k), n: c.n }))} />
        </Panel>
        <Panel title="المدن">
          <BarList total={d.visitors} rows={d.cities.map((c) => ({ k: c.k, label: c.k, n: c.n }))} />
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><Smartphone className="size-4 text-muted-foreground" />الأجهزة</span>}>
          <BarList total={d.visitors} rows={d.devices.map((c) => ({ k: c.k, label: c.k, n: c.n }))} />
          <h3 className="mb-3 mt-6 text-sm font-bold text-muted-foreground">المتصفح / التطبيق</h3>
          <BarList total={d.visitors} rows={d.browsers.map((c) => ({ k: c.k, label: c.k, n: c.n }))} />
          <h3 className="mb-3 mt-6 text-sm font-bold text-muted-foreground">النظام</h3>
          <BarList total={d.visitors} rows={d.systems.map((c) => ({ k: c.k, label: c.k, n: c.n }))} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="أكثر المنتجات مبيعاً" action={<Link to="/admin/products" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">المنتجات</Link>}>
          <BarList empty="ما فيه مبيعات في هذي الفترة." rows={d.products.map((p) => ({ k: p.id, label: p.k, n: Number(p.n), value: money(p.n), sub: `${num(p.qty)} مبيع` }))} />
        </Panel>
        <Panel title="كوبونات الخصم" action={<Link to="/admin/coupons" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">الكوبونات</Link>}>
          <BarList empty="ما فيه كوبونات مستخدمة في هذي الفترة." rows={d.coupons.map((c) => ({ k: c.k, label: c.k, n: Number(c.n), sub: `خصم ${money(c.d)}` }))} unit=" طلب" />
          {d.discount > 0 && <p className="mt-4 text-sm text-muted-foreground">إجمالي الخصومات: <strong className="text-primary">{money(d.discount)}</strong></p>}
        </Panel>
      </div>

      <section className="mt-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-primary"><Clock3 className="size-4 text-muted-foreground" />الزوار الحين</h2>
        {d.liveList.length === 0 ? <p className="rounded-lg bg-surface px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-border">ما فيه أحد على المتجر الحين.</p> : (
          <TableCard>
            <Table className="min-w-[560px]">
              <thead><tr><Th>الصفحة</Th><Th>المكان</Th><Th>الجهاز</Th><Th>جاء من</Th><Th>آخر نشاط</Th></tr></thead>
              <tbody>{d.liveList.map((v) => (
                <tr key={v.vid}>
                  <Td className="max-w-56 truncate font-semibold" title={v.path}>{pageName(v.path)}</Td>
                  <Td>{country(v.country)}{v.city ? ` · ${v.city}` : ''}</Td>
                  <Td>{v.device}</Td>
                  <Td>{v.source}</Td>
                  <Td className="tabular text-muted-foreground">{Math.max(0, Math.round((Date.now() - new Date(v.at)) / 60e3))} د</Td>
                </tr>
              ))}</tbody>
            </Table>
          </TableCard>
        )}
      </section>

      <details className="mt-4 rounded-lg bg-surface ring-1 ring-border">
        <summary className="cursor-pointer px-5 py-4 font-semibold text-primary">الأرقام يوم بيوم</summary>
        <div className="overflow-x-auto border-t border-border">
          <Table className="min-w-[480px]">
            <thead><tr><Th>اليوم</Th><Th>الزوار</Th><Th>المشاهدات</Th><Th>طلبات مدفوعة</Th><Th>المبيعات</Th></tr></thead>
            <tbody>{[...d.daily].reverse().map((x) => (
              <tr key={x.day}><Td>{longDay(x.day)}</Td><Td className="tabular">{num(x.visitors)}</Td><Td className="tabular">{num(x.views)}</Td><Td className="tabular">{num(x.orders)}</Td><Td className="tabular font-semibold">{money(x.revenue)}</Td></tr>
            ))}</tbody>
          </Table>
        </div>
      </details>

    </>
  )
}
