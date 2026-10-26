import { useEffect, useState } from 'react'
import { Eye, EyeOff, Trash2, Send, MessageSquareText, Star } from 'lucide-react'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import { dateTime } from '@/lib/format.js'
import { cn } from '@/lib/utils'
import { productPath } from '@/lib/slug.js'
import { storeUrl } from '@/lib/host.js'
import { Button } from '@/components/ui/button'
import { Skeleton, Textarea } from '@/components/ui/kit.jsx'
import Stars from '@/components/brand/Stars.jsx'
import { AdminHead, Segments, useConfirm } from '@/components/admin/ui.jsx'

const STATUS = { pending: 'بانتظار المراجعة', published: 'منشور', hidden: 'مخفي' }
const Pill = ({ s }) => (
  <span className={cn('inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold', s === 'published' ? 'bg-success-soft text-success' : s === 'pending' ? 'bg-accent/25 text-accent-text' : 'bg-sunken text-muted-foreground')}>{STATUS[s]}</span>
)
const Empty = ({ children }) => (
  <div className="grid justify-items-center gap-3 rounded-lg border-2 border-dashed border-border-strong py-16 text-center"><MessageSquareText className="size-8 text-muted-foreground" /><p className="text-muted-foreground">{children}</p></div>
)
const Card = ({ className, ...p }) => <li className={cn('grid gap-3 rounded-lg bg-surface p-4 shadow-hairline ring-1 ring-border sm:p-5', className)} {...p} />

function Reviews({ list, reload }) {
  const { byId, notify, refreshCatalog } = useApp()
  const confirm = useConfirm()
  const [st, setSt] = useState('')
  const n = (s) => list.filter((r) => r.status === s).length
  const shown = list.filter((r) => !st || r.status === st)
  const act = async (fn, msg) => { try { await fn(); await reload(); refreshCatalog(); notify(msg) } catch (e) { notify(e.message, 'err') } }
  const remove = async (r) => { if (await confirm({ title: `حذف تقييم ${r.name}؟`, tone: 'danger' })) act(() => api.deleteReview(r.id), 'تم الحذف') }

  return (
    <>
      <div className="mb-4"><Segments value={st} onChange={setSt} options={[{ id: '', label: 'الكل', count: list.length }, { id: 'pending', label: 'بانتظار المراجعة', count: n('pending') }, { id: 'published', label: 'منشور', count: n('published') }, { id: 'hidden', label: 'مخفي', count: n('hidden') }]} /></div>
      {shown.length === 0 ? <Empty>لا توجد تقييمات</Empty> : (
        <ul className="grid gap-3">
          {shown.map((r) => (
            <Card key={r.id} className={r.status === 'pending' ? 'ring-accent' : ''}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-full bg-sunken font-semibold text-primary">{r.name.charAt(0)}</span><div><p className="font-bold text-primary">{r.name}</p><p className="text-xs text-muted-foreground">{dateTime(r.createdAt)}</p></div></div>
                <Pill s={r.status} />
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <span className="flex items-center gap-2"><span className="text-muted-foreground">المنتج</span><Stars value={r.service} size={14} /><b className="tabular">{r.service}</b></span>
                <span className="flex items-center gap-2"><span className="text-muted-foreground">المتجر</span><Stars value={r.store} size={14} /><b className="tabular">{r.store}</b></span>
              </div>
              {r.products.length > 0 && <p className="text-xs text-muted-foreground">{r.products.map((id) => byId[id]?.name || id).join('، ')}</p>}
              {r.text ? <p className="whitespace-pre-line leading-7">{r.text}</p> : <p className="text-sm text-muted-foreground">بدون تعليق</p>}
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {r.status !== 'published' && <Button size="sm" onClick={() => act(() => api.setReviewStatus(r.id, 'published'), 'تم النشر')}><Eye className="size-4" />نشر</Button>}
                {r.status !== 'hidden' && <Button size="sm" variant="outline" onClick={() => act(() => api.setReviewStatus(r.id, 'hidden'), 'تم الإخفاء')}><EyeOff className="size-4" />إخفاء</Button>}
                <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => remove(r)}><Trash2 className="size-4" />حذف</Button>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  )
}

function Question({ q, reload }) {
  const { byId, notify, refreshCatalog } = useApp()
  const confirm = useConfirm()
  const [answer, setAnswer] = useState(q.answer)
  const [busy, setBusy] = useState(false)
  useEffect(() => setAnswer(q.answer), [q.answer])
  const save = async (status, msg) => { setBusy(true); try { await api.saveQuestion(q.id, { answer, status }); await reload(); refreshCatalog(); notify(msg) } catch (e) { notify(e.message, 'err') } setBusy(false) }
  const remove = async () => { if (!(await confirm({ title: 'حذف السؤال؟', tone: 'danger' }))) return; try { await api.deleteQuestion(q.id); await reload(); refreshCatalog(); notify('تم الحذف') } catch (e) { notify(e.message, 'err') } }
  const p = byId[q.productId]
  return (
    <Card className={q.status === 'pending' ? 'ring-accent' : ''}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {p ? <a href={storeUrl(productPath(p.id))} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline">{p.name}</a> : <span className="text-sm text-muted-foreground">{q.productId}</span>}
          <p className="text-xs text-muted-foreground">{q.name}{q.contact && <> · <span dir="ltr">{q.contact}</span></>} · {dateTime(q.createdAt)}</p>
        </div>
        <Pill s={q.status} />
      </div>
      <p className="font-semibold leading-7">{q.question}</p>
      <Textarea rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={2000} placeholder="الجواب" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || !answer.trim()} onClick={() => save('published', 'تم النشر')}><Send className="size-4" />{q.status === 'published' ? 'حفظ' : 'حفظ ونشر'}</Button>
        {q.status === 'published' && <Button size="sm" variant="outline" disabled={busy} onClick={() => save('hidden', 'تم الإخفاء')}><EyeOff className="size-4" />إخفاء</Button>}
        {q.status !== 'published' && answer.trim() !== q.answer && <Button size="sm" variant="outline" disabled={busy} onClick={() => save(q.status, 'تم الحفظ')}>حفظ بدون نشر</Button>}
        <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={remove}><Trash2 className="size-4" />حذف</Button>
      </div>
    </Card>
  )
}

function Questions({ list, reload }) {
  const [st, setSt] = useState('')
  const n = (s) => list.filter((q) => q.status === s).length
  const shown = list.filter((q) => !st || q.status === st)
  return (
    <>
      <div className="mb-4"><Segments value={st} onChange={setSt} options={[{ id: '', label: 'الكل', count: list.length }, { id: 'pending', label: 'بدون رد', count: n('pending') }, { id: 'published', label: 'منشور', count: n('published') }, { id: 'hidden', label: 'مخفي', count: n('hidden') }]} /></div>
      {shown.length === 0 ? <Empty>لا توجد أسئلة</Empty> : <ul className="grid gap-3">{shown.map((q) => <Question key={q.id} q={q} reload={reload} />)}</ul>}
    </>
  )
}

export default function Feedback() {
  const [tab, setTab] = useState('reviews')
  const [reviews, setReviews] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [err, setErr] = useState('')
  const load = () => Promise.all([api.listReviews(), api.listQuestions()])
    .then(([r, q]) => { setErr(''); setReviews(r); setQuestions(q) })
    .catch((e) => { setErr(/reviews|questions|relation|schema cache/i.test(e.message) ? 'شغّل ملف supabase/reviews-2026-10.sql في Supabase أول.' : e.message); setReviews([]); setQuestions([]) })
  useEffect(() => { load() }, [])

  const pr = (reviews || []).filter((r) => r.status === 'pending').length
  const pq = (questions || []).filter((q) => q.status === 'pending').length
  const avg = (k) => { const l = (reviews || []).filter((r) => r.status === 'published'); return l.length ? (l.reduce((s, r) => s + r[k], 0) / l.length).toFixed(1) : null }

  return (
    <>
      <AdminHead title="التقييمات والأسئلة" lead={reviews ? [avg('service') && `الخدمة ${avg('service')} ★`, avg('store') && `المتجر ${avg('store')} ★`, `${reviews.length} تقييم`, `${questions.length} سؤال`].filter(Boolean).join(' · ') : undefined} />
      {err && <p className="mb-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{err}</p>}
      <div className="mb-5 flex gap-2 border-b border-border">
        {[['reviews', 'التقييمات', pr], ['questions', 'الأسئلة', pq]].map(([id, label, c]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn('-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-[15px] font-semibold', tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary')}>
            {id === 'reviews' ? <Star className="size-4" /> : <MessageSquareText className="size-4" />}{label}
            {c > 0 && <span className="tabular min-w-6 rounded-full bg-accent/30 px-1.5 text-center text-xs font-bold leading-6 text-accent-text">{c}</span>}
          </button>
        ))}
      </div>
      {!reviews ? <Skeleton className="h-96" /> : tab === 'reviews' ? <Reviews list={reviews} reload={load} /> : <Questions list={questions} reload={load} />}
    </>
  )
}
