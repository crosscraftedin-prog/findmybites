import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Check,
  Clock,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  Eye,
  Globe2,
  Heart,
  Image as ImageIcon,
  Instagram,
  Link2,
  LogIn,
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  Package,
  PauseCircle,
  Plus,
  QrCode,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  BookingEnquiry,
  CloudVendorMetric,
  CurrencyCode,
  Vendor,
  VendorProduct,
  VendorProductVariant,
  VendorReview,
  buildWhatsAppUrl,
  formatMoney,
  getCustomBuilderModeConfig,
  getVendorCoverageLabel,
  getVendorCoveredStatesList,
  getVendorQuickTags,
  isCustomBuilderActive,
  sanitizeSafeHttpUrl,
  suggestBuilderModeForCategory,
} from '../data/vendors';
import {
  createReviewInCloud,
  deleteReviewInCloud,
  subscribeVendorMetric,
  subscribeVendorReviews,
} from '../services/firestoreService';
import { DirectOrderCheckoutModal } from './DirectOrderCheckoutModal';
import { FoodTypeBadge, FoodTypeIcon } from './FoodTypeBadge';
import { ProductShareModal } from './ProductShareModal';
import { PromoCardModal } from './PromoCardModal';
import { QrPosterModal } from './QrPosterModal';
import { VendorCustomBoxBuilder } from './VendorCustomBoxBuilder';

export interface VendorMetrics {
  views: number;
  whatsappClicks: number;
}

interface VendorWebsiteViewProps {
  vendor: Vendor | null;
  currency: CurrencyCode;
  isSaved: boolean;
  metrics?: VendorMetrics;
  browsingLocation?: string;
  user?: User | null;
  canEdit?: boolean;
  onSignIn?: () => Promise<void>;
  onEditStorefront?: (vendor: Vendor) => void;
  onOpenBioLink?: (vendor: Vendor) => void;
  onClose: () => void;
  onToggleSave: (vendorId: string) => void;
  onCreateBooking: (booking: BookingEnquiry) => void;
  onOpenBookings: () => void;
  onTrackWhatsAppClick?: (vendorId: string) => void;
  onTrackShare?: (vendorId: string) => void;
}

export function VendorWebsiteView({
  vendor,
  currency,
  isSaved,
  metrics,
  browsingLocation,
  user,
  canEdit = false,
  onSignIn,
  onEditStorefront,
  onOpenBioLink,
  onClose,
  onToggleSave,
  onCreateBooking,
  onOpenBookings,
  onTrackWhatsAppClick,
  onTrackShare,
}: VendorWebsiteViewProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [catalogView, setCatalogView] = useState<'builder' | 'catalog'>('catalog');
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [qrMenuMode, setQrMenuMode] = useState<boolean>(false);
  const [checkoutOpen, setCheckoutOpen] = useState<boolean>(false);
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [basketExpanded, setBasketExpanded] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [promoCardOpen, setPromoCardOpen] = useState(false);
  const [shareProductTarget, setShareProductTarget] = useState<{
    product: VendorProduct;
    variant: VendorProductVariant | null;
  } | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [eventDate, setEventDate] = useState('2026-12-18');
  const [guests, setGuests] = useState(80);
  const [notes, setNotes] = useState('');
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  // Cloud reviews & live metrics
  const [cloudReviews, setCloudReviews] = useState<VendorReview[]>([]);
  const [cloudMetric, setCloudMetric] = useState<CloudVendorMetric | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewEventType, setReviewEventType] = useState('Birthday Party');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);

  useEffect(() => {
    if (vendor) {
      const params =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const itemParam = params?.get('item') ?? null;
      const menuModeParam = params?.get('menu') === '1' || params?.get('mode') === 'menu';
      const deepLinkedProduct = itemParam
        ? vendor.products.find((p) => p.id === itemParam)
        : undefined;

      setSelectedProductId(deepLinkedProduct?.id ?? vendor.products[0]?.id ?? '');
      setCatalogView(
        deepLinkedProduct || menuModeParam
          ? 'catalog'
          : isCustomBuilderActive(vendor) && vendor.products.length > 0
            ? 'builder'
            : 'catalog'
      );
      setFoodFilter('all');
      setSelectedSection('all');
      setQrMenuMode(menuModeParam);
      setCheckoutOpen(false);
      setSelectedVariants({});
      setBasket({});
      setBasketExpanded(false);
      setQrOpen(false);
      setPromoCardOpen(false);
      setShareProductTarget(null);
      setLightboxImg(null);
      setSubmittedRef(null);
      setCopiedLink(false);
      setNotes('');
      setReviewComment('');
      setReviewStatus(null);

      if (deepLinkedProduct) {
        const scrollTimer = window.setTimeout(() => {
          const el = document.getElementById(`vendor-product-${deepLinkedProduct.id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 220);
        return () => window.clearTimeout(scrollTimer);
      }
    }
  }, [vendor]);

  useEffect(() => {
    if (!vendor) {
      setCloudReviews([]);
      setCloudMetric(null);
      return;
    }
    const unsubRev = subscribeVendorReviews(vendor.id, setCloudReviews);
    const unsubMet = subscribeVendorMetric(vendor.id, setCloudMetric);
    return () => {
      unsubRev();
      unsubMet();
    };
  }, [vendor]);

  useEffect(() => {
    if (!vendor) return;
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !qrOpen &&
        !promoCardOpen &&
        !shareProductTarget &&
        !lightboxImg &&
        !checkoutOpen
      ) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [vendor, qrOpen, promoCardOpen, shareProductTarget, lightboxImg, checkoutOpen, onClose]);

  // Inject LocalBusiness JSON-LD with sameAs (Google Maps & Instagram) for SEO
  useEffect(() => {
    if (!vendor) return;
    const sameAs: string[] = [];
    const safeMaps = vendor.googleMapsUrl ? sanitizeSafeHttpUrl(vendor.googleMapsUrl) : null;
    if (safeMaps) sameAs.push(safeMaps);
    if (vendor.instagramHandle?.trim()) {
      const rawIg = vendor.instagramHandle.trim();
      const igHref = /^https?:\/\//i.test(rawIg)
        ? sanitizeSafeHttpUrl(rawIg)
        : `https://instagram.com/${rawIg.replace(/^@+/, '').replace(/[^a-zA-Z0-9._]/g, '')}`;
      if (igHref) sameAs.push(igHref);
    }

    const ldJson: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': vendor.marketplace === 'food' ? 'FoodEstablishment' : 'LocalBusiness',
      name: vendor.name,
      description: vendor.description || vendor.tagline,
      url: `https://www.findmybites.com/v/${vendor.slug}`,
      telephone: vendor.whatsappNumber ? `+${vendor.whatsappNumber}` : undefined,
      address: {
        '@type': 'PostalAddress',
        addressLocality: vendor.city,
        addressRegion: vendor.state,
        addressCountry: vendor.country,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: vendor.lat,
        longitude: vendor.lng,
      },
      ...(sameAs.length > 0 ? { sameAs } : {}),
      ...(vendor.reviewCount > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: vendor.rating,
              reviewCount: vendor.reviewCount,
            },
          }
        : {}),
    };

    const scriptId = 'fmb-vendor-jsonld';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = scriptId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(ldJson);

    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [vendor]);

  const basketItems = useMemo(() => {
    if (!vendor) return [];
    const items: Array<{
      key: string;
      product: VendorProduct;
      variantLabel?: string;
      unitPriceUsd: number;
      displayName: string;
      qty: number;
    }> = [];
    for (const [key, qty] of Object.entries(basket)) {
      if (!qty || qty <= 0) continue;
      const [prodId, varId] = key.split('::');
      const product = vendor.products.find((p) => p.id === prodId);
      if (!product) continue;
      const variant = varId ? product.variants?.find((v) => v.id === varId) : undefined;
      const unitPriceUsd = variant ? variant.priceUsd : product.priceUsd;
      const displayName = variant ? `${product.name} (${variant.label})` : product.name;
      items.push({
        key,
        product,
        variantLabel: variant?.label,
        unitPriceUsd,
        displayName,
        qty,
      });
    }
    return items;
  }, [vendor, basket]);

  const basketTotalCount = useMemo(
    () => basketItems.reduce((sum, item) => sum + item.qty, 0),
    [basketItems]
  );

  const basketTotalUsd = useMemo(
    () => basketItems.reduce((sum, item) => sum + item.unitPriceUsd * item.qty, 0),
    [basketItems]
  );

  if (!vendor) return null;

  const activeProduct: VendorProduct | undefined =
    vendor.products.find((p) => p.id === selectedProductId) ?? vendor.products[0];
  const activeProductVariant = activeProduct?.variants?.length
    ? activeProduct.variants.find((v) => v.id === selectedVariants[activeProduct.id]) ??
      activeProduct.variants[0]
    : undefined;
  const activeProductLabel = activeProduct
    ? activeProductVariant
      ? `${activeProduct.name} (${activeProductVariant.label})`
      : activeProduct.name
    : '';
  const activeProductPriceUsd = activeProduct
    ? activeProductVariant
      ? activeProductVariant.priceUsd
      : activeProduct.priceUsd
    : 0;

  const quickTags = getVendorQuickTags(vendor);
  const shareUrl = `findmybites.com/v/${vendor.slug}`;

  const updateBasketQty = (basketKey: string, delta: number) => {
    setBasket((prev) => {
      const nextQty = Math.max(0, (prev[basketKey] ?? 0) + delta);
      if (nextQty === 0) {
        const next = { ...prev };
        delete next[basketKey];
        return next;
      }
      return { ...prev, [basketKey]: nextQty };
    });
  };

  const buildBasketWhatsAppMessage = () => {
    const lines = basketItems.map(({ product, displayName, unitPriceUsd, qty }) => {
      const foodLabel =
        product.foodType === 'veg'
          ? ' [Veg]'
          : product.foodType === 'non-veg'
            ? ' [Non-Veg]'
            : '';
      return `• ${qty}× ${displayName}${foodLabel} (${formatMoney(unitPriceUsd * qty, currency)})`;
    });
    return [
      `Hi ${vendor.name}, I'd like to order from your FindMyBites storefront (${shareUrl}):`,
      '',
      ...lines,
      '',
      `Estimated Total: ${formatMoney(basketTotalUsd, currency)}`,
      browsingLocation ? `Delivery Region: ${browsingLocation}` : '',
      `Event Date: ${eventDate} · Guests: ${guests}`,
      notes.trim() ? `Notes: ${notes.trim()}` : '',
      'Please confirm availability and next steps!',
    ]
      .filter(Boolean)
      .join('\n');
  };

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(`https://www.${shareUrl}`).catch(() => {});
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!activeProduct || !customerName.trim() || !customerEmail.trim()) return;

    const packageSummary =
      basketItems.length > 0
        ? basketItems.map((i) => `${i.qty}× ${i.displayName}`).join(', ')
        : activeProductLabel;

    const estimatedUsd = basketItems.length > 0 ? basketTotalUsd : activeProductPriceUsd;

    const refCode = `FMB-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: BookingEnquiry = {
      id: `${Date.now()}`,
      reference: refCode,
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorCity: `${vendor.city}, ${vendor.country}`,
      vendorCategory: vendor.category,
      packageName: packageSummary,
      estimatedUsd,
      eventDate,
      guests,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      notes: notes.trim(),
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      status: 'Confirmed Enquiry',
    };

    onCreateBooking(newBooking);
    setSubmittedRef(refCode);
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      await onSignIn?.();
      return;
    }
    if (reviewComment.trim().length < 5) return;
    setSubmittingReview(true);
    setReviewStatus(null);
    try {
      await createReviewInCloud(vendor.id, user, {
        rating: reviewRating,
        eventType: reviewEventType,
        comment: reviewComment.trim(),
      });
      setReviewComment('');
      setReviewRating(5);
      setReviewStatus('Thank you! Your verified review is now live in the cloud.');
    } catch {
      setReviewStatus('Could not save review right now. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    await deleteReviewInCloud(reviewId);
    setReviewStatus('Review removed.');
  };

  const mergedReviews = [...cloudReviews, ...vendor.reviews];
  const effectiveReviewCount = vendor.reviewCount + cloudReviews.length;
  const effectiveRating =
    cloudReviews.length > 0
      ? Number(
          (
            (vendor.rating * Math.max(1, vendor.reviewCount) +
              cloudReviews.reduce((s, r) => s + r.rating, 0)) /
            (Math.max(1, vendor.reviewCount) + cloudReviews.length)
          ).toFixed(2)
        )
      : vendor.rating;

  const displayViews = Math.max(metrics?.views ?? 0, cloudMetric?.views ?? 0);
  const displayWaClicks = Math.max(metrics?.whatsappClicks ?? 0, cloudMetric?.whatsappClicks ?? 0);

  const isPaid = vendor.planTier === 'business' || vendor.planTier === 'pro';
  const isOrderingPaused = vendor.orderingConfig?.acceptingOrders === false;
  const safeGoogleMapsUrl = vendor.googleMapsUrl
    ? sanitizeSafeHttpUrl(vendor.googleMapsUrl)
    : null;
  const safeGoogleReviewUrl = vendor.googleReviewUrl
    ? sanitizeSafeHttpUrl(vendor.googleReviewUrl)
    : null;

  return (
    <div
      data-ecosystem={vendor.marketplace === 'party' ? 'PIMPMYPARTY' : 'FINDMYBITES'}
      className="fixed inset-0 z-50 overflow-y-auto bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-label={`${vendor.name} one-page vendor website`}
    >
      {/* Mini-Website Top Bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </button>

          <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/60 px-3.5 py-1.5 text-xs text-muted-foreground lg:flex">
            <Globe2 className="size-3.5 text-brand" aria-hidden="true" />
            <span className="font-mono text-foreground">{shareUrl}</span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="ml-1 inline-flex cursor-pointer items-center gap-1 font-semibold text-brand hover:underline"
            >
              {copiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copiedLink ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canEdit && onEditStorefront && (
              <button
                type="button"
                onClick={() => onEditStorefront(vendor)}
                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 text-xs font-bold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover whitespace-nowrap"
              >
                <Edit3 className="size-4" aria-hidden="true" />
                <span>Edit Storefront</span>
              </button>
            )}
            {onOpenBioLink && (
              <button
                type="button"
                onClick={() => onOpenBioLink(vendor)}
                className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:border-brand hover:text-brand whitespace-nowrap"
                title="Open short FindMyBites Link-in-Bio page"
              >
                <Link2 className="size-4 text-brand" aria-hidden="true" />
                <span className="hidden md:inline">Bio Link</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setQrMenuMode((prev) => !prev);
                setCatalogView('catalog');
              }}
              className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                qrMenuMode
                  ? 'border-brand bg-brand text-brand-foreground'
                  : 'border-border bg-card text-foreground hover:border-brand hover:text-brand'
              }`}
              title="Switch between Full Storefront and Clean QR Menu view"
            >
              <BookOpen className="size-4" aria-hidden="true" />
              <span className="hidden md:inline">{qrMenuMode ? 'Full Page' : 'QR Menu'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPromoCardOpen(true)}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:border-brand hover:text-brand whitespace-nowrap"
            >
              <Instagram className="size-4" aria-hidden="true" />
              <span className="hidden md:inline">Story Card</span>
            </button>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:border-brand hover:text-brand whitespace-nowrap"
            >
              <QrCode className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">QR Poster</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleSave(vendor.id)}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-accent whitespace-nowrap"
            >
              <Heart
                className={`size-4 ${isSaved ? 'fill-brand text-brand' : ''}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
            </button>
            <a
              href={buildWhatsAppUrl(vendor)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onTrackWhatsAppClick?.(vendor.id)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#25D366] px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#1ebe5d] whitespace-nowrap"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              WhatsApp
            </a>
          </div>
        </div>
      </header>

      {canEdit && onEditStorefront && (
        <div className="border-b border-brand-border bg-brand-soft/80">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs sm:px-6 lg:px-8">
            <span className="font-semibold text-foreground">
              You manage this storefront — update cover, logo, online ordering &amp; UPI, promo codes, products or GPS pin anytime.
            </span>
            <button
              type="button"
              onClick={() => onEditStorefront(vendor)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
            >
              <Edit3 className="size-3.5" aria-hidden="true" />
              Edit Details &amp; Products
            </button>
          </div>
        </div>
      )}

      {/* Clean Distraction-Free QR Menu Header OR Full Storefront Hero */}
      {qrMenuMode ? (
        <section className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              {vendor.logo ? (
                <img
                  src={vendor.logo}
                  alt={`${vendor.name} logo`}
                  className="size-12 shrink-0 rounded-xl border border-border object-cover"
                />
              ) : (
                <img
                  src={vendor.image}
                  alt={vendor.name}
                  className="size-12 shrink-0 rounded-xl border border-border object-cover"
                />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="text-lg font-extrabold text-foreground sm:text-xl">
                    {vendor.name}
                  </h1>
                  {vendor.verified && (
                    <BadgeCheck className="size-4 text-[#25D366]" aria-label="Verified" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {vendor.category} · {vendor.city} · Digital QR Menu &amp; Direct Online Ordering (0% commission)
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {vendor.orderingConfig?.minAdvanceHours ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <Clock className="size-3.5 text-brand" aria-hidden="true" />
                  {vendor.orderingConfig.minAdvanceHours}h advance notice
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setQrMenuMode(false)}
                className="cursor-pointer rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
              >
                View Full Storefront
              </button>
            </div>
          </div>
        </section>
      ) : (
      <section className="relative overflow-hidden border-b border-border bg-[#0A0A0A]">
        <img
          src={vendor.image}
          alt={vendor.name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/35" />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/90">
              {isPaid && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 font-bold text-brand-foreground">
                  <Crown className="size-3" aria-hidden="true" />
                  Business Partner
                </span>
              )}
              <span className="font-semibold">{vendor.category}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {vendor.area}, {vendor.city}, {vendor.state} · {vendor.country}
              </span>
              {(() => {
                const covBadge = getVendorCoverageLabel(vendor, browsingLocation);
                return covBadge ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/90 px-2.5 py-0.5 text-[11px] font-bold text-white">
                    <Globe2 className="size-3" aria-hidden="true" />
                    {covBadge}
                  </span>
                ) : null;
              })()}
            </div>

            <div className="mt-3 flex items-center gap-3">
              {vendor.logo && (
                <img
                  src={vendor.logo}
                  alt={`${vendor.name} logo`}
                  className="size-14 shrink-0 rounded-2xl border-2 border-white/30 bg-white object-cover shadow-lg sm:size-16"
                />
              )}
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {vendor.name}
              </h1>
              {vendor.verified && (
                <BadgeCheck className="size-7 shrink-0 text-[#25D366]" aria-label="Verified" />
              )}
            </div>

            <p className="mt-3 text-base leading-relaxed text-white/85 sm:text-lg">
              {vendor.tagline}
            </p>

            {vendor.promoBanner && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-400/20 px-3.5 py-2 text-xs font-bold text-amber-100 backdrop-blur-md">
                <Sparkles className="size-4 shrink-0 text-amber-300" aria-hidden="true" />
                <span>Special Offer: {vendor.promoBanner}</span>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                <strong className="font-mono text-white">{effectiveRating.toFixed(2)}</strong>
                <span>({effectiveReviewCount} verified reviews)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-[#25D366]" aria-hidden="true" />
                {vendor.responseTime}
              </span>
              <span className="font-mono text-white">
                Starting {formatMoney(vendor.startingPriceUsd, currency)}
              </span>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={buildWhatsAppUrl(
                  vendor,
                  browsingLocation
                    ? `Hi ${vendor.name}, I found your storefront on FindMyBites (${shareUrl}). Delivery Region: ${browsingLocation}. I'd love to discuss an order!`
                    : undefined
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onTrackWhatsAppClick?.(vendor.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] hover:bg-[#1ebe5d]"
              >
                <MessageCircle className="size-5" aria-hidden="true" />
                Talk Directly on WhatsApp
              </a>
              <a
                href="#vendor-products"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                <ShoppingBag className="size-4" aria-hidden="true" />
                Build Order ({vendor.products.length} Items)
              </a>
              <button
                type="button"
                onClick={() => setPromoCardOpen(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                <Instagram className="size-4" aria-hidden="true" />
                Share Story Card
              </button>
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                <QrCode className="size-4" aria-hidden="true" />
                QR Menu Poster
              </button>
              {safeGoogleMapsUrl && (
                <a
                  href={safeGoogleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
                >
                  <Navigation className="size-4" aria-hidden="true" />
                  Directions
                </a>
              )}
              {safeGoogleReviewUrl && (
                <a
                  href={safeGoogleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
                >
                  <Star className="size-4 text-amber-300" aria-hidden="true" />
                  Google Reviews
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Main One-Page Storefront Content */}
      <main className={`mx-auto max-w-6xl px-4 pb-36 sm:px-6 lg:px-8 ${qrMenuMode ? 'space-y-8 py-6' : 'space-y-14 py-12'}`}>
        {isOrderingPaused && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <PauseCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>
                <strong>Online orders are currently paused</strong> — {vendor.name} is temporarily not accepting new online checkout orders. You can still browse the menu or message on WhatsApp for future dates.
              </span>
            </div>
          </div>
        )}

        {/* About + Service Areas */}
        {!qrMenuMode && (
        <section className="grid grid-cols-1 gap-8 border-b border-border pb-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <h2 className="text-xl font-extrabold text-foreground">About {vendor.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {vendor.description}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Specialties: </span>
              {vendor.specialties.join(' · ')}
            </p>
            {quickTags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {quickTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Areas We Serve in {vendor.city}
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-foreground">
              {vendor.serviceAreas.join(' · ')}
            </p>
            {(vendor.allStatesCoverage || (vendor.serviceStates && vendor.serviceStates.length > 0)) && (
              <div className="mt-4 border-t border-border pt-3.5">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                  <Globe2 className="size-3.5" aria-hidden="true" />
                  {vendor.allStatesCoverage
                    ? vendor.country === 'India'
                      ? 'Pan-India Coverage'
                      : `All ${vendor.country} Coverage`
                    : `Multi-State Delivery (${getVendorCoveredStatesList(vendor).length} States)`}
                </p>
                {vendor.allStatesCoverage ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Available across all states &amp; major cities in {vendor.country} via our
                    verified fulfillment network (HQ: {vendor.city}, {vendor.state}).
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {getVendorCoveredStatesList(vendor).map((st) => (
                      <span
                        key={st}
                        className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-800 dark:text-indigo-200"
                      >
                        {st}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Direct WhatsApp Hotline</p>
              <p className="mt-0.5 font-mono">+{vendor.whatsappNumber}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3.5 text-brand" aria-hidden="true" />
                <strong className="font-mono text-foreground">{displayViews}</strong> storefront views
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="size-3.5 text-[#25D366]" aria-hidden="true" />
                <strong className="font-mono text-foreground">{displayWaClicks}</strong> WA leads
              </span>
            </div>
          </div>
        </section>
        )}

        {/* Portfolio Photo Gallery (shown when vendor uploaded gallery photos) */}
        {!qrMenuMode && vendor.gallery && vendor.gallery.length > 0 && (
          <section className="border-b border-border pb-10">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand">
                  <ImageIcon className="size-3.5" aria-hidden="true" />
                  Past Events &amp; Work Portfolio
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-foreground sm:text-2xl">
                  Photo Gallery ({vendor.gallery.length})
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">Tap any photo to zoom</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {vendor.gallery.map((photo, idx) => (
                <button
                  key={`${photo.slice(0, 24)}-${idx}`}
                  type="button"
                  onClick={() => setLightboxImg(photo)}
                  className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-border bg-muted"
                >
                  <img
                    src={photo}
                    alt={`${vendor.name} portfolio ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Full Product Catalog Grid & Optional Custom Plate / Snack Box Builder */}
        <section id="vendor-products">
          {(() => {
            const hasCustomBuilder = Boolean(
              isCustomBuilderActive(vendor) && vendor.products.length > 0
            );
            const builderMode =
              vendor.customBuilderMode ?? suggestBuilderModeForCategory(vendor.category);
            const builderModeConfig = getCustomBuilderModeConfig(builderMode);
            const showBuilder = hasCustomBuilder && catalogView === 'builder';

            const vegCount = vendor.products.filter((p) => p.foodType === 'veg').length;
            const nonVegCount = vendor.products.filter((p) => p.foodType === 'non-veg').length;
            const hasFoodTypeTags = vegCount > 0 || nonVegCount > 0;
            const menuSections = Array.from(
              new Set(
                vendor.products
                  .map((p) => p.menuSection?.trim())
                  .filter((s): s is string => Boolean(s))
              )
            );
            const displayedProducts = vendor.products.filter((p) => {
              if (foodFilter !== 'all' && p.foodType !== foodFilter) return false;
              if (
                selectedSection !== 'all' &&
                (p.menuSection?.trim() || '') !== selectedSection
              ) {
                return false;
              }
              return true;
            });

            return (
              <>
                {isCustomBuilderActive(vendor) && vendor.products.length === 0 && (
                  <div className="mb-6 rounded-2xl border border-brand-border bg-brand-soft/35 p-4 text-xs text-foreground">
                    <p className="inline-flex items-center gap-1.5 font-extrabold text-brand">
                      <Package className="size-4" aria-hidden="true" />
                      {builderModeConfig.label} is enabled for {vendor.name}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Add individual menu items in <strong>Edit Storefront</strong> so customers can mix &amp; match their own custom {builderModeConfig.unitSingular}.
                    </p>
                  </div>
                )}

                {hasCustomBuilder && (
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-soft/35 p-3">
                    <div className="inline-flex flex-wrap rounded-xl bg-background/80 p-1 ring-1 ring-border">
                      <button
                        type="button"
                        onClick={() => setCatalogView('builder')}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-extrabold transition-colors ${
                          showBuilder
                            ? 'bg-brand text-brand-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {builderMode === 'catering' ? (
                          <UtensilsCrossed className="size-3.5" aria-hidden="true" />
                        ) : (
                          <Package className="size-3.5" aria-hidden="true" />
                        )}
                        Build Your Own {builderModeConfig.label}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCatalogView('catalog')}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                          !showBuilder
                            ? 'bg-foreground text-background shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <ShoppingBag className="size-3.5" aria-hidden="true" />
                        Full Catalog &amp; Ready Packages ({vendor.products.length})
                      </button>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Min {Math.max(1, vendor.customBuilderMinQty ?? builderModeConfig.defaultMinQty)}{' '}
                      {builderModeConfig.unitPlural} · Direct WhatsApp order
                    </p>
                  </div>
                )}

                {showBuilder ? (
                  <VendorCustomBoxBuilder
                    key={vendor.id}
                    vendor={vendor}
                    currency={currency}
                    shareUrl={shareUrl}
                    browsingLocation={browsingLocation}
                    onTrackWhatsAppClick={(vendorId) => onTrackWhatsAppClick?.(vendorId)}
                  />
                ) : (
                  <>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-brand">
                      One-Page Product Catalog &amp; WhatsApp Order Basket
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                      Products, Counters &amp; Packages
                    </h2>
                  </div>

                  {hasFoodTypeTags ? (
                    <div
                      className="flex flex-wrap items-center gap-1.5"
                      role="group"
                      aria-label="Filter menu by Veg or Non-Veg"
                    >
                      <button
                        type="button"
                        onClick={() => setFoodFilter('all')}
                        className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                          foodFilter === 'all'
                            ? 'border-foreground bg-foreground text-background'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        All ({vendor.products.length})
                      </button>
                      {vegCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFoodFilter('veg')}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                            foodFilter === 'veg'
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-emerald-600/35 bg-card text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          <FoodTypeIcon foodType="veg" size="xs" />
                          Veg ({vegCount})
                        </button>
                      )}
                      {nonVegCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFoodFilter('non-veg')}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                            foodFilter === 'non-veg'
                              ? 'border-red-600 bg-red-600 text-white'
                              : 'border-red-600/35 bg-card text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40'
                          }`}
                        >
                          <FoodTypeIcon foodType="non-veg" size="xs" />
                          Non-Veg ({nonVegCount})
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Add items to order online with UPI/Pickup/Delivery or chat on WhatsApp.
                    </p>
                  )}
                </div>

                {menuSections.length > 0 && (
                  <div
                    className="mt-4 flex flex-wrap items-center gap-1.5"
                    role="tablist"
                    aria-label="Filter menu by section"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSection('all')}
                      className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                        selectedSection === 'all'
                          ? 'border-brand bg-brand text-brand-foreground'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All Sections ({vendor.products.length})
                    </button>
                    {menuSections.map((sec) => {
                      const secCount = vendor.products.filter(
                        (p) => (p.menuSection?.trim() || '') === sec
                      ).length;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setSelectedSection(sec)}
                          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                            selectedSection === sec
                              ? 'border-brand bg-brand text-brand-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-brand/50 hover:text-foreground'
                          }`}
                        >
                          {sec} ({secCount})
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {displayedProducts.map((product) => {
                    const isSelected = activeProduct?.id === product.id;
                    const hasVariants = Boolean(product.variants && product.variants.length > 0);
                    const selectedVariant = hasVariants
                      ? product.variants!.find((v) => v.id === selectedVariants[product.id]) ??
                        product.variants![0]
                      : undefined;
                    const basketKey = selectedVariant
                      ? `${product.id}::${selectedVariant.id}`
                      : product.id;
                    const activePriceUsd = selectedVariant
                      ? selectedVariant.priceUsd
                      : product.priceUsd;
                    const activeServesText = selectedVariant
                      ? selectedVariant.serves
                        ? `${selectedVariant.label} · ${selectedVariant.serves}`
                        : selectedVariant.label
                      : product.serves;
                    const qty = basket[basketKey] ?? 0;
                    const foodTypeText =
                      product.foodType === 'veg'
                        ? ' · Veg'
                        : product.foodType === 'non-veg'
                          ? ' · Non-Veg'
                          : '';
                    const dietarySuffix =
                      product.dietaryTags && product.dietaryTags.length > 0
                        ? ` [${product.dietaryTags.join(', ')}]`
                        : '';
                    const deliveryRegionSuffix = browsingLocation
                      ? ` · Delivery Region: ${browsingLocation}`
                      : '';
                    const waItemName = selectedVariant
                      ? `${product.name} (${selectedVariant.label})`
                      : product.name;
                    const productWaText = `Hi ${vendor.name}, I saw "${waItemName}" (${formatMoney(activePriceUsd, currency)} · ${activeServesText}${foodTypeText}${dietarySuffix}${deliveryRegionSuffix}) on your FindMyBites page (${shareUrl}). Is it available for my upcoming event?`;

                    const isSoldOut = product.inStock === false;
                    return (
                      <div
                        key={product.id}
                        id={`vendor-product-${product.id}`}
                        className={`flex scroll-mt-24 flex-col overflow-hidden rounded-2xl border bg-card transition-all ${
                          isSoldOut
                            ? 'border-border opacity-75'
                            : qty > 0
                              ? 'border-[#25D366] ring-2 ring-[#25D366]/20'
                              : isSelected
                                ? 'border-brand ring-2 ring-brand/20'
                                : 'border-border'
                        }`}
                      >
                        <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden border-b border-border/60 bg-white dark:bg-neutral-900">
                          <img
                            src={product.image}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            className={`h-full w-full object-contain object-center ${isSoldOut ? 'grayscale-[60%]' : ''}`}
                          />
                          {isSoldOut ? (
                            <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                              Sold Out
                            </span>
                          ) : product.tag ? (
                            <span className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                              {product.tag}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              setShareProductTarget({
                                product,
                                variant: selectedVariant ?? null,
                              })
                            }
                            aria-label={`Share ${waItemName} on Instagram, Facebook, X, or LinkedIn`}
                            title="Share to Instagram Stories, Post, Facebook, X & LinkedIn"
                            className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-brand"
                          >
                            <Share2 className="size-3" aria-hidden="true" />
                            Share
                          </button>
                          <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 font-mono text-xs font-bold tabular-nums text-white backdrop-blur-md">
                            {formatMoney(activePriceUsd, currency)}
                          </span>
                        </div>

                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              {activeServesText}
                              {product.menuSection ? ` · ${product.menuSection}` : ''}
                              {product.advanceHours && product.advanceHours > 0
                                ? ` · ${product.advanceHours}h pre-order`
                                : ''}
                            </p>
                            <FoodTypeBadge foodType={product.foodType} size="sm" />
                          </div>
                          <h3 className="mt-1.5 text-base font-bold text-foreground">
                            {product.name}
                          </h3>

                          {/* Interactive Weight / Size Variant Selector (e.g. 500g, 1 kg, 2 kg ... 5 kg) */}
                          {hasVariants && (
                            <div className="mt-2.5">
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                Select Weight / Size:
                              </p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {product.variants!.map((variant) => {
                                  const isVarActive = selectedVariant?.id === variant.id;
                                  const varBasketQty = basket[`${product.id}::${variant.id}`] ?? 0;
                                  return (
                                    <button
                                      key={variant.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedVariants((prev) => ({
                                          ...prev,
                                          [product.id]: variant.id,
                                        }));
                                        setSelectedProductId(product.id);
                                      }}
                                      className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums transition-colors ${
                                        isVarActive
                                          ? 'border-brand bg-brand text-brand-foreground shadow-xs'
                                          : 'border-border bg-background text-foreground hover:border-brand/60 hover:text-brand'
                                      }`}
                                    >
                                      <span>{variant.label}</span>
                                      {varBasketQty > 0 && (
                                        <span
                                          className={`rounded-full px-1 text-[10px] font-black ${
                                            isVarActive
                                              ? 'bg-white/25 text-white'
                                              : 'bg-[#25D366]/15 text-[#15803d]'
                                          }`}
                                        >
                                          ×{varBasketQty}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {product.dietaryTags && product.dietaryTags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {product.dietaryTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                            {product.description}
                          </p>

                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                      {isSoldOut ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-300"
                        >
                          Sold Out
                        </button>
                      ) : isOrderingPaused ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300"
                        >
                          Orders Paused
                        </button>
                      ) : qty > 0 ? (
                        <div className="inline-flex flex-1 items-center justify-between rounded-lg border border-[#25D366] bg-[#25D366]/10 px-2 py-1.5">
                          <button
                            type="button"
                            aria-label={`Remove one ${waItemName}`}
                            onClick={() => updateBasketQty(basketKey, -1)}
                            className="grid size-6 cursor-pointer place-items-center rounded-md bg-background text-foreground hover:bg-accent"
                          >
                            <Minus className="size-3.5" aria-hidden="true" />
                          </button>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {qty}
                            {selectedVariant ? ` × ${selectedVariant.label}` : ' in order'}
                          </span>
                          <button
                            type="button"
                            aria-label={`Add one more ${waItemName}`}
                            onClick={() => updateBasketQty(basketKey, 1)}
                            className="grid size-6 cursor-pointer place-items-center rounded-md bg-[#25D366] text-white hover:bg-[#1ebe5d]"
                          >
                            <Plus className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            updateBasketQty(basketKey, 1);
                            setSelectedProductId(product.id);
                          }}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand whitespace-nowrap"
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          Add{selectedVariant ? ` ${selectedVariant.label}` : ' to Order'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setShareProductTarget({
                            product,
                            variant: selectedVariant ?? null,
                          })
                        }
                        aria-label={`Share ${waItemName}`}
                        title="Share to Instagram Stories, Post, Facebook, X & LinkedIn"
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand"
                      >
                        <Share2 className="size-3.5" aria-hidden="true" />
                      </button>

                      <a
                        href={buildWhatsAppUrl(vendor, productWaText)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onTrackWhatsAppClick?.(vendor.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1ebe5d] whitespace-nowrap"
                      >
                        <MessageCircle className="size-3.5" aria-hidden="true" />
                        Ask
                      </a>
                    </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                  </>
                )}
              </>
            );
          })()}
        </section>

        {/* Booking Form + Verified Reviews side-by-side */}
        {!qrMenuMode && (
        <section
          id="vendor-enquiry-form"
          className="grid grid-cols-1 gap-8 border-t border-border pt-10 lg:grid-cols-12"
        >
          <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-7">
            <h2 className="text-xl font-extrabold text-foreground">
              Send a Direct Booking Request
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {basketItems.length > 0 ? (
                <>
                  Order basket:{' '}
                  <strong className="text-foreground">
                    {basketTotalCount} {basketTotalCount === 1 ? 'item' : 'items'} (
                    {formatMoney(basketTotalUsd, currency)})
                  </strong>
                </>
              ) : (
                <>
                  Selected product:{' '}
                  <strong className="text-foreground">
                    {activeProductLabel} (
                    {activeProduct ? formatMoney(activeProductPriceUsd, currency) : ''})
                  </strong>
                </>
              )}
            </p>

            {submittedRef ? (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Check className="size-5" aria-hidden="true" />
                  <h3 className="text-sm font-bold">
                    Enquiry {submittedRef} Saved — Continue on WhatsApp for Instant Confirmation
                  </h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Your booking request for {eventDate} ({guests} guests) is saved in your Bookings
                  list.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={buildWhatsAppUrl(
                      vendor,
                      basketItems.length > 0
                        ? buildBasketWhatsAppMessage()
                        : `Hi ${vendor.name}, I just sent booking enquiry ${submittedRef} for "${activeProductLabel}" on ${eventDate} (${guests} guests). Notes: ${notes || 'None'}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onTrackWhatsAppClick?.(vendor.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-bold text-white hover:bg-[#1ebe5d]"
                  >
                    <MessageCircle className="size-4" aria-hidden="true" />
                    Send to Vendor on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBookings();
                    }}
                    className="cursor-pointer rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent"
                  >
                    View My Bookings
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="v-name" className="block text-xs font-semibold text-foreground">
                      Your Name
                    </label>
                    <input
                      id="v-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Priya Sharma"
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="v-email" className="block text-xs font-semibold text-foreground">
                      Email or Phone
                    </label>
                    <input
                      id="v-email"
                      type="text"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="priya@example.com"
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="v-date" className="block text-xs font-semibold text-foreground">
                      Event Date
                    </label>
                    <input
                      id="v-date"
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="v-guests" className="block text-xs font-semibold text-foreground">
                      Guest Count
                    </label>
                    <input
                      id="v-guests"
                      type="number"
                      min={5}
                      max={5000}
                      required
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value) || 50)}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm tabular-nums text-foreground focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="v-notes" className="block text-xs font-semibold text-foreground">
                    Event Venue, Flavour, or Customisation Notes
                  </label>
                  <textarea
                    id="v-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tell the vendor your area, timing, dietary requirements, or theme..."
                    className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="submit"
                    className="cursor-pointer rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-brand-foreground hover:bg-brand-hover"
                  >
                    Save Booking Request
                  </button>
                  <a
                    href={buildWhatsAppUrl(
                      vendor,
                      basketItems.length > 0
                        ? buildBasketWhatsAppMessage()
                        : `Hi ${vendor.name}, I'm interested in "${activeProduct?.name}" for ${guests} guests on ${eventDate}. ${notes}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onTrackWhatsAppClick?.(vendor.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#25D366] hover:underline"
                  >
                    <MessageCircle className="size-4" aria-hidden="true" />
                    Or send directly on WhatsApp →
                  </a>
                </div>
              </form>
            )}
          </div>

          <div className="lg:col-span-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-extrabold text-foreground">
                Verified Reviews ({effectiveReviewCount})
              </h2>
              <div className="flex items-center gap-2.5">
                {safeGoogleReviewUrl && (
                  <a
                    href={safeGoogleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand"
                  >
                    <Star className="size-3.5 text-amber-500" aria-hidden="true" />
                    Review on Google
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                )}
                <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-amber-500">
                  <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  {effectiveRating.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Write a Verified Cloud Review */}
            <div className="mt-4 rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-bold text-foreground">Write a Customer Review</p>
              {!user ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Sign in or create a free account to leave a verified rating.
                  </p>
                  <button
                    type="button"
                    onClick={() => void onSignIn?.()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
                  >
                    <LogIn className="size-3.5" aria-hidden="true" />
                    Sign In / Sign Up
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => void handleReviewSubmit(e)} className="mt-2.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          aria-label={`Rate ${star} out of 5`}
                          className="cursor-pointer p-0.5"
                        >
                          <Star
                            className={`size-5 ${
                              star <= reviewRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/40'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <select
                      aria-label="Occasion"
                      value={reviewEventType}
                      onChange={(e) => setReviewEventType(e.target.value)}
                      className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                    >
                      <option value="Birthday Party">Birthday Party</option>
                      <option value="Wedding / Reception">Wedding / Reception</option>
                      <option value="Corporate Event">Corporate Event</option>
                      <option value="House Party">House Party</option>
                      <option value="Festival / Gifting">Festival / Gifting</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    required
                    minLength={5}
                    maxLength={600}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={`Share your experience with ${vendor.name} (taste, punctuality, presentation)...`}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      Posting as <strong className="text-foreground">{user.displayName || 'Customer'}</strong>
                    </span>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="cursor-pointer rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
                    >
                      {submittingReview ? 'Posting…' : 'Post Review'}
                    </button>
                  </div>
                </form>
              )}
              {reviewStatus && (
                <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {reviewStatus}
                </p>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {mergedReviews.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                  No reviews yet — be the first to review {vendor.name}!
                </p>
              ) : (
                mergedReviews.map((rev) => (
                  <div key={rev.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">{rev.author}</span>
                        {rev.isCloud && (
                          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                            Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-amber-500">
                          {rev.rating.toFixed(1)}★
                        </span>
                        {rev.isCloud && user && rev.authorId === user.uid && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteReview(rev.id)}
                            aria-label="Delete your review"
                            className="cursor-pointer text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {rev.role} · {rev.date}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      “{rev.comment}”
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
        )}
      </main>

      {/* Sticky Bottom WhatsApp Bar + Expandable Multi-Item Order Basket */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-md">
        {basketItems.length > 0 && basketExpanded && (
          <div className="border-b border-border bg-background/95">
            <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Your WhatsApp Order Basket
                </p>
                <button
                  type="button"
                  onClick={() => setBasket({})}
                  className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
                >
                  Clear basket
                </button>
              </div>
              <div className="mt-2 space-y-1.5">
                {basketItems.map(({ key, displayName, unitPriceUsd, qty }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="truncate font-medium text-foreground">
                      {qty}× {displayName}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-semibold text-foreground">
                        {formatMoney(unitPriceUsd * qty, currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateBasketQty(key, -1)}
                        className="grid size-5 cursor-pointer place-items-center rounded border border-border hover:bg-accent"
                        aria-label={`Decrease ${displayName}`}
                      >
                        <Minus className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateBasketQty(key, 1)}
                        className="grid size-5 cursor-pointer place-items-center rounded border border-border hover:bg-accent"
                        aria-label={`Increase ${displayName}`}
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {basketItems.length > 0 ? (
            <button
              type="button"
              onClick={() => setBasketExpanded((prev) => !prev)}
              className="min-w-0 cursor-pointer text-left"
            >
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <ShoppingBag className="size-4 text-brand" aria-hidden="true" />
                {basketTotalCount} {basketTotalCount === 1 ? 'item' : 'items'} ·{' '}
                <span className="font-mono">{formatMoney(basketTotalUsd, currency)}</span>
              </p>
              <p className="truncate text-xs text-brand">
                {basketExpanded ? 'Hide basket items' : 'Tap to review items · 0% commission'}
              </p>
            </button>
          ) : (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{vendor.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {activeProductLabel} ·{' '}
                <span className="font-mono font-semibold text-foreground">
                  {activeProduct ? formatMoney(activeProductPriceUsd, currency) : ''}
                </span>
              </p>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-2">
            {basketItems.length > 0 && !isOrderingPaused && (
              <button
                type="button"
                onClick={() => {
                  setBasketExpanded(false);
                  setCheckoutOpen(true);
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-extrabold text-brand-foreground shadow-md transition-colors hover:bg-brand-hover sm:px-5 sm:text-sm"
              >
                <ShoppingBag className="size-4" aria-hidden="true" />
                Checkout &amp; Order
              </button>
            )}
            <a
              href={buildWhatsAppUrl(
                vendor,
                basketItems.length > 0
                  ? buildBasketWhatsAppMessage()
                  : `Hi ${vendor.name}, I'm viewing your page on FindMyBites × PimpMyParty and want to ask about "${activeProductLabel}".`
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onTrackWhatsAppClick?.(vendor.id)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-[#1ebe5d] sm:text-sm"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              {basketItems.length > 0 ? 'WhatsApp' : 'Chat on WhatsApp'}
            </a>
          </div>
        </div>
      </div>

      <DirectOrderCheckoutModal
        vendor={checkoutOpen ? vendor : null}
        items={basketItems}
        currency={currency}
        defaultCustomerName={user?.displayName || customerName}
        defaultCustomerContact={user?.email || customerEmail}
        onClose={() => setCheckoutOpen(false)}
        onOrderPlaced={(order) => {
          onCreateBooking(order);
          setBasket({});
        }}
        onTrackWhatsAppClick={onTrackWhatsAppClick}
      />
      <QrPosterModal vendor={qrOpen ? vendor : null} onClose={() => setQrOpen(false)} />
      <PromoCardModal
        vendor={promoCardOpen ? vendor : null}
        currency={currency}
        onClose={() => setPromoCardOpen(false)}
        onTrackShare={onTrackShare}
      />
      <ProductShareModal
        vendor={shareProductTarget ? vendor : null}
        product={shareProductTarget?.product ?? null}
        selectedVariant={shareProductTarget?.variant ?? null}
        currency={currency}
        onClose={() => setShareProductTarget(null)}
        onTrackShare={onTrackShare}
      />

      {lightboxImg && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Portfolio photo preview"
          onClick={() => setLightboxImg(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImg(null)}
            aria-label="Close photo preview"
            className="absolute right-4 top-4 grid size-10 cursor-pointer place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <img
            src={lightboxImg}
            alt="Portfolio full view"
            className="max-h-[86vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
