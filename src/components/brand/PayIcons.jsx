import { Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'

// Official badges (not redrawn), served from our own files in public/brand/pay.
export const PAY_METHODS = [
  // Apple's file is a white mark: shown inverted (black) so it matches the other white badges
  { name: 'Apple Pay', src: '/brand/pay/applepay.webp', invert: true },
  { name: 'Visa', src: '/brand/pay/visa.webp' },
  { name: 'Mastercard', src: '/brand/pay/mastercard.webp' },
  // mada: official mark (CC0, Wikimedia Commons «Mada Only»), cropped to the logo and served from our own files
  { name: 'مدى', src: '/brand/pay/mada.webp' },
]

export default function PayIcons({ className, bank = false, size = 'md' }) {
  // always one line: the badges share the width and shrink together on small screens
  const h = size === 'sm' ? 'h-8 max-w-14' : 'h-10 max-w-[72px] sm:h-11'
  return (
    <ul className={cn('flex flex-nowrap items-center gap-1.5 sm:gap-2', className)} aria-label="طرق الدفع">
      {PAY_METHODS.map((m) => (
        <li key={m.name} className={cn('grid min-w-0 flex-1 place-items-center rounded-md px-1 shadow-hairline ring-1', 'bg-white ring-black/5', h)} title={m.name}>
          <img src={m.src} alt={m.name} loading="lazy" className={cn('max-h-[60%] max-w-full object-contain', m.invert && 'invert')} />
        </li>
      ))}
      {bank && (
        <li className={cn('grid min-w-0 flex-1 place-items-center rounded-md bg-white px-1 text-primary shadow-hairline ring-1 ring-black/5', h)} title="تحويل بنكي">
          <span className="flex flex-col items-center leading-none"><Landmark className="size-4" /><span className="mt-0.5 text-[9px] font-bold">تحويل</span></span>
        </li>
      )}
    </ul>
  )
}
