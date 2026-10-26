import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, X } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { money, effectivePrice } from '@/lib/format.js'
import { productPath } from '@/lib/slug.js'

export function SearchDialog({ open, onOpenChange }) {
  const { products } = useApp()
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const results = useMemo(() => {
    const t = q.trim()
    return t ? products.filter((p) => (p.name + ' ' + (p.summary || '')).includes(t)).slice(0, 6) : []
  }, [q, products])
  const close = () => { onOpenChange(false); setQ('') }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-primary/45 data-[state=open]:animate-[fade-in_200ms_ease-out]" />
        <Dialog.Content onCloseAutoFocus={(e) => e.preventDefault()} className="fixed inset-x-4 top-[10vh] z-50 mx-auto max-w-xl overflow-hidden rounded-xl bg-surface shadow-overlay outline-none data-[state=open]:animate-[rise-in_260ms_var(--p-ease-emphasized)]">
          <Dialog.Title className="sr-only">بحث في المنتجات</Dialog.Title>
          <form onSubmit={(e) => { e.preventDefault(); nav(`/shop?q=${encodeURIComponent(q)}`); close() }} className="flex items-center gap-3 border-b border-border px-5">
            <Search className="size-5 text-primary" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث: متجر، حملة، دومين، سجل تجاري" aria-label="كلمة البحث" className="h-16 flex-1 bg-transparent text-lg outline-none placeholder:text-subtle" />
            <Dialog.Close className="grid size-10 place-items-center rounded-full text-primary hover:bg-sunken" aria-label="إغلاق"><X className="size-5" /></Dialog.Close>
          </form>
          {q && (
            <ul className="max-h-[60vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="p-4 text-muted-foreground">ما لقينا نتيجة لـ «{q}». جرّب كلمة أعم مثل «حملة» أو «تصميم».</li>}
              {results.map((p) => (
                <li key={p.id}>
                  <Link to={productPath(p.id)} onClick={close} className="flex items-center gap-3 rounded-md p-2 hover:bg-sunken">
                    <img src={p.image} alt="" className="size-12 rounded-sm object-cover" />
                    <span className="flex-1 font-semibold">{p.name}</span>
                    <span className="tabular font-bold text-primary">{money(effectivePrice(p))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
