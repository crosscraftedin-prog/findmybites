// Crawler & Social Preview Pre-Render Endpoint for Search Bots (Googlebot, Bingbot, WhatsApp, etc.)
// Serves rich semantic HTML, exact OpenGraph tags, and JSON-LD Schema directly from live Firestore
// while human browsers continue loading the fast interactive React SPA.

const SITE_ORIGIN = 'https://www.findmybites.com';
const FIREBASE_PROJECT_ID = 'gen-lang-client-0613198330';
const FIRESTORE_DATABASE_ID = 'ai-studio-findmybitespimpm-e62e8cda-3b00-4f15-9a37-e7c06c6009f7';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/-and-/g, ' & ')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface FirestoreField {
  stringValue?: string;
  doubleValue?: number;
  integerValue?: string;
  booleanValue?: boolean;
  arrayValue?: { values?: FirestoreField[] };
  mapValue?: { fields?: Record<string, FirestoreField> };
}

interface FirestoreDoc {
  name?: string;
  fields?: Record<string, FirestoreField>;
}

interface VendorRecord {
  slug: string;
  bioHandle: string;
  name: string;
  category: string;
  marketplace: string;
  city: string;
  state: string;
  country: string;
  area: string;
  lat: number;
  lng: number;
  whatsappNumber: string;
  priceTier: string;
  rating: number;
  reviewCount: number;
  tagline: string;
  description: string;
  image: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  products: Array<{ name: string; description: string; priceUsd: number }>;
}

function strVal(fields: Record<string, FirestoreField>, key: string, fallback = ''): string {
  return fields[key]?.stringValue?.trim() || fallback;
}

function numVal(fields: Record<string, FirestoreField>, key: string, fallback = 0): number {
  const f = fields[key];
  if (!f) return fallback;
  if (typeof f.doubleValue === 'number') return f.doubleValue;
  if (typeof f.integerValue === 'string') return Number(f.integerValue) || fallback;
  return fallback;
}

function parseVendorDoc(doc: FirestoreDoc): VendorRecord | null {
  const f = doc.fields;
  if (!f) return null;
  const slug = strVal(f, 'slug');
  const name = strVal(f, 'name');
  if (!slug || !name) return null;
  const productsRaw = f.products?.arrayValue?.values || [];
  const products = productsRaw
    .map((item) => {
      const pf = item.mapValue?.fields;
      if (!pf) return null;
      return {
        name: strVal(pf, 'name', 'Package'),
        description: strVal(pf, 'description', ''),
        priceUsd: numVal(pf, 'priceUsd', 0),
      };
    })
    .filter((p): p is { name: string; description: string; priceUsd: number } => Boolean(p));

  return {
    slug,
    bioHandle: strVal(f, 'bioHandle', slug),
    name,
    category: strVal(f, 'category', 'Bakers & Cakes'),
    marketplace: strVal(f, 'marketplace', 'food'),
    city: strVal(f, 'city', 'Mumbai'),
    state: strVal(f, 'state', 'Maharashtra'),
    country: strVal(f, 'country', 'India'),
    area: strVal(f, 'area', strVal(f, 'city', 'City Center')),
    lat: numVal(f, 'lat', 19.076),
    lng: numVal(f, 'lng', 72.8777),
    whatsappNumber: strVal(f, 'whatsappNumber', ''),
    priceTier: strVal(f, 'priceTier', '$$'),
    rating: numVal(f, 'rating', 5),
    reviewCount: numVal(f, 'reviewCount', 1),
    tagline: strVal(f, 'tagline', ''),
    description: strVal(f, 'description', ''),
    image: strVal(f, 'image', ''),
    seoTitle: strVal(f, 'seoTitle') || undefined,
    seoDescription: strVal(f, 'seoDescription') || undefined,
    seoKeywords: strVal(f, 'seoKeywords') || undefined,
    products,
  };
}

async function queryActiveVendors(
  extraFilter?: { fieldPath: string; value: string },
  limit = 40
): Promise<VendorRecord[]> {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents:runQuery`;
  const statusFilter = {
    fieldFilter: {
      field: { fieldPath: 'status' },
      op: 'EQUAL',
      value: { stringValue: 'active' },
    },
  };

  const whereClause = extraFilter
    ? {
        compositeFilter: {
          op: 'AND',
          filters: [
            statusFilter,
            {
              fieldFilter: {
                field: { fieldPath: extraFilter.fieldPath },
                op: 'EQUAL',
                value: { stringValue: extraFilter.value },
              },
            },
          ],
        },
      }
    : statusFilter;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'vendors' }],
          where: whereClause,
          limit,
        },
      }),
    });
    clearTimeout(timeout);
    if (!resp.ok) return [];
    const rows = (await resp.json()) as Array<{ document?: FirestoreDoc }>;
    return rows
      .map((r) => (r.document ? parseVendorDoc(r.document) : null))
      .filter((v): v is VendorRecord => Boolean(v));
  } catch {
    return [];
  }
}

function safePublicImage(img?: string): string {
  if (!img || img.startsWith('data:')) return `${SITE_ORIGIN}/og-cover.png`;
  if (img.startsWith('https://') || img.startsWith('http://')) return img;
  return `${SITE_ORIGIN}${img.startsWith('/') ? img : `/${img}`}`;
}

function renderHtml(params: {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  ogImage: string;
  h1: string;
  bodyHtml: string;
  jsonLdList: unknown[];
}): string {
  const jsonLdTags = params.jsonLdList
    .map((schema) => `<script type="application/ld+json">${safeJsonLd(schema)}</script>`)
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.title)}</title>
  <meta name="description" content="${escapeHtml(params.description)}" />
  <meta name="keywords" content="${escapeHtml(params.keywords)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${escapeHtml(params.canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="FindMyBites × PimpMyParty" />
  <meta property="og:title" content="${escapeHtml(params.title)}" />
  <meta property="og:description" content="${escapeHtml(params.description)}" />
  <meta property="og:url" content="${escapeHtml(params.canonical)}" />
  <meta property="og:image" content="${escapeHtml(params.ogImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(params.title)}" />
  <meta name="twitter:description" content="${escapeHtml(params.description)}" />
  <meta name="twitter:image" content="${escapeHtml(params.ogImage)}" />
  ${jsonLdTags}
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:960px;margin:0 auto;padding:24px;color:#111;">
  <header>
    <a href="${SITE_ORIGIN}/" style="font-weight:800;text-decoration:none;color:#d95b16;">FindMyBites × PimpMyParty</a>
  </header>
  <main>
    <h1>${escapeHtml(params.h1)}</h1>
    <p>${escapeHtml(params.description)}</p>
    ${params.bodyHtml}
  </main>
  <footer style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#666;">
    <p>Discover local bakers, home kitchens, caterers &amp; event decor across India, UAE, Sri Lanka, Pakistan, Bangladesh &amp; Nepal on <a href="${SITE_ORIGIN}/">FindMyBites.com</a>.</p>
  </footer>
</body>
</html>`;
}

interface VercelRequestLike {
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  setHeader: (key: string, value: string) => void;
  send: (body: string) => void;
}

function safeDecodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw).toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  const rawPathParam = req.query?.path;
  const rawPath = Array.isArray(rawPathParam) ? rawPathParam[0] || '' : rawPathParam || '';
  const cleanPath = rawPath.replace(/^\/+|\/+$/g, '').slice(0, 180);
  const segments = cleanPath ? cleanPath.split('/').map(safeDecodeSegment) : [];

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');

  // Case 1: Vendor Storefront (/v/:slug) or Bio-Link (/fmb/:handle)
  if (segments.length === 2 && (segments[0] === 'v' || segments[0] === 'fmb')) {
    const key = segments[1].replace(/[^a-z0-9-]/g, '');
    const fieldPath = segments[0] === 'fmb' ? 'bioHandle' : 'slug';
    let matches = await queryActiveVendors({ fieldPath, value: key }, 2);
    if (matches.length === 0 && segments[0] === 'fmb') {
      matches = await queryActiveVendors({ fieldPath: 'slug', value: key }, 2);
    }

    const vendor = matches[0];
    if (vendor) {
      const canonical = `${SITE_ORIGIN}/v/${encodeURIComponent(vendor.slug)}`;
      const ogImage = safePublicImage(vendor.image);
      const title =
        vendor.seoTitle ||
        `${vendor.name} – ${vendor.category} in ${vendor.city} | FindMyBites`;
      const description =
        vendor.seoDescription ||
        `${vendor.tagline || vendor.description} Book ${vendor.name} in ${vendor.area}, ${vendor.city}, ${vendor.state} directly on WhatsApp via FindMyBites.`;
      const keywords =
        vendor.seoKeywords ||
        `${vendor.name}, ${vendor.category} in ${vendor.city}, ${vendor.area} ${vendor.category}`;
      const schemaType = vendor.category.toLowerCase().includes('baker')
        ? 'Bakery'
        : vendor.marketplace === 'food'
          ? 'FoodEstablishment'
          : 'LocalBusiness';

      const productListHtml = vendor.products.length
        ? `<h2>Menu &amp; Packages</h2><ul>${vendor.products
            .map(
              (p) =>
                `<li><strong>${escapeHtml(p.name)}</strong> — ${escapeHtml(p.description)}</li>`
            )
            .join('')}</ul>`
        : '';

      const html = renderHtml({
        title,
        description,
        keywords,
        canonical,
        ogImage,
        h1: `${vendor.name} · ${vendor.category} in ${vendor.area}, ${vendor.city}`,
        bodyHtml: `<p>${escapeHtml(vendor.description)}</p>${productListHtml}<p><a href="${escapeHtml(canonical)}">View full storefront &amp; WhatsApp ordering</a></p>`,
        jsonLdList: [
          {
            '@context': 'https://schema.org',
            '@type': schemaType,
            name: vendor.name,
            description: vendor.description,
            url: canonical,
            image: ogImage,
            telephone: vendor.whatsappNumber ? `+${vendor.whatsappNumber}` : undefined,
            priceRange: vendor.priceTier,
            geo: {
              '@type': 'GeoCoordinates',
              latitude: vendor.lat,
              longitude: vendor.lng,
            },
            address: {
              '@type': 'PostalAddress',
              streetAddress: vendor.area,
              addressLocality: vendor.city,
              addressRegion: vendor.state,
              addressCountry: vendor.country,
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: vendor.rating,
              reviewCount: Math.max(1, vendor.reviewCount),
            },
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: `${vendor.name} Menu & Packages`,
              itemListElement: vendor.products.map((p) => ({
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Product',
                  name: p.name,
                  description: p.description,
                },
                price: p.priceUsd,
                priceCurrency: 'USD',
              })),
            },
          },
        ],
      });
      res.status(200).send(html);
      return;
    }
  }

  // Case 2: Programmatic City × Category Directory (/city/:city, /category/:cat, /:city/:cat)
  let citySlug = '';
  let catSlug = '';
  if (segments.length === 2 && segments[0] === 'city') {
    citySlug = segments[1];
  } else if (segments.length === 2 && segments[0] === 'category') {
    catSlug = segments[1];
  } else if (segments.length === 2) {
    citySlug = segments[0];
    catSlug = segments[1];
  }

  const cityLabel = citySlug ? humanizeSlug(citySlug) : '';
  const isChristmas = catSlug.includes('christmas');
  const catLabel = isChristmas
    ? 'Christmas Plum Cakes & Festive Bakers'
    : catSlug
      ? humanizeSlug(catSlug)
      : 'Bakers, Caterers & Event Vendors';

  const canonicalPath =
    citySlug && catSlug
      ? `/${citySlug}/${catSlug}`
      : citySlug
        ? `/city/${citySlug}`
        : catSlug
          ? `/category/${catSlug}`
          : '/';
  const canonical = `${SITE_ORIGIN}${canonicalPath}`;

  const h1 = cityLabel
    ? `Best ${catLabel} in ${cityLabel}`
    : `Top Verified ${catLabel} Near You`;
  const title = cityLabel
    ? `Best ${catLabel} in ${cityLabel} – Prices, Reviews & WhatsApp | FindMyBites`
    : `${catLabel} Near You – Menus, Prices & Direct WhatsApp | FindMyBites`;
  const description = cityLabel
    ? `Discover verified ${catLabel.toLowerCase()} in ${cityLabel} on FindMyBites × PimpMyParty. Compare menus, prices, customer reviews & order directly on WhatsApp with 0% commission.`
    : `Find verified ${catLabel.toLowerCase()} near you across India, Dubai, Sri Lanka, Pakistan, Bangladesh & Nepal on FindMyBites × PimpMyParty.`;
  const keywords = cityLabel
    ? `${catLabel.toLowerCase()} in ${cityLabel.toLowerCase()}, best ${catLabel.toLowerCase()} ${cityLabel.toLowerCase()}, FindMyBites`
    : `${catLabel.toLowerCase()} near me, FindMyBites, PimpMyParty`;

  const activeVendors = await queryActiveVendors(undefined, 60);
  const matching = activeVendors.filter((v) => {
    const cityOk = !cityLabel || v.city.toLowerCase().includes(cityLabel.toLowerCase()) || v.state.toLowerCase().includes(cityLabel.toLowerCase());
    const catOk =
      !catSlug ||
      isChristmas ||
      v.category.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').includes(catSlug);
    return cityOk && catOk;
  });

  const listToRender = matching.length > 0 ? matching.slice(0, 20) : activeVendors.slice(0, 12);
  const listHtml = listToRender.length
    ? `<h2>Verified Listings</h2><ul>${listToRender
        .map(
          (v) =>
            `<li><a href="${SITE_ORIGIN}/v/${encodeURIComponent(v.slug)}">${escapeHtml(v.name)}</a> — ${escapeHtml(v.category)} in ${escapeHtml(v.area)}, ${escapeHtml(v.city)}</li>`
        )
        .join('')}</ul>`
    : '';

  const html = renderHtml({
    title,
    description,
    keywords,
    canonical,
    ogImage: `${SITE_ORIGIN}/og-cover.png`,
    h1,
    bodyHtml: listHtml,
    jsonLdList: [
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: h1,
        numberOfItems: listToRender.length,
        itemListElement: listToRender.map((v, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `${SITE_ORIGIN}/v/${v.slug}`,
          name: v.name,
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
          ...(citySlug
            ? [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: cityLabel,
                  item: `${SITE_ORIGIN}/city/${citySlug}`,
                },
              ]
            : []),
          ...(catSlug
            ? [
                {
                  '@type': 'ListItem',
                  position: citySlug ? 3 : 2,
                  name: catLabel,
                  item: canonical,
                },
              ]
            : []),
        ],
      },
    ],
  });

  res.status(200).send(html);
}
