// Generates supabase/seed.sql from src/data/seed.js  →  node scripts/seed-sql.mjs
import { writeFileSync } from 'node:fs'
import { seedCategories, seedProducts } from '../src/data/seed.js'
const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let sql = '-- The store catalog (src/data/seed.js). Safe to re-run.\n'
for (const c of seedCategories) sql += `insert into public.categories (id, name, blurb, icon, sort) values (${[c.id, c.name, c.blurb, c.icon, c.sort].map(q).join(', ')}) on conflict (id) do update set name = excluded.name, blurb = excluded.blurb, icon = excluded.icon, sort = excluded.sort;\n`
for (const p of seedProducts) sql += `insert into public.products (id, name, price, sale_price, category_id, image, badge, featured, sort, summary, description, active, digital, per_unit) values (${[p.id, p.name, p.price, p.salePrice ?? null, p.categoryId, p.image, p.badge ?? null, !!p.featured, p.sort ?? 0, p.summary, p.description, true, !!p.digital, p.perUnit ?? null].map(q).join(', ')}) on conflict (id) do nothing;\n`
writeFileSync('supabase/seed.sql', sql)
console.log('wrote supabase/seed.sql')
