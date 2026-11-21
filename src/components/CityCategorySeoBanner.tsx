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
import {
  PRIORITY_SEO_CITY_SLUGS,
  ResolvedSeoDirectoryRoute,
  SEO_CATEGORIES,
  SEO_CITIES,
} from '../utils/seoDirectory';

interface CityCategorySeoBannerProps {
  route: ResolvedSeoDirectoryRoute;
  matchingCount: number;
  onNavigateSeoPath: (path: string) => void;
  onClearRoute: () => void;
  onOpenEventRequest: () => void;
  onOpenListBusiness: () => void;
}

export function CityCategorySeoBanner({
  route,
  matchingCount,
  onNavigateSeoPath,
  onClearRoute,
  onOpenEventRequest,
  onOpenListBusiness,
}: CityCategorySeoBannerProps) {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const activeCity = route.cityEntry;
  const activeCategory = route.categoryEntry;

  const relatedCategories = SEO_CATEGORIES.filter(
    (c) => c.slug !== activeCategory?.slug && !c.isChristmasHub
  ).slice(0, 8);

  const relatedCities = SEO_CITIES.filter(
    (c) => PRIORITY_SEO_CITY_SLUGS.includes(c.slug) && c.slug !== activeCity?.slug
  ).slice(0, 10);

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
        {/* Breadcrumb Trail (mirrors BreadcrumbList JSON-LD) */}
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
              <span>{activeCity.country}</span>
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
          {activeCategory && (
            <>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <span className="font-bold text-foreground">
                {activeCategory.isChristmasHub
                  ? 'Christmas Cakes & Plum Cakes'
                  : activeCategory.category}
              </span>
            </>
          )}
        </nav>

        {/* Primary Semantic H1 & Local Intent Summary */}
        <div className="mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-soft px-3 py-1 text-[11px] font-bold text-brand">
                {activeCategory?.isChristmasHub ? (
                  <Snowflake className="size-3.5" aria-hidden="true" />
                ) : (
                  <MapPin className="size-3.5" aria-hidden="true" />
                )}
                {activeCity
                  ? `${activeCity.city}, ${activeCity.state} · ${activeCity.country}`
                  : 'All 6 Launch Countries'}
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] font-bold text-foreground">
                {matchingCount} {matchingCount === 1 ? 'verified listing' : 'verified listings'}
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {route.h1}
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {route.description}
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

        {/* Internal Linking Spider Web (Justdial-style crawlable city × category matrix) */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="size-3.5 text-brand" aria-hidden="true" />
              {activeCity ? `More Categories in ${activeCity.city}` : 'Popular Categories'}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {activeCity && !activeCategory?.isChristmasHub && (
                <a
                  href={`/${activeCity.slug}/christmas-cakes`}
                  onClick={(e) => handleLinkClick(e, `/${activeCity.slug}/christmas-cakes`)}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                >
                  <Snowflake className="size-3" aria-hidden="true" />
                  Christmas Cakes in {activeCity.city}
                </a>
              )}
              {relatedCategories.map((cat) => {
                const path = activeCity
                  ? `/${activeCity.slug}/${cat.slug}`
                  : `/category/${cat.slug}`;
                return (
                  <a
                    key={cat.slug}
                    href={path}
                    onClick={(e) => handleLinkClick(e, path)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
                  >
                    {cat.category}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              <Globe2 className="size-3.5 text-brand" aria-hidden="true" />
              {activeCategory
                ? `${activeCategory.isChristmasHub ? 'Christmas Cakes' : activeCategory.category} in Other Cities`
                : 'Explore Other Cities'}
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

        {/* Local FAQs (matches FAQPage JSON-LD for Google Rich Snippets) */}
        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            Local Booking FAQs · {activeCity ? activeCity.city : 'FindMyBites'}
          </p>
          <div className="mt-2.5 divide-y divide-border">
            {route.faqs.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={faq.question} className="py-2.5 first:pt-1 last:pb-0">
                  <button
                    type="button"
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
