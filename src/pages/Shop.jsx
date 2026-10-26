import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { cn } from '@/lib/utils'
import ServiceTicket from '@/components/home/ServiceTicket.jsx'
import { PageHead, Empty, Input, Select, Skeleton } from '@/components/ui/kit.jsx'
import { Button } from '@/components/ui/button'
import { SEO_H1 } from '@/lib/seo.js'
import { effectivePrice } from '@/lib/format.js'

const SORTS = [
  { id: 'featured', label: 'المقترح' },
  { id: 'low', label: 'الأقل سعراً' },
  { id: 'high', label: 'الأعلى سعراً' },
  { id: 'name', label: 'الاسم' },
]

export default function Shop({ categoryId: fromProps }) {
  const { categoryId: fromUrl } = useParams()
  const categoryId = fromProps ?? fromUrl
  const [params, setParams] = useSearchParams()
  const { categories, products, catalogReady, settings } = useApp()
  const q = params.get('q') || ''
  const sort = params.get('sort') || 'featured'
  const cat = categories.find((c) => c.id === categoryId)

  const list = useMemo(() => {
    let l = products
    if (categoryId) l = l.filter((p) => p.categoryId === categoryId)
    if (q) l = l.filter((p) => (p.name + ' ' + (p.summary || '') + ' ' + (p.description || '')).includes(q))
    const s = [...l]
    if (sort === 'low') s.sort((a, b) => effectivePrice(a) - effectivePrice(b))
    if (sort === 'high') s.sort((a, b) => effectivePrice(b) - effectivePrice(a))
    if (sort === 'name') s.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    if (sort === 'featured') s.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    return s
  }, [products, categoryId, q, sort])

  const set = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); setParams(n, { replace: true }) }
  const chip = (on) => cn('inline-flex min-h-11 shrink-0 items-center gap-2 px-5 text-[15px] font-bold transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-sunken text-primary hover:bg-[var(--p-cream-200)]')

  return (
    <div className="container-w py-10 sm:py-14 [--notch:var(--background)]">
      <PageHead
        crumbs={<><Link to="/" className="hover:underline">الرئيسية</Link><span>/</span><span>{cat ? cat.name : 'كل المنتجات'}</span></>}
        title={cat ? SEO_H1[cat.id] || cat.name : q ? `نتائج «${q}»` : 'كل المنتجات'}
        lead={cat?.blurb || `كل منتجات ${settings.store.name}. اختاري القسم أو ابحثي باسم المنتج.`}
      />

      <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" aria-label="الأقسام">
        <Link to={'/shop' + (q ? `?q=${encodeURIComponent(q)}` : '')} className={chip(!categoryId)}>الكل <span className="tabular opacity-70">{products.length}</span></Link>
        {categories.map((c) => (
          <Link key={c.id} to={`/${c.id}`} className={chip(categoryId === c.id)}>
            {c.name}<span className="tabular opacity-70">{products.filter((p) => p.categoryId === c.id).length}</span>
          </Link>
        ))}
      </nav>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 start-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => set('q', e.target.value)} placeholder="ابحثي داخل المنتجات" aria-label="بحث" className="ps-12" />
        </label>
        <Select value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="ترتيب" className="w-auto">
          {SORTS.map((s) => <option key={s.id} value={s.id}>ترتيب: {s.label}</option>)}
        </Select>
        <span className="tabular ms-auto text-[16px] text-muted-foreground">{list.length} منتجات</span>
      </div>

      {!catalogReady ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-[4/5]" />)}</div>
      ) : list.length === 0 ? (
        <Empty icon={Search} title="ما فيه منتج يطابق بحثك" action={<Button variant="outline" onClick={() => setParams({})}>مسح البحث</Button>}>امسحي البحث أو اختاري قسم ثاني.</Empty>
      ) : (
        <><h2 className="sr-only">{cat?.name || 'المنتجات'}</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-8 sm:gap-y-16 lg:grid-cols-4">{list.map((p) => <ServiceTicket key={p.id} p={p} />)}</div></>
      )}
    </div>
  )
}
