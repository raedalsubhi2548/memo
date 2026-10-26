import * as React from 'react'
import * as T from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs = T.Root

export const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <T.List ref={ref} className={cn('-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0', className)} {...props} />
))
TabsList.displayName = 'TabsList'

export const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <T.Trigger
    ref={ref}
    className={cn(
      'h-11 shrink-0 rounded-full border-[1.5px] border-border-strong px-4 text-sm font-semibold text-primary transition-colors duration-200',
      'hover:border-primary data-[state=active]:border-[var(--chip-bg-active)] data-[state=active]:bg-[var(--chip-bg-active)] data-[state=active]:text-[var(--chip-fg-active)]',
      className,
    )}
    {...props}
  />
))
TabsTrigger.displayName = 'TabsTrigger'

export const TabsContent = T.Content
