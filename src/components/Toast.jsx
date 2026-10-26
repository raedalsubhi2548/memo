import { Check, X } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { cn } from '@/lib/utils'

export default function Toast() {
  const { toast } = useApp()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex justify-center px-4" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={cn('flex items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold shadow-overlay motion-safe:animate-[rise-in_260ms_var(--p-ease-emphasized)]', toast.kind === 'err' ? 'bg-danger text-white' : 'bg-primary text-on-inverse')}>
          <span className={cn('grid size-6 place-items-center rounded-full', toast.kind === 'err' ? 'bg-white/20' : 'bg-accent text-accent-foreground')}>{toast.kind === 'err' ? <X className="size-3.5" /> : <Check className="size-3.5" strokeWidth={3} />}</span>
          {toast.text}
        </div>
      )}
    </div>
  )
}
