// Live Vercel Serverless Dynamic Sitemap Generator
// Queries active storefronts from Firestore REST API (:runQuery with status == 'active')
// and combines them with Programmatic City × Category SEO pages.

const SITE_ORIGIN = 'https://www.findmybites.com';
const FIREBASE_PROJECT_ID = 'gen-lang-client-0613198330';
const FIRESTORE_DATABASE_ID = 'ai-studio-findmybitespimpm-e62e8cda-3b00-4f15-9a37-e7c06c6009f7';

const PRIORITY_CITIES = [
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

const CORE_CATEGORIES = [
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
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

interface SupabaseVendorSlugRow {
  slug?: string;
  bio_handle?: string | null;
  updated_at?: string | null;
}

async function fetchActiveCloudVendors(): Promise<
  Array<{ slug: string; bioHandle?: string; lastmod?: string }>
> {
  const supaUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const supaKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supaUrl || !supaKey) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(
      `${supaUrl}/rest/v1/vendors?select=slug,bio_handle,updated_at&status=eq.active&order=updated_at.desc&limit=500`,
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
    const rows = (await resp.json()) as SupabaseVendorSlugRow[];
    const out: Array<{ slug: string; bioHandle?: string; lastmod?: string }> = [];
    for (const row of rows) {
      const slug = sanitizeSlugSegment(row.slug || '');
      if (!slug) continue;
      const bio = sanitizeSlugSegment(row.bio_handle || '');
      const lastmod = typeof row.updated_at === 'string' ? row.updated_at.slice(0, 10) : undefined;
      out.push({ slug, bioHandle: bio || undefined, lastmod });
    }
    return out;
  } catch {
    return [];
  }
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
  const today = new Date().toISOString().slice(0, 10);
  const cloudVendors = await fetchActiveCloudVendors();

  const seen = new Set<string>();
  const entries: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [];

  const pushUrl = (loc: string, priority: string, changefreq: string, lastmod = today) => {
    if (seen.has(loc)) return;
    seen.add(loc);
    entries.push({ loc, lastmod, changefreq, priority });
  };

  // 1. Homepage
  pushUrl(`${SITE_ORIGIN}/`, '1.0', 'daily');

  // 2. Category Hubs
  for (const cat of CORE_CATEGORIES) {
    pushUrl(`${SITE_ORIGIN}/category/${cat}`, '0.85', 'weekly');
  }

  // 3. Priority City Hubs + City × Category Matrix
  for (const city of PRIORITY_CITIES) {
    pushUrl(`${SITE_ORIGIN}/city/${city}`, '0.85', 'daily');
    for (const cat of CORE_CATEGORIES) {
      pushUrl(`${SITE_ORIGIN}/${city}/${cat}`, '0.8', 'weekly');
    }
  }

  // 4. Built-in Showcase Vendors
  for (const v of BUILTIN_VENDOR_SLUGS) {
    pushUrl(`${SITE_ORIGIN}/v/${v.slug}`, '0.9', 'weekly');
    pushUrl(`${SITE_ORIGIN}/fmb/${v.bio}`, '0.75', 'weekly');
  }

  // 5. Live Cloud Firestore Vendors (auto-discovered!)
  for (const v of cloudVendors) {
    pushUrl(`${SITE_ORIGIN}/v/${encodeURIComponent(v.slug)}`, '0.95', 'daily', v.lastmod || today);
    if (v.bioHandle) {
      pushUrl(
        `${SITE_ORIGIN}/fmb/${encodeURIComponent(v.bioHandle)}`,
        '0.8',
        'weekly',
        v.lastmod || today
      );
    }
  }

  const xmlBody = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${escapeXml(e.loc)}</loc>\n    <lastmod>${escapeXml(e.lastmod)}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlBody}\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  res.status(200).send(xml);
}
