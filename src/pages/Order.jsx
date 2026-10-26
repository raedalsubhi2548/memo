import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Check, Clock, Download, FileText, Star, Truck } from 'lucide-react'
import { reviewPath } from '@/lib/feedback.js'
import { api } from '@/lib/api.js'
import { useApp } from '@/state.jsx'
import { cn } from '@/lib/utils'
import { money, dateTime } from '@/lib/format.js'
import { addressLine } from '@/lib/address.js'
import { Button } from '@/components/ui/button'
import OptionList from '@/components/OptionList.jsx'
import { trackPurchase } from '@/lib/analytics.js'
import { Panel, OrderTracker, StatusPill, statusLabel, Skeleton, Empty } from '@/components/ui/kit.jsx'
import PaymentForm from '@/components/PaymentForm.jsx'
import { canApplePay } from '@/components/TapApplePay.jsx'

export { statusLabel }
export const StatusTrack = OrderTracker

function DownloadButton({ orderId, productId }) {
  const { notify } = useApp()
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    // open the tab inside the tap itself (Safari blocks one opened after a wait), then send it to the file
    const tab = window.open('', '_blank')
    try { const url = await api.downloadUrl(orderId, productId); if (tab) { tab.opener = null; tab.location.href = url } else window.location.href = url } catch (e) { tab?.close(); notify(e.message, 'err') } finally { setBusy(false) }
  }
  return <Button variant="accent" size="sm" className="mt-2 h-9" onClick={go} disabled={busy}><Download />{busy ? 'لحظة…' : 'تحميل الملف'}</Button>
}

function InvoiceButton({ order }) {
  const { notify } = useApp()
  const [busy, setBusy] = useState(false)
  const go = async () => { setBusy(true); try { await api.downloadInvoice(order) } catch (e) { notify(e.message, 'err') } finally { setBusy(false) } }
  return <Button variant="outline" onClick={go} disabled={busy}><FileText />{busy ? 'نجهّز الفاتورة…' : 'تحميل الفاتورة PDF'}</Button>
}

export default function Order() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { user, authReady, clearCart } = useApp()
  const [paying, setPaying] = useState(false)
  const [order, setOrder] = useState(undefined)
  const [verifying, setVerifying] = useState(false)
  const isNew = params.get('new') || params.get('tap_id')
  const [apple, setApple] = useState(false) // known only in the browser, after hydration
  useEffect(() => { setApple(canApplePay()) }, [])

  useEffect(() => {
    if (!authReady) return
    let alive = true
    let paidNow = false
    const load = () => api.getOrder(id).then((o) => { if (paidNow && o && o.status !== 'pending') trackPurchase(o); if (alive) setOrder(o) }).catch(() => alive && setOrder(null))
    const tap = params.get('tap_id')
    if (tap && api.verifyPayment) {
      setVerifying(true)
      api.verifyPayment(id, tap).then((r) => {
        if (r?.ok) { paidNow = true; clearCart(); try { sessionStorage.removeItem('mimi:pending-order') } catch { /* ignore */ } }
      }).finally(() => { if (alive) setVerifying(false); load() })
    } else load()
    return () => { alive = false }
  }, [id, authReady, user?.id, params])

  if (order === undefined || verifying) return <div className="container-w grid gap-4 py-14"><p className="text-center text-muted-foreground">{verifying ? 'نتأكد من عملية الدفع…' : 'جاري التحميل…'}</p><Skeleton className="h-72" /></div>
  if (!order) return <div className="container-w py-14"><Empty title="ما لقينا الطلب" action={<Button asChild><Link to="/account">طلباتي</Link></Button>}>تأكدي إنك مسجّلة دخول بنفس الحساب اللي طلبتي فيه.</Empty></div>

  const paid = order.status !== 'pending' && order.status !== 'cancelled'
  // the card fields or Apple Pay give a token; paid on the spot, or the bank's 3-D Secure page first
  const payNow = async ({ token }) => {
    setPaying(true)
    try {
      const { redirect, free, paid } = await api.startPayment(order, token)
      if (free || paid) { clearCart(); try { sessionStorage.removeItem('mimi:pending-order') } catch { /* ignore */ } trackPurchase(order); setOrder(await api.getOrder(order.id)); setPaying(false); return }
      window.location.href = redirect
    } catch (e) { setPaying(false); throw e }
  }
  return (
    <div className="container-w py-10 sm:py-14">
      {isNew ? (
        <div className={cn('mb-8 flex items-center gap-4 rounded-xl p-6 sm:p-8', paid ? 'bg-inverse text-on-inverse' : 'bg-sunken')}>
          <span className={cn('grid size-14 shrink-0 place-items-center rounded-full', paid ? 'bg-accent text-accent-foreground' : 'bg-surface text-primary')}>{paid ? <Check className="size-7" strokeWidth={3} /> : <Clock className="size-7" />}</span>
          <div>
            <h1 className={cn('font-display text-2xl font-semibold sm:text-3xl', !paid && 'text-primary')}>{paid ? 'وصلنا طلبك، شكراً لك' : 'استلمنا طلبك وبانتظار الدفع'}</h1>
            <p className={cn('mt-1', paid ? 'text-on-inverse/80' : 'text-muted-foreground')}>
              <span className="tabular">رقم الطلب #{order.number}.</span> {paid ? 'نجهّز طلبك ونشحنه لك، ويوصلك إيميل مع كل تحديث.' : 'ما اكتملت عملية الدفع، تقدرين تكملينها الحين.'}
            </p>
          </div>
        </div>
      ) : (
        <h1 className="tabular mb-8 font-display text-display-sm font-semibold text-primary">طلب #{order.number}</h1>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
        <Panel title="حالة الطلب" action={<StatusPill status={order.status} />}>
          <OrderTracker status={order.status} />
          {(paid || (order.status === 'completed' && order.reviewToken)) && <div className="mt-5 flex flex-wrap gap-2">{paid && <InvoiceButton order={order} />}{order.status === 'completed' && order.reviewToken && <Button asChild variant="accent"><Link to={reviewPath(order.id, order.reviewToken)}><Star />قيّمي طلبك</Link></Button>}</div>}
          {order.status === 'pending' && order.paymentMethod === 'card' && (
            <div className="mt-6 rounded-2xl bg-sunken/60 p-4 ring-1 ring-border sm:p-5">
              <h3 className="mb-4 font-display text-lg font-semibold text-primary">أكملي الدفع</h3>
              <PaymentForm
                amount={order.total} customer={order.customer || {}} apple={apple}
                validate={() => true} ready onPay={payNow} busy={paying}
              />
            </div>
          )}
          <h3 className="mt-8 mb-3 font-display font-semibold text-primary">السجل</h3>
          <ol className="relative grid gap-4 border-s-2 border-border-strong ps-5">
            {[...(order.history || [])].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span className={cn('absolute -start-[27px] top-1.5 size-3 rounded-full ring-4 ring-surface', i === 0 ? 'bg-accent' : 'bg-primary')} />
                <div className="flex flex-wrap items-baseline justify-between gap-2"><b>{statusLabel(h.status)}</b><span className="tabular text-xs text-muted-foreground">{dateTime(h.at)}</span></div>
                {h.note && <p className="mt-1 text-sm text-muted-foreground">{h.note}</p>}
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="تفاصيل الطلب">
          <ul className="grid gap-4">
            {order.items.map((it, i) => (
              <li key={i} className="flex gap-3 text-sm">
                {it.image ? <img src={it.image} alt="" className="size-12 rounded-sm object-cover" /> : <span className="size-12 rounded-sm bg-sunken" />}
                <div className="flex-1">
                  <p className="leading-6">{it.name}{it.qty > 1 && <span className="text-muted-foreground"> × {it.qty}</span>}</p>
                  <OptionList items={it.options} />
                  {it.note && <p className="text-xs text-muted-foreground">{it.note}</p>}
                  {it.digital && paid && <DownloadButton orderId={order.id} productId={it.productId} />}
                </div>
                <strong className="tabular">{money(it.price * it.qty)}</strong>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-2 border-t border-border pt-4">
            <div className="flex justify-between text-sm"><dt className="text-muted-foreground">المجموع</dt><dd className="tabular">{money(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-success"><dt>خصم {order.coupon}</dt><dd className="tabular">− {money(order.discount)}</dd></div>}
            {order.shipping && <div className="flex justify-between text-sm"><dt className="text-muted-foreground">الشحن</dt><dd className="tabular">{order.shippingFee > 0 ? money(order.shippingFee) : 'مجاني'}</dd></div>}
            <div className="flex items-baseline justify-between"><dt className="font-bold">الإجمالي</dt><dd className="tabular font-display text-2xl font-semibold text-primary">{money(order.total)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">دفع إلكتروني · <span className="tabular">{dateTime(order.createdAt)}</span></p>
          {order.shipping && (
            <div className="mt-5 rounded-xl bg-sunken p-4 text-sm leading-7">
              <p className="mb-1 flex items-center gap-2 font-semibold text-primary"><Truck className="size-4" />عنوان الشحن</p>
              <p dir="auto">{addressLine(order.shipping)}</p>
            </div>
          )}
          <Button asChild variant="outline" className="mt-5 w-full"><Link to="/account">كل طلباتي</Link></Button>
        </Panel>
      </div>
    </div>
  )
}
