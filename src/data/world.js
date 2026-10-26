// Real pictures of the products' world (open collections, downloaded into public/brand/world/). They show the
// ingredients and the trade, never the store's own products. Every one is credited in the footer.
export const HERO_PICTURE = {
  src: '/brand/world/rose-petals.webp', mobile: '/brand/world/rose-petals-m.webp', alt: 'بتلات ورد مجففة',
}

/** The ingredients section: each picture passes behind the pinned title with its own words. */
export const INGREDIENTS = [
  {
    src: '/brand/world/turmeric.webp', alt: 'جذور الكركم', caption: 'جذور الكركم',
    name: 'الكركم', product: 'turmeric-soap',
    text: 'جذر أصفر من عائلة الزنجبيل، دخل خلطات العناية بالبشرة من زمان. ومنه صابونية الكركم.',
  },
  {
    src: '/brand/world/indigo.webp', alt: 'نبات النيلة في حديقة نباتية', caption: 'نبات النيلة',
    name: 'النيلة', product: 'moroccan-nila-soap',
    text: 'لونها الأزرق من نبات النيلة، ومن أشهر مكونات الحمّام المغربي. ومنها صابونية النيلة المغربية.',
  },
  {
    src: '/brand/world/attar-shop.webp', alt: 'دكان عطارة في مراكش', caption: 'دكان عطارة في مراكش',
    name: 'العكر', product: 'persian-akar-soap',
    text: 'من خلطات العطّارة التقليدية عند الخليجيات، وارتبط اسمه بالنضارة. ومنه صابونية العكر الفارسي.',
  },
]

export const PICTURE_CREDITS = [
  '«Dried rose petals» — Fumikas Sagisavas، CC0',
  '«Curcuma longa roots» — Simon A. Eugster، CC BY-SA 3.0',
  '«Indigofera tinctoria, Botanischer Garten Frankfurt» — Daderot، CC0',
  '«Spice Shop, Marrakech» — Doug Knuth، CC BY-SA 2.0',
  'عبر ويكيميديا كومنز',
]
