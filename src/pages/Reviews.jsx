import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Quote, MessageCircle } from 'lucide-react'
import { ALL_REVIEWS } from '@/data/reviews.js'
import { testimonials, GOOGLE_REVIEW_URL } from '@/lib/feedback.js'
import { useApp } from '@/state.jsx'
import { Button } from '@/components/ui/button'
import { waLink } from '@/lib/format.js'
import { cn } from '@/lib/utils'
import StarsSvg from '@/components/brand/Stars.jsx'
const Stars = (p) => <StarsSvg size={16} {...p} />
import PageIntro from '@/components/site/PageIntro.jsx'

const FILTERS = [['all', 'الكل'], ['long', 'تجارب مفصّلة']]

export default function Reviews() {
  const { feedback } = useApp()
  const [f, setF] = useState('all')
  const all = useMemo(() => testimonials(ALL_REVIEWS, feedback.reviews), [feedback.reviews])
  const avg = Math.round((all.reduce((s, r) => s + (r.stars ?? 5), 0) / (all.length || 1)) * 10) / 10
  const list = useMemo(() => all.filter((r) => f === 'all' || r.text.length > 110), [all, f])
  return (
    <div className="container-w py-10 sm:py-14">
      <PageIntro crumb="آراء العملاء" title="آراء عملائنا" className="-mt-10 sm:-mt-14">
        <p className="mt-4 inline-flex items-center gap-3 bg-sunken px-4 py-2 text-[16px] text-primary">
          <Stars className="text-primary" value={avg} /><b className="tabular">{avg.toFixed(1)}</b><span className="h-4 w-px bg-primary/20" /><span><b className="tabular">{all.length}</b> رأي مكتوب من عملائنا</span>
        </p>
      </PageIntro>

      <div className="mb-6 flex justify-center gap-2 overflow-x-auto [scrollbar-width:none]" role="tablist">
        {FILTERS.map(([id, l]) => (
          <button key={id} role="tab" aria-selected={f === id} onClick={() => setF(id)}
            className={cn('h-10 shrink-0 rounded-full px-4 text-sm font-semibold ring-1 transition-colors', f === id ? 'bg-primary text-on-inverse ring-primary' : 'text-primary ring-border hover:ring-primary')}>{l}</button>
        ))}
      </div>

      <ul className="columns-2 gap-3 sm:gap-4 lg:columns-3">
        {list.map((r, i) => (
          <li key={r.id || r.name + i} className="mb-3 break-inside-avoid sm:mb-4">
            <figure className="rounded-lg bg-surface p-3.5 shadow-hairline ring-1 ring-border sm:p-5">
              <div className="flex items-center justify-between"><Stars value={r.stars ?? 5} className="text-accent-text [&_svg]:size-3 sm:[&_svg]:size-4" /><Quote className="size-4 text-accent/60 sm:size-5" /></div>
              <blockquote className="mt-3 whitespace-pre-line text-sm leading-7 sm:text-base sm:leading-8">{r.text}</blockquote>
              <figcaption className="mt-4 flex items-center gap-2.5 border-t border-border pt-3 text-xs sm:gap-3 sm:pt-4 sm:text-sm">
                <span className="grid size-8 shrink-0 sm:size-9 place-items-center rounded-full bg-sunken font-display font-semibold text-primary">{r.name.charAt(0)}</span>
                <span><b className="block text-primary">{r.name}</b>{r.city && <span className="text-muted-foreground">{r.city}</span>}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 rounded-lg bg-sunken p-6 text-center">
        <p className="font-semibold text-primary">ودّك تجربين منتجاتنا؟</p>
        <Button asChild><Link to="/shop">تسوّقي الحين</Link></Button>
        <Button asChild variant="outline"><a href={waLink('السلام عليكم، شفت آراء عميلاتكم وأبي أستفسر')} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />واتساب</a></Button>
        {GOOGLE_REVIEW_URL && <Button asChild variant="ghost"><a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer">قيّمينا على قوقل</a></Button>}
      </div>
    </div>
  )
}
