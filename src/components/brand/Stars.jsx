import { useId } from 'react'
import { cn } from '@/lib/utils'

// five gold stars as one small SVG (one element instead of five icons: lighter pages, faster hydration)
const D = [0, 1, 2, 3, 4].map((i) => `M${12 + i * 26} 2l3.09 6.26 6.91 1.01-5 4.87 1.18 6.88-6.18-3.25-6.18 3.25 1.18-6.88-5-4.87 6.91-1.01z`).join('')

// `value` (0–5) fills that many stars in gold over grey ones; without it all five are gold
export default function Stars({ size = 14, className, value = 5 }) {
  const id = useId().replace(/:/g, '')
  const v = Math.max(0, Math.min(5, Number(value) || 0))
  return (
    <span className={cn('flex', className)} role="img" aria-label={`${v} من 5`}>
      <svg width={(size * 128) / 24} height={size} viewBox="0 0 128 24" aria-hidden="true">
        {v < 5 && <><clipPath id={`s${id}`}><rect width={v % 1 ? 2 + Math.floor(v) * 26 + (v % 1) * 20 : v * 26} height="24" /></clipPath><path d={D} fill="#d9dee6" /></>}
        <path d={D} fill="#f5b301" clipPath={v < 5 ? `url(#s${id})` : undefined} />
      </svg>
    </span>
  )
}
