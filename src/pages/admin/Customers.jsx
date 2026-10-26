import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { MessageCircle, Trash2, UserPlus, Users } from 'lucide-react'
import { api } from '@/lib/api.js'
import { money, date } from '@/lib/format.js'
import { cn } from '@/lib/utils'
import { useApp } from '@/state.jsx'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/kit.jsx'
import { AdminHead, IconBtn, SearchBox, TableCard, Table, Th, Td, useConfirm } from '@/components/admin/ui.jsx'
import NewCustomer from '@/components/admin/NewCustomer.jsx'

const SORTS = [['recent', 'الأحدث'], ['spent', 'الأعلى شراءً'], ['orders', 'الأكثر طلبات']]
const kindLabel = (c) => (c.kind === 'owner' ? 'المالك' : c.kind === 'staff' ? c.staffRole || 'الفريق' : '')
const Tag = ({ c }) => (kindLabel(c) ? <span className="ms-2 inline-flex rounded-full bg-sunken px-2 py-0.5 align-middle text-[11px] font-bold text-primary ring-1 ring-border">{kindLabel(c)}</span> : null)
const wa = (p) => `https://wa.me/${p.replace(/\D/g, '').replace(/^0/, '966')}`

export default function Customers() {
  const [list, setList] = useState(null)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('recent')
  const [adding, setAdding] = useState(false)
  const [loadErr, setLoadErr] = useState('')
  const access = useOutletContext()
  const owner = !!access?.owner
  const { notify } = useApp()
  const confirm = useConfirm()
  const load = () => api.listCustomers().then((l) => { setLoadErr(''); setList(l) }).catch((e) => { setLoadErr(e.message); setList([]) })
  useEffect(() => { load() }, [])
  const remove = async (c) => {
    if (!(await confirm({ title: `حذف العميل ${c.name || c.email}؟`, body: c.orders ? `طلباته (${c.orders}) تبقى في الطلبات.` : undefined }))) return
    try { await api.deleteCustomer(c.id); setList((l) => l.filter((x) => x.id !== c.id)); notify('حُذف العميل') } catch (e) { notify(e.message, 'err') }
  }
  const shown = useMemo(() => {
    const l = (list || []).filter((c) => !q || ((c.name || '') + (c.email || '') + (c.phone || '')).includes(q))
    return [...l].sort((a, b) => sort === 'spent' ? b.spent - a.spent : sort === 'orders' ? b.orders - a.orders : new Date(b.createdAt) - new Date(a.createdAt))
  }, [list, q, sort])
  const buyers = (list || []).filter((c) => c.orders > 0).length
  const canDelete = (c) => owner && (!c.kind || c.kind === 'customer')

  return (
    <>
      <AdminHead title="العملاء" lead={list ? `${list.length} حساب · ${buyers} اشتروا` : undefined} action={<Button size="sm" onClick={() => setAdding(true)}><UserPlus className="size-4" />عميل جديد</Button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="الاسم، البريد، أو الجوال" className="w-full max-w-md" />
        <div className="flex rounded-full bg-sunken p-1" role="tablist" aria-label="الترتيب">
          {SORTS.map(([id, l]) => <button key={id} role="tab" aria-selected={sort === id} onClick={() => setSort(id)} className={cn('h-9 rounded-full px-3 text-xs font-bold', sort === id ? 'bg-surface text-primary shadow-hairline' : 'text-muted-foreground')}>{l}</button>)}
        </div>
      </div>
      {!list ? <Skeleton className="h-96" /> : shown.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-lg border-2 border-dashed border-border-strong py-16 text-center"><Users className="size-8 text-muted-foreground" /><p className="text-muted-foreground">{loadErr || 'ما فيه عملاء هنا.'}</p></div>
      ) : (
        <>
          <ul className="grid gap-2 md:hidden">
            {shown.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg bg-surface p-4 shadow-hairline ring-1 ring-border">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sunken font-display font-semibold text-primary">{(c.name || c.email || '؟').charAt(0)}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.name || c.email}<Tag c={c} /></p><p className="tabular text-xs text-muted-foreground">{c.orders} طلب · {money(c.spent)}</p></div>
                {c.phone && <a href={wa(c.phone)} target="_blank" rel="noreferrer" className="grid size-10 place-items-center rounded-full bg-primary text-accent" aria-label={`واتساب ${c.name}`}><MessageCircle className="size-4" /></a>}
                {canDelete(c) && <IconBtn tone="danger" onClick={() => remove(c)} aria-label={`حذف ${c.name}`}><Trash2 className="size-4" /></IconBtn>}
              </li>
            ))}
          </ul>
          <TableCard className="hidden md:block">
            <Table>
              <thead><tr><Th>العميل</Th><Th>الجوال</Th><Th>الطلبات</Th><Th>إجمالي المشتريات</Th><Th>تاريخ التسجيل</Th>{owner && <Th className="w-12"><span className="sr-only">حذف</span></Th>}</tr></thead>
              <tbody>{shown.map((c) => (
                <tr key={c.id} className="hover:bg-sunken/50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken font-display text-sm font-semibold text-primary">{(c.name || c.email || '؟').charAt(0)}</span>
                      <div className="min-w-0"><p className="font-semibold">{c.name || c.email}<Tag c={c} /></p><p className="text-xs text-muted-foreground" dir="ltr">{c.email}</p></div>
                    </div>
                  </Td>
                  <Td>{c.phone ? <a className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline" href={wa(c.phone)} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /><span dir="ltr">{c.phone}</span></a> : <span className="text-muted-foreground">—</span>}</Td>
                  <Td className="tabular">{c.orders}</Td>
                  <Td className="tabular font-semibold text-primary">{money(c.spent)}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{c.createdAt ? date(c.createdAt) : "—"}</Td>
                  {owner && <Td>{canDelete(c) && <IconBtn tone="danger" onClick={() => remove(c)} aria-label={`حذف ${c.name}`}><Trash2 className="size-4" /></IconBtn>}</Td>}
                </tr>
              ))}</tbody>
            </Table>
          </TableCard>
        </>
      )}

      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent side="end" className="w-[min(460px,100vw)] overflow-y-auto">
          <div className="border-b border-border px-5 py-4 pe-16">
            <SheetTitle className="font-display text-xl font-semibold text-primary">عميل جديد</SheetTitle>
            <SheetDescription className="sr-only">إضافة عميل</SheetDescription>
          </div>
          <div className="p-5">{adding && <NewCustomer onDone={(c) => { setList((l) => [c, ...(l || [])]); setAdding(false); notify('أُضيف العميل') }} onCancel={() => setAdding(false)} />}</div>
        </SheetContent>
      </Sheet>
    </>
  )
}
