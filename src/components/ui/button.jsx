import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'relative isolate overflow-hidden after:pointer-events-none after:absolute after:inset-y-0 after:left-[-70%] after:w-1/3 after:skew-x-[-20deg] after:bg-white/25 after:transition-[left] after:duration-700 after:ease-out hover:after:left-[130%] inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-display font-semibold transition-[background-color,color,box-shadow,transform] duration-200 ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-[1.15em] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)]',
        accent: 'bg-[var(--btn-accent-bg)] text-[var(--btn-accent-fg)] hover:bg-accent-hover',
        outline: 'border-[1.5px] border-border-strong bg-transparent text-primary hover:border-primary',
        ghost: 'text-primary hover:bg-sunken',
        inverse: 'border-[1.5px] border-on-inverse/40 text-on-inverse hover:border-accent hover:text-accent',
      },
      size: {
        sm: 'h-10 px-4 text-sm',
        md: 'h-[var(--btn-height)] px-6 text-[15px]',
        lg: 'h-[var(--btn-height-lg)] px-8 text-base',
        icon: 'size-11 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
})
Button.displayName = 'Button'

export { Button, buttonVariants }
