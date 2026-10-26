import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, X } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { money, effectivePrice, optKey, unitPrice, missingOptions } from '@/lib/format.js'
import { trackAddToCart } from '@/lib/analytics.js'
import OptionNote from '@/components/OptionNote.jsx'

/** A service with options never goes to the cart blind: the «+» on its card opens this window, the customer picks
 *  (required choices first), sees the total, then adds. Same choices and rules as the service page. */
export default function OptionsDialog({ p, open, onOpenChange }) {
  const { addToCart } = useApp()
  const [sel, setSel] = useState([])
  const [err, setErr] = useState('')
  useEffect(() => { if (open) { setSel([]); setErr('') } }, [open, p?.id])
  if (!p) return null
  const pick = (o, v) => {
    const k = optKey(o, v)
    setErr('')
    setSel((cur) => {
      if (cur.includes(k)) return cur.filter((x) => x !== k) // a second tap clears it
      const rest = o.type === 'radio' ? cur.filter((x) => !x.startsWith(o.id + ':')) : cur
      return [...rest, k]
    })
  }
  const add = () => {
    const miss = missingOptions(p, sel)
    if (miss.length) { setErr(`اختر: ${miss.join('، ')}`); return }
    addToCart(p.id, 1, '', sel)
    trackAddToCart(p, 1, unitPrice(p, sel))
    onOpenChange(false)
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-primary/45 motion-safe:animate-[fade-in_200ms]" />
        <Dialog.Content dir="rtl" className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-h-[min(88dvh,720px)] max-w-lg flex-col overflow-hidden rounded-xl bg-background shadow-overlay outline-none motion-safe:animate-[rise-in_260ms_var(--p-ease-emphasized)] sm:inset-x-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2">
          <div className="flex items-start gap-3 border-b border-border p-5">
            <img src={p.image} alt="" className="size-14 shrink-0 rounded-md bg-sunken object-cover" />
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-display text-[17px] font-semibold leading-snug text-primary">{p.name}</Dialog.Title>
              <Dialog.Description className="tabular mt-0.5 text-sm text-muted-foreground">يبدأ من {money(effectivePrice(p))} · اختر اللي يناسبك</Dialog.Description>
            </div>
            <Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-sunken hover:text-primary" aria-label="إغلاق"><X className="size-5" /></Dialog.Close>
          </div>

          <div className="grid gap-5 overflow-y-auto p-5">
            {p.options.map((o) => (
              <fieldset key={o.id} className="grid gap-2">
                <legend className="mb-2 text-sm font-bold">{o.name} <span className={cn('font-normal', o.required ? 'text-danger' : 'text-muted-foreground')}>{o.required ? '(مطلوب)' : o.type === 'checkbox' ? '(اختر اللي تبي)' : '(اختياري)'}</span></legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {o.values.map((v) => {
                    const on = sel.includes(optKey(o, v))
                    return (
                      <button key={v.id} type="button" role={o.type === 'radio' ? 'radio' : 'checkbox'} aria-checked={on} onClick={() => pick(o, v)}
                        className={cn('flex min-h-12 items-center gap-3 rounded-lg border-[1.5px] px-3.5 py-2.5 text-start text-sm transition-colors', on ? 'border-primary bg-sunken' : 'border-border hover:border-border-strong')}>
                        <span className={cn('grid size-5 shrink-0 place-items-center border-[1.5px]', o.type === 'radio' ? 'rounded-full' : 'rounded-[6px]', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong')}>{on && <Check className="size-3" strokeWidth={3.5} />}</span>
                        <span className="flex-1 leading-6">{v.name}</span>
                        {Number(v.price) > 0 && <span className="tabular shrink-0 font-semibold text-primary">+{money(v.price)}</span>}
                      </button>
                    )
                  })}
                </div>
              <OptionNote o={o} onGo={() => onOpenChange?.(false)} />
            </fieldset>
            ))}
          </div>

          <div className="grid gap-3 border-t border-border bg-surface p-5">
            {err && <p className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{err}</p>}
            <Button size="lg" className="w-full" onClick={add}>أضيفي للسلة <span className="tabular text-accent">{money(unitPrice(p, sel))}</span></Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
