import { useState } from 'react'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import { Button } from '@/components/ui/button'
import { Field, Input, Panel } from '@/components/ui/kit.jsx'

export default function Profile() {
  const { user, notify, applyUser } = useApp()
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' })
  const [busy, setBusy] = useState(false)
  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try { applyUser(await api.updateProfile(form)); notify('تم حفظ بياناتك') } catch (e2) { notify(e2.message, 'err') } finally { setBusy(false) }
  }
  return (
    <Panel title="بياناتي" className="max-w-xl">
      <form className="grid gap-4" onSubmit={save}>
        <Field label="الاسم"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="name" /></Field>
        <Field label="رقم الجوال" hint="نستخدمه للتواصل معك بخصوص طلباتك"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" inputMode="tel" autoComplete="tel" /></Field>
        <Field label="البريد الإلكتروني" hint="لتغيير البريد تواصل معنا"><Input value={user?.email || ''} readOnly dir="ltr" /></Field>
        <Button disabled={busy} className="justify-self-start">{busy ? 'جاري الحفظ…' : 'حفظ التغييرات'}</Button>
      </form>
    </Panel>
  )
}
