import { cn } from '@/lib/utils'

/** Gold sprig: «رائد» — a small branch with leaves. Original artwork. */
export function Sprig({ className }) {
  return (
    <svg viewBox="0 0 120 28" fill="none" className={cn('h-6 w-auto', className)} aria-hidden="true">
      <path d="M8 18 H48 M72 18 H112" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="4" cy="18" r="1.6" fill="var(--accent)" /><circle cx="116" cy="18" r="1.6" fill="var(--accent)" />
      <path d="M60 22 C 56 14, 57 8, 60 2 C 63 8, 64 14, 60 22 Z" fill="currentColor" />
      <path d="M60 22 C 52 20, 47 15, 45 9 C 52 10, 57 15, 60 22 Z" stroke="var(--accent)" strokeWidth="1.2" />
      <path d="M60 22 C 68 20, 73 15, 75 9 C 68 10, 63 15, 60 22 Z" stroke="var(--accent)" strokeWidth="1.2" />
    </svg>
  )
}

/** Section title with the sprig ornament (our own titles, not copies of the Salla strips). */
export function SectionTitle({ eyebrow, title, light, className }) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      {eyebrow && <p className={cn('text-[14px] font-medium', light ? 'text-on-inverse/70' : 'text-primary/55')}>{eyebrow}</p>}
      <h2 className={cn('mt-0.5 text-balance font-display text-[2.1rem] font-bold leading-[1.45] sm:text-[2.75rem]', light ? 'text-on-inverse' : 'text-primary')}>{title}</h2>
    </div>
  )
}

/** The logo in a cream medallion with a double gold ring. */
export function Medallion({ className, size = 'md' }) {
  return (
    <span className={cn('relative grid place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffffff,#eef2f8)] shadow-[0_18px_40px_-14px_rgb(0_0_0/0.45),inset_0_0_0_1px_color-mix(in_srgb,var(--p-gold-400)_60%,transparent)]', size === 'lg' ? 'size-32 p-6' : 'size-24 p-[18px]', className)}>
      <span className="absolute inset-[5px] rounded-full border border-accent/70" aria-hidden="true" />
      <span className="absolute inset-[9px] rounded-full border border-dashed border-accent/40" aria-hidden="true" />
      <img src="/logo.png" alt="" width="600" height="580" className="relative w-full" />
    </span>
  )
}

/** Faint gold arches pattern for green surfaces. */
export function ArchPattern({ className }) {
  return (
    <svg className={cn('pointer-events-none absolute inset-0 size-full', className)} aria-hidden="true">
      <defs>
        <pattern id="arches" width="72" height="96" patternUnits="userSpaceOnUse">
          <path d="M6 96 V40 A30 30 0 0 1 66 40 V96" fill="none" stroke="rgb(195 206 221 / 0.10)" strokeWidth="1" />
          <path d="M18 96 V46 A18 18 0 0 1 54 46 V96" fill="none" stroke="rgb(195 206 221 / 0.06)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#arches)" />
    </svg>
  )
}
