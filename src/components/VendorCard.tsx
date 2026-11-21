import { useState } from 'react';
import {
  BadgeCheck,
  Crown,
  Edit3,
  ExternalLink,
  Globe2,
  Heart,
  MapPin,
  MessageCircle,
  PartyPopper,
  Star,
  UtensilsCrossed,
} from 'lucide-react';
import {
  CurrencyCode,
  Vendor,
  buildWhatsAppUrl,
  formatMoney,
  getVendorCoverageLabel,
} from '../data/vendors';

interface VendorCardProps {
  vendor: Vendor;
  currency: CurrencyCode;
  isSaved: boolean;
  distanceKm?: number | null;
  browsingState?: string;
  canEdit?: boolean;
  onToggleSave: (vendorId: string) => void;
  onSelect: (vendor: Vendor) => void;
  onEdit?: (vendor: Vendor) => void;
}

export function VendorCard({
  vendor,
  currency,
  isSaved,
  distanceKm,
  browsingState,
  canEdit = false,
  onToggleSave,
  onSelect,
  onEdit,
}: VendorCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const isPaid = vendor.planTier === 'business' || vendor.planTier === 'pro';
  const coverageLabel = getVendorCoverageLabel(vendor, browsingState);
  const isMultiState = Boolean(coverageLabel);
  const cardWaText =
    browsingState && browsingState !== vendor.state && isMultiState
      ? `Hi ${vendor.name}, I found your storefront on FindMyBites while browsing ${browsingState}. I'd like to enquire about an order for ${browsingState}!`
      : undefined;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        vendor.planTier === 'business'
          ? 'border-brand/60 ring-1 ring-brand/15'
          : isPaid
            ? 'border-brand-border hover:border-brand'
            : 'border-border hover:border-brand-border'
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {!imgFailed ? (
          <img
            src={vendor.image}
            alt={`${vendor.name} — ${vendor.category} in ${vendor.city}`}
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

        {/* Paid SaaS Priority Indicator (Top Listed / Featured Pro) */}
        {isPaid && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-brand-foreground shadow-md">
            <Crown className="size-3" aria-hidden="true" />
            {vendor.planTier === 'business' ? 'Top Listed' : 'Featured Pro'}
          </div>
        )}

        <button
          type="button"
          aria-label={isSaved ? `Remove ${vendor.name} from saved` : `Save ${vendor.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(vendor.id);
          }}
          className="absolute right-3 top-3 flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white hover:text-brand dark:bg-neutral-900/85 dark:text-neutral-200"
        >
          <Heart
            className={`size-4 ${isSaved ? 'fill-brand text-brand' : ''}`}
            aria-hidden="true"
          />
        </button>

        {distanceKm != null ? (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
            {isMultiState && distanceKm > 60 ? (
              <>
                <Globe2 className="size-3 text-emerald-400" aria-hidden="true" />
                {vendor.allStatesCoverage ? 'Pan-India Delivery' : 'Delivers to Your Area'}
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
            {vendor.allStatesCoverage ? 'Pan-India' : coverageLabel}
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
                  alt={`${vendor.name} logo`}
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

          {coverageLabel && (
            <div className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
              <Globe2 className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{coverageLabel}</span>
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
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand whitespace-nowrap"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              View Website
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
