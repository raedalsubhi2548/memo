// Public product addresses: the product id is its address (/hair-oil). ALIAS gives an id a different address if ever needed.

const ALIAS = {}
const BACK = Object.fromEntries(Object.entries(ALIAS).map(([id, slug]) => [slug, id]))

export const toSlug = (id) => ALIAS[id] || id
export const fromSlug = (slug) => BACK[slug] || slug
export const productPath = (id) => `/${toSlug(id)}`
// Categories and services live at the top level (/hair-oil), next to the fixed pages; these names
// are taken by those pages, so no category or product may use them.
export const categoryPath = (id) => `/${id}`
export const RESERVED = ['shop', 'cart', 'checkout', 'order', 'review', 'login', 'contact', 'policies', 'reviews', 'account', 'admin', 'api', 'assets', 'brand', 'c', 'p']
