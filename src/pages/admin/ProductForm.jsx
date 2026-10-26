import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Eye, ImageUp, Loader2, Trash2, Check } from 'lucide-react'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import { parseDescription } from '@/lib/format.js'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea, Select, Panel, Skeleton, Switch } from '@/components/ui/kit.jsx'
import { AdminHead, useConfirm } from '@/components/admin/ui.jsx'
import ServiceTicket from '@/components/home/ServiceTicket.jsx'
import { productPath } from '@/lib/slug.js'
import OptionsEditor, { tidyOptions } from '@/components/admin/OptionsEditor.jsx'
import { storeUrl } from '@/lib/host.js'

const EMPTY = { name: '', price: '', salePrice: '', categoryId: '', image: '', badge: '', summary: '', description: '', featured: false, active: true, digital: false, perUnit: '', fileUrl: '', sort: 0 }
const slugify = (s) => s.trim().toLowerCase().replace(/[^\w؀-ۿ]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'product'

export default function ProductForm() {
  const { id } = useParams()
  const isNew = id === 'new'
  const nav = useNavigate()
  const confirm = useConfirm()
  const { categories, products, refreshCatalog, notify } = useApp()
  // options are editable once the database has the options column (supabase/options.sql)
  const canOptions = products.some((x) => Array.isArray(x.options))
  const [p, setP] = useState(isNew ? EMPTY : null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (!isNew) api.getProduct(id).then((x) => setP(x ? { ...EMPTY, ...x, salePrice: x.salePrice ?? '' } : EMPTY))
    else if (categories[0]) setP((x) => ({ ...x, categoryId: x.categoryId || categories[0].id }))
  }, [id, isNew, categories])
  if (!p) return <div className="grid gap-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-[480px]" /></div>

  const set = (k) => (e) => setP({ ...p, [k]: e.target.value })
  const flag = (k) => (v) => setP({ ...p, [k]: v })
  const uploadFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return notify('الملف لازم يكون صورة', 'err')
    setUploading(true)
    try { const url = await api.uploadImage(file); setP((x) => ({ ...x, image: url })); notify('رُفعت الصورة') } catch (er) { notify(er.message, 'err') } finally { setUploading(false) }
  }
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const out = { ...p, ...(Array.isArray(p.options) ? { options: tidyOptions(p.options) } : canOptions ? { options: [] } : {}), price: Number(p.price), salePrice: p.salePrice === '' ? null : Number(p.salePrice), sort: Number(p.sort) || 0 }
      if (out.salePrice && out.salePrice >= out.price) throw new Error('سعر التخفيض لازم يكون أقل من السعر الأصلي')
      if (isNew) out.id = slugify(p.name) + '-' + Date.now().toString(36).slice(-4)
      await api.saveProduct(out); await refreshCatalog()
      notify(isNew ? 'أُضيف المنتج للمتجر' : 'تم حفظ المنتج'); nav('/admin/products')
    } catch (er) { notify(er.message, 'err') } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!(await confirm({ title: `حذف «${p.name}»؟`, body: 'يُحذف المنتج نهائياً من المتجر.' }))) return
    try { await api.deleteProduct(p.id); await refreshCatalog(); notify('تم حذف المنتج'); nav('/admin/products') } catch (er) { notify(er.message, 'err') }
  }
  const preview = parseDescription(p.description)
  const discount = p.salePrice !== '' && Number(p.price) > 0 && Number(p.salePrice) < Number(p.price) ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0

  return (
    <form onSubmit={save} className="pb-24 lg:pb-0">
      <AdminHead
        back={<Link to="/admin/products" className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"><ChevronRight className="size-4" />المنتجات</Link>}
        title={isNew ? 'منتج جديد' : p.name || 'بدون اسم'}
        action={<>
          {!isNew && <Button asChild variant="ghost"><a href={storeUrl(productPath(p.id))} target="_blank" rel="noreferrer"><Eye className="size-4" />معاينة</a></Button>}
          <Button disabled={busy} className="hidden lg:inline-flex">{busy ? 'جاري الحفظ…' : isNew ? 'أضف المنتج' : 'حفظ التغييرات'}</Button>
        </>}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <Panel title="المعلومات الأساسية">
            <div className="grid gap-4">
              <Field label="اسم المنتج"><Input required value={p.name} onChange={set('name')} /></Field>
              <Field label="وصف قصير"><Textarea rows={2} value={p.summary} onChange={set('summary')} /></Field>
              <Field label="الوصف الكامل">
                <Textarea rows={12} value={p.description} onChange={set('description')} className="text-sm leading-7" />
              </Field>
            </div>
          </Panel>
          <Panel title="معاينة الوصف">
            <p className="leading-8 text-muted-foreground">{preview.intro || 'تظهر المقدمة هنا.'}</p>
            {preview.sections.length > 0 && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {preview.sections.map((s) => (
                  <div key={s.title} className="rounded-md bg-sunken p-4">
                    <h3 className="font-display font-semibold text-primary">{s.title}</h3>
                    <ul className="mt-2 grid gap-1.5 text-sm">{s.items.map((i) => <li key={i} className="flex gap-2"><Check className="mt-1 size-3.5 shrink-0 text-primary" />{i}</li>)}</ul>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          {canOptions && (
            <Panel title="خيارات المنتج">
              <OptionsEditor value={p.options || []} onChange={(options) => setP((x) => ({ ...x, options }))} />
            </Panel>
          )}
          {!isNew && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-5 ring-1 ring-danger/30">
              <div><p className="font-bold text-danger">حذف المنتج</p></div>
              <Button type="button" variant="outline" onClick={remove} className="border-danger/40 text-danger hover:bg-danger-soft"><Trash2 className="size-4" />حذف</Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:sticky lg:top-6">
          <Panel title="الصورة">
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); uploadFile(e.dataTransfer.files?.[0]) }}
              onClick={() => fileRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              className={cn('relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-md border-2 border-dashed transition-colors', drag ? 'border-primary bg-primary/5' : 'border-border-strong bg-sunken hover:border-primary')}
              aria-label="ارفع صورة المنتج"
            >
              {p.image ? <img src={p.image} alt="" className="size-full object-cover" /> : (
                <div className="grid justify-items-center gap-2 p-6 text-center"><ImageUp className="size-8 text-muted-foreground" /><p className="text-sm font-semibold text-primary">اسحب الصورة هنا أو اضغط للرفع</p><p className="text-xs text-muted-foreground">مربعة 1:1 أفضل</p></div>
              )}
              {uploading && <div className="absolute inset-0 grid place-items-center bg-background/80"><Loader2 className="size-8 animate-spin text-primary" /></div>}
              {p.image && !uploading && <span className="absolute bottom-3 start-3 rounded-full bg-background/95 px-3 py-1 text-xs font-bold text-primary shadow-hairline">تغيير الصورة</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => uploadFile(e.target.files?.[0])} />
            <Field label="أو رابط الصورة" className="mt-4"><Input value={p.image} onChange={set('image')} dir="ltr" className="h-10 text-sm" /></Field>
          </Panel>

          <Panel title="السعر والتصنيف">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="السعر (ر.س)"><Input required type="number" min="0" step="0.01" value={p.price} onChange={set('price')} dir="ltr" className="tabular" /></Field>
                <Field label="سعر التخفيض" hint={discount ? `خصم ${discount}%` : undefined}><Input type="number" min="0" step="0.01" value={p.salePrice} onChange={set('salePrice')} dir="ltr" className="tabular" /></Field>
              </div>
              <Field label="التصنيف"><Select required value={p.categoryId} onChange={set('categoryId')}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="شارة"><Input value={p.badge || ''} onChange={set('badge')} placeholder="جديدنا" /></Field>
                <Field label="وحدة السعر"><Input value={p.perUnit || ''} onChange={set('perUnit')} placeholder="للمنتج" /></Field>
              </div>
              <Field label="الترتيب داخل التصنيف"><Input type="number" value={p.sort} onChange={set('sort')} dir="ltr" className="tabular" /></Field>
            </div>
          </Panel>

          <Panel title="الظهور">
            <div className="grid gap-4">
              <Switch checked={p.active} onChange={flag('active')} label="ظاهر في المتجر" />
              <Switch checked={p.featured} onChange={flag('featured')} label="مميّز (يظهر أولاً)" />
              <Switch checked={p.digital} onChange={flag('digital')} label="منتج رقمي (ملف يحمّله العميل)" />
              {p.digital && <Field label="مسار الملف"><Input value={p.fileUrl || ''} onChange={set('fileUrl')} dir="ltr" className="h-10 text-sm" /></Field>}
            </div>
          </Panel>

          {p.image && <div>
            <p className="mb-2 text-xs font-bold text-muted-foreground">كذا يظهر في المتجر</p>
            <div className="pointer-events-none max-w-[240px] select-none" aria-hidden="true" inert="">
              <ServiceTicket p={{ ...p, id: p.id || 'preview', name: p.name || 'اسم المنتج', price: Number(p.price) || 0, salePrice: p.salePrice === '' ? null : Number(p.salePrice), image: p.image }} />
            </div>
          </div>}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur lg:hidden">
        <Button disabled={busy} className="w-full" size="lg">{busy ? 'جاري الحفظ…' : isNew ? 'أضف المنتج' : 'حفظ التغييرات'}</Button>
      </div>
    </form>
  )
}
