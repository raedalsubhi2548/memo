import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** The opening of an inner page: the title large on the page's own ground, nothing around it. */
export default function PageIntro({ crumb, title, lead, children, className }) {
  return (
    <header className={cn('pb-10 pt-8 sm:pb-14 sm:pt-12', className)}>
      {crumb && <nav className="mb-4 text-[16px] text-muted-foreground" aria-label="المسار"><Link to="/" className="hover:text-primary">الرئيسية</Link><span className="mx-1.5">/</span><span>{crumb}</span></nav>}
      <h1 className="font-display text-[clamp(2.6rem,1rem+4.6vw,5.75rem)] font-extrabold leading-[1.1] text-primary">{title}</h1>
      {lead && <p className="mt-5 max-w-[52ch] text-[18px] leading-8">{lead}</p>}
      {children}
    </header>
  )
}
