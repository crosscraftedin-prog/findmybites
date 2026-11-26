import { useState } from 'react';
import {
  BadgeCheck,
  Check,
  Crown,
  Edit3,
  ExternalLink,
  Globe2,
  Heart,
  MapPin,
  MessageCircle,
  Package,
  PartyPopper,
  Share2,
  Star,
  UtensilsCrossed,
} from 'lucide-react';
import {
  CurrencyCode,
  Vendor,
  buildWhatsAppUrl,
  formatMoney,
  getCustomBuilderModeConfig,
  getVendorCoverageLabel,
  isCustomBuilderActive,
  suggestBuilderModeForCategory,
} from '../data/vendors';

interface VendorCardProps {
  vendor: Vendor;
  currency: CurrencyCode;
  isSaved: boolean;
  isRecentlyShared?: boolean;
  distanceKm?: number | null;
  browsingState?: string;
  canEdit?: boolean;
  onToggleSave: (vendorId: string) => void;
  onSelect: (vendor: Vendor) => void;
  onShare?: (vendor: Vendor) => void;
  onEdit?: (vendor: Vendor) => void;
}

export function VendorCard({
  vendor,
  currency,
  isSaved,
  isRecentlyShared = false,
  distanceKm,
  browsingState,
  canEdit = false,
  onToggleSave,
  onSelect,
  onShare,
  onEdit,
}: VendorCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const isPaid = vendor.planTier === 'business' || vendor.planTier === 'pro';
  const coverageLabel = getVendorCoverageLabel(vendor, browsingState);
  const isMultiState = Boolean(coverageLabel);
  const hasCustomBuilder = isCustomBuilderActive(vendor);
  const builderModeConfig = hasCustomBuilder
    ? getCustomBuilderModeConfig(
        vendor.customBuilderMode ?? suggestBuilderModeForCategory(vendor.category)
      )
    : null;
  const cardWaText =
    browsingState && browsingState !== vendor.state && isMultiState
      ? `Hi ${vendor.name}, I found your storefront on FindMyBites while browsing ${browsingState}. I'd like to enquire about an order for ${browsingState}!`
      : undefined;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        isPaid
          ? 'border-brand/60 ring-1 ring-brand/15'
          : 'border-border hover:border-brand-border'
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {!imgFailed ? (
          <img
            src={vendor.image}
            alt={`${vendor.name} - ${vendor.category} in ${vendor.area}, ${vendor.city}`}
            width={640}
            height={400}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted px-6 text-center text-muted-foreground">
            {vendor.marketplace === 'food' ? (
              <UtensilsCrossed className="size-8 text-brand" aria-hidden="true" />
            ) : (
              <PartyPopper className="size-8 text-brand" aria-hidden="true" />
            )}
            <span className="text-sm font-semibold text-foreground">{vendor.name}</span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Top-Left Card Badges: Paid Priority + Custom Box / Plate Builder Highlight */}
        {(isPaid || builderModeConfig) && (
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {isPaid && (
              <div className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-brand-foreground shadow-md">
                <Crown className="size-3" aria-hidden="true" />
                Business Partner
              </div>
            )}
            {builderModeConfig && (
              <div className="inline-flex items-center gap-1 rounded-full bg-neutral-950/85 px-2.5 py-1 text-[11px] font-extrabold text-white ring-1 ring-brand/80 shadow-md backdrop-blur-md">
                <Package className="size-3 text-brand" aria-hidden="true" />
                {builderModeConfig.customerTitle}
              </div>
            )}
          </div>
        )}

        {/* Top-Right Quick Actions: Share + Save */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {onShare && (
            <button
              type="button"
              aria-label={`Share ${vendor.name}`}
              title={`Share ${vendor.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onShare(vendor);
              }}
              className={`flex h-9 cursor-pointer items-center justify-center gap-1 rounded-full px-2.5 text-xs font-bold shadow-sm backdrop-blur-md transition-all ${
                isRecentlyShared
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/90 text-neutral-800 hover:bg-white hover:text-brand dark:bg-neutral-900/85 dark:text-neutral-100'
              }`}
            >
              {isRecentlyShared ? (
                <>
                  <Check className="size-3.5" aria-hidden="true" />
                  <span>Shared!</span>
                </>
              ) : (
                <>
                  <Share2 className="size-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            aria-label={isSaved ? `Remove ${vendor.name} from saved` : `Save ${vendor.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(vendor.id);
            }}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white hover:text-brand dark:bg-neutral-900/85 dark:text-neutral-200"
          >
            <Heart
              className={`size-4 ${isSaved ? 'fill-brand text-brand' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {distanceKm != null ? (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
            {isMultiState && distanceKm > 60 ? (
              <>
                <Globe2 className="size-3 text-emerald-400" aria-hidden="true" />
                {vendor.allStatesCoverage
                  ? vendor.country === 'India'
                    ? 'Pan-India Delivery'
                    : `All ${vendor.country} Delivery`
                  : 'Delivers to Your Area'}
              </>
            ) : (
              <>
                <MapPin className="size-3 text-brand" aria-hidden="true" />
                {distanceKm < 1
                  ? `${Math.round(distanceKm * 1000)} m away`
                  : `${distanceKm < 50 ? distanceKm.toFixed(1) : Math.round(distanceKm).toLocaleString()} km away`}
              </>
            )}
          </div>
        ) : coverageLabel ? (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-indigo-600/90 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
            <Globe2 className="size-3" aria-hidden="true" />
            {vendor.allStatesCoverage
              ? vendor.country === 'India'
                ? 'Pan-India'
                : `All ${vendor.country}`
              : coverageLabel}
          </div>
        ) : null}

        <div className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-white backdrop-blur-md">
          from {formatMoney(vendor.startingPriceUsd, currency)}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelect(vendor)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(vendor);
            }
          }}
          className="cursor-pointer focus-visible:outline-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {vendor.logo && (
                <img
                  src={vendor.logo}
                  alt={`${vendor.name} logo - ${vendor.category} in ${vendor.area}, ${vendor.city}`}
                  width={28}
                  height={28}
                  loading="lazy"
                  decoding="async"
                  className="size-7 shrink-0 rounded-lg border border-border object-cover"
                />
              )}
              <h3 className="line-clamp-1 text-base font-bold leading-tight text-foreground transition-colors group-hover:text-brand">
                {vendor.name}
              </h3>
            </div>
            {vendor.verified && (
              <BadgeCheck className="size-4 shrink-0 text-brand" aria-label="Verified vendor" />
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{vendor.tagline}</p>

          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {vendor.area}, {vendor.city} · {vendor.state}, {vendor.country}
            </span>
          </div>

          {(coverageLabel || builderModeConfig) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {builderModeConfig && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-brand-border bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                  <Package className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{builderModeConfig.customerTitle}</span>
                </span>
              )}
              {coverageLabel && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                  <Globe2 className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{coverageLabel}</span>
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate font-medium text-foreground">
              {vendor.category} · {vendor.products.length} products
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {vendor.rating.toFixed(2)}
              </span>
              <span className="tabular-nums">({vendor.reviewCount})</span>
            </span>
          </div>
        </div>

        {/* Direct Action Row: Open One-Page Website + Direct WhatsApp (+ Owner Edit Storefront) */}
        <div className="mt-auto space-y-2 border-t border-border/70 pt-3 mt-4">
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(vendor);
              }}
              className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-bold text-brand-foreground shadow-xs transition-colors hover:bg-brand-hover"
            >
              <Edit3 className="size-3.5" aria-hidden="true" />
              Edit My Storefront
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSelect(vendor)}
              className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors whitespace-nowrap ${
                builderModeConfig
                  ? 'border-brand bg-brand text-brand-foreground hover:bg-brand-hover'
                  : 'border-border bg-background font-semibold text-foreground hover:border-brand hover:text-brand'
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
                  View Website
                </>
              )}
            </button>

            <a
              href={buildWhatsAppUrl(vendor, cardWaText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#1ebe5d] whitespace-nowrap"
            >
              <MessageCircle className="size-3.5" aria-hidden="true" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
