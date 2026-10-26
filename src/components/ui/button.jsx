import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-sans font-bold transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-standard focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-[1.15em] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] shadow-[0_10px_24px_-12px_rgb(125_63_76/0.7)] hover:-translate-y-0.5 hover:bg-[var(--btn-primary-bg-hover)]',
        accent: 'bg-[var(--btn-accent-bg)] text-[var(--btn-accent-fg)] hover:bg-accent-hover',
        outline: 'bg-white/70 text-primary ring-1 ring-[var(--p-gold-400)] hover:bg-white',
        ghost: 'text-primary hover:bg-sunken',
        inverse: 'bg-on-inverse text-primary hover:bg-white',
      },
      size: {
        sm: 'h-9 px-4 text-[13px]',
        md: 'h-11 px-6 text-[14px]',
        lg: 'h-12 px-7 text-[15px]',
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
