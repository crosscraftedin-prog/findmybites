import { useEffect } from 'react';
import {
  COUNTRY_DEFAULT_CURRENCY,
  DEFAULT_SITE_SETTINGS,
  LaunchCountry,
  SiteSettings,
  Vendor,
  usdToLocal,
} from '../data/vendors';
import {
  ResolvedSeoDirectoryRoute,
  slugifySeoSegment,
} from '../utils/seoDirectory';

interface SeoMetaOptions {
  activeVendor: Vendor | null;
  seoDirectoryRoute?: ResolvedSeoDirectoryRoute | null;
  matchingVendors?: Vendor[];
  siteSettings?: SiteSettings;
  selectedCategory: string;
  selectedCountry: LaunchCountry;
  selectedState: string;
  ecosystem: 'FINDMYBITES' | 'PIMPMYPARTY';
}

const COUNTRY_ISO_CODE: Record<string, string> = {
  India: 'IN',
  'Dubai / UAE': 'AE',
  'Sri Lanka': 'LK',
  Pakistan: 'PK',
  Bangladesh: 'BD',
  Nepal: 'NP',
};

function formatPriceRangeForCountry(priceTier: string, country: string): string {
  const count = Math.max(1, Math.min(4, (priceTier || '$$').length));
  if (country === 'India') return '₹'.repeat(count);
  if (country === 'Bangladesh') return '৳'.repeat(count);
  return '$'.repeat(count);
}

function buildServesCuisine(vendor: Vendor): string[] {
  const items = new Set<string>();
  const catLower = vendor.category.toLowerCase();
  if (catLower.includes('baker') || catLower.includes('cake')) {
    items.add('Bakery');
    items.add('Custom Cakes');
    items.add('Eggless Cakes');
    items.add('Desserts');
  } else if (catLower.includes('catering') || catLower.includes('counter')) {
    items.add('Indian Catering');
    items.add('Live Food Counters');
    items.add('Party Food');
  } else if (catLower.includes('bar') || catLower.includes('mocktail')) {
    items.add('Mocktails & Beverages');
  } else {
    items.add(vendor.category);
  }
  for (const spec of vendor.specialties.slice(0, 4)) {
    if (spec.trim()) items.add(spec.trim());
  }
  return Array.from(items);
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertJsonLd(id: string, payload: Record<string, unknown> | null) {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (!payload) {
    existing?.remove();
    return;
  }
  const script = existing ?? document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(payload);
  if (!existing) {
    document.head.appendChild(script);
  }
}

export function useSeoMeta({
  activeVendor,
  seoDirectoryRoute = null,
  matchingVendors = [],
  siteSettings = DEFAULT_SITE_SETTINGS,
  selectedCategory,
  selectedCountry,
  selectedState,
  ecosystem,
}: SeoMetaOptions) {
  useEffect(() => {
    const origin = window.location.origin;
    const baseUrl = origin + window.location.pathname;

    let title = siteSettings.siteTitle || DEFAULT_SITE_SETTINGS.siteTitle;
    let description = siteSettings.siteDescription || DEFAULT_SITE_SETTINGS.siteDescription;
    let keywords = siteSettings.siteKeywords || DEFAULT_SITE_SETTINGS.siteKeywords;
    let canonical = baseUrl;

    if (activeVendor) {
      const isPartyVendor = activeVendor.marketplace === 'party';
      const isBakerVendor =
        !isPartyVendor &&
        (activeVendor.category.toLowerCase().includes('baker') ||
          activeVendor.category.toLowerCase().includes('cake') ||
          activeVendor.category.toLowerCase().includes('dessert'));
      const brandLabel = isPartyVendor ? 'PimpMyParty by FindMyBites' : 'FindMyBites';
      title =
        activeVendor.seoTitle?.trim() ||
        `${activeVendor.name} – ${activeVendor.category} in ${activeVendor.area}, ${activeVendor.city} | ${brandLabel}`;
      description =
        activeVendor.seoDescription?.trim() ||
        `${activeVendor.tagline} ${isPartyVendor ? 'Book' : 'Order from'} ${activeVendor.name} in ${activeVendor.area}, ${activeVendor.city}, ${activeVendor.state} directly on WhatsApp with 0% commission via ${brandLabel}.`;
      keywords =
        activeVendor.seoKeywords?.trim() ||
        (isPartyVendor
          ? `${activeVendor.name}, ${activeVendor.category} in ${activeVendor.city}, ${activeVendor.area} ${activeVendor.category.toLowerCase()}, event vendors in ${activeVendor.city}, PimpMyParty`
          : isBakerVendor
            ? `${activeVendor.name}, ${activeVendor.category} in ${activeVendor.city}, ${activeVendor.area} ${activeVendor.category.toLowerCase()}, home bakers in ${activeVendor.city}`
            : `${activeVendor.name}, ${activeVendor.category} in ${activeVendor.city}, ${activeVendor.area} ${activeVendor.category.toLowerCase()}, party catering in ${activeVendor.city}`);
      canonical = `${origin}/v/${activeVendor.slug}`;
    } else if (seoDirectoryRoute) {
      title = seoDirectoryRoute.title;
      description = seoDirectoryRoute.description;
      keywords = seoDirectoryRoute.keywords;
      canonical = `${origin}${seoDirectoryRoute.canonicalPath}`;
    } else if (selectedCategory !== 'All' || selectedState !== 'All' || ecosystem === 'PIMPMYPARTY') {
      const isPartyMode = ecosystem === 'PIMPMYPARTY';
      const subject =
        selectedCategory !== 'All'
          ? selectedCategory
          : ecosystem === 'FINDMYBITES'
            ? 'Home Bakers, Custom Cakes & Catering'
            : 'Wedding Decor, Event Planners, DJs & Party Vendors';
      const placeParts = [
        selectedState !== 'All' ? selectedState : '',
        selectedCountry !== 'All' ? selectedCountry : '',
      ].filter(Boolean);
      const place = placeParts.length > 0 ? ` in ${placeParts.join(', ')}` : ' in India';
      title = isPartyMode
        ? `Best ${subject}${place} | Book Direct – PimpMyParty`
        : `Best ${subject}${place} | Order Direct – FindMyBites`;
      description = isPartyMode
        ? `Compare verified ${subject.toLowerCase()}${place}. View transparent INR event packages, starting prices, reviews & book directly on WhatsApp with 0% commission.`
        : `Compare verified ${subject.toLowerCase()}${place}. View real INR product menus, starting prices, reviews & order directly on WhatsApp with 0% commission.`;
    } else {
      // Preserve exact homepage SEO title, description & canonical when on root homepage
      canonical = `${origin}/`;
    }

    const resolvePublicImage = (img?: string) => {
      if (!img || img.startsWith('data:')) return `${origin}/og-cover.png`;
      if (img.startsWith('http://') || img.startsWith('https://')) return img;
      return `${origin}${img.startsWith('/') ? img : `/${img}`}`;
    };

    const ogImage = activeVendor ? resolvePublicImage(activeVendor.image) : `${origin}/og-cover.png`;

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'keywords', keywords);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', ogImage);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', ogImage);
    upsertCanonical(canonical);

    // 1. Vendor Bakery / LocalBusiness + Product Offers (INR) + BreadcrumbList JSON-LD
    if (activeVendor) {
      const isParty = activeVendor.marketplace === 'party';
      const isBaker =
        !isParty &&
        (activeVendor.category.toLowerCase().includes('baker') ||
          activeVendor.category.toLowerCase().includes('cake') ||
          activeVendor.category.toLowerCase().includes('dessert'));
      const schemaType = isBaker
        ? 'Bakery'
        : !isParty && activeVendor.marketplace === 'food'
          ? 'FoodEstablishment'
          : 'LocalBusiness';
      const currencyCode = COUNTRY_DEFAULT_CURRENCY[activeVendor.country] || 'INR';
      const isoCountry = COUNTRY_ISO_CODE[activeVendor.country] || 'IN';
      const citySlug = slugifySeoSegment(activeVendor.city);
      const catSlug = slugifySeoSegment(activeVendor.category);

      const signatureProducts = activeVendor.products.slice(0, 12).map((p) => {
        const localPrice = usdToLocal(p.priceUsd, currencyCode);
        return {
          '@type': isParty ? 'Service' : 'Product',
          name: p.name,
          description:
            p.description ||
            `${p.name} by ${activeVendor.name} in ${activeVendor.area}, ${activeVendor.city}`,
          image: resolvePublicImage(p.image),
          ...(isParty
            ? { provider: { '@type': 'LocalBusiness', name: activeVendor.name } }
            : { brand: { '@type': 'Brand', name: activeVendor.name } }),
          offers: {
            '@type': 'Offer',
            price: localPrice,
            priceCurrency: currencyCode,
            availability:
              p.inStock === false
                ? 'https://schema.org/OutOfStock'
                : 'https://schema.org/InStock',
            url: `${canonical}?item=${encodeURIComponent(p.id)}`,
          },
        };
      });

      const businessNode: Record<string, unknown> = {
        '@type': schemaType,
        '@id': `${canonical}#business`,
        name: activeVendor.name,
        description: activeVendor.description,
        url: canonical,
        image: ogImage,
        telephone: `+${activeVendor.whatsappNumber}`,
        priceRange: formatPriceRangeForCountry(activeVendor.priceTier, activeVendor.country),
        sameAs: [
          activeVendor.googleMapsUrl,
          activeVendor.instagramHandle
            ? activeVendor.instagramHandle.startsWith('http')
              ? activeVendor.instagramHandle
              : `https://instagram.com/${activeVendor.instagramHandle.replace(/^@/, '')}`
            : undefined,
        ].filter(Boolean),
        geo: {
          '@type': 'GeoCoordinates',
          latitude: activeVendor.lat,
          longitude: activeVendor.lng,
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: activeVendor.area,
          addressLocality: activeVendor.city,
          addressRegion: activeVendor.state,
          addressCountry: isoCountry,
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: activeVendor.rating,
          reviewCount: Math.max(1, activeVendor.reviewCount),
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: isParty
            ? `${activeVendor.name} Event Packages & Services`
            : isBaker
              ? `${activeVendor.name} Signature Cakes & Menu`
              : `${activeVendor.name} Menu & Catering Packages`,
          itemListElement: signatureProducts.map((prod) => ({
            '@type': 'Offer',
            itemOffered: prod,
            price: prod.offers.price,
            priceCurrency: currencyCode,
          })),
        },
      };

      if (!isParty) {
        businessNode.servesCuisine = buildServesCuisine(activeVendor);
      }

      upsertJsonLd('dynamic-vendor-jsonld', {
        '@context': 'https://schema.org',
        '@graph': [
          businessNode,
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
              {
                '@type': 'ListItem',
                position: 2,
                name: activeVendor.city,
                item: `${origin}/city/${citySlug}`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: activeVendor.category,
                item: `${origin}/${citySlug}/${catSlug}`,
              },
              {
                '@type': 'ListItem',
                position: 4,
                name: activeVendor.name,
                item: canonical,
              },
            ],
          },
        ],
      });
      upsertJsonLd('dynamic-directory-jsonld', null);
      upsertJsonLd('dynamic-faq-jsonld', null);
    } else if (seoDirectoryRoute) {
      upsertJsonLd('dynamic-vendor-jsonld', null);

      const breadcrumbItems: Array<Record<string, unknown>> = [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      ];
      let nextPos = 2;

      if (seoDirectoryRoute.cityEntry) {
        breadcrumbItems.push({
          '@type': 'ListItem',
          position: nextPos++,
          name: seoDirectoryRoute.cityEntry.city,
          item: `${origin}/city/${seoDirectoryRoute.cityEntry.slug}`,
        });
      }
      if (seoDirectoryRoute.cityEntry && seoDirectoryRoute.localitySlug && seoDirectoryRoute.localityName) {
        breadcrumbItems.push({
          '@type': 'ListItem',
          position: nextPos++,
          name: seoDirectoryRoute.localityName,
          item: `${origin}/${seoDirectoryRoute.cityEntry.slug}/${seoDirectoryRoute.localitySlug}/${seoDirectoryRoute.categoryEntry?.slug || 'home-bakers'}`,
        });
      }
      if (seoDirectoryRoute.categoryEntry) {
        breadcrumbItems.push({
          '@type': 'ListItem',
          position: nextPos++,
          name:
            seoDirectoryRoute.categoryEntry.shortLabel ||
            seoDirectoryRoute.categoryEntry.displayLabel ||
            seoDirectoryRoute.categoryEntry.category,
          item: canonical,
        });
      }

      // 2. Programmatic City / Locality × Category ItemList + BreadcrumbList JSON-LD
      upsertJsonLd('dynamic-directory-jsonld', {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbItems,
          },
          {
            '@type': 'ItemList',
            name: seoDirectoryRoute.h1,
            numberOfItems: matchingVendors.length,
            itemListElement: matchingVendors.slice(0, 20).map((v, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              url: `${origin}/v/${v.slug}`,
              name: v.name,
            })),
          },
        ],
      });

      // 3. FAQPage Rich Snippet JSON-LD matching visible on-page FAQs
      upsertJsonLd('dynamic-faq-jsonld', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: seoDirectoryRoute.faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      });
    } else {
      upsertJsonLd('dynamic-vendor-jsonld', null);
      upsertJsonLd('dynamic-directory-jsonld', null);
      upsertJsonLd('dynamic-faq-jsonld', null);
    }
  }, [
    activeVendor,
    seoDirectoryRoute,
    matchingVendors,
    siteSettings,
    selectedCategory,
    selectedCountry,
    selectedState,
    ecosystem,
  ]);
}
