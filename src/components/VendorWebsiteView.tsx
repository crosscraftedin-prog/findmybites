import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Copy,
  Crown,
  Eye,
  Globe2,
  Heart,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Star,
} from 'lucide-react';
import {
  BookingEnquiry,
  CurrencyCode,
  Vendor,
  VendorProduct,
  buildWhatsAppUrl,
  formatMoney,
  getVendorQuickTags,
} from '../data/vendors';
import { QrPosterModal } from './QrPosterModal';

export interface VendorMetrics {
  views: number;
  whatsappClicks: number;
}

interface VendorWebsiteViewProps {
  vendor: Vendor | null;
  currency: CurrencyCode;
  isSaved: boolean;
  metrics?: VendorMetrics;
  onClose: () => void;
  onToggleSave: (vendorId: string) => void;
  onCreateBooking: (booking: BookingEnquiry) => void;
  onOpenBookings: () => void;
  onTrackWhatsAppClick?: (vendorId: string) => void;
}

export function VendorWebsiteView({
  vendor,
  currency,
  isSaved,
  metrics,
  onClose,
  onToggleSave,
  onCreateBooking,
  onOpenBookings,
  onTrackWhatsAppClick,
}: VendorWebsiteViewProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [basketExpanded, setBasketExpanded] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [eventDate, setEventDate] = useState('2026-12-18');
  const [guests, setGuests] = useState(80);
  const [notes, setNotes] = useState('');
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    if (vendor) {
      setSelectedProductId(vendor.products[0]?.id ?? '');
      setBasket({});
      setBasketExpanded(false);
      setQrOpen(false);
      setSubmittedRef(null);
      setCopiedLink(false);
      setNotes('');
    }
  }, [vendor]);

  useEffect(() => {
    if (!vendor) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !qrOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [vendor, qrOpen, onClose]);

  const basketItems = useMemo(() => {
    if (!vendor) return [];
    return vendor.products
      .map((product) => ({ product, qty: basket[product.id] ?? 0 }))
      .filter((entry) => entry.qty > 0);
  }, [vendor, basket]);

  const basketTotalCount = useMemo(
    () => basketItems.reduce((sum, item) => sum + item.qty, 0),
    [basketItems]
  );

  const basketTotalUsd = useMemo(
    () => basketItems.reduce((sum, item) => sum + item.product.priceUsd * item.qty, 0),
    [basketItems]
  );

  if (!vendor) return null;

  const activeProduct: VendorProduct | undefined =
    vendor.products.find((p) => p.id === selectedProductId) ?? vendor.products[0];

  const quickTags = getVendorQuickTags(vendor);
  const shareUrl = `findmybites.com/v/${vendor.slug}`;

  const updateBasketQty = (productId: string, delta: number) => {
    setBasket((prev) => {
      const nextQty = Math.max(0, (prev[productId] ?? 0) + delta);
      if (nextQty === 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: nextQty };
    });
  };

  const buildBasketWhatsAppMessage = () => {
    const lines = basketItems.map(
      ({ product, qty }) =>
        `• ${qty}× ${product.name} (${formatMoney(product.priceUsd * qty, currency)})`
    );
    return [
      `Hi ${vendor.name}, I'd like to order from your FindMyBites storefront (${shareUrl}):`,
      '',
      ...lines,
      '',
      `Estimated Total: ${formatMoney(basketTotalUsd, currency)}`,
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
        ? basketItems.map((i) => `${i.qty}× ${i.product.name}`).join(', ')
        : activeProduct.name;

    const estimatedUsd = basketItems.length > 0 ? basketTotalUsd : activeProduct.priceUsd;

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

  const isPaid = vendor.planTier === 'business' || vendor.planTier === 'pro';

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

      {/* One-Page Vendor Website Hero */}
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
                  {vendor.planTier === 'business' ? 'Top Spotlight Partner' : 'Featured Pro Partner'}
                </span>
              )}
              <span className="font-semibold">{vendor.category}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {vendor.area}, {vendor.city}, {vendor.state} · {vendor.country}
              </span>
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

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                <strong className="font-mono text-white">{vendor.rating.toFixed(2)}</strong>
                <span>({vendor.reviewCount} verified reviews)</span>
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
                href={buildWhatsAppUrl(vendor)}
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
                onClick={() => setQrOpen(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                <QrCode className="size-4" aria-hidden="true" />
                QR Menu Poster
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main One-Page Storefront Content */}
      <main className="mx-auto max-w-6xl space-y-14 px-4 py-12 pb-36 sm:px-6 lg:px-8">
        {/* About + Service Areas */}
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
            <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Direct WhatsApp Hotline</p>
              <p className="mt-0.5 font-mono">+{vendor.whatsappNumber}</p>
            </div>
            {metrics && (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3.5 text-brand" aria-hidden="true" />
                  <strong className="font-mono text-foreground">{metrics.views}</strong> storefront views
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="size-3.5 text-[#25D366]" aria-hidden="true" />
                  <strong className="font-mono text-foreground">{metrics.whatsappClicks}</strong> WA leads
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Full Product Catalog Grid with Multi-Item WhatsApp Basket */}
        <section id="vendor-products">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand">
                One-Page Product Catalog &amp; WhatsApp Order Basket
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                Products, Counters &amp; Packages
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Add multiple items to your WhatsApp Order Basket or enquire on any single item.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vendor.products.map((product) => {
              const isSelected = activeProduct?.id === product.id;
              const qty = basket[product.id] ?? 0;
              const productWaText = `Hi ${vendor.name}, I saw "${product.name}" (${formatMoney(product.priceUsd, currency)} · ${product.serves}) on your FindMyBites page (${shareUrl}). Is it available for my upcoming event?`;

              return (
                <div
                  key={product.id}
                  className={`flex flex-col overflow-hidden rounded-2xl border bg-card transition-all ${
                    qty > 0
                      ? 'border-[#25D366] ring-2 ring-[#25D366]/20'
                      : isSelected
                        ? 'border-brand ring-2 ring-brand/20'
                        : 'border-border'
                  }`}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    {product.tag && (
                      <span className="absolute left-3 top-3 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                        {product.tag}
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-3 py-1 font-mono text-xs font-bold tabular-nums text-white backdrop-blur-md">
                      {formatMoney(product.priceUsd, currency)}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-medium text-muted-foreground">{product.serves}</p>
                    <h3 className="mt-1 text-base font-bold text-foreground">{product.name}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {product.description}
                    </p>

                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
                      {qty > 0 ? (
                        <div className="inline-flex flex-1 items-center justify-between rounded-lg border border-[#25D366] bg-[#25D366]/10 px-2 py-1.5">
                          <button
                            type="button"
                            aria-label={`Remove one ${product.name}`}
                            onClick={() => updateBasketQty(product.id, -1)}
                            className="grid size-6 cursor-pointer place-items-center rounded-md bg-background text-foreground hover:bg-accent"
                          >
                            <Minus className="size-3.5" aria-hidden="true" />
                          </button>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {qty} in order
                          </span>
                          <button
                            type="button"
                            aria-label={`Add one more ${product.name}`}
                            onClick={() => updateBasketQty(product.id, 1)}
                            className="grid size-6 cursor-pointer place-items-center rounded-md bg-[#25D366] text-white hover:bg-[#1ebe5d]"
                          >
                            <Plus className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            updateBasketQty(product.id, 1);
                            setSelectedProductId(product.id);
                          }}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand whitespace-nowrap"
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          Add to Order
                        </button>
                      )}

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
        </section>

        {/* Booking Form + Verified Reviews side-by-side */}
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
                    {activeProduct?.name} (
                    {activeProduct ? formatMoney(activeProduct.priceUsd, currency) : ''})
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
                        : `Hi ${vendor.name}, I just sent booking enquiry ${submittedRef} for "${activeProduct?.name}" on ${eventDate} (${guests} guests). Notes: ${notes || 'None'}`
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
            <h2 className="text-xl font-extrabold text-foreground">Verified Reviews</h2>
            <div className="mt-4 space-y-4">
              {vendor.reviews.map((rev) => (
                <div key={rev.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-foreground">{rev.author}</span>
                    <span className="font-mono font-semibold text-amber-500">
                      {rev.rating.toFixed(1)}★
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {rev.role} · {rev.date}
                  </p>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    “{rev.comment}”
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
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
                {basketItems.map(({ product, qty }) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="truncate font-medium text-foreground">
                      {qty}× {product.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-semibold text-foreground">
                        {formatMoney(product.priceUsd * qty, currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateBasketQty(product.id, -1)}
                        className="grid size-5 cursor-pointer place-items-center rounded border border-border hover:bg-accent"
                        aria-label={`Decrease ${product.name}`}
                      >
                        <Minus className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateBasketQty(product.id, 1)}
                        className="grid size-5 cursor-pointer place-items-center rounded border border-border hover:bg-accent"
                        aria-label={`Increase ${product.name}`}
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

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {basketItems.length > 0 ? (
            <button
              type="button"
              onClick={() => setBasketExpanded((prev) => !prev)}
              className="min-w-0 cursor-pointer text-left"
            >
              <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <ShoppingBag className="size-4 text-[#25D366]" aria-hidden="true" />
                {basketTotalCount} {basketTotalCount === 1 ? 'item' : 'items'} selected ·{' '}
                <span className="font-mono">{formatMoney(basketTotalUsd, currency)}</span>
              </p>
              <p className="truncate text-xs text-brand">
                {basketExpanded ? 'Hide itemized basket' : 'Tap to review items before sending'}
              </p>
            </button>
          ) : (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{vendor.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {activeProduct?.name} ·{' '}
                <span className="font-mono font-semibold text-foreground">
                  {activeProduct ? formatMoney(activeProduct.priceUsd, currency) : ''}
                </span>
              </p>
            </div>
          )}

          <a
            href={buildWhatsAppUrl(
              vendor,
              basketItems.length > 0
                ? buildBasketWhatsAppMessage()
                : `Hi ${vendor.name}, I'm viewing your page on FindMyBites × PimpMyParty and want to ask about "${activeProduct?.name}".`
            )}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onTrackWhatsAppClick?.(vendor.id)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-[#1ebe5d] sm:text-sm"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {basketItems.length > 0 ? 'Send Order on WhatsApp' : 'Chat on WhatsApp'}
          </a>
        </div>
      </div>

      <QrPosterModal vendor={qrOpen ? vendor : null} onClose={() => setQrOpen(false)} />
    </div>
  );
}
