// Dashboard areas and the ready-made roles for staff (لوحة التحكم ← الفريق والصلاحيات).
// The same area keys live in supabase/staff-2026-10.sql and api/_shared.js PERMS.
export const AREAS = [
  { key: 'orders', label: 'الطلبات', hint: 'يشوف الطلبات ويغيّر حالتها ويطلع الفواتير' },
  { key: 'reports', label: 'التقارير', hint: 'المبيعات والزيارات ومصادرها' },
  { key: 'products', label: 'المنتجات', hint: 'يضيف ويعدّل المنتجات وصورها' },
  { key: 'categories', label: 'التصنيفات', hint: 'يرتّب أقسام المتجر' },
  { key: 'customers', label: 'العملاء', hint: 'أسماء العملاء وأرقامهم ومشترياتهم' },
  { key: 'coupons', label: 'كوبونات الخصم', hint: 'ينشئ ويوقف أكواد الخصم' },
  { key: 'design', label: 'مصمم المتجر', hint: 'الألوان والشعار والواجهة' },
  { key: 'reviews', label: 'التقييمات والأسئلة', hint: 'ينشر التقييمات ويحذفها ويرد على الأسئلة' },
]
export const AREA_LABEL = Object.fromEntries(AREAS.map((a) => [a.key, a.label]))

export const ROLES = [
  { name: 'مدير عام', perms: AREAS.map((a) => a.key) },
  { name: 'مصمم', perms: ['products', 'categories', 'design'] },
  { name: 'مسؤول الطلبات', perms: ['orders', 'customers', 'reviews'] },
  { name: 'مسوّق', perms: ['coupons', 'reports', 'products'] },
]

// which area each dashboard page belongs to ('' = always open, 'team' = owner only)
export function areaOf(pathname) {
  const p = pathname.replace(/^\/admin\/?/, '').split('/')[0]
  return { '': 'overview', orders: 'orders', reports: 'reports', products: 'products', categories: 'categories', customers: 'customers', coupons: 'coupons', design: 'design', feedback: 'reviews', team: 'team' }[p] ?? ''
}
// the overview is built from the orders, so it opens with that area
export const can = (access, area) => !!access && (access.owner || area === '' || (area === 'overview' ? access.perms.includes('orders') : access.perms.includes(area)))
