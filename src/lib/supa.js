// Live backend: Supabase (auth + Postgres + storage). Schema in supabase/schema.sql.
import { createClient } from '@supabase/supabase-js'
import { coverFor } from './cover.js'

// accept the URL with or without a trailing /rest/v1/ (common copy-paste from the dashboard)
const url = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
// A dropped connection (Safari: "TypeError: Load failed") is retried once when repeating the request is harmless:
// reads, updates, deletes and upserts. Order creation (an RPC) is never repeated.
const NET = 'تعذّر الاتصال بالإنترنت، تأكد من الشبكة وحاول مرة ثانية'
async function steadyFetch(input, init = {}) {
  const method = (init.method || 'GET').toUpperCase()
  const prefer = new Headers(init.headers || {}).get('prefer') || ''
  const safe = ['GET', 'HEAD', 'PATCH', 'DELETE'].includes(method) || /merge-duplicates/.test(prefer)
  try { return await fetch(input, init) } catch (e) {
    if (!(e instanceof TypeError) || !safe) throw new Error(NET)
    await new Promise((r) => setTimeout(r, 700))
    try { return await fetch(input, init) } catch { throw new Error(NET) }
  }
}
export const sb = url && key ? createClient(url, key, { global: { fetch: steadyFetch } }) : null

// --- row <-> object mapping (DB is snake_case, UI is camelCase) ---
const product = (r) => r && ({
  id: r.id, name: r.name, price: Number(r.price), salePrice: r.sale_price == null ? null : Number(r.sale_price),
  categoryId: r.category_id, badge: r.badge, featured: r.featured, sort: r.sort,
  summary: r.summary, description: r.description, active: r.active, digital: r.digital, perUnit: r.per_unit,
  createdAt: r.created_at, options: Array.isArray(r.options) ? r.options : undefined,
  image: r.image || coverFor({ id: r.id, categoryId: r.category_id }),
})
const productRow = (p) => ({
  id: p.id, name: p.name, price: p.price, sale_price: p.salePrice || null, category_id: p.categoryId,
  image: !p.image || p.image.startsWith('data:') ? null : p.image, badge: p.badge || null, featured: !!p.featured, sort: p.sort ?? 0, summary: p.summary,
  description: p.description, active: p.active !== false, digital: !!p.digital, per_unit: p.perUnit || null,
  ...(Array.isArray(p.options) ? { options: p.options } : {}), // only once the options column exists (supabase/options.sql)
})
const order = (r) => r && ({
  id: r.id, number: r.number, userId: r.user_id, customer: r.customer, items: r.items || [],
  subtotal: Number(r.subtotal), discount: Number(r.discount), coupon: r.coupon, total: Number(r.total),
  shippingFee: Number(r.shipping_fee || 0), shipping: r.shipping || null,
  status: r.status, notes: r.notes, paymentMethod: r.payment_method, paymentRef: r.payment_ref || null, history: r.history || [], createdAt: r.created_at,
  reviewToken: r.review_token || null, shipment: r.shipment || null,
})
const coupon = (r) => ({ code: r.code, type: r.type, value: Number(r.value), active: r.active, expiresAt: r.expires_at })

function check({ data, error }) { if (error) throw new Error(error.message); return data }

let cachedUser = null
let cachedAccess = null // what the dashboard may open (my_access), set by myAccess()
async function loadProfile(authUser) {
  if (!authUser) return (cachedUser = null)
  const { data, error } = await sb.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
  const prev = cachedUser?.id === authUser.id ? cachedUser : null
  if (error && prev) return prev // a passing network hiccup must not demote the admin
  cachedUser = {
    id: authUser.id, email: authUser.email || '',
    name: data?.name || authUser.user_metadata?.name || '', phone: data?.phone || '',
    role: data?.role || prev?.role || 'customer', createdAt: data?.created_at || authUser.created_at,
  }
  return cachedUser
}

function translateAuthError(msg) {
  if (/Invalid login/i.test(msg)) return 'البريد أو كلمة المرور غير صحيحة'
  if (/already registered/i.test(msg)) return 'هذا البريد مسجّل مسبقاً، سجّلي دخولك بدلاً من ذلك'
  if (/Email not confirmed/i.test(msg)) return 'فعّل بريدك من الرسالة اللي وصلتك ثم سجّلي دخولك'
  if (/Password should be/i.test(msg)) return 'كلمة المرور لازم تكون 6 أحرف على الأقل'
  if (/Error sending|sending (confirmation|recovery|magic)/i.test(msg)) return 'تعذّر إرسال رمز التحقق الحين، حاولي بعد شوي أو تواصلي معنا على واتساب'
  if (/rate limit|too many|security purposes/i.test(msg)) return 'طلبت رموز كثير، انتظر دقيقة وحاول مرة ثانية'
  return msg
}

async function staffCall(method, query = '', body) {
  const { data } = await sb.auth.getSession()
  const r = await fetch('/api/staff' + query, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + data.session?.access_token }, body: body ? JSON.stringify(body) : undefined })
  const out = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(out.error || 'تعذّر الاتصال، حاول مرة ثانية')
  return out
}

// Every service and section has its own pre-built page: after a catalog change the site rebuilds (api/rebuild.js,
// which collapses quick changes into one), so a new service gets its page and an old one returns a real 404.
const republish = () => { supa.rebuildSite().catch(() => {}) }

export const supa = {
  mode: 'live',
  ready: Promise.resolve(),

  async currentUser() {
    const { data } = await sb.auth.getSession()
    return loadProfile(data.session?.user)
  },
  onAuth(fn) {
    let seq = 0, alive = true
    // Supabase asks not to await its own calls inside this callback: do the profile read right after it returns,
    // and only let the newest event win (events can finish out of order).
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      const my = ++seq
      if (event === 'TOKEN_REFRESHED' && cachedUser?.id === session?.user?.id) return
      setTimeout(async () => {
        const u = await loadProfile(session?.user).catch(() => cachedUser)
        if (alive && my === seq) fn(u)
      }, 0)
    })
    return () => { alive = false; data.subscription.unsubscribe() }
  },
  // Sign-in is two steps: the password goes to our server (api/login-start.js), which checks it and emails a code;
  // the browser never gets a password session. Step 2 signs in with that code.
  async loginStart(email, password, captchaToken) {
    const r = await fetch('/api/login-start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password, captchaToken }) })
    const out = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(out.error || 'تعذّر تسجيل الدخول، حاول مرة ثانية')
  },
  async verifyLoginCode(email, code) {
    const { data, error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    if (error) throw new Error('الرمز غير صحيح أو انتهت صلاحيته')
    return loadProfile(data.user)
  },
  async signUp({ name, email, phone, password }, captchaToken) {
    const { data, error } = await sb.auth.signUp({
      email: email.trim(), password, options: { data: { name, phone }, emailRedirectTo: location.origin + '/account', ...(captchaToken ? { captchaToken } : {}) },
    })
    if (error) throw new Error(translateAuthError(error.message))
    // an already-registered email comes back with no identities and no email is sent (Supabase hides it on purpose)
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('هذا البريد مسجّل مسبقاً، سجّلي دخولك أو استخدم «نسيت كلمة المرور؟»')
    // email confirmation on: a code was emailed; the page asks for it
    if (!data.session) return { needsCode: true, email: email.trim() }
    return loadProfile(data.user)
  },
  async verifySignup(email, code) {
    const { data, error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'signup' })
    if (error) throw new Error('الرمز غير صحيح أو انتهت صلاحيته')
    return loadProfile(data.user)
  },
  async resendSignup(email, captchaToken) {
    const { error } = await sb.auth.resend({ type: 'signup', email: email.trim(), options: captchaToken ? { captchaToken } : undefined })
    if (error) throw new Error(translateAuthError(error.message))
  },
  async sendResetCode(email, captchaToken) {
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), captchaToken ? { captchaToken } : undefined)
    if (error) throw new Error(translateAuthError(error.message))
  },
  async resetWithCode(email, code, password) {
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' })
    if (error) throw new Error('الرمز غير صحيح أو انتهت صلاحيته')
    const { data, error: e2 } = await sb.auth.updateUser({ password })
    if (e2) throw new Error(translateAuthError(e2.message))
    return loadProfile(data.user)
  },
  async signOut() { await sb.auth.signOut() },
  async updateProfile(patch) {
    const me = cachedUser; if (!me) throw new Error('سجّلي دخولك أولاً')
    check(await sb.from('profiles').update({ name: patch.name, phone: patch.phone }).eq('id', me.id))
    return loadProfile((await sb.auth.getUser()).data.user)
  },

  async getCategories() { return check(await sb.from('categories').select('*').order('sort')) },
  async getProducts({ includeHidden = false } = {}) {
    let q = sb.from('products').select('*')
    if (!includeHidden) q = q.eq('active', true)
    return check(await q).map(product)
  },
  async getProduct(id) {
    const p = product(check(await sb.from('products').select('*').eq('id', id).maybeSingle()))
    if (p && (cachedUser?.role === 'admin' || cachedAccess?.perms?.includes('products'))) {
      const { data } = await sb.from('product_files').select('path').eq('product_id', id).maybeSingle()
      p.fileUrl = data?.path || ''
    }
    return p
  },
  async saveProduct(p) {
    const row = productRow({ ...p, id: p.id || 'p-' + Date.now().toString(36) })
    check(await sb.from('products').upsert(row))
    if (p.fileUrl !== undefined) check(await sb.rpc('set_product_file', { p_product: row.id, p_path: p.fileUrl || '' }))
    republish()
    return product(row)
  },
  async deleteProduct(id) { check(await sb.from('products').delete().eq('id', id)); republish() },
  async saveCategory(c) {
    check(await sb.from('categories').upsert({ id: c.id || 'c-' + Date.now().toString(36), name: c.name, blurb: c.blurb, icon: c.icon || 'spark', sort: c.sort ?? 99 }))
    republish()
  },
  async deleteCategory(id) {
    const { count } = await sb.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id)
    if (count) throw new Error('انقل منتجات هذا التصنيف أولاً ثم احذفه')
    check(await sb.from('categories').delete().eq('id', id))
    republish()
  },
  // ---------- store designer ----------
  async getSettings() {
    const { data, error } = await sb.from('site_settings').select('data').eq('id', 'main').maybeSingle()
    // a failed read keeps what the page already shows (the snapshot it was built with) instead of the defaults
    if (error) throw new Error(error.message)
    return data?.data || null
  },
  async saveSettings(settings) {
    const { error } = await sb.from('site_settings').upsert({ id: 'main', data: settings, updated_at: new Date().toISOString() })
    if (error) throw new Error(/site_settings|relation|schema cache/i.test(error.message) ? 'شغّل ملف supabase/designer.sql في Supabase أولاً' : error.message)
  },
  /** Rebuilds the pre-rendered pages so search engines and link previews see the new design too. */
  async rebuildSite() {
    const { data } = await sb.auth.getSession()
    const r = await fetch('/api/rebuild', { method: 'POST', headers: { authorization: 'Bearer ' + data.session?.access_token } })
    return r.json().catch(() => ({ ok: false }))
  },
  async uploadImage(file) {
    // images only (SVG is allowed for logos: it is served from the storage domain, not the store), and a sane size
    if (!/^image\/(png|jpeg|webp|gif|avif|svg\+xml)$/.test(file.type)) throw new Error('الصيغ المسموحة: PNG أو JPG أو WebP أو GIF أو SVG')
    if (file.size > 5 * 1024 * 1024) throw new Error('حجم الصورة أكبر من 5 ميجا')
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/svg+xml': 'svg' }[file.type]
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    check(await sb.storage.from('products').upload(path, file, { upsert: false, contentType: file.type }))
    return sb.storage.from('products').getPublicUrl(path).data.publicUrl
  },

  // Prices are recomputed in the database (place_order) — the browser never sets the total.
  // The shipping fee too (site_settings shipping), so the address is all the browser sends.
  async createOrder({ items, customer, shipping, notes, coupon: code, paymentMethod }) {
    const id = check(await sb.rpc('place_order', {
      p_items: items.map((i) => ({ product_id: i.productId, qty: i.qty, note: String(i.note || '').slice(0, 1000), options: i.optionKeys || [] })),
      p_customer: customer, p_shipping: shipping, p_notes: notes || '', p_coupon: code || null, p_payment_method: paymentMethod,
    }))
    return order(check(await sb.from('orders').select('*').eq('id', id).single()))
  },
  async myOrders() {
    const me = cachedUser; if (!me) throw new Error('سجّلي دخولك أولاً')
    return check(await sb.from('orders').select('*').eq('user_id', me.id).order('created_at', { ascending: false })).map(order)
  },
  async getOrder(id) { return order(check(await sb.from('orders').select('*').eq('id', id).maybeSingle())) },
  async adminReport(from, to) { return check(await sb.rpc('admin_report', { p_from: from, p_to: to })) },
  async allOrders() { return check(await sb.from('orders').select('*').order('created_at', { ascending: false })).map(order) },
  async updateOrderStatus(id, status, note) {
    check(await sb.rpc('set_order_status', { p_order: id, p_status: status, p_note: note || '' }))
  },

  async getWishlist() {
    const me = cachedUser
    if (!me) { try { return JSON.parse(localStorage.getItem('mimi:wish:guest') || '[]') } catch { return [] } }
    return check(await sb.from('wishlists').select('product_id').eq('user_id', me.id)).map((r) => r.product_id)
  },
  async setWishlist(ids) {
    const me = cachedUser
    if (!me) { try { localStorage.setItem('mimi:wish:guest', JSON.stringify(ids)) } catch { /* ignore */ } return }
    check(await sb.from('wishlists').delete().eq('user_id', me.id))
    if (ids.length) check(await sb.from('wishlists').insert(ids.map((product_id) => ({ user_id: me.id, product_id }))))
  },

  async listCustomers() { return check(await sb.rpc('admin_customers')) },
  async addCustomer(c) { return (await staffCall('POST', '?kind=customer', c)).customer },
  async deleteCustomer(id) { await staffCall('DELETE', '?kind=customer&id=' + encodeURIComponent(id)) },
  // a new order from the dashboard: prices of store services are taken by the database, like checkout
  async adminCreateOrder({ userId, items, status, notes, discount }) {
    const id = check(await sb.rpc('admin_create_order', { p_user: userId, p_items: items, p_status: status, p_notes: notes || '', p_discount: Number(discount) || 0 }))
    return order(check(await sb.from('orders').select('*').eq('id', id).single()))
  },
  async deleteOrder(id) { check(await sb.rpc('owner_delete_order', { p_order: id })) },
  // design backups (owner only)
  async designVersions() { return check(await sb.rpc('owner_design_versions')).map((v) => ({ id: v.id, at: v.at, by: v.by_email, note: v.note, current: v.current })) },
  async restoreDesign(id) { check(await sb.rpc('owner_restore_design', { p_id: id })) },
  async listCoupons() { return check(await sb.from('coupons').select('*')).map(coupon) },
  async saveCoupon(c) {
    check(await sb.from('coupons').upsert({ code: c.code.toUpperCase(), type: c.type, value: c.value, active: c.active, expires_at: c.expiresAt || null }))
  },
  async deleteCoupon(code) { check(await sb.from('coupons').delete().eq('code', code)) },
  async validateCoupon(code) {
    const r = check(await sb.rpc('check_coupon', { p_code: code.trim().toUpperCase() }))
    if (!r) throw new Error('الكود غير صالح أو منتهي')
    return coupon(r)
  },

  // Card / Apple Pay / mada through Tap — the charge is created server-side (api/tap-charge.js).
  async startPayment(o, token) {
    const { data } = await sb.auth.getSession()
    const res = await fetch('/api/tap-charge', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + data.session?.access_token },
      body: JSON.stringify({ orderId: o.id, ...(token ? { token } : {}) }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'تعذّر بدء الدفع، حاول مرة ثانية')
    return { redirect: body.url, free: !!body.free, paid: !!body.paid, order: o }
  },
  async downloadUrl(orderId, productId) {
    const { data } = await sb.auth.getSession()
    const res = await fetch(`/api/download?order=${encodeURIComponent(orderId)}&product=${encodeURIComponent(productId)}`, {
      headers: { authorization: 'Bearer ' + data.session?.access_token },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'تعذّر التحميل')
    return body.url
  },
  // ---- reviews and questions (supabase/reviews-2026-10.sql) ----
  async getFeedback() {
    const { data, error } = await sb.rpc('public_feedback')
    return error || !data ? { reviews: [], questions: [] } : { reviews: data.reviews || [], questions: data.questions || [] } // no function yet before the SQL runs
  },
  async reviewForm(orderId, token) {
    if (!/^[0-9a-f-]{36}$/i.test(orderId || '') || !/^[0-9a-f-]{36}$/i.test(token || '')) return { ok: false, reason: 'not-found' }
    const { data, error } = await sb.rpc('review_form', { p_order: orderId, p_token: token })
    return error || !data ? { ok: false, reason: 'not-found' } : data
  },
  async submitReview({ orderId, token, name, service, store, text }) {
    const status = check(await sb.rpc('submit_review', { p_order: orderId, p_token: token, p_name: name || '', p_service: service, p_store: store, p_body: text || '' }))
    // published on its own: rebuild so the pre-rendered pages carry it too (the server checks the token and the time)
    if (status === 'published') fetch('/api/rebuild', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ order: orderId, token }) }).catch(() => {})
    return status
  },
  async askQuestion({ productId, name, contact, question }) {
    check(await sb.rpc('ask_question', { p_product: productId, p_name: name || '', p_contact: contact || '', p_question: question || '' }))
  },
  async listReviews() {
    return check(await sb.from('reviews').select('*').order('created_at', { ascending: false })).map((r) => ({
      id: r.id, orderId: r.order_id, products: r.products || [], name: r.name, service: r.service_rating, store: r.store_rating, text: r.body, status: r.status, createdAt: r.created_at,
    }))
  },
  async setReviewStatus(id, status) {
    check(await sb.from('reviews').update({ status, ...(status === 'published' && { published_at: new Date().toISOString() }) }).eq('id', id)); republish()
  },
  async deleteReview(id) { check(await sb.from('reviews').delete().eq('id', id)); republish() },
  async listQuestions() {
    return check(await sb.from('questions').select('*').order('created_at', { ascending: false })).map((q) => ({
      id: q.id, productId: q.product_id, name: q.name, contact: q.contact, question: q.question, answer: q.answer, status: q.status, createdAt: q.created_at,
    }))
  },
  async saveQuestion(id, { answer, status }) {
    const a = String(answer || '').trim()
    if (status === 'published' && !a) throw new Error('اكتب الجواب قبل النشر')
    check(await sb.from('questions').update({ answer: a, status, ...(a && { answered_at: new Date().toISOString() }) }).eq('id', id)); republish()
  },
  async deleteQuestion(id) { check(await sb.from('questions').delete().eq('id', id)); republish() },

  // ---- the team (staff and permissions) ----
  async myAccess() {
    const { data, error } = await sb.rpc('my_access')
    // before supabase/staff-2026-10.sql runs, the owner still gets everything
    cachedAccess = !error && data ? data : cachedUser?.role === 'admin' ? { owner: true, role: 'المالك', perms: ['orders', 'reports', 'products', 'categories', 'customers', 'coupons', 'design', 'reviews', 'team'], strong: true } : { owner: false, role: '', perms: [], strong: true }
    return cachedAccess
  },
  async listStaff() { return (await staffCall('GET')).staff },
  async saveStaff(member) { return staffCall('POST', '', member) },
  async removeStaff(email) { return staffCall('DELETE', '?email=' + encodeURIComponent(email)) },
  // emails for an order moment (server checks who may send what, and sends each one once)
  async notifyOrder(orderId, event) {
    const { data } = await sb.auth.getSession()
    await fetch('/api/order-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + data.session?.access_token },
      body: JSON.stringify({ orderId, event }),
    }).catch(() => {})
  },
  async testOrderNotice() {
    const { data } = await sb.auth.getSession()
    const r = await fetch('/api/order-email', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + data.session?.access_token }, body: JSON.stringify({ test: true }) })
    return r.json().catch(() => ({ sent: false, reason: 'server' }))
  },
  // the shipping waybill through OTO (api/invoice.js ?op=ship|awb)
  async createShipment(orderId, weight, count) {
    const { data } = await sb.auth.getSession()
    const r = await fetch('/api/invoice?op=ship', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + data.session?.access_token }, body: JSON.stringify({ orderId, weight, count }) })
    const b = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(b.error || 'تعذّر إنشاء البوليصة')
    return b
  },
  async shipmentLabel(orderId) {
    const { data } = await sb.auth.getSession()
    const r = await fetch(`/api/invoice?op=awb&order=${encodeURIComponent(orderId)}`, { headers: { authorization: 'Bearer ' + data.session?.access_token } })
    const b = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(b.error || 'تعذّر جلب البوليصة')
    return b.shipment
  },
  async downloadInvoice(order) {
    const { data } = await sb.auth.getSession()
    const res = await fetch(`/api/invoice?order=${encodeURIComponent(order.id)}`, { headers: { authorization: 'Bearer ' + data.session?.access_token } })
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'تعذّر تجهيز الفاتورة') }
    const url = URL.createObjectURL(await res.blob())
    const a = Object.assign(document.createElement('a'), { href: url, download: `فاتورة-${order.number}.pdf` })
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000)
  },
  async verifyPayment(orderId, tapId) {
    const res = await fetch(`/api/tap-verify?order=${encodeURIComponent(orderId)}&tap_id=${encodeURIComponent(tapId)}`)
    return res.json().catch(() => ({}))
  },
}
