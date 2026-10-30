// Store designer: the owner's look-and-feel settings (logo, colours, background, header, footer and the home page
// as an ordered list of blocks). Saved as one JSON row (site_settings, id 'main'), baked into the pre-rendered
// pages and applied live. Every value is checked here before it reaches the page.

export const DEFAULT_SETTINGS = {
  logo: '/logo-300.png', // on light backgrounds (header after scrolling, menus)
  logoLight: '/logo-white.png', // on dark backgrounds (hero, footer)
  logoScale: 100, // percent
  colors: { primary: '#7d3f4c', accent: '#e7c2bb', background: '#fbf6f4' },
  announcement: { on: false, text: '', link: '' },
}


// ---------- store identity, fonts, corners ----------
export const DEFAULT_STORE = {
  name: 'عناية ميمي', nameEn: 'Mimi Care', description: '', whatsapp: '966502953556', email: '',
  social: { instagram: '', x: '', tiktok: '', snapchat: '' },
}
export const FONTS = {
  heading: [['almarai', 'المراعي (الأصلي)', "'Almarai'"], ['elmessiri', 'المسيري', "'El Messiri'"], ['reemkufi', 'ريم كوفي', "'Reem Kufi'"], ['marhey', 'مرحي', "'Marhey'"], ['plex', 'آي بي إم بلكس', "'IBM Plex Sans Arabic'"], ['cairo', 'القاهرة', "'Cairo'"]],
  body: [['plex', 'آي بي إم بلكس (الأصلي)', "'IBM Plex Sans Arabic'"], ['tajawal', 'تجوال', "'Tajawal'"], ['almarai', 'المراعي', "'Almarai'"], ['cairo', 'القاهرة', "'Cairo'"]],
}
export const RADII = [['round', 'ناعمة (الأصلي)'], ['soft', 'أقل نعومة'], ['sharp', 'حادة']]
/** 05xxxxxxxx, 5xxxxxxxx, +9665xxxxxxxx → 9665xxxxxxxx (international, digits only). */
export const normPhone = (v) => { const d = String(v || '').replace(/\D/g, ''); return d.startsWith('05') ? '966' + d.slice(1) : d.startsWith('5') && d.length === 9 ? '966' + d : d }

// ---------- home page blocks ----------
// Each block type: a name, an icon (lucide name, for the designer) and its fields. Field kinds:
// text · textarea · link · image · switch · select · number · category · product · products · items
export const ICONS = ['truck', 'shield', 'chat', 'leaf', 'drop', 'gift'] // the line drawings in LineArt
export const BLOCKS = {
  hero: { name: 'الواجهة الرئيسية', icon: 'Sparkles', hint: 'البانر الأول في الواجهة: صورة عريضة وعليها العنوان والوصف والزر (يتبعه بانرا الأقسام).', fields: [
    ['eyebrow', 'سطر صغير فوق العنوان', 'text', 60], ['title1', 'العنوان', 'text', 40], ['title2', 'السطر الثاني', 'text', 60],
    ['text', 'الوصف', 'textarea', 220], ['cta', 'نص الزر', 'text', 30], ['ctaLink', 'رابط الزر', 'link'],
    ['image', 'صورة البانر (كمبيوتر)', 'image'], ['imageMobile', 'صورة البانر (جوال)', 'image'],
  ] },
  shelf: { name: 'قسم بالبانر', icon: 'PanelTop', hint: 'بانر القسم وتحته منتجاته في إطار واحد.', fields: [
    ['category', 'القسم', 'category'], ['title', 'عنوان البانر', 'text', 50], ['text', 'الكلام التسويقي', 'textarea', 160], ['cta', 'نص الزر', 'text', 30],
    ['image', 'صورة البانر (اختياري)', 'image'], ['limit', 'عدد المنتجات', 'number', [1, 12]],
  ] },
  banner: { name: 'بانر صورة', icon: 'Image', hint: 'صورة إعلانية بعرض الصفحة أو داخل إطار، ولها رابط.', fields: [
    ['image', 'الصورة (كمبيوتر)', 'image'], ['imageMobile', 'الصورة (جوال، اختياري)', 'image'], ['link', 'الرابط (اختياري)', 'link'], ['alt', 'وصف الصورة (لقوقل)', 'text', 120],
    ['size', 'العرض', 'select', [['container', 'داخل إطار'], ['full', 'بعرض الشاشة']]],
  ] },
  promises: { name: 'مميزات المتجر', icon: 'BadgeCheck', hint: 'ثلاث نقاط قصيرة مع رسومات.', fields: [['items', 'المميزات', 'items']] },
  products: { name: 'منتجات', icon: 'LayoutGrid', hint: 'رف منتجات: من قسم، أو تختارها بنفسك، أو الأحدث.', fields: [
    ['title', 'العنوان', 'text', 60],
    ['source', 'المنتجات', 'select', [['category', 'من قسم'], ['picked', 'أختارها بنفسي'], ['latest', 'الأحدث'], ['featured', 'المميزة']]],
    ['category', 'القسم', 'category'], ['ids', 'اختر المنتجات', 'products'], ['limit', 'عدد المنتجات', 'number', [2, 12]], ['viewAll', 'زر «عرض الكل»', 'switch'],
  ] },
  categories: { name: 'أقسام المتجر', icon: 'Shapes', hint: 'دوائر الأقسام بصورها، توديك لكل قسم.', fields: [['title', 'العنوان', 'text', 60]] },
  imageText: { name: 'بانر مدموج', icon: 'PanelLeft', hint: 'صورة تذوب في خلفية المتجر وبجانبها عنوان ووصف وزر.', fields: [
    ['kicker', 'سطر صغير', 'text', 60], ['title', 'العنوان', 'text', 60], ['accent', 'سطر ثاني للعنوان', 'text', 60], ['text', 'الوصف', 'textarea', 260],
    ['cta', 'نص الزر', 'text', 30], ['link', 'الرابط', 'link'], ['image', 'الصورة', 'image'], ['priceOf', 'إظهار سعر منتج (اختياري)', 'product'], ['payIcons', 'إظهار شعارات الدفع', 'switch'],
  ] },
  text: { name: 'نص حر', icon: 'Type', hint: 'عنوان وفقرة، مع زر اختياري.', fields: [
    ['title', 'العنوان', 'text', 80], ['text', 'النص', 'textarea', 900],
    ['cta', 'نص الزر (اختياري)', 'text', 30], ['link', 'رابط الزر', 'link'], ['align', 'المحاذاة', 'select', [['center', 'وسط'], ['start', 'يمين']]],
  ] },
  reviews: { name: 'آراء العملاء', icon: 'MessageSquareQuote', hint: 'تقييمات العملاء تتحرك في صفين.', fields: [['title', 'العنوان', 'text', 60]] },
  journey: { name: 'خطوات الطلب', icon: 'Truck', hint: 'من الطلب لباب البيت، على شكل إيصال.', fields: [['title', 'العنوان', 'text', 40], ['text', 'الوصف', 'textarea', 160]] },
  faq: { name: 'الأسئلة الشائعة', icon: 'CircleHelp', hint: 'أسئلة تتكرر مع إجاباتها.', fields: [['title', 'العنوان', 'text', 60]] },
}

const HERO = {
  eyebrow: 'عناية ميمي', title1: 'دلّعي شعرك وبشرتك', title2: 'بخلطات العناية اللي تحبينها',
  text: 'صابونيات تقليدية وزيت للشعر، مختارة بعناية لروتينك، وتوصلك لباب بيتك.',
  cta: 'تسوّقي الآن', ctaLink: '#hair', image: '', imageMobile: '',
}
/** What a freshly added block starts with. */
export const BLOCK_DEFAULTS = {
  hero: HERO,
  banner: { image: '', imageMobile: '', link: '', alt: '', size: 'container' },
  promises: { items: [{ icon: 'truck', title: 'شحن لباب بيتك', text: 'وتتابعين طلبك من حسابك' }, { icon: 'shield', title: 'دفع آمن', text: 'مدى، فيزا، ماستركارد وApple Pay' }, { icon: 'chat', title: 'خدمة العملاء', text: 'نرد عليك على واتساب' }] },
  products: { title: 'منتجاتنا', source: 'latest', category: '', ids: [], limit: 4, viewAll: true },
  categories: { title: 'تسوّقي حسب القسم' },
  shelf: { category: '', title: '', text: '', cta: 'تسوّقي الآن', image: '', limit: 8 },
  imageText: { kicker: '', title: 'عنوان جذاب', accent: '', text: '', cta: 'اطلبي الحين', link: '/shop', image: '', priceOf: '', payIcons: false },
  text: { title: 'عنوان القسم', text: 'اكتب هنا النص اللي تبيه يظهر لعملائك.', cta: '', link: '', align: 'center' },
  reviews: { title: 'آراء العميلات' },
  faq: { title: 'قبل ما تطلبين' },
  journey: { title: 'من طلبك لباب بيتك', text: 'أربع خطوات سهلة، ويوصلك إيميل مع كل تحديث على طلبك.' },
}

/** The home page as it was designed (used until the owner saves their own). */
export const defaultHome = (hero = {}) => [
  { id: 'hero', type: 'hero', on: true, ...HERO, ...hero },
  { id: 'categories', type: 'categories', on: true, ...BLOCK_DEFAULTS.categories },
  { id: 'hair', type: 'shelf', on: true, ...BLOCK_DEFAULTS.shelf, category: 'hair-care', title: 'العناية بالشعر', text: 'زيت للشعر تستخدمينه ثلاث مرات بالأسبوع على فروة الشعر وأطرافه.' },
  { id: 'skin', type: 'shelf', on: true, ...BLOCK_DEFAULTS.shelf, category: 'skin-care', title: 'العناية بالبشرة', text: 'صابونيات الكركم والعكر الفارسي والنيلة المغربية لروتين بشرتك.' },
  { id: 'journey', type: 'journey', on: true, ...BLOCK_DEFAULTS.journey },
  { id: 'reviews', type: 'reviews', on: true, ...BLOCK_DEFAULTS.reviews },
  { id: 'faq', type: 'faq', on: true, ...BLOCK_DEFAULTS.faq },
]

const SLUG = /^[\w؀-ۿ-]{1,80}$/ // product / category ids
function cleanBlock(b) {
  if (!b || typeof b !== 'object' || !BLOCKS[b.type]) return null
  const def = BLOCK_DEFAULTS[b.type]
  const out = { id: typeof b.id === 'string' && /^[\w-]{1,40}$/.test(b.id) ? b.id : 'b' + Math.random().toString(36).slice(2, 8), type: b.type, on: b.on !== false }
  for (const [key, , kind, opt] of BLOCKS[b.type].fields) {
    const v = b[key], d = def[key]
    if (kind === 'text' || kind === 'textarea') out[key] = text(v, d, opt)
    else if (kind === 'link') out[key] = safeLink(v, typeof v === 'string' && !v.trim() ? '' : d)
    else if (kind === 'image') out[key] = safeUrl(v, '')
    else if (kind === 'switch') out[key] = typeof v === 'boolean' ? v : !!d
    else if (kind === 'select') out[key] = opt.some(([x]) => x === v) ? v : d
    else if (kind === 'number') out[key] = Math.min(opt[1], Math.max(opt[0], Math.round(Number(v)) || d))
    else if (kind === 'category' || kind === 'product') out[key] = typeof v === 'string' && (v === '' || SLUG.test(v)) ? v : d
    else if (kind === 'products') out[key] = Array.isArray(v) ? v.filter((x) => typeof x === 'string' && SLUG.test(x)).slice(0, 12) : d
    else if (kind === 'items') out[key] = Array.isArray(v) ? v.slice(0, 4).map((x) => ({ icon: ICONS.includes(x?.icon) ? x.icon : 'store', title: text(x?.title, '', 40), text: text(x?.text, '', 60) })) : d
  }
  if (typeof b.viewAllTo === 'string') out.viewAllTo = safeLink(b.viewAllTo, '')
  return out
}

export const DEFAULT_HEADER_LINKS = [{ label: 'كل المنتجات', to: '/shop' }, { label: 'العناية بالشعر', to: '/hair-care' }, { label: 'العناية بالبشرة', to: '/skin-care' }, { label: 'تواصلي معنا', to: '/contact' }]
export const DEFAULT_FOOTER_LINKS = [{ label: 'كل المنتجات', to: '/shop' }, { label: 'العناية بالشعر', to: '/hair-care' }, { label: 'العناية بالبشرة', to: '/skin-care' }, { label: 'السياسات والشروط', to: '/policies' }]
/** Shipping: one fee per order (place_order in the database charges the same); freeOver 0 = never free. */
export const DEFAULT_SHIPPING = { fee: 35, freeOver: 0 }
export const shippingFor = (shipping, subtotal) => (shipping.freeOver > 0 && subtotal >= shipping.freeOver ? 0 : shipping.fee)
export const DEFAULT_CTA = ['محتارة وش يناسبك؟', 'كلمينا على واتساب ونساعدك تختارين.']
export const DEFAULT_ABOUT = 'في عناية ميمي رجّعنا لك خلطات الجدات بلمسة اليوم: صابونيات تقليدية بالكركم والعكر الفارسي والنيلة المغربية، وزيت يدلّع شعرك. لحظة عناية تستاهلينها، توصلك لين باب بيتك.'

/** Ready-made palettes the owner can start from. */
export const PRESETS = [
  { name: 'وردي ناعم (الأصلي)', primary: '#7d3f4c', accent: '#e7c2bb', background: '#fbf6f4' },
  { name: 'عنابي غامق', primary: '#4a1d28', accent: '#c99a92', background: '#efe6e3' },
  { name: 'كحلي', primary: '#1b2b44', accent: '#c3cedd', background: '#fbfcfe' },
  { name: 'أسود وذهبي', primary: '#161616', accent: '#d4b06a', background: '#fbf9f5' },
  { name: 'أخضر زيتي', primary: '#1f3b2d', accent: '#c9b37e', background: '#f8f7f2' },
  { name: 'عنابي', primary: '#4a1626', accent: '#e2c2a4', background: '#fdf9f7' },
  { name: 'بنفسجي', primary: '#2d1f4f', accent: '#c7b8ec', background: '#faf9fe' },
  { name: 'بني قهوة', primary: '#3b2a20', accent: '#d9b98f', background: '#fbf8f4' },
]

const HEX = /^#[0-9a-f]{6}$/i
const safeColor = (v, d) => (typeof v === 'string' && HEX.test(v.trim()) ? v.trim().toLowerCase() : d)
// images and links: our own paths or https only (the values end up in src/href attributes)
// Addresses from the dashboard end up in links, <img src>, CSS url() and the prerendered HTML:
// only same-site paths ("/x", never "//x" or "/\\x") and https:// URLs, with no spaces, quotes, angle brackets or backslashes.
const URL_OK = /^(?:\/(?![\/\\])|https:\/\/[^\/\\\s])[^\s"'<>`\\]*$/i
const safeUrl = (v, d = '') => {
  const t = typeof v === 'string' ? v.trim() : ''
  return t && (URL_OK.test(t) || /^data:image\/(png|jpe?g|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(t)) ? t : d
}
const safeLink = (v, d = '') => {
  const t = typeof v === 'string' ? v.trim() : ''
  return t && URL_OK.test(t) ? t : d
}
const text = (v, d, max = 160) => (typeof v === 'string' ? v.slice(0, max) : d)

/** Saved settings on top of the defaults, every value checked. */
export function mergeSettings(raw) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const D = DEFAULT_SETTINGS
  const c = s.colors || {}, a = s.announcement || {}, h = s.hero || {}
  return {
    logo: safeUrl(s.logo, D.logo) || D.logo,
    logoLight: safeUrl(s.logoLight, D.logoLight) || D.logoLight,
    logoScale: Math.min(160, Math.max(60, Number(s.logoScale) || D.logoScale)),
    colors: { primary: safeColor(c.primary, D.colors.primary), accent: safeColor(c.accent, D.colors.accent), background: safeColor(c.background, D.colors.background) },
    announcement: { on: !!a.on && !!String(a.text || '').trim(), text: text(a.text, '', 140), link: safeLink(a.link) },
    // the first designer kept the hero on its own; it now lives in the home blocks
    home: (Array.isArray(s.home) ? s.home : defaultHome(typeof s.hero === 'object' ? s.hero : {})).slice(0, 30).map(cleanBlock).filter(Boolean),
    background: { image: safeUrl(s.background?.image, ''), decor: s.background?.decor !== false },
    header: {
      links: Array.isArray(s.header?.links) ? s.header.links.slice(0, 6).map((l) => ({ label: text(l?.label, '', 24), to: safeLink(l?.to, '') })).filter((l) => l.label && l.to) : DEFAULT_HEADER_LINKS,
      search: s.header?.search !== false, wishlist: s.header?.wishlist !== false,
    },
    store: {
      name: text(s.store?.name, DEFAULT_STORE.name, 40).trim() || DEFAULT_STORE.name,
      nameEn: text(s.store?.nameEn, DEFAULT_STORE.nameEn, 40).trim(),
      description: text(s.store?.description, '', 300).trim(), // empty: the built-in SEO description
      whatsapp: /^\d{9,15}$/.test(normPhone(s.store?.whatsapp)) ? normPhone(s.store.whatsapp) : DEFAULT_STORE.whatsapp,
      email: typeof s.store?.email === 'string' && /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(s.store.email.trim()) ? s.store.email.trim() : DEFAULT_STORE.email,
      social: Object.fromEntries(Object.keys(DEFAULT_STORE.social).map((k) => [k, /^https:\/\//i.test(s.store?.social?.[k] || '') ? safeLink(s.store.social[k], '') : ''])),
    },
    fonts: {
      heading: FONTS.heading.some(([k]) => k === s.fonts?.heading) ? s.fonts.heading : 'almarai',
      body: FONTS.body.some(([k]) => k === s.fonts?.body) ? s.fonts.body : 'plex',
    },
    radius: RADII.some(([k]) => k === s.radius) ? s.radius : 'round',
    categoryImages: Object.fromEntries(Object.entries(s.categoryImages && typeof s.categoryImages === 'object' ? s.categoryImages : {}).filter(([k, v]) => SLUG.test(k) && safeUrl(v, '')).slice(0, 40)),
    shipping: {
      fee: Math.min(500, Math.max(0, Math.round((Number(s.shipping?.fee ?? DEFAULT_SHIPPING.fee) || 0) * 100) / 100)),
      freeOver: Math.min(100000, Math.max(0, Math.round(Number(s.shipping?.freeOver) || 0))),
    },
    footer: {
      links: Array.isArray(s.footer?.links) ? s.footer.links.slice(0, 8).map((l) => ({ label: text(l?.label, '', 30), to: safeLink(l?.to, '') })).filter((l) => l.label && l.to) : null,
      about: text(s.footer?.about, DEFAULT_ABOUT, 200), payments: s.footer?.payments !== false,
      cta: s.footer?.cta !== false, ctaTitle: text(s.footer?.ctaTitle, DEFAULT_CTA[0], 60) || DEFAULT_CTA[0], ctaText: text(s.footer?.ctaText, DEFAULT_CTA[1], 140),
    },
  }
}

// --- colour maths (sRGB mixing is enough for tints and shades) ---
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const hex = (c) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)) }
const lum = (h) => { const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }

/** CSS that re-tints the design tokens (src/styles/tokens.css). Empty for the original palette. */
export function themeCss(settings) {
  const s = mergeSettings(settings)
  const D = DEFAULT_SETTINGS.colors
  const { primary: P, accent: A, background: B } = s.colors
  const v = []
  if (P !== D.primary) {
    v.push(['--p-green-950', mix(P, '#000000', 0.42)], ['--p-green-900', P], ['--p-green-800', mix(P, '#ffffff', 0.08)], ['--p-green-700', mix(P, '#ffffff', 0.18)],
      ['--p-green-600', mix(P, '#ffffff', 0.3)], ['--p-green-200', mix(P, '#ffffff', 0.78)], ['--p-green-100', mix(P, '#ffffff', 0.88)], ['--p-green-50', mix(P, '#ffffff', 0.94)],
      ['--p-ink-900', mix(P, '#000000', 0.42)], ['--p-ink-600', mix(P, '#6b7280', 0.6)])
  }
  if (A !== D.accent || P !== D.primary) {
    // accent text must stay readable on the light background
    let t = 0.55, txt = mix(A, P, t)
    while (contrast(txt, B) < 4.6 && t < 0.95) { t += 0.05; txt = mix(A, P, t) }
    v.push(['--p-gold-700', txt], ['--p-gold-600', mix(A, P, 0.4)], ['--p-gold-500', mix(A, P, 0.18)], ['--p-gold-400', A], ['--p-gold-200', mix(A, '#ffffff', 0.45)], ['--p-gold-100', mix(A, '#ffffff', 0.7)])
  }
  if (B !== D.background || P !== D.primary) {
    v.push(['--p-cream-50', B], ['--p-cream-100', mix(B, P, 0.035)], ['--p-cream-200', mix(B, P, 0.1)], ['--p-cream-300', mix(B, P, 0.16)])
  }
  if (s.logoScale !== 100) v.push(['--logo-scale', String(s.logoScale / 100)])
  const fam = (list, k) => list.find(([x]) => x === k)[2]
  if (s.fonts.heading !== 'almarai') v.push(['--p-font-script', `${fam(FONTS.heading, s.fonts.heading)}, 'IBM Plex Sans Arabic', sans-serif`])
  if (s.fonts.body !== 'plex') { const f = `${fam(FONTS.body, s.fonts.body)}, 'IBM Plex Sans Arabic', system-ui, sans-serif`; v.push(['--p-font-text', f], ['--p-font-display', f]) }
  if (s.radius === 'soft') v.push(['--p-radius-pill', '14px'], ['--p-radius-lg', '14px'], ['--p-radius-xl', '18px'])
  if (s.radius === 'sharp') v.push(['--p-radius-pill', '6px'], ['--p-radius-lg', '6px'], ['--p-radius-xl', '8px'], ['--p-radius-md', '6px'], ['--p-radius-sm', '4px'])
  let css = v.length ? `:root{${v.map(([k, x]) => `${k}:${x}`).join(';')}}` : ''
  // corners: buttons, fields and cards follow the owner's choice (dots and avatars stay round)
  if (s.radius !== 'round') {
    const [btn, card] = s.radius === 'soft' ? ['12px', '16px'] : ['4px', '6px']
    css += `:is(a,button,input,select,textarea,label).rounded-full{border-radius:${btn}!important}:is(.rounded-xl,.rounded-lg,.rounded-2xl,[class*="rounded-[18px]"],[class*="rounded-[20px]"],[class*="rounded-[34px]"]){border-radius:${card}!important}`
  }
  // a background picture behind the whole store (characters that could end the url() are escaped)
  if (s.background.image) css += `body{background-image:url("${s.background.image.replace(/["'\\\n\r()<>]/g, encodeURIComponent)}");background-size:cover;background-position:center;background-attachment:fixed}`
  return css
}
