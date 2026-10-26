import { ArrowUpLeft } from 'lucide-react'
import { socialLinks, BrandIcon } from '@/components/Social.jsx'
import { EMAIL, waLink, localPhone } from '@/lib/format.js'
import { useApp } from '@/state.jsx'
import { PageHead } from '@/components/ui/kit.jsx'

export default function Contact() {
  const { settings } = useApp()
  const SOCIAL = socialLinks(settings.store.social)
  const wa = SOCIAL[0]
  const more = SOCIAL.slice(2)
  return (
    <div className="container-w py-10 sm:py-14">
      <PageHead title="تواصلي معنا" lead="راسلينا على واتساب خدمة العملاء ونرد عليك بأسرع وقت." />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <a href={waLink('السلام عليكم')} target="_blank" rel="noreferrer" className="group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-xl bg-inverse p-8 text-on-inverse shadow-card">
          <span className="grid size-16 place-items-center rounded-full bg-accent text-accent-foreground"><BrandIcon icon={wa.icon} size={30} /></span>
          <div>
            <p className="font-display text-display-sm font-semibold">راسلينا على واتساب</p>
            <p className="tabular mt-1 text-lg opacity-85" dir="ltr">{localPhone()}</p>
          </div>
          <ArrowUpLeft className="absolute top-8 end-8 size-7 text-accent transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1" />
        </a>
        {EMAIL && <a href={`mailto:${EMAIL}`} className="group flex min-h-64 flex-col justify-between rounded-xl bg-surface p-8 shadow-hairline ring-1 ring-border transition-shadow hover:shadow-card">
          <span className="grid size-16 place-items-center rounded-full bg-sunken text-primary"><BrandIcon icon={SOCIAL.find((x) => x.name === 'البريد').icon} size={28} /></span>
          <div>
            <p className="font-display text-display-sm font-semibold text-primary">بريد خدمة العملاء</p>
            <p className="mt-1 text-lg text-muted-foreground" dir="ltr">{EMAIL}</p>
            <p className="mt-4 text-sm text-muted-foreground">للاستفسارات والفواتير.</p>
          </div>
        </a>}
      </div>
      {more.length > 0 && (
        <ul className="mt-6 flex flex-wrap justify-center gap-3">
          {more.map((x) => <li key={x.name}><a href={x.href} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center gap-2 rounded-full bg-surface px-5 font-semibold text-primary shadow-hairline ring-1 ring-border hover:ring-primary"><BrandIcon icon={x.icon} size={18} />{x.name}</a></li>)}
        </ul>
      )}
    </div>
  )
}
