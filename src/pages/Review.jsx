import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Star, Check } from 'lucide-react'
import { api } from '@/lib/api.js'
import { cn } from '@/lib/utils'
import { GOOGLE_REVIEW_URL } from '@/lib/feedback.js'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Skeleton } from '@/components/ui/kit.jsx'

const WORDS = ['', 'سيئ', 'مقبول', 'جيد', 'ممتاز', 'رائع']

function StarPick({ value, onChange, label }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1" role="radiogroup" aria-label={label} dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} من 5`} onClick={() => onChange(n)}
            className="grid size-11 place-items-center rounded-full transition-transform active:scale-90">
            <Star className={cn('size-8', n <= value ? 'fill-[#f5b301] text-[#f5b301]' : 'text-border-strong')} strokeWidth={1.5} />
          </button>
        ))}
        <span className="ms-2 min-w-12 text-sm font-semibold text-muted-foreground">{WORDS[value]}</span>
      </div>
    </div>
  )
}

const Box = ({ children }) => <div className="container-w grid max-w-xl gap-6 py-12 sm:py-16">{children}</div>

function GoogleCard() {
  return (
    <div className="grid justify-items-center gap-3 rounded-lg bg-sunken p-6 text-center">
      <p className="font-semibold text-primary">ساعدنا يوصل صوتك لغيرك</p>
      <p className="text-sm leading-7 text-muted-foreground">لو عندك دقيقة، اكتب نفس الرأي على صفحتنا في قوقل.</p>
      {GOOGLE_REVIEW_URL && <Button asChild><a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer">قيّمينا على قوقل</a></Button>}
    </div>
  )
}

export default function Review() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const token = params.get('t') || ''
  const [form, setForm] = useState(null)
  const [service, setService] = useState(0)
  const [store, setStore] = useState(0)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('') // 'published' | 'pending'

  useEffect(() => {
    let on = true
    api.reviewForm(id, token).then((f) => { if (!on) return; setForm(f); setName(f.name || '') }).catch(() => on && setForm({ ok: false, reason: 'not-found' }))
    return () => { on = false }
  }, [id, token])

  const send = async (e) => {
    e.preventDefault()
    if (!service || !store) return setErr('اختاري عدد النجوم للمنتج وللمتجر')
    setBusy(true); setErr('')
    try { setDone(await api.submitReview({ orderId: id, token, name, service, store, text })) } catch (x) { setErr(x.message) }
    setBusy(false)
  }

  if (!form) return <Box><Skeleton className="h-96" /></Box>
  if (!form.ok) return (
    <Box>
      <h1 className="font-display text-3xl font-semibold text-primary">{form.reason === 'not-completed' ? 'التقييم يفتح بعد اكتمال طلبك' : 'رابط التقييم غير صالح'}</h1>
      <p className="leading-8 text-muted-foreground">{form.reason === 'not-completed' ? 'أول ما نسلّمك طلبك يوصلك رابط التقييم على إيميلك.' : 'تأكد إنك فتحت الرابط كامل من الإيميل اللي وصلك.'}</p>
      <Button asChild variant="outline" className="justify-self-start"><Link to="/">الرئيسية</Link></Button>
    </Box>
  )
  if (done || form.done) return (
    <Box>
      <span className="grid size-14 place-items-center rounded-full bg-success-soft text-success"><Check className="size-7" strokeWidth={3} /></span>
      <h1 className="font-display text-3xl font-semibold text-primary">{form.done && !done ? 'قيّمت هذا الطلب من قبل' : 'شكراً على تقييمك'}</h1>
      <p className="leading-8 text-muted-foreground">{done === 'pending' ? 'وصلنا رأيك، وبنراجعه ونتواصل معك لو احتجنا نعرف أكثر.' : 'رأيك يهمنا، وبيساعد غيرك يختار.'}</p>
      <GoogleCard />
    </Box>
  )

  const services = [...new Set((form.items || []).map((i) => i.name).filter(Boolean))]
  return (
    <Box>
      <div>
        <p className="text-sm text-muted-foreground">طلب رقم {form.number}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-primary">{form.name ? `${form.name}، ` : ''}كيف كانت تجربتك؟</h1>
      </div>
      <form onSubmit={send} className="grid gap-6 rounded-lg bg-surface p-5 shadow-hairline ring-1 ring-border sm:p-6">
        <div className="grid gap-1">
          <p className="font-bold">تقييم المنتج</p>
          {services.length > 0 && <p className="text-sm text-muted-foreground">{services.join('، ')}</p>}
          <StarPick value={service} onChange={setService} label="تقييم المنتج" />
        </div>
        <div className="grid gap-1">
          <p className="font-bold">تقييم المتجر</p>
          <p className="text-sm text-muted-foreground">التعامل وسرعة الرد والتواصل</p>
          <StarPick value={store} onChange={setStore} label="تقييم المتجر" />
        </div>
        <label className="grid gap-1.5"><span className="text-sm font-bold">رأيك بكلماتك <span className="font-normal text-muted-foreground">(اختياري)</span></span>
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="وش عجبك؟ وش نقدر نحسّن؟" /></label>
        <label className="grid gap-1.5"><span className="text-sm font-bold">الاسم اللي يظهر مع تقييمك</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
        {err && <p className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">{err}</p>}
        <Button type="submit" size="lg" disabled={busy}>{busy ? 'جاري الإرسال…' : 'أرسل التقييم'}</Button>
      </form>
    </Box>
  )
}
