import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Globe2,
  MapPin,
  Megaphone,
  Snowflake,
  Sparkles,
  X,
} from 'lucide-react';
import { CurrencyCode, Vendor, formatMoney } from '../data/vendors';
import {
  POPULAR_LOCALITIES_BY_CITY,
  PRIORITY_SEO_CITY_SLUGS,
  ResolvedSeoDirectoryRoute,
  SEO_CATEGORIES,
  SEO_CITIES,
  TOP_CAKE_SEO_CATEGORY_SLUGS,
  TOP_PARTY_SEO_CATEGORY_SLUGS,
  slugifySeoSegment,
} from '../utils/seoDirectory';

interface CityCategorySeoBannerProps {
  route: ResolvedSeoDirectoryRoute;
  matchingCount: number;
  matchingVendors?: Vendor[];
  currency?: CurrencyCode;
  onNavigateSeoPath: (path: string) => void;
  onClearRoute: () => void;
  onOpenEventRequest: () => void;
  onOpenListBusiness: () => void;
}

export function CityCategorySeoBanner({
  route,
  matchingCount,
  matchingVendors = [],
  currency = 'INR',
  onNavigateSeoPath,
  onClearRoute,
  onOpenEventRequest,
  onOpenListBusiness,
}: CityCategorySeoBannerProps) {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const activeCity = route.cityEntry;
  const activeCategory = route.categoryEntry;
  const activeLocalityName = route.localityName;
  const activeLocalitySlug = route.localitySlug;
  const isPartyRoute = activeCategory?.marketplace === 'party';

  const relatedCategories = SEO_CATEGORIES.filter((c) => {
    if (c.slug === activeCategory?.slug || c.isChristmasHub) return false;
    if (isPartyRoute) {
      return TOP_PARTY_SEO_CATEGORY_SLUGS.includes(
        c.slug as (typeof TOP_PARTY_SEO_CATEGORY_SLUGS)[number]
      );
    }
    return (
      TOP_CAKE_SEO_CATEGORY_SLUGS.includes(
        c.slug as (typeof TOP_CAKE_SEO_CATEGORY_SLUGS)[number]
      ) ||
      c.slug === 'catering-services' ||
      c.slug === 'live-counters-and-food-stalls' ||
      c.slug === 'bar-mocktails-and-beverage-carts'
    );
  }).slice(0, 9);

  const relatedCities = SEO_CITIES.filter(
    (c) => PRIORITY_SEO_CITY_SLUGS.includes(c.slug) && c.slug !== activeCity?.slug
  ).slice(0, 10);

  const cityLocalities = activeCity ? POPULAR_LOCALITIES_BY_CITY[activeCity.slug] || [] : [];

  // Compute live starting price range in INR (or active currency) from matched vendors
  const liveMinPriceUsd =
    matchingVendors.length > 0
      ? Math.min(
          ...matchingVendors
            .map((v) => v.startingPriceUsd)
            .filter((p) => Number.isFinite(p) && p > 0)
        )
      : null;

  const formattedStartingPrice =
    liveMinPriceUsd && Number.isFinite(liveMinPriceUsd)
      ? formatMoney(liveMinPriceUsd, currency)
      : activeCategory?.startingPriceInr || '₹550';

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigateSeoPath(path);
  };

  return (
    <section
      aria-label="Local category directory overview"
      className="border-b border-border bg-gradient-to-b from-brand-soft/60 via-background to-background"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Semantic Breadcrumb Trail (mirrors BreadcrumbList JSON-LD) */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onClearRoute();
            }}
            className="font-semibold hover:text-brand"
          >
            Home
          </a>
          {activeCity && (
            <>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <a
                href={`/city/${activeCity.slug}`}
                onClick={(e) => handleLinkClick(e, `/city/${activeCity.slug}`)}
                className="font-semibold hover:text-brand"
              >
                {activeCity.city}
              </a>
            </>
          )}
          {activeCity && activeLocalityName && activeLocalitySlug && (
            <>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <a
                href={`/${activeCity.slug}/${activeLocalitySlug}/${activeCategory?.slug || 'home-bakers'}`}
                onClick={(e) =>
                  handleLinkClick(
                    e,
                    `/${activeCity.slug}/${activeLocalitySlug}/${activeCategory?.slug || 'home-bakers'}`
                  )
                }
                className="font-semibold hover:text-brand"
              >
                {activeLocalityName}
              </a>
            </>
          )}
          {activeCategory && (
            <>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <span className="font-bold text-foreground">
                {activeCategory.isChristmasHub
                  ? 'Christmas Cakes & Plum Cakes'
                  : activeCategory.shortLabel || activeCategory.displayLabel || activeCategory.category}
              </span>
            </>
          )}
        </nav>

        {/* Primary Single Semantic H1 & Local Intent Summary */}
        <div className="mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-border bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">
                {activeCategory?.isChristmasHub ? (
                  <Snowflake className="size-3.5" aria-hidden="true" />
                ) : (
                  <MapPin className="size-3.5" aria-hidden="true" />
                )}
                {activeCity
                  ? `${activeLocalityName ? `${activeLocalityName}, ` : ''}${activeCity.city}, ${activeCity.state}`
                  : 'Across India · 0% Commission'}
              </span>
              <span className="rounded-md border border-border bg-card px-2.5 py-1 font-mono text-[11px] font-bold text-foreground">
                {matchingCount} {matchingCount === 1 ? 'verified listing' : 'verified listings'}
              </span>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                Starting from {formattedStartingPrice} · 0% Commission
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {route.h1}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {route.introParagraph}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenEventRequest}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-brand-foreground shadow-sm hover:bg-brand-hover"
            >
              <Megaphone className="size-3.5" aria-hidden="true" />
              Get Local Quotes
            </button>
            <button
              type="button"
              onClick={onOpenListBusiness}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:border-brand hover:text-brand"
            >
              <Sparkles className="size-3.5 text-brand" aria-hidden="true" />
              List Here Free
            </button>
            <button
              type="button"
              onClick={onClearRoute}
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
              All Cities
            </button>
          </div>
        </div>

        {/* Hyper-Local Neighbourhood Links for Active City (Pattern 2: /[city]/[locality]/[category]) */}
        {activeCity && cityLocalities.length > 0 && (
          <div className="mt-5 rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              <MapPin className="size-3.5 text-brand" aria-hidden="true" />
              Popular Localities in {activeCity.city}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {cityLocalities.map((loc) => {
                const locSlug = slugifySeoSegment(loc);
                const catSlug = activeCategory?.slug || 'home-bakers';
                const path = `/${activeCity.slug}/${locSlug}/${catSlug}`;
                const isCurrent = activeLocalitySlug === locSlug;
                return (
                  <a
                    key={locSlug}
                    href={path}
                    onClick={(e) => handleLinkClick(e, path)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                      isCurrent
                        ? 'border-brand bg-brand text-brand-foreground font-bold'
                        : 'border-border bg-background text-foreground hover:border-brand hover:bg-brand-soft hover:text-brand'
                    }`}
                  >
                    {loc}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Internal Linking Matrix: Related Categories & Other Cities */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3.5 text-brand" aria-hidden="true" />
              {isPartyRoute
                ? activeCity
                  ? `More Event & Party Categories in ${activeLocalityName ? `${activeLocalityName}, ` : ''}${activeCity.city}`
                  : 'Popular Event & Party Categories'
                : activeCity
                  ? `More Cake & Food Categories in ${activeLocalityName ? `${activeLocalityName}, ` : ''}${activeCity.city}`
                  : 'Popular Cake & Baker Categories'}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {relatedCategories.map((cat) => {
                const path =
                  activeCity && activeLocalitySlug
                    ? `/${activeCity.slug}/${activeLocalitySlug}/${cat.slug}`
                    : activeCity
                      ? `/${activeCity.slug}/${cat.slug}`
                      : `/category/${cat.slug}`;
                return (
                  <a
                    key={cat.slug}
                    href={path}
                    onClick={(e) => handleLinkClick(e, path)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
                  >
                    {cat.shortLabel || cat.category}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              <Globe2 className="size-3.5 text-brand" aria-hidden="true" />
              {activeCategory
                ? `${activeCategory.shortLabel || activeCategory.category} in Other Cities`
                : 'Explore Other Indian Cities'}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {relatedCities.map((c) => {
                const path = activeCategory
                  ? `/${c.slug}/${activeCategory.slug}`
                  : `/city/${c.slug}`;
                return (
                  <a
                    key={c.slug}
                    href={path}
                    onClick={(e) => handleLinkClick(e, path)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
                  >
                    <MapPin className="size-3 text-muted-foreground" aria-hidden="true" />
                    {c.city}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Locality FAQs (matches FAQPage JSON-LD for Google Rich Snippets) */}
        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Frequently Asked Questions ·{' '}
            {activeLocalityName && activeCity
              ? `${activeLocalityName}, ${activeCity.city}`
              : activeCity
                ? activeCity.city
                : isPartyRoute
                  ? 'PimpMyParty India'
                  : 'FindMyBites India'}
          </h2>
          <div className="mt-2.5 divide-y divide-border">
            {route.faqs.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={faq.question} className="py-2.5 first:pt-1 last:pb-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 text-left text-xs font-bold text-foreground hover:text-brand sm:text-sm"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
