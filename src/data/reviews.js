// Only real reviews are shown: the ones customers write after delivery (supabase/reviews-2026-10.sql).
// These lists hold reviews collected elsewhere (none yet). Never add made-up ones.
export const ALL_REVIEWS = []
export const FEATURED_REVIEW = null
export const HOME_REVIEWS = []
// Ratings per product from another platform: { [productId]: { count, reviews: [{ name, date, text }] } }
export const SERVICE_RATINGS = {}
export const CORE_SERVICES = []
