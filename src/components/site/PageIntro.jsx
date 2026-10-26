import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** The opening of an inner page: the title large on the page's own ground, nothing around it. */
export default function PageIntro({ crumb, title, lead, children, className }) {
  return (
    <header className={cn('pb-10 pt-8 text-center sm:pb-12 sm:pt-12', className)}>
      {crumb && <nav className="mb-3 text-[13px] text-muted-foreground" aria-label="المسار"><Link to="/" className="hover:text-primary">الرئيسية</Link><span className="mx-1.5">/</span><span>{crumb}</span></nav>}
      <h1 className="font-display text-[2rem] font-semibold leading-[1.35] text-primary sm:text-[2.5rem]">{title}</h1>
      {lead && <p className="mx-auto mt-3 max-w-[52ch] text-[15.5px] leading-8 text-muted-foreground">{lead}</p>}
      {children}
    </header>
  )
}
