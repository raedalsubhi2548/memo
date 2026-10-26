import * as React from 'react'
import * as A from '@radix-ui/react-accordion'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Accordion = A.Root

export const AccordionItem = React.forwardRef(({ className, ...props }, ref) => (
  <A.Item ref={ref} className={cn('rounded-lg border border-border bg-surface', className)} {...props} />
))
AccordionItem.displayName = 'AccordionItem'

export const AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <A.Header className="flex">
    <A.Trigger
      ref={ref}
      className={cn('group flex min-h-14 flex-1 items-center justify-between gap-4 px-5 py-3 text-start font-display text-[15px] font-semibold text-foreground', className)}
      {...props}
    >
      {children}
      <Plus className="size-5 shrink-0 text-primary transition-transform duration-300 ease-emphasized group-data-[state=open]:rotate-45" aria-hidden="true" />
    </A.Trigger>
  </A.Header>
))
AccordionTrigger.displayName = 'AccordionTrigger'

export const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <A.Content ref={ref} className="overflow-hidden data-[state=open]:animate-[acc-down_260ms_var(--p-ease-emphasized)] data-[state=closed]:animate-[acc-up_160ms_ease-in]" {...props}>
    <div className={cn('px-5 pb-5 leading-8 text-muted-foreground', className)}>{children}</div>
  </A.Content>
))
AccordionContent.displayName = 'AccordionContent'
