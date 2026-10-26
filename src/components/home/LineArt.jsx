import { cn } from '@/lib/utils'
import { useInView } from '@/lib/useInView.js'

// Hand-drawn gold line illustrations (original artwork) that draw themselves into view.
const ART = {
  truck: [
    'M10 34 H70 V82 H10 Z',
    'M70 48 H92 L108 64 V82 H70',
    'M78 52 H90 L100 62 H78 Z',
    'M34 82 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0',
    'M90 82 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0',
    'M22 50 H50', 'M22 62 H42',
  ],
  leaf: [
    'M24 98 C24 52 52 24 100 18 C98 66 72 96 24 98 Z',
    'M24 98 L74 46',
    'M48 72 L46 56', 'M60 60 L72 62',
  ],
  drop: [
    'M60 12 C60 12 92 50 92 74 A32 32 0 0 1 28 74 C28 50 60 12 60 12 Z',
    'M44 78 C44 88 52 94 60 94',
  ],
  gift: [
    'M18 46 H102 V64 H18 Z',
    'M26 64 V104 H94 V64',
    'M60 46 V104',
    'M60 46 C46 46 34 38 40 28 C46 20 56 32 60 46 C64 32 74 20 80 28 C86 38 74 46 60 46',
  ],
  shield: [
    'M60 14 L96 28 V58 C96 80 80 96 60 106 C40 96 24 80 24 58 V28 Z',
    'M44 60 L56 72 L78 48',
  ],
  chat: [
    'M20 30 Q20 22 28 22 H92 Q100 22 100 30 V70 Q100 78 92 78 H52 L34 94 V78 H28 Q20 78 20 70 Z',
    'M38 44 H82', 'M38 56 H70',
  ],
  clock: [
    'M60 60 m-42 0 a42 42 0 1 0 84 0 a42 42 0 1 0 -84 0',
    'M60 34 V60 L76 70',
  ],
}

export default function LineArt({ name, className, delay = 0, tone = 'gold' }) {
  const [ref, on] = useInView()
  const paths = ART[name] || []
  return (
    <svg ref={ref} viewBox="0 0 120 120" fill="none" className={cn('overflow-visible', className)} aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} pathLength="1" stroke={tone === 'gold' ? 'var(--accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: `stroke-dashoffset 1.4s cubic-bezier(.65,0,.35,1) ${delay + i * 0.12}s` }} />
      ))}
    </svg>
  )
}
