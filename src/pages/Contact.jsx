import { ArrowLeft } from 'lucide-react'
import { socialLinks, BrandIcon } from '@/components/Social.jsx'
import { EMAIL, waLink, localPhone } from '@/lib/format.js'
import { HERO_PICTURE } from '@/data/world.js'
import { useApp } from '@/state.jsx'
import Reveal from '@/components/Reveal.jsx'
import { PageHead } from '@/components/ui/kit.jsx'

export default function Contact() {
  const { settings } = useApp()
  const more = socialLinks(settings.store.social).slice(2)
  return (
    <div className="container-w py-10 sm:py-14">
      <PageHead title="تواصلي معنا" lead="خدمة العملاء على واتساب: اسألي عن أي منتج أو عن طلبك." />
      <div className="grid items-stretch gap-6 md:grid-cols-2">
        <Reveal className="flex flex-col justify-between gap-10 bg-primary p-8 text-primary-foreground sm:p-12">
          <div>
            <h2 className="font-display text-[clamp(2rem,1.4rem+2vw,3.25rem)] font-extrabold leading-tight">واتساب خدمة العملاء</h2>
            <p className="tabular mt-3 text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] font-bold" dir="ltr">{localPhone()}</p>
          </div>
          <div className="grid gap-6">
            <a href={waLink('السلام عليكم')} target="_blank" rel="noreferrer" className="inline-flex h-14 items-center justify-center gap-2 self-start bg-on-inverse px-8 text-[17px] font-bold text-primary transition-colors hover:bg-white">
              راسلينا الحين<ArrowLeft className="size-5" />
            </a>
            {EMAIL && <p className="text-[17px]">أو على البريد: <a href={`mailto:${EMAIL}`} className="font-bold underline underline-offset-4" dir="ltr">{EMAIL}</a></p>}
            {more.length > 0 && (
              <ul className="flex flex-wrap gap-3">
                {more.map((x) => <li key={x.name}><a href={x.href} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center gap-2 bg-on-inverse/10 px-4 font-bold hover:bg-on-inverse/20"><BrandIcon icon={x.icon} size={18} />{x.name}</a></li>)}
              </ul>
            )}
          </div>
        </Reveal>
        <Reveal delay={90} className="min-h-[320px] overflow-hidden bg-sunken">
          <img src={HERO_PICTURE.src} alt={HERO_PICTURE.alt} width="2400" height="1400" loading="lazy" className="size-full object-cover" />
        </Reveal>
      </div>
    </div>
  )
}
