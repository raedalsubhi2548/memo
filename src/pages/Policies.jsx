import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
      <PageHead title="السياسات والشروط" lead={<>راجعيها قبل الطلب، وإذا عندك سؤال كلّمينا على واتساب. آخر تحديث <time dateTime={POLICY_DATE}>{date(POLICY_DATE + 'T12:00:00')}</time>.</>} />
      <div className="grid items-start gap-10 lg:grid-cols-[260px_1fr] lg:gap-16">
        <nav className="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:sticky lg:top-[calc(var(--header-height)+24px)] lg:grid lg:gap-1" aria-label="الأقسام">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} data-nav={s.id} onClick={() => setActive(s.id)} aria-current={active === s.id ? 'true' : undefined}
              className={cn('flex shrink-0 items-center px-4 py-2.5 text-[16px] font-bold transition-colors', active === s.id ? 'bg-primary text-primary-foreground' : 'bg-sunken text-primary hover:bg-[var(--p-cream-200)] lg:bg-transparent')}>
              {s.h}
            </a>
          ))}
        </nav>
        <div className="grid gap-14">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="font-display text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] font-extrabold text-primary">{s.h}</h2>
              <div className="mt-4 grid max-w-[78ch] gap-3 text-[18px] leading-[1.85]">
                {s.p.map((x) => <p key={x}>{x}</p>)}
              </div>
            </section>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-sunken p-6 sm:p-8">
            <p className="text-[20px] font-extrabold text-primary">عندك سؤال عن الشروط؟</p>
            <div className="flex gap-2">
              <Button asChild variant="outline"><Link to="/contact">تواصلي معنا</Link></Button>
              <Button asChild><a href={waLink('عندي سؤال عن السياسات')} target="_blank" rel="noreferrer">واتساب</a></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
