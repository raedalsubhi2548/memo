import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Sheet = Dialog.Root
export const SheetTrigger = Dialog.Trigger
export const SheetClose = Dialog.Close
export const SheetTitle = Dialog.Title
export const SheetDescription = Dialog.Description

// side="start" opens from the reading start (right in RTL)
export const SheetContent = React.forwardRef(({ side = 'start', className, children, ...props }, ref) => (
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-50 bg-primary/45 data-[state=open]:animate-[fade-in_200ms_ease-out] data-[state=closed]:animate-[fade-out_120ms_ease-in]" />
    <Dialog.Content
      ref={ref}
      // no focus ring left on the first link or the icon that opened it (keyboard users still get rings when they move)
      onOpenAutoFocus={(e) => { e.preventDefault(); e.currentTarget?.focus?.() }}
      onCloseAutoFocus={(e) => e.preventDefault()}
      className={cn(
        'fixed inset-y-0 z-50 flex w-[min(380px,88vw)] flex-col bg-background shadow-overlay outline-none',
        side === 'start' ? 'start-0 data-[state=open]:animate-[sheet-in-start_320ms_var(--p-ease-emphasized)]' : 'end-0 data-[state=open]:animate-[sheet-in-end_320ms_var(--p-ease-emphasized)]',
        className,
      )}
      {...props}
    >
      {children}
      <Dialog.Close className="absolute top-4 end-4 z-20 grid size-11 place-items-center rounded-full text-primary hover:bg-sunken" aria-label="إغلاق">
        <X className="size-5" />
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
))
SheetContent.displayName = 'SheetContent'
