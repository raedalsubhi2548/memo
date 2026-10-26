import { money } from '@/lib/format.js'

// The options a customer chose for a line (cart, checkout, order, admin).
export default function OptionList({ items, className = '' }) {
  if (!items?.length) return null
  return (
    <ul className={`grid gap-0.5 text-xs leading-5 text-muted-foreground ${className}`}>
      {items.map((c, i) => (
        <li key={i}><span className="text-foreground/70">{c.option}:</span> {c.value}{Number(c.price) > 0 && <span className="tabular"> (+{money(c.price)})</span>}</li>
      ))}
    </ul>
  )
}
