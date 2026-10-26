import { useInView } from '@/lib/useInView.js'
import { cn } from '@/lib/utils'

/** Rises in once as it scrolls into view; content already on screen, a visitor who never scrolls and reduced motion see it as is. */
export default function Reveal({ as: T = 'div', className, delay = 0, children, ...p }) {
  const [ref, on] = useInView()
  return <T ref={ref} className={cn('motion-safe:transition-[opacity,translate] motion-safe:duration-[900ms] motion-safe:ease-[cubic-bezier(.16,1,.3,1)]', on ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0', className)} style={{ transitionDelay: `${delay}ms` }} {...p}>{children}</T>
}
