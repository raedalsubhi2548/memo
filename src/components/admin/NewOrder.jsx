import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Trash2, UserPlus } from 'lucide-react'
import { api } from '@/lib/api.js'
import { money, optKey, unitPrice, missingOptions } from '@/lib/format.js'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea, Qty } from '@/components/ui/kit.jsx'
import { IconBtn } from '@/components/admin/ui.jsx'
import NewCustomer from '@/components/admin/NewCustomer.jsx'

const key = () => Math.random().toString(36).slice(2)

/** A new order from the dashboard: a customer, store services (with their options) and/or free lines, an optional
 *  discount, and whether it is already paid. The database prices the store services, like checkout. */
export default function NewOrder({ onDone }) {
  const [customers, setCustomers] = useState(null)
  const [products, setProducts] = useState([])
  const [userId, setUserId] = useState('')
  const [who, setWho] = useState('')
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [lines, setLines] = useState([])
  const [discount, setDiscount] = useState('')
  const [status, setStatus] = useState('pending')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.listCustomers().then((l) => setCustomers([...l].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))).catch(() => setCustomers([]))
    api.getProducts({ includeHidden: true }).then(setProducts).catch(() => setProducts([]))
  }, [])

  const found = useMemo(() => (customers || []).filter((c) => !who || ((c.name || '') + ' ' + (c.email || '') + ' ' + (c.phone || '')).includes(who.trim())).slice(0, 8), [customers, who])
  const chosen = customers?.find((c) => c.id === userId)
  const byId = (id) => products.find((p) => p.id === id)
  const linePrice = (l) => (l.productId ? (byId(l.productId) ? unitPrice(byId(l.productId), l.sel) : 0) : Number(l.price) || 0)
  const subtotal = lines.reduce((s, l) => s + linePrice(l) * l.qty, 0)
  const disc = Math.min(subtotal, Math.max(0, Number(discount) || 0))
  const patch = (k, f) => setLines((ls) => ls.map((l) => (l.k === k ? { ...l, ...f(l) } : l)))
  const pick = (l, o, v) => patch(l.k, () => {
    const k = optKey(o, v)
    if (l.sel.includes(k)) return { sel: l.sel.filter((x) => x !== k) }
    return { sel: [...(o.type === 'radio' ? l.sel.filter((x) => !x.startsWith(o.id + ':')) : l.sel), k] }
  })

  const save = async () => {
    setErr('')
    if (!userId) { setErr('اختر العميل'); return }
    if (!lines.length) { setErr('أضف منتج واحد على الأقل'); return }
    for (const l of lines) {
      if (l.productId) { const miss = missingOptions(byId(l.productId), l.sel); if (miss.length) { setErr(`اختر: ${miss.join('، ')}`); return } }
      else if (!l.name.trim()) { setErr('اكتب اسم البند'); return }
      else if (!(Number(l.price) >= 0) || l.price === '') { setErr('اكتب سعر البند'); return }
    }
    setBusy(true)
    try {
      const o = await api.adminCreateOrder({
        userId, status, notes, discount: disc,
        items: lines.map((l) => (l.productId ? { product_id: l.productId, qty: l.qty, options: l.sel } : { name: l.name.trim(), price: Number(l.price), qty: l.qty })),
      })
      api.notifyOrder?.(o.id, status === 'paid' ? 'paid' : 'created')
      onDone(o)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 rounded-lg bg-surface p-4 ring-1 ring-border">
        <h3 className="text-xs font-bold text-muted-foreground">العميل</h3>
        {chosen ? (
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sunken font-display font-semibold text-primary">{(chosen.name || chosen.email || '؟').charAt(0)}</span>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{chosen.name}</p><p className="truncate text-xs text-muted-foreground" dir="ltr">{chosen.email}</p></div>
            <Button variant="outline" size="sm" onClick={() => setUserId('')}>تغيير</Button>
          </div>
        ) : addingCustomer ? (
          <NewCustomer compact onCancel={() => setAddingCustomer(false)} onDone={(c) => { setCustomers((l) => [c, ...(l || [])]); setUserId(c.id); setAddingCustomer(false) }} />
        ) : (
          <>
            <Input value={who} onChange={(e) => setWho(e.target.value)} placeholder="ابحث بالاسم أو البريد أو الجوال" aria-label="ابحث عن عميل" />
            <ul className="grid max-h-64 gap-1 overflow-y-auto">
              {found.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setUserId(c.id)} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-start hover:bg-sunken">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{c.name || c.email}</span><span className="block truncate text-xs text-muted-foreground" dir="ltr">{c.email}{c.phone ? ` · ${c.phone}` : ''}</span></span>
                  </button>
                </li>
              ))}
              {customers && !found.length && <li className="px-2 py-2 text-sm text-muted-foreground">ما فيه عميل بهذا الاسم</li>}
            </ul>
            <Button variant="outline" size="sm" onClick={() => setAddingCustomer(true)}><UserPlus className="size-4" />عميل جديد</Button>
          </>
        )}
      </section>

      <section className="grid gap-3 rounded-lg bg-surface p-4 ring-1 ring-border">
        <h3 className="text-xs font-bold text-muted-foreground">المنتجات</h3>
        {lines.map((l) => {
          const p = l.productId && byId(l.productId)
          return (
            <div key={l.k} className="grid gap-3 rounded-md border border-border p-3">
              <div className="flex items-start gap-2">
                {l.productId ? (
                  <Select value={l.productId} onChange={(e) => patch(l.k, () => ({ productId: e.target.value, sel: [] }))} aria-label="الخدمة" className="flex-1">
                    {products.map((x) => <option key={x.id} value={x.id}>{x.name}{x.active ? '' : ' (مخفية)'}</option>)}
                  </Select>
                ) : (
                  <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_8rem]">
                    <Input value={l.name} maxLength={120} onChange={(e) => patch(l.k, () => ({ name: e.target.value }))} placeholder="اسم البند" aria-label="اسم البند" />
                    <Input value={l.price} inputMode="decimal" dir="ltr" onChange={(e) => patch(l.k, () => ({ price: e.target.value.replace(/[^\d.]/g, '') }))} placeholder="السعر" aria-label="السعر" className="text-end" />
                  </div>
                )}
                <IconBtn tone="danger" onClick={() => setLines((ls) => ls.filter((x) => x.k !== l.k))} aria-label="حذف البند" className="mt-1.5"><Trash2 className="size-4" /></IconBtn>
              </div>
              {p?.options?.map((o) => (
                <fieldset key={o.id} className="grid gap-1.5">
                  <legend className="mb-1 text-xs font-bold">{o.name}{o.required && <span className="text-danger"> *</span>}</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {o.values.map((v) => {
                      const on = l.sel.includes(optKey(o, v))
                      return (
                        <button key={v.id} type="button" role={o.type === 'radio' ? 'radio' : 'checkbox'} aria-checked={on} onClick={() => pick(l, o, v)}
                          className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 transition-colors', on ? 'bg-primary text-on-inverse ring-primary' : 'ring-border hover:ring-primary')}>
                          {on && <Check className="size-3" strokeWidth={3} />}{v.name}{Number(v.price) > 0 && <span className="tabular opacity-80">+{money(v.price)}</span>}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              ))}
              <div className="flex items-center justify-between gap-3">
                <Qty size="sm" value={l.qty} onChange={(v) => patch(l.k, () => ({ qty: Math.max(1, Math.min(999, v)) }))} />
                <strong className="tabular text-sm text-primary">{money(linePrice(l) * l.qty)}</strong>
              </div>
            </div>
          )
        })}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!products.length} onClick={() => setLines((ls) => [...ls, { k: key(), productId: products.find((x) => x.active)?.id || products[0].id, sel: [], qty: 1 }])}><Plus className="size-4" />منتج من المتجر</Button>
          <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, { k: key(), productId: '', name: '', price: '', qty: 1 }])}><Plus className="size-4" />بند خاص</Button>
        </div>
      </section>

      <section className="grid gap-3 rounded-lg bg-surface p-4 ring-1 ring-border">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="خصم (ر.س)"><Input value={discount} inputMode="decimal" dir="ltr" onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" className="text-end" /></Field>
          <Field label="حالة الدفع">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">بانتظار الدفع</option>
              <option value="paid">مدفوع</option>
            </Select>
          </Field>
        </div>
        <Field label="ملاحظات"><Textarea rows={2} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} /></Field>
        <dl className="grid gap-1.5 border-t border-dashed border-border-strong pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">المجموع</dt><dd className="tabular">{money(subtotal)}</dd></div>
          {disc > 0 && <div className="flex justify-between text-success"><dt>خصم</dt><dd className="tabular">− {money(disc)}</dd></div>}
          <div className="flex justify-between pt-1 font-display text-base font-semibold text-primary"><dt>الإجمالي</dt><dd className="tabular">{money(subtotal - disc)}</dd></div>
        </dl>
        {err && <p className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{err}</p>}
        <Button onClick={save} disabled={busy}>{busy ? 'جاري الإنشاء…' : 'إنشاء الطلب'}</Button>
      </section>
    </div>
  )
}
