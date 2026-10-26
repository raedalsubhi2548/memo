// Admin building blocks: page head, search, table, confirm dialog, segmented filter.
import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function AdminHead({ title, lead, back, action }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back}
        <h1 className="truncate font-display text-2xl font-semibold text-primary sm:text-[28px]">{title}</h1>
        {lead && <p className="mt-1 text-sm text-muted-foreground">{lead}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </header>
  )
}

export function SearchBox({ value, onChange, placeholder, className }) {
  return (
    <label className={cn('relative block', className)}>
      <Search className="pointer-events-none absolute top-1/2 start-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className="h-11 w-full rounded-full border-[1.5px] border-border bg-surface ps-10 pe-4 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-subtle focus:border-primary focus:ring-[3px] focus:ring-ring/35" />
    </label>
  )
}

/** Horizontal filter chips with counts. options: [{id,label,count}] */
export function Segments({ value, onChange, options }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" role="tablist">
      {options.map((o) => {
        const on = value === o.id
        return (
          <button key={o.id || 'all'} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.id)}
            className={cn('flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-colors', on ? 'bg-primary text-on-inverse ring-primary' : 'bg-surface text-primary ring-border hover:ring-primary')}>
            {o.label}
            <span className={cn('tabular rounded-full px-1.5 text-xs leading-5', on ? 'bg-accent text-accent-foreground' : 'bg-sunken text-muted-foreground')}>{o.count}</span>
          </button>
        )
      })}
    </div>
  )
}

export function TableCard({ children, className }) {
  return <div className={cn('overflow-hidden rounded-lg bg-surface shadow-hairline ring-1 ring-border', className)}><div className="overflow-x-auto">{children}</div></div>
}
export const Table = ({ className, ...p }) => <table className={cn('w-full min-w-[640px] border-collapse text-sm', className)} {...p} />
export const Th = ({ className, ...p }) => <th className={cn('whitespace-nowrap border-b border-border bg-sunken/60 px-4 py-3 text-start text-xs font-bold text-muted-foreground', className)} {...p} />
export const Td = ({ className, ...p }) => <td className={cn('border-b border-border px-4 py-3 align-middle last-of-type:border-e-0 [tr:last-child_&]:border-b-0', className)} {...p} />

export function IconBtn({ className, tone, ...p }) {
  return <button type="button" className={cn('grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-sunken hover:text-primary', tone === 'danger' && 'hover:bg-danger-soft hover:text-danger', className)} {...p} />
}

/** Promise-based confirm dialog: const confirm = useConfirm(); if (await confirm({...})) */
const ConfirmCtx = React.createContext(null)
export function ConfirmProvider({ children }) {
  const [state, setState] = React.useState(null)
  const confirm = React.useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), [])
  const close = (v) => { state?.resolve(v); setState(null) }
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Dialog.Root open={!!state} onOpenChange={(o) => !o && close(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-primary/45 motion-safe:animate-[fade-in_200ms]" />
          <Dialog.Content className="fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-md -translate-y-1/2 rounded-xl bg-background p-6 shadow-overlay outline-none motion-safe:animate-[rise-in_260ms_var(--p-ease-emphasized)]">
            <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger"><TriangleAlert className="size-6" /></span>
            <Dialog.Title className="mt-4 font-display text-lg font-semibold text-primary">{state?.title}</Dialog.Title>
            {state?.body && <Dialog.Description className="mt-1 text-sm leading-7 text-muted-foreground">{state.body}</Dialog.Description>}
            <div className="mt-6 flex gap-2">
              <Button className="flex-1 bg-danger text-white hover:bg-danger/90" onClick={() => close(true)}>{state?.ok || 'حذف'}</Button>
              <Button variant="outline" className="flex-1" onClick={() => close(false)} autoFocus>إلغاء</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmCtx.Provider>
  )
}
export const useConfirm = () => React.useContext(ConfirmCtx)
