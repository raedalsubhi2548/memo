import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { MessageCircle, Mail, Phone, CreditCard, Landmark, Inbox, ChevronLeft, Copy, FileText, Link2, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import { ORDER_STATUSES } from '@/data/seed.js'
import { money, dateTime } from '@/lib/format.js'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Field, Select, Textarea, Skeleton, StatusPill, OrderTracker, statusLabel } from '@/components/ui/kit.jsx'
import { AdminHead, SearchBox, Segments, TableCard, Table, Th, Td, useConfirm } from '@/components/admin/ui.jsx'
import NewOrder from '@/components/admin/NewOrder.jsx'
import { can } from '@/lib/perms.js'
import { STORE_ORIGIN } from '@/lib/host.js'
import { addressLine } from '@/lib/address.js'
const payLabel = (o) => (o.paymentRef === 'manual' ? 'طلب يدوي' : o.paymentMethod === 'bank' ? 'تحويل بنكي' : 'دفع إلكتروني')
import OptionList from '@/components/OptionList.jsx'

const waPhone = (p) => (p || '').replace(/\D/g, '').replace(/^0/, '966')

function OrderDetail({ order, onSaved, owner, onDeleted }) {
  const { notify } = useApp()
  const confirm = useConfirm()
  const [status, setStatus] = useState(order.status)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const phone = waPhone(order.customer?.phone)
  const save = async () => {
    setBusy(true)
    try { await api.updateOrderStatus(order.id, status, note); api.notifyOrder?.(order.id, status); notify('تم تحديث حالة الطلب وإشعار العميل'); setNote(''); onSaved() } catch (e) { notify(e.message, 'err') } finally { setBusy(false) }
  }
  const sub = order.items.reduce((s, it) => s + it.price * it.qty, 0)
  const payLink = `${STORE_ORIGIN}/order/${order.id}`
  const copyLink = async () => { try { await navigator.clipboard.writeText(payLink); notify('نُسخ رابط الدفع') } catch { notify('ما قدرنا ننسخ', 'err') } }
  const remove = async () => {
    if (!(await confirm({ title: `حذف الطلب #${order.number}؟` }))) return
    try { await api.deleteOrder(order.id); notify('حُذف الطلب'); onDeleted() } catch (e) { notify(e.message, 'err') }
  }
  return (
    <div className="grid gap-5">
      <div className="rounded-lg bg-surface p-4 ring-1 ring-border"><OrderTracker status={order.status} /></div>

      <section className="rounded-lg bg-surface p-4 ring-1 ring-border">
        <h3 className="mb-3 text-xs font-bold text-muted-foreground">العميل</h3>
        <p className="font-display text-lg font-semibold text-primary">{order.customer?.name}</p>
        <div className="mt-2 grid gap-1.5 text-sm">
          {order.customer?.email && <a href={`mailto:${order.customer.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary"><Mail className="size-4" /><span dir="ltr">{order.customer.email}</span></a>}
          {order.customer?.phone && <a href={`tel:${order.customer.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary"><Phone className="size-4" /><span dir="ltr">{order.customer.phone}</span></a>}
        </div>
        {phone && (
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <a href={`https://wa.me/${phone}?text=${encodeURIComponent(`السلام عليكم ${order.customer?.name || ''}، معك عناية ميمي بخصوص طلبك رقم #${order.number}`)}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />راسلي العميلة على واتساب</a>
          </Button>
        )}
      </section>

      {order.shipping && (
        <section className="rounded-lg bg-surface p-4 ring-1 ring-border">
          <h3 className="mb-3 text-xs font-bold text-muted-foreground">عنوان الشحن</h3>
          <p className="font-mono text-lg font-semibold tracking-[0.15em] text-primary" dir="ltr">{order.shipping.shortAddress}</p>
          <p className="mt-1 text-sm leading-7" dir="auto">{addressLine({ ...order.shipping, shortAddress: '' })}</p>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigator.clipboard?.writeText(`${order.customer?.name || ''}
${order.customer?.phone || ''}
${addressLine(order.shipping)}`)}><Copy className="size-4" />نسخ العنوان للشحن</Button>
        </section>
      )}

      <section className="rounded-lg bg-surface p-4 ring-1 ring-border">
        <h3 className="mb-3 text-xs font-bold text-muted-foreground">المنتجات</h3>
        <ul className="grid gap-3">
          {order.items.map((it, idx) => (
            <li key={idx} className="grid grid-cols-[48px_1fr_auto] items-start gap-3">
              {it.image ? <img src={it.image} alt="" className="size-12 rounded-md object-cover" /> : <span className="size-12 rounded-md bg-sunken" />}
              <div className="min-w-0 text-sm"><p className="font-semibold leading-6">{it.name}{it.qty > 1 && <span className="tabular text-muted-foreground"> × {it.qty}</span>}</p><OptionList items={it.options} className="mt-1" />{it.note && <p className="mt-1 rounded bg-sunken px-2 py-1 text-xs leading-6 text-muted-foreground">{it.note}</p>}</div>
              <strong className="tabular text-sm text-primary">{money(it.price * it.qty)}</strong>
            </li>
          ))}
        </ul>
        {order.notes && <p className="mt-3 rounded-md border-s-4 border-accent bg-accent/10 p-3 text-sm leading-7">{order.notes}</p>}
        <dl className="mt-4 grid gap-1.5 border-t border-dashed border-border-strong pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">المجموع</dt><dd className="tabular">{money(sub)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between text-success"><dt>خصم <span dir="ltr">{order.coupon}</span></dt><dd className="tabular">− {money(order.discount)}</dd></div>}
          {order.shippingFee > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">الشحن</dt><dd className="tabular">{money(order.shippingFee)}</dd></div>}
          <div className="flex justify-between pt-1 font-display text-base font-semibold text-primary"><dt>الإجمالي</dt><dd className="tabular">{money(order.total)}</dd></div>
        </dl>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          {order.paymentMethod === 'bank' ? <Landmark className="size-4" /> : <CreditCard className="size-4" />}{payLabel(order)}
          {(order.paymentRef || order.tapId) && <span className="ms-auto truncate font-mono" dir="ltr">{String(order.paymentRef || order.tapId)}</span>}
        </p>
        {order.status === 'pending' && (
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={copyLink}><Link2 className="size-4" />نسخ رابط الدفع</Button>
        )}
        {!['pending', 'cancelled'].includes(order.status) && (
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => api.downloadInvoice(order).catch((e) => notify(e.message, 'err'))}><FileText className="size-4" />تحميل الفاتورة PDF</Button>
        )}
      </section>

      <section className="grid gap-3 rounded-lg bg-surface p-4 ring-1 ring-border">
        <h3 className="text-xs font-bold text-muted-foreground">تحديث الحالة</h3>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => (
            <button key={s.id} type="button" onClick={() => setStatus(s.id)} aria-pressed={status === s.id}
              className={cn('h-9 rounded-full px-3 text-xs font-bold ring-1 transition-colors', status === s.id ? 'bg-primary text-on-inverse ring-primary' : 'ring-border hover:ring-primary')}>{s.label}</button>
          ))}
        </div>
        <Field label="ملاحظة للعميل"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Button onClick={save} disabled={busy || (status === order.status && !note)}>{busy ? 'جاري الحفظ…' : 'حفظ التحديث'}</Button>
      </section>

      {order.history?.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-bold text-muted-foreground">السجل</h3>
          <ol className="relative grid gap-4 border-s-2 border-border ps-5">
            {[...order.history].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span className={cn('absolute -start-[27px] top-1.5 size-3 rounded-full ring-4 ring-background', i === 0 ? 'bg-accent' : 'bg-border-strong')} />
                <p className="text-sm font-bold text-primary">{statusLabel(h.status)}</p>
                <p className="text-xs text-muted-foreground">{dateTime(h.at)}</p>
                {h.note && <p className="mt-1 text-sm leading-7">{h.note}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {owner && <Button variant="ghost" className="text-danger hover:bg-danger-soft" onClick={remove}><Trash2 className="size-4" />حذف الطلب</Button>}
    </div>
  )
}

export default function Orders() {
  const { notify } = useApp()
  const access = useOutletContext()
  const confirm = useConfirm()
  const owner = !!access?.owner
  const [picked, setPicked] = useState(() => new Set()) // owner only: orders ticked for deleting together
  const [deleting, setDeleting] = useState(false)
  const [orders, setOrders] = useState(null)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const filter = params.get('status') || ''
  const load = () => api.allOrders().then(setOrders).catch(() => setOrders([]))
  useEffect(() => { load() }, [])
  const openId = params.get('open')
  const open = orders?.find((o) => o.id === openId)
  const creating = params.get('new') === '1'
  const setParam = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); setParams(n) }
  const shown = useMemo(() => (orders || []).filter((o) => (!filter || o.status === filter) && (!q || String(o.number).includes(q) || (o.customer?.name || '').includes(q) || (o.customer?.phone || '').includes(q) || (o.customer?.email || '').includes(q))), [orders, filter, q])
  const count = (id) => (orders || []).filter((o) => o.status === id).length
  const allPicked = shown.length > 0 && shown.every((o) => picked.has(o.id))
  const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(shown.map((o) => o.id)))
  const removePicked = async () => {
    const ids = [...picked].filter((id) => (orders || []).some((o) => o.id === id))
    if (!ids.length || !(await confirm({ title: `حذف ${ids.length} طلب نهائياً؟`, body: 'ما تقدر ترجعها بعد الحذف.' }))) return
    setDeleting(true)
    const gone = [], failed = []
    for (const id of ids) { try { await api.deleteOrder(id); gone.push(id) } catch { failed.push(id) } }
    setOrders((l) => (l || []).filter((o) => !gone.includes(o.id)))
    setPicked(new Set(failed)); setDeleting(false)
    notify(failed.length ? `حُذف ${gone.length}، وما انحذف ${failed.length}` : `حُذف ${gone.length} طلب`, failed.length ? 'err' : 'ok')
  }
  const Tick = ({ on, onChange, label }) => <input type="checkbox" checked={on} onChange={onChange} onClick={(e) => e.stopPropagation()} aria-label={label} className="size-[18px] cursor-pointer accent-[var(--primary)]" />
  const copyCsv = async () => {
    const rows = [['رقم', 'العميل', 'الجوال', 'الحالة', 'الإجمالي', 'التاريخ'], ...shown.map((o) => [o.number, o.customer?.name, o.customer?.phone, statusLabel(o.status), o.total, o.createdAt])]
    try { await navigator.clipboard.writeText(rows.map((r) => r.join('\t')).join('\n')); notify('نُسخت الطلبات، الصقها في Excel') } catch { notify('ما قدرنا ننسخ', 'err') }
  }

  return (
    <>
      <AdminHead title="الطلبات" lead={orders ? `${orders.length} طلب` : undefined} action={
        <div className="flex flex-wrap gap-2">
          {orders?.length > 0 && <Button variant="outline" size="sm" onClick={copyCsv}><Copy className="size-4" />نسخ الجدول</Button>}
          {can(access, 'customers') && <Button size="sm" onClick={() => setParam('new', '1')}><Plus className="size-4" />طلب جديد</Button>}
        </div>
      } />
      <div className="mb-4 grid gap-3">
        <Segments value={filter} onChange={(v) => setParam('status', v)} options={[{ id: '', label: 'الكل', count: orders?.length || 0 }, ...ORDER_STATUSES.map((s) => ({ id: s.id, label: s.label, count: count(s.id) }))]} />
        <SearchBox value={q} onChange={setQ} placeholder="رقم الطلب، اسم العميل، الجوال أو البريد" className="max-w-md" />
        {owner && shown.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><Tick on={allPicked} onChange={toggleAll} label="تحديد الكل" />تحديد الكل ({shown.length})</label>
            {picked.size > 0 && <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" disabled={deleting} onClick={removePicked}><Trash2 className="size-4" />{deleting ? 'جاري الحذف…' : `حذف المحدد (${picked.size})`}</Button>}
          </div>
        )}
      </div>

      {!orders ? <Skeleton className="h-96" /> : shown.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-lg border-2 border-dashed border-border-strong py-16 text-center"><Inbox className="size-8 text-muted-foreground" /><p className="text-muted-foreground">ما فيه طلبات هنا.</p></div>
      ) : (
        <>
          <ul className="grid gap-2 md:hidden">
            {shown.map((o) => (
              <li key={o.id} className="flex items-center gap-2">
                {owner && <Tick on={picked.has(o.id)} onChange={() => toggle(o.id)} label={`تحديد الطلب ${o.number}`} />}
                <button onClick={() => setParam('open', o.id)} className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-2 rounded-lg bg-surface p-4 text-start shadow-hairline ring-1 ring-border">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><strong className="tabular text-primary">#{o.number}</strong><StatusPill status={o.status} /></div>
                    <p className="mt-1 truncate text-sm">{o.customer?.name} · <span className="text-muted-foreground">{dateTime(o.createdAt)}</span></p>
                  </div>
                  <div className="flex items-center gap-1"><strong className="tabular text-sm text-primary">{money(o.total)}</strong><ChevronLeft className="size-4 text-muted-foreground" /></div>
                </button>
              </li>
            ))}
          </ul>
          <TableCard className="hidden md:block">
            <Table>
              <thead><tr>{owner && <Th className="w-10"><Tick on={allPicked} onChange={toggleAll} label="تحديد الكل" /></Th>}<Th>الطلب</Th><Th>العميل</Th><Th>المنتجات</Th><Th>الدفع</Th><Th>الحالة</Th><Th>الإجمالي</Th><Th>التاريخ</Th></tr></thead>
              <tbody>{shown.map((o) => (
                <tr key={o.id} className="cursor-pointer hover:bg-sunken/50 focus-visible:bg-sunken" onClick={() => setParam('open', o.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setParam('open', o.id)}>
                  {owner && <Td className="w-10"><Tick on={picked.has(o.id)} onChange={() => toggle(o.id)} label={`تحديد الطلب ${o.number}`} /></Td>}
                  <Td><strong className="tabular text-primary">#{o.number}</strong></Td>
                  <Td><p className="font-semibold">{o.customer?.name}</p><p className="text-xs text-muted-foreground" dir="ltr">{o.customer?.phone}</p></Td>
                  <Td className="max-w-56"><p className="truncate">{o.items.map((i) => i.name).join('، ')}</p></Td>
                  <Td className="text-muted-foreground">{o.paymentMethod === 'card' ? <CreditCard className="size-4" aria-label="بطاقة" /> : <Landmark className="size-4" aria-label="تحويل" />}</Td>
                  <Td><StatusPill status={o.status} /></Td>
                  <Td className="tabular font-semibold">{money(o.total)}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{dateTime(o.createdAt)}</Td>
                </tr>
              ))}</tbody>
            </Table>
          </TableCard>
        </>
      )}

      <Sheet open={!!open} onOpenChange={(o) => !o && setParam('open', '')}>
        <SheetContent side="end" className="w-[min(520px,100vw)] overflow-y-auto">
          {open && (
            <>
              <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4 pe-16 backdrop-blur">
                <SheetTitle className="tabular font-display text-xl font-semibold text-primary">طلب #{open.number}</SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">{dateTime(open.createdAt)}</SheetDescription>
              </div>
              <div className="p-5"><OrderDetail key={open.id + open.status} order={open} onSaved={load} owner={owner} onDeleted={() => { setOrders((l) => l.filter((x) => x.id !== open.id)); setPicked((p) => { const n = new Set(p); n.delete(open.id); return n }); setParam('open', '') }} /></div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={creating} onOpenChange={(o) => !o && setParam('new', '')}>
        <SheetContent side="end" className="w-[min(560px,100vw)] overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4 pe-16 backdrop-blur">
            <SheetTitle className="font-display text-xl font-semibold text-primary">طلب جديد</SheetTitle>
            <SheetDescription className="sr-only">إنشاء طلب</SheetDescription>
          </div>
          <div className="p-5">{creating && <NewOrder onDone={(o) => { setOrders((l) => [o, ...(l || [])]); const n = new URLSearchParams(params); n.delete('new'); n.set('open', o.id); setParams(n); notify(`أُنشئ الطلب #${o.number}`) }} />}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}
