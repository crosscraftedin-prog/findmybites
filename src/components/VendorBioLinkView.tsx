import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronRight,
  Copy,
  Edit3,
  ExternalLink,
  Globe2,
  Instagram,
  Link2,
  MapPin,
  MessageCircle,
  Navigation,
  PartyPopper,
  QrCode,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import {
  BioTheme,
  CurrencyCode,
  Vendor,
  buildWhatsAppUrl,
  formatMoney,
  getVendorBioHandle,
  sanitizeSafeHttpUrl,
} from '../data/vendors';
import { PromoCardModal } from './PromoCardModal';
import { QrPosterModal } from './QrPosterModal';

interface VendorBioLinkViewProps {
  vendor: Vendor | null;
  currency: CurrencyCode;
  canEdit?: boolean;
  onClose: () => void;
  onOpenStorefront: (vendor: Vendor) => void;
  onEditStorefront?: (vendor: Vendor) => void;
  onClaimOwnBioLink: () => void;
  onTrackWhatsAppClick?: (vendorId: string) => void;
  onTrackShare?: (vendorId: string) => void;
}

const THEME_STYLES: Record<
  BioTheme,
  {
    pageBg: string;
    cardBg: string;
    titleText: string;
    subText: string;
    pillBg: string;
    linkBg: string;
    linkHover: string;
    accentBadge: string;
  }
> = {
  saffron: {
    pageBg: 'bg-gradient-to-b from-[#2A1105] via-[#7C2D12] to-[#1A0A04]',
    cardBg: 'bg-white/10 border-white/20 backdrop-blur-xl',
    titleText: 'text-white',
    subText: 'text-orange-100/85',
    pillBg: 'bg-white/15 text-white border-white/20',
    linkBg: 'bg-white text-neutral-900 border-white/80 shadow-md',
    linkHover: 'hover:scale-[1.015] hover:bg-orange-50',
    accentBadge: 'bg-[#ef6c22] text-white',
  },
  midnight: {
    pageBg: 'bg-gradient-to-b from-[#09090B] via-[#18181B] to-[#09090B]',
    cardBg: 'bg-zinc-900/80 border-zinc-700/70 backdrop-blur-xl',
    titleText: 'text-white',
    subText: 'text-zinc-300',
    pillBg: 'bg-zinc-800/90 text-amber-300 border-amber-400/25',
    linkBg: 'bg-zinc-800/95 text-white border-zinc-700 shadow-md',
    linkHover: 'hover:scale-[1.015] hover:border-amber-400/60 hover:bg-zinc-800',
    accentBadge: 'bg-amber-400 text-neutral-950',
  },
  party: {
    pageBg: 'bg-gradient-to-b from-[#1F072E] via-[#6B136B] to-[#180424]',
    cardBg: 'bg-white/10 border-fuchsia-300/25 backdrop-blur-xl',
    titleText: 'text-white',
    subText: 'text-fuchsia-100/85',
    pillBg: 'bg-white/15 text-white border-fuchsia-200/25',
    linkBg: 'bg-white text-neutral-950 border-white/80 shadow-md',
    linkHover: 'hover:scale-[1.015] hover:bg-fuchsia-50',
    accentBadge: 'bg-[#d926a9] text-white',
  },
  cream: {
    pageBg: 'bg-gradient-to-b from-[#FDF8F2] via-[#F6ECE0] to-[#EFE2D2]',
    cardBg: 'bg-white/85 border-[#E2D2C0] backdrop-blur-xl shadow-xl',
    titleText: 'text-[#231812]',
    subText: 'text-[#6A5243]',
    pillBg: 'bg-[#F5E8D8] text-[#7A3412] border-[#E5CCB0]',
    linkBg: 'bg-white text-[#231812] border-[#E4D5C5] shadow-sm',
    linkHover: 'hover:scale-[1.015] hover:border-[#ef6c22]',
    accentBadge: 'bg-[#ef6c22] text-white',
  },
};

function buildInstagramUrl(raw?: string): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return sanitizeSafeHttpUrl(trimmed);
  const handle = trimmed.replace(/^@+/, '').replace(/[^a-zA-Z0-9._]/g, '');
  return handle ? `https://instagram.com/${handle}` : null;
}

export function VendorBioLinkView({
  vendor,
  currency,
  canEdit = false,
  onClose,
  onOpenStorefront,
  onEditStorefront,
  onClaimOwnBioLink,
  onTrackWhatsAppClick,
  onTrackShare,
}: VendorBioLinkViewProps) {
  const [copiedMode, setCopiedMode] = useState<'fmb' | 'at' | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);

  useEffect(() => {
    if (!vendor) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !qrOpen && !storyOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [vendor, qrOpen, storyOpen, onClose]);

  if (!vendor) return null;

  const handle = getVendorBioHandle(vendor);
  const fmbShortUrl = `https://www.findmybites.com/fmb/${handle}`;
  const atShortUrl = `https://www.findmybites.com/@${handle}`;
  const defaultTheme: BioTheme = vendor.marketplace === 'party' ? 'party' : 'saffron';
  const themeKey: BioTheme = vendor.bioTheme ?? defaultTheme;
  const t = THEME_STYLES[themeKey];

  const instagramUrl = buildInstagramUrl(vendor.instagramHandle);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${vendor.lat},${vendor.lng}`
  )}`;

  const handleCopy = (mode: 'fmb' | 'at') => {
    const url = mode === 'fmb' ? fmbShortUrl : atShortUrl;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedMode(mode);
    onTrackShare?.(vendor.id);
    window.setTimeout(() => setCopiedMode(null), 2400);
  };

  const handleNativeShare = async () => {
    onTrackShare?.(vendor.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${vendor.name} · FindMyBites Bio Link`,
          text: `${vendor.tagline} — Order directly on WhatsApp:`,
          url: fmbShortUrl,
        });
        return;
      } catch {
        // user cancelled share sheet
      }
    }
    handleCopy('fmb');
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto ${t.pageBg}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${vendor.name} FindMyBites link in bio`}
    >
      {/* Subtle Top Utility Bar */}
      <div className="sticky top-0 z-20 mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-3.5">
        <button
          type="button"
          onClick={onClose}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-opacity hover:opacity-90 ${t.pillBg}`}
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Marketplace
        </button>

        <div className="flex items-center gap-1.5">
          {canEdit && onEditStorefront && (
            <button
              type="button"
              onClick={() => onEditStorefront(vendor)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-foreground shadow-md hover:bg-brand-hover"
            >
              <Edit3 className="size-3.5" aria-hidden="true" />
              Edit Bio Link
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleNativeShare()}
            aria-label="Share bio link"
            className={`grid size-8 cursor-pointer place-items-center rounded-full border backdrop-blur-md transition-opacity hover:opacity-90 ${t.pillBg}`}
          >
            <Share2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Centered Mobile-First Bio Card */}
      <main className="mx-auto max-w-md px-4 pb-14 pt-2">
        <div className={`rounded-3xl border p-5 sm:p-6 ${t.cardBg}`}>
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={vendor.logo || vendor.image}
                alt={vendor.name}
                referrerPolicy="no-referrer"
                className="size-24 rounded-full border-4 border-white/80 object-cover shadow-xl"
              />
              <span
                className={`absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-2 border-white shadow-md ${t.accentBadge}`}
                title={vendor.marketplace === 'party' ? 'PimpMyParty Partner' : 'FindMyBites Partner'}
              >
                {vendor.marketplace === 'party' ? (
                  <PartyPopper className="size-3.5" aria-hidden="true" />
                ) : (
                  <UtensilsCrossed className="size-3.5" aria-hidden="true" />
                )}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              <h1 className={`text-2xl font-extrabold tracking-tight ${t.titleText}`}>
                {vendor.name}
              </h1>
              {vendor.verified && (
                <BadgeCheck className="size-5 shrink-0 text-sky-400" aria-label="Verified vendor" />
              )}
            </div>

            <p className={`mt-1 text-xs font-mono font-semibold ${t.subText}`}>
              findmybites.com/fmb/{handle}
            </p>

            <p className={`mt-2.5 text-sm leading-relaxed ${t.subText}`}>{vendor.tagline}</p>

            {/* Quick Trust Metadata */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-semibold">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${t.pillBg}`}>
                <MapPin className="size-3" aria-hidden="true" />
                {vendor.city}, {vendor.country}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${t.pillBg}`}>
                <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                {vendor.rating.toFixed(1)} ({vendor.reviewCount})
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${t.pillBg}`}>
                From {formatMoney(vendor.startingPriceUsd, currency)}
              </span>
            </div>

            {/* Active Promo Offer Pill */}
            {vendor.promoBanner && (
              <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-neutral-950 shadow-md">
                <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{vendor.promoBanner}</span>
              </div>
            )}
          </div>

          {/* Primary Bio Action Stack */}
          <div className="mt-6 space-y-3">
            {/* #1 Hero CTA: Direct WhatsApp Order */}
            <a
              href={buildWhatsAppUrl(
                vendor,
                `Hi ${vendor.name}! I found your FindMyBites bio link (findmybites.com/fmb/${handle}) and would love to see your menu & availability.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onTrackWhatsAppClick?.(vendor.id)}
              className="flex w-full items-center justify-between rounded-2xl bg-[#25D366] px-4 py-3.5 text-white shadow-lg transition-transform hover:scale-[1.015] hover:bg-[#1ebe5d]"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/20">
                  <MessageCircle className="size-5" aria-hidden="true" />
                </span>
                <div className="text-left">
                  <p className="text-sm font-extrabold leading-tight">Order / Chat on WhatsApp</p>
                  <p className="text-[11px] font-medium text-white/90">{vendor.responseTime}</p>
                </div>
              </div>
              <ChevronRight className="size-5 shrink-0 opacity-90" aria-hidden="true" />
            </a>

            {/* #2 Primary CTA: Full One-Page Menu & Storefront */}
            <button
              type="button"
              onClick={() => onOpenStorefront(vendor)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3.5 transition-all ${t.linkBg} ${t.linkHover}`}
            >
              <div className="flex items-center gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${t.accentBadge}`}>
                  <ShoppingBag className="size-5" aria-hidden="true" />
                </span>
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight">
                    View Full Menu &amp; Packages ({vendor.products.length})
                  </p>
                  <p className="text-[11px] opacity-75">
                    Prices, photo gallery, reviews &amp; instant WhatsApp basket
                  </p>
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden="true" />
            </button>

            {/* #3 Custom Vendor Links (Swiggy, Zomato, Talabat, Reviews, Reels, Website, etc.) */}
            {vendor.customLinks &&
              vendor.customLinks.map((link) => {
                const safeHref = sanitizeSafeHttpUrl(link.url);
                if (!safeHref) return null;
                return (
                  <a
                    key={link.id}
                    href={safeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 transition-all ${t.linkBg} ${t.linkHover}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-black/5 dark:bg-white/10">
                        <ExternalLink className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-bold leading-tight">{link.title}</p>
                        {link.badge && (
                          <p className="text-[11px] font-medium opacity-70">{link.badge}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                  </a>
                );
              })}

            {/* #4 Instagram Link (if provided) */}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 transition-all ${t.linkBg} ${t.linkHover}`}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white">
                    <Instagram className="size-4" aria-hidden="true" />
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-bold leading-tight">Follow on Instagram</p>
                    <p className="text-[11px] opacity-70">
                      {vendor.instagramHandle?.startsWith('http')
                        ? 'See our latest photos & reels'
                        : `@${vendor.instagramHandle?.replace(/^@+/, '')}`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden="true" />
              </a>
            )}

            {/* #5 Google Maps Directions from GPS Pin */}
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 transition-all ${t.linkBg} ${t.linkHover}`}
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-600">
                  <Navigation className="size-4" aria-hidden="true" />
                </span>
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight">Get Directions on Google Maps</p>
                  <p className="text-[11px] opacity-70">
                    {vendor.area}, {vendor.city}
                  </p>
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden="true" />
            </a>
          </div>

          {/* Bestsellers Quick-Order Strip (Top 3 Products) */}
          {vendor.products.length > 0 && (
            <div className="mt-6">
              <div className="mb-2.5 flex items-center justify-between">
                <p className={`text-[11px] font-bold uppercase tracking-wider ${t.subText}`}>
                  Popular Packages
                </p>
                <button
                  type="button"
                  onClick={() => onOpenStorefront(vendor)}
                  className={`cursor-pointer text-[11px] font-bold underline underline-offset-2 ${t.titleText}`}
                >
                  See all {vendor.products.length}
                </button>
              </div>
              <div className="space-y-2">
                {vendor.products.slice(0, 3).map((prod) => (
                  <a
                    key={prod.id}
                    href={buildWhatsAppUrl(
                      vendor,
                      `Hi ${vendor.name}! I'm interested in "${prod.name}" (${prod.serves}${prod.dietaryTags?.length ? ` · ${prod.dietaryTags.join(', ')}` : ''} · ${formatMoney(prod.priceUsd, currency)}) from your FindMyBites bio link.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onTrackWhatsAppClick?.(vendor.id)}
                    className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-all ${t.linkBg} ${t.linkHover}`}
                  >
                    <div className="flex aspect-[4/3] w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain object-center"
                      />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-xs font-bold">{prod.name}</p>
                      <p className="truncate text-[11px] opacity-70">
                        {prod.serves}
                        {prod.dietaryTags && prod.dietaryTags.length > 0
                          ? ` · ${prod.dietaryTags.slice(0, 2).join(', ')}`
                          : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-xs font-extrabold">
                        {formatMoney(prod.priceUsd, currency)}
                      </p>
                      <span className="text-[10px] font-bold text-[#16a34a]">WhatsApp →</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Shareable Short Bio URLs + QR & Story Card Strip */}
          <div className={`mt-6 rounded-2xl border p-3.5 ${t.pillBg}`}>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide">
              <Link2 className="size-3.5" aria-hidden="true" />
              Copy Short Link for Instagram / WhatsApp Bio
            </p>
            <div className="mt-2 space-y-1.5">
              <button
                type="button"
                onClick={() => handleCopy('fmb')}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-black/20 px-3 py-2 text-left text-xs font-mono transition-colors hover:bg-black/30"
              >
                <span className="truncate">findmybites.com/fmb/{handle}</span>
                <span className="inline-flex shrink-0 items-center gap-1 font-sans text-[11px] font-bold">
                  {copiedMode === 'fmb' ? (
                    <>
                      <Check className="size-3.5 text-emerald-300" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" /> Copy
                    </>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy('at')}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-black/15 px-3 py-2 text-left text-xs font-mono transition-colors hover:bg-black/25"
              >
                <span className="truncate">findmybites.com/@{handle}</span>
                <span className="inline-flex shrink-0 items-center gap-1 font-sans text-[11px] font-bold">
                  {copiedMode === 'at' ? (
                    <>
                      <Check className="size-3.5 text-emerald-300" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" /> Copy
                    </>
                  )}
                </span>
              </button>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold transition-colors hover:bg-white/25"
              >
                <QrCode className="size-3.5" aria-hidden="true" />
                QR Poster
              </button>
              <button
                type="button"
                onClick={() => setStoryOpen(true)}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold transition-colors hover:bg-white/25"
              >
                <Instagram className="size-3.5" aria-hidden="true" />
                Story Card
              </button>
            </div>
          </div>
        </div>

        {/* Viral Growth Footer — Claim Your Own Free Bio Link */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClaimOwnBioLink}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold backdrop-blur-md transition-transform hover:scale-[1.02] ${t.pillBg}`}
          >
            <Store className="size-3.5" aria-hidden="true" />
            <span>
              Powered by <strong>FindMyBites × PimpMyParty</strong> · Claim your free /fmb/ bio link →
            </span>
          </button>
          <p className={`mt-2 flex items-center justify-center gap-1 text-[11px] opacity-75 ${t.subText}`}>
            <Globe2 className="size-3" aria-hidden="true" />
            India · Dubai/UAE · Sri Lanka · Pakistan · Bangladesh · Nepal
          </p>
        </div>
      </main>

      <QrPosterModal
        vendor={qrOpen ? vendor : null}
        onClose={() => setQrOpen(false)}
      />

      <PromoCardModal
        vendor={storyOpen ? vendor : null}
        currency={currency}
        onClose={() => setStoryOpen(false)}
        onTrackShare={onTrackShare}
      />
    </div>
  );
}
