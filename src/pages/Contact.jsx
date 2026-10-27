import { ArrowLeft } from 'lucide-react'
import { socialLinks, BrandIcon } from '@/components/Social.jsx'
import { EMAIL, waLink, localPhone } from '@/lib/format.js'
import { useApp } from '@/state.jsx'
import Reveal from '@/components/Reveal.jsx'
import { PageHead } from '@/components/ui/kit.jsx'

export default function Contact() {
  const { settings } = useApp()
  const more = socialLinks(settings.store.social).filter((x) => !/^mailto:|wa\.me/.test(x.href))
  return (
    <div className="container-w py-10 sm:py-14">
      <PageHead title="تواصلي معنا" lead="خدمة العملاء على واتساب: اسألي عن أي منتج أو عن طلبك." />
      <div className="grid items-stretch gap-6 md:grid-cols-2">
        <Reveal className="flex flex-col justify-between gap-10 rounded-[30px] bg-primary p-8 text-white shadow-[0_30px_60px_-34px_rgb(125_63_76/0.7)] sm:p-12">
          <div>
            <h2 className="font-display text-[1.8rem] font-semibold leading-tight sm:text-[2.2rem]">واتساب خدمة العملاء</h2>
            <p className="tabular mt-2 text-[1.5rem] font-bold" dir="ltr">{localPhone()}</p>
          </div>
          <div className="grid gap-6">
            <a href={waLink('السلام عليكم')} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-full bg-white px-7 text-[15px] font-bold text-primary transition-transform hover:-translate-y-0.5">
              راسلينا الحين<ArrowLeft className="size-5" />
            </a>
            {EMAIL && <p className="text-[15px]">أو على البريد: <a href={`mailto:${EMAIL}`} className="font-bold underline underline-offset-4" dir="ltr">{EMAIL}</a></p>}
            {more.length > 0 && (
              <ul className="flex flex-wrap gap-3">
                {more.map((x) => <li key={x.name}><a href={x.href} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-[14px] font-bold hover:bg-white/20"><BrandIcon icon={x.icon} size={18} />{x.name}</a></li>)}
              </ul>
            )}
          </div>
        </Reveal>
        <Reveal delay={90} className="min-h-[320px] overflow-hidden rounded-[30px] bg-white p-2.5 shadow-[0_30px_60px_-36px_rgb(125_63_76/0.5)]">
          <img src="/brand/hero-herbs-v4.webp" alt="مكونات العناية" width="1600" height="900" loading="lazy" className="size-full rounded-[22px] object-cover" />
        </Reveal>
      </div>
    </div>
  )
}
