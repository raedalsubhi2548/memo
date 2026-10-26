// Order emails to the customer (and a copy to the store), sent over the store's own mailbox (SMTP).
// Settings live only in Vercel environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, ORDER_NOTIFY_TO.
import nodemailer from 'nodemailer'
import { admin, siteUrl } from './_shared.js'
import { invoicePdf, money } from './_invoice.js'
import { GOOGLE_REVIEW_URL, reviewPath } from '../src/lib/feedback.js'

export const SELLER = () => ({
  name: 'عناية ميمي',
  email: process.env.STORE_EMAIL || '',
  phone: '0502953556',
  site: (process.env.SITE_URL || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
})

// The owner's store name / phone / email from the store designer (site_settings), over the defaults above.
let sellerCache = { at: 0, v: null }
export async function loadSeller() {
  if (sellerCache.v && Date.now() - sellerCache.at < 60_000) return sellerCache.v
  const base = SELLER()
  try {
    const { data } = await admin.from('site_settings').select('data').eq('id', 'main').maybeSingle()
    const st = data?.data?.store || {}
    const phone = String(st.whatsapp || '').replace(/\D/g, '')
    sellerCache = { at: Date.now(), v: {
      ...base,
      ...(typeof st.name === 'string' && st.name.trim() ? { name: st.name.trim().slice(0, 40) } : {}),
      ...(/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(st.email || '') ? { email: st.email } : {}),
      ...(/^\d{9,15}$/.test(phone) ? { phone: phone.startsWith('966') ? '0' + phone.slice(3) : '+' + phone } : {}),
      ...(/^https:\/\/[^"'<>\s]+$/i.test(data?.data?.logoLight || '') ? { logo: data.data.logoLight } : {}),
    } }
  } catch { sellerCache = { at: Date.now(), v: base } }
  return sellerCache.v
}

let transport
// emails show the store's name as the sender (the address stays MAIL_FROM's, or the SMTP login)
const sender = (name) => {
  const addr = (String(process.env.MAIL_FROM || '').match(/<([^>]+)>/)?.[1] || process.env.MAIL_FROM || process.env.SMTP_USER || '').trim()
  return { name: String(name || 'عناية ميمي').replace(/["<>\r\n]/g, ''), address: addr }
}
const mailer = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null
  const port = Number(process.env.SMTP_PORT || 465)
  transport ||= nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
  return transport
}

// what each moment of the order says to the customer
const EVENTS = {
  created: { subject: (o) => `🎉 وصلنا طلبك #${o.number}`, pre: 'طلبك مسجّل عندنا، وهذي تفاصيله.', title: 'استلمنا طلبك', body: (o) => o.payment_method === 'bank' ? 'شكراً لك! طلبك مسجّل عندنا. حوّل المبلغ على الحساب البنكي الموضّح، ونبدأ التنفيذ أول ما يوصلنا التحويل.' : 'شكراً لك! طلبك مسجّل عندنا وبانتظار إتمام الدفع.' },
  paid: { subject: (o) => `✅ تأكّد طلبك #${o.number} · فاتورتك مرفقة`, pre: 'وصلنا الدفع، ونجهّز طلبك الحين.', title: 'تم استلام الدفع', body: () => 'وصلنا الدفع، وأرفقنا لك فاتورة طلبك. نجهّز طلبك ونشحنه لك، ويوصلك إيميل مع كل تحديث.' },
  in_progress: { subject: (o) => `📦 نجهّز طلبك #${o.number}`, pre: 'طلبك قيد التجهيز للشحن.', title: 'طلبك قيد التجهيز', body: () => 'نجهّز طلبك الحين ونغلّفه للشحن، ونبلّغك أول ما ينشحن.' },
  review: { subject: (o) => `🚚 انشحن طلبك #${o.number}`, pre: 'طلبك في الطريق لك.', title: 'تم شحن طلبك', body: () => 'طلبك انشحن وهو في الطريق لعنوانك.' },
  completed: { subject: (o) => `🎁 وصلك طلبك #${o.number} · شكراً لك`, pre: 'تم توصيل طلبك.', title: 'تم توصيل طلبك', body: () => 'تم توصيل طلبك. شكراً لثقتك، ويسعدنا نسمع رأيك.' },
  cancelled: { subject: (o) => `تم إلغاء طلبك #${o.number}`, pre: 'لو عندك أي استفسار، تواصلي معنا.', title: 'تم إلغاء الطلب', body: () => 'تم إلغاء طلبك. لو عندك أي استفسار تواصلي معنا.' },
}
// what the owner's copy is called in his inbox
const OWNER = {
  paid: (o) => `💰 طلب جديد #${o.number} · ${Number(o.total) > 0 ? `${Number(o.total).toLocaleString('en', { maximumFractionDigits: 2 })} ر.س` : 'مجاني بكوبون'} · ${o.customer?.name || 'عميل'}`,
  created: (o) => `🆕 طلب جديد بانتظار الدفع #${o.number} · ${o.customer?.name || 'عميل'}`,
}
export const EVENT_IDS = Object.keys(EVENTS)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function html(order, ev, s = SELLER()) {
  const e = EVENTS[ev], base = siteUrl()
  const bank = ev === 'created' && order.payment_method === 'bank' && process.env.VITE_BANK_INFO
  const rows = (order.items || []).map((it) => `<tr><td style="padding:10px 0;border-bottom:1px solid #f0e5e3;font-size:14px;color:#1f2733">${esc(it.name)}${it.qty > 1 ? ` <span style="color:#6b7686">× ${it.qty}</span>` : ''}${(it.options || []).map((o) => `<div style="font-size:12px;line-height:1.7;color:#6b7686">${esc(o.option)}: ${esc(o.value)}</div>`).join('')}</td><td style="padding:10px 0;border-bottom:1px solid #f0e5e3;font-size:14px;color:#1f2733;text-align:left;white-space:nowrap" dir="ltr">${money(it.price * it.qty)} ر.س</td></tr>`).join('')
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#fdf7f4;font-family:Tahoma,'Segoe UI',Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(e.pre)}${'&#8204;&nbsp;'.repeat(60)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf7f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;direction:rtl;text-align:right">
<tr><td style="background:#7d3f4c;padding:26px 28px" align="center"><img src="${s.logo || base + '/logo-300.png'}" width="96" alt="${esc(s.name)}" style="display:block;border:0;height:auto"></td></tr>
<tr><td style="padding:30px 28px 8px">
<p style="margin:0;font-size:13px;color:#6b7686">طلب رقم ${order.number}</p>
<h1 style="margin:6px 0 10px;font-size:24px;color:#7d3f4c">${e.title}</h1>
<p style="margin:0;font-size:15px;line-height:1.9;color:#3a4352">أهلاً ${esc(order.customer?.name || '')}، ${e.body(order)}</p>
${bank ? `<div style="margin:18px 0 0;padding:14px 16px;background:#fdf7f4;border-radius:12px;font-size:14px;line-height:1.9;color:#1f2733;white-space:pre-line">${esc(process.env.VITE_BANK_INFO)}</div>` : ''}
</td></tr>
<tr><td style="padding:18px 28px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
${Number(order.discount) > 0 ? `<tr><td style="padding:8px 0;font-size:13px;color:#6b7686">الخصم</td><td style="padding:8px 0;font-size:13px;color:#6b7686;text-align:left" dir="ltr">${money(order.discount)} ر.س</td></tr>` : ''}
${order.shipping ? `<tr><td style="padding:8px 0;font-size:13px;color:#6b7686">الشحن</td><td style="padding:8px 0;font-size:13px;color:#6b7686;text-align:left" dir="ltr">${Number(order.shipping_fee) > 0 ? money(order.shipping_fee) + ' ر.س' : 'مجاني'}</td></tr>` : ''}
<tr><td style="padding:12px 0;font-size:16px;font-weight:bold;color:#7d3f4c">الإجمالي</td><td style="padding:12px 0;font-size:16px;font-weight:bold;color:#7d3f4c;text-align:left" dir="ltr">${money(order.total)} ر.س</td></tr></table></td></tr>
${ev === 'completed' && order.review_token ? `<tr><td style="padding:14px 28px 4px" align="center"><div style="padding:20px 18px;background:#fbefec;border-radius:14px">
<p style="margin:0 0 6px;font-size:17px;font-weight:bold;color:#7d3f4c">كيف كانت تجربتك معنا؟</p>
<p style="margin:0 0 14px;font-size:14px;line-height:1.8;color:#3a4352">قيّمي المنتج والمتجر في أقل من دقيقة، رأيك يهمنا ويساعد غيرك تختار.</p>
<a href="${base}${reviewPath(order.id, order.review_token)}" style="display:inline-block;background:#e9c3bd;color:#7d3f4c;text-decoration:none;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:999px">⭐ قيّمي طلبك</a>
${GOOGLE_REVIEW_URL ? `<p style="margin:12px 0 0;font-size:13px;color:#6b7686">وإذا حابة، <a href="${GOOGLE_REVIEW_URL}" style="color:#7d3f4c;font-weight:bold">قيّمينا على قوقل</a></p>` : ''}</div></td></tr>` : ''}
${order.shipping ? `<tr><td style="padding:14px 28px 0"><div style="padding:14px 16px;background:#fdf7f4;border-radius:12px;font-size:14px;line-height:1.9;color:#48252c"><b>عنوان الشحن</b><br>${esc([order.shipping.shortAddress, order.shipping.city, order.shipping.district, order.shipping.street, order.shipping.details].filter((x) => String(x || '').trim()).join('، '))}</div></td></tr>` : ''}
<tr><td style="padding:10px 28px 30px" align="center"><a href="${base}/order/${order.id}" style="display:inline-block;background:#7d3f4c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:13px 30px;border-radius:999px">تابعي طلبك</a></td></tr>
<tr><td style="padding:18px 28px;background:#fdf7f4;border-top:1px solid #f0e5e3;font-size:12px;line-height:1.8;color:#6b7686" align="center">
${esc(s.name)}${s.email ? ` · <a href="mailto:${s.email}" style="color:#6b7686">${s.email}</a>` : ''}${s.phone ? ` · <span dir="ltr">${esc(s.phone)}</span>` : ''}<br>وصلك هذا الإيميل لأن عندك طلب في ${esc(s.name)}.</td></tr>
</table></td></tr></table></body></html>`
}

// Where the owner's copies go: ORDER_NOTIFY_TO (Vercel) if set, else the email of every admin account
// (the owner's own login, so it reaches him personally), else the store email from «مصمم المتجر».
export async function storeInbox() {
  if (process.env.ORDER_NOTIFY_TO) return process.env.ORDER_NOTIFY_TO
  try {
    const { data } = await admin.from('profiles').select('email').eq('role', 'admin')
    const list = [...new Set((data || []).map((r) => String(r.email || '').trim().toLowerCase()).filter((e) => /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(e)))].slice(0, 5)
    if (list.length) return list.join(', ')
  } catch { /* fall back */ }
  return (await loadSeller()).email
}

/** A short plain alert to the store. Throws if sending fails (callers that don't care add .catch). */
export async function sendAdminAlert(subject, text) {
  const t = mailer(); if (!t) return { sent: false, reason: 'smtp-not-configured' }
  const to = await storeInbox()
  await t.sendMail({ from: sender((await loadSeller()).name), to, subject: `⚠️ ${subject}`, text })
  return { sent: true, to }
}

/**
 * Sends the email for one moment of an order, once. Returns { sent, reason }.
 * `notified` (text[] on orders) remembers what was already sent, so retries and webhooks never repeat it.
 */
export async function sendOrderEmail(orderOrId, ev) {
  if (!EVENTS[ev]) return { sent: false, reason: 'unknown-event' }
  const t = mailer(); if (!t) return { sent: false, reason: 'smtp-not-configured' }
  const order = typeof orderOrId === 'object' ? orderOrId : (await admin.from('orders').select('*').eq('id', orderOrId).single()).data
  if (!order) return { sent: false, reason: 'order-not-found' }
  const done = Array.isArray(order.notified) ? order.notified : []
  if (done.includes(ev)) return { sent: false, reason: 'already-sent' }
  const to = order.customer?.email
  if (!to) return { sent: false, reason: 'no-email' }

  // claim the event first (only if the column exists and nobody claimed it meanwhile), then send
  if ('notified' in order) {
    const { data: claimed } = await admin.from('orders').update({ notified: [...done, ev] }).eq('id', order.id).not('notified', 'cs', `{${ev}}`).select('id')
    if (!claimed?.length) return { sent: false, reason: 'already-sent' }
  }

  const s = await loadSeller()
  const attachments = ev === 'paid' ? [{ filename: `فاتورة-${order.number}.pdf`, content: await invoicePdf(order, s), contentType: 'application/pdf' }] : []
  const from = sender(s.name)
  // the owner gets a copy of every email the customer gets; a new paid order is marked clearly
  const storeCopy = storeInbox().then((copy) => copy && t.sendMail({ from, to: copy, replyTo: to, subject: OWNER[ev] ? OWNER[ev](order) : `📋 ${EVENTS[ev].title} · #${order.number} · ${order.customer?.name || 'عميل'}`, html: html(order, ev, s), attachments }))
    .catch((err) => console.error('store copy failed', order.id, err?.message))
  try {
    await t.sendMail({ from, to, replyTo: s.email, subject: EVENTS[ev].subject(order), html: html(order, ev, s), attachments })
    await storeCopy
    return { sent: true }
  } catch (err) {
    await storeCopy
    // let a later retry try again
    if ('notified' in order) await admin.from('orders').update({ notified: done }).eq('id', order.id)
    console.error('mail failed', ev, order.id, err?.message)
    return { sent: false, reason: 'smtp-error' }
  }
}

/** The sign-in code, sent only after the password was checked (api/login-start.js). Throws if sending fails. */
export async function sendLoginCodeEmail(to, code) {
  const t = mailer(); if (!t) throw new Error('smtp-not-configured')
  const s = await loadSeller()
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#fdf7f4;font-family:Tahoma,'Segoe UI',Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf7f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;direction:rtl;text-align:right">
<tr><td style="background:#7d3f4c;padding:26px 28px" align="center"><img src="${s.logo || siteUrl() + '/logo-white.png'}" width="150" alt="${esc(s.name)}" style="display:block;border:0;height:auto"></td></tr>
<tr><td style="padding:32px 28px 10px"><h1 style="margin:0 0 10px;font-size:23px;color:#7d3f4c">رمز التحقق</h1>
<p style="margin:0;font-size:15px;line-height:1.9;color:#3a4352">تم إدخال كلمة المرور الصحيحة لحسابك في ${esc(s.name)}. اكتب هذا الرمز لإكمال الدخول.</p></td></tr>
<tr><td style="padding:18px 28px" align="center"><div dir="ltr" style="display:inline-block;background:#fdf7f4;border:1px solid #dfe5ee;border-radius:14px;padding:16px 26px;font-size:34px;font-weight:bold;letter-spacing:10px;color:#7d3f4c;font-family:'Courier New',monospace">${esc(code)}</div>
<p style="margin:14px 0 0;font-size:13px;color:#6b7686">الرمز صالح لفترة محدودة، لا تشاركه مع أحد.</p></td></tr>
<tr><td style="padding:18px 28px;background:#fdf7f4;border-top:1px solid #f0e5e3;font-size:12px;line-height:1.8;color:#6b7686" align="center">إذا ما كنت أنت، غيّر كلمة المرور من «نسيت كلمة المرور؟» فوراً.<br>${esc(s.name)} · ${esc(s.email)}</td></tr>
</table></td></tr></table></body></html>`
  await t.sendMail({ from: sender(s.name), to, subject: `${code} رمز التحقق لدخول ${s.name}`, html })
}

// A new team member: what they were given and how to get in (sign-in is the usual password + emailed code).
const AREA_NAMES = { orders: 'الطلبات', reports: 'التقارير', products: 'المنتجات', categories: 'التصنيفات', customers: 'العملاء', coupons: 'كوبونات الخصم', design: 'مصمم المتجر', blog: 'المدونة' }
export async function sendStaffInviteEmail(to, { name, role, perms, isNew }) {
  const t = mailer(); if (!t) throw new Error('smtp-not-configured')
  const s = await loadSeller()
  const site = siteUrl()
  const dash = site.replace('://', '://admin.').replace('://admin.www.', '://admin.') + '/admin/login'
  const areas = perms.map((p) => AREA_NAMES[p]).filter(Boolean).join('، ')
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#fdf7f4;font-family:Tahoma,'Segoe UI',Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf7f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;direction:rtl;text-align:right">
<tr><td style="background:#7d3f4c;padding:26px 28px" align="center"><img src="${s.logo || site + '/logo-white.png'}" width="150" alt="${esc(s.name)}" style="display:block;border:0;height:auto"></td></tr>
<tr><td style="padding:32px 28px 8px"><h1 style="margin:0 0 10px;font-size:23px;color:#7d3f4c">أهلاً ${esc(name || '')} في فريق ${esc(s.name)}</h1>
<p style="margin:0;font-size:15px;line-height:1.9;color:#3a4352">انضافت لك صلاحية دخول لوحة التحكم${role ? ` بدور <strong>${esc(role)}</strong>` : ''}.</p>
<p style="margin:12px 0 0;font-size:14px;line-height:1.9;color:#3a4352"><strong>الأقسام المتاحة لك:</strong> ${esc(areas)}</p></td></tr>
<tr><td style="padding:16px 28px"><ol style="margin:0;padding:0 18px 0 0;font-size:14px;line-height:2;color:#3a4352">
${isNew ? `<li>أول مرة؟ عيّن كلمة مرورك من <a href="${site}/login?mode=forgot" style="color:#7d3f4c">«نسيت كلمة المرور؟»</a> بنفس هذا البريد.</li>` : ''}
<li>افتح لوحة التحكم واكتب بريدك وكلمة المرور.</li><li>يوصلك رمز تحقق على هذا البريد، اكتبه وتدخل.</li></ol></td></tr>
<tr><td style="padding:8px 28px 28px" align="center"><a href="${dash}" style="display:inline-block;background:#7d3f4c;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 30px;border-radius:999px">دخول لوحة التحكم</a></td></tr>
<tr><td style="padding:18px 28px;background:#fdf7f4;border-top:1px solid #f0e5e3;font-size:12px;line-height:1.8;color:#6b7686" align="center">إذا ما تعرف عن هذا، تجاهل الرسالة.<br>${esc(s.name)} · ${esc(s.email)}</td></tr>
</table></td></tr></table></body></html>`
  await t.sendMail({ from: sender(s.name), to, subject: `انضافت لك صلاحية لوحة تحكم ${s.name}`, html })
}
