import { FormEvent, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Gift,
  Loader2,
  MapPin,
  MessageCircle,
  QrCode,
  ShoppingBag,
  Smartphone,
  Store,
  Tag,
  Truck,
  X,
} from 'lucide-react';
import {
  BookingEnquiry,
  CURRENCIES,
  CurrencyCode,
  DEFAULT_ORDERING_TIME_SLOTS,
  Vendor,
  VendorProduct,
  VendorPromoCode,
  buildWhatsAppUrl,
  formatMoney,
  sanitizeSafeHttpUrl,
} from '../data/vendors';
import { createDirectOrderInCloud } from '../services/firestoreService';

export interface DirectCheckoutItem {
  key: string;
  product: VendorProduct;
  displayName: string;
  unitPriceUsd: number;
  qty: number;
}

interface DirectOrderCheckoutModalProps {
  vendor: Vendor | null;
  items: DirectCheckoutItem[];
  currency: CurrencyCode;
  defaultCustomerName?: string;
  defaultCustomerContact?: string;
  onClose: () => void;
  onOrderPlaced: (order: BookingEnquiry) => void;
  onTrackWhatsAppClick?: (vendorId: string) => void;
}

type FulfillmentMode = 'delivery' | 'pickup';
type PaymentChoice = 'upi' | 'payment_link' | 'cod';

function getMinOrderDateIso(advanceHours: number): string {
  const now = new Date();
  const target = new Date(now.getTime() + Math.max(0, advanceHours) * 60 * 60 * 1000);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DirectOrderCheckoutModal({
  vendor,
  items,
  currency,
  defaultCustomerName = '',
  defaultCustomerContact = '',
  onClose,
  onOrderPlaced,
  onTrackWhatsAppClick,
}: DirectOrderCheckoutModalProps) {
  const cfg = vendor?.orderingConfig;
  const deliveryAllowed = cfg?.deliveryEnabled !== false;
  const pickupAllowed = cfg?.pickupEnabled !== false;
  const hasUpi = Boolean(cfg?.upiId && cfg.upiId.trim());
  const safePaymentLink = cfg?.paymentLinkUrl
    ? sanitizeSafeHttpUrl(cfg.paymentLinkUrl)
    : null;
  const codAllowed = cfg?.codEnabled !== false || (!hasUpi && !safePaymentLink);

  const requiredAdvanceHours = useMemo(() => {
    const storeHours = cfg?.minAdvanceHours ?? 0;
    const itemMax = items.reduce((max, i) => Math.max(max, i.product.advanceHours ?? 0), 0);
    return Math.max(storeHours, itemMax);
  }, [cfg?.minAdvanceHours, items]);

  const minDateIso = useMemo(() => getMinOrderDateIso(requiredAdvanceHours), [requiredAdvanceHours]);
  const timeSlots = useMemo(
    () => (cfg?.timeSlots && cfg.timeSlots.length > 0 ? cfg.timeSlots : DEFAULT_ORDERING_TIME_SLOTS),
    [cfg?.timeSlots]
  );

  const [fulfillment, setFulfillment] = useState<FulfillmentMode>(
    deliveryAllowed ? 'delivery' : 'pickup'
  );
  const [orderDate, setOrderDate] = useState(minDateIso);
  const [timeSlot, setTimeSlot] = useState(timeSlots[0] || DEFAULT_ORDERING_TIME_SLOTS[0]);
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [customerPhone, setCustomerPhone] = useState(defaultCustomerContact);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [cakeMessage, setCakeMessage] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<VendorPromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>(
    hasUpi ? 'upi' : safePaymentLink ? 'payment_link' : 'cod'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    order: BookingEnquiry;
    upiUri?: string;
    whatsappMessage: string;
    totalFormatted: string;
  } | null>(null);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    if (!vendor) return;
    setFulfillment(deliveryAllowed ? 'delivery' : 'pickup');
    setOrderDate(minDateIso);
    setTimeSlot(timeSlots[0] || DEFAULT_ORDERING_TIME_SLOTS[0]);
    setPaymentChoice(hasUpi ? 'upi' : safePaymentLink ? 'payment_link' : 'cod');
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
    setError(null);
    setConfirmedOrder(null);
    setUpiQrDataUrl('');
  }, [vendor, deliveryAllowed, minDateIso, timeSlots, hasUpi, safePaymentLink]);

  useEffect(() => {
    if (!vendor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [vendor, onClose]);

  const activePromos = useMemo(
    () => (cfg?.promoCodes || []).filter((p) => p.active !== false && p.code),
    [cfg?.promoCodes]
  );

  const subtotalUsd = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPriceUsd * item.qty, 0),
    [items]
  );

  const deliveryFeeUsd = useMemo(() => {
    if (fulfillment !== 'delivery') return 0;
    const baseFee = cfg?.deliveryFeeUsd ?? 0;
    if (baseFee <= 0) return 0;
    if (cfg?.freeDeliveryAboveUsd && subtotalUsd >= cfg.freeDeliveryAboveUsd) return 0;
    return baseFee;
  }, [fulfillment, cfg?.deliveryFeeUsd, cfg?.freeDeliveryAboveUsd, subtotalUsd]);

  const discountUsd = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.minOrderUsd && subtotalUsd < appliedPromo.minOrderUsd) return 0;
    if (appliedPromo.type === 'percent') {
      return Number(((subtotalUsd * Math.min(80, appliedPromo.value)) / 100).toFixed(2));
    }
    return Math.min(subtotalUsd, appliedPromo.value);
  }, [appliedPromo, subtotalUsd]);

  const grandTotalUsd = Math.max(0, Number((subtotalUsd + deliveryFeeUsd - discountUsd).toFixed(2)));
  const grandTotalLocal = Math.round(grandTotalUsd * (CURRENCIES[currency]?.rate || 1));

  useEffect(() => {
    if (!confirmedOrder?.upiUri) {
      setUpiQrDataUrl('');
      return;
    }
    let active = true;
    QRCode.toDataURL(confirmedOrder.upiUri, {
      width: 240,
      margin: 2,
      color: { dark: '#111111', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setUpiQrDataUrl(url);
      })
      .catch(() => {
        if (active) setUpiQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [confirmedOrder?.upiUri]);

  if (!vendor || items.length === 0) return null;

  const handleApplyPromo = (rawCode?: string) => {
    const clean = (rawCode ?? promoInput).trim().toUpperCase();
    setPromoError(null);
    if (!clean) {
      setAppliedPromo(null);
      return;
    }
    const found = activePromos.find((p) => p.code.toUpperCase() === clean);
    if (!found) {
      setAppliedPromo(null);
      setPromoError(`Promo code "${clean}" is not valid for ${vendor.name}.`);
      return;
    }
    if (found.minOrderUsd && subtotalUsd < found.minOrderUsd) {
      setAppliedPromo(null);
      setPromoError(
        `Minimum order of ${formatMoney(found.minOrderUsd, currency)} required for ${found.code}.`
      );
      return;
    }
    setPromoInput(found.code);
    setAppliedPromo(found);
  };

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Please enter your name and WhatsApp / phone number.');
      return;
    }
    if (fulfillment === 'delivery' && !deliveryAddress.trim()) {
      setError('Please enter your delivery address.');
      return;
    }

    setSubmitting(true);
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const reference = `ORD-${randomCode}`;
    const totalQty = items.reduce((s, i) => s + i.qty, 0);
    const itemsSummary = items
      .map((i) => `${i.qty}× ${i.displayName} (${formatMoney(i.unitPriceUsd * i.qty, currency)})`)
      .join(', ');
    const paymentLabel =
      paymentChoice === 'upi'
        ? `Direct UPI (${cfg?.upiId})`
        : paymentChoice === 'payment_link'
          ? 'Online Payment Link'
          : fulfillment === 'delivery'
            ? 'Pay on Delivery'
            : 'Pay on Pickup';

    const structuredNotes = [
      `Type: ${fulfillment === 'delivery' ? 'Delivery' : 'Self Pickup'}`,
      `Slot: ${orderDate} · ${timeSlot}`,
      fulfillment === 'delivery' ? `Address: ${deliveryAddress.trim()}` : `Pickup at: ${vendor.area}, ${vendor.city}`,
      cakeMessage.trim() ? `Cake / Custom Note: ${cakeMessage.trim()}` : '',
      appliedPromo ? `Promo Applied: ${appliedPromo.code} (-${formatMoney(discountUsd, currency)})` : '',
      `Payment: ${paymentLabel}`,
      `Items: ${itemsSummary}`,
    ]
      .filter(Boolean)
      .join(' | ');

    const draftOrder: BookingEnquiry = {
      id: `ord-${Date.now()}-${randomCode}`,
      reference,
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorCity: vendor.city,
      vendorCategory: vendor.category,
      packageName:
        items.length === 1
          ? `${items[0].qty}× ${items[0].displayName}`
          : `${totalQty} items · ${items[0].displayName} +${items.length - 1} more`,
      estimatedUsd: grandTotalUsd,
      eventDate: orderDate,
      guests: totalQty,
      customerName: customerName.trim(),
      customerEmail: customerPhone.trim(),
      notes: structuredNotes,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      status: 'New Order',
    };

    let savedOrder = draftOrder;
    try {
      savedOrder = await createDirectOrderInCloud(draftOrder, vendor.ownerId);
    } catch {
      // Fallback to local order receipt if demo vendor or offline
    }

    onOrderPlaced(savedOrder);

    const totalFormatted = formatMoney(grandTotalUsd, currency);
    const upiUri =
      paymentChoice === 'upi' && cfg?.upiId
        ? `upi://pay?pa=${encodeURIComponent(cfg.upiId)}&pn=${encodeURIComponent(
            cfg.upiPayeeName || vendor.name
          )}&am=${encodeURIComponent(String(grandTotalLocal))}&cu=INR&tn=${encodeURIComponent(
            `Order ${savedOrder.reference} - ${vendor.name}`
          )}`
        : undefined;

    const waLines = [
      `🛍️ *NEW DIRECT ORDER #${savedOrder.reference}*`,
      `Store: ${vendor.name} (${vendor.city})`,
      ``,
      `*Items:*`,
      ...items.map(
        (i) => `• ${i.qty}× ${i.displayName} — ${formatMoney(i.unitPriceUsd * i.qty, currency)}`
      ),
      ``,
      ...(deliveryFeeUsd > 0 ? [`Delivery Fee: ${formatMoney(deliveryFeeUsd, currency)}`] : []),
      ...(discountUsd > 0 && appliedPromo
        ? [`Promo (${appliedPromo.code}): -${formatMoney(discountUsd, currency)}`]
        : []),
      `*Grand Total: ${totalFormatted}*`,
      ``,
      `Fulfillment: ${fulfillment === 'delivery' ? 'Delivery' : 'Self Pickup'}`,
      `Date & Slot: ${orderDate} (${timeSlot})`,
      ...(fulfillment === 'delivery' ? [`Address: ${deliveryAddress.trim()}`] : []),
      ...(cakeMessage.trim() ? [`Cake / Custom Note: ${cakeMessage.trim()}`] : []),
      `Payment Method: ${paymentLabel}`,
      `Customer: ${customerName.trim()} (${customerPhone.trim()})`,
    ];

    setConfirmedOrder({
      order: savedOrder,
      upiUri,
      whatsappMessage: waLines.join('\n'),
      totalFormatted,
    });
    setSubmitting(false);
  };

  const handleCopyUpi = () => {
    if (!cfg?.upiId) return;
    navigator.clipboard?.writeText(cfg.upiId).catch(() => undefined);
    setCopiedUpi(true);
    window.setTimeout(() => setCopiedUpi(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="direct-checkout-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border bg-background/90 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-brand">
              Direct Online Order · 0% Commission
            </p>
            <h2
              id="direct-checkout-title"
              className="mt-0.5 truncate text-lg font-extrabold text-foreground"
            >
              {confirmedOrder
                ? `Order Confirmed · ${confirmedOrder.order.reference}`
                : `Checkout with ${vendor.name}`}
            </h2>
            <p className="text-xs text-muted-foreground">
              {vendor.area}, {vendor.city} · {items.reduce((s, i) => s + i.qty, 0)} items ·{' '}
              <span className="font-mono font-bold text-foreground">
                {formatMoney(grandTotalUsd, currency)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-border bg-card text-foreground hover:bg-accent"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        {confirmedOrder ? (
          <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-extrabold">
                    Order #{confirmedOrder.order.reference} placed with {vendor.name}!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your order is live on the baker&apos;s Order Board. Send it on WhatsApp below for
                    instant confirmation.
                  </p>
                </div>
              </div>
            </div>

            {/* Direct UPI Payment QR / 1-Tap Pay */}
            {confirmedOrder.upiUri && cfg?.upiId && (
              <div className="rounded-xl border border-brand-border bg-brand-soft/30 p-4">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  {upiQrDataUrl ? (
                    <div className="shrink-0 rounded-xl border border-border bg-white p-2 shadow-xs">
                      <img
                        src={upiQrDataUrl}
                        alt={`UPI QR code for ${vendor.name}`}
                        className="size-36 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="grid size-36 shrink-0 place-items-center rounded-xl border border-border bg-white text-muted-foreground">
                      <QrCode className="size-10" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-2.5 text-center sm:text-left">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-brand">
                        Pay {confirmedOrder.totalFormatted} Directly via UPI
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Scan with GPay, PhonePe, Paytm, or any UPI app. 100% goes directly to{' '}
                        <strong className="text-foreground">{cfg.upiPayeeName || vendor.name}</strong>.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <a
                        href={confirmedOrder.upiUri}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
                      >
                        <Smartphone className="size-3.5" aria-hidden="true" />
                        Open UPI App ({confirmedOrder.totalFormatted})
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs font-semibold text-foreground hover:border-brand"
                      >
                        {copiedUpi ? (
                          <>
                            <Check className="size-3.5 text-emerald-600" />
                            Copied UPI
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            {cfg.upiId}
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      After paying, tap the green WhatsApp button below to share your payment screenshot.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Optional Payment Link */}
            {paymentChoice === 'payment_link' && safePaymentLink && (
              <div className="rounded-xl border border-brand-border bg-brand-soft/30 p-4">
                <p className="text-xs font-bold text-foreground">
                  Complete payment ({confirmedOrder.totalFormatted}) via {vendor.name}&apos;s Payment Link:
                </p>
                <a
                  href={safePaymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
                >
                  Pay {confirmedOrder.totalFormatted} Now
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </div>
            )}

            {/* Order Summary Card */}
            <div className="rounded-xl border border-border bg-background p-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-mono font-bold text-foreground">
                  {confirmedOrder.order.reference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date &amp; Slot</span>
                <span className="font-semibold text-foreground">
                  {orderDate} · {timeSlot}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fulfillment</span>
                <span className="font-semibold text-foreground">
                  {fulfillment === 'delivery' ? 'Delivery' : 'Self Pickup'}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-sm">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-mono font-extrabold text-brand">
                  {confirmedOrder.totalFormatted}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-accent"
              >
                Back to Storefront
              </button>
              <a
                href={buildWhatsAppUrl(vendor, confirmedOrder.whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onTrackWhatsAppClick?.(vendor.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#1ebe5d]"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                Send Order Receipt on WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handlePlaceOrder(e)} className="space-y-5 overflow-y-auto p-5 sm:p-6">
            {/* Fulfillment Toggle */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                1. Fulfillment Method
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                <button
                  type="button"
                  disabled={!deliveryAllowed}
                  onClick={() => setFulfillment('delivery')}
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    fulfillment === 'delivery'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Truck className="size-4 text-brand" aria-hidden="true" />
                  Home Delivery
                </button>
                <button
                  type="button"
                  disabled={!pickupAllowed}
                  onClick={() => setFulfillment('pickup')}
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    fulfillment === 'pickup'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Store className="size-4 text-brand" aria-hidden="true" />
                  Self Pickup ({vendor.area})
                </button>
              </div>
            </div>

            {/* Date & Time Slot */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  2. Preferred Date &amp; Time Slot
                </p>
                {requiredAdvanceHours > 0 && (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Requires {requiredAdvanceHours}h advance pre-order
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="ord-date" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Calendar className="size-3.5 text-brand" aria-hidden="true" />
                    Order Date
                  </label>
                  <input
                    id="ord-date"
                    type="date"
                    required
                    min={minDateIso}
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Clock className="size-3.5 text-brand" aria-hidden="true" />
                    Time Slot
                  </label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Customer Contact & Address */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                3. Your Details &amp; Customisation
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="ord-name" className="block text-xs font-semibold text-foreground">
                    Full Name
                  </label>
                  <input
                    id="ord-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Priya Sharma"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="ord-phone" className="block text-xs font-semibold text-foreground">
                    WhatsApp / Phone Number
                  </label>
                  <input
                    id="ord-phone"
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {fulfillment === 'delivery' && (
                <div>
                  <label htmlFor="ord-addr" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <MapPin className="size-3.5 text-brand" aria-hidden="true" />
                    Delivery Address &amp; Landmark
                  </label>
                  <textarea
                    id="ord-addr"
                    rows={2}
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder={`Flat / House No., Street, Area in ${vendor.city}...`}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label htmlFor="ord-cake-msg" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Gift className="size-3.5 text-brand" aria-hidden="true" />
                  Cake Message / Item Customisation (Optional)
                </label>
                <input
                  id="ord-cake-msg"
                  type="text"
                  maxLength={200}
                  value={cakeMessage}
                  onChange={(e) => setCakeMessage(e.target.value)}
                  placeholder='e.g. "Happy Birthday Aarav!" · Eggless · Less cream'
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            {/* Promo Code */}
            {activePromos.length > 0 && (
              <div className="rounded-xl border border-border bg-background p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="ord-promo" className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Tag className="size-3.5 text-brand" aria-hidden="true" />
                    Apply Promo / Discount Code
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>Available:</span>
                    {activePromos.slice(0, 3).map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => handleApplyPromo(p.code)}
                        className="cursor-pointer font-mono font-bold text-brand hover:underline"
                      >
                        {p.code}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    id="ord-promo"
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs uppercase text-foreground focus:border-brand focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyPromo()}
                    className="cursor-pointer rounded-lg border border-brand bg-brand/10 px-4 py-2 text-xs font-bold text-brand hover:bg-brand hover:text-brand-foreground"
                  >
                    Apply
                  </button>
                </div>
                {promoError && <p className="mt-1.5 text-xs text-rose-600">{promoError}</p>}
                {appliedPromo && discountUsd > 0 && (
                  <p className="mt-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Code {appliedPromo.code} applied — you save {formatMoney(discountUsd, currency)}!
                  </p>
                )}
              </div>
            )}

            {/* Payment Method */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                4. Payment Method (Paid 100% Directly to {vendor.name})
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {hasUpi && (
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('upi')}
                    className={`cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                      paymentChoice === 'upi'
                        ? 'border-brand bg-brand-soft/45 ring-2 ring-brand/20'
                        : 'border-border bg-background hover:border-brand/50'
                    }`}
                  >
                    <p className="text-xs font-extrabold text-foreground">Direct UPI / QR</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      GPay, PhonePe, Paytm
                    </p>
                  </button>
                )}
                {safePaymentLink && (
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('payment_link')}
                    className={`cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                      paymentChoice === 'payment_link'
                        ? 'border-brand bg-brand-soft/45 ring-2 ring-brand/20'
                        : 'border-border bg-background hover:border-brand/50'
                    }`}
                  >
                    <p className="text-xs font-extrabold text-foreground">Online Payment Link</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Cards / Netbanking / UPI
                    </p>
                  </button>
                )}
                {codAllowed && (
                  <button
                    type="button"
                    onClick={() => setPaymentChoice('cod')}
                    className={`cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                      paymentChoice === 'cod'
                        ? 'border-brand bg-brand-soft/45 ring-2 ring-brand/20'
                        : 'border-border bg-background hover:border-brand/50'
                    }`}
                  >
                    <p className="text-xs font-extrabold text-foreground">
                      {fulfillment === 'delivery' ? 'Pay on Delivery' : 'Pay on Pickup'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Cash or UPI on handover
                    </p>
                  </button>
                )}
              </div>
            </div>

            {/* Order Bill Summary */}
            <div className="rounded-xl border border-border bg-muted/35 p-4 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <ShoppingBag className="size-3.5 text-brand" aria-hidden="true" />
                Order Summary
              </div>
              {items.map((item) => (
                <div key={item.key} className="flex justify-between gap-2 text-muted-foreground">
                  <span className="truncate">
                    {item.qty}× {item.displayName}
                  </span>
                  <span className="shrink-0 font-mono font-semibold text-foreground">
                    {formatMoney(item.unitPriceUsd * item.qty, currency)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-1.5 text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatMoney(subtotalUsd, currency)}
                </span>
              </div>
              {fulfillment === 'delivery' && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Fee</span>
                  <span className="font-mono font-semibold text-foreground">
                    {deliveryFeeUsd > 0 ? formatMoney(deliveryFeeUsd, currency) : 'Free / As confirmed'}
                  </span>
                </div>
              )}
              {discountUsd > 0 && appliedPromo && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Discount ({appliedPromo.code})</span>
                  <span className="font-mono font-semibold">
                    −{formatMoney(discountUsd, currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-sm font-extrabold text-foreground">
                <span>Total Payable</span>
                <span className="font-mono text-brand">{formatMoney(grandTotalUsd, currency)}</span>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-extrabold text-brand-foreground shadow-sm hover:bg-brand-hover disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Placing Order…
                  </>
                ) : (
                  <>Place Order · {formatMoney(grandTotalUsd, currency)}</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
