import { useEffect, useState } from 'react'
import { Check, Pencil, Trash2, UserPlus, UsersRound, X } from 'lucide-react'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import { date } from '@/lib/format.js'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Field, Input, Panel, Skeleton } from '@/components/ui/kit.jsx'
import { AdminHead, IconBtn, useConfirm } from '@/components/admin/ui.jsx'
import { AREAS, AREA_LABEL, ROLES } from '@/lib/perms.js'

const BLANK = { email: '', name: '', role: ROLES[1].name, perms: ROLES[1].perms }
const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x))

/** The owner adds staff by email, picks a ready role (or ticks the areas by hand), and each one sees only those areas. */
export default function Team() {
  const { notify } = useApp()
  const confirm = useConfirm()
  const [list, setList] = useState(null)
  const [f, setF] = useState(BLANK)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const load = () => api.listStaff().then(setList).catch((e) => { setList([]); setErr(e.message) })
  useEffect(() => { load() }, [])

  const pickRole = (r) => setF((x) => ({ ...x, role: r.name, perms: r.perms }))
  const toggle = (key) => setF((x) => {
    const perms = x.perms.includes(key) ? x.perms.filter((p) => p !== key) : [...x.perms, key]
    const preset = ROLES.find((r) => same(r.perms, perms))
    // a hand-ticked mix keeps the name the owner typed, unless it was one of the ready roles
    return { ...x, perms, role: preset ? preset.name : ROLES.some((r) => r.name === x.role) ? 'صلاحيات مخصّصة' : x.role }
  })
  const reset = () => { setF(BLANK); setEditing(false); setErr('') }

  const save = async (e) => {
    e.preventDefault()
    setErr('')
    if (!f.perms.length) { setErr('اختر قسم واحد على الأقل'); return }
    setBusy(true)
    try {
      const out = await api.saveStaff(f)
      notify(out.added ? (out.invited ? 'أُضيف للفريق ووصلته رسالة الدعوة' : 'أُضيف للفريق') : 'حُفظت الصلاحيات')
      reset(); load()
    } catch (er) { setErr(er.message) } finally { setBusy(false) }
  }
  const edit = (m) => { setF({ email: m.email, name: m.name, role: m.role, perms: m.perms }); setEditing(true); setErr(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const remove = async (m) => {
    if (!(await confirm({ title: `إزالة ${m.name || m.email} من الفريق؟` }))) return
    try { await api.removeStaff(m.email); if (f.email === m.email) reset(); load(); notify('أُزيل من الفريق') } catch (e) { notify(e.message, 'err') }
  }

  return (
    <>
      <AdminHead title="الفريق والصلاحيات" />

      <Panel title={editing ? `تعديل صلاحيات ${f.name || f.email}` : 'موظف جديد'} className="mb-6">
        <form onSubmit={save} className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="البريد الإلكتروني"><Input required type="email" value={f.email} disabled={editing} onChange={(e) => setF({ ...f, email: e.target.value })} dir="ltr" placeholder="name@example.com" /></Field>
            <Field label="الاسم"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} /></Field>
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-bold">الدور</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {ROLES.map((r) => {
                const on = f.role === r.name && same(r.perms, f.perms)
                return (
                  <button key={r.name} type="button" aria-pressed={on} onClick={() => pickRole(r)}
                    className={cn('grid rounded-lg border-[1.5px] p-3.5 text-start transition-colors', on ? 'border-primary bg-sunken' : 'border-border hover:border-border-strong')}>
                    <span className="flex items-center justify-between font-bold text-primary">{r.name}{on && <Check className="size-4 text-accent-text" strokeWidth={3} />}</span>
                  </button>
                )
              })}
            </div>
            <Field label="اسم الدور" className="mt-2 sm:max-w-sm"><Input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} maxLength={40} /></Field>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-bold">الأقسام المسموحة</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {AREAS.map((a) => {
                const on = f.perms.includes(a.key)
                return (
                  <button key={a.key} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(a.key)}
                    className={cn('flex min-h-12 items-center gap-3 rounded-lg border-[1.5px] px-3.5 py-3 text-start transition-colors', on ? 'border-primary bg-sunken' : 'border-border hover:border-border-strong')}>
                    <span className={cn('grid size-5 shrink-0 place-items-center rounded-[6px] border-[1.5px]', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong')}>{on && <Check className="size-3" strokeWidth={3.5} />}</span>
                    <span className="text-sm font-semibold">{a.label}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {err && <p className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy}>{editing ? <><Check className="size-4" />احفظ الصلاحيات</> : <><UserPlus className="size-4" />أضف</>}</Button>
            {editing && <Button type="button" variant="outline" onClick={reset}><X className="size-4" />إلغاء</Button>}
          </div>
        </form>
      </Panel>

      {!list ? <Skeleton className="h-48" /> : list.length === 0 ? (
        <div className="grid justify-items-center gap-2 rounded-lg border-2 border-dashed border-border-strong py-14 text-center"><UsersRound className="size-8 text-muted-foreground" /><p className="text-muted-foreground">لا يوجد موظفين</p></div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.map((m) => (
            <li key={m.email} className="flex gap-4 rounded-lg bg-surface p-4 shadow-hairline ring-1 ring-border">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-semibold text-accent">{(m.name || m.email).charAt(0).toUpperCase()}</span>
              <div className="grid min-w-0 flex-1 gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-primary">{m.name || m.email.split('@')[0]}</p>
                  {m.role && <span className="rounded-full bg-accent/25 px-2.5 py-0.5 text-xs font-bold text-accent-text">{m.role}</span>}
                </div>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">{m.email}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">{m.perms.map((p) => <span key={p} className="rounded-md bg-sunken px-2 py-0.5 text-xs font-semibold text-foreground/80">{AREA_LABEL[p] || p}</span>)}</div>
                {m.addedAt && <p className="text-xs text-muted-foreground">أُضيف {date(m.addedAt)}</p>}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <IconBtn onClick={() => edit(m)} aria-label="تعديل الصلاحيات"><Pencil className="size-4" /></IconBtn>
                <IconBtn tone="danger" onClick={() => remove(m)} aria-label="إزالة من الفريق"><Trash2 className="size-4" /></IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
