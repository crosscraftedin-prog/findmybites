import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  Heart,
  MapPin,
  PackageCheck,
  PenTool,
  Ribbon,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react';
import { BOX_AND_BITE_CONFIG, formatInr } from '../../data/boxAndBiteConfig';
import {
  BOXBITE_IMAGES,
  BoxBiteCartItem,
  BoxBiteSampleOrder,
  BoxBuilderItem,
  CORPORATE_CATEGORIES,
  CorporateBoxProduct,
  CorporateCategoryId,
  CorporateProductReview,
  CorporateQuoteEnquiry,
  INITIAL_BOX_REVIEWS,
  mergeBoxBiteBuilderItems,
  mergeBoxBiteProducts,
} from '../../data/boxAndBiteCatalog';
import { BoxBiteBuilderSection } from './BoxBiteBuilderSection';
import { BoxBiteCartDrawer } from './BoxBiteCartDrawer';
import { BoxBiteProductDetailModal } from './BoxBiteProductDetailModal';
import { BoxBiteQuoteForm } from './BoxBiteQuoteForm';
import {
  getIndiaLocationSwitcherOptions,
  localizeProductNameForLocation,
} from '../../data/vendors';

interface BoxBitePortalProps {
  isOpen: boolean;
  initialSection?: 'top' | 'builder' | 'quote';
  selectedState?: string;
  onChangeSelectedState?: (nextState: string) => void;
  cloudProducts?: CorporateBoxProduct[];
  cloudBuilderItems?: BoxBuilderItem[];
  onBackToFindMyBites: () => void;
}

const STORAGE_BB_CART = 'bb_corp_cart_v1';
const STORAGE_BB_WISHLIST = 'bb_corp_wishlist_v1';
const STORAGE_BB_REVIEWS = 'bb_corp_reviews_v1';
const STORAGE_BB_QUOTES = 'bb_corp_quotes_v1';
const STORAGE_BB_ORDERS = 'bb_corp_orders_v1';

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function BoxBitePortal({
  isOpen,
  initialSection = 'top',
  selectedState,
  onChangeSelectedState,
  cloudProducts = [],
  cloudBuilderItems = [],
  onBackToFindMyBites,
}: BoxBitePortalProps) {
  const { brandName, tagline, colors, contact, shipping, samplePriceNotice } =
    BOX_AND_BITE_CONFIG;

  const locationOptions = useMemo(() => getIndiaLocationSwitcherOptions(), []);
  const [activeLocationLabel, setActiveLocationLabel] = useState<string>(
    selectedState && selectedState !== 'All' ? selectedState : 'Hyderabad'
  );
  const lastInternalStateRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastInternalStateRef.current && selectedState === lastInternalStateRef.current) {
      lastInternalStateRef.current = null;
      return;
    }
    if (selectedState && selectedState !== 'All') {
      setActiveLocationLabel(selectedState);
    }
  }, [selectedState]);

  const handleSelectLocation = (nextValue: string) => {
    setActiveLocationLabel(nextValue);
    const matchedState =
      locationOptions.states.find((s) => s.value === nextValue)?.stateName ||
      locationOptions.cities.find((c) => c.value === nextValue)?.stateName;
    if (matchedState && onChangeSelectedState) {
      lastInternalStateRef.current = matchedState;
      onChangeSelectedState(matchedState);
    }
  };

  const { activeProducts } = useMemo(
    () => mergeBoxBiteProducts(cloudProducts),
    [cloudProducts]
  );
  const activeBuilderItems = useMemo(
    () => mergeBoxBiteBuilderItems(cloudBuilderItems),
    [cloudBuilderItems]
  );

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeCategoryId, setActiveCategoryId] = useState<'all' | CorporateCategoryId>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg-only' | 'has-non-veg'>('all');

  const [cartItems, setCartItems] = useState<BoxBiteCartItem[]>(() =>
    readStored<BoxBiteCartItem[]>(STORAGE_BB_CART, [])
  );
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    readStored<string[]>(STORAGE_BB_WISHLIST, [])
  );
  const [reviews, setReviews] = useState<CorporateProductReview[]>(() =>
    readStored<CorporateProductReview[]>(STORAGE_BB_REVIEWS, INITIAL_BOX_REVIEWS)
  );
  const [submittedQuotes, setSubmittedQuotes] = useState<CorporateQuoteEnquiry[]>(() =>
    readStored<CorporateQuoteEnquiry[]>(STORAGE_BB_QUOTES, [])
  );
  const [sampleOrders, setSampleOrders] = useState<BoxBiteSampleOrder[]>(() =>
    readStored<BoxBiteSampleOrder[]>(STORAGE_BB_ORDERS, [])
  );

  const [activeProduct, setActiveProduct] = useState<CorporateBoxProduct | null>(null);
  const [drawerState, setDrawerState] = useState<{ open: boolean; tab: 'bag' | 'wishlist' }>({
    open: false,
    tab: 'bag',
  });
  const [quickAddedId, setQuickAddedId] = useState<string | null>(null);

  // Quote prefill state when triggered from a PDP or Custom Box Builder
  const [quotePrefillGiftingType, setQuotePrefillGiftingType] = useState<string | undefined>(
    undefined
  );
  const [quotePrefillNotes, setQuotePrefillNotes] = useState<string | undefined>(undefined);
  const [quoteBuilderSnapshot, setQuoteBuilderSnapshot] = useState<string | undefined>(undefined);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BB_CART, JSON.stringify(cartItems));
    } catch {
      // ignore storage quota errors
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BB_WISHLIST, JSON.stringify(wishlistIds));
    } catch {
      // ignore
    }
  }, [wishlistIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BB_REVIEWS, JSON.stringify(reviews));
    } catch {
      // ignore
    }
  }, [reviews]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BB_QUOTES, JSON.stringify(submittedQuotes));
    } catch {
      // ignore
    }
  }, [submittedQuotes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BB_ORDERS, JSON.stringify(sampleOrders));
    } catch {
      // ignore
    }
  }, [sampleOrders]);

  // Scroll to requested section when portal opens
  useEffect(() => {
    if (!isOpen) return;
    if (initialSection === 'top') {
      containerRef.current?.scrollTo({ top: 0 });
      return;
    }
    const targetId =
      initialSection === 'builder' ? 'boxbite-builder' : 'boxbite-quote';
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [isOpen, initialSection]);

  const scrollToElement = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((prod) => {
      if (activeCategoryId !== 'all' && prod.categoryId !== activeCategoryId) {
        return false;
      }
      if (dietaryFilter === 'veg-only' && prod.dietary !== 'veg') {
        return false;
      }
      if (dietaryFilter === 'has-non-veg' && prod.dietary === 'veg') {
        return false;
      }
      return true;
    });
  }, [activeProducts, activeCategoryId, dietaryFilter]);

  const activeCategoryMeta = useMemo(
    () => CORPORATE_CATEGORIES.find((c) => c.id === activeCategoryId) || null,
    [activeCategoryId]
  );

  const wishlistProducts = useMemo(
    () => activeProducts.filter((p) => wishlistIds.includes(p.id)),
    [activeProducts, wishlistIds]
  );

  const totalCartBoxes = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const toggleWishlist = (productId: string) => {
    setWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleAddToCart = (newItem: BoxBiteCartItem) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.cartItemId === newItem.cartItemId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: Math.min(1000, next[idx].quantity + newItem.quantity),
        };
        return next;
      }
      return [...prev, newItem];
    });
  };

  const handleQuickAddSample = (product: CorporateBoxProduct) => {
    const firstVariant = product.variants[0];
    handleAddToCart({
      cartItemId: `${product.id}__${firstVariant?.id || 'std'}__quick`,
      kind: 'catalog',
      productId: product.id,
      title: product.name,
      subtitle: `${product.sku} · ${product.netWeightOrCount}`,
      image: product.image,
      unitPriceInr: product.samplePriceInr + (firstVariant?.priceDeltaInr ?? 0),
      quantity: 1,
      variantLabel: firstVariant?.label,
      dietaryLabel: firstVariant?.dietary === 'non-veg' ? 'Non-Vegetarian' : 'Vegetarian',
      customisationSummary: 'Standard BOX & BITE Sample Packaging',
    });
    setQuickAddedId(product.id);
    window.setTimeout(() => {
      setQuickAddedId((curr) => (curr === product.id ? null : curr));
    }, 1600);
  };

  const handleUpdateCartQty = (cartItemId: string, nextQty: number) => {
    if (nextQty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: Math.min(1000, nextQty) }
          : item
      )
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const handleSubmitReview = (
    reviewInput: Omit<CorporateProductReview, 'id' | 'createdAt'>
  ) => {
    const newRev: CorporateProductReview = {
      ...reviewInput,
      id: `rev-bb-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('en-IN', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }),
    };
    setReviews((prev) => [newRev, ...prev]);
  };

  const handleRequestQuoteForProduct = (product: CorporateBoxProduct) => {
    const localizedName = localizeProductNameForLocation(product.name, activeLocationLabel);
    setQuotePrefillGiftingType(product.categoryName);
    setQuotePrefillNotes(
      `Enquiring about ${localizedName} (${product.sku}). Please share bulk tier pricing, custom logo belly sleeve artwork templates, and dispatch schedule for ${activeLocationLabel}.`
    );
    scrollToElement('boxbite-quote');
  };

  const handleRequestQuoteForCustomBox = (snapshotText: string) => {
    setQuoteBuilderSnapshot(snapshotText);
    setQuotePrefillNotes(
      'Custom box composed in BOX & BITE Builder. Please confirm per-box corporate quote and logo sleeve options.'
    );
    scrollToElement('boxbite-quote');
  };

  const handleSubmitQuote = (quote: CorporateQuoteEnquiry) => {
    setSubmittedQuotes((prev) => [quote, ...prev]);
  };

  const handlePlaceSampleOrder = (order: BoxBiteSampleOrder) => {
    setSampleOrders((prev) => [order, ...prev]);
    setCartItems([]);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] overflow-y-auto"
      style={{
        backgroundColor: colors.cream,
        color: colors.chocolate,
      }}
      aria-label="BOX & BITE Corporate Gifting"
    >
      {/* 1. CLEAN 3-ZONE EDITORIAL HEADER */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(255, 248, 239, 0.94)',
          borderColor: colors.hairline,
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark + Back link */}
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={onBackToFindMyBites}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold opacity-75 transition-opacity hover:opacity-100 whitespace-nowrap shrink-0"
              title="Return to Find My Bites"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Find My Bites</span>
            </button>
            <span className="h-4 w-px bg-black/15 shrink-0" aria-hidden="true" />
            <a
              href="#boxbite-top"
              onClick={(e) => {
                e.preventDefault();
                containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-baseline gap-2.5 whitespace-nowrap shrink-0"
            >
              <span
                className="text-xl font-bold tracking-[0.06em] sm:text-2xl"
                style={{ fontFamily: 'var(--font-editorial)', color: colors.chocolate }}
              >
                {brandName}
              </span>
              <span className="hidden text-[11px] font-medium tracking-wide opacity-65 xl:inline">
                {tagline}
              </span>
            </a>
          </div>

          {/* Zone 2: Single-line navigation links */}
          <nav
            aria-label="BOX & BITE navigation"
            className="hidden items-center gap-8 lg:flex"
          >
            <button
              type="button"
              onClick={() => scrollToElement('boxbite-collections')}
              className="cursor-pointer text-xs font-semibold tracking-wide opacity-80 transition-opacity hover:opacity-100 whitespace-nowrap shrink-0"
            >
              Collections
            </button>
            <button
              type="button"
              onClick={() => scrollToElement('boxbite-builder')}
              className="cursor-pointer text-xs font-semibold tracking-wide opacity-80 transition-opacity hover:opacity-100 whitespace-nowrap shrink-0"
            >
              Custom Box
            </button>
            <button
              type="button"
              onClick={() => scrollToElement('boxbite-branding')}
              className="cursor-pointer text-xs font-semibold tracking-wide opacity-80 transition-opacity hover:opacity-100 whitespace-nowrap shrink-0"
            >
              Branding &amp; Logistics
            </button>
            <button
              type="button"
              onClick={() => scrollToElement('boxbite-quote')}
              className="cursor-pointer text-xs font-semibold tracking-wide opacity-80 transition-opacity hover:opacity-100 whitespace-nowrap shrink-0"
            >
              Request Quote
            </button>
          </nav>

          {/* Zone 3: Location Switcher, Wishlist, Bag & Quote CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <label
              className="inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              style={{
                borderColor: colors.hairline,
                backgroundColor: '#FFFFFF',
                color: colors.chocolate,
              }}
              title="Switch state or city for localized corporate dispatch"
            >
              <MapPin className="size-3.5 shrink-0" style={{ color: colors.caramel }} aria-hidden="true" />
              <select
                aria-label="Select delivery state or city"
                value={activeLocationLabel}
                onChange={(e) => handleSelectLocation(e.target.value)}
                className="max-w-[115px] cursor-pointer bg-transparent text-xs font-semibold focus:outline-none sm:max-w-[140px]"
              >
                <optgroup label="States">
                  {locationOptions.states.map((st) => (
                    <option key={`bb-st-${st.value}`} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Major Cities">
                  {locationOptions.cities.map((ct) => (
                    <option key={`bb-ct-${ct.value}`} value={ct.value}>
                      {ct.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>

            <button
              type="button"
              onClick={() => setDrawerState({ open: true, tab: 'wishlist' })}
              aria-label={`Saved boxes (${wishlistIds.length})`}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              style={{
                borderColor: colors.hairline,
                backgroundColor: '#FFFFFF',
                color: colors.chocolate,
              }}
            >
              <Heart
                className="size-3.5"
                style={{
                  color: wishlistIds.length > 0 ? colors.caramel : colors.chocolate,
                  fill: wishlistIds.length > 0 ? colors.caramel : 'none',
                }}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Saved</span>
              {wishlistIds.length > 0 && (
                <span className="font-mono tabular-nums">({wishlistIds.length})</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDrawerState({ open: true, tab: 'bag' })}
              aria-label={`Sample bag (${totalCartBoxes})`}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              style={{
                borderColor: colors.hairline,
                backgroundColor: '#FFFFFF',
                color: colors.chocolate,
              }}
            >
              <ShoppingBag className="size-3.5" aria-hidden="true" />
              <span>Bag</span>
              <span className="font-mono tabular-nums">({totalCartBoxes})</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToElement('boxbite-quote')}
              className="hidden cursor-pointer items-center rounded-lg px-4 py-2 text-xs font-semibold tracking-wider transition-colors md:inline-flex whitespace-nowrap shrink-0"
              style={{
                backgroundColor: colors.chocolate,
                color: colors.cream,
              }}
            >
              GET QUOTE
            </button>
          </div>
        </div>
      </header>

      {/* 2. CORPORATE GIFTING EDITORIAL HERO */}
      <section
        id="boxbite-top"
        className="border-b py-12 sm:py-16 lg:py-20"
        style={{ borderColor: colors.hairline }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-6">
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: colors.olive }}
              >
                {brandName} · {tagline}
              </p>
              <h1
                className="mt-4 text-balance text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl"
                style={{ fontFamily: 'var(--font-editorial)', color: colors.chocolate }}
              >
                {BOX_AND_BITE_CONFIG.heroHeadline}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed opacity-85 sm:text-lg">
                {BOX_AND_BITE_CONFIG.heroSupportingCopy}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => scrollToElement('boxbite-quote')}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-xs font-semibold tracking-[0.12em] transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: colors.chocolate,
                    color: colors.cream,
                  }}
                >
                  {BOX_AND_BITE_CONFIG.primaryCtaLabel}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToElement('boxbite-builder')}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-6 py-3.5 text-xs font-semibold tracking-[0.12em] transition-colors whitespace-nowrap"
                  style={{
                    borderColor: colors.chocolate,
                    color: colors.chocolate,
                    backgroundColor: 'transparent',
                  }}
                >
                  {BOX_AND_BITE_CONFIG.secondaryCtaLabel}
                </button>
              </div>

              <div
                className="mt-8 grid grid-cols-3 gap-4 border-t pt-6 text-xs"
                style={{ borderColor: colors.hairline }}
              >
                <div>
                  <p className="font-mono text-sm font-semibold tabular-nums">10+ Boxes</p>
                  <p className="mt-0.5 opacity-70">Corporate MOQ &amp; single tasting samples</p>
                </div>
                <div>
                  <p className="font-mono text-sm font-semibold tabular-nums">Veg &amp; Non-Veg</p>
                  <p className="mt-0.5 opacity-70">Clearly sealed meal &amp; snack formats</p>
                </div>
                <div>
                  <p className="font-mono text-sm font-semibold tabular-nums">Pan-India</p>
                  <p className="mt-0.5 opacity-70">Bulk office drop or multi-address delivery</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div
                className="overflow-hidden rounded-2xl border shadow-sm"
                style={{
                  borderColor: colors.hairline,
                  backgroundColor: colors.beige,
                }}
              >
                <div className="aspect-[16/9] w-full overflow-hidden">
                  <img
                    src={BOXBITE_IMAGES.heroEditorial}
                    alt="BOX & BITE rigid gift box filled with roasted nuts, Indian tea treats, and handmade chocolates"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-xs"
                  style={{ backgroundColor: colors.beige }}
                >
                  <span className="font-semibold">
                    Rigid Keepsake Packaging · Custom Logo Sleeves
                  </span>
                  <span className="opacity-75">
                    {BOX_AND_BITE_CONFIG.subBrandDescriptor}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORPORATE GIFTING CATEGORIES & SAMPLE BOXES CATALOG */}
      <section id="boxbite-collections" className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: colors.olive }}
              >
                Seven Corporate Gifting Collections
              </p>
              <h2
                className="mt-2 text-3xl font-semibold leading-tight sm:text-5xl"
                style={{ fontFamily: 'var(--font-editorial)' }}
              >
                Curated Boxes for Every Business Occasion
              </h2>
              <p className="mt-3 text-sm leading-relaxed opacity-85 sm:text-base">
                Browse ready-to-brand hampers, boardroom meal kits, and bulk sweet boxes. Select
                any box to explore MOQ tier pricing, box variants, honest disclosures, and custom
                finishes.
              </p>
            </div>

            {/* Dietary Switcher */}
            <div className="flex items-center gap-1.5 self-start rounded-lg border p-1 lg:self-auto" style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}>
              {(
                [
                  { id: 'all', label: 'All Dietary' },
                  { id: 'veg-only', label: '100% Vegetarian' },
                  { id: 'has-non-veg', label: 'Has Non-Veg Option' },
                ] as const
              ).map((opt) => {
                const active = dietaryFilter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDietaryFilter(opt.id)}
                    className="cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor: active ? colors.chocolate : 'transparent',
                      color: active ? colors.cream : colors.chocolate,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7 Categories Filter Bar */}
          <div className="mt-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategoryId('all')}
              className="cursor-pointer rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap"
              style={{
                borderColor:
                  activeCategoryId === 'all' ? colors.chocolate : colors.hairline,
                backgroundColor:
                  activeCategoryId === 'all' ? colors.chocolate : '#FFFFFF',
                color: activeCategoryId === 'all' ? colors.cream : colors.chocolate,
              }}
            >
              All 7 Collections ({activeProducts.length})
            </button>
            {CORPORATE_CATEGORIES.map((cat) => {
              const active = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className="cursor-pointer rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap"
                  style={{
                    borderColor: active ? colors.chocolate : colors.hairline,
                    backgroundColor: active ? colors.chocolate : '#FFFFFF',
                    color: active ? colors.cream : colors.chocolate,
                  }}
                >
                  {cat.shortName}
                </button>
              );
            })}
          </div>

          {/* Selected Category Brief */}
          {activeCategoryMeta && (
            <div
              className="mt-6 grid grid-cols-1 items-center gap-6 rounded-xl border p-5 sm:grid-cols-12"
              style={{ borderColor: colors.hairline, backgroundColor: colors.beige }}
            >
              <div className="aspect-[4/3] overflow-hidden rounded-lg sm:col-span-3">
                <img
                  src={activeCategoryMeta.image}
                  alt={activeCategoryMeta.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="sm:col-span-9">
                <p className="text-xs font-semibold" style={{ color: colors.olive }}>
                  {activeCategoryMeta.dietarySummary} · {activeCategoryMeta.typicalMoq}
                </p>
                <h3
                  className="mt-1 text-2xl font-semibold"
                  style={{ fontFamily: 'var(--font-editorial)' }}
                >
                  {activeCategoryMeta.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed opacity-85">
                  {activeCategoryMeta.description}
                </p>
              </div>
            </div>
          )}

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div
              className="mt-8 rounded-xl border p-8 text-center"
              style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
            >
              <p className="text-sm font-medium">
                No sample boxes match this exact filter combination.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategoryId('all');
                  setDietaryFilter('all');
                }}
                className="mt-3 cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold"
                style={{ backgroundColor: colors.chocolate, color: colors.cream }}
              >
                Show All 7 Corporate Collections
              </button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const isWishlisted = wishlistIds.includes(product.id);
                const prodReviews = reviews.filter((r) => r.productId === product.id);
                const avg =
                  prodReviews.length > 0
                    ? (
                        prodReviews.reduce((s, r) => s + r.rating, 0) / prodReviews.length
                      ).toFixed(1)
                    : null;
                const justQuickAdded = quickAddedId === product.id;

                return (
                  <article
                    key={product.id}
                    className="group flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md"
                    style={{
                      borderColor: colors.hairline,
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: colors.beige }}>
                      <img
                        src={product.image}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        onClick={() => setActiveProduct(product)}
                        className="h-full w-full cursor-pointer object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <button
                        type="button"
                        onClick={() => toggleWishlist(product.id)}
                        aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                        className="absolute right-3 top-3 grid size-9 cursor-pointer place-items-center rounded-full border shadow-sm transition-transform hover:scale-105"
                        style={{
                          borderColor: colors.hairline,
                          backgroundColor: 'rgba(255, 248, 239, 0.92)',
                        }}
                      >
                        <Heart
                          className="size-4"
                          style={{
                            color: isWishlisted ? colors.caramel : colors.chocolate,
                            fill: isWishlisted ? colors.caramel : 'none',
                          }}
                          aria-hidden="true"
                        />
                      </button>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div>
                        {/* Unboxed clean metadata row separated by middots */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium opacity-75">
                          <span>{product.categoryName.split('(')[0].trim()}</span>
                          <span aria-hidden="true">·</span>
                          <span style={{ color: colors.olive, fontWeight: 700 }}>
                            {product.dietaryBadgeText}
                          </span>
                          {avg && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-0.5 tabular-nums">
                                <Star
                                  className="size-3"
                                  style={{ color: colors.caramel, fill: colors.caramel }}
                                  aria-hidden="true"
                                />
                                {avg}
                              </span>
                            </>
                          )}
                        </div>

                        <h3
                          onClick={() => setActiveProduct(product)}
                          className="mt-2 cursor-pointer text-2xl font-semibold leading-snug hover:underline"
                          style={{ fontFamily: 'var(--font-editorial)' }}
                        >
                          {localizeProductNameForLocation(product.name, activeLocationLabel)}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed opacity-80">
                          {product.subtitle}
                        </p>

                        <p className="mt-3 text-[11px] opacity-70">
                          {product.servingsInfo} · {product.netWeightOrCount} · Bulk MOQ{' '}
                          {product.moqBulk}+ boxes
                        </p>
                      </div>

                      <div
                        className="mt-5 border-t pt-4"
                        style={{ borderColor: colors.hairline }}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div>
                            <span className="font-mono text-xl font-semibold tabular-nums">
                              {formatInr(product.samplePriceInr)}
                            </span>
                            <span className="ml-1 text-[11px] opacity-65">sample</span>
                          </div>
                          <span
                            className="font-mono text-xs font-medium tabular-nums"
                            style={{ color: colors.olive }}
                          >
                            Bulk from {formatInr(product.bulkStartingPriceInr)}/box
                          </span>
                        </div>

                        <div className="mt-3.5 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveProduct(product)}
                            className="flex-1 cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap"
                            style={{
                              borderColor: colors.chocolate,
                              color: colors.chocolate,
                              backgroundColor: 'transparent',
                            }}
                          >
                            View &amp; Customise
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAddSample(product)}
                            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap"
                            style={{
                              backgroundColor: justQuickAdded
                                ? colors.olive
                                : colors.chocolate,
                              color: colors.cream,
                            }}
                          >
                            {justQuickAdded ? (
                              <>
                                <Check className="size-3.5" aria-hidden="true" />
                                Added
                              </>
                            ) : (
                              'Add Sample'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className="mt-6 text-center text-xs opacity-70">{samplePriceNotice}</p>
        </div>
      </section>

      {/* 4. INTERACTIVE CORPORATE BOX BUILDER */}
      <BoxBiteBuilderSection
        builderItems={activeBuilderItems}
        onAddCustomBoxToCart={handleAddToCart}
        onRequestQuoteForCustomBox={handleRequestQuoteForCustomBox}
      />

      {/* 5. CUSTOM BRANDING & LOGISTICS HIGHLIGHTS */}
      <section
        id="boxbite-branding"
        className="border-t py-16 sm:py-20"
        style={{
          backgroundColor: colors.chocolate,
          borderColor: colors.chocolateDeep,
          color: colors.cream,
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: colors.caramel }}
            >
              White-Glove Corporate Execution
            </p>
            <h2
              className="mt-2 text-3xl font-semibold leading-tight sm:text-5xl"
              style={{ fontFamily: 'var(--font-editorial)', color: colors.cream }}
            >
              Custom Branding &amp; Pan-India Logistics
            </h2>
            <p className="mt-3 text-sm leading-relaxed opacity-85 sm:text-base">
              Built for HR teams, executive assistants, and client-partner desks — with subtle brand
              placement that respects the gift itself.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Sparkles,
                title: 'Logo Belly Sleeves & Foil Stamping',
                detail:
                  'Wrap every rigid box in an embossed cream or deep chocolate paper sleeve, with optional caramel foil stamping starting at 25+ boxes.',
              },
              {
                icon: Ribbon,
                title: 'Brand-Matched Satin Ribbons',
                detail:
                  'Select from Caramel Satin, Deep Chocolate, Muted Olive, Warm Ivory, or custom Pantone-matched grosgrain ribbons for bulk runs.',
              },
              {
                icon: PenTool,
                title: 'Printed Leadership & Welcome Notes',
                detail:
                  'Every box can include 350 GSM stationery printed with your team’s onboarding message, festive greeting, or signature.',
              },
              {
                icon: MapPin,
                title: 'Bulk Office Drops or Multi-Address Dispatch',
                detail:
                  'Route palletised cartons directly to boardrooms and conference venues, or split courier dispatch across remote employee home addresses pan-India.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border p-6"
                  style={{
                    borderColor: 'rgba(255, 248, 239, 0.14)',
                    backgroundColor: colors.chocolateDeep,
                  }}
                >
                  <Icon
                    className="size-5"
                    style={{ color: colors.caramel }}
                    aria-hidden="true"
                  />
                  <h3
                    className="mt-4 text-xl font-semibold leading-snug"
                    style={{ fontFamily: 'var(--font-editorial)' }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed opacity-80">{item.detail}</p>
                </div>
              );
            })}
          </div>

          <div
            className="mt-10 grid grid-cols-1 gap-4 rounded-xl border p-6 text-xs sm:grid-cols-3"
            style={{
              borderColor: 'rgba(255, 248, 239, 0.16)',
              backgroundColor: 'rgba(255, 248, 239, 0.04)',
            }}
          >
            <div className="flex items-start gap-3">
              <PackageCheck
                className="mt-0.5 size-4 shrink-0"
                style={{ color: colors.caramel }}
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">Tasting Sample Turnaround</p>
                <p className="mt-0.5 opacity-75">{shipping.sampleLeadTimeDays}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Award
                className="mt-0.5 size-4 shrink-0"
                style={{ color: colors.caramel }}
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">Branded Bulk Lead Time</p>
                <p className="mt-0.5 opacity-75">{shipping.bulkLeadTimeDays}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin
                className="mt-0.5 size-4 shrink-0"
                style={{ color: colors.caramel }}
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">Preparation Hubs</p>
                <p className="mt-0.5 opacity-75">{contact.dispatchHub}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. VALIDATED CORPORATE ENQUIRY / QUOTE FORM */}
      <BoxBiteQuoteForm
        prefillGiftingType={quotePrefillGiftingType}
        prefillNotes={quotePrefillNotes}
        builderSnapshot={quoteBuilderSnapshot}
        submittedQuotes={submittedQuotes}
        onSubmitQuote={handleSubmitQuote}
      />

      {/* 7. EDITORIAL SUB-BRAND FOOTER */}
      <footer
        className="border-t py-10 text-xs"
        style={{
          backgroundColor: colors.beige,
          borderColor: colors.hairline,
          color: colors.chocolate,
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <p
              className="text-xl font-bold tracking-wider"
              style={{ fontFamily: 'var(--font-editorial)' }}
            >
              {brandName} · <span className="font-normal italic">{tagline}</span>
            </p>
            <p className="mt-1 opacity-75">
              {BOX_AND_BITE_CONFIG.subBrandDescriptor} · {contact.email} · {contact.phoneDisplay}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setDrawerState({ open: true, tab: 'bag' })}
              className="cursor-pointer font-semibold underline opacity-85 hover:opacity-100"
            >
              Sample Bag ({totalCartBoxes})
            </button>
            <button
              type="button"
              onClick={onBackToFindMyBites}
              className="cursor-pointer rounded-lg px-4 py-2 font-semibold"
              style={{ backgroundColor: colors.chocolate, color: colors.cream }}
            >
              Return to Find My Bites Marketplace
            </button>
          </div>
        </div>
      </footer>

      {/* Product Detail Page Modal */}
      <BoxBiteProductDetailModal
        product={activeProduct}
        locationLabel={activeLocationLabel}
        isWishlisted={activeProduct ? wishlistIds.includes(activeProduct.id) : false}
        reviews={
          activeProduct ? reviews.filter((r) => r.productId === activeProduct.id) : []
        }
        onClose={() => setActiveProduct(null)}
        onToggleWishlist={toggleWishlist}
        onAddToCart={handleAddToCart}
        onSubmitReview={handleSubmitReview}
        onRequestBulkQuote={handleRequestQuoteForProduct}
      />

      {/* Persistent Bag & Wishlist Drawer */}
      <BoxBiteCartDrawer
        open={drawerState.open}
        initialTab={drawerState.tab}
        cartItems={cartItems}
        wishlistProducts={wishlistProducts}
        sampleOrders={sampleOrders}
        onClose={() => setDrawerState((prev) => ({ ...prev, open: false }))}
        onUpdateQty={handleUpdateCartQty}
        onRemoveCartItem={handleRemoveCartItem}
        onToggleWishlist={toggleWishlist}
        onOpenProduct={(prod) => setActiveProduct(prod)}
        onPlaceSampleOrder={handlePlaceSampleOrder}
      />
    </div>
  );
}
