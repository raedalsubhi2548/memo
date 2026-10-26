import { fromSlug, toSlug, productPath } from './slug.js'
import { SERVICE_FAQ } from '../data/serviceFaq.js'
import { SERVICE_RATINGS } from '../data/reviews.js'
import { serviceScore } from './feedback.js'
// One source of truth for titles, descriptions, canonical links, social cards and structured
// data. Used at runtime (useSeo) and at build time (scripts/prerender.mjs) so crawlers that do
// not run JavaScript still get the full head for every public page.

// The store's WhatsApp, same as src/lib/format.js (the owner can change it in the store designer)
const WA = '966502953556'
export const WA_LOCAL = '0' + WA.replace(/^966/, '')

const env = (k) => (typeof process !== 'undefined' && process.env?.[k]) || ''
// One home for search engines: every canonical, sitemap entry and social card points at the store's own domain.
const SITE_URL = (env('SITE_URL') || env('VITE_SITE_URL') || (env('VERCEL_PROJECT_PRODUCTION_URL') && 'https://' + env('VERCEL_PROJECT_PRODUCTION_URL')) || (typeof location !== 'undefined' ? location.origin : '')).replace(/\/$/, '')

export const SITE = {
  name: 'عناية ميمي',
  nameEn: 'Mimi Care',
  url: SITE_URL,
  phone: '+' + WA,
  email: '',
  sameAs: [],
  logo: '/logo.png',
  ogImage: '/og.jpg',
  tagline: 'صابونيات تقليدية وزيت للشعر',
  keywords: 'عناية ميمي، صابونية الكركم، صابونية العكر الفارسي، صابونية النيلة المغربية، زيت الشعر، صابونيات، العناية بالبشرة، العناية بالشعر',
  description: 'عناية ميمي: صابونية الكركم، صابونية العكر الفارسي، صابونية النيلة المغربية وزيت الشعر. اطلبيها أونلاين وتوصلك لباب بيتك.',
}

const CAT_ART = { 'hair-care': '/brand/cat-hair-care.webp', 'skin-care': '/brand/cat-skin-care.webp' }

// Search titles/descriptions per section and product (blank = built from the catalog).
const SEO_CAT = {
  'hair-care': ['العناية بالشعر: زيت الشعر', 'زيت الشعر من عناية ميمي: يُستخدم ثلاث مرات بالأسبوع على فروة الشعر وأطرافه. اطلبيه أونلاين وتوصلك لباب بيتك.'],
  'skin-care': ['العناية بالبشرة: صابونيات تقليدية', 'صابونية الكركم وصابونية العكر الفارسي وصابونية النيلة المغربية من عناية ميمي، لروتين استحمام يدلّع بشرتك.'],
}
// The page heading (H1) of a product or section, when it should differ from its name.
export const SEO_H1 = {}
const SEO_PRODUCT = {}

const abs = (p) => (p?.startsWith('http') ? p : SITE.url.replace(/\/$/, '') + p)
const clip = (s = '', n = 158) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trim() + '…' : t }
const price = (p) => (p.salePrice && p.salePrice < p.price ? p.salePrice : p.price)

const ORG = () => ({
  '@context': 'https://schema.org',
  '@type': 'Store',
  '@id': abs('/#org'),
  name: `${SITE.name} | ${SITE.nameEn}`,
  alternateName: [SITE.name, SITE.nameEn],
  url: abs('/'),
  logo: abs(SITE.logo),
  image: abs(SITE.ogImage),
  description: SITE.description,
  telephone: SITE.phone,
  ...(SITE.email && { email: SITE.email }),
  areaServed: { '@type': 'Country', name: 'المملكة العربية السعودية' },
  priceRange: 'SAR',
  contactPoint: [{ '@type': 'ContactPoint', telephone: SITE.phone, contactType: 'customer service', availableLanguage: ['ar'] }],
  ...(SITE.sameAs.length && { sameAs: SITE.sameAs }),
})

const WEBSITE = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': abs('/#website'),
  url: abs('/'),
  name: SITE.name,
  inLanguage: 'ar-SA',
  publisher: { '@id': abs('/#org') },
  potentialAction: { '@type': 'SearchAction', target: abs('/shop?q={search_term_string}'), 'query-input': 'required name=search_term_string' },
})

const crumbs = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
})

/** Build the head for a route. data: { products, categories, product, category, faq, reviews } */
export function seoFor(path, data = {}) {
  const { products = [], categories = [], faq = [], reviews = [] } = data
  const base = { canonical: abs(path === '/' ? '/' : path), image: abs(SITE.ogImage), robots: 'index,follow', type: 'website', jsonLd: [] }
  // the store name is added only while the whole title still fits in a Google result (~60 characters)
  const t = (s) => (`${s} | ${SITE.name}`.length <= 60 ? `${s} | ${SITE.name}` : s)

  if (path === '/') {
    return {
      ...base,
      title: `${SITE.name} | ${SITE.tagline}`,
      description: SITE.description,
      keywords: SITE.keywords,
      jsonLd: [ORG(), WEBSITE(),
        faq.length && { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) },
      ].filter(Boolean),
    }
  }
  if (path === '/shop') {
    return {
      ...base,
      title: t('كل المنتجات'),
      description: clip(`كل منتجات ${SITE.name}: ${products.slice(0, 6).map((p) => p.name).join('، ')}. اطلبيها أونلاين وتوصلك لباب بيتك.`),
      keywords: SITE.keywords,
      jsonLd: [crumbs([['الرئيسية', '/'], ['كل المنتجات', '/shop']]), itemList(products)],
    }
  }
  const slug = path.match(/^\/([^/]+)$/)?.[1]
  const cm = slug && (data.category || categories.find((x) => x.id === slug))
  if (cm) {
    const c = cm
    const list = products.filter((p) => p.categoryId === c.id)
    return {
      ...base,
      title: t(SEO_CAT[c.id]?.[0] || c.name),
      description: clip(SEO_CAT[c.id]?.[1] || `${c.name} من ${SITE.name}: ${c.blurb || ''} ${list.slice(0, 4).map((p) => p.name).join('، ')}.`),
      image: abs(CAT_ART[c.id] || SITE.ogImage),
      jsonLd: [crumbs([['الرئيسية', '/'], ['كل المنتجات', '/shop'], [c.name, `/${c.id}`]]), itemList(list)],
    }
  }
  const pm = slug && (data.product || products.find((x) => x.id === fromSlug(slug)))
  if (pm) {
    const p = pm
    if (!p) return { ...base, title: t('المنتج غير موجود'), description: SITE.description, robots: 'noindex' }
    const c = categories.find((x) => x.id === p.categoryId)
    const img = abs(p.image && !p.image.startsWith('data:') ? p.image : CAT_ART[p.categoryId] || SITE.ogImage)
    const fee = Number(data.settings?.shipping?.fee ?? 35)
    return {
      ...base,
      type: 'product',
      title: t(SEO_PRODUCT[p.id]?.[0] || p.name),
      description: clip(SEO_PRODUCT[p.id]?.[1] || p.summary || p.description || `${p.name} من ${SITE.name}.`),
      image: img,
      price: price(p),
      jsonLd: [
        crumbs([['الرئيسية', '/'], ...(c ? [[c.name, `/${c.id}`]] : []), [p.name, productPath(p.id)]]),
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          description: clip(p.summary || p.description || p.name, 500),
          image: [img],
          sku: toSlug(p.id),
          brand: { '@type': 'Brand', name: SITE.name },
          // published reviews, as shown on the page
          ...((sc) => sc && {
            aggregateRating: { '@type': 'AggregateRating', ratingValue: String(sc.avg), bestRating: '5', worstRating: '1', ratingCount: sc.count },
            ...((rv) => rv.length && { review: rv.slice(0, 10) })([
              ...sc.mine.filter((r) => r.text).map((r) => ({ '@type': 'Review', author: { '@type': 'Person', name: r.name }, datePublished: r.date, reviewBody: r.text, reviewRating: { '@type': 'Rating', ratingValue: String(r.service), bestRating: '5' } })),
              ...(SERVICE_RATINGS[p.id]?.reviews || []).map((r) => ({ '@type': 'Review', author: { '@type': 'Person', name: r.name }, datePublished: r.date, reviewBody: r.text, reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' } })),
            ]),
          })(serviceScore(SERVICE_RATINGS[p.id], data.feedback?.reviews, p.id)),
          offers: {
            '@type': 'Offer', url: abs(productPath(p.id)), priceCurrency: 'SAR', price: String(price(p)), availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition', seller: { '@id': abs('/#org') },
            shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: String(fee), currency: 'SAR' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'SA' } },
          },
        },
        SERVICE_FAQ[p.id]?.length && { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: SERVICE_FAQ[p.id].map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) },
      ].filter(Boolean),
    }
  }
  if (path === '/reviews') return { ...base, title: t('آراء العميلات'), description: clip(`${reviews.length} رأي مكتوب من عميلات ${SITE.name} بعد استلام طلباتهن.`), jsonLd: [crumbs([['الرئيسية', '/'], ['آراء العميلات', '/reviews']])] }
  if (path === '/contact') return { ...base, title: t('تواصلي معنا'), description: clip(`تواصلي مع ${SITE.name} على واتساب خدمة العملاء ${SITE.phone.replace(/^\+966/, '0')}.`), jsonLd: [ORG(), crumbs([['الرئيسية', '/'], ['تواصلي معنا', '/contact']])] }
  if (path === '/policies') return { ...base, title: t('السياسات والشروط'), description: clip(`سياسة الاستخدام والشحن والإلغاء والاسترجاع والخصوصية في ${SITE.name}.`) }
  // private or transactional pages
  return { ...base, title: SITE.name, description: SITE.description, robots: 'noindex,nofollow' }
}

function itemList(list) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(productPath(p.id)), name: p.name })),
  }
}

/** Render the head tags as an HTML string (build-time prerender). */
export function headHtml(s) {
  const e = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return [
    `<title>${e(s.title)}</title>`,
    `<meta name="description" content="${e(s.description)}" />`,
    `<meta name="robots" content="${e(s.robots === 'index,follow' ? 'index,follow,max-image-preview:large' : s.robots)}" />`,
    ...(s.keywords ? [`<meta name="keywords" content="${e(s.keywords)}" />`] : []),
    `<link rel="canonical" href="${e(s.canonical)}" />`,
    `<meta property="og:site_name" content="${e(SITE.name)}" />`,
    `<meta property="og:locale" content="ar_SA" />`,
    `<meta property="og:type" content="${e(s.type)}" />`,
    `<meta property="og:title" content="${e(s.title)}" />`,
    `<meta property="og:description" content="${e(s.description)}" />`,
    `<meta property="og:url" content="${e(s.canonical)}" />`,
    `<meta property="og:image" content="${e(s.image)}" />`,
    `<meta property="og:image:secure_url" content="${e(s.image)}" />`,
    ...(/\/og\.jpg$/.test(s.image) ? [`<meta property="og:image:type" content="image/jpeg" />`, `<meta property="og:image:width" content="1200" />`, `<meta property="og:image:height" content="630" />`] : []),
    `<meta property="og:image:alt" content="${e(s.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${e(s.title)}" />`,
    `<meta name="twitter:description" content="${e(s.description)}" />`,
    `<meta name="twitter:image" content="${e(s.image)}" />`,
    ...(s.article ? [`<meta property="article:published_time" content="${e(s.article.published)}" />`, `<meta property="article:modified_time" content="${e(s.article.modified)}" />`, `<meta property="article:section" content="${e(s.article.section)}" />`] : []),
    ...(s.price != null ? [`<meta property="product:price:amount" content="${e(s.price)}" />`, `<meta property="product:price:currency" content="SAR" />`] : []),
    ...s.jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
  ].join('\n    ')
}
