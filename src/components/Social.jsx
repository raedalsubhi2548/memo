import { siWhatsapp, siInstagram, siX, siTiktok, siSnapchat } from 'simple-icons'
import { useApp } from '@/state.jsx'

const MAIL = { hex: '1b2b44', path: 'M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6zm2.6 0L12 11.4 19.4 6H4.6zM20 8.1l-8 5.8-8-5.8V18h16V8.1z' }
import { WHATSAPP, EMAIL } from '../lib/format.js'

// WhatsApp and email always; Instagram / X / TikTok / Snapchat when the owner adds them in the store designer.
const NETS = [['instagram', 'إنستقرام', siInstagram], ['x', 'إكس', siX], ['tiktok', 'تيك توك', siTiktok], ['snapchat', 'سناب شات', siSnapchat]]
export const socialLinks = (social = {}) => [
  { name: 'واتساب', href: `https://wa.me/${WHATSAPP}`, icon: siWhatsapp },
  { name: 'البريد', href: `mailto:${EMAIL}`, icon: MAIL },
  ...NETS.filter(([k]) => social[k]).map(([k, name, icon]) => ({ name, href: social[k], icon })),
]

export function BrandIcon({ icon, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={icon.path} /></svg>
}

export default function Social({ className = '' }) {
  const { settings } = useApp()
  const SOCIAL = socialLinks(settings.store.social)
  return (
    <ul className={'social ' + className}>
      {SOCIAL.map((s) => (
        <li key={s.name}>
          <a href={s.href} {...(s.href.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener noreferrer' })} aria-label={s.name} title={s.name} style={{ '--brand': '#' + s.icon.hex }}>
            <BrandIcon icon={s.icon} />
          </a>
        </li>
      ))}
    </ul>
  )
}
