// Builds the customer's PDF invoice for an order (Arabic, right-to-left, the store colours).
// PDFKit shapes Arabic letters but has no bidi, so every line is laid out here run by run, right to left.
import PDFDocument from 'pdfkit'
import { readFileSync } from 'node:fs'

const A = (f) => new URL(`./_assets/${f}`, import.meta.url)
const FONT = { r: readFileSync(A('IBMPlexSansArabic-Regular.woff')), sb: readFileSync(A('IBMPlexSansArabic-SemiBold.woff')), b: readFileSync(A('IBMPlexSansArabic-Bold.woff')) }
const LOGO = readFileSync(A('logo-white.png'))

// keep in step with src/data/terms.js
const TERMS_VERSION = '2026-10'
const NAVY = '#7d3f4c', INK = '#48252c', MUTED = '#725e6b', LINE = '#f0e5e3', SOFT = '#fdf7f4'
const AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/

export const STATUS_AR = { pending: 'بانتظار الدفع', paid: 'مدفوعة', in_progress: 'مدفوعة', review: 'مدفوعة', completed: 'مدفوعة', cancelled: 'ملغاة' }
export const money = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const date = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }) // 2026-10-07

// Bidi by hand: Arabic words are drawn one by one (PDFKit loses spaces inside Arabic runs), consecutive
// Latin/number words stay together in their own order, and the pieces are placed right to left.
const MIRROR = { '(': ')', ')': '(', '[': ']', ']': '[', '«': '»', '»': '«', '<': '>', '>': '<' }
const mirror = (s) => [...s].map((ch) => MIRROR[ch] || ch).reverse().join('')
function runs(text) {
  const out = []
  for (const w of String(text ?? '').split(/\s+/).filter(Boolean)) {
    if (AR.test(w)) {
      // leading/trailing punctuation of an Arabic word sits on the opposite sides, mirrored
      const m = w.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u)
      out.push({ rtl: true, t: m[2], lead: mirror(m[1]), trail: mirror(m[3]) })
    } else {
      const last = out[out.length - 1]
      if (last && !last.rtl) last.t += ' ' + w; else out.push({ rtl: false, t: w })
    }
  }
  return out
}
const runWidth = (doc, r) => doc.widthOfString(r.t) + (r.lead ? doc.widthOfString(r.lead) : 0) + (r.trail ? doc.widthOfString(r.trail) : 0)

function lines(doc, text, max) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean), out = []
  let cur = ''
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w
    if (cur && doc.widthOfString(next) > max) { out.push(cur); cur = w } else cur = next
  }
  if (cur) out.push(cur)
  return out.length ? out : ['']
}

/** Draws one line ending at xRight (right-aligned), or starting at xLeft when align = 'left'. Returns its width. */
function say(doc, text, x, y, { font = 'r', size = 10, color = INK, align = 'right' } = {}) {
  doc.font(font).fontSize(size).fillColor(color)
  const rs = runs(text), gap = doc.widthOfString(' ')
  const total = rs.reduce((s, r) => s + runWidth(doc, r), 0) + gap * Math.max(0, rs.length - 1)
  let cursor = align === 'left' ? x + total : align === 'center' ? x + total / 2 : x
  const put = (t) => { if (!t) return; const w = doc.widthOfString(t); cursor -= w; doc.text(t, cursor, y, { lineBreak: false }) }
  for (const r of rs) {
    if (r.rtl) { put(r.lead); put(r.t); put(r.trail) } else put(r.t)
    cursor -= gap
  }
  return total
}

/** Wrapped right-aligned paragraph; returns the height used. */
function para(doc, text, xRight, y, max, opts = {}) {
  doc.font(opts.font || 'r').fontSize(opts.size || 10)
  const ls = lines(doc, text, max), lh = (opts.size || 10) * 1.6
  ls.forEach((l, i) => say(doc, l, xRight, y + i * lh, opts))
  return ls.length * lh
}

export function invoicePdf(order, seller) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `فاتورة ${order.number}`, Author: seller.name } })
    const chunks = []
    doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject)
    doc.registerFont('r', FONT.r); doc.registerFont('sb', FONT.sb); doc.registerFont('b', FONT.b)

    const W = doc.page.width, M = 44, R = W - M, L = M
    const c = order.customer || {}

    // header band
    doc.rect(0, 0, W, 132).fill(NAVY)
    doc.image(LOGO, R - 128, 30, { fit: [128, 70], align: 'right' })
    say(doc, 'فاتورة', L, 38, { font: 'b', size: 26, color: '#ffffff', align: 'left' })
    say(doc, `رقم ${order.number}`, L, 76, { font: 'r', size: 11, color: '#c3cedd', align: 'left' })

    // meta strip
    let y = 156
    const meta = [['رقم الفاتورة', String(order.number)], ['التاريخ', date(order.paid_at || order.created_at)], ['حالة الدفع', STATUS_AR[order.status] || order.status], ['طريقة الدفع', String(order.payment_ref || '').startsWith('tamara:') ? 'تمارا (تقسيط)' : order.payment_method === 'bank' ? 'تحويل بنكي' : 'بطاقة أو Apple Pay']]
    const cw = (R - L) / meta.length
    meta.forEach(([k, v], i) => {
      const xr = R - i * cw
      say(doc, k, xr, y, { size: 9, color: MUTED })
      say(doc, v, xr, y + 15, { font: 'sb', size: 11.5 })
    })
    y += 50
    doc.moveTo(L, y).lineTo(R, y).lineWidth(1).strokeColor(LINE).stroke()

    // from / to
    y += 18
    const half = (R - L) / 2
    say(doc, 'من', R, y, { size: 9, color: MUTED }); say(doc, 'إلى', R - half, y, { size: 9, color: MUTED })
    y += 16
    const from = [seller.name, seller.email, seller.phone].filter(Boolean)
    const sh = order.shipping || {}
    const to = [c.name, c.email, c.phone, [sh.shortAddress, sh.city, sh.district].filter(Boolean).join('، ')].filter(Boolean)
    from.forEach((t, i) => say(doc, t, R, y + i * 17, { font: i ? 'r' : 'sb', size: i ? 10 : 11.5 }))
    to.forEach((t, i) => say(doc, t, R - half, y + i * 17, { font: i ? 'r' : 'sb', size: i ? 10 : 11.5 }))
    y += Math.max(from.length, to.length) * 17 + 20

    // items table (columns from the right: product, qty, price, total)
    const col = { name: R - 12, qty: R - 300, price: R - 360, total: L + 12 }
    doc.roundedRect(L, y, R - L, 30, 6).fill(SOFT)
    say(doc, 'المنتج', col.name, y + 9, { font: 'sb', size: 10, color: NAVY })
    say(doc, 'الكمية', col.qty, y + 9, { font: 'sb', size: 10, color: NAVY, align: 'center' })
    say(doc, 'السعر', col.price, y + 9, { font: 'sb', size: 10, color: NAVY })
    say(doc, 'المجموع', col.total, y + 9, { font: 'sb', size: 10, color: NAVY, align: 'left' })
    y += 40
    for (const it of order.items || []) {
      if (y > 690) { doc.addPage({ size: 'A4', margin: 0 }); y = 50 }
      let h = para(doc, it.name, col.name, y, 250, { font: 'sb', size: 10.5 })
      for (const o of it.options || []) h += para(doc, `${o.option}: ${o.value}`, col.name, y + h, 250, { size: 8.5, color: MUTED })
      say(doc, String(it.qty), col.qty, y, { size: 10.5, align: 'center' })
      say(doc, `${money(it.price)} ر.س`, col.price, y, { size: 10.5 })
      say(doc, `${money(it.price * it.qty)} ر.س`, col.total, y, { font: 'sb', size: 10.5, align: 'left' })
      y += Math.max(h, 16) + 12
      doc.moveTo(L, y - 6).lineTo(R, y - 6).lineWidth(0.6).strokeColor(LINE).stroke()
    }

    // totals (left block)
    y += 10
    const bw = 230, bx = L
    const rows = [['المجموع', `${money(order.subtotal)} ر.س`]]
    if (Number(order.discount) > 0) rows.push([order.coupon ? `الخصم (${order.coupon})` : 'الخصم', `${money(order.discount)} ر.س`])
    if (order.shipping) rows.push(['الشحن', Number(order.shipping_fee) > 0 ? `${money(order.shipping_fee)} ر.س` : 'مجاني'])
    rows.forEach(([k, v]) => {
      say(doc, k, bx + bw, y, { size: 10.5, color: MUTED })
      say(doc, v, bx, y, { size: 10.5, align: 'left' })
      y += 20
    })
    doc.roundedRect(bx - 10, y - 2, bw + 20, 38, 8).fill(NAVY)
    say(doc, 'الإجمالي', bx + bw, y + 10, { font: 'sb', size: 12, color: '#ffffff' })
    say(doc, `${money(order.total)} ر.س`, bx, y + 9, { font: 'b', size: 13, color: '#ffffff', align: 'left' })

    if (order.payment_ref) say(doc, `مرجع الدفع ${order.payment_ref}`, R, y + 10, { size: 9, color: MUTED })

    // the customer's acceptance of the terms and declaration, made at checkout
    let dy = y + 62
    const fyTop = doc.page.height - 78
    const accepted = date(order.terms_accepted_at || order.created_at)
    const [vy, vm] = String(order.terms_version || TERMS_VERSION).split('-')
    const version = `${['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][Number(vm) - 1] || ''} ${vy}`.trim()
    const lines1 = `وافق العميل إلكترونياً عند إتمام الطلب بتاريخ ${accepted} على السياسات والشروط والإقرار والتعهد إصدار ${version}، بما فيها: صحة بيانات وعنوان الشحن، وأن منتجات العناية لا تُسترجع بعد فتحها أو استخدامها إلا إذا كانت تالفة أو غير مطابقة.`
    doc.font('r').fontSize(9)
    const boxH = lines(doc, lines1, R - L - 32).length * 9 * 1.6 + 40
    if (dy + boxH > fyTop - 10) { doc.addPage({ size: 'A4', margin: 0 }); dy = 50 }
    doc.roundedRect(L, dy, R - L, boxH, 8).lineWidth(1).strokeColor(LINE).stroke()
    say(doc, 'إقرار العميل', R - 16, dy + 12, { font: 'sb', size: 10.5, color: NAVY })
    para(doc, lines1, R - 16, dy + 30, R - L - 32, { size: 9, color: INK })

    // footer
    const fy = doc.page.height - 78
    doc.moveTo(L, fy).lineTo(R, fy).lineWidth(1).strokeColor(LINE).stroke()
    say(doc, `شكراً لثقتك في ${seller.name}`, W / 2, fy + 16, { font: 'sb', size: 11, color: NAVY, align: 'center' })
    say(doc, [seller.site, seller.email].filter(Boolean).join('  ·  '), W / 2, fy + 36, { size: 9, color: MUTED, align: 'center' })
    doc.end()
  })
}
