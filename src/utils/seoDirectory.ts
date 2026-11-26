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
  shortLabel?: string;
  searchKeyword?: string;
  quickTag?: QuickFilterTag;
  startingPriceInr?: string;
}

export interface ResolvedSeoDirectoryRoute {
  cityEntry: SeoCityEntry | null;
  localitySlug: string | null;
  localityName: string | null;
  categoryEntry: SeoCategoryEntry | null;
  canonicalPath: string;
  h1: string;
  title: string;
  description: string;
  introParagraph: string;
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

export function humanizeSeoSegment(slug: string): string {
  return slug
    .replace(/-and-/g, ' & ')
    .split('-')
    .filter(Boolean)
    .map((w) => {
      if (w === 'ncr' || w === 'hsr' || w === 'jp' || w === 'btm' || w === 'dlf') {
        return w.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
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
  'box-and-bite',
  'pricing-kit',
]);

// Curated popular hyper-local Indian neighborhoods for internal linking & programmatic sitemap
export const POPULAR_LOCALITIES_BY_CITY: Record<string, string[]> = {
  hyderabad: [
    'Jubilee Hills',
    'Banjara Hills',
    'Gachibowli',
    'Madhapur',
    'Kondapur',
    'Hitech City',
    'Kukatpally',
    'Begumpet',
  ],
  secunderabad: [
    'Bolarum',
    'Sainikpuri',
    'Yapral',
    'Trimulgherry',
    'Alwal',
    'Marredpally',
  ],
  bengaluru: [
    'Indiranagar',
    'Koramangala',
    'Whitefield',
    'HSR Layout',
    'Jayanagar',
    'JP Nagar',
  ],
  mumbai: [
    'Bandra',
    'Powai',
    'Andheri',
    'Juhu',
    'Lower Parel',
    'Thane West',
  ],
  'delhi-ncr': [
    'South Delhi',
    'Gurugram',
    'Noida',
    'Vasant Kunj',
    'Saket',
    'Dwarka',
  ],
  chennai: [
    'Anna Nagar',
    'Adyar',
    'Velachery',
    'T Nagar',
    'Besant Nagar',
    'OMR',
  ],
  pune: [
    'Koregaon Park',
    'Baner',
    'Kothrud',
    'Viman Nagar',
    'Wakad',
    'Kalyani Nagar',
  ],
  kolkata: [
    'Salt Lake',
    'Park Street',
    'Ballygunge',
    'New Town',
    'Alipore',
    'South Kolkata',
  ],
};

// Top 8 Indian SEO city hubs for footer internal linking & hyper-local discovery
export const TOP_INDIA_SEO_CITY_SLUGS = [
  'hyderabad',
  'secunderabad',
  'bengaluru',
  'mumbai',
  'delhi-ncr',
  'chennai',
  'pune',
  'kolkata',
] as const;

// Top cake & baker categories for footer & hub internal linking
export const TOP_CAKE_SEO_CATEGORY_SLUGS = [
  'eggless-cakes',
  'bento-cakes',
  'custom-birthday-cakes',
  'brownies',
  'wedding-cakes',
  'home-bakers',
  'custom-cakes',
] as const;

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
    startingPriceInr: category.toLowerCase().includes('baker') ? '₹450' : '₹1,499',
  })),
  {
    slug: 'cakes-near-me',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Custom Cakes & Home Bakers',
    shortLabel: 'Custom Cakes',
    startingPriceInr: '₹550',
  },
  {
    slug: 'birthday-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Birthday Cakes & Theme Cakes',
    shortLabel: 'Birthday Cakes',
    searchKeyword: 'birthday',
    startingPriceInr: '₹650',
  },
  {
    slug: 'custom-birthday-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Custom Birthday Cakes',
    shortLabel: 'Custom Birthday Cakes',
    searchKeyword: 'birthday',
    startingPriceInr: '₹750',
  },
  {
    slug: 'eggless-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Eggless Cakes',
    shortLabel: 'Eggless Cakes',
    quickTag: 'Eggless',
    startingPriceInr: '₹550',
  },
  {
    slug: 'bento-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Bento Cakes',
    shortLabel: 'Bento Cakes',
    searchKeyword: 'bento',
    startingPriceInr: '₹350',
  },
  {
    slug: 'brownies',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Fudgy Brownies & Dessert Boxes',
    shortLabel: 'Brownies',
    searchKeyword: 'brownie',
    startingPriceInr: '₹400',
  },
  {
    slug: 'brownies-near-me',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Fudgy Brownies & Dessert Boxes',
    shortLabel: 'Brownies',
    searchKeyword: 'brownie',
    startingPriceInr: '₹400',
  },
  {
    slug: 'custom-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Custom Cakes',
    shortLabel: 'Custom Cakes',
    searchKeyword: 'custom',
    startingPriceInr: '₹750',
  },
  {
    slug: 'wedding-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Wedding Cakes',
    shortLabel: 'Wedding Cakes',
    quickTag: 'Wedding Ready',
    searchKeyword: 'wedding',
    startingPriceInr: '₹2,500',
  },
  {
    slug: 'home-bakers',
    category: 'Home Bakers & Cloud Kitchens',
    marketplace: 'food',
    displayLabel: 'Home Bakers',
    shortLabel: 'Home Bakers',
    startingPriceInr: '₹450',
  },
  {
    slug: 'cupcakes-and-desserts',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Cupcakes, Cheesecakes & Dessert Jars',
    shortLabel: 'Cupcakes & Desserts',
    searchKeyword: 'cupcake',
    startingPriceInr: '₹450',
  },
  {
    slug: 'christmas-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Christmas Plum Cakes',
    shortLabel: 'Christmas Cakes',
    isChristmasHub: true,
    startingPriceInr: '₹650',
  },
  {
    slug: 'christmas-plum-cakes',
    category: 'Bakers & Cakes',
    marketplace: 'food',
    displayLabel: 'Christmas Plum Cakes',
    shortLabel: 'Christmas Plum Cakes',
    isChristmasHub: true,
    startingPriceInr: '₹650',
  },
];

// Top high-traffic priority cities for sitemap & cross-linking spider web
export const PRIORITY_SEO_CITY_SLUGS = [
  'hyderabad',
  'secunderabad',
  'bengaluru',
  'mumbai',
  'delhi-ncr',
  'chennai',
  'pune',
  'kolkata',
  'kochi',
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

export function buildCityLocalityCategoryPath(
  cityName: string,
  localityName: string,
  categoryName: string
): string {
  return `/${slugifySeoSegment(cityName)}/${slugifySeoSegment(localityName)}/${slugifySeoSegment(categoryName)}`;
}

export function buildLocalFaqs(
  cityName: string | null,
  localityName: string | null,
  categoryLabel: string,
  startingPriceInr = '₹550',
  isChristmasHub?: boolean
): Array<{ question: string; answer: string }> {
  const areaLabel = localityName
    ? `${localityName}${cityName ? `, ${cityName}` : ''}`
    : cityName || 'your area';
  const cityLabel = cityName || 'your city';

  if (isChristmasHub) {
    return [
      {
        question: `Who are the best eggless Christmas plum cake home bakers in ${areaLabel}?`,
        answer: `FindMyBites lists verified home bakers in ${areaLabel} offering both traditional rum-soaked plum cakes and 100% eggless, alcohol-free Christmas hampers. Compare real 1 kg prices starting around ${startingPriceInr} and order directly on WhatsApp with 0% commission.`,
      },
      {
        question: `How do I order a custom Christmas cake in ${cityLabel} without delivery app markups?`,
        answer: `Browse local bakers in ${areaLabel} on FindMyBites, pick your cake weight or hamper box, and click WhatsApp to confirm directly with the baker at true bakery prices — zero middleman commission.`,
      },
      {
        question: `Do bakers in ${areaLabel} offer doorstep delivery and bulk corporate Christmas hampers?`,
        answer: `Yes! Most local home bakers in ${areaLabel} provide scheduled doorstep delivery and custom-ribbon corporate gifting boxes across ${cityLabel}.`,
      },
    ];
  }

  return [
    {
      question: `Who are the best eggless home bakers in ${areaLabel}?`,
      answer: `On FindMyBites, you can explore top-rated verified home bakers and cake artists in ${areaLabel} who specialize in 100% eggless custom birthday cakes, bento cakes, fudgy brownies, and theme tiers — with transparent INR menus and direct WhatsApp chat.`,
    },
    {
      question: `How do I order a custom cake in ${cityLabel} without delivery app markups?`,
      answer: `Unlike aggregator apps that add 25–35% platform markups, FindMyBites connects you directly to ${categoryLabel.toLowerCase()} in ${areaLabel} via WhatsApp or direct store checkout with 0% commission.`,
    },
    {
      question: `What is the starting price for ${categoryLabel.toLowerCase()} in ${areaLabel}?`,
      answer: `Freshly made ${categoryLabel.toLowerCase()} from local home bakers and vendors in ${areaLabel} typically start around ${startingPriceInr} for half-kg cakes, bento cakes, or brownie boxes, with custom fondant, photo, and tiered designs quoted directly on WhatsApp.`,
    },
    {
      question: `Is doorstep delivery or pickup available for ${categoryLabel.toLowerCase()} in ${areaLabel}?`,
      answer: `Yes! Most listed bakers and caterers in ${areaLabel} offer both scheduled doorstep delivery across ${cityLabel} and direct kitchen pickup. Pre-ordering 24–48 hours in advance is recommended for custom designs.`,
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

  if (
    parts[0] === 'v' ||
    parts[0] === 'fmb' ||
    parts[0] === 'claim' ||
    parts[0] === 'api' ||
    parts[0] === 'assets' ||
    parts[0].startsWith('@')
  ) {
    return null;
  }

  let cityEntry: SeoCityEntry | null = null;
  let localitySlug: string | null = null;
  let localityName: string | null = null;
  let categoryEntry: SeoCategoryEntry | null = null;

  if (parts.length === 3) {
    // Pattern 2: /[city]/[locality]/[category]
    cityEntry = findSeoCityBySlug(parts[0]);
    categoryEntry = findSeoCategoryBySlug(parts[2]);
    const cleanLocality = slugifySeoSegment(parts[1]);
    if (!cityEntry || !categoryEntry || !cleanLocality || RESERVED_TOP_LEVEL_SLUGS.has(cleanLocality)) {
      return null;
    }
    localitySlug = cleanLocality;
    const knownLocalities = POPULAR_LOCALITIES_BY_CITY[cityEntry.slug] || [];
    const matchedKnown = knownLocalities.find((loc) => slugifySeoSegment(loc) === cleanLocality);
    localityName = matchedKnown || humanizeSeoSegment(cleanLocality);
  } else if (parts.length === 2 && parts[0] === 'city') {
    cityEntry = findSeoCityBySlug(parts[1]);
  } else if (parts.length === 2 && parts[0] === 'category') {
    categoryEntry = findSeoCategoryBySlug(parts[1]);
  } else if (parts.length === 2) {
    // Pattern 1: /[city]/[category]
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
    : categoryEntry?.shortLabel ||
      categoryEntry?.displayLabel ||
      categoryEntry?.category ||
      'Home Bakers, Custom Cakes & Party Vendors';

  const startingPriceInr = categoryEntry?.startingPriceInr || '₹550';

  const canonicalPath =
    cityEntry && localitySlug && categoryEntry
      ? `/${cityEntry.slug}/${localitySlug}/${categoryEntry.slug}`
      : cityEntry && categoryEntry
        ? `/${cityEntry.slug}/${categoryEntry.slug}`
        : cityEntry
          ? `/city/${cityEntry.slug}`
          : `/category/${categoryEntry!.slug}`;

  const placeHeading =
    localityName && cityEntry
      ? `${localityName}, ${cityEntry.city}`
      : cityEntry
        ? cityEntry.city
        : 'India';

  const h1 = cityEntry
    ? `Top ${subject} in ${placeHeading}`
    : `Top ${subject} Across India`;

  const title = cityEntry
    ? `Best ${subject} in ${placeHeading} | Order Direct from Home Bakers – FindMyBites`
    : `Best ${subject} Near You in India | Order Direct from Home Bakers – FindMyBites`;

  const introParagraph = cityEntry
    ? `Looking for fresh ${subject.toLowerCase()} in ${placeHeading}? Browse verified local home bakers, eggless cake artists, and party food makers delivering across ${localityName ? `${localityName} and nearby ${cityEntry.city} neighbourhoods` : `${cityEntry.city}, ${cityEntry.state}`}. Compare transparent INR menus starting from ${startingPriceInr}, check doorstep delivery or kitchen pickup slots, and order directly on WhatsApp with 0% middleman commission.`
    : `Discover top-rated ${subject.toLowerCase()} across Hyderabad, Secunderabad, Bengaluru, Mumbai, Delhi NCR, Chennai, Pune, Kolkata & beyond. View freshly baked menus starting from ${startingPriceInr} and order directly from local home bakers on WhatsApp with 0% commission.`;

  const description = introParagraph.slice(0, 210);

  const keywords = cityEntry
    ? [
        `${subject.toLowerCase()} in ${placeHeading.toLowerCase()}`,
        `best ${subject.toLowerCase()} ${cityEntry.city.toLowerCase()}`,
        localityName ? `eggless cakes ${localityName.toLowerCase()}` : '',
        localityName ? `home bakers in ${localityName.toLowerCase()}` : '',
        `home bakers in ${cityEntry.city.toLowerCase()}`,
        `cakes near me ${cityEntry.city.toLowerCase()}`,
        'FindMyBites',
      ]
        .filter(Boolean)
        .join(', ')
    : `${subject.toLowerCase()} near me, eggless cakes india, home bakers india, custom birthday cakes, FindMyBites`;

  return {
    cityEntry,
    localitySlug,
    localityName,
    categoryEntry,
    canonicalPath,
    h1,
    title: title.slice(0, 110),
    description,
    introParagraph,
    keywords,
    faqs: buildLocalFaqs(
      cityEntry?.city ?? null,
      localityName,
      subject,
      startingPriceInr,
      categoryEntry?.isChristmasHub
    ),
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
  const seoTitle = `${vendor.name} – ${vendor.category} in ${vendor.area}, ${vendor.city}${seasonal} | FindMyBites`.slice(
    0,
    98
  );
  const seoDescription =
    `Order from ${vendor.name} in ${vendor.area}, ${vendor.city}, ${vendor.state}. ${
      topProds ? `Popular: ${topProds}. ` : ''
    }View INR menu prices, cake photos & chat directly on WhatsApp with 0% commission on FindMyBites.`.slice(
      0,
      215
    );
  const seoKeywords = [
    vendor.name,
    `${vendor.category} in ${vendor.city}`,
    `${vendor.category} in ${vendor.area}`,
    `home bakers in ${vendor.area}`,
    `cakes in ${vendor.city}`,
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
  const seenLocs = new Set<string>([`${origin}/`]);

  const pushUrl = (loc: string, priority: string, changefreq: string) => {
    if (seenLocs.has(loc)) return;
    seenLocs.add(loc);
    urls.push({ loc, priority, changefreq });
  };

  // 1. All Category hubs
  for (const cat of SEO_CATEGORIES) {
    pushUrl(`${origin}/category/${cat.slug}`, '0.85', 'weekly');
  }

  // 2. Priority City hubs + Top City × Category Programmatic SEO URLs
  const priorityCities = SEO_CITIES.filter((c) => PRIORITY_SEO_CITY_SLUGS.includes(c.slug));
  const topCategorySlugs = new Set<string>([
    ...TOP_CAKE_SEO_CATEGORY_SLUGS,
    'cakes-near-me',
    'birthday-cakes',
    'catering-services',
    'live-counters-and-food-stalls',
    'bar-mocktails-and-beverage-carts',
    'christmas-cakes',
  ]);
  const topCategories = SEO_CATEGORIES.filter((c) => topCategorySlugs.has(c.slug));

  for (const city of priorityCities) {
    pushUrl(`${origin}/city/${city.slug}`, '0.85', 'daily');
    for (const cat of topCategories) {
      pushUrl(`${origin}/${city.slug}/${cat.slug}`, '0.85', 'weekly');
    }
    // Curated hyper-local /[city]/[locality]/[category] pages
    const localities = POPULAR_LOCALITIES_BY_CITY[city.slug] || [];
    for (const loc of localities) {
      const locSlug = slugifySeoSegment(loc);
      if (!locSlug) continue;
      for (const catSlug of ['home-bakers', 'custom-cakes', 'eggless-cakes', 'birthday-cakes']) {
        pushUrl(`${origin}/${city.slug}/${locSlug}/${catSlug}`, '0.8', 'weekly');
      }
    }
  }

  // 3. Every Active Vendor Storefront (/v/<slug>), Bio-Link (/fmb/<handle>), & Dynamic Vendor Localities
  for (const v of vendors) {
    if (v.status === 'paused' || v.status === 'pending_review') continue;
    pushUrl(`${origin}/v/${encodeURIComponent(v.slug)}`, '0.95', 'daily');
    const handle = getVendorBioHandle(v);
    if (handle) {
      pushUrl(`${origin}/fmb/${encodeURIComponent(handle)}`, '0.75', 'weekly');
    }
    const citySlug = slugifySeoSegment(v.city);
    const areaSlug = slugifySeoSegment(v.area);
    const catSlug = slugifySeoSegment(v.category);
    if (citySlug && catSlug) {
      pushUrl(`${origin}/${citySlug}/${catSlug}`, '0.8', 'weekly');
      if (areaSlug && areaSlug !== citySlug) {
        pushUrl(`${origin}/${citySlug}/${areaSlug}/${catSlug}`, '0.78', 'weekly');
        if (v.category.toLowerCase().includes('baker') || v.category.toLowerCase().includes('cake')) {
          pushUrl(`${origin}/${citySlug}/${areaSlug}/home-bakers`, '0.78', 'weekly');
          pushUrl(`${origin}/${citySlug}/${areaSlug}/custom-cakes`, '0.78', 'weekly');
          pushUrl(`${origin}/${citySlug}/${areaSlug}/eggless-cakes`, '0.78', 'weekly');
        }
      }
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
