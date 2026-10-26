// POST { t, id, vid, sid, p, r, u, c, d }  — one page view / cart / checkout from the store (for التقارير).
// Counted on our own domain (ad blockers don't stop it), bots and link-preview crawlers are dropped,
// and nothing personal is kept: no IP, no name — only a random browser id, the page, and Vercel's country/city.
import { admin } from './_shared.js'

const BOT = /bot|crawl|spider|slurp|scrap|facebookexternalhit|meta-external|whatsapp|telegram|discord|slack|skype|embedly|quora|pinterest|vkshare|w3c_|lighthouse|pagespeed|gtmetrix|headless|phantom|puppeteer|playwright|selenium|python|curl|wget|httpclient|okhttp|java\/|go-http|axios|node-fetch|undici|postman|insomnia|preview|monitor|uptime|pingdom|semrush|ahrefs|mj12|dotbot|petal|bytespider|gptbot|claude|perplexity|amazonbot|applebot|yandex|baidu|sogou|bingpreview/i
const ID = /^[\w-]{8,40}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SOURCES = [
  [/(^|\.)google\./, 'Google'], [/(^|\.)bing\.com$/, 'Bing'], [/instagram\.com$|^ig$/, 'Instagram'], [/tiktok\.com$|^tiktok$/, 'TikTok'],
  [/snapchat\.com$|^snap(chat)?$/, 'Snapchat'], [/(^|\.)(t\.co|twitter\.com|x\.com)$|^(x|twitter)$/, 'X'], [/facebook\.com$|fb\.(com|me)$|^(facebook|fb)$/, 'Facebook'],
  [/whatsapp\.com$|wa\.me$|^whatsapp$/, 'WhatsApp'], [/linkedin\.com$|lnkd\.in$|^linkedin$/, 'LinkedIn'], [/youtube\.com$|youtu\.be$|^youtube$/, 'YouTube'],
  [/telegram\.|t\.me$|^telegram$/, 'Telegram'], [/salla\.(sa|com)$|^salla$/, 'سلة'], [/chatgpt\.com$|openai\.com$|^chatgpt$/, 'ChatGPT'],
]
const recent = new Map() // per-instance flood guard: at most 90 hits a minute from one address
const s = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '')

function device(ua) {
  const d = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua) ? 'تابلت' : /Mobi|iPhone|iPod|Android|BlackBerry|Opera Mini|IEMobile/i.test(ua) ? 'جوال' : 'كمبيوتر'
  const os = /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Android/i.test(ua) ? 'Android' : /Windows/i.test(ua) ? 'Windows' : /Mac OS X|Macintosh/i.test(ua) ? 'macOS' : /CrOS/i.test(ua) ? 'ChromeOS' : /Linux/i.test(ua) ? 'Linux' : 'أخرى'
  const browser = /Snapchat/i.test(ua) ? 'سناب شات' : /Instagram/i.test(ua) ? 'إنستقرام' : /musical_ly|BytedanceWebview|TikTok/i.test(ua) ? 'تيك توك' : /FBAN|FBAV/i.test(ua) ? 'فيسبوك'
    : /Edg\//i.test(ua) ? 'Edge' : /SamsungBrowser/i.test(ua) ? 'Samsung' : /OPR\/|Opera/i.test(ua) ? 'Opera' : /Firefox|FxiOS/i.test(ua) ? 'Firefox'
      : /Chrome|CriOS/i.test(ua) ? 'Chrome' : /Safari/i.test(ua) ? 'Safari' : 'أخرى'
  return { device: d, os, browser }
}

function source(refHost, utm) {
  const u = utm.toLowerCase().trim()
  if (u) return SOURCES.find(([re]) => re.test(u))?.[1] || utm.trim().slice(0, 40)
  if (!refHost) return 'مباشر'
  return SOURCES.find(([re]) => re.test(refHost))?.[1] || refHost
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store')
  if (req.method !== 'POST') return res.status(405).end()
  const ua = String(req.headers['user-agent'] || '')
  if (ua.length < 25 || BOT.test(ua)) return res.status(204).end()
  // only from the store's own pages
  const host = String(req.headers.host || '')
  const origin = String(req.headers.origin || '')
  if (origin && origin !== `https://${host}`) return res.status(204).end()

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  const now = Date.now()
  const r = recent.get(ip)
  if (r && now - r.t < 60000) { if (++r.n > 90) return res.status(204).end() } else recent.set(ip, { t: now, n: 1 })
  if (recent.size > 5000) recent.clear()

  let b = req.body
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch { b = null } }
  if (!b || typeof b !== 'object') return res.status(400).end()
  const { t, id, vid, sid } = b
  if (!['view', 'leave', 'cart', 'checkout'].includes(t) || !UUID.test(String(id)) || !ID.test(String(vid)) || !ID.test(String(sid))) return res.status(400).end()

  try {
    if (t === 'leave') {
      const sec = Math.max(0, Math.min(1800, Math.round(Number(b.d) || 0)))
      const { data } = await admin.from('visits').select('dur').eq('id', id).eq('vid', vid).maybeSingle()
      if (data && sec > (data.dur || 0)) await admin.from('visits').update({ dur: sec }).eq('id', id).eq('vid', vid)
      return res.status(204).end()
    }
    let path = s(b.p, 300).split(/[?#]/)[0] || '/'
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/admin')) return res.status(204).end()
    try { path = decodeURIComponent(path) } catch { /* keep as sent */ }
    let refHost = ''
    try { refHost = new URL(s(b.r, 500)).hostname.replace(/^www\./, '').replace(/^(l|lm|m)\./, '') } catch { /* no referrer */ }
    if (refHost === host.replace(/^www\./, '')) refHost = ''
    let city = String(req.headers['x-vercel-ip-city'] || '')
    try { city = decodeURIComponent(city) } catch { /* keep */ }
    await admin.from('visits').upsert({
      id, vid, sid, kind: t, path: path.slice(0, 200),
      ref: refHost || null,
      source: source(refHost, s(b.u, 60)),
      campaign: s(b.c, 80).trim() || null,
      country: /^[A-Z]{2}$/.test(String(req.headers['x-vercel-ip-country'] || '')) ? req.headers['x-vercel-ip-country'] : null,
      city: city.slice(0, 60) || null,
      ...device(ua),
    }, { onConflict: 'id', ignoreDuplicates: true })
  } catch { /* the store never waits on this */ }
  return res.status(204).end()
}
