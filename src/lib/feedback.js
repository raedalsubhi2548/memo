// Reviews: the store's Google review link (empty until the store has a Google Business Profile), and how ratings add up.
export const GOOGLE_REVIEW_URL = ''

export const reviewPath = (orderId, token) => `/review/${orderId}?t=${token}`

/** Average and count for a service: the Salla ratings (all 5 stars) plus the published reviews that name it. */
export function serviceScore(salla, reviews, productId) {
  const mine = (reviews || []).filter((r) => r.products?.includes(productId))
  const count = (salla?.count || 0) + mine.length
  if (!count) return null
  const sum = (salla?.count || 0) * 5 + mine.reduce((s, r) => s + Number(r.service || 0), 0)
  return { count, avg: Math.round((sum / count) * 10) / 10, mine }
}

/** A published review in the shape the old Salla reviews use on the home page and /reviews. */
export const asTestimonial = (r) => ({ id: r.id, name: r.name, date: r.date, text: r.text, stars: r.store, fresh: true })

/** Written reviews for the home page and /reviews: the newest published ones (with text) first, then the Salla ones. */
export const testimonials = (salla, reviews) => [...(reviews || []).filter((r) => r.text).map(asTestimonial), ...salla]
