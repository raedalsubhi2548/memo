import { useState } from 'react'
import { MessageCircleQuestion, Send } from 'lucide-react'
import { api } from '@/lib/api.js'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/kit.jsx'

/** Questions on a service: the answered ones, and a short form that sends a new one to the dashboard. */
export default function ServiceQuestions({ productId, questions }) {
  const list = questions.filter((q) => q.productId === productId)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', contact: '', question: '', trap: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const send = async (e) => {
    e.preventDefault()
    if (f.trap) return setSent(true) // filled by bots only
    if (!f.name.trim()) return setErr('اكتب اسمك')
    if (f.question.trim().length < 3) return setErr('اكتب سؤالك')
    setBusy(true); setErr('')
    try { await api.askQuestion({ productId, name: f.name, contact: f.contact, question: f.question }); setSent(true) } catch (x) { setErr(x.message) }
    setBusy(false)
  }

  return (
    <section id="questions" className="mt-16 scroll-mt-28">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-primary">أسئلة عن المنتج</h2>
          {list.length > 0 && <p className="mt-1 text-sm text-muted-foreground">{list.length} سؤال وجواب</p>}
        </div>
        {!open && !sent && <Button variant="outline" onClick={() => setOpen(true)}><MessageCircleQuestion className="size-4" />اسألي عن المنتج</Button>}
      </div>

      {list.length > 0 && (
        <ul className="mt-6 grid gap-3">
          {list.map((q) => (
            <li key={q.id} className="grid gap-2 rounded-lg bg-surface p-5 shadow-hairline ring-1 ring-border">
              <p className="font-semibold leading-7"><span className="text-muted-foreground">س: </span>{q.question}</p>
              <p className="leading-7 text-foreground/85"><span className="font-semibold text-primary">ج: </span>{q.answer}</p>
              <p className="text-xs text-muted-foreground">{q.name}</p>
            </li>
          ))}
        </ul>
      )}

      {sent ? (
        <p className="mt-6 rounded-lg bg-success-soft px-5 py-4 font-semibold text-success" role="status">وصلنا سؤالك، ونرد عليك قريب.</p>
      ) : open && (
        <form onSubmit={send} className="mt-6 grid gap-3 rounded-lg bg-surface p-5 shadow-hairline ring-1 ring-border sm:grid-cols-2">
          <label className="grid gap-1.5"><span className="text-sm font-bold">اسمك</span><Input value={f.name} onChange={set('name')} maxLength={60} autoComplete="name" /></label>
          <label className="grid gap-1.5"><span className="text-sm font-bold">جوالك أو إيميلك <span className="font-normal text-muted-foreground">(اختياري، عشان نرد عليك)</span></span><Input value={f.contact} onChange={set('contact')} maxLength={120} dir="ltr" className="text-end" /></label>
          <label className="grid gap-1.5 sm:col-span-2"><span className="text-sm font-bold">سؤالك</span><Textarea rows={3} value={f.question} onChange={set('question')} maxLength={600} /></label>
          <input type="text" name="website" value={f.trap} onChange={set('trap')} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {err && <p className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger sm:col-span-2" role="alert">{err}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy}><Send className="size-4" />{busy ? 'جاري الإرسال…' : 'أرسل السؤال'}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
          </div>
        </form>
      )}
    </section>
  )
}
