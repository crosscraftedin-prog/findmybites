// Crawler & Social Preview Pre-Render Endpoint for Search Bots (Googlebot, Bingbot, WhatsApp, etc.)
// Serves rich semantic HTML, exact OpenGraph tags, Breadcrumbs, FAQs, and JSON-LD Schema directly from live Supabase
// while human browsers continue loading the fast interactive React SPA.

const SITE_ORIGIN = 'https://www.findmybites.com';

const COUNTRY_ISO: Record<string, string> = {
  India: 'IN',
  'Dubai / UAE': 'AE',
  'Sri Lanka': 'LK',
  Pakistan: 'PK',
  Bangladesh: 'BD',
  Nepal: 'NP',
};

const COUNTRY_CURRENCY: Record<string, { code: string; rate: number; symbol: string }> = {
  India: { code: 'INR', rate: 84, symbol: '₹' },
  'Dubai / UAE': { code: 'AED', rate: 3.67, symbol: 'AED ' },
  'Sri Lanka': { code: 'LKR', rate: 295, symbol: 'LKR ' },
  Pakistan: { code: 'PKR', rate: 278, symbol: 'PKR ' },
  Bangladesh: { code: 'BDT', rate: 119, symbol: '৳' },
  Nepal: { code: 'NPR', rate: 134, symbol: 'NPR ' },
};

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

function slugifySegment(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function humanizeSlug(slug: string): string {
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

function formatPriceRangeForCountry(priceTier: string, country: string): string {
  const count = Math.max(1, Math.min(4, (priceTier || '$$').length));
  if (country === 'India') return '₹'.repeat(count);
  if (country === 'Bangladesh') return '৳'.repeat(count);
  return '$'.repeat(count);
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
  serviceAreas: string[];
  specialties: string[];
  lat: number;
  lng: number;
  whatsappNumber: string;
  priceTier: string;
  startingPriceUsd: number;
  rating: number;
  reviewCount: number;
  tagline: string;
  description: string;
  image: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  googleMapsUrl?: string;
  instagramUrl?: string;
  products: Array<{
    id: string;
    name: string;
    description: string;
    priceUsd: number;
    inStock?: boolean;
    image?: string;
  }>;
}

function parseSupabaseVendor(row: Record<string, unknown>): VendorRecord | null {
  const slug = typeof row.slug === 'string' ? row.slug.trim() : '';
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!slug || !name) return null;
  const rawProducts = Array.isArray(row.products) ? row.products : [];
  const products = rawProducts
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const p = item as Record<string, unknown>;
      return {
        id: typeof p.id === 'string' ? p.id.trim() : '',
        name: typeof p.name === 'string' && p.name.trim() ? p.name.trim() : 'Signature Cake',
        description: typeof p.description === 'string' ? p.description.trim() : '',
        priceUsd: typeof p.priceUsd === 'number' ? p.priceUsd : 0,
        inStock: p.inStock === false ? false : true,
        image: typeof p.image === 'string' && p.image.trim() ? p.image.trim() : undefined,
      };
    })
    .filter(
      (
        p
      ): p is {
        id: string;
        name: string;
        description: string;
        priceUsd: number;
        inStock: boolean;
        image: string | undefined;
      } => p !== null
    );

  const city = typeof row.city === 'string' && row.city.trim() ? row.city.trim() : 'Hyderabad';
  const serviceAreas = Array.isArray(row.service_areas)
    ? row.service_areas.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];
  const specialties = Array.isArray(row.specialties)
    ? row.specialties.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];

  return {
    slug,
    bioHandle:
      typeof row.bio_handle === 'string' && row.bio_handle.trim() ? row.bio_handle.trim() : slug,
    name,
    category:
      typeof row.category === 'string' && row.category.trim()
        ? row.category.trim()
        : 'Bakers & Cakes',
    marketplace: row.marketplace === 'party' ? 'party' : 'food',
    city,
    state: typeof row.state === 'string' && row.state.trim() ? row.state.trim() : 'Telangana',
    country: typeof row.country === 'string' && row.country.trim() ? row.country.trim() : 'India',
    area: typeof row.area === 'string' && row.area.trim() ? row.area.trim() : city,
    serviceAreas,
    specialties,
    lat: typeof row.lat === 'number' ? row.lat : 17.385,
    lng: typeof row.lng === 'number' ? row.lng : 78.4867,
    whatsappNumber: typeof row.whatsapp_number === 'string' ? row.whatsapp_number : '',
    priceTier: typeof row.price_tier === 'string' ? row.price_tier : '$$',
    startingPriceUsd: typeof row.starting_price_usd === 'number' ? row.starting_price_usd : 8,
    rating: typeof row.rating === 'number' ? row.rating : 5,
    reviewCount: typeof row.review_count === 'number' ? row.review_count : 1,
    tagline: typeof row.tagline === 'string' ? row.tagline : '',
    description: typeof row.description === 'string' ? row.description : '',
    image: typeof row.image === 'string' ? row.image : '',
    seoTitle:
      typeof row.seo_title === 'string' && row.seo_title.trim() ? row.seo_title.trim() : undefined,
    seoDescription:
      typeof row.seo_description === 'string' && row.seo_description.trim()
        ? row.seo_description.trim()
        : undefined,
    seoKeywords:
      typeof row.seo_keywords === 'string' && row.seo_keywords.trim()
        ? row.seo_keywords.trim()
        : undefined,
    googleMapsUrl:
      typeof row.google_maps_url === 'string' && row.google_maps_url.trim()
        ? row.google_maps_url.trim()
        : undefined,
    instagramUrl:
      typeof row.instagram_url === 'string' && row.instagram_url.trim()
        ? row.instagram_url.trim()
        : undefined,
    products,
  };
}

async function queryActiveVendors(
  extraFilter?: { fieldPath: string; value: string },
  limit = 60
): Promise<VendorRecord[]> {
  const supaUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const supaKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supaUrl || !supaKey) return [];

  const params = new URLSearchParams({
    select: '*',
    status: 'eq.active',
    order: 'updated_at.desc',
    limit: String(limit),
  });

  if (extraFilter) {
    const column = extraFilter.fieldPath === 'bioHandle' ? 'bio_handle' : extraFilter.fieldPath;
    params.set(column, `eq.${extraFilter.value}`);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch(`${supaUrl}/rest/v1/vendors?${params.toString()}`, {
      headers: {
        apikey: supaKey,
        Authorization: `Bearer ${supaKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return [];
    const rows = (await resp.json()) as Array<Record<string, unknown>>;
    return rows
      .map((r) => parseSupabaseVendor(r))
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

function buildServesCuisine(vendor: VendorRecord): string[] {
  const out = new Set<string>();
  const lower = vendor.category.toLowerCase();
  if (lower.includes('baker') || lower.includes('cake')) {
    out.add('Bakery');
    out.add('Custom Cakes');
    out.add('Eggless Cakes');
    out.add('Desserts');
  } else if (lower.includes('catering') || lower.includes('counter')) {
    out.add('Indian Catering');
    out.add('Live Counters');
  } else {
    out.add(vendor.category);
  }
  for (const s of vendor.specialties.slice(0, 4)) {
    if (s.trim()) out.add(s.trim());
  }
  return Array.from(out);
}

function renderHtml(params: {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  ogImage: string;
  breadcrumbsHtml: string;
  h1: string;
  introParagraph: string;
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
  <meta property="og:site_name" content="FindMyBites" />
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
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:960px;margin:0 auto;padding:24px;color:#111;line-height:1.6;">
  <header style="padding-bottom:14px;border-bottom:1px solid #e5e7eb;margin-bottom:18px;">
    <a href="${SITE_ORIGIN}/" style="font-weight:800;text-decoration:none;color:#d95b16;font-size:18px;">FindMyBites — 0% Commission Home Bakers &amp; Custom Cakes in India</a>
  </header>
  ${params.breadcrumbsHtml}
  <main>
    <h1>${escapeHtml(params.h1)}</h1>
    <p>${escapeHtml(params.introParagraph)}</p>
    ${params.bodyHtml}
  </main>
  <footer style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#555;">
    <nav aria-label="Popular Cities and Categories">
      <p><strong>Popular Cities:</strong>
        <a href="${SITE_ORIGIN}/hyderabad/home-bakers">Hyderabad</a> ·
        <a href="${SITE_ORIGIN}/secunderabad/home-bakers">Secunderabad</a> ·
        <a href="${SITE_ORIGIN}/bengaluru/eggless-cakes">Bengaluru</a> ·
        <a href="${SITE_ORIGIN}/mumbai/birthday-cakes">Mumbai</a> ·
        <a href="${SITE_ORIGIN}/delhi-ncr/custom-cakes">Delhi NCR</a> ·
        <a href="${SITE_ORIGIN}/chennai/eggless-cakes">Chennai</a> ·
        <a href="${SITE_ORIGIN}/pune/home-bakers">Pune</a> ·
        <a href="${SITE_ORIGIN}/kolkata/custom-birthday-cakes">Kolkata</a>
      </p>
      <p><strong>Top Cake Categories:</strong>
        <a href="${SITE_ORIGIN}/category/eggless-cakes">Eggless Cakes</a> ·
        <a href="${SITE_ORIGIN}/category/bento-cakes">Bento Cakes</a> ·
        <a href="${SITE_ORIGIN}/category/custom-birthday-cakes">Custom Birthday Cakes</a> ·
        <a href="${SITE_ORIGIN}/category/brownies">Brownies</a> ·
        <a href="${SITE_ORIGIN}/category/wedding-cakes">Wedding Cakes</a>
      </p>
    </nav>
    <p>Order direct from local home bakers and party caterers via WhatsApp with 0% commission on <a href="${SITE_ORIGIN}/">FindMyBites.com</a>.</p>
  </footer>
</body>
</html>`;
}

export interface VercelRequestLike {
  query?: Record<string, string | string[] | undefined>;
}

export interface VercelResponseLike {
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

  // Case 1: Vendor Storefront (/v/:slug), Bio-Link (/fmb/:handle), or Short Handle (/@:handle)
  const isAtHandle = segments.length === 1 && segments[0].startsWith('@') && segments[0].length > 1;
  if (isAtHandle || (segments.length === 2 && (segments[0] === 'v' || segments[0] === 'fmb'))) {
    const rawKey = isAtHandle ? segments[0].slice(1) : segments[1];
    const key = rawKey.replace(/[^a-z0-9-]/g, '');
    const isBioMode = isAtHandle || segments[0] === 'fmb';
    const fieldPath = isBioMode ? 'bioHandle' : 'slug';
    let matches = await queryActiveVendors({ fieldPath, value: key }, 2);
    if (matches.length === 0 && isBioMode) {
      matches = await queryActiveVendors({ fieldPath: 'slug', value: key }, 2);
    }
    if (matches.length === 0 && key) {
      const allActive = await queryActiveVendors(undefined, 150);
      const aliasMatch = allActive.find(
        (v) =>
          v.bioHandle.toLowerCase() === key ||
          v.slug.toLowerCase() === key ||
          v.slug.toLowerCase().startsWith(`${key}-`) ||
          v.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') === key
      );
      if (aliasMatch) matches = [aliasMatch];
    }

    const vendor = matches[0];
    if (vendor) {
      const rawItemParam = req.query?.item;
      const itemId = (Array.isArray(rawItemParam) ? rawItemParam[0] : rawItemParam || '').trim();
      const matchedProduct = itemId ? vendor.products.find((p) => p.id === itemId) : undefined;

      const canonical = matchedProduct
        ? `${SITE_ORIGIN}/v/${encodeURIComponent(vendor.slug)}?item=${encodeURIComponent(matchedProduct.id)}`
        : `${SITE_ORIGIN}/v/${encodeURIComponent(vendor.slug)}`;
      const ogImage = safePublicImage(matchedProduct?.image || vendor.image);
      const curr = COUNTRY_CURRENCY[vendor.country] || COUNTRY_CURRENCY.India;
      const isoCountry = COUNTRY_ISO[vendor.country] || 'IN';
      const citySlug = slugifySegment(vendor.city);
      const catSlug = slugifySegment(vendor.category);

      const title = matchedProduct
        ? `${matchedProduct.name} by ${vendor.name} (${vendor.area}, ${vendor.city}) | FindMyBites`
        : vendor.seoTitle ||
          `${vendor.name} – ${vendor.category} in ${vendor.area}, ${vendor.city} | FindMyBites`;
      const description = matchedProduct
        ? `${matchedProduct.description || matchedProduct.name} — Order directly from ${vendor.name} in ${vendor.area}, ${vendor.city} on FindMyBites (0% commission).`
        : vendor.seoDescription ||
          `${vendor.tagline || vendor.description} Order from ${vendor.name} in ${vendor.area}, ${vendor.city}, ${vendor.state} directly on WhatsApp via FindMyBites with 0% commission.`;
      const keywords =
        vendor.seoKeywords ||
        `${matchedProduct ? `${matchedProduct.name}, ` : ''}${vendor.name}, ${vendor.category} in ${vendor.city}, ${vendor.area} ${vendor.category}, home bakers in ${vendor.city}`;

      const isBaker =
        vendor.category.toLowerCase().includes('baker') ||
        vendor.category.toLowerCase().includes('cake') ||
        vendor.category.toLowerCase().includes('dessert');
      const schemaType = isBaker
        ? 'Bakery'
        : vendor.marketplace === 'food'
          ? 'FoodEstablishment'
          : 'LocalBusiness';

      const breadcrumbsHtml = `<nav aria-label="Breadcrumb" style="font-size:13px;color:#555;margin-bottom:12px;">
        <a href="${SITE_ORIGIN}/">Home</a> ›
        <a href="${SITE_ORIGIN}/city/${encodeURIComponent(citySlug)}">${escapeHtml(vendor.city)}</a> ›
        <a href="${SITE_ORIGIN}/${encodeURIComponent(citySlug)}/${encodeURIComponent(catSlug)}">${escapeHtml(vendor.category)}</a> ›
        <span>${escapeHtml(vendor.name)}</span>
      </nav>`;

      const productListHtml = vendor.products.length
        ? `<section><h2>Signature Cakes, Menu &amp; Packages</h2><div style="display:grid;gap:14px;">${vendor.products
            .slice(0, 20)
            .map((p) => {
              const localPrice = Math.round(Math.max(0, p.priceUsd) * curr.rate);
              const altText = `${p.name} by ${vendor.name} - ${vendor.category} in ${vendor.area}, ${vendor.city}`;
              const imgHtml = p.image
                ? `<img src="${escapeHtml(safePublicImage(p.image))}" alt="${escapeHtml(altText)}" width="400" height="300" loading="lazy" style="max-width:200px;height:auto;border-radius:8px;" />`
                : '';
              return `<article style="border:1px solid #e5e7eb;padding:12px;border-radius:10px;">${imgHtml}<h3>${escapeHtml(p.name)} — ${escapeHtml(curr.symbol)}${localPrice.toLocaleString('en-IN')}</h3><p>${escapeHtml(p.description)}</p></article>`;
            })
            .join('')}</div></section>`
        : '';

      const signatureOffers = vendor.products.slice(0, 12).map((p) => {
        const localPrice = Math.round(Math.max(0, p.priceUsd) * curr.rate);
        return {
          '@type': 'Offer',
          price: localPrice,
          priceCurrency: curr.code,
          availability:
            p.inStock === false
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
          itemOffered: {
            '@type': 'Product',
            name: p.name,
            description:
              p.description || `${p.name} by ${vendor.name} in ${vendor.area}, ${vendor.city}`,
            image: safePublicImage(p.image || vendor.image),
            brand: { '@type': 'Brand', name: vendor.name },
            offers: {
              '@type': 'Offer',
              price: localPrice,
              priceCurrency: curr.code,
              availability:
                p.inStock === false
                  ? 'https://schema.org/OutOfStock'
                  : 'https://schema.org/InStock',
            },
          },
        };
      });

      const html = renderHtml({
        title,
        description,
        keywords,
        canonical,
        ogImage,
        breadcrumbsHtml,
        h1: matchedProduct
          ? `${matchedProduct.name} by ${vendor.name} (${vendor.area}, ${vendor.city})`
          : `${vendor.name} · ${vendor.category} in ${vendor.area}, ${vendor.city}`,
        introParagraph: matchedProduct?.description || vendor.description || description,
        bodyHtml: `${productListHtml}<p><a href="${escapeHtml(canonical)}">Order directly on WhatsApp with 0% commission</a></p>`,
        jsonLdList: [
          {
            '@context': 'https://schema.org',
            '@type': schemaType,
            name: vendor.name,
            description: vendor.description,
            url: canonical,
            image: ogImage,
            telephone: vendor.whatsappNumber ? `+${vendor.whatsappNumber}` : undefined,
            priceRange: formatPriceRangeForCountry(vendor.priceTier, vendor.country),
            servesCuisine: buildServesCuisine(vendor),
            sameAs: [vendor.googleMapsUrl, vendor.instagramUrl].filter(Boolean),
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
              addressCountry: isoCountry,
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: vendor.rating,
              reviewCount: Math.max(1, vendor.reviewCount),
            },
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: `${vendor.name} Signature Cakes & Menu`,
              itemListElement: signatureOffers,
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
              {
                '@type': 'ListItem',
                position: 2,
                name: vendor.city,
                item: `${SITE_ORIGIN}/city/${citySlug}`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: vendor.category,
                item: `${SITE_ORIGIN}/${citySlug}/${catSlug}`,
              },
              { '@type': 'ListItem', position: 4, name: vendor.name, item: canonical },
            ],
          },
        ],
      });
      res.status(200).send(html);
      return;
    }
  }

  // Case 2: Programmatic Hyper-Local Directory
  // Pattern 1: /[city]/[category], /city/[city], /category/[category]
  // Pattern 2: /[city]/[locality]/[category]
  let citySlug = '';
  let localitySlug = '';
  let catSlug = '';
  if (segments.length === 3) {
    citySlug = segments[0];
    localitySlug = segments[1];
    catSlug = segments[2];
  } else if (segments.length === 2 && segments[0] === 'city') {
    citySlug = segments[1];
  } else if (segments.length === 2 && segments[0] === 'category') {
    catSlug = segments[1];
  } else if (segments.length === 2) {
    citySlug = segments[0];
    catSlug = segments[1];
  }

  const cityLabel = citySlug ? humanizeSlug(citySlug) : '';
  const localityLabel = localitySlug ? humanizeSlug(localitySlug) : '';
  const isChristmas = catSlug.includes('christmas');
  const catLabel = isChristmas
    ? 'Christmas Plum Cakes & Festive Bakers'
    : catSlug
      ? humanizeSlug(catSlug)
      : 'Home Bakers & Custom Cakes';

  const placeHeading =
    localityLabel && cityLabel
      ? `${localityLabel}, ${cityLabel}`
      : cityLabel || 'India';

  const canonicalPath =
    citySlug && localitySlug && catSlug
      ? `/${citySlug}/${localitySlug}/${catSlug}`
      : citySlug && catSlug
        ? `/${citySlug}/${catSlug}`
        : citySlug
          ? `/city/${citySlug}`
          : catSlug
            ? `/category/${catSlug}`
            : '/';
  const canonical = `${SITE_ORIGIN}${canonicalPath}`;

  const h1 = cityLabel ? `Top ${catLabel} in ${placeHeading}` : `Top ${catLabel} Across India`;
  const title = cityLabel
    ? `Best ${catLabel} in ${placeHeading} | Order Direct from Home Bakers – FindMyBites`
    : `Best ${catLabel} Near You in India | Order Direct from Home Bakers – FindMyBites`;

  const isBakerySpecialty =
    /^(cakes-near-me|birthday-cakes|custom-birthday-cakes|eggless-cakes|bento-cakes|brownies|brownies-near-me|custom-cakes|wedding-cakes|home-bakers|cupcakes-and-desserts)$/.test(
      catSlug
    );
  const activeVendors = await queryActiveVendors(undefined, 100);
  const cityMatching = activeVendors.filter((v) => {
    const cityOk =
      !cityLabel ||
      v.city.toLowerCase().includes(cityLabel.toLowerCase()) ||
      v.state.toLowerCase().includes(cityLabel.toLowerCase()) ||
      (citySlug === 'secunderabad' && v.city.toLowerCase().includes('hyderabad'));
    const catOk =
      !catSlug ||
      isChristmas ||
      (isBakerySpecialty &&
        (v.category.toLowerCase().includes('baker') ||
          v.category.toLowerCase().includes('cake') ||
          v.category.toLowerCase().includes('dessert'))) ||
      slugifySegment(v.category).includes(catSlug);
    return cityOk && catOk;
  });

  // Prioritize vendors serving the exact requested locality
  const sortedMatching = [...cityMatching].sort((a, b) => {
    if (!localityLabel) return 0;
    const locLower = localityLabel.toLowerCase();
    const aHit =
      a.area.toLowerCase().includes(locLower) ||
      a.serviceAreas.some((sa) => sa.toLowerCase().includes(locLower))
        ? 1
        : 0;
    const bHit =
      b.area.toLowerCase().includes(locLower) ||
      b.serviceAreas.some((sa) => sa.toLowerCase().includes(locLower))
        ? 1
        : 0;
    return bHit - aHit;
  });

  const listToRender =
    sortedMatching.length > 0 ? sortedMatching.slice(0, 20) : activeVendors.slice(0, 12);

  const minPriceInr =
    listToRender.length > 0
      ? Math.max(
          250,
          Math.round(
            Math.min(...listToRender.map((v) => Math.max(4, v.startingPriceUsd || 7))) * 84
          )
        )
      : 550;

  const introParagraph = cityLabel
    ? `Looking for fresh ${catLabel.toLowerCase()} in ${placeHeading}? Discover top-rated local home bakers, eggless cake makers, and party food vendors delivering across ${localityLabel ? `${localityLabel} and nearby ${cityLabel} areas` : cityLabel}. Compare transparent INR menus starting from ₹${minPriceInr.toLocaleString('en-IN')}, check doorstep delivery or kitchen pickup availability, and order directly on WhatsApp with 0% commission.`
    : `Discover top-rated ${catLabel.toLowerCase()} across Hyderabad, Secunderabad, Bengaluru, Mumbai, Delhi NCR, Chennai, Pune, Kolkata & across India. Compare menus starting from ₹${minPriceInr.toLocaleString('en-IN')} and order directly via WhatsApp with 0% commission.`;

  const description = introParagraph.slice(0, 210);
  const keywords = cityLabel
    ? `${catLabel.toLowerCase()} in ${placeHeading.toLowerCase()}, eggless cakes ${placeHeading.toLowerCase()}, home bakers in ${cityLabel.toLowerCase()}, custom cakes ${cityLabel.toLowerCase()}, FindMyBites`
    : `${catLabel.toLowerCase()} near me, eggless cakes india, home bakers india, FindMyBites`;

  const faqs = [
    {
      question: `Who are the best eggless home bakers in ${placeHeading}?`,
      answer: `FindMyBites features verified local home bakers in ${placeHeading} specializing in 100% eggless birthday cakes, bento cakes, fudgy brownies, and custom theme cakes with transparent INR pricing and direct WhatsApp ordering.`,
    },
    {
      question: `How do I order a custom cake in ${cityLabel || 'India'} without delivery app markups?`,
      answer: `Browse ${catLabel.toLowerCase()} in ${placeHeading} on FindMyBites and chat directly with the home baker on WhatsApp or use direct store checkout with 0% middleman commission.`,
    },
    {
      question: `What is the starting price for ${catLabel.toLowerCase()} in ${placeHeading}?`,
      answer: `Freshly made ${catLabel.toLowerCase()} from local home bakers in ${placeHeading} start from approximately ₹${minPriceInr.toLocaleString('en-IN')}, with custom designs quoted directly on WhatsApp.`,
    },
    {
      question: `Do bakers in ${placeHeading} offer doorstep delivery and kitchen pickup?`,
      answer: `Yes! Listed home bakers and caterers in ${placeHeading} offer scheduled doorstep delivery across ${cityLabel || 'your city'} as well as direct pickup.`,
    },
  ];

  const breadcrumbItems: Array<Record<string, unknown>> = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
  ];
  let pos = 2;
  if (citySlug) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: pos++,
      name: cityLabel,
      item: `${SITE_ORIGIN}/city/${citySlug}`,
    });
  }
  if (citySlug && localitySlug) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: pos++,
      name: localityLabel,
      item: `${SITE_ORIGIN}/${citySlug}/${localitySlug}/${catSlug || 'home-bakers'}`,
    });
  }
  if (catSlug) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: pos++,
      name: catLabel,
      item: canonical,
    });
  }

  const breadcrumbsHtml = `<nav aria-label="Breadcrumb" style="font-size:13px;color:#555;margin-bottom:12px;">
    <a href="${SITE_ORIGIN}/">Home</a>${
      citySlug
        ? ` › <a href="${SITE_ORIGIN}/city/${encodeURIComponent(citySlug)}">${escapeHtml(cityLabel)}</a>`
        : ''
    }${
      citySlug && localitySlug
        ? ` › <a href="${SITE_ORIGIN}/${encodeURIComponent(citySlug)}/${encodeURIComponent(localitySlug)}/${encodeURIComponent(catSlug || 'home-bakers')}">${escapeHtml(localityLabel)}</a>`
        : ''
    }${catSlug ? ` › <span>${escapeHtml(catLabel)}</span>` : ''}
  </nav>`;

  const listHtml = listToRender.length
    ? `<section><h2>Verified ${escapeHtml(catLabel)} in ${escapeHtml(placeHeading)}</h2><ul>${listToRender
        .map(
          (v) =>
            `<li><article><a href="${SITE_ORIGIN}/v/${encodeURIComponent(v.slug)}"><strong>${escapeHtml(v.name)}</strong></a> — ${escapeHtml(v.category)} in ${escapeHtml(v.area)}, ${escapeHtml(v.city)} (Starting ₹${Math.round(Math.max(4, v.startingPriceUsd || 7) * 84).toLocaleString('en-IN')})</article></li>`
        )
        .join('')}</ul></section>`
    : '';

  const faqHtml = `<section style="margin-top:28px;"><h2>Frequently Asked Questions about ${escapeHtml(catLabel)} in ${escapeHtml(placeHeading)}</h2>${faqs
    .map(
      (f) =>
        `<article style="margin-bottom:14px;"><h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p></article>`
    )
    .join('')}</section>`;

  const html = renderHtml({
    title,
    description,
    keywords,
    canonical,
    ogImage: `${SITE_ORIGIN}/og-cover.png`,
    breadcrumbsHtml,
    h1,
    introParagraph,
    bodyHtml: `${listHtml}${faqHtml}`,
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
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems,
      },
    ],
  });

  res.status(200).send(html);
}
