// Draws the store's product pictures, hero, banners and category art as SVG (jars and a bottle carrying the logo and the
// product name), rendered to webp in public/brand/ with sharp. Stand-ins until the owner uploads real photos from the
// dashboard.  node scripts/brand-art.mjs
import { readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const OUT = new URL('../public/brand/', import.meta.url)
mkdirSync(new URL('products/', OUT), { recursive: true })
const LOGO = 'data:image/png;base64,' + readFileSync(new URL('../public/logo-300.png', import.meta.url)).toString('base64')
const FONT = "'Segoe UI', 'Noto Sans Arabic', Tahoma, Arial, sans-serif"
const WINE = '#7d3f4c'

const PRODUCTS = {
  'turmeric-soap': { name: 'صابونية الكركم', cream: ['#f3cf6e', '#dca236'] },
  'persian-akar-soap': { name: 'صابونية العكر الفارسي', cream: ['#e9939a', '#c45f6c'] },
  'moroccan-nila-soap': { name: 'صابونية النيلة المغربية', cream: ['#a9c6e6', '#7598c8'] },
}

let uid = 0
const id = (p) => `${p}${++uid}`

const defsCommon = `
  <filter id="blur18"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="blur40"><feGaussianBlur stdDeviation="40"/></filter>
  <linearGradient id="rosegold" x1="0" x2="1"><stop offset="0" stop-color="#c58f78"/><stop offset=".35" stop-color="#f1d3c2"/><stop offset=".6" stop-color="#d7a48c"/><stop offset="1" stop-color="#b47a64"/></linearGradient>
  <linearGradient id="glass" x1="0" x2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".18" stop-color="#ffffff" stop-opacity=".12"/><stop offset=".8" stop-color="#ffffff" stop-opacity=".05"/><stop offset="1" stop-color="#ffffff" stop-opacity=".35"/></linearGradient>
  <linearGradient id="label" x1="0" x2="1"><stop offset="0" stop-color="#ecd2cc"/><stop offset=".25" stop-color="#fbeeea"/><stop offset=".75" stop-color="#f8e7e3"/><stop offset="1" stop-color="#e6c7c0"/></linearGradient>
  <linearGradient id="amber" x1="0" x2="1"><stop offset="0" stop-color="#6e3410"/><stop offset=".3" stop-color="#b8662a"/><stop offset=".55" stop-color="#d9893f"/><stop offset="1" stop-color="#7a3a12"/></linearGradient>
`

/** A blush backdrop: soft light from the top left, a warmer floor. */
const backdrop = (w, h) => {
  const g = id('bg')
  return `<defs><radialGradient id="${g}" cx="35%" cy="25%" r="90%"><stop offset="0" stop-color="#fffaf8"/><stop offset=".55" stop-color="#f6e4df"/><stop offset="1" stop-color="#ead0ca"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#${g})"/>
  <ellipse cx="${w * 0.82}" cy="${h * 0.12}" rx="${w * 0.35}" ry="${h * 0.25}" fill="#ffffff" opacity=".45" filter="url(#blur40)"/>
  <path d="M0 ${h * 0.72} C ${w * 0.3} ${h * 0.66}, ${w * 0.65} ${h * 0.78}, ${w} ${h * 0.7} L ${w} ${h} L 0 ${h} Z" fill="#f1dcd6" opacity=".7"/>
  <path d="M0 ${h * 0.8} C ${w * 0.35} ${h * 0.74}, ${w * 0.7} ${h * 0.86}, ${w} ${h * 0.78}" stroke="#ffffff" stroke-opacity=".6" stroke-width="3" fill="none"/>`
}

/** A eucalyptus sprig: a curved stem with round sage leaves. */
const sprig = (x, y, s = 1, rot = 0) => {
  const leaves = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6, lx = 8 + t * 150, ly = -Math.sin(t * 2.4) * 40
    const side = i % 2 ? 1 : -1
    return `<ellipse cx="${lx}" cy="${ly + side * 16}" rx="${15 - t * 4}" ry="${11 - t * 3}" fill="${i % 3 ? '#9fb6a3' : '#8aa592'}" opacity=".95" transform="rotate(${side * 25} ${lx} ${ly + side * 16})"/>`
  }).join('')
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0 C 50 -10, 110 -40, 165 -45" stroke="#7d927f" stroke-width="3" fill="none"/>${leaves}</g>`
}
/** A rose petal. */
const petal = (x, y, s = 1, rot = 0) => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M0 0 C 18 -22, 42 -16, 40 4 C 38 22, 14 26, 0 0 Z" fill="#e7aaa6" opacity=".85"/><path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M4 2 C 16 -6, 28 -4, 36 4" stroke="#d48e8b" stroke-width="1.2" fill="none" opacity=".6"/>`

/** The soap jar: clear body with the coloured cream, rose-gold lid, blush label with the logo and the product name. */
function jar(x, y, s, p) {
  const c = id('cream'), clip = id('clip')
  const W = 260, H = 250
  return `<g transform="translate(${x} ${y}) scale(${s})">
  <defs>
    <linearGradient id="${c}" x1="0" x2="1"><stop offset="0" stop-color="${p.cream[1]}"/><stop offset=".35" stop-color="${p.cream[0]}"/><stop offset=".7" stop-color="${p.cream[0]}"/><stop offset="1" stop-color="${p.cream[1]}"/></linearGradient>
    <clipPath id="${clip}"><rect x="0" y="0" width="${W}" height="${H}" rx="28"/></clipPath>
  </defs>
  <ellipse cx="${W / 2}" cy="${H + 6}" rx="${W * 0.62}" ry="22" fill="#7d3f4c" opacity=".22" filter="url(#blur18)"/>
  <g clip-path="url(#${clip})">
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${c})"/>
    <path d="M0 26 C 60 10, 120 40, ${W} 18 L ${W} 0 L 0 0 Z" fill="#ffffff" opacity=".35"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#glass)"/>
  </g>
  <rect x="0" y="0" width="${W}" height="${H}" rx="28" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width="2.5"/>
  <rect x="14" y="20" width="12" height="${H - 50}" rx="6" fill="#ffffff" opacity=".45"/>
  <rect x="-6" y="-46" width="${W + 12}" height="54" rx="14" fill="url(#rosegold)"/>
  ${Array.from({ length: 16 }, (_, i) => `<rect x="${6 + i * 16.5}" y="-40" width="2" height="42" fill="#a86f5b" opacity=".35"/>`).join('')}
  <rect x="-6" y="-46" width="${W + 12}" height="12" rx="6" fill="#ffffff" opacity=".35"/>
  <rect x="-2" y="70" width="${W + 4}" height="150" fill="url(#label)"/>
  <rect x="-2" y="78" width="${W + 4}" height="2" fill="url(#rosegold)"/>
  <rect x="-2" y="210" width="${W + 4}" height="2" fill="url(#rosegold)"/>
  <circle cx="${W / 2}" cy="122" r="34" fill="#fbeeea" stroke="url(#rosegold)" stroke-width="2"/>
  <image href="${LOGO}" x="${W / 2 - 31}" y="91" width="62" height="62"/>
  <text x="${W / 2}" y="185" font-family="${FONT}" font-size="${p.name.length > 16 ? 17 : 20}" font-weight="600" fill="${WINE}" text-anchor="middle" direction="rtl">${p.name}</text>
  <text x="${W / 2}" y="203" font-family="${FONT}" font-size="11" fill="#a47982" text-anchor="middle" direction="rtl">عناية ميمي</text>
</g>`
}

/** The hair-oil bottle: amber glass, rose-gold collar, wine dropper bulb, blush label. */
function bottle(x, y, s) {
  const clip = id('bclip')
  return `<g transform="translate(${x} ${y}) scale(${s})">
  <defs><clipPath id="${clip}"><path d="M10 120 C 10 92, 40 82, 52 70 L 52 40 L 108 40 L 108 70 C 120 82, 150 92, 150 120 L 150 382 C 150 396, 140 404, 126 404 L 34 404 C 20 404, 10 396, 10 382 Z"/></clipPath></defs>
  <ellipse cx="80" cy="410" rx="105" ry="18" fill="#5a2a1a" opacity=".25" filter="url(#blur18)"/>
  <g clip-path="url(#${clip})">
    <rect x="0" y="30" width="160" height="380" fill="url(#amber)"/>
    <rect x="0" y="150" width="160" height="260" fill="#8a4314" opacity=".35"/>
    <rect x="24" y="96" width="12" height="280" rx="6" fill="#ffffff" opacity=".35"/>
  </g>
  <rect x="44" y="-6" width="72" height="54" rx="8" fill="url(#rosegold)"/>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${50 + i * 8.5}" y="0" width="2" height="44" fill="#a86f5b" opacity=".35"/>`).join('')}
  <path d="M56 -6 C 50 -60, 58 -96, 80 -98 C 102 -96, 110 -60, 104 -6 Z" fill="${WINE}"/>
  <path d="M66 -20 C 62 -58, 68 -84, 78 -88" stroke="#ffffff" stroke-opacity=".35" stroke-width="6" fill="none" stroke-linecap="round"/>
  <rect x="8" y="200" width="144" height="150" fill="url(#label)"/>
  <rect x="8" y="208" width="144" height="2" fill="url(#rosegold)"/>
  <rect x="8" y="340" width="144" height="2" fill="url(#rosegold)"/>
  <circle cx="80" cy="250" r="30" fill="#fbeeea" stroke="url(#rosegold)" stroke-width="2"/>
  <image href="${LOGO}" x="53" y="223" width="54" height="54"/>
  <text x="80" y="308" font-family="${FONT}" font-size="19" font-weight="600" fill="${WINE}" text-anchor="middle" direction="rtl">زيت الشعر</text>
  <text x="80" y="326" font-family="${FONT}" font-size="11" fill="#a47982" text-anchor="middle" direction="rtl">عناية ميمي</text>
</g>`
}
const drop = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -20 C 8 -8, 12 0, 12 6 A 12 12 0 0 1 -12 6 C -12 0, -8 -8, 0 -20 Z" fill="#e2a24a" opacity=".9"/><circle cx="${x - 3 * s}" cy="${y + 2 * s}" r="${3 * s}" fill="#fff" opacity=".6"/>`

const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defsCommon}</defs>${body}</svg>`
const save = async (file, w, h, body) => {
  await sharp(Buffer.from(svg(w, h, body))).webp({ quality: 88 }).toFile(fileURLToPath(new URL(file, OUT)))
  console.log('wrote', file)
}

// ---- product cards (4:5) ----
for (const [key, p] of Object.entries(PRODUCTS)) {
  await save(`products/${key}.webp`, 1200, 1500, backdrop(1200, 1500)
    + sprig(150, 1180, 1.6, -20) + sprig(1080, 1260, 1.4, 200)
    + petal(260, 1290, 1.4, 20) + petal(930, 1180, 1.2, -30) + petal(860, 1320, 1, 60)
    + jar(330, 560, 2.08, p))
}
await save('products/hair-oil.webp', 1200, 1500, backdrop(1200, 1500)
  + sprig(170, 1220, 1.7, -15) + sprig(1050, 1280, 1.4, 195)
  + drop(860, 1250, 2.2) + drop(930, 1300, 1.5) + petal(300, 1320, 1.2, 10)
  + bottle(440, 420, 2.0))

// ---- the three jars and the bottle together ----
const trio = (x, y, s) => jar(x, y + 40 * s, s * 0.9, PRODUCTS['persian-akar-soap']) + jar(x + 230 * s, y, s, PRODUCTS['turmeric-soap']) + jar(x + 480 * s, y + 40 * s, s * 0.9, PRODUCTS['moroccan-nila-soap'])

// hero, wide: products at both edges, an empty blush middle for the logo and headline
await save('hero.webp', 2400, 1200, backdrop(2400, 1200)
  + sprig(80, 980, 2.2, -25) + sprig(2300, 1000, 2.2, 205) + petal(700, 1020, 1.6, 30) + petal(1650, 1060, 1.4, -20) + petal(1200, 1110, 1.2, 70)
  + bottle(380, 470, 1.4) + drop(700, 1060, 2.2)
  + trio(1580, 700, 0.92))
// hero, phone: products in the bottom part, the top stays empty
await save('hero-mobile.webp', 1080, 1920, backdrop(1080, 1920)
  + sprig(40, 1780, 1.6, -20) + sprig(1050, 1820, 1.5, 200) + petal(500, 1840, 1.3, 20)
  + bottle(50, 1230, 1.2) + trio(330, 1420, 0.85))

// banners (3:2): subject on the left, the right side fades into the page
await save('banner-hair.webp', 1500, 1000, backdrop(1500, 1000)
  + sprig(60, 860, 1.8, -20) + sprig(620, 900, 1.3, 200) + drop(520, 880, 2) + drop(580, 910, 1.4) + petal(120, 900, 1.2, 0)
  + bottle(230, 320, 1.35))
await save('banner-skin.webp', 1500, 1000, backdrop(1500, 1000)
  + sprig(30, 880, 1.6, -15) + petal(760, 900, 1.3, 40) + petal(90, 930, 1.1, -10)
  + trio(70, 470, 1.0))

// category arches (3:4)
await save('cat-hair-care.webp', 900, 1200, backdrop(900, 1200)
  + sprig(80, 1000, 1.6, -30) + sprig(860, 1040, 1.5, 210) + drop(660, 1010, 2) + petal(220, 1060, 1.3, 15)
  + bottle(330, 330, 1.5))
await save('cat-skin-care.webp', 900, 1200, backdrop(900, 1200)
  + sprig(40, 1080, 1.4, -20) + petal(700, 1080, 1.3, 30)
  + jar(80, 700, 1.0, PRODUCTS['persian-akar-soap']) + jar(560, 700, 1.0, PRODUCTS['moroccan-nila-soap']) + jar(285, 520, 1.25, PRODUCTS['turmeric-soap']))
