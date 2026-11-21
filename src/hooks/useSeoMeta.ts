import { useEffect } from 'react';
import {
  DEFAULT_SITE_SETTINGS,
  LaunchCountry,
  SiteSettings,
  Vendor,
} from '../data/vendors';
import { ResolvedSeoDirectoryRoute } from '../utils/seoDirectory';

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
      title =
        activeVendor.seoTitle?.trim() ||
        `${activeVendor.name} – ${activeVendor.category} in ${activeVendor.city}`;
      description =
        activeVendor.seoDescription?.trim() ||
        `${activeVendor.tagline} Book ${activeVendor.name} in ${activeVendor.area}, ${activeVendor.city}, ${activeVendor.state} directly on WhatsApp via FindMyBites × PimpMyParty.`;
      keywords =
        activeVendor.seoKeywords?.trim() ||
        `${activeVendor.name}, ${activeVendor.category} in ${activeVendor.city}, ${activeVendor.area} ${activeVendor.category.toLowerCase()}`;
      canonical = `${origin}/v/${activeVendor.slug}`;
    } else if (seoDirectoryRoute) {
      title = seoDirectoryRoute.title;
      description = seoDirectoryRoute.description;
      keywords = seoDirectoryRoute.keywords;
      canonical = `${origin}${seoDirectoryRoute.canonicalPath}`;
    } else if (selectedCategory !== 'All' || selectedCountry !== 'All' || selectedState !== 'All') {
      const subject =
        selectedCategory !== 'All'
          ? selectedCategory
          : ecosystem === 'FINDMYBITES'
            ? 'Bakers, Catering & Live Counters'
            : 'Wedding Decor, DJs & Event Vendors';
      const placeParts = [
        selectedState !== 'All' ? selectedState : '',
        selectedCountry !== 'All' ? selectedCountry : '',
      ].filter(Boolean);
      const place = placeParts.length > 0 ? ` in ${placeParts.join(', ')}` : ' Near You';
      title = `${subject}${place} – FindMyBites × PimpMyParty`;
      description = `Compare verified ${subject.toLowerCase()}${place}. View full one-page product catalogs, prices, reviews & chat directly on WhatsApp.`;
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

    // 1. Vendor LocalBusiness / Bakery + BreadcrumbList JSON-LD
    if (activeVendor) {
      const schemaType = activeVendor.category.toLowerCase().includes('baker')
        ? 'Bakery'
        : activeVendor.marketplace === 'food'
          ? 'FoodEstablishment'
          : 'LocalBusiness';

      upsertJsonLd('dynamic-vendor-jsonld', {
        '@context': 'https://schema.org',
        '@type': schemaType,
        name: activeVendor.name,
        description: activeVendor.description,
        url: canonical,
        image: ogImage,
        telephone: `+${activeVendor.whatsappNumber}`,
        priceRange: activeVendor.priceTier,
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
          addressCountry: activeVendor.country,
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: activeVendor.rating,
          reviewCount: Math.max(1, activeVendor.reviewCount),
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: `${activeVendor.name} Products & Packages`,
          itemListElement: activeVendor.products.map((p) => ({
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
      });
      upsertJsonLd('dynamic-directory-jsonld', null);
      upsertJsonLd('dynamic-faq-jsonld', null);
    } else if (seoDirectoryRoute) {
      upsertJsonLd('dynamic-vendor-jsonld', null);

      // 2. Programmatic City × Category ItemList + BreadcrumbList JSON-LD
      upsertJsonLd('dynamic-directory-jsonld', {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
              ...(seoDirectoryRoute.cityEntry
                ? [
                    {
                      '@type': 'ListItem',
                      position: 2,
                      name: seoDirectoryRoute.cityEntry.city,
                      item: `${origin}/city/${seoDirectoryRoute.cityEntry.slug}`,
                    },
                  ]
                : []),
              ...(seoDirectoryRoute.categoryEntry
                ? [
                    {
                      '@type': 'ListItem',
                      position: seoDirectoryRoute.cityEntry ? 3 : 2,
                      name: seoDirectoryRoute.categoryEntry.category,
                      item: canonical,
                    },
                  ]
                : []),
            ],
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

      // 3. FAQPage Rich Snippet JSON-LD
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
