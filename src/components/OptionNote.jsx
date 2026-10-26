import { Link } from 'react-router-dom'

// A short line under an option group, keyed by "optionId:valueId" (shown when that value exists in the group).
const NOTES = {}

export default function OptionNote({ o, onGo }) {
  const n = o?.values?.map((v) => NOTES[`${o.id}:${v.id}`]).find(Boolean)
  if (!n) return null
  return (
    <p className="text-[13px] text-muted-foreground">
      {n.text} <Link to={n.to} onClick={onGo} className="font-semibold text-primary underline underline-offset-4">{n.label}</Link>
    </p>
  )
}
