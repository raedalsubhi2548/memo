import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { useApp } from '@/state.jsx'
import { themeCss } from '@/lib/theme.js'

/** The owner's colours and logo size (store designer) as CSS variables over the design tokens. */
// fonts the owner can pick (the original two are always loaded by fonts.css); each loads only when chosen
const FONT_CSS = {
  cairo: () => [import('@fontsource/cairo/arabic-400.css'), import('@fontsource/cairo/arabic-500.css'), import('@fontsource/cairo/arabic-700.css')],
  tajawal: () => [import('@fontsource/tajawal/arabic-400.css'), import('@fontsource/tajawal/arabic-500.css'), import('@fontsource/tajawal/arabic-700.css')],
  almarai: () => [import('@fontsource/almarai/arabic-400.css'), import('@fontsource/almarai/arabic-700.css')],
  marhey: () => [import('@fontsource/marhey/arabic-500.css'), import('@fontsource/marhey/arabic-700.css')],
  reemkufi: () => [import('@fontsource/reem-kufi/arabic-500.css'), import('@fontsource/reem-kufi/arabic-700.css')],
}

export function ThemeStyle() {
  const { settings } = useApp()
  const { heading, body } = settings.fonts
  useEffect(() => { [heading, body].forEach((f) => FONT_CSS[f]?.()) }, [heading, body])
  const css = themeCss(settings)
  return css ? <style id="store-theme" dangerouslySetInnerHTML={{ __html: css }} /> : null
}

/** The thin bar above the header ("خصم 20% لفترة محدودة"), switched on from the store designer. */
export function AnnouncementBar() {
  const { settings: { announcement: a } } = useApp()
  if (!a.on) return null
  const inner = (
    <span className="container-w flex min-h-10 items-center justify-center gap-2 py-2 text-center text-[13.5px] font-medium leading-6">
      <Megaphone className="size-4 shrink-0 text-accent" aria-hidden="true" />{a.text}
    </span>
  )
  const cls = 'relative z-50 block bg-[var(--p-green-950)] text-on-inverse'
  if (!a.link) return <div className={cls}>{inner}</div>
  return /^https:/i.test(a.link)
    ? <a href={a.link} target="_blank" rel="noopener noreferrer" className={cls + ' hover:text-accent'}>{inner}</a>
    : <Link to={a.link} className={cls + ' hover:text-accent'}>{inner}</Link>
}
