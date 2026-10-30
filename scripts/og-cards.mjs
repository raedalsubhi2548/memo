// Link-preview cards (WhatsApp, X, iMessage…): 1200×630 JPEGs in public/brand/og/, drawn as HTML and photographed with
// headless Edge/Chrome (Arabic shaping and the store's own fonts, which an image library would get wrong).
// Run: node scripts/og-cards.mjs — then bump OG_V in src/lib/seo.js (previews are cached by file name).
// A product without a card (added later from the dashboard) previews with its own photo.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { seedCategories, seedProducts } from '../src/data/seed.js'
import { OG_V } from '../src/lib/seo.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT = join(ROOT, 'public/brand/og')
const TMP = mkdtempSync(join(tmpdir(), 'og-'))
const f = (p) => pathToFileURL(join(ROOT, p)).href
const BROWSER = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync)
if (!BROWSER) throw new Error('needs Edge or Chrome')
mkdirSync(OUT, { recursive: true })

const DOMAIN = 'memecare1.com'
const css = `
@font-face { font-family: A; src: url(${f('node_modules/@fontsource/almarai/files/almarai-arabic-800-normal.woff2')}); font-weight: 800 }
@font-face { font-family: A; src: url(${f('node_modules/@fontsource/almarai/files/almarai-arabic-700-normal.woff2')}); font-weight: 700 }
@font-face { font-family: L; src: url(${f('node_modules/@fontsource/almarai/files/almarai-latin-700-normal.woff2')}); font-weight: 700 }
@font-face { font-family: P; src: url(${f('node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-500-normal.woff2')}); font-weight: 500 }
* { margin: 0; box-sizing: border-box }
html, body { width: 1200px; height: 630px; overflow: hidden }
body { position: relative; direction: rtl; font-family: P; color: #3a2a2e; background: #fbf6f4 }
.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 0 50% }
.wash { position: absolute; inset: 0; background: linear-gradient(to left, #fbf6f4 34%, rgb(251 246 244 / .82) 52%, rgb(251 246 244 / 0) 78%) }
.frame { position: absolute; inset: 22px; border: 1.5px solid rgb(185 133 114 / .55); border-radius: 30px }
.text { position: absolute; top: 0; bottom: 0; right: 92px; width: 520px; display: flex; flex-direction: column; justify-content: center }
.logo { width: 112px; height: 112px; border-radius: 50%; box-shadow: 0 16px 34px -18px rgb(125 63 76 / .7) }
.kicker { margin-top: 26px; font: 700 25px A; color: #b98572; letter-spacing: .2px }
h1 { margin-top: 10px; font: 800 74px/1.18 A; color: #7d3f4c }
h1.long { font-size: 60px }
.line { text-wrap: balance; margin-top: 18px; font-size: 27px; line-height: 1.6; color: #4a3a3e; max-width: 500px }
.foot { margin-top: 30px; display: flex; align-items: center; gap: 14px; font: 700 21px L; color: #7d3f4c; letter-spacing: .5px }
.pill { padding: 9px 22px; border-radius: 99px; background: #7d3f4c; color: #fff; font: 700 21px A }
.cards { position: absolute; top: 0; bottom: 0; left: 70px; width: 520px; display: flex; align-items: center; justify-content: center }
.card { position: relative; background: #fff; padding: 9px; border-radius: 26px; box-shadow: 0 34px 60px -30px rgb(90 40 50 / .65) }
.card img { display: block; width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: 19px }
.one .card { width: 330px; rotate: -3deg }
.three .card { width: 210px }
.three .card:nth-child(1) { rotate: 7deg; scale: .9; margin-left: -26px }
.three .card:nth-child(2) { z-index: 2 }
.three .card:nth-child(3) { rotate: -7deg; scale: .9; margin-right: -26px }
`
const page = ({ kicker, title, line, photos, bg = 'public/brand/hero-silk-v4.webp' }) => `<!doctype html><html lang="ar"><head><meta charset="utf-8"><style>${css}</style></head><body>
<img class="bg" src="${f(bg)}"><div class="wash"></div><div class="frame"></div>
<div class="cards ${photos.length === 1 ? 'one' : 'three'}">${photos.map((p) => `<div class="card"><img src="${f(p)}"></div>`).join('')}</div>
<div class="text"><img class="logo" src="${f('public/logo-300.png')}">
<p class="kicker">${kicker}</p><h1 class="${title.length > 14 ? 'long' : ''}">${title}</h1><p class="line">${line}</p>
<p class="foot"><span class="pill">اطلبي الحين</span><span dir="ltr">${DOMAIN}</span></p></div></body></html>`

const pic = (id) => seedProducts.find((p) => p.id === id).image.replace(/^\//, 'public/')
const cards = [
  { name: 'home', kicker: 'خلطات الجدات بلمسة اليوم', title: 'عناية ميمي', line: 'صابونيات تقليدية وزيت للشعر، توصلك لين باب بيتك.', photos: ['turmeric-soap', 'hair-oil', 'moroccan-nila-soap'].map(pic) },
  ...seedCategories.map((c) => {
    const list = seedProducts.filter((p) => p.categoryId === c.id).map((p) => p.id)
    return { name: c.id, kicker: 'عناية ميمي', title: c.name, line: c.blurb, photos: (list.length >= 3 ? list.slice(0, 3) : list.slice(0, 1)).map(pic), bg: c.id === 'hair-care' ? 'public/brand/hero-hair-v4.webp' : 'public/brand/hero-herbs-v4.webp' }
  }),
  ...seedProducts.map((p) => ({ name: p.id, kicker: seedCategories.find((c) => c.id === p.categoryId)?.name || 'عناية ميمي', title: p.name, line: p.summary, photos: [pic(p.id)] })),
]

for (const c of cards) {
  const html = join(TMP, c.name + '.html'), png = join(TMP, c.name + '.png')
  writeFileSync(html, page(c))
  execFileSync(BROWSER, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--allow-file-access-from-files',
    '--virtual-time-budget=3000', '--window-size=1200,630', `--screenshot=${png}`, pathToFileURL(html).href], { stdio: 'ignore' })
  await sharp(png).resize(1200, 630, { fit: 'cover', position: 'top' }).jpeg({ quality: 86, mozjpeg: true }).toFile(join(OUT, `${c.name}-v${OG_V}.jpg`))
  console.log('og card', c.name)
}
