import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** The opening of an inner page: no box, no band — the title floats on the same soft page as everything else. */
export default function PageIntro({ crumb, title, lead, children, className }) {
  return (
    <header className={cn('relative pt-8 pb-8 text-center sm:pt-12 sm:pb-12', className)}>
      <span className="pointer-events-none absolute inset-x-0 -top-[var(--header-height)] -z-10 h-[calc(100%+var(--header-height))] bg-[radial-gradient(55%_70%_at_50%_0%,color-mix(in_srgb,var(--p-green-900)_9%,transparent),transparent_75%)]" aria-hidden="true" />
      {crumb && <nav className="mb-3 text-[13px] text-muted-foreground" aria-label="المسار"><Link to="/" className="hover:text-primary">الرئيسية</Link><span className="mx-1.5 opacity-50">/</span><span>{crumb}</span></nav>}
      <h1 className="font-display text-[2.3rem] font-bold leading-[1.4] text-primary sm:text-[3rem]">{title}</h1>
      <span className="mx-auto mt-3 block h-px w-24 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--p-green-900)_35%,transparent),transparent)]" aria-hidden="true" />
      {lead && <p className="mx-auto mt-4 max-w-xl text-[16px] leading-8 text-muted-foreground">{lead}</p>}
      {children}
    </header>
  )
}
