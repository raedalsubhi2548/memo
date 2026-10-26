import { useState } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import { cn } from '@/lib/utils'
import Icon from '@/components/Icon.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/kit.jsx'
import { AdminHead, IconBtn, useConfirm } from '@/components/admin/ui.jsx'

const ICONS = ['drop', 'leaf', 'spark', 'heart', 'box', 'tag', 'pen', 'shield']

function Row({ c, count, onSaved }) {
  const { notify } = useApp()
  const confirm = useConfirm()
  const [f, setF] = useState(c)
  const dirty = JSON.stringify(f) !== JSON.stringify(c)
  const save = async () => { try { await api.saveCategory({ ...f, sort: Number(f.sort) }); notify('تم حفظ التصنيف'); onSaved() } catch (e) { notify(e.message, 'err') } }
  const del = async () => {
    if (!(await confirm({ title: `حذف تصنيف «${c.name}»؟`, body: count ? `فيه ${count} منتج بهذا التصنيف. انقلها لتصنيف ثاني قبل الحذف.` : 'التصنيف فاضي، ما بيتأثر شي.' }))) return
    try { await api.deleteCategory(c.id); notify('تم حذف التصنيف'); onSaved() } catch (e) { notify(e.message, 'err') }
  }
  return (
    <li className={cn('grid gap-4 rounded-lg bg-surface p-4 shadow-hairline ring-1 transition-shadow sm:p-5', dirty ? 'ring-accent' : 'ring-border')}>
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr_88px]">
        <label className="grid gap-1.5"><span className="text-xs font-bold text-muted-foreground">الاسم</span><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="h-11" /></label>
        <label className="grid gap-1.5"><span className="text-xs font-bold text-muted-foreground">الوصف</span><Input value={f.blurb || ''} onChange={(e) => setF({ ...f, blurb: e.target.value })} className="h-11" /></label>
        <label className="grid gap-1.5"><span className="text-xs font-bold text-muted-foreground">الترتيب</span><Input type="number" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} dir="ltr" className="tabular h-11" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="الأيقونة">
          {ICONS.map((i) => (
            <button key={i} type="button" role="radio" aria-checked={f.icon === i} aria-label={i} onClick={() => setF({ ...f, icon: i })}
              className={cn('grid size-9 place-items-center rounded-md transition-colors', f.icon === i ? 'bg-primary text-accent' : 'text-muted-foreground hover:bg-sunken hover:text-primary')}>
              <Icon name={i} size={18} />
            </button>
          ))}
        </div>
        <span className="tabular rounded-full bg-sunken px-3 py-1 text-xs font-bold text-muted-foreground">{count} منتج</span>
        <div className="ms-auto flex gap-1">
          <Button size="sm" onClick={save} disabled={!dirty}><Save className="size-4" />حفظ</Button>
          <IconBtn tone="danger" onClick={del} aria-label="حذف"><Trash2 className="size-4" /></IconBtn>
        </div>
      </div>
    </li>
  )
}

export default function Categories() {
  const { categories, products, refreshCatalog, notify } = useApp()
  const [name, setName] = useState('')
  const add = async (e) => {
    e.preventDefault()
    try { await api.saveCategory({ id: 'cat-' + Date.now().toString(36), name, blurb: '', icon: 'spark', sort: categories.length + 1 }); setName(''); refreshCatalog(); notify('أُضيف التصنيف') } catch (er) { notify(er.message, 'err') }
  }
  return (
    <>
      <AdminHead title="التصنيفات" lead={`${categories.length} تصنيف`} />
      <form className="mb-4 flex gap-2 rounded-lg bg-sunken p-3" onSubmit={add}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم تصنيف جديد" required aria-label="اسم التصنيف" className="h-11 flex-1 bg-surface" />
        <Button><Plus className="size-4" />أضف</Button>
      </form>
      <ul className="grid gap-3">
        {categories.map((c) => <Row key={c.id + c.name + c.sort + c.icon + (c.blurb || '')} c={c} count={products.filter((p) => p.categoryId === c.id).length} onSaved={refreshCatalog} />)}
      </ul>
    </>
  )
}
