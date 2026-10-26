import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import { PageHead } from '@/components/ui/kit.jsx'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { waLink, date } from '@/lib/format.js'
import { POLICY_SECTIONS, POLICY_DATE } from '@/data/terms.js'

const SECTIONS = POLICY_SECTIONS

export default function Policies() {
  const { hash } = useLocation()
  // links like /policies#refund land on that section
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }) }, [hash])

  // the section you're reading (or just tapped) stays highlighted in the menu and on the page
  const [active, setActive] = useState(SECTIONS[0].id)
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (seen) setActive(seen.target.id)
    }, { rootMargin: '-25% 0px -60% 0px' })
    SECTIONS.forEach((x) => { const el = document.getElementById(x.id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])
  // keep the active chip in view by scrolling the chip row only (scrollIntoView would also move the page on phones)
  useEffect(() => {
    const el = document.querySelector(`[data-nav="${active}"]`), nav = el?.parentElement
    if (!el || !nav || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollTo({ left: el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' })
  }, [active])
  return (
    <div className="container-w py-10 sm:py-14">
      <PageHead title="السياسات والشروط" lead="راجعها قبل الطلب. إذا عندك سؤال، كلّمنا على واتساب." />
      <p className="-mt-6 mb-8 text-center text-sm text-muted-foreground">آخر تحديث للسياسات: <time dateTime={POLICY_DATE}>{date(POLICY_DATE + 'T12:00:00')}</time></p>
      <div className="grid items-start gap-8 lg:grid-cols-[240px_1fr]">
        <nav className="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:sticky lg:top-[calc(var(--header-height)+24px)] lg:grid" aria-label="الأقسام">
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} data-nav={s.id} onClick={() => setActive(s.id)} aria-current={active === s.id ? 'true' : undefined}
              className={cn('flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition-colors lg:rounded-md', active === s.id ? 'bg-primary text-primary-foreground ring-primary' : 'text-primary ring-border hover:bg-sunken lg:ring-transparent')}>
              <span className={cn('tabular text-xs', active === s.id ? 'text-primary-foreground/70' : 'text-accent-text')}>{String(i + 1).padStart(2, '0')}</span>{s.h}
            </a>
          ))}
        </nav>
        <div className="grid gap-4">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} className={cn('scroll-mt-28 rounded-lg bg-surface p-6 shadow-hairline ring-1 transition-[box-shadow,background-color] duration-300 sm:p-8', active === s.id ? 'bg-sunken ring-2 ring-primary/40' : 'ring-border')}>
              <h2 className="flex items-baseline gap-3 font-display text-xl font-semibold text-primary"><span className="tabular text-sm text-accent-text">{String(i + 1).padStart(2, '0')}</span>{s.h}</h2>
              <ul className="mt-4 grid gap-3">
                {s.p.map((x) => <li key={x} className="flex gap-3 leading-8"><Check className="mt-2 size-4 shrink-0 text-primary" />{x}</li>)}
              </ul>
            </section>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-sunken p-6">
            <p className="font-semibold text-primary">عندك سؤال عن الشروط؟</p>
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link to="/contact">تواصل معنا</Link></Button>
              <Button asChild><a href={waLink('عندي سؤال عن السياسات')} target="_blank" rel="noreferrer">واتساب</a></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
