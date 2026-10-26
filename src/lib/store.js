// Applies the owner's store identity (store designer) to the shared constants the pages, SEO and links read.
import { SITE } from './seo.js'
import { setContact } from './format.js'

const ORIGINAL = { ...SITE }
let last
export function applyStore(store) {
  const key = JSON.stringify(store)
  if (key === last) return
  last = key
  Object.assign(SITE, ORIGINAL, {
    name: store.name, nameEn: store.nameEn, phone: '+' + store.whatsapp, email: store.email,
    ...(store.description ? { description: store.description } : {}),
  })
  setContact(store.whatsapp, store.email)
}
