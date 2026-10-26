import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select, Switch } from '@/components/ui/kit.jsx'

const rid = () => Math.random().toString(36).slice(2, 8)

// Product options for the admin: each option is "pick one" (radio) or "pick any" (checkbox),
// and each choice can add to the price. Ids stay fixed once made, so old carts keep working.
export default function OptionsEditor({ value = [], onChange }) {
  const set = (i, patch) => onChange(value.map((o, k) => (k === i ? { ...o, ...patch } : o)))
  const setVal = (i, j, patch) => set(i, { values: value[i].values.map((v, k) => (k === j ? { ...v, ...patch } : v)) })
  return (
    <div className="grid gap-4">
      {value.length === 0 && <p className="text-sm text-muted-foreground">ما فيه خيارات.</p>}
      {value.map((o, i) => (
        <div key={o.id} className="grid gap-3 rounded-lg bg-sunken p-4">
          <div className="flex items-center gap-2">
            <Input value={o.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="اسم الخيار، مثل: الإضافات" className="h-10 flex-1 bg-surface text-sm" aria-label="اسم الخيار" />
            <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="حذف الخيار"><Trash2 className="size-4" /></button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Select value={o.type} onChange={(e) => set(i, { type: e.target.value })} className="h-10 w-auto bg-surface text-sm" aria-label="نوع الاختيار">
              <option value="radio">اختيار واحد</option>
              <option value="checkbox">اختيار متعدد</option>
            </Select>
            <Switch checked={!!o.required} onChange={(v) => set(i, { required: v })} label="مطلوب" />
          </div>
          <ul className="grid gap-2">
            {o.values.map((v, j) => (
              <li key={v.id} className="flex items-center gap-2">
                <Input value={v.name} onChange={(e) => setVal(i, j, { name: e.target.value })} placeholder="القيمة" className="h-10 flex-1 bg-surface text-sm" aria-label="القيمة" />
                <Input type="number" min="0" step="0.01" value={v.price} onChange={(e) => setVal(i, j, { price: e.target.value === '' ? '' : Number(e.target.value) })} dir="ltr" className="tabular h-10 w-24 bg-surface text-sm" aria-label="السعر الإضافي" placeholder="+0" />
                <button type="button" onClick={() => set(i, { values: o.values.filter((_, k) => k !== j) })} className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="حذف القيمة"><Trash2 className="size-3.5" /></button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => set(i, { values: [...o.values, { id: rid(), name: '', price: 0 }] })}><Plus className="size-4" />أضف قيمة</Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="justify-self-start" onClick={() => onChange([...value, { id: rid(), name: '', type: 'radio', required: false, values: [{ id: rid(), name: '', price: 0 }] }])}><Plus className="size-4" />أضف خيار</Button>
    </div>
  )
}

// drops empty rows before saving
export const tidyOptions = (opts = []) => opts
  .map((o) => ({ ...o, name: o.name.trim(), values: o.values.filter((v) => v.name.trim()).map((v) => ({ ...v, name: v.name.trim(), price: Math.max(0, Number(v.price) || 0) })) }))
  .filter((o) => o.name && o.values.length)
