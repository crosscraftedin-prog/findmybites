import { useEffect } from 'react';
import { LaunchCountry, Vendor } from '../data/vendors';

interface SeoMetaOptions {
  activeVendor: Vendor | null;
  selectedCategory: string;
  selectedCountry: LaunchCountry;
  selectedState: string;
  ecosystem: 'FINDMYBITES' | 'PIMPMYPARTY';
}

const DEFAULT_TITLE = 'FindMyBites × PimpMyParty – Bakers, Catering & Party Decor';
const DEFAULT_DESC =
  'Find bakers, live counters, catering, mocktail bars, snack boxes, gifting & wedding decor near you in India, Dubai, Sri Lanka, Pakistan, Bangladesh & Nepal.';

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

export function useSeoMeta({
  activeVendor,
  selectedCategory,
  selectedCountry,
  selectedState,
  ecosystem,
}: SeoMetaOptions) {
  useEffect(() => {
    const origin = window.location.origin;
    const baseUrl = origin + window.location.pathname;

    let title = DEFAULT_TITLE;
    let description = DEFAULT_DESC;
    let canonical = baseUrl;

    if (activeVendor) {
      title = `${activeVendor.name} – ${activeVendor.category} in ${activeVendor.city}`;
      description = `${activeVendor.tagline} Book ${activeVendor.name} in ${activeVendor.area}, ${activeVendor.city}, ${activeVendor.state} directly on WhatsApp via FindMyBites × PimpMyParty.`;
      canonical = `${origin}/v/${activeVendor.slug}`;
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

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertCanonical(canonical);

    // Dynamic LocalBusiness JSON-LD when viewing a Vendor Mini-Website
    const existingScript = document.getElementById('dynamic-vendor-jsonld');
    if (activeVendor) {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: activeVendor.name,
        description: activeVendor.description,
        url: canonical,
        image: `${origin}${activeVendor.image}`,
        telephone: `+${activeVendor.whatsappNumber}`,
        priceRange: activeVendor.priceTier,
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
          reviewCount: activeVendor.reviewCount,
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: `${activeVendor.name} Products & Packages`,
          itemListElement: activeVendor.products.map((p) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: p.name,
              description: p.description,
            },
            price: p.priceUsd,
            priceCurrency: 'USD',
          })),
        },
      };

      const script = (existingScript as HTMLScriptElement | null) ?? document.createElement('script');
      script.id = 'dynamic-vendor-jsonld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      if (!existingScript) {
        document.head.appendChild(script);
      }
    } else if (existingScript) {
      existingScript.remove();
    }
  }, [activeVendor, selectedCategory, selectedCountry, selectedState, ecosystem]);
}
