import { useEffect, useState } from 'react'
import { Plus, Trash2, TicketPercent, Copy } from 'lucide-react'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import { money, date } from '@/lib/format.js'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Panel, Skeleton, Switch } from '@/components/ui/kit.jsx'
import { AdminHead, IconBtn, useConfirm } from '@/components/admin/ui.jsx'

const BLANK = { code: '', type: 'percent', value: '', expiresAt: '' }

export default function Coupons() {
  const { notify } = useApp()
  const confirm = useConfirm()
  const [list, setList] = useState(null)
  const [f, setF] = useState(BLANK)
  const load = () => api.listCoupons().then(setList).catch(() => setList([]))
  useEffect(() => { load() }, [])
  const add = async (e) => {
    e.preventDefault()
    try { await api.saveCoupon({ ...f, value: Number(f.value), active: true, expiresAt: f.expiresAt ? `${f.expiresAt}T23:59:59+03:00` : null }); setF(BLANK); load(); notify('أُضيف الكود') } catch (er) { notify(er.message, 'err') }
  }
  const toggle = async (c) => { try { await api.saveCoupon({ ...c, active: !c.active }); load() } catch (e) { notify(e.message, 'err') } }
  const del = async (c) => {
    if (!(await confirm({ title: `حذف الكود ${c.code}؟`, body: 'العملاء ما يقدرون يستخدمونه بعد الحذف.' }))) return
    try { await api.deleteCoupon(c.code); load(); notify('حُذف الكود') } catch (e) { notify(e.message, 'err') }
  }
  const copy = async (code) => { try { await navigator.clipboard.writeText(code); notify('نُسخ الكود') } catch { /* ignore */ } }
  const expired = (c) => c.expiresAt && new Date(c.expiresAt) < new Date()

  return (
    <>
      <AdminHead title="كوبونات الخصم" />
      <Panel title="كود جديد" className="mb-6">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-end">
          <Field label="الكود"><Input required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') })} dir="ltr" placeholder="RAMADAN" className="font-mono" /></Field>
          <Field label="النوع"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="percent">نسبة %</option><option value="fixed">مبلغ ثابت (ر.س)</option></Select></Field>
          <Field label="القيمة"><Input required type="number" min="1" max={f.type === 'percent' ? 100 : undefined} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} dir="ltr" className="tabular" /></Field>
          <Field label="ينتهي (اختياري)"><Input type="date" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} className="w-full min-w-0 max-w-full appearance-none text-start [&::-webkit-date-and-time-value]:text-start" /></Field>
          <Button className="sm:col-span-2 lg:col-span-1"><Plus className="size-4" />أضف</Button>
        </form>
      </Panel>

      {!list ? <Skeleton className="h-48" /> : list.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-lg border-2 border-dashed border-border-strong py-14 text-center"><TicketPercent className="size-8 text-muted-foreground" /><p className="text-muted-foreground">ما فيه أكواد.</p></div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <li key={c.code} className={cn('relative flex overflow-hidden rounded-lg bg-surface shadow-hairline ring-1 ring-border', (!c.active || expired(c)) && 'opacity-70')}>
              <div className="grid w-28 shrink-0 place-items-center bg-primary p-4 text-center text-accent">
                <span className="tabular font-display text-2xl font-semibold leading-none">{c.type === 'percent' ? `${c.value}%` : c.value}</span>
                <span className="text-xs text-on-inverse/80">{c.type === 'percent' ? 'خصم' : 'ر.س خصم'}</span>
              </div>
              <span className="absolute start-[104px] -top-2.5 size-5 rounded-full bg-background" aria-hidden="true" />
              <span className="absolute start-[104px] -bottom-2.5 size-5 rounded-full bg-background" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col gap-2 border-s-2 border-dashed border-border-strong p-4">
                <button onClick={() => copy(c.code)} className="flex items-center gap-2 self-start font-mono text-lg font-bold text-primary hover:underline" dir="ltr" aria-label={`نسخ ${c.code}`}>{c.code}<Copy className="size-3.5 text-muted-foreground" /></button>
                <p className="text-xs text-muted-foreground">{c.expiresAt ? (expired(c) ? `انتهى ${date(c.expiresAt)}` : `ينتهي ${date(c.expiresAt)}`) : 'بدون تاريخ انتهاء'}{c.type === 'fixed' && ` · ${money(c.value)}`}</p>
                <div className="mt-auto flex items-center justify-between">
                  <Switch checked={c.active} onChange={() => toggle(c)} label={c.active ? 'فعّال' : 'موقوف'} />
                  <IconBtn tone="danger" onClick={() => del(c)} aria-label="حذف"><Trash2 className="size-4" /></IconBtn>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
