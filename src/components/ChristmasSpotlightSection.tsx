import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Cake,
  Crown,
  Edit3,
  ExternalLink,
  Gift,
  MapPin,
  MessageCircle,
  Package,
  PartyPopper,
  Share2,
  Snowflake,
  Sparkles,
  Star,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';
import {
  CurrencyCode,
  Vendor,
  buildWhatsAppUrl,
  formatMoney,
  getCustomBuilderModeConfig,
  isChristmasVendor,
  planRankWeight,
  suggestBuilderModeForCategory,
} from '../data/vendors';
import type { CustomMenuDish } from '../data/christmasMenu';
import { ChristmasCustomMenuBuilder } from './ChristmasCustomMenuBuilder';

type FestiveTab = 'all' | 'dinner-lunch' | 'bakers' | 'hampers' | 'catering' | 'decor';

interface ChristmasSpotlightSectionProps {
  vendors: Vendor[];
  currency: CurrencyCode;
  christmasDishes?: CustomMenuDish[];
  isHyderabadEligible?: boolean;
  openDinnerSignal?: number;
  canEditVendor: (vendor: Vendor) => boolean;
  onSelectVendor: (vendor: Vendor) => void;
  onEditVendor: (vendor: Vendor) => void;
  onOpenChristmasListModal: () => void;
  onTrackWhatsAppClick: (vendorId: string) => void;
  onNotify?: (message: string) => void;
}

const BASE_FESTIVE_TABS: Array<{ id: Exclude<FestiveTab, 'dinner-lunch'>; label: string }> = [
  { id: 'all', label: 'All Christmas & NYE' },
  { id: 'bakers', label: 'Plum Cakes & Bakers' },
  { id: 'hampers', label: 'Christmas Hampers & Sweets' },
  { id: 'catering', label: 'NYE Bars & Catering' },
  { id: 'decor', label: 'Christmas & NYE Decor' },
];

function matchesFestiveTab(v: Vendor, tab: FestiveTab): boolean {
  if (tab === 'all') return true;
  const hay = `${v.category} ${v.tagline} ${v.christmasOffer ?? ''} ${v.specialties.join(' ')}`.toLowerCase();
  if (tab === 'bakers') {
    return (
      v.category.includes('Baker') ||
      v.category.includes('Dessert') ||
      hay.includes('cake') ||
      hay.includes('plum') ||
      hay.includes('yule') ||
      hay.includes('brownie')
    );
  }
  if (tab === 'hampers') {
    return (
      v.category.includes('Gifting') ||
      v.category.includes('Mithai') ||
      v.category.includes('Snack') ||
      hay.includes('hamper') ||
      hay.includes('gift') ||
      hay.includes('chocolate')
    );
  }
  if (tab === 'catering') {
    return (
      v.category.includes('Bar') ||
      v.category.includes('Catering') ||
      v.category.includes('Chef') ||
      v.category.includes('Live Counters')
    );
  }
  return v.marketplace === 'party';
}

export function ChristmasSpotlightSection({
  vendors,
  currency,
  christmasDishes,
  isHyderabadEligible = true,
  openDinnerSignal = 0,
  canEditVendor,
  onSelectVendor,
  onEditVendor,
  onOpenChristmasListModal,
  onTrackWhatsAppClick,
  onNotify,
}: ChristmasSpotlightSectionProps) {
  const [activeTab, setActiveTab] = useState<FestiveTab>('all');

  useEffect(() => {
    if (!isHyderabadEligible && activeTab === 'dinner-lunch') {
      setActiveTab('all');
    }
  }, [isHyderabadEligible, activeTab]);

  useEffect(() => {
    if (openDinnerSignal > 0 && isHyderabadEligible) {
      setActiveTab('dinner-lunch');
    }
  }, [openDinnerSignal, isHyderabadEligible]);

  const visibleTabs = useMemo<Array<{ id: FestiveTab; label: string }>>(() => {
    if (!isHyderabadEligible) return BASE_FESTIVE_TABS;
    return [
      BASE_FESTIVE_TABS[0],
      { id: 'dinner-lunch', label: 'Christmas Dinner & Lunch (Hyderabad)' },
      ...BASE_FESTIVE_TABS.slice(1),
    ];
  }, [isHyderabadEligible]);

  const festiveVendors = useMemo(() => {
    if (activeTab === 'dinner-lunch') return [];
    return vendors
      .filter((v) => isChristmasVendor(v))
      .filter((v) => matchesFestiveTab(v, activeTab))
      .sort((a, b) => {
        // Explicit opted-in Christmas specials first, then Paid SaaS tiers, then Rating
        const aOpt = a.christmasSpecial ? 1 : 0;
        const bOpt = b.christmasSpecial ? 1 : 0;
        if (bOpt !== aOpt) return bOpt - aOpt;
        const planDiff = planRankWeight(b.planTier) - planRankWeight(a.planTier);
        if (planDiff !== 0) return planDiff;
        return b.rating - a.rating;
      })
      .slice(0, 9);
  }, [vendors, activeTab]);

  const promoShareText = encodeURIComponent(
    `Christmas & New Year 2026 Special on FindMyBites × PimpMyParty! Pre-order rich plum cakes, custom Christmas bakes, festive gift hampers & NYE party decor directly on WhatsApp — zero commission:\nhttps://www.findmybites.com/#christmas-special`
  );

  return (
    <section
      id="christmas-special"
      className="relative overflow-hidden border-b border-emerald-900/30 bg-gradient-to-br from-[#0B2B22] via-[#12382C] to-[#3B0F1A] py-12 text-white sm:py-16"
    >
      {/* Subtle festive warm gold & emerald ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-emerald-400/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full bg-rose-500/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Row */}
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-amber-300/35 bg-amber-400/15 px-3.5 py-1 text-xs font-extrabold tracking-wide text-amber-200 backdrop-blur-sm">
              <Snowflake className="size-3.5" aria-hidden="true" />
              <span>CHRISTMAS &amp; NEW YEAR 2026 FESTIVE SPOTLIGHT</span>
            </div>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Christmas Bakers, Plum Cakes{' '}
              <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-rose-200 bg-clip-text text-transparent">
                &amp; New Year Party Specials
              </span>
            </h2>

            <p className="mt-2.5 text-sm leading-relaxed text-emerald-100/85 sm:text-base">
              Handpicked home bakers, patisseries, festive hamper studios, NYE mocktail bars &amp;
              winter decor artists accepting Christmas &amp; New Year pre-orders directly on
              WhatsApp.
            </p>
          </div>

          {/* Promotional Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenChristmasListModal}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-neutral-950 shadow-lg transition-transform hover:scale-[1.02] hover:bg-amber-300 sm:text-sm"
            >
              <Cake className="size-4" aria-hidden="true" />
              Selling Christmas Cakes? Get Featured Free
            </button>

            <a
              href={`https://wa.me/?text=${promoShareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:text-sm"
            >
              <Share2 className="size-4" aria-hidden="true" />
              Promote on WhatsApp
            </a>
          </div>
        </div>

        {/* Festive Sub-Category Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {visibleTabs.map((tab) => {
            const active = activeTab === tab.id;
            const isDinnerTab = tab.id === 'dinner-lunch';
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                  active
                    ? 'border-amber-300 bg-amber-400 text-neutral-950 shadow-md'
                    : isDinnerTab
                      ? 'border-amber-300/60 bg-amber-400/20 text-amber-100 hover:bg-amber-400/30'
                      : 'border-white/20 bg-white/10 text-white/90 hover:bg-white/20'
                }`}
              >
                {tab.id === 'dinner-lunch' && <UtensilsCrossed className="size-3.5" aria-hidden="true" />}
                {tab.id === 'bakers' && <Cake className="size-3.5" aria-hidden="true" />}
                {tab.id === 'hampers' && <Gift className="size-3.5" aria-hidden="true" />}
                {tab.id === 'catering' && <Wine className="size-3.5" aria-hidden="true" />}
                {tab.id === 'decor' && <PartyPopper className="size-3.5" aria-hidden="true" />}
                {tab.id === 'all' && <Sparkles className="size-3.5" aria-hidden="true" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Hyderabad-Only Custom Christmas Dinner & Lunch Menu Builder OR Vendor Grid */}
        {activeTab === 'dinner-lunch' && isHyderabadEligible ? (
          <ChristmasCustomMenuBuilder dishes={christmasDishes} onOrderSent={onNotify} />
        ) : festiveVendors.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur-md">
            <p className="text-base font-bold text-white">
              Be the first vendor featured in this Christmas category!
            </p>
            <p className="mt-1 text-xs text-emerald-100/80">
              List your plum cakes, Christmas hampers, or NYE party packages for free and get
              highlighted right here.
            </p>
            <button
              type="button"
              onClick={onOpenChristmasListModal}
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-neutral-950 hover:bg-amber-300"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Add My Christmas Listing
            </button>
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {festiveVendors.map((vendor) => {
              const editable = canEditVendor(vendor);
              const builderModeConfig = vendor.customBuilderEnabled
                ? getCustomBuilderModeConfig(
                    vendor.customBuilderMode ?? suggestBuilderModeForCategory(vendor.category)
                  )
                : null;
              const festiveHeadline =
                vendor.christmasOffer ||
                vendor.promoBanner ||
                (vendor.category.includes('Baker')
                  ? 'Taking Christmas Plum Cake, Yule Log & NYE Pre-Orders!'
                  : 'Christmas & New Year 2026 Festive Bookings Open');

              return (
                <article
                  key={`xmas-${vendor.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-amber-300/30 bg-white/10 text-white shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/70 hover:bg-white/15"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/30">
                    <img
                      src={vendor.image}
                      alt={`${vendor.name} — Christmas & New Year special`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/30" />

                    <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                      <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#C81E3A] to-[#991B1B] px-2.5 py-1 text-[11px] font-extrabold text-white shadow-md">
                        <Snowflake className="size-3 text-amber-200" aria-hidden="true" />
                        {vendor.christmasSpecial ? 'Christmas Special' : 'Festive Pick'}
                      </div>
                      {builderModeConfig && (
                        <div className="inline-flex items-center gap-1 rounded-full bg-neutral-950/85 px-2.5 py-1 text-[11px] font-extrabold text-amber-200 ring-1 ring-amber-400/70 shadow-md backdrop-blur-md">
                          <Package className="size-3 text-amber-300" aria-hidden="true" />
                          {builderModeConfig.customerTitle}
                        </div>
                      )}
                    </div>

                    {(vendor.planTier === 'business' || vendor.planTier === 'pro') && (
                      <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-neutral-950 shadow">
                        <Crown className="size-3" aria-hidden="true" />
                        Top Listed
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                        <MapPin className="size-3 text-amber-300" aria-hidden="true" />
                        {vendor.city}, {vendor.country}
                      </span>
                      <span className="rounded-full bg-black/70 px-2.5 py-1 font-mono text-xs font-bold text-amber-300 backdrop-blur-sm">
                        from {formatMoney(vendor.startingPriceUsd, currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    {/* Festive Offer Highlight Bar */}
                    <div className="mb-2.5 rounded-xl border border-amber-300/30 bg-amber-400/15 px-3 py-2 text-xs font-semibold text-amber-100">
                      <Sparkles className="mr-1 inline size-3.5 text-amber-300" aria-hidden="true" />
                      {festiveHeadline}
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectVendor(vendor)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectVendor(vendor);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {vendor.logo && (
                            <img
                              src={vendor.logo}
                              alt={`${vendor.name} logo`}
                              className="size-7 shrink-0 rounded-lg border border-white/30 object-cover"
                            />
                          )}
                          <h3 className="line-clamp-1 text-base font-extrabold text-white transition-colors group-hover:text-amber-200">
                            {vendor.name}
                          </h3>
                        </div>
                        {vendor.verified && (
                          <BadgeCheck
                            className="size-4 shrink-0 text-amber-300"
                            aria-label="Verified vendor"
                          />
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs text-emerald-100/80">
                        {vendor.tagline}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between text-xs text-emerald-100/85">
                        <span className="truncate font-semibold text-white">{vendor.category}</span>
                        <span className="inline-flex shrink-0 items-center gap-1">
                          <Star
                            className="size-3.5 fill-amber-400 text-amber-400"
                            aria-hidden="true"
                          />
                          <span className="font-mono font-bold text-white">
                            {vendor.rating.toFixed(1)}
                          </span>
                          <span>({vendor.reviewCount})</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto space-y-2 border-t border-white/15 pt-3 mt-4">
                      {editable && (
                        <button
                          type="button"
                          onClick={() => onEditVendor(vendor)}
                          className="inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-3 text-xs font-extrabold text-neutral-950 hover:bg-amber-300"
                        >
                          <Edit3 className="size-3.5" aria-hidden="true" />
                          Edit My Christmas Offer
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectVendor(vendor)}
                          className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors whitespace-nowrap ${
                            builderModeConfig
                              ? 'border-amber-300 bg-amber-400 text-neutral-950 hover:bg-amber-300'
                              : 'border-white/25 bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {builderModeConfig ? (
                            <>
                              <Package className="size-3.5" aria-hidden="true" />
                              Build {builderModeConfig.id === 'catering' ? 'Plate' : 'Box'}
                            </>
                          ) : (
                            <>
                              <ExternalLink className="size-3.5" aria-hidden="true" />
                              View Menu
                            </>
                          )}
                        </button>
                        <a
                          href={buildWhatsAppUrl(
                            vendor,
                            `Hi ${vendor.name}! I saw your Christmas & New Year 2026 Special on FindMyBites (www.findmybites.com) and would love to see your Christmas cakes / festive packages.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onTrackWhatsAppClick(vendor.id)}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 text-xs font-bold text-white transition-colors hover:bg-[#1ebe5d] whitespace-nowrap"
                        >
                          <MessageCircle className="size-3.5" aria-hidden="true" />
                          Pre-Order
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
