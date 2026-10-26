import { useState } from 'react'
import { api } from '@/lib/api.js'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/kit.jsx'

/** Adds a customer account (name, email, phone) and hands the new customer back. */
export default function NewCustomer({ onDone, onCancel, compact }) {
  const [f, setF] = useState({ name: '', email: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const save = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setErr(''); setBusy(true)
    try { onDone(await api.addCustomer(f)) } catch (er) { setErr(er.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={save} className="grid gap-3">
      <Field label="الاسم"><Input required value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <div className={compact ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'}>
        <Field label="البريد الإلكتروني"><Input required type="email" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@example.com" className="text-end" /></Field>
        <Field label="الجوال"><Input inputMode="tel" dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="05xxxxxxxx" className="text-end" /></Field>
      </div>
      {err && <p className="text-sm font-semibold text-danger" role="alert">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">{busy ? 'جاري الإضافة…' : 'إضافة العميل'}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>إلغاء</Button>}
      </div>
    </form>
  )
}
