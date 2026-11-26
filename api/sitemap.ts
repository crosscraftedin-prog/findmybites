// Live Dynamic Sitemap Generator (used by both Vercel /api/sitemap and Express /sitemap.xml)
// Automatically discovers active vendors, cities, localities, and categories from Supabase
// and combines them with Programmatic City × Locality × Category SEO landing pages.

const DEFAULT_SITE_ORIGIN = 'https://www.findmybites.com';

const PRIORITY_CITIES = [
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

const POPULAR_LOCALITIES_BY_CITY: Record<string, string[]> = {
  hyderabad: [
    'jubilee-hills',
    'banjara-hills',
    'gachibowli',
    'madhapur',
    'kondapur',
    'hitech-city',
    'kukatpally',
    'begumpet',
  ],
  secunderabad: ['bolarum', 'sainikpuri', 'yapral', 'trimulgherry', 'alwal', 'marredpally'],
  bengaluru: ['indiranagar', 'koramangala', 'whitefield', 'hsr-layout', 'jayanagar', 'jp-nagar'],
  mumbai: ['bandra', 'powai', 'andheri', 'juhu', 'lower-parel', 'thane-west'],
  'delhi-ncr': ['south-delhi', 'gurugram', 'noida', 'vasant-kunj', 'saket', 'dwarka'],
  chennai: ['anna-nagar', 'adyar', 'velachery', 't-nagar', 'besant-nagar', 'omr'],
  pune: ['koregaon-park', 'baner', 'kothrud', 'viman-nagar', 'wakad', 'kalyani-nagar'],
  kolkata: ['salt-lake', 'park-street', 'ballygunge', 'new-town', 'alipore', 'south-kolkata'],
};

const CORE_CATEGORIES = [
  'cakes-near-me',
  'eggless-cakes',
  'bento-cakes',
  'birthday-cakes',
  'custom-birthday-cakes',
  'custom-cakes',
  'brownies',
  'brownies-near-me',
  'wedding-cakes',
  'home-bakers',
  'cupcakes-and-desserts',
  'bakers-and-cakes',
  'home-bakers-and-cloud-kitchens',
  'catering-services',
  'live-counters-and-food-stalls',
  'bar-mocktails-and-beverage-carts',
  'snack-boxes-and-party-platters',
  'mithai-chocolatiers-and-dates',
  'gifting-hampers-and-return-favors',
  'wedding-and-party-decor',
  'balloon-and-theme-birthday-decor',
  'djs-sound-and-live-bands',
  'photographers-and-videographers',
  'venues-farmhouses-and-villas',
  'photo-booths-and-360-spinners',
  'christmas-cakes',
  'christmas-plum-cakes',
];

const LOCALITY_CATEGORIES = ['home-bakers', 'custom-cakes', 'eggless-cakes', 'birthday-cakes'];

const BUILTIN_VENDOR_SLUGS = [
  { slug: 'saffron-crumb-atelier-mumbai', bio: 'saffron-crumb' },
  { slug: 'chaat-royal-live-delhi', bio: 'chaat-royal-live' },
  { slug: 'velvet-petal-decor-dubai', bio: 'velvet-petal-decor' },
  { slug: 'pop-and-twirl-balloons-bengaluru', bio: 'pop-twirl-balloons' },
  { slug: 'oasis-mocktail-cart-dubai', bio: 'oasis-mocktail-cart' },
  { slug: 'cinnamon-coast-caterers-colombo', bio: 'cinnamon-coast-caterers' },
  { slug: 'shahi-tandoor-lahore', bio: 'shahi-tandoor-lahore' },
  { slug: 'marigold-house-kathmandu', bio: 'marigold-house-kathmandu' },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeSlugSegment(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

interface SupabaseVendorRow {
  slug?: string;
  bio_handle?: string | null;
  city?: string | null;
  area?: string | null;
  category?: string | null;
  service_areas?: string[] | null;
  updated_at?: string | null;
}

interface ActiveCloudVendor {
  slug: string;
  bioHandle?: string;
  citySlug?: string;
  areaSlug?: string;
  categorySlug?: string;
  serviceAreaSlugs: string[];
  lastmod?: string;
}

async function fetchActiveCloudVendors(): Promise<ActiveCloudVendor[]> {
  const supaUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const supaKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supaUrl || !supaKey) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(
      `${supaUrl}/rest/v1/vendors?select=slug,bio_handle,city,area,category,service_areas,updated_at&status=eq.active&order=updated_at.desc&limit=500`,
      {
        headers: {
          apikey: supaKey,
          Authorization: `Bearer ${supaKey}`,
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!resp.ok) return [];
    const rows = (await resp.json()) as SupabaseVendorRow[];
    const out: ActiveCloudVendor[] = [];
    for (const row of rows) {
      const slug = sanitizeSlugSegment(row.slug || '');
      if (!slug) continue;
      const bio = sanitizeSlugSegment(row.bio_handle || '');
      const citySlug = sanitizeSlugSegment(row.city || '');
      const areaSlug = sanitizeSlugSegment(row.area || '');
      const categorySlug = sanitizeSlugSegment(row.category || '');
      const serviceAreaSlugs = Array.isArray(row.service_areas)
        ? row.service_areas.map((s) => sanitizeSlugSegment(String(s || ''))).filter(Boolean)
        : [];
      const lastmod = typeof row.updated_at === 'string' ? row.updated_at.slice(0, 10) : undefined;
      out.push({
        slug,
        bioHandle: bio || undefined,
        citySlug: citySlug || undefined,
        areaSlug: areaSlug || undefined,
        categorySlug: categorySlug || undefined,
        serviceAreaSlugs,
        lastmod,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function buildDynamicSitemapXml(origin = DEFAULT_SITE_ORIGIN): Promise<string> {
  const siteOrigin = origin.replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const cloudVendors = await fetchActiveCloudVendors();

  const seen = new Set<string>();
  const entries: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];

  const pushUrl = (loc: string, priority: string, changefreq: string, lastmod = today) => {
    if (seen.has(loc)) return;
    seen.add(loc);
    entries.push({ loc, lastmod, changefreq, priority });
  };

  // 1. Homepage & Corporate Gifting
  pushUrl(`${siteOrigin}/`, '1.0', 'daily');
  pushUrl(`${siteOrigin}/box-and-bite`, '0.9', 'weekly');

  // 2. Category Hubs
  for (const cat of CORE_CATEGORIES) {
    pushUrl(`${siteOrigin}/category/${cat}`, '0.85', 'weekly');
  }

  // 3. Priority City Hubs + /[city]/[category] + Curated /[city]/[locality]/[category]
  for (const city of PRIORITY_CITIES) {
    pushUrl(`${siteOrigin}/city/${city}`, '0.85', 'daily');
    for (const cat of CORE_CATEGORIES) {
      pushUrl(`${siteOrigin}/${city}/${cat}`, '0.85', 'weekly');
    }
    const localities = POPULAR_LOCALITIES_BY_CITY[city] || [];
    for (const loc of localities) {
      for (const cat of LOCALITY_CATEGORIES) {
        pushUrl(`${siteOrigin}/${city}/${loc}/${cat}`, '0.8', 'weekly');
      }
    }
  }

  // 4. Built-in Showcase Vendors
  for (const v of BUILTIN_VENDOR_SLUGS) {
    pushUrl(`${siteOrigin}/v/${v.slug}`, '0.9', 'weekly');
    pushUrl(`${siteOrigin}/fmb/${v.bio}`, '0.75', 'weekly');
  }

  // 5. Live Cloud Supabase Vendors + Auto-Discovered Cities, Localities & Categories
  for (const v of cloudVendors) {
    const lm = v.lastmod || today;
    pushUrl(`${siteOrigin}/v/${encodeURIComponent(v.slug)}`, '0.95', 'daily', lm);
    if (v.bioHandle) {
      pushUrl(`${siteOrigin}/fmb/${encodeURIComponent(v.bioHandle)}`, '0.8', 'weekly', lm);
    }
    if (v.citySlug) {
      pushUrl(`${siteOrigin}/city/${encodeURIComponent(v.citySlug)}`, '0.85', 'daily', lm);
      if (v.categorySlug) {
        pushUrl(
          `${siteOrigin}/${encodeURIComponent(v.citySlug)}/${encodeURIComponent(v.categorySlug)}`,
          '0.82',
          'weekly',
          lm
        );
      }
      const vendorLocalities = new Set<string>(
        [v.areaSlug, ...v.serviceAreaSlugs].filter(
          (loc): loc is string => Boolean(loc) && loc !== v.citySlug
        )
      );
      for (const loc of vendorLocalities) {
        if (v.categorySlug) {
          pushUrl(
            `${siteOrigin}/${encodeURIComponent(v.citySlug)}/${encodeURIComponent(loc)}/${encodeURIComponent(v.categorySlug)}`,
            '0.8',
            'weekly',
            lm
          );
        }
        if (
          v.categorySlug?.includes('baker') ||
          v.categorySlug?.includes('cake') ||
          v.categorySlug?.includes('dessert')
        ) {
          for (const cat of LOCALITY_CATEGORIES) {
            pushUrl(
              `${siteOrigin}/${encodeURIComponent(v.citySlug)}/${encodeURIComponent(loc)}/${cat}`,
              '0.8',
              'weekly',
              lm
            );
          }
        }
      }
    }
  }

  const xmlBody = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${escapeXml(e.loc)}</loc>\n    <lastmod>${escapeXml(e.lastmod)}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlBody}\n</urlset>\n`;
}

interface VercelRequestLike {
  method?: string;
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  setHeader: (key: string, value: string) => void;
  send: (body: string) => void;
}

export default async function handler(_req: VercelRequestLike, res: VercelResponseLike) {
  const xml = await buildDynamicSitemapXml(DEFAULT_SITE_ORIGIN);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  res.status(200).send(xml);
}
