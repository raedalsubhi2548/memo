import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye, Pencil, Trash2, PackageOpen, Star, FileDown } from 'lucide-react'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import { money, effectivePrice } from '@/lib/format.js'
import { Button } from '@/components/ui/button'
import { Select, Skeleton, Switch } from '@/components/ui/kit.jsx'
import { AdminHead, SearchBox, Segments, TableCard, Table, Th, Td, IconBtn, useConfirm } from '@/components/admin/ui.jsx'
import { productPath } from '@/lib/slug.js'
import { storeUrl } from '@/lib/host.js'

export default function Products() {
  const { categories, refreshCatalog, notify } = useApp()
  const confirm = useConfirm()
  const nav = useNavigate()
  const [list, setList] = useState(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [vis, setVis] = useState('')
  const load = () => api.getProducts({ includeHidden: true }).then((l) => setList(l.sort((a, b) => (a.categoryId || '').localeCompare(b.categoryId || '') || (a.sort ?? 0) - (b.sort ?? 0))))
  useEffect(() => { load() }, [])

  const shown = useMemo(() => (list || []).filter((p) => (!cat || p.categoryId === cat) && (!q || p.name.includes(q)) && (!vis || (vis === 'on' ? p.active : !p.active))), [list, q, cat, vis])
  const toggle = async (p) => {
    setList((l) => l.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)))
    try { await api.saveProduct({ ...p, active: !p.active }); refreshCatalog(); notify(p.active ? 'أُخفي المنتج من المتجر' : 'المنتج ظاهر في المتجر') } catch (e) { notify(e.message, 'err'); load() }
  }
  const remove = async (p) => {
    if (!(await confirm({ title: `حذف «${p.name}»؟`, body: 'يُحذف المنتج نهائياً من المتجر. الطلبات السابقة ما تتأثر. إذا تبي توقفه مؤقتاً، أخفِه بدل الحذف.' }))) return
    try { await api.deleteProduct(p.id); await load(); refreshCatalog(); notify('تم حذف المنتج') } catch (e) { notify(e.message, 'err') }
  }
  const catName = (id) => categories.find((c) => c.id === id)?.name || '—'
  const n = (f) => (list || []).filter(f).length

  return (
    <>
      <AdminHead title="المنتجات" lead={list ? `${list.length} منتج · ${n((p) => p.active)} ظاهر` : undefined} action={<Button asChild><Link to="/admin/products/new"><Plus className="size-4" />منتج جديد</Link></Button>} />
      <div className="mb-4 grid gap-3">
        <Segments value={vis} onChange={setVis} options={[{ id: '', label: 'الكل', count: list?.length || 0 }, { id: 'on', label: 'ظاهر', count: n((p) => p.active) }, { id: 'off', label: 'مخفي', count: n((p) => !p.active) }]} />
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <SearchBox value={q} onChange={setQ} placeholder="ابحث باسم المنتج" />
          <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="التصنيف" className="h-11 rounded-full text-sm">
            <option value="">كل التصنيفات</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>

      {!list ? <Skeleton className="h-96" /> : shown.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-lg border-2 border-dashed border-border-strong py-16 text-center"><PackageOpen className="size-8 text-muted-foreground" /><p className="text-muted-foreground">ما فيه منتجات بهذا البحث.</p></div>
      ) : (
        <>
          <ul className="grid gap-2 md:hidden">
            {shown.map((p) => (
              <li key={p.id} className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-lg bg-surface p-3 shadow-hairline ring-1 ring-border">
                <img src={p.image} alt="" className={`size-14 rounded-md object-cover ${p.active ? '' : 'opacity-50 grayscale'}`} />
                <button onClick={() => nav(`/admin/products/${p.id}`)} className="min-w-0 text-start">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="tabular text-sm font-bold text-primary">{money(effectivePrice(p))}</p>
                </button>
                <Switch checked={p.active} onChange={() => toggle(p)} label={<span className="sr-only">{p.active ? 'ظاهر' : 'مخفي'}</span>} />
              </li>
            ))}
          </ul>
          <TableCard className="hidden md:block">
            <Table>
              <thead><tr><Th>المنتج</Th><Th>التصنيف</Th><Th>السعر</Th><Th>الحالة</Th><Th className="text-end"><span className="sr-only">إجراءات</span></Th></tr></thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id} className="hover:bg-sunken/50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <img src={p.image} alt="" className={`size-12 shrink-0 rounded-md object-cover ${p.active ? '' : 'opacity-50 grayscale'}`} />
                        <div className="min-w-0">
                          <Link to={`/admin/products/${p.id}`} className="line-clamp-1 font-semibold hover:text-primary hover:underline">{p.name}</Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {p.badge && <span className="rounded-full bg-accent/30 px-2 text-[11px] font-bold leading-5 text-accent-text">{p.badge}</span>}
                            {p.featured && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Star className="size-3" />مميّز</span>}
                            {p.digital && <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><FileDown className="size-3" />رقمي</span>}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{catName(p.categoryId)}</Td>
                    <Td className="tabular whitespace-nowrap"><strong className="text-primary">{money(effectivePrice(p))}</strong>{p.salePrice ? <s className="ms-1.5 text-xs text-muted-foreground">{money(p.price)}</s> : null}</Td>
                    <Td><Switch checked={p.active} onChange={() => toggle(p)} label={p.active ? 'ظاهر' : 'مخفي'} /></Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <IconBtn onClick={() => window.open(storeUrl(productPath(p.id)), '_blank')} aria-label="عرض في المتجر"><Eye className="size-4" /></IconBtn>
                        <IconBtn onClick={() => nav(`/admin/products/${p.id}`)} aria-label="تعديل"><Pencil className="size-4" /></IconBtn>
                        <IconBtn tone="danger" onClick={() => remove(p)} aria-label="حذف"><Trash2 className="size-4" /></IconBtn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableCard>
        </>
      )}
    </>
  )
}
