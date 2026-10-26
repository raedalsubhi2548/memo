import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold leading-5 whitespace-nowrap', {
  variants: {
    variant: {
      gold: 'bg-accent text-accent-foreground',
      green: 'bg-primary text-accent',
      soft: 'bg-sunken text-primary',
      outline: 'border border-border-strong text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'gold' },
})

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
