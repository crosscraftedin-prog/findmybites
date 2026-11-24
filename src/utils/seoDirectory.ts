import {
  ALL_CATEGORIES,
  FOOD_CATEGORIES,
  LaunchCountry,
  QuickFilterTag,
  STATES_BY_COUNTRY,
  Vendor,
  getVendorBioHandle,
} from '../data/vendors';

export interface SeoCityEntry {
  slug: string;
  city: string;
  state: string;
  country: Exclude<LaunchCountry, 'All'>;
  lat: number;
  lng: number;
}

export interface SeoCategoryEntry {
  slug: string;
  category: string;
  marketplace: 'food' | 'party';
  isChristmasHub?: boolean;
  displayLabel?: string;
  searchKeyword?: string;
  quickTag?: QuickFilterTag;
}

export interface ResolvedSeoDirectoryRoute {
  cityEntry: SeoCityEntry | null;
  categoryEntry: SeoCategoryEntry | null;
  canonicalPath: string;
  h1: string;
  title: string;
  description: string;
  keywords: string;
  faqs: Array<{ question: string; answer: string }>;
}

export function slugifySeoSegment(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const RESERVED_TOP_LEVEL_SLUGS = new Set([
  'v',
  'fmb',
  'claim',
  'api',
  'assets',
  'city',
  'category',
  'sitemap.xml',
  'robots.txt',
]);

// Build full deduplicated index of all supported cities across all 6 launch countries
export const SEO_CITIES: SeoCityEntry[] = (() => {
  const seen = new Set<string>();
  const out: SeoCityEntry[] = [];
  for (const [country, regions] of Object.entries(STATES_BY_COUNTRY) as Array<
    [Exclude<LaunchCountry, 'All'>, (typeof STATES_BY_COUNTRY)['India']]
  >) {
    for (const region of regions) {
      for (const city of region.cities) {
        const slug = slugifySeoSegment(city);
        if (!slug || seen.has(slug) || RESERVED_TOP_LEVEL_SLUGS.has(slug)) continue;
        seen.add(slug);
        out.push({
          slug,
          city,
          state: region.name,
          country,
          lat: region.lat,
          lng: region.lng,
        });
      }
    }
  }
  return out;
})();

export const SEO_CATEGORIES: SeoCategoryEntry[] = [
  ...ALL_CATEGORIES.map((category) => ({
    slug: slugifySeoSegment(category),
    category,
    marketplace: ((FOOD_CATEGORIES as readonly string[]).includes(category)
      ? 'food'
      : 'party') as 'food' | 'party',
  })),
  {
    slug: 'cakes-near-me',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Custom Cakes & Home Bakers',
  },
  {
    slug: 'birthday-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Birthday Cakes & Theme Cakes',
    searchKeyword: 'birthday',
  },
  {
    slug: 'eggless-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: '100% Eggless Cakes & Bakes',
    quickTag: 'Eggless',
  },
  {
    slug: 'brownies-near-me',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Fudgy Brownies & Dessert Boxes',
    searchKeyword: 'brownie',
  },
  {
    slug: 'custom-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Custom Designer & Theme Cakes',
    searchKeyword: 'custom',
  },
  {
    slug: 'wedding-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Tiered Wedding & Engagement Cakes',
    quickTag: 'Wedding Ready',
    searchKeyword: 'wedding',
  },
  {
    slug: 'home-bakers',
    category: 'Home Bakers & Cloud Kitchens',
    marketplace: 'food',
    displayLabel: 'Verified Home Bakers',
  },
  {
    slug: 'cupcakes-and-desserts',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Cupcakes, Cheesecakes & Dessert Jars',
    searchKeyword: 'cupcake',
  },
  {
    slug: 'christmas-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    isChristmasHub: true,
  },
  {
    slug: 'christmas-plum-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    isChristmasHub: true,
  },
];

// Top high-traffic priority cities for sitemap & cross-linking spider web
export const PRIORITY_SEO_CITY_SLUGS = [
  'mumbai',
  'bengaluru',
  'delhi-ncr',
  'kochi',
  'chennai',
  'hyderabad',
  'pune',
  'kolkata',
  'ahmedabad',
  'jaipur',
  'dubai',
  'abu-dhabi',
  'colombo',
  'lahore',
  'karachi',
  'dhaka',
  'kathmandu',
];

export function findSeoCityBySlug(slug: string): SeoCityEntry | null {
  const target = slugifySeoSegment(slug);
  return SEO_CITIES.find((c) => c.slug === target) ?? null;
}

export function findSeoCategoryBySlug(slug: string): SeoCategoryEntry | null {
  const target = slugifySeoSegment(slug);
  return SEO_CATEGORIES.find((c) => c.slug === target) ?? null;
}

export function buildCityCategoryPath(cityName: string, categoryName: string): string {
  return `/${slugifySeoSegment(cityName)}/${slugifySeoSegment(categoryName)}`;
}

export function buildLocalFaqs(
  cityName: string | null,
  categoryLabel: string,
  isChristmasHub?: boolean
): Array<{ question: string; answer: string }> {
  const place = cityName ? `in ${cityName}` : 'near you';
  if (isChristmasHub) {
    return [
      {
        question: `How do I pre-order Christmas plum cakes & Yule logs ${place}?`,
        answer: `Browse verified home bakers ${place} on FindMyBites, compare 1 kg plum cake prices, rum-soaked & eggless options, and message the baker directly on WhatsApp with 0% commission.`,
      },
      {
        question: `Do bakers ${place} offer eggless and alcohol-free Christmas cakes?`,
        answer: `Yes! Most local bakers listed on FindMyBites ${place} offer both traditional spiced plum cakes and 100% eggless or alcohol-free holiday gift boxes.`,
      },
      {
        question: `Can I order bulk Christmas hampers for corporate gifting ${place}?`,
        answer: `Yes, filter by Christmas Hampers & Sweets or tap any baker's WhatsApp button to request custom corporate hamper quotes with logo ribbons and doorstep delivery ${place}.`,
      },
    ];
  }
  return [
    {
      question: `How do I book verified ${categoryLabel} ${place}?`,
      answer: `Compare portfolios, live product menus, transparent starting prices, and verified customer reviews for ${categoryLabel} ${place} on FindMyBites × PimpMyParty, then chat directly on WhatsApp.`,
    },
    {
      question: `Is there any booking commission on FindMyBites ${place}?`,
      answer: `No! FindMyBites connects you directly with local ${categoryLabel.toLowerCase()} ${place} via WhatsApp with zero middleman markup.`,
    },
    {
      question: `How far in advance should I book ${categoryLabel.toLowerCase()} ${place}?`,
      answer: `For custom cakes and home bakers, 2–5 days notice is recommended; for weddings, live counters, and full party decor ${place}, booking 2–6 weeks ahead secures your preferred date.`,
    },
  ];
}

export function resolveSeoDirectoryRoute(pathname: string): ResolvedSeoDirectoryRoute | null {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  if (!trimmed) return null;
  const parts = trimmed.split('/').map((p) => {
    try {
      return decodeURIComponent(p).toLowerCase();
    } catch {
      return p.toLowerCase();
    }
  });

  if (parts[0] === 'v' || parts[0] === 'fmb' || parts[0] === 'claim' || parts[0].startsWith('@')) {
    return null;
  }

  let cityEntry: SeoCityEntry | null = null;
  let categoryEntry: SeoCategoryEntry | null = null;

  if (parts.length === 2 && parts[0] === 'city') {
    cityEntry = findSeoCityBySlug(parts[1]);
  } else if (parts.length === 2 && parts[0] === 'category') {
    categoryEntry = findSeoCategoryBySlug(parts[1]);
  } else if (parts.length === 2) {
    cityEntry = findSeoCityBySlug(parts[0]);
    categoryEntry = findSeoCategoryBySlug(parts[1]);
    if (!cityEntry || !categoryEntry) return null;
  } else if (parts.length === 1) {
    cityEntry = findSeoCityBySlug(parts[0]);
    if (!cityEntry) {
      categoryEntry = findSeoCategoryBySlug(parts[0]);
    }
  } else {
    return null;
  }

  if (!cityEntry && !categoryEntry) return null;

  const subject = categoryEntry?.isChristmasHub
    ? 'Christmas Plum Cakes & Festive Bakers'
    : categoryEntry?.displayLabel ||
      categoryEntry?.category ||
      'Bakers, Catering & Party Vendors';

  const canonicalPath =
    cityEntry && categoryEntry
      ? `/${cityEntry.slug}/${categoryEntry.slug}`
      : cityEntry
        ? `/city/${cityEntry.slug}`
        : `/category/${categoryEntry!.slug}`;

  const h1 = cityEntry
    ? `Best ${subject} in ${cityEntry.city}, ${cityEntry.state}`
    : `Top Verified ${subject} Near You`;

  const title = cityEntry
    ? `Best ${subject} in ${cityEntry.city} – Prices, Reviews & WhatsApp | FindMyBites`
    : `${subject} Near You – Menus, Prices & Direct WhatsApp | FindMyBites`;

  const description = cityEntry
    ? `Discover verified ${subject.toLowerCase()} in ${cityEntry.city}, ${cityEntry.country}. View real product catalogs, starting prices, customer reviews & order directly on WhatsApp with 0% commission.`
    : `Compare verified ${subject.toLowerCase()} across India, Dubai, Sri Lanka, Pakistan, Bangladesh & Nepal. Browse full catalogs, prices & direct WhatsApp booking.`;

  const keywords = cityEntry
    ? `${subject.toLowerCase()} in ${cityEntry.city.toLowerCase()}, best ${subject.toLowerCase()} ${cityEntry.city.toLowerCase()}, ${cityEntry.city.toLowerCase()} home bakers, ${cityEntry.state.toLowerCase()} event vendors`
    : `${subject.toLowerCase()} near me, verified ${subject.toLowerCase()}, FindMyBites, PimpMyParty`;

  return {
    cityEntry,
    categoryEntry,
    canonicalPath,
    h1,
    title: title.slice(0, 95),
    description: description.slice(0, 215),
    keywords,
    faqs: buildLocalFaqs(cityEntry?.city ?? null, subject, categoryEntry?.isChristmasHub),
  };
}

export function generateAutoStoreSeo(vendor: Vendor): {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
} {
  const topProds = vendor.products
    .slice(0, 3)
    .map((p) => p.name)
    .join(', ');
  const seasonal = vendor.christmasSpecial ? ' · Christmas Cakes' : '';
  const seoTitle = `${vendor.name} – ${vendor.category} in ${vendor.area}, ${vendor.city}${seasonal}`.slice(
    0,
    98
  );
  const seoDescription =
    `Order from ${vendor.name} in ${vendor.area}, ${vendor.city}, ${vendor.state}. ${
      topProds ? `Popular: ${topProds}. ` : ''
    }View menu prices, photos & chat directly on WhatsApp via FindMyBites.`.slice(0, 215);
  const seoKeywords = [
    vendor.name,
    `${vendor.category} in ${vendor.city}`,
    `${vendor.category} in ${vendor.area}`,
    vendor.christmasSpecial ? `Christmas plum cakes ${vendor.city}` : '',
    ...vendor.specialties.slice(0, 4),
  ]
    .filter(Boolean)
    .join(', ')
    .slice(0, 235);

  return { seoTitle, seoDescription, seoKeywords };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateLiveSitemapXml(
  vendors: Vendor[],
  origin = 'https://www.findmybites.com'
): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls: Array<{ loc: string; priority: string; changefreq: string }> = [
    { loc: `${origin}/`, priority: '1.0', changefreq: 'daily' },
  ];

  // 1. All 24 Category hubs + Christmas hub
  for (const cat of SEO_CATEGORIES) {
    urls.push({
      loc: `${origin}/category/${cat.slug}`,
      priority: '0.85',
      changefreq: 'weekly',
    });
  }

  // 2. Priority City hubs + Top City × Category Programmatic SEO URLs
  const priorityCities = SEO_CITIES.filter((c) => PRIORITY_SEO_CITY_SLUGS.includes(c.slug));
  const topCategories = SEO_CATEGORIES.slice(0, 12).concat(
    SEO_CATEGORIES.filter((c) => c.isChristmasHub)
  );
  for (const city of priorityCities) {
    urls.push({
      loc: `${origin}/city/${city.slug}`,
      priority: '0.85',
      changefreq: 'daily',
    });
    for (const cat of topCategories) {
      urls.push({
        loc: `${origin}/${city.slug}/${cat.slug}`,
        priority: '0.8',
        changefreq: 'weekly',
      });
    }
  }

  // 3. Every Active Vendor Storefront (/v/<slug>) & Bio-Link (/fmb/<handle>)
  const seenLocs = new Set(urls.map((u) => u.loc));
  for (const v of vendors) {
    if (v.status === 'paused' || v.status === 'pending_review') continue;
    const storeLoc = `${origin}/v/${encodeURIComponent(v.slug)}`;
    if (!seenLocs.has(storeLoc)) {
      seenLocs.add(storeLoc);
      urls.push({ loc: storeLoc, priority: '0.9', changefreq: 'weekly' });
    }
    const handle = getVendorBioHandle(v);
    const bioLoc = `${origin}/fmb/${encodeURIComponent(handle)}`;
    if (!seenLocs.has(bioLoc)) {
      seenLocs.add(bioLoc);
      urls.push({ loc: bioLoc, priority: '0.75', changefreq: 'weekly' });
    }
  }

  const body = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
