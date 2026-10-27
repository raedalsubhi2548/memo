import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Smartphone, Monitor, Upload, RotateCcw, Check, Loader2, ImageIcon, Undo2, ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Plus, Pencil, X,
  History, Sparkles, Image as ImageLucide, BadgeCheck, LayoutGrid, Shapes, PanelLeft, Type, GalleryHorizontal, MessageSquareQuote, CircleHelp, Copy, Leaf, Truck, PanelTop,
} from 'lucide-react'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import { cn } from '@/lib/utils'
import { DEFAULT_SETTINGS, PRESETS, BLOCKS, BLOCK_DEFAULTS, ICONS, DEFAULT_HEADER_LINKS, DEFAULT_FOOTER_LINKS, DEFAULT_ABOUT, DEFAULT_STORE, FONTS, RADII, normPhone, defaultHome, mergeSettings } from '@/lib/theme.js'
import { SITE } from '@/lib/seo.js'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea, Select, Panel, Switch } from '@/components/ui/kit.jsx'
import { AdminHead, useConfirm } from '@/components/admin/ui.jsx'
import * as Dialog from '@radix-ui/react-dialog'

const MAX_IMAGE = 4 * 1024 * 1024
const BLOCK_ICON = { Sparkles, Image: ImageLucide, BadgeCheck, LayoutGrid, Shapes, PanelLeft, Type, GalleryHorizontal, MessageSquareQuote, CircleHelp, Leaf, Truck, PanelTop }
const ICON_NAMES = { truck: 'شحن', shield: 'حماية', chat: 'محادثة', leaf: 'ورقة', drop: 'قطرة', gift: 'هدية' }
const BUILT_IN_CAT = { 'hair-care': '/brand/cat-hair-care-v2.webp', 'skin-care': '/brand/cat-skin-care-v2.webp' }
const uid = () => 'b' + Math.random().toString(36).slice(2, 8)

/** One image slot: upload, preview on the background it will sit on, back to the original. */
function ImageSlot({ label, hint, value, fallback, dark, onChange, tall }) {
  const { notify } = useApp()
  const input = useRef()
  const [busy, setBusy] = useState(false)
  const pick = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) return notify('الصورة لازم تكون PNG أو JPG أو WEBP أو SVG', 'err')
    if (file.size > MAX_IMAGE) return notify('حجم الصورة أكبر من 4 ميجا، صغّرها وارفعها', 'err')
    setBusy(true)
    try { onChange(await api.uploadImage(file)); notify('رُفعت الصورة') } catch (er) { notify(er.message, 'err') } finally { setBusy(false) }
  }
  const shown = value || fallback
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-primary">{label}</span>
        {value && value !== fallback && <button type="button" onClick={() => onChange('')} className="text-xs font-semibold text-muted-foreground hover:text-danger">{fallback ? 'رجوع للأصلي' : 'إزالة'}</button>}
      </div>
      <button type="button" onClick={() => input.current.click()} disabled={busy}
        className={cn('group relative grid place-items-center overflow-hidden rounded-md ring-1 ring-border transition-shadow hover:ring-2 hover:ring-accent', tall ? 'h-32' : 'h-24', dark ? 'bg-[#0f1a2c]' : 'bg-[#f3f6fa]')}>
        {shown ? <img src={shown} alt="" className={cn(tall ? 'size-full object-cover' : 'max-h-16 max-w-[80%] object-contain')} /> : <span className="grid justify-items-center gap-1 text-xs text-muted-foreground"><ImageIcon className="size-6" />ارفع صورة</span>}
        <span className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <span className="flex items-center gap-2"><Upload className="size-4" />{shown ? 'تغيير الصورة' : 'رفع صورة'}</span>}
        </span>
      </button>
      {hint && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={pick} />
    </div>
  )
}

function ColorField({ label, value, onChange }) {
  const [txt, setTxt] = useState(value)
  useEffect(() => setTxt(value), [value])
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-primary">{label}</span>
      <span className="flex h-12 items-center gap-2 rounded-full bg-surface px-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-ring">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-8 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0" aria-label={label} />
        <input value={txt} dir="ltr" maxLength={7} onChange={(e) => { setTxt(e.target.value); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toLowerCase()) }}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase text-foreground outline-none" />
      </span>
    </label>
  )
}

const linkOk = (v) => !v || /^(?:\/(?![\/\\])|https:\/\/[^\/\\\s]+\.[^\s]+)[^\s"'<>`\\]*$/i.test(v)
/** A link field that says so right away when the address won't be accepted (it would be dropped on publish). */
function LinkInput({ value, onChange, className, placeholder = '/shop' }) {
  const bad = !linkOk(value)
  return (
    <span className={cn('grid gap-1', className)}>
      <Input value={value} dir="ltr" onChange={(e) => onChange(e.target.value.trim())} placeholder={placeholder} aria-invalid={bad || undefined} className={cn(className && 'h-10', bad && 'ring-2 ring-danger')} />
      {bad && <span className="text-xs font-semibold text-danger">الرابط لازم يبدأ بـ / أو https://</span>}
    </span>
  )
}

/** Choose services for a products block: tick them in the order they should appear. */
function ProductPicker({ value, onChange }) {
  const { products } = useApp()
  const [q, setQ] = useState('')
  const list = products.filter((p) => !q || p.name.includes(q))
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : value.length < 12 ? [...value, id] : value)
  return (
    <div className="grid gap-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن منتج" className="h-10" />
      <ul className="grid max-h-56 gap-1 overflow-y-auto rounded-md p-1 ring-1 ring-border">
        {list.map((p) => {
          const n = value.indexOf(p.id)
          return (
            <li key={p.id}>
              <button type="button" onClick={() => toggle(p.id)} className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-sm', n >= 0 ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-sunken')}>
                <span className={cn('grid size-5 shrink-0 place-items-center rounded-full text-[11px] ring-1', n >= 0 ? 'bg-primary text-on-inverse ring-primary' : 'ring-border-strong')}>{n >= 0 ? n + 1 : ''}</span>
                <span className="truncate">{p.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted-foreground">{value.length} مختارة (حتى 12). الترتيب حسب اختيارك.</p>
    </div>
  )
}

function ItemsEditor({ value, onChange }) {
  const set = (i, k, v) => onChange(value.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  return (
    <div className="grid gap-3">
      {value.map((x, i) => (
        <div key={i} className="grid gap-2 rounded-md p-3 ring-1 ring-border">
          <div className="flex items-center gap-2">
            <Select value={x.icon} onChange={(e) => set(i, 'icon', e.target.value)} className="h-10 w-32">{ICONS.map((n) => <option key={n} value={n}>{ICON_NAMES[n]}</option>)}</Select>
            <Input value={x.title} maxLength={40} onChange={(e) => set(i, 'title', e.target.value)} placeholder="العنوان" className="h-10" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="حذف"><X className="size-4" /></button>
          </div>
          <Input value={x.text} maxLength={60} onChange={(e) => set(i, 'text', e.target.value)} placeholder="سطر توضيحي" className="h-10" />
        </div>
      ))}
      {value.length < 4 && <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { icon: 'store', title: '', text: '' }])}><Plus className="size-4" />أضف ميزة</Button>}
    </div>
  )
}

/** The form for one block, built from its field list in theme.js. */
function BlockForm({ block, onChange, catImages, setCatImage }) {
  const { categories, products } = useApp()
  const def = BLOCKS[block.type]
  const set = (k, v) => onChange({ ...block, [k]: v })
  const shown = (key) => block.type !== 'products' || (key !== 'category' || block.source === 'category') && (key !== 'ids' || block.source === 'picked')
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {def.fields.filter(([key]) => shown(key)).map(([key, label, kind, opt]) => {
        const v = block[key]
        const wide = ['textarea', 'image', 'products', 'items', 'switch'].includes(kind) || key === 'title' || key === 'text'
        let control
        if (kind === 'text') control = <Input value={v} maxLength={opt} onChange={(e) => set(key, e.target.value)} />
        else if (kind === 'textarea') control = <Textarea value={v} maxLength={opt} onChange={(e) => set(key, e.target.value)} />
        else if (kind === 'link') control = <LinkInput value={v} onChange={(x) => set(key, x)} />
        else if (kind === 'image') return <div key={key} className="sm:col-span-2"><ImageSlot tall label={label} value={v} fallback={block.type === 'hero' ? (key === 'image' ? '/brand/banner-all-v3.webp' : '') : ''} onChange={(x) => set(key, x)} /></div>
        else if (kind === 'switch') return <div key={key} className="sm:col-span-2"><Switch checked={!!v} onChange={(x) => set(key, x)} label={label} /></div>
        else if (kind === 'select') control = <Select value={v} onChange={(e) => set(key, e.target.value)}>{opt.map(([x, t]) => <option key={x} value={x}>{t}</option>)}</Select>
        else if (kind === 'number') control = <Input type="number" min={opt[0]} max={opt[1]} value={v} onChange={(e) => set(key, Number(e.target.value))} dir="ltr" className="tabular" />
        else if (kind === 'category') control = <Select value={v} onChange={(e) => set(key, e.target.value)}><option value="">اختر قسم</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        else if (kind === 'product') control = <Select value={v} onChange={(e) => set(key, e.target.value)}><option value="">بدون</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        else if (kind === 'products') control = <ProductPicker value={v} onChange={(x) => set(key, x)} />
        else if (kind === 'items') control = <ItemsEditor value={v} onChange={(x) => set(key, x)} />
        return <Field key={key} label={label} className={wide ? 'sm:col-span-2' : ''}>{control}</Field>
      })}
      {block.type === 'categories' && catImages && (
        <div className="grid gap-3 sm:col-span-2">
          <p className="text-sm font-semibold text-primary">صور الأقسام</p>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((c) => <ImageSlot key={c.id} tall label={c.name} value={catImages[c.id] || ''} fallback={BUILT_IN_CAT[c.id] || ''} onChange={(url) => setCatImage(c.id, url)} />)}
          </div>
        </div>
      )}
    </div>
  )
}

/** The home page as a list of blocks: reorder, hide, edit, duplicate, delete, add. */
function HomeBlocks({ blocks, onChange, focus, catImages, setCatImage }) {
  const confirm = useConfirm()
  const [open, setOpen] = useState(null)
  const [adding, setAdding] = useState(false)
  const move = (i, d) => { const n = [...blocks]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n) }
  const update = (i, b) => onChange(blocks.map((x, j) => (j === i ? b : x)))
  const remove = async (i) => {
    if (!(await confirm({ title: `حذف «${BLOCKS[blocks[i].type].name}»؟`, body: 'ينحذف من الصفحة الرئيسية. تقدر ترجعه بزر «تراجع» قبل النشر.' }))) return
    onChange(blocks.filter((_, j) => j !== i))
  }
  const add = (type) => {
    const b = { id: uid(), type, on: true, ...structuredClone(BLOCK_DEFAULTS[type]) }
    onChange([...blocks, b]); setAdding(false); setOpen(b.id); focus(b.id)
  }
  const label = (b) => b.title || b.title1 || b.kicker || b.alt || (b.type === 'promises' ? b.items.map((x) => x.title).join('، ') : '')
  return (
    <div className="grid gap-2">
      {blocks.map((b, i) => {
        const def = BLOCKS[b.type]; const I = BLOCK_ICON[def.icon] || Type; const isOpen = open === b.id
        return (
          <div key={b.id} className={cn('rounded-lg bg-surface ring-1 transition-shadow', isOpen ? 'shadow-card ring-primary/40' : 'ring-border', !b.on && 'opacity-60')}>
            <div className="flex items-center gap-2 p-2.5 ps-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sunken text-primary"><I className="size-[18px]" /></span>
              <button type="button" onClick={() => { setOpen(isOpen ? null : b.id); if (!isOpen) focus(b.id) }} className="min-w-0 flex-1 text-start">
                <b className="block truncate text-sm font-semibold text-primary">{def.name}</b>
                <span className="block truncate text-xs text-muted-foreground">{label(b)}</span>
              </button>
              <div className="flex shrink-0 items-center">
                <IconB onClick={() => move(i, -1)} disabled={i === 0} label="لفوق"><ChevronUp className="size-4" /></IconB>
                <IconB onClick={() => move(i, 1)} disabled={i === blocks.length - 1} label="لتحت"><ChevronDown className="size-4" /></IconB>
                <IconB onClick={() => update(i, { ...b, on: !b.on })} label={b.on ? 'إخفاء' : 'إظهار'}>{b.on ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</IconB>
                <IconB onClick={() => { setOpen(isOpen ? null : b.id); if (!isOpen) focus(b.id) }} label="تعديل" active={isOpen}><Pencil className="size-4" /></IconB>
              </div>
            </div>
            {isOpen && (
              <div className="grid gap-4 border-t border-border p-4">
                <BlockForm block={b} onChange={(nb) => update(i, nb)} catImages={catImages} setCatImage={setCatImage} />
                <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { const c = { ...structuredClone(b), id: uid() }; const n = [...blocks]; n.splice(i + 1, 0, c); onChange(n) }}><Copy className="size-4" />تكرار</Button>
                  <Button type="button" variant="ghost" size="sm" className="text-danger hover:bg-danger-soft" onClick={() => remove(i)}><Trash2 className="size-4" />حذف العنصر</Button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {adding ? (
        <div className="rounded-lg bg-surface p-3 ring-2 ring-accent">
          <div className="mb-2 flex items-center justify-between"><b className="text-sm text-primary">اختر عنصر تضيفه</b><IconB onClick={() => setAdding(false)} label="إغلاق"><X className="size-4" /></IconB></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(BLOCKS).map(([type, d]) => {
              const I = BLOCK_ICON[d.icon] || Type
              return (
                <button key={type} type="button" onClick={() => add(type)} className="flex items-start gap-2.5 rounded-md p-2.5 text-start ring-1 ring-border hover:bg-sunken hover:ring-border-strong">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-accent"><I className="size-4" /></span>
                  <span><b className="block text-sm font-semibold text-primary">{d.name}</b><span className="text-xs leading-5 text-muted-foreground">{d.hint}</span></span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-strong text-sm font-semibold text-primary hover:border-primary hover:bg-sunken">
          <Plus className="size-4" />إضافة عنصر للصفحة الرئيسية
        </button>
      )}
    </div>
  )
}

const IconB = ({ onClick, disabled, label, active, children }) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
    className={cn('grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-sunken hover:text-primary disabled:opacity-30 disabled:hover:bg-transparent', active && 'bg-primary/10 text-primary')}>{children}</button>
)

function HeaderLinks({ value, onChange, max = 6 }) {
  const set = (i, k, v) => onChange(value.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const move = (i, d) => { const n = [...value]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n) }
  return (
    <div className="grid gap-2">
      {value.map((l, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={l.label} maxLength={24} onChange={(e) => set(i, 'label', e.target.value)} placeholder="الاسم" className="h-10 flex-1" />
          <LinkInput value={l.to} onChange={(x) => set(i, 'to', x)} className="flex-1" />
          <IconB onClick={() => move(i, -1)} disabled={i === 0} label="لفوق"><ChevronUp className="size-4" /></IconB>
          <IconB onClick={() => onChange(value.filter((_, j) => j !== i))} label="حذف"><X className="size-4" /></IconB>
        </div>
      ))}
      {value.length < max && <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => onChange([...value, { label: '', to: '' }])}><Plus className="size-4" />أضف رابط</Button>}
    </div>
  )
}

/** The live store inside the designer, as a phone or a desktop screen. */
function Preview({ draft, frame }) {
  const box = useRef()
  const [device, setDevice] = useState('mobile')
  const [width, setWidth] = useState(800)
  useEffect(() => {
    const send = () => frame.current?.contentWindow?.postMessage({ type: 'mimi:design', settings: draft }, location.origin)
    send()
    const on = (e) => { if (e.origin === location.origin && e.data?.type === 'mimi:preview-ready') send() }
    addEventListener('message', on)
    return () => removeEventListener('message', on)
  }, [draft, frame])
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const desk = device === 'desktop'
  const scale = Math.min(1, (width - 24) / (desk ? 1280 : 375))
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-primary">معاينة مباشرة</p>
        <div className="flex rounded-full bg-sunken p-1 ring-1 ring-border">
          {[['mobile', Smartphone, 'جوال'], ['desktop', Monitor, 'كمبيوتر']].map(([id, I, t]) => (
            <button key={id} type="button" onClick={() => setDevice(id)} className={cn('flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors', device === id ? 'bg-primary text-on-inverse' : 'text-muted-foreground hover:text-primary')}>
              <I className="size-4" />{t}
            </button>
          ))}
        </div>
      </div>
      <div ref={box} className="grid min-w-0 justify-items-center overflow-hidden rounded-xl bg-[#e9eef5] p-3 ring-1 ring-border">
        <div className={cn('overflow-hidden bg-white shadow-[0_30px_60px_-30px_rgb(15_26_44/0.6)]', desk ? 'rounded-lg' : 'rounded-[34px] ring-[10px] ring-[#0f1a2c]')}
          style={desk ? { width: 1280 * scale, height: 800 * scale } : { width: 375 * scale, height: 720 * scale }}>
          <iframe ref={frame} src="/admin/preview" title="معاينة المتجر"
            style={{ width: desk ? 1280 : 375, height: desk ? 800 : 720, transform: `scale(${scale})`, transformOrigin: 'top right' }}
            className="block border-0" />
        </div>
      </div>
    </div>
  )
}

const longDateTime = (d) => new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' }).format(new Date(d))

/** Design backups (owner only): every publish is kept with its date; one click brings an older one back and republishes. */
function Backups({ open, onOpenChange, onRestored }) {
  const { notify } = useApp()
  const confirm = useConfirm()
  const [list, setList] = useState(null)
  const [busy, setBusy] = useState(0)
  useEffect(() => { if (open) { setList(null); api.designVersions().then(setList).catch((e) => { setList([]); notify(e.message, 'err') }) } }, [open])
  const restore = async (v) => {
    if (!(await confirm({ title: 'استرجاع هذا التصميم؟', body: longDateTime(v.at), ok: 'استرجاع' }))) return
    setBusy(v.id)
    try {
      await api.restoreDesign(v.id)
      const r = await api.rebuildSite()
      await onRestored()
      setList(await api.designVersions())
      notify(r?.ok ? 'رجع التصميم ✓ ويتحدّث لمحركات البحث خلال دقيقتين' : 'رجع التصميم ✓')
    } catch (e) { notify(e.message, 'err') } finally { setBusy(0) }
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-primary/45 motion-safe:animate-[fade-in_200ms]" />
      <Dialog.Content onOpenAutoFocus={(e) => e.preventDefault()} className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[80vh] max-w-lg -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-background shadow-overlay outline-none motion-safe:animate-[rise-in_260ms_var(--p-ease-emphasized)]">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Dialog.Title className="flex-1 font-display text-lg font-semibold text-primary">النسخ الاحتياطية</Dialog.Title>
          <Dialog.Description className="sr-only">النسخ المحفوظة من التصميم</Dialog.Description>
          <Dialog.Close className="grid size-10 place-items-center rounded-full bg-sunken text-primary hover:bg-border" aria-label="إغلاق"><X className="size-5" /></Dialog.Close>
        </div>
        <div className="overflow-y-auto p-4">
          {!list ? <div className="grid place-items-center py-10"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            : !list.length ? <p className="py-10 text-center text-muted-foreground">ما فيه نسخ محفوظة.</p>
              : (
                <ol className="grid gap-2">
                  {list.map((v) => (
                    <li key={v.id} className={cn('flex items-center gap-3 rounded-lg bg-surface p-4 ring-1', v.current ? 'ring-2 ring-primary' : 'ring-border')}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-primary">{longDateTime(v.at)}</p>
                        {v.by && <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">{v.by}</p>}
                        {v.note && <p className="mt-1 text-xs leading-6 text-muted-foreground">{v.note}</p>}
                      </div>
                      {v.current
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1.5 text-xs font-bold text-success"><Check className="size-3.5" strokeWidth={3} />الحالي</span>
                        : <Button variant="outline" size="sm" disabled={!!busy} onClick={() => restore(v)}>{busy === v.id ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}استرجاع</Button>}
                    </li>
                  ))}
                </ol>
              )}
        </div>
      </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const TABS = [['home', 'الصفحة الرئيسية', 'الرئيسية'], ['store', 'معلومات المتجر', 'المتجر'], ['brand', 'الشعار والألوان والخطوط', 'الهوية'], ['chrome', 'الهيدر والفوتر', 'الهيدر']]

export default function Designer() {
  const { savedSettings, refreshSettings, notify, categories } = useApp()
  const confirm = useConfirm()
  const access = useOutletContext()
  const [backups, setBackups] = useState(false)
  const saved = useMemo(() => mergeSettings(savedSettings), [savedSettings])
  const [draft, setDraft] = useState(saved)
  const [tab, setTab] = useState('home')
  const [busy, setBusy] = useState(false)
  const touched = useRef(false)
  const frame = useRef()
  // the saved settings can arrive after the page opens: take them as long as nothing was edited yet
  useEffect(() => { if (!touched.current) setDraft(saved) }, [saved])
  const dirty = JSON.stringify(mergeSettings(draft)) !== JSON.stringify(saved)
  // closing or reloading the tab with unpublished work asks first
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    addEventListener('beforeunload', warn)
    return () => removeEventListener('beforeunload', warn)
  }, [dirty])
  const patch = (fn) => { touched.current = true; setDraft((d) => { const n = structuredClone(d); fn(n); return n }) }
  const post = (msg) => frame.current?.contentWindow?.postMessage(msg, location.origin)
  const c = draft.colors, a = draft.announcement

  const publish = async () => {
    setBusy(true)
    try {
      await api.saveSettings(mergeSettings(draft))
      await refreshSettings()
      touched.current = false
      const r = await api.rebuildSite()
      notify(r?.ok ? 'نُشر التصميم ✓ ويتحدّث لمحركات البحث خلال دقيقتين' : 'نُشر التصميم ✓ وظاهر للزوار الحين')
    } catch (er) { notify(er.message, 'err') } finally { setBusy(false) }
  }
  const resetAll = async () => {
    if (!(await confirm({ title: 'ترجع التصميم الأصلي؟', body: 'يرجع الشعار والألوان والصفحة الرئيسية والهيدر والفوتر لتصميم المنصة الأصلي. ما يتغير شي عند الزوار إلا لما تضغط «نشر».', ok: 'رجّع الأصلي' }))) return
    touched.current = true
    setDraft(mergeSettings({ ...structuredClone(DEFAULT_SETTINGS), home: defaultHome() }))
  }

  return (
    <>
      <AdminHead title="مصمم المتجر" action={access?.owner && <Button variant="outline" size="sm" onClick={() => setBackups(true)}><History className="size-4" />النسخ الاحتياطية</Button>} />
      {access?.owner && <Backups open={backups} onOpenChange={setBackups} onRestored={async () => { touched.current = false; await refreshSettings() }} />}

      <div className="grid grid-cols-1 gap-6 pb-28 xl:grid-cols-[minmax(400px,500px)_1fr] xl:items-start">
        <div className="grid gap-5">
          <div className="flex gap-1 overflow-x-auto rounded-full bg-sunken p-1 ring-1 ring-border">
            {TABS.map(([id, t, short]) => (
              <button key={id} type="button" onClick={() => { setTab(id); if (id === 'chrome') post({ type: 'mimi:scroll', top: 0 }) }}
                className={cn('h-10 flex-1 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors', tab === id ? 'bg-primary text-on-inverse shadow-hairline' : 'text-muted-foreground hover:text-primary')}><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{t}</span></button>
            ))}
          </div>

          {tab === 'home' && (
            <Panel title="عناصر الصفحة الرئيسية">
              <HomeBlocks blocks={draft.home} catImages={draft.categoryImages} setCatImage={(id, url) => patch((d) => { if (url) d.categoryImages[id] = url; else delete d.categoryImages[id] })} onChange={(home) => patch((d) => { d.home = home })} focus={(id) => setTimeout(() => post({ type: 'mimi:focus', id }), 120)} />
            </Panel>
          )}

          {tab === 'store' && <>
            <Panel title="اسم المتجر">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="الاسم بالعربي"><Input value={draft.store.name} maxLength={40} onChange={(e) => patch((d) => { d.store.name = e.target.value })} /></Field>
                <Field label="الاسم بالإنجليزي (اختياري)"><Input value={draft.store.nameEn} maxLength={40} dir="ltr" onChange={(e) => patch((d) => { d.store.nameEn = e.target.value })} /></Field>
              </div>
            </Panel>
            <Panel title="وصف المتجر لقوقل">
              <Textarea value={draft.store.description} maxLength={300} onChange={(e) => patch((d) => { d.store.description = e.target.value })} placeholder={SITE.description} />
              <p className="tabular mt-2 text-end text-xs text-muted-foreground">{draft.store.description.length}/300</p>
            </Panel>
            <Panel title="التواصل">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="رقم الواتساب والجوال" hint={/^\d{9,15}$/.test(normPhone(draft.store.whatsapp)) ? undefined : 'اكتب رقم صحيح، مثل 05xxxxxxxx'}><Input value={draft.store.whatsapp.replace(/^966/, '0')} inputMode="tel" dir="ltr" onChange={(e) => patch((d) => { d.store.whatsapp = normPhone(e.target.value) || e.target.value })} placeholder="05xxxxxxxx" className="text-end" /></Field>
                <Field label="البريد الإلكتروني" hint={/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(draft.store.email) ? undefined : 'اكتب بريد صحيح'}><Input value={draft.store.email} type="email" dir="ltr" onChange={(e) => patch((d) => { d.store.email = e.target.value.trim() })} className="text-end" /></Field>
              </div>
            </Panel>
            <Panel title="حسابات التواصل الاجتماعي">
              <div className="grid gap-3">
                {[['instagram', 'إنستقرام'], ['x', 'إكس (تويتر)'], ['tiktok', 'تيك توك'], ['snapchat', 'سناب شات']].map(([k, label]) => (
                  <Field key={k} label={label}><LinkInput value={draft.store.social[k]} onChange={(v) => patch((d) => { d.store.social[k] = v })} placeholder="https://" /></Field>
                ))}
              </div>
            </Panel>
            <Panel title="الشحن">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="رسوم الشحن للطلب (ر.س)"><Input value={draft.shipping?.fee ?? 35} inputMode="decimal" dir="ltr" className="text-end" onChange={(e) => patch((d) => { d.shipping ||= {}; d.shipping.fee = e.target.value.replace(/[^\d.]/g, '').slice(0, 6) })} /></Field>
                <Field label="شحن مجاني للطلبات من (ر.س)"><Input value={draft.shipping?.freeOver || ''} inputMode="numeric" dir="ltr" className="text-end" placeholder="بدون" onChange={(e) => patch((d) => { d.shipping ||= {}; d.shipping.freeOver = e.target.value.replace(/\D/g, '').slice(0, 6) })} /></Field>
              </div>
            </Panel>
          </>}

          {tab === 'brand' && <>
            <Panel title="الشعار">
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageSlot label="على الخلفية الفاتحة" value={draft.logo} fallback={DEFAULT_SETTINGS.logo} onChange={(v) => patch((d) => { d.logo = v || DEFAULT_SETTINGS.logo })} />
                <ImageSlot dark label="على الخلفية الغامقة" value={draft.logoLight} fallback={DEFAULT_SETTINGS.logoLight} onChange={(v) => patch((d) => { d.logoLight = v || DEFAULT_SETTINGS.logoLight })} />
              </div>
              <label className="mt-5 grid gap-2">
                <span className="flex items-center justify-between text-sm font-semibold text-primary">حجم الشعار <span className="tabular text-muted-foreground">{draft.logoScale}%</span></span>
                <input type="range" min="60" max="160" step="5" value={draft.logoScale} onChange={(e) => patch((d) => { d.logoScale = Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
              </label>
            </Panel>

            <Panel title="الألوان">
              <p className="mb-2 text-sm font-semibold text-primary">ثيمات جاهزة</p>
              <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRESETS.map((p) => {
                  const on = p.primary === c.primary && p.accent === c.accent && p.background === c.background
                  return (
                    <button key={p.name} type="button" onClick={() => patch((d) => { d.colors = { primary: p.primary, accent: p.accent, background: p.background } })}
                      className={cn('flex items-center gap-2 rounded-md p-2 text-start text-xs font-semibold ring-1 transition-shadow', on ? 'ring-2 ring-primary' : 'ring-border hover:ring-border-strong')}>
                      <span className="flex shrink-0 overflow-hidden rounded-full ring-1 ring-black/10">{[p.primary, p.accent, p.background].map((x) => <span key={x} className="h-6 w-3" style={{ background: x }} />)}</span>
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      {on && <Check className="size-3.5 shrink-0 text-primary" />}
                    </button>
                  )
                })}
              </div>
              <div className="grid gap-3">
                <ColorField label="اللون الأساسي" value={c.primary} onChange={(v) => patch((d) => { d.colors.primary = v })} />
                <ColorField label="اللون المميّز" value={c.accent} onChange={(v) => patch((d) => { d.colors.accent = v })} />
                <ColorField label="لون خلفية المتجر" value={c.background} onChange={(v) => patch((d) => { d.colors.background = v })} />
              </div>
            </Panel>

            <Panel title="الخطوط">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="خط العناوين"><Select value={draft.fonts.heading} onChange={(e) => patch((d) => { d.fonts.heading = e.target.value })}>{FONTS.heading.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</Select></Field>
                <Field label="خط النصوص"><Select value={draft.fonts.body} onChange={(e) => patch((d) => { d.fonts.body = e.target.value })}>{FONTS.body.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</Select></Field>
              </div>
            </Panel>
            <Panel title="شكل الأزرار والبطاقات">
              <div className="grid grid-cols-3 gap-2">
                {RADII.map(([k, t]) => (
                  <button key={k} type="button" onClick={() => patch((d) => { d.radius = k })} className={cn('grid justify-items-center gap-2 p-3 text-xs font-semibold ring-1 transition-shadow', draft.radius === k ? 'ring-2 ring-primary' : 'ring-border hover:ring-border-strong', { round: 'rounded-xl', soft: 'rounded-lg', sharp: 'rounded-sm' }[k])}>
                    <span className={cn('h-7 w-16 bg-primary', { round: 'rounded-full', soft: 'rounded-[8px]', sharp: 'rounded-[3px]' }[k])} />{t}
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="خلفية المتجر">
              <ImageSlot tall label="صورة خلفية لكل صفحات المتجر (اختياري)" value={draft.background.image} onChange={(v) => patch((d) => { d.background.image = v })} />
              <div className="mt-4"><Switch checked={draft.background.decor} onChange={(v) => patch((d) => { d.background.decor = v })} label="الزخارف الخفيفة (الخط المنحني والظلال)" /></div>
            </Panel>
          </>}

          {tab === 'chrome' && <>
            <Panel title="شريط الإعلان" action={<Switch checked={a.on} onChange={(v) => patch((d) => { d.announcement.on = v })} label={a.on ? 'ظاهر' : 'مخفي'} />}>
              <div className="grid gap-3">
                <Field label="نص الإعلان"><Input value={a.text} maxLength={140} onChange={(e) => patch((d) => { d.announcement.text = e.target.value })} placeholder="مثال: خصم 20% على تصميم المتاجر لفترة محدودة" /></Field>
                <Field label="رابط (اختياري)"><LinkInput value={a.link} onChange={(x) => patch((d) => { d.announcement.link = x })} /></Field>
              </div>
            </Panel>
            <Panel title="الهيدر">
              <p className="mb-2 text-sm font-semibold text-primary">روابط القائمة</p>
              <HeaderLinks value={draft.header.links} onChange={(links) => patch((d) => { d.header.links = links })} />
              <div className="mt-4 grid gap-3 border-t border-border pt-4">
                <Switch checked={draft.header.search} onChange={(v) => patch((d) => { d.header.search = v })} label="أيقونة البحث" />
                <Switch checked={draft.header.wishlist} onChange={(v) => patch((d) => { d.header.wishlist = v })} label="أيقونة المفضلة" />
              </div>
              {JSON.stringify(draft.header.links) !== JSON.stringify(DEFAULT_HEADER_LINKS) && <button type="button" onClick={() => patch((d) => { d.header.links = structuredClone(DEFAULT_HEADER_LINKS) })} className="mt-3 text-xs font-semibold text-muted-foreground hover:text-primary">رجّع الروابط الأصلية</button>}
            </Panel>
            <Panel title="دعوة التواصل أعلى الفوتر" action={<Switch checked={draft.footer.cta} onChange={(v) => patch((d) => { d.footer.cta = v; setTimeout(() => post({ type: 'mimi:scroll', top: 'end' }), 50) })} label={draft.footer.cta ? 'ظاهرة' : 'مخفية'} />}>
              <div className="grid gap-3">
                <Field label="العنوان"><Input value={draft.footer.ctaTitle} maxLength={60} onChange={(e) => patch((d) => { d.footer.ctaTitle = e.target.value })} /></Field>
                <Field label="السطر تحته"><Input value={draft.footer.ctaText} maxLength={140} onChange={(e) => patch((d) => { d.footer.ctaText = e.target.value })} /></Field>
              </div>
            </Panel>
            <Panel title="الفوتر">
              <p className="mb-2 text-sm font-semibold text-primary">روابط عمود «{draft.store.name}»</p>
              <HeaderLinks value={draft.footer.links || DEFAULT_FOOTER_LINKS} onChange={(links) => patch((d) => { d.footer.links = links })} max={8} />
              <div className="mt-4" />
              <Field label="نبذة تحت الشعار"><Textarea value={draft.footer.about} maxLength={200} onChange={(e) => patch((d) => { d.footer.about = e.target.value })} placeholder={DEFAULT_ABOUT} /></Field>
              <div className="mt-4"><Switch checked={draft.footer.payments} onChange={(v) => patch((d) => { d.footer.payments = v; setTimeout(() => post({ type: 'mimi:scroll', top: 'end' }), 50) })} label="شعارات طرق الدفع" /></div>
              <button type="button" onClick={() => post({ type: 'mimi:scroll', top: 'end' })} className="mt-3 text-xs font-semibold text-primary underline underline-offset-4">شوف الفوتر في المعاينة</button>
            </Panel>
          </>}
        </div>

        <div id="design-preview" className="min-w-0 scroll-mt-4 xl:sticky xl:top-6"><Preview draft={draft} frame={frame} /></div>
      </div>

      {/* publish bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:start-[264px]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-8 sm:py-3">
          <p className={cn('basis-full text-xs font-semibold sm:basis-auto sm:flex-1 sm:text-sm', dirty ? 'text-warning' : 'text-muted-foreground')}>{dirty ? 'عندك تعديلات ما نُشرت' : 'كل التعديلات منشورة'}</p>
          <Button type="button" variant="ghost" size="sm" onClick={resetAll} aria-label="التصميم الأصلي" className="px-2 font-semibold sm:px-4"><RotateCcw className="size-4" /><span className="hidden sm:inline">التصميم الأصلي</span></Button>
          <Button type="button" variant="outline" size="sm" className="xl:hidden" onClick={() => document.getElementById('design-preview')?.scrollIntoView({ behavior: 'smooth' })}><Eye className="size-4" />معاينة</Button>
          <Button type="button" variant="outline" size="sm" disabled={!dirty || busy} onClick={() => { touched.current = false; setDraft(saved) }} aria-label="تراجع"><Undo2 className="size-4" /><span className="hidden sm:inline">تراجع</span></Button>
          <Button type="button" size="sm" disabled={!dirty || busy} onClick={publish} className="ms-auto min-w-24 sm:h-11 sm:min-w-32">{busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}نشر</Button>
        </div>
      </div>
    </>
  )
}
