// Demo backend: everything lives in this browser's localStorage.
// Same interface as supa.js so the UI never knows which one is running.
import { seedCategories, seedProducts } from '../data/seed.js'

const K = (k) => `mimi:${k}`
// the product pictures are part of the version: a renamed picture (new file name for the 30-day cache) re-seeds the demo
// catalog, so a browser that saw an older one never asks for a file that no longer exists
const SEED_VERSION = '2026-10-27|' + seedProducts.map((p) => p.image).join('|')

function read(key, fallback) {
  try {
    const v = localStorage.getItem(K(key))
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
function write(key, value) {
  try { localStorage.setItem(K(key), JSON.stringify(value)) } catch { /* storage full or blocked */ }
}

async function hash(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mimi::' + text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// demo-only login, compiled out of the production bundle
export const DEMO_ADMIN = import.meta.env.DEV ? { email: 'admin@demo.local', password: 'mimi2026' } : null
export const DEMO_CODE = '000000' // demo mode sends no email: the sign-in code is always this one

async function ensureSeed() {
  if (read('seed') === SEED_VERSION) return
  const now = new Date().toISOString()
  write('categories', seedCategories)
  write('products', seedProducts.map((p) => ({ active: true, createdAt: now, ...p })))
  write('orders', read('orders', []))
  write('coupons', read('coupons', []))
  const users = read('users', [])
  if (DEMO_ADMIN && !users.some((u) => u.email === DEMO_ADMIN.email)) {
    users.push({
      id: 'u_admin', name: 'المالكة', email: DEMO_ADMIN.email, phone: '', role: 'admin',
      pass: await hash(DEMO_ADMIN.password), createdAt: now,
    })
  }
  write('users', users)
  write('seed', SEED_VERSION)
}

const listeners = new Set()
const publicUser = (u) => u && { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, createdAt: u.createdAt }
function emit() { const u = sessionUser(); listeners.forEach((fn) => fn(u)) }
function sessionUser() {
  const id = read('session')
  return publicUser(read('users', []).find((u) => u.id === id))
}
const uid = (p) => p + Math.random().toString(36).slice(2, 10)
function requireUser() { const u = sessionUser(); if (!u) throw new Error('سجّلي دخولك أولاً'); return u }
const ALL = ['orders', 'reports', 'products', 'categories', 'customers', 'coupons', 'design', 'reviews']
function accessOf(u) {
  if (!u) return { owner: false, role: '', perms: [], strong: true }
  if (u.role === 'admin') return { owner: true, role: 'المالك', perms: [...ALL, 'team'], strong: true }
  const st = read('staff', []).find((x) => x.email === u.email.toLowerCase())
  return { owner: false, role: st?.role || '', perms: st?.perms || [], strong: true }
}
// the owner, or a staff member with that area (no area: the owner only)
function requireAdmin(area) {
  const u = requireUser(), a = accessOf(u)
  if (!a.owner && !(area && a.perms.includes(area))) throw new Error('ما عندك صلاحية لهذا القسم')
  return u
}

export const local = {
  mode: 'demo',
  ready: ensureSeed(),

  // ---------- auth ----------
  async currentUser() { await this.ready; return sessionUser() },
  onAuth(fn) { listeners.add(fn); return () => listeners.delete(fn) },
  async loginStart(email, password) {
    await this.ready
    const u = read('users', []).find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
    if (!u || u.pass !== (await hash(password))) throw new Error('البريد أو كلمة المرور غير صحيحة')
    write('pending', u.id) // step 2 needs the code
  },
  async verifyLoginCode(email, code) {
    await this.ready
    const u = read('users', []).find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
    if (!u || read('pending') !== u.id || code.trim() !== DEMO_CODE) throw new Error('الرمز غير صحيح أو انتهت صلاحيته')
    localStorage.removeItem(K('pending')); write('session', u.id); emit(); return publicUser(u)
  },
  // ---------- reviews and questions (same rules as supabase/reviews-2026-10.sql) ----------
  async getFeedback() {
    await this.ready
    return {
      reviews: read('reviews', []).filter((r) => r.status === 'published').map((r) => ({ id: r.id, name: r.name, products: r.products, service: r.service, store: r.store, text: r.text, date: (r.publishedAt || r.createdAt).slice(0, 10) })),
      questions: read('questions', []).filter((q) => q.status === 'published' && q.answer).map((q) => ({ id: q.id, productId: q.productId, name: q.name, question: q.question, answer: q.answer, date: (q.answeredAt || q.createdAt).slice(0, 10) })),
    }
  },
  async reviewForm(orderId, token) {
    await this.ready
    const o = read('orders', []).find((x) => x.id === orderId && x.reviewToken === token)
    if (!o) return { ok: false, reason: 'not-found' }
    if (o.status !== 'completed') return { ok: false, reason: 'not-completed' }
    return { ok: true, number: o.number, name: String(o.customer?.name || '').split(' ')[0], items: (o.items || []).map((it) => ({ productId: it.productId, name: it.name })), done: read('reviews', []).some((r) => r.orderId === o.id) }
  },
  async submitReview({ orderId, token, name, service, store, text }) {
    const f = await this.reviewForm(orderId, token)
    if (!f.ok) throw new Error(f.reason === 'not-completed' ? 'التقييم يفتح بعد اكتمال الطلب' : 'رابط التقييم غير صالح')
    if (f.done) throw new Error('قيّمت هذا الطلب من قبل، شكراً لك')
    if (!(service >= 1 && service <= 5 && store >= 1 && store <= 5)) throw new Error('اختر التقييم من 1 إلى 5')
    const status = service >= 4 && store >= 4 ? 'published' : 'pending', now = new Date().toISOString()
    const all = read('reviews', [])
    all.unshift({ id: uid('r_'), orderId, products: [...new Set(f.items.map((i) => i.productId).filter(Boolean))], name: String(name || '').trim().slice(0, 60) || f.name || 'عميل', service, store, text: String(text || '').trim().slice(0, 1000), status, createdAt: now, publishedAt: status === 'published' ? now : null })
    write('reviews', all)
    return status
  },
  async askQuestion({ productId, name, contact, question }) {
    await this.ready
    if (!read('products', []).some((p) => p.id === productId && p.active !== false)) throw new Error('المنتج غير موجود')
    if (String(question || '').trim().length < 3) throw new Error('اكتب سؤالك')
    if (!String(name || '').trim()) throw new Error('اكتب اسمك')
    const all = read('questions', [])
    all.unshift({ id: uid('q_'), productId, name: String(name).trim().slice(0, 60), contact: String(contact || '').trim().slice(0, 120), question: String(question).trim().slice(0, 600), answer: '', status: 'pending', createdAt: new Date().toISOString() })
    write('questions', all)
  },
  async listReviews() { requireAdmin('reviews'); return read('reviews', []) },
  async setReviewStatus(id, status) {
    requireAdmin('reviews')
    write('reviews', read('reviews', []).map((r) => (r.id === id ? { ...r, status, publishedAt: status === 'published' ? new Date().toISOString() : r.publishedAt } : r)))
  },
  async deleteReview(id) { requireAdmin('reviews'); write('reviews', read('reviews', []).filter((r) => r.id !== id)) },
  async listQuestions() { requireAdmin('reviews'); return read('questions', []) },
  async saveQuestion(id, { answer, status }) {
    requireAdmin('reviews')
    const a = String(answer || '').trim()
    if (status === 'published' && !a) throw new Error('اكتب الجواب قبل النشر')
    write('questions', read('questions', []).map((q) => (q.id === id ? { ...q, answer: a, status, answeredAt: a ? new Date().toISOString() : q.answeredAt } : q)))
  },
  async deleteQuestion(id) { requireAdmin('reviews'); write('questions', read('questions', []).filter((q) => q.id !== id)) },

  // ---------- the team ----------
  async myAccess() { await this.ready; return accessOf(sessionUser()) },
  async listStaff() { requireAdmin(); return read('staff', []) },
  async saveStaff({ email, name, role, perms }) {
    const me = requireAdmin()
    const e = String(email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e)) throw new Error('اكتب بريد صحيح')
    if (e === me.email.toLowerCase()) throw new Error('هذا بريد المالك، عنده كل الصلاحيات')
    const p = (perms || []).filter((x) => ALL.includes(x))
    if (!p.length) throw new Error('اختر قسم واحد على الأقل')
    const list = read('staff', []), i = list.findIndex((x) => x.email === e)
    const row = { email: e, name: String(name || '').trim(), role: String(role || '').trim(), perms: p, addedAt: list[i]?.addedAt || new Date().toISOString() }
    if (i >= 0) list[i] = row; else list.push(row)
    write('staff', list)
    return { ok: true, invited: false, added: i < 0 }
  },
  async removeStaff(email) { requireAdmin(); write('staff', read('staff', []).filter((x) => x.email !== email)) },
  async signUp({ name, email, phone, password }) {
    await this.ready
    const users = read('users', [])
    if (users.some((x) => x.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('هذا البريد مسجّل مسبقاً، سجّلي دخولك بدلاً من ذلك')
    const u = { id: uid('u_'), name, email: email.trim(), phone, role: 'customer', pass: await hash(password), createdAt: new Date().toISOString() }
    users.push(u); write('users', users); write('session', u.id); emit(); return publicUser(u)
  },
  async signOut() { localStorage.removeItem(K('session')); emit() },
  async updateProfile(patch) {
    const me = requireUser()
    const users = read('users', []).map((u) => (u.id === me.id ? { ...u, name: patch.name ?? u.name, phone: patch.phone ?? u.phone } : u))
    write('users', users); emit(); return sessionUser()
  },

  // ---------- catalog ----------
  async getCategories() { await this.ready; return read('categories', []).sort((a, b) => a.sort - b.sort) },
  async getProducts({ includeHidden = false } = {}) {
    await this.ready
    return read('products', []).filter((p) => includeHidden || p.active)
  },
  async getProduct(id) { await this.ready; return read('products', []).find((p) => p.id === id) || null },
  async saveProduct(p) {
    requireAdmin('products')
    const list = read('products', [])
    const i = list.findIndex((x) => x.id === p.id)
    if (i >= 0) list[i] = { ...list[i], ...p }
    else list.push({ createdAt: new Date().toISOString(), active: true, ...p, id: p.id || uid('p_') })
    write('products', list); return p
  },
  async deleteProduct(id) { requireAdmin('products'); write('products', read('products', []).filter((p) => p.id !== id)) },
  async saveCategory(c) {
    requireAdmin('categories')
    const list = read('categories', [])
    const i = list.findIndex((x) => x.id === c.id)
    if (i >= 0) list[i] = { ...list[i], ...c }; else list.push({ sort: list.length + 1, icon: 'spark', ...c, id: c.id || uid('c_') })
    write('categories', list)
  },
  async deleteCategory(id) {
    requireAdmin('categories')
    if (read('products', []).some((p) => p.categoryId === id)) throw new Error('انقل منتجات هذا التصنيف أولاً ثم احذفه')
    write('categories', read('categories', []).filter((c) => c.id !== id))
  },
  async getSettings() { return read('settings', null) },
  async saveSettings(settings, note = '') {
    const me = requireAdmin('design')
    if (JSON.stringify(read('settings', null)) === JSON.stringify(settings)) return
    write('settings', settings)
    const v = read('versions', [])
    v.unshift({ id: Date.now(), at: new Date().toISOString(), by: me.email, note, data: settings })
    write('versions', v.slice(0, 200))
  },
  // design backups (owner only), the same as owner_design_versions / owner_restore_design
  async designVersions() {
    requireAdmin()
    const v = read('versions', []), cur = JSON.stringify(read('settings', null))
    const curId = v.find((x) => JSON.stringify(x.data) === cur)?.id
    return v.map(({ data, ...x }) => ({ ...x, current: x.id === curId }))
  },
  async restoreDesign(id) {
    requireAdmin()
    const v = read('versions', []).find((x) => x.id === id)
    if (!v) throw new Error('النسخة غير موجودة')
    const at = new Date(v.at)
    await this.saveSettings(v.data, 'استرجاع نسخة ' + at.toLocaleString('en-CA', { timeZone: 'Asia/Riyadh', hour12: false }).slice(0, 17).replace(',', ''))
  },
  async rebuildSite() { return { ok: false, reason: 'demo' } },
  async uploadImage(file) {
    return new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file)
    })
  },

  // ---------- orders ----------
  async createOrder(order) {
    await this.ready
    const me = sessionUser()
    const orders = read('orders', [])
    const now = new Date().toISOString()
    const o = {
      ...order, id: uid('o_'), reviewToken: crypto.randomUUID(), number: 10000 + orders.length + 1, userId: me?.id || null,
      status: order.paymentMethod !== 'bank' ? 'paid' : 'pending', createdAt: now,
      history: order.paymentMethod !== 'bank'
        ? [{ status: 'pending', at: now }, { status: 'paid', at: now, note: 'دفع تجريبي في وضع العرض' }]
        : [{ status: 'pending', at: now, note: 'بانتظار التحويل البنكي' }],
    }
    orders.unshift(o); write('orders', orders); return o
  },
  async myOrders() { const me = requireUser(); return read('orders', []).filter((o) => o.userId === me.id) },
  async getOrder(id) {
    const me = requireUser()
    const o = read('orders', []).find((x) => x.id === id)
    if (!o || (o.userId !== me.id && me.role !== 'admin')) return null
    return o
  },
  // ---- reports (same shape as the admin_report function in supabase/reports.sql) ----
  async recordVisit(h) {
    const all = read('visits', [])
    if (h.t === 'leave') { const v = all.find((x) => x.id === h.id); if (v && h.d > (v.dur || 0)) { v.dur = h.d; write('visits', all) } return }
    const ua = h.ua || ''
    all.push({ id: h.id, at: h.at, kind: h.t, vid: h.vid, sid: h.sid, path: h.p, source: h.u || 'مباشر', campaign: h.c || null, country: 'SA', city: 'الرياض',
      device: /iPad|Tablet/i.test(ua) ? 'تابلت' : /Mobi|iPhone|Android/i.test(ua) ? 'جوال' : 'كمبيوتر', os: /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : 'Linux',
      browser: /Edg\//.test(ua) ? 'Edge' : /Firefox/.test(ua) ? 'Firefox' : /Chrome/.test(ua) ? 'Chrome' : 'Safari', dur: null })
    write('visits', all.slice(-5000))
  },
  async adminReport(from, to) {
    requireAdmin('reports')
    const F = new Date(from).getTime(), T = new Date(to).getTime(), L = T - F
    const visits = read('visits', []), orders = read('orders', []), users = read('users', [])
    const inR = (t, a, b) => { const x = new Date(t).getTime(); return x >= a && x < b }
    const v = visits.filter((x) => inR(x.at, F, T)), pv = v.filter((x) => x.kind === 'view'), prv = visits.filter((x) => x.kind === 'view' && inR(x.at, F - L, F))
    const uniq = (a, k = 'vid') => new Set(a.map((x) => x[k])).size
    const sess = Object.values(pv.reduce((m, x) => { (m[x.sid] ||= { n: 0, d: 0, first: x }).n++; m[x.sid].d += x.dur || 0; if (x.at < m[x.sid].first.at) m[x.sid].first = x; return m }, {}))
    const isPaid = (o) => !['pending', 'cancelled'].includes(o.status)
    const o = orders.filter((x) => inR(x.createdAt, F, T)), paid = o.filter(isPaid), ppaid = orders.filter((x) => inR(x.createdAt, F - L, F) && isPaid(x))
    const day = (t) => new Date(new Date(t).getTime() + 3 * 3600e3).toISOString().slice(0, 10)
    const days = []; for (let d = day(F); d <= day(T - 1000); d = day(new Date(d).getTime() + 864e5 + 1)) days.push(d)
    const top = (arr, key, n = 10, distinct = 'vid') => Object.entries(arr.reduce((m, x) => { const k = key(x); if (k == null) return m; (m[k] ||= new Set()).add(distinct ? x[distinct] : x.id); return m }, {}))
      .map(([k, set]) => ({ k, n: set.size })).sort((a, b) => b.n - a.n).slice(0, n)
    const live = visits.filter((x) => x.kind === 'view' && Date.now() - new Date(x.at).getTime() < 5 * 60e3)
    const liveLast = Object.values(live.reduce((m, x) => { if (!m[x.vid] || m[x.vid].at < x.at) m[x.vid] = x; return m }, {})).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 30)
    const items = paid.flatMap((x) => x.items || [])
    const prods = Object.values(items.reduce((m, it) => { const r = (m[it.productId] ||= { id: it.productId, k: it.name, qty: 0, n: 0 }); r.qty += it.qty; r.n += it.price * it.qty; return m }, {})).sort((a, b) => b.n - a.n).slice(0, 10)
    const coup = Object.values(paid.filter((x) => x.coupon).reduce((m, x) => { const r = (m[x.coupon] ||= { k: x.coupon, n: 0, d: 0 }); r.n++; r.d += x.discount || 0; return m }, {})).sort((a, b) => b.n - a.n)
    return {
      visitors: uniq(pv), views: pv.length, sessions: sess.length,
      bounce: sess.length ? Math.round((1000 * sess.filter((x) => x.n === 1).length) / sess.length) / 10 : 0,
      avgDuration: sess.length ? Math.round(sess.reduce((a, x) => a + x.d, 0) / sess.length) : 0,
      newVisitors: uniq(pv.filter((x) => !visits.some((y) => y.vid === x.vid && new Date(y.at).getTime() < F))),
      live: uniq(live), liveList: liveLast,
      carts: uniq(v.filter((x) => x.kind === 'cart')), checkouts: uniq(v.filter((x) => x.kind === 'checkout')),
      revenue: paid.reduce((a, x) => a + x.total, 0), paidOrders: paid.length, buyers: new Set(paid.map((x) => x.userId)).size,
      discount: paid.reduce((a, x) => a + (x.discount || 0), 0), pending: o.filter((x) => x.status === 'pending').length, cancelled: o.filter((x) => x.status === 'cancelled').length,
      newCustomers: users.filter((u) => u.role !== 'admin' && u.createdAt && inR(u.createdAt, F, T)).length,
      prev: { visitors: uniq(prv), views: prv.length, revenue: ppaid.reduce((a, x) => a + x.total, 0), orders: ppaid.length },
      daily: days.map((d) => { const dp = pv.filter((x) => day(x.at) === d), dpaid = paid.filter((x) => day(x.createdAt) === d); return { day: d, visitors: uniq(dp), views: dp.length, orders: dpaid.length, revenue: dpaid.reduce((a, x) => a + x.total, 0) } }),
      pages: Object.values(pv.reduce((m, x) => { const r = (m[x.path] ||= { k: x.path, n: 0, s: new Set() }); r.n++; r.s.add(x.vid); return m }, {})).map((r) => ({ k: r.k, n: r.n, u: r.s.size })).sort((a, b) => b.n - a.n).slice(0, 12),
      sources: top(sess.map((x) => x.first), (x) => x.source, 10, 'sid'),
      campaigns: top(pv, (x) => x.campaign, 10, 'sid'),
      countries: top(pv, (x) => x.country || '??'), cities: top(pv, (x) => x.city), devices: top(pv, (x) => x.device, 10), browsers: top(pv, (x) => x.browser, 8), systems: top(pv, (x) => x.os, 8),
      hours: Object.entries(pv.reduce((m, x) => { const h = (new Date(x.at).getUTCHours() + 3) % 24; m[h] = (m[h] || 0) + 1; return m }, {})).map(([k, n]) => ({ k: +k, n })).sort((a, b) => a.k - b.k),
      products: prods, coupons: coup,
    }
  },
  async allOrders() { requireAdmin('orders'); return read('orders', []) },
  async adminCreateOrder({ userId, items, status, notes, discount }) {
    requireAdmin('orders')
    if (!['pending', 'paid'].includes(status)) throw new Error('حالة غير صالحة')
    const u = read('users', []).find((x) => x.id === userId)
    if (!u) throw new Error('العميل غير موجود')
    if (!items?.length) throw new Error('أضف منتج واحد على الأقل')
    const products = read('products', [])
    const lines = items.map((l) => {
      const qty = Math.max(1, Math.min(999, Number(l.qty) || 1))
      if (l.product_id) {
        const p = products.find((x) => x.id === l.product_id)
        if (!p) throw new Error('منتج غير موجود')
        const base = p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price
        const chosen = (p.options || []).flatMap((o) => (o.values || []).filter((v) => (l.options || []).includes(o.id + ':' + v.id)).map((v) => ({ option: o.name, value: v.name, price: Math.max(0, Number(v.price) || 0) })))
        return { productId: p.id, name: p.name, price: base + chosen.reduce((a, c) => a + c.price, 0), qty, image: p.image, digital: !!p.digital, note: '', options: chosen }
      }
      const name = String(l.name || '').trim(), price = Math.round(Number(l.price) * 100) / 100
      if (!name) throw new Error('اكتب اسم البند')
      if (!(price >= 0) || price > 1e6) throw new Error('سعر البند غير صالح')
      return { productId: null, name: name.slice(0, 120), price, qty, image: null, digital: false, note: '', options: [] }
    })
    const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0)
    const disc = Math.min(subtotal, Math.max(0, Math.round((Number(discount) || 0) * 100) / 100))
    const orders = read('orders', []), now = new Date().toISOString()
    const o = {
      id: uid('o_'), number: 10000 + orders.length + 1, userId: u.id, customer: { name: u.name, phone: u.phone, email: u.email },
      items: lines, subtotal, discount: disc, total: subtotal - disc, notes: String(notes || '').slice(0, 2000), paymentMethod: 'card',
      paymentRef: status === 'paid' ? 'manual' : null, status, createdAt: now, history: [{ status, at: now, note: 'طلب يدوي من لوحة التحكم' }],
    }
    orders.unshift(o); write('orders', orders); return o
  },
  async deleteOrder(id) {
    requireAdmin()
    const orders = read('orders', [])
    if (!orders.some((o) => o.id === id)) throw new Error('الطلب غير موجود')
    write('orders', orders.filter((o) => o.id !== id))
  },
  async updateOrderStatus(id, status, note) {
    requireAdmin('orders')
    const orders = read('orders', []).map((o) => (o.id === id
      ? { ...o, status, history: [...(o.history || []), { status, at: new Date().toISOString(), note: note || '' }] }
      : o))
    write('orders', orders)
  },

  // ---------- wishlist ----------
  async getWishlist() { const me = sessionUser(); return me ? read('wish:' + me.id, []) : read('wish:guest', []) },
  async setWishlist(ids) { const me = sessionUser(); write('wish:' + (me ? me.id : 'guest'), ids) },

  // ---------- customers & coupons ----------
  async listCustomers() {
    requireAdmin('customers')
    const orders = read('orders', [])
    const staff = read('staff', [])
    return read('users', []).map((u) => {
      const mine = orders.filter((o) => o.userId === u.id), st = staff.find((x) => x.email === u.email.toLowerCase())
      return { ...publicUser(u), orders: mine.length, spent: mine.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
        kind: u.role === 'admin' ? 'owner' : st ? 'staff' : 'customer', staffRole: st?.role || '' }
    })
  },
  async addCustomer({ name, email, phone }) {
    requireAdmin('customers')
    const e = String(email || '').trim().toLowerCase(), n = String(name || '').trim().slice(0, 80)
    if (!n) throw new Error('اكتب اسم العميل')
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e)) throw new Error('اكتب بريد صحيح')
    const users = read('users', [])
    if (users.some((x) => x.email.toLowerCase() === e)) throw new Error('هذا البريد مسجّل من قبل')
    const u = { id: uid('u_'), name: n, email: e, phone: String(phone || '').replace(/[^\d+]/g, '').slice(0, 20), role: 'customer', pass: '', createdAt: new Date().toISOString() }
    users.push(u); write('users', users)
    return { ...publicUser(u), orders: 0, spent: 0 }
  },
  async deleteCustomer(id) {
    requireAdmin()
    const users = read('users', []), u = users.find((x) => x.id === id)
    if (!u) throw new Error('العميل غير موجود')
    if (u.role === 'admin') throw new Error('ما يصير تحذف حساب مالك')
    if (read('staff', []).some((x) => x.email === u.email.toLowerCase())) throw new Error('هذا الحساب من الفريق، احذفه من صفحة الفريق أولاً')
    write('users', users.filter((x) => x.id !== id))
    write('orders', read('orders', []).map((o) => (o.userId === id ? { ...o, userId: null } : o)))
  },
  async listCoupons() { requireAdmin('coupons'); return read('coupons', []) },
  async saveCoupon(c) {
    requireAdmin('coupons')
    const list = read('coupons', []).filter((x) => x.code !== c.code)
    list.push({ ...c, code: c.code.toUpperCase() }); write('coupons', list)
  },
  async deleteCoupon(code) { requireAdmin('coupons'); write('coupons', read('coupons', []).filter((c) => c.code !== code)) },
  async validateCoupon(code) {
    await this.ready
    const c = read('coupons', []).find((x) => x.code === code.trim().toUpperCase() && x.active)
    if (!c) throw new Error('الكود غير صالح أو منتهي')
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) throw new Error('انتهت صلاحية هذا الكود')
    return c
  },

  // ---------- payments ----------
  async startPayment(order) { return { redirect: null, order } },
  async notifyOrder() {},
  async testOrderNotice() { return { sent: false, reason: 'demo' } },
  async downloadInvoice() { throw new Error('الفاتورة متاحة في المتجر الحقيقي فقط') },
  async verifySignup() { throw new Error('غير متاح في وضع العرض') },
  async resendSignup() {},
  async sendResetCode() { throw new Error('غير متاح في وضع العرض') },
  async resetWithCode() { throw new Error('غير متاح في وضع العرض') },
  async downloadUrl(orderId, productId) {
    const o = await this.getOrder(orderId)
    if (!o || ['pending', 'cancelled'].includes(o.status)) throw new Error('يتاح التحميل بعد تأكيد الدفع')
    const p = read('products', []).find((x) => x.id === productId)
    if (!p?.fileUrl) throw new Error('الملف لم يُرفع بعد. أضف رابطه من لوحة التحكم.')
    return p.fileUrl
  },
}
