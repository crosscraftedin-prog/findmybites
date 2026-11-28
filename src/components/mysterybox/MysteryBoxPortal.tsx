import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Clock,
  Gift,
  Loader2,
  Lock,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import {
  DEFAULT_MARKETING_CONFIG,
  DEFAULT_MYSTERY_BOX_PACKAGES,
  DELIVERY_STATUS_META,
  FULFILLMENT_MODEL_LABELS,
  MYSTERY_BOX_THEMES,
  type MysteryBoxMarketingConfig,
  type MysteryBoxOrder,
  type MysteryBoxPackage,
  type MysteryBoxSeasonalEdition,
  type MysteryBoxTheme,
  formatInr,
  getSeasonalEditionPreset,
} from '../../data/mysteryBoxes';
import { getMysteryBoxHeroImage, resolveMysteryBoxImage } from '../../data/mysteryBoxImages';
import {
  fetchMyMysteryBoxOrders,
  fetchMysteryBoxCatalog,
  fetchMysteryBoxOrderById,
} from '../../services/mysteryBoxService';
import { MysteryBoxCheckoutModal } from './MysteryBoxCheckoutModal';
import { MysteryBoxSeasonalAtmosphere } from './MysteryBoxSeasonalAtmosphere';
import { MysteryBoxUnboxingModal } from './MysteryBoxUnboxingModal';
import { getSeasonalThemeClasses } from './seasonalThemeStyles';

interface MysteryBoxPortalProps {
  isOpen: boolean;
  initialTab?: 'shop' | 'orders';
  initialPackageId?: string | null;
  initialOrderId?: string | null;
  user: User | null;
  onSignIn: () => Promise<void>;
  onClose: () => void;
  onNotify?: (msg: string) => void;
}

export function MysteryBoxPortal({
  isOpen,
  initialTab = 'shop',
  initialPackageId = null,
  initialOrderId = null,
  user,
  onSignIn,
  onClose,
  onNotify,
}: MysteryBoxPortalProps) {
  const [activeTab, setActiveTab] = useState<'shop' | 'orders'>(initialTab);
  const [packages, setPackages] = useState<MysteryBoxPackage[]>(DEFAULT_MYSTERY_BOX_PACKAGES);
  const [marketing, setMarketing] = useState<MysteryBoxMarketingConfig>(DEFAULT_MARKETING_CONFIG);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [selectedTheme, setSelectedTheme] = useState<'all' | MysteryBoxTheme>('all');
  const [detailPkg, setDetailPkg] = useState<MysteryBoxPackage | null>(null);
  const [checkoutState, setCheckoutState] = useState<{
    pkg: MysteryBoxPackage;
    isGift: boolean;
  } | null>(null);

  const [myOrders, setMyOrders] = useState<MysteryBoxOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [unboxingOrder, setUnboxingOrder] = useState<MysteryBoxOrder | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const catalogGridRef = useRef<HTMLDivElement | null>(null);

  const edition: MysteryBoxSeasonalEdition = marketing.seasonalEdition || 'christmas';
  const preset = getSeasonalEditionPreset(edition);
  const theme = getSeasonalThemeClasses(edition);
  const heroImage = getMysteryBoxHeroImage(edition);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const data = await fetchMysteryBoxCatalog();
      if (data.packages.length > 0) setPackages(data.packages);
      if (data.marketing) setMarketing(data.marketing);
    } catch {
      // Keep default seeded packages on transient error
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    if (!user) {
      setMyOrders([]);
      return;
    }
    setLoadingOrders(true);
    try {
      const res = await fetchMyMysteryBoxOrders(user);
      setMyOrders(res.orders);
    } catch {
      // ignore
    } finally {
      setLoadingOrders(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    void loadCatalog();
  }, [isOpen, initialTab, loadCatalog]);

  useEffect(() => {
    if (!isOpen || !user) return;
    void loadOrders();
  }, [isOpen, user, loadOrders]);

  useEffect(() => {
    if (!isOpen || !initialPackageId) return;
    const found = packages.find((p) => p.id === initialPackageId || p.slug === initialPackageId);
    if (found) setDetailPkg(found);
  }, [isOpen, initialPackageId, packages]);

  useEffect(() => {
    if (!isOpen || !initialOrderId || !user) return;
    let active = true;
    fetchMysteryBoxOrderById(initialOrderId, user)
      .then((res) => {
        if (active) {
          setActiveTab('orders');
          setUnboxingOrder(res.order);
        }
      })
      .catch((err) => {
        onNotify?.(
          err instanceof Error ? err.message : 'Unable to open this Mystery Box order.'
        );
      });
    return () => {
      active = false;
    };
  }, [isOpen, initialOrderId, user, onNotify]);

  const availableThemes = useMemo(() => {
    const present = new Set(packages.map((p) => p.theme));
    // Exclude food-revealing theme pills from public filter bar
    return MYSTERY_BOX_THEMES.filter(
      (t) => present.has(t.id) && t.id !== 'chocolate' && t.id !== 'brownie'
    );
  }, [packages]);

  const filteredPackages = useMemo(() => {
    if (selectedTheme === 'all') return packages;
    return packages.filter((p) => p.theme === selectedTheme);
  }, [packages, selectedTheme]);

  if (!isOpen) return null;

  const handleOrderVerified = (order: MysteryBoxOrder) => {
    setCheckoutState(null);
    setDetailPkg(null);
    setMyOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
    setActiveTab('orders');
    setUnboxingOrder(order);
    void loadCatalog();
  };

  const handleOrderUpdated = (updated: MysteryBoxOrder) => {
    setUnboxingOrder(updated);
    setMyOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const whatsappDigits = (marketing.corporateBulkWhatsapp || '+91 98860 00000').replace(/\D/g, '');
  const corporateHref = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
    theme.isChristmas
      ? 'Hi FindMyBites! We would like to enquire about Christmas Special Edition Corporate Bulk Mystery Boxes for our team/event.'
      : 'Hi FindMyBites! We would like to enquire about Corporate Bulk Mystery Boxes for our team/event.'
  )}`;

  const scrollToBoxes = () => {
    catalogGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={`fixed inset-0 z-[70] flex flex-col ${theme.pageCanvas}`}>
      {/* Slim Dismissible Seasonal Promo Strip */}
      {marketing.seasonalBannerEnabled && marketing.seasonalBannerText && !bannerDismissed && (
        <div
          className={`relative z-30 flex items-center justify-between gap-3 px-4 py-2 text-xs font-semibold ${theme.promoBar}`}
        >
          <p className="mx-auto truncate text-center">
            {marketing.seasonalBannerText || preset.seasonalBannerText}
          </p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss announcement"
            className="cursor-pointer opacity-80 hover:opacity-100"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Top Portal Header */}
      <header className={`sticky top-0 z-20 ${theme.headerSurface}`}>
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E5D4C3] bg-white px-3 py-1.5 text-xs font-bold text-neutral-800 hover:bg-neutral-50 dark:border-[#2A4B3C] dark:bg-[#13261E] dark:text-[#FAF6EE] whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to FindMyBites
            </button>
            <div className="hidden sm:block">
              <p className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${theme.heroEyebrow}`}>
                {preset.eyebrow}
              </p>
              <p className="text-xs text-neutral-500 dark:text-[#BFB5A0]">
                {theme.isChristmas
                  ? 'Luxury Sealed Christmas Presents · Unwrap After Checkout'
                  : 'Sealed Mystery Packaging · Unwrap After Checkout'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-[#E6D6BC] bg-[#FAF4E8] p-1 dark:border-[#28483A] dark:bg-[#0B1712]">
              <button
                type="button"
                onClick={() => setActiveTab('shop')}
                className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'shop'
                    ? theme.activeTabPrimary
                    : 'text-neutral-700 hover:text-neutral-950 dark:text-[#DDD4C2]'
                }`}
              >
                Explore Boxes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'orders'
                    ? theme.activeTabSecondary
                    : 'text-neutral-700 hover:text-neutral-950 dark:text-[#DDD4C2]'
                }`}
              >
                <Gift className="size-3.5" aria-hidden="true" />
                My Mystery Boxes{myOrders.length > 0 ? ` (${myOrders.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content with Seasonal Snow + Golden Lights Backdrop */}
      <main className="relative flex-1 overflow-y-auto">
        <MysteryBoxSeasonalAtmosphere edition={edition} density="page" />

        {activeTab === 'shop' ? (
          <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
            {/* Festive Sealed-Mystery Hero */}
            <div className={`grid items-center gap-7 rounded-3xl p-6 lg:grid-cols-12 lg:p-9 ${theme.heroCard}`}>
              <div className="lg:col-span-7">
                <p className={`text-xs font-extrabold uppercase tracking-[0.2em] ${theme.heroEyebrow}`}>
                  {preset.eyebrow}
                </p>
                <h1 className="mt-2.5 text-balance text-2xl font-extrabold tracking-tight text-neutral-950 dark:text-[#FAF6EE] sm:text-4xl lg:text-[2.6rem] lg:leading-[1.1]">
                  {marketing.campaignHeadline || preset.campaignHeadline}
                </h1>
                <p className={`mt-2.5 text-base font-bold sm:text-lg ${theme.heroQuote}`}>
                  &ldquo;{marketing.campaignTagline || preset.campaignTagline}&rdquo;
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-[#DDD4C2] sm:text-base">
                  {marketing.campaignSubheading || preset.campaignSubheading}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={scrollToBoxes}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3.5 text-xs font-extrabold tracking-wider transition-transform hover:-translate-y-0.5 sm:text-sm whitespace-nowrap shrink-0 ${theme.primaryButton}`}
                  >
                    <Gift className="size-4" aria-hidden="true" />
                    {preset.ctaLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-3.5 text-xs font-bold sm:text-sm whitespace-nowrap shrink-0 ${theme.secondaryButton}`}
                  >
                    Track / Revisit Unboxing
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-neutral-600 dark:text-[#C5BBA7]">
                  <span>1. Choose your mystery box</span>
                  <span aria-hidden="true">·</span>
                  <span>2. Pay online securely</span>
                  <span aria-hidden="true">·</span>
                  <span>3. Unwrap your sealed box digitally</span>
                  <span aria-hidden="true">·</span>
                  <span>4. Receive it at your doorstep</span>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#14261E] shadow-md">
                  <div className="aspect-[16/10] w-full overflow-hidden">
                    <img
                      src={heroImage}
                      referrerPolicy="no-referrer"
                      alt={
                        theme.isChristmas
                          ? 'Closed FindMyBites Christmas Special Edition luxury gift boxes with red, green and gold satin ribbons'
                          : 'Closed and ribbon-sealed FindMyBites Mystery Box'
                      }
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Occasion Filter Row (only non-spoiler occasions) */}
            <div ref={catalogGridRef} className="mt-8 flex flex-wrap items-center justify-between gap-4 scroll-mt-6">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTheme('all')}
                  className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                    selectedTheme === 'all'
                      ? theme.activeTabSecondary
                      : 'border border-[#E5D4C3] bg-white text-neutral-700 hover:bg-neutral-50 dark:border-[#28483A] dark:bg-[#11221B] dark:text-[#DDD4C2]'
                  }`}
                >
                  All Mystery Boxes ({packages.length})
                </button>
                {availableThemes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTheme(t.id)}
                    className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                      selectedTheme === t.id
                        ? theme.activeTabPrimary
                        : 'border border-[#E5D4C3] bg-white text-neutral-700 hover:bg-neutral-50 dark:border-[#28483A] dark:bg-[#11221B] dark:text-[#DDD4C2]'
                    }`}
                  >
                    {t.shortLabel}
                  </button>
                ))}
              </div>
              {loadingCatalog && (
                <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-[#BFB5A0]">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Refreshing stock...
                </span>
              )}
            </div>

            {/* 3-Column Sealed Mystery Box Grid (ZERO content reveals) */}
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPackages.map((pkg) => {
                const outOfStock = !pkg.deliveryAvailable || pkg.stockCount <= 0;
                return (
                  <article
                    key={pkg.id}
                    className={`group flex flex-col overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${theme.cardSurface} ${theme.cardHoverBorder}`}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#162720]">
                      <img
                        src={resolveMysteryBoxImage(pkg.image, 'celebration', edition)}
                        referrerPolicy="no-referrer"
                        alt={`Sealed closed ${pkg.name} ${theme.isChristmas ? 'Christmas luxury gift box' : 'mystery gift box'}`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <span
                        className={`absolute left-3 top-3 rounded-md px-2.5 py-1 text-[11px] font-bold shadow-sm ${theme.cardRibbonBadge}`}
                      >
                        {outOfStock
                          ? 'Out of Stock'
                          : pkg.stockCount <= 8
                            ? `Only ${pkg.stockCount} left`
                            : preset.boxBadgeLabel}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${theme.cardCategoryText}`}>
                        Bakery &amp; Goodies · {pkg.minGoodiesCount}+ items inside
                      </p>
                      <h2 className="mt-1 text-xl font-extrabold text-neutral-950 dark:text-[#FAF6EE]">
                        {pkg.name}
                      </h2>
                      <p className={`mt-1.5 text-sm font-semibold ${theme.cardTaglineText}`}>
                        {pkg.tagline}
                      </p>

                      {/* Mystery Lock Notice (no individual items revealed) */}
                      <div
                        className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs ${theme.lockNoticeBox}`}
                      >
                        <Lock
                          className={`size-3.5 shrink-0 ${theme.lockIconColor}`}
                          aria-hidden="true"
                        />
                        <span>
                          {theme.isChristmas
                            ? 'Sealed Christmas present—contents stay secret until you unwrap after payment.'
                            : 'Contents stay secret until you unwrap after payment.'}
                        </span>
                      </div>

                      <div className="mt-auto pt-5">
                        <div className="border-t border-[#EAE0CF] pt-4 dark:border-[#233F33]">
                          <div className="flex items-baseline justify-between gap-2">
                            <div>
                              <span className="text-2xl font-extrabold tabular-nums text-neutral-950 dark:text-[#FAF6EE]">
                                {formatInr(pkg.priceInr)}
                              </span>
                              <span className="ml-2 text-xs font-semibold text-emerald-700 dark:text-[#86EFAC]">
                                Worth {formatInr(pkg.guaranteedMinValueInr)}+
                              </span>
                            </div>
                            <span className="text-[11px] text-neutral-500 dark:text-[#B9AF9B]">
                              {pkg.deliveryFeeInr === 0
                                ? 'Free delivery'
                                : `+${formatInr(pkg.deliveryFeeInr)} delivery`}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-[#B9AF9B]">
                            {pkg.estimatedDeliveryTime} ·{' '}
                            {pkg.dietarySummary === 'eggless'
                              ? 'Vegetarian / Eggless option available'
                              : pkg.dietarySummary === 'veg'
                                ? '100% Vegetarian'
                                : 'Dietary options at checkout'}
                          </p>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailPkg(pkg)}
                              className="cursor-pointer rounded-xl border border-[#DFCBB0] bg-white py-2.5 text-xs font-bold text-neutral-800 hover:bg-neutral-50 dark:border-[#2A4B3C] dark:bg-[#162C23] dark:text-[#FAF6EE] dark:hover:bg-[#1D392E]"
                            >
                              View Details
                            </button>
                            <button
                              type="button"
                              disabled={outOfStock}
                              onClick={() => setCheckoutState({ pkg, isGift: false })}
                              className={`cursor-pointer rounded-xl py-2.5 text-xs font-extrabold disabled:cursor-not-allowed disabled:opacity-50 ${theme.primaryButton}`}
                            >
                              {outOfStock ? 'Sold Out' : 'Buy & Unwrap'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Corporate Bulk Mystery Boxes Banner */}
            <div
              className={`mt-12 flex flex-col items-start justify-between gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8 ${theme.corporateBanner}`}
            >
              <div className="max-w-xl">
                <p
                  className={`inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.18em] ${theme.corporateEyebrow}`}
                >
                  <Building2 className="size-3.5" aria-hidden="true" />
                  {theme.isChristmas
                    ? 'CORPORATE CHRISTMAS GIFTING & BULK BOXES'
                    : 'CORPORATE & EVENT BULK MYSTERY BOXES'}
                </p>
                <h3 className="mt-1.5 text-2xl font-extrabold">
                  {theme.isChristmas
                    ? 'Gifting 15+ Christmas Mystery Boxes to your team, clients, or family celebration?'
                    : 'Ordering 15+ Sealed Mystery Boxes for your team, wedding, or festive event?'}
                </h3>
                <p className="mt-1.5 text-sm text-[#EFE7D6]">
                  Custom ribbon colours, branded Christmas gift tags, GST invoicing, and multi-address doorstep delivery across India.
                </p>
              </div>
              <a
                href={corporateHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-extrabold text-[#1A1307] shadow-sm hover:bg-[#E2BF4E] whitespace-nowrap shrink-0"
              >
                Request Corporate Quote
              </a>
            </div>
          </div>
        ) : (
          /* MY MYSTERY BOXES TAB — Revisit Unboxing & Live Order Tracking */
          <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold text-neutral-950 dark:text-[#FAF6EE]">
                  My Mystery Boxes
                </h1>
                <p className="mt-1 text-sm text-neutral-600 dark:text-[#CFC5B1]">
                  Unwrap newly purchased boxes, revisit your past reveals, and track live doorstep delivery.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('shop')}
                className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-extrabold ${theme.primaryButton}`}
              >
                Order Another Box
              </button>
            </div>

            {!user ? (
              <div className={`mt-8 rounded-2xl p-8 text-center ${theme.cardSurface}`}>
                <Gift className={`mx-auto size-10 ${theme.lockIconColor}`} aria-hidden="true" />
                <h2 className="mt-3 text-lg font-extrabold">Sign in to view your Mystery Boxes</h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-[#CFC5B1]">
                  Your purchased boxes and private unboxing experiences are protected by your account.
                </p>
                <button
                  type="button"
                  onClick={() => void onSignIn()}
                  className={`mt-5 cursor-pointer rounded-xl px-6 py-2.5 text-sm font-bold ${theme.primaryButton}`}
                >
                  Sign in with Google
                </button>
              </div>
            ) : loadingOrders ? (
              <div className="flex items-center justify-center py-16 text-sm text-neutral-500">
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                Loading your Mystery Boxes...
              </div>
            ) : myOrders.length === 0 ? (
              <div className={`mt-8 rounded-2xl p-8 text-center ${theme.cardSurface}`}>
                <Package className={`mx-auto size-10 ${theme.lockIconColor}`} aria-hidden="true" />
                <h2 className="mt-3 text-lg font-extrabold">No Mystery Boxes yet</h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-[#CFC5B1]">
                  Choose your first sealed mystery box to experience the digital unboxing!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('shop')}
                  className={`mt-5 cursor-pointer rounded-xl px-6 py-2.5 text-sm font-extrabold ${theme.primaryButton}`}
                >
                  {preset.ctaLabel}
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {myOrders.map((order) => {
                  const statusMeta = DELIVERY_STATUS_META[order.deliveryStatus];
                  const isVerified = order.paymentStatus === 'verified';
                  return (
                    <div
                      key={order.id}
                      className={`flex flex-col justify-between gap-4 rounded-2xl p-5 sm:flex-row sm:items-center ${theme.cardSurface}`}
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={resolveMysteryBoxImage(order.packageImage, 'celebration', edition)}
                          referrerPolicy="no-referrer"
                          alt={order.packageName}
                          className="size-16 shrink-0 rounded-xl object-cover"
                        />
                        <div>
                          <p
                            className={`text-[11px] font-bold uppercase tracking-wider ${theme.cardCategoryText}`}
                          >
                            {order.orderRef} · {statusMeta?.label || order.deliveryStatus}
                          </p>
                          <h3 className="mt-0.5 text-base font-extrabold text-neutral-950 dark:text-[#FAF6EE]">
                            {order.packageName} · {formatInr(order.totalPaidInr)}
                          </h3>
                          <p className="mt-1 text-xs text-neutral-600 dark:text-[#CFC5B1]">
                            {order.deliveryDate} ({order.deliverySlot}) · {order.deliveryCity}
                            {order.isGift ? ` · Gift for ${order.recipientName}` : ''}
                          </p>
                          <p className="mt-1 text-[11px] text-neutral-500 dark:text-[#AFA692]">
                            {isVerified
                              ? order.unboxedAt
                                ? `Unwrapped · ${order.assignedItems?.length || 0} items revealed & locked`
                                : 'Sealed & ready to unwrap!'
                              : `Payment ${order.paymentStatus}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isVerified ? (
                          <button
                            type="button"
                            onClick={() => setUnboxingOrder(order)}
                            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold whitespace-nowrap shrink-0 ${
                              order.unboxedAt ? theme.activeTabSecondary : theme.primaryButton
                            }`}
                          >
                            <Gift className="size-3.5" aria-hidden="true" />
                            {order.unboxedAt ? 'Revisit Unboxing & Track' : 'Unwrap Your Surprise'}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                            <Clock className="size-3.5" aria-hidden="true" />
                            Payment {order.paymentStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Package Detail Drawer / Modal (Zero Content Spoilers) */}
      {detailPkg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={detailPkg.name}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/75 p-3 backdrop-blur-sm sm:p-6"
        >
          <div
            className={`relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl shadow-2xl ${theme.pageCanvas} border border-[#E6D6BC] dark:border-[#28483A]`}
          >
            <div className={`flex items-center justify-between px-5 py-3.5 ${theme.headerSurface}`}>
              <p className={`text-xs font-extrabold uppercase tracking-wider ${theme.cardCategoryText}`}>
                Bakery &amp; Goodies · {detailPkg.minGoodiesCount}+ Surprise Items Guaranteed
              </p>
              <button
                type="button"
                onClick={() => setDetailPkg(null)}
                aria-label="Close package details"
                className="grid size-8 cursor-pointer place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-700 dark:border-[#2A4B3C] dark:bg-[#13261E] dark:text-[#FAF6EE]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid flex-1 gap-6 overflow-y-auto p-5 sm:grid-cols-12 sm:p-7">
              <div className="sm:col-span-5">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#162720]">
                  <img
                    src={resolveMysteryBoxImage(detailPkg.image, 'celebration', edition)}
                    referrerPolicy="no-referrer"
                    alt={`Sealed ${detailPkg.name} ${theme.isChristmas ? 'Christmas gift box' : 'gift box'}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className={`mt-4 space-y-2 rounded-2xl p-4 text-xs ${theme.cardSurface}`}>
                  <p className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-[#FAF6EE]">
                    <Truck className={`size-3.5 ${theme.lockIconColor}`} aria-hidden="true" />
                    {detailPkg.estimatedDeliveryTime}
                  </p>
                  <p className="flex items-center gap-1.5 text-neutral-600 dark:text-[#CFC5B1]">
                    <MapPin className={`size-3.5 ${theme.lockIconColor}`} aria-hidden="true" />
                    Cities: {detailPkg.deliveryCities.join(', ')}
                  </p>
                  <p className="text-neutral-500 dark:text-[#AFA692]">
                    Fulfillment: {FULFILLMENT_MODEL_LABELS[detailPkg.fulfillmentModel]}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:col-span-7">
                <p className={`text-xs font-bold uppercase tracking-wider ${theme.cardCategoryText}`}>
                  {theme.isChristmas
                    ? 'Christmas Special Edition · Bakery & Goodies'
                    : 'General Surprise Category: Bakery & Goodies'}
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-neutral-950 dark:text-[#FAF6EE]">
                  {detailPkg.name}
                </h2>
                <p className={`mt-1 text-sm font-semibold ${theme.cardTaglineText}`}>
                  {detailPkg.tagline}
                </p>

                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold tabular-nums text-neutral-950 dark:text-[#FAF6EE]">
                    {formatInr(detailPkg.priceInr)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-[#86EFAC]">
                    Guaranteed minimum value {formatInr(detailPkg.guaranteedMinValueInr)}+
                  </span>
                </div>

                {/* Key Transparency Metrics WITHOUT revealing items */}
                <div className={`mt-4 grid grid-cols-2 gap-3 rounded-2xl p-4 text-xs ${theme.cardSurface}`}>
                  <div>
                    <p className="text-neutral-500 dark:text-[#AFA692]">Minimum Items Included</p>
                    <p className="mt-0.5 text-sm font-extrabold text-neutral-950 dark:text-[#FAF6EE]">
                      {detailPkg.minGoodiesCount}+ Surprise Items
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-[#AFA692]">Dietary Options</p>
                    <p className="mt-0.5 text-sm font-extrabold text-neutral-950 dark:text-[#FAF6EE]">
                      {detailPkg.dietarySummary === 'eggless'
                        ? 'Eggless / Veg Available'
                        : detailPkg.dietarySummary === 'veg'
                          ? '100% Vegetarian'
                          : 'Selectable at Checkout'}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-[#AFA692]">Delivery Fee</p>
                    <p className="mt-0.5 text-sm font-extrabold text-neutral-950 dark:text-[#FAF6EE]">
                      {detailPkg.deliveryFeeInr === 0
                        ? 'FREE Delivery'
                        : formatInr(detailPkg.deliveryFeeInr)}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-500 dark:text-[#AFA692]">Availability</p>
                    <p className="mt-0.5 text-sm font-extrabold text-emerald-700 dark:text-[#86EFAC]">
                      {detailPkg.stockCount > 0 ? `${detailPkg.stockCount} Boxes Ready` : 'Sold Out'}
                    </p>
                  </div>
                </div>

                {/* True Mystery Promise Box */}
                <div className={`mt-4 rounded-2xl p-4 ${theme.lockNoticeBox}`}>
                  <p className={`flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider ${theme.cardCategoryText}`}>
                    <Sparkles className="size-3.5 text-[#C89B3C]" aria-hidden="true" />
                    True Mystery Guarantee
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed">
                    We never spoil what&apos;s inside before purchase. Once your payment is verified, your sealed digital box unlocks with an interactive reveal showing the exact items assigned and prepared for your doorstep delivery.
                  </p>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-neutral-600 dark:text-[#BFB5A0]">
                  <p className="flex items-start gap-1.5">
                    <AlertCircle className={`mt-0.5 size-3.5 shrink-0 ${theme.lockIconColor}`} aria-hidden="true" />
                    <span>
                      <strong>Allergens &amp; Storage:</strong> {detailPkg.allergenNotice} {detailPkg.storageNote}
                    </span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>
                      <strong>Policy:</strong> {detailPkg.cancellationPolicy}
                    </span>
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!detailPkg.deliveryAvailable || detailPkg.stockCount <= 0}
                    onClick={() => setCheckoutState({ pkg: detailPkg, isGift: false })}
                    className={`cursor-pointer rounded-xl py-3 text-sm font-extrabold disabled:opacity-50 ${theme.primaryButton}`}
                  >
                    Buy &amp; Unwrap ({formatInr(detailPkg.priceInr)})
                  </button>
                  <button
                    type="button"
                    disabled={!detailPkg.deliveryAvailable || detailPkg.stockCount <= 0}
                    onClick={() => setCheckoutState({ pkg: detailPkg, isGift: true })}
                    className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-extrabold disabled:opacity-50 ${theme.activeTabSecondary}`}
                  >
                    <Gift className="size-4" aria-hidden="true" />
                    Send as a Gift
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <MysteryBoxCheckoutModal
        pkg={checkoutState?.pkg || null}
        marketing={marketing}
        initialIsGift={checkoutState?.isGift}
        user={user}
        onSignIn={onSignIn}
        onClose={() => setCheckoutState(null)}
        onOrderVerified={handleOrderVerified}
        onNotify={onNotify}
      />

      {/* Interactive Digital Unboxing Modal */}
      <MysteryBoxUnboxingModal
        order={unboxingOrder}
        seasonalEdition={edition}
        user={user}
        onClose={() => setUnboxingOrder(null)}
        onOrderUpdated={handleOrderUpdated}
        onNotify={onNotify}
      />
    </div>
  );
}
