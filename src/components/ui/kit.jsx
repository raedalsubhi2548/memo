// Shared building blocks for inner pages (storefront, account, admin).
import * as React from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ORDER_STATUSES } from '@/data/seed.js'

const control = 'w-full rounded-md border-[1.5px] border-border bg-surface px-3.5 text-[16px] text-foreground outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-subtle focus:border-primary focus:ring-[3px] focus:ring-ring/35 disabled:opacity-60 read-only:bg-sunken read-only:text-muted-foreground'

export const Input = React.forwardRef(({ className, ...p }, ref) => <input ref={ref} className={cn(control, 'h-12', className)} {...p} />)
Input.displayName = 'Input'
export const Textarea = React.forwardRef(({ className, ...p }, ref) => <textarea ref={ref} className={cn(control, 'min-h-24 py-3 leading-7', className)} {...p} />)
Textarea.displayName = 'Textarea'
export const Select = React.forwardRef(({ className, children, ...p }, ref) => (
  <select ref={ref} className={cn(control, 'h-12 cursor-pointer appearance-none read-only:bg-surface read-only:text-foreground bg-[length:16px] bg-[position:left_14px_center] bg-no-repeat ps-3.5 pe-10', className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2309382e' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...p}>{children}</select>
))
Select.displayName = 'Select'

export function Field({ label, hint, error, className, children }) {
  return (
    <label className={cn('grid content-start gap-1.5', className)}>
      <span className="text-sm font-bold text-foreground">{label}</span>
      {children}
      {hint && !error && <span className="text-xs leading-6 text-muted-foreground">{hint}</span>}
      {error && <span className="text-sm text-danger" role="alert">{error}</span>}
    </label>
  )
}

export function Panel({ className, title, action, children }) {
  return (
    <section className={cn('bg-surface p-5 sm:p-7', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-lg font-semibold text-primary">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageHead({ title, lead, crumbs, action }) {
  return (
    <div className="mb-12 flex flex-wrap items-end justify-between gap-6 sm:mb-16">
      <div className="max-w-3xl">
        {crumbs && <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-[16px] text-muted-foreground" aria-label="المسار">{crumbs}</nav>}
        <h1 className="text-balance font-display text-[clamp(2.6rem,1rem+4.6vw,5.75rem)] font-extrabold leading-[1.1] text-primary motion-safe:animate-[rise-in_.8s_var(--p-ease-emphasized)_both]">{title}</h1>
        {lead && <p className="mt-5 max-w-[52ch] text-[18px] leading-8 text-foreground motion-safe:animate-[rise-in_1s_var(--p-ease-emphasized)_both]">{lead}</p>}
      </div>
      {action}
    </div>
  )
}

export function Empty({ icon: IconC, title, children, action }) {
  return (
    <div className="grid justify-items-center gap-3 bg-sunken px-6 py-14 text-center">
      {IconC && <span className="grid size-14 place-items-center rounded-full bg-sunken text-primary"><IconC className="size-6" /></span>}
      <p className="font-display text-lg font-semibold text-primary">{title}</p>
      {children && <p className="max-w-md text-muted-foreground">{children}</p>}
      {action}
    </div>
  )
}

export function Qty({ value, onChange, size = 'md' }) {
  const h = size === 'sm' ? 'h-9' : 'h-12'
  return (
    <div className={cn('inline-flex items-center border-[1.5px] border-border-strong bg-background', h)}>
      <button type="button" onClick={() => onChange(value + 1)} className="grid h-full w-10 place-items-center text-primary hover:bg-sunken" aria-label="زيادة الكمية"><Plus className="size-4" /></button>
      <span className="tabular min-w-7 text-center font-bold" aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} className="grid h-full w-10 place-items-center text-primary hover:bg-sunken disabled:opacity-30 disabled:hover:bg-transparent" aria-label="تقليل الكمية"><Minus className="size-4" /></button>
    </div>
  )
}

export const statusLabel = (s) => ORDER_STATUSES.find((x) => x.id === s)?.label || s
const tone = {
  pending: 'bg-warning-soft text-warning',
  paid: 'bg-success-soft text-success',
  in_progress: 'bg-[#e6eef6] text-[#23507c]',
  review: 'bg-[#f1e8f7] text-[#6a3a8a]',
  completed: 'bg-primary text-accent',
  cancelled: 'bg-danger-soft text-danger',
}
export function StatusPill({ status, className }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 whitespace-nowrap', tone[status] || 'bg-sunken text-muted-foreground', className)}>{statusLabel(status)}</span>
}

const FLOW = ['pending', 'paid', 'in_progress', 'review', 'completed']
/** The same tracker as the homepage waybill, for a real order. */
export function OrderTracker({ status }) {
  if (status === 'cancelled') return <StatusPill status="cancelled" />
  const at = FLOW.indexOf(status)
  return (
    <ol className="relative grid grid-cols-5 gap-1" aria-label="مراحل الطلب">
      <span className="absolute inset-x-[10%] top-[15px] h-[3px] rounded-full bg-border-strong" aria-hidden="true" />
      <span className="absolute start-[10%] top-[15px] h-[3px] rounded-full bg-primary transition-[width] duration-500 ease-emphasized" style={{ width: `${(Math.max(0, at) / (FLOW.length - 1)) * 80}%` }} aria-hidden="true" />
      {FLOW.map((s, i) => (
        <li key={s} className="relative z-10 grid justify-items-center gap-2 text-center" aria-current={i === at ? 'step' : undefined}>
          <span className={cn('grid size-8 place-items-center rounded-full border-[3px] text-xs font-bold',
            i < at ? 'border-primary bg-primary text-accent' : i === at ? 'border-accent bg-accent text-accent-foreground ring-4 ring-accent/30' : 'border-border-strong bg-surface text-muted-foreground')}>
            {i < at ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <span className={cn('text-[11px] leading-5 sm:text-xs', i === at ? 'font-bold text-primary' : 'text-muted-foreground')}>{statusLabel(s)}</span>
        </li>
      ))}
    </ol>
  )
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-sunken', className)} />
}

export function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="inline-flex items-center gap-2 text-sm font-semibold">
      <span className={cn('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-border-strong')}>
        <span className={cn('absolute top-1 size-4 rounded-full transition-[inset-inline-start] duration-200', checked ? 'start-6 bg-accent' : 'start-1 bg-surface')} />
      </span>
      <span className={checked ? 'text-primary' : 'text-muted-foreground'}>{label}</span>
    </button>
  )
}
