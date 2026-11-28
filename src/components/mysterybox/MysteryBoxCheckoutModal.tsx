import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Gift,
  Loader2,
  Lock,
  LogIn,
  MapPin,
  ShieldCheck,
  Smartphone,
  Tag,
  X,
} from 'lucide-react';
import {
  DEFAULT_MARKETING_CONFIG,
  MYSTERY_BOX_DEFAULT_CITIES,
  MYSTERY_BOX_DELIVERY_SLOTS,
  type MysteryBoxMarketingConfig,
  type MysteryBoxOrder,
  type MysteryBoxPackage,
  formatInr,
} from '../../data/mysteryBoxes';
import { resolveMysteryBoxImage } from '../../data/mysteryBoxImages';
import {
  type InitiateMysteryBoxOrderResponse,
  initiateMysteryBoxOrder,
  markMysteryBoxPaymentFailed,
  validateMysteryBoxCoupon,
  verifyMysteryBoxPayment,
} from '../../services/mysteryBoxService';

interface MysteryBoxCheckoutModalProps {
  pkg: MysteryBoxPackage | null;
  marketing?: MysteryBoxMarketingConfig | null;
  initialIsGift?: boolean;
  user: User | null;
  onSignIn: () => Promise<void>;
  onClose: () => void;
  onOrderVerified: (order: MysteryBoxOrder) => void;
  onNotify?: (msg: string) => void;
}

function getDefaultDeliveryDateIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function MysteryBoxCheckoutModal({
  pkg,
  marketing,
  initialIsGift = false,
  user,
  onSignIn,
  onClose,
  onOrderVerified,
  onNotify,
}: MysteryBoxCheckoutModalProps) {
  const cfg = marketing || DEFAULT_MARKETING_CONFIG;
  const availableCities = useMemo(
    () => (pkg?.deliveryCities?.length ? pkg.deliveryCities : MYSTERY_BOX_DEFAULT_CITIES),
    [pkg?.deliveryCities]
  );

  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [isGift, setIsGift] = useState(initialIsGift);
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryCity, setDeliveryCity] = useState(availableCities[0] || 'Bengaluru');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDateIso());
  const [deliverySlot, setDeliverySlot] = useState(MYSTERY_BOX_DELIVERY_SLOTS[1]);
  const [dietaryPreference, setDietaryPreference] = useState<'any' | 'eggless_only'>('eggless_only');
  const [giftMessage, setGiftMessage] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    description: string;
    discountInr: number;
  } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');

  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [session, setSession] = useState<InitiateMysteryBoxOrderResponse | null>(null);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('');
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pkg) return;
    setStep('details');
    setIsGift(initialIsGift);
    setCustomerName(user?.displayName || '');
    setDeliveryCity(availableCities[0] || 'Bengaluru');
    setDeliveryDate(getDefaultDeliveryDateIso());
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
    setSession(null);
    setUpiQrDataUrl('');
    setPaymentRefInput('');
    setError(null);
    setIdempotencyKey(`mb-${pkg.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  }, [pkg?.id, initialIsGift, user?.displayName, availableCities]);

  useEffect(() => {
    if (!session?.upiUri) {
      setUpiQrDataUrl('');
      return;
    }
    let active = true;
    QRCode.toDataURL(session.upiUri, {
      width: 220,
      margin: 2,
      color: { dark: '#181024', light: '#ffffff' },
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
  }, [session?.upiUri]);

  useEffect(() => {
    if (!pkg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pkg, onClose]);

  if (!pkg) return null;

  const deliveryFeeInr =
    pkg.priceInr >= cfg.freeDeliveryAboveInr
      ? 0
      : Math.max(0, pkg.deliveryFeeInr ?? cfg.defaultDeliveryFeeInr);
  const discountInr = appliedCoupon?.discountInr || 0;
  const grandTotalInr = Math.max(1, pkg.priceInr + deliveryFeeInr - discountInr);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await validateMysteryBoxCoupon(code, pkg.id);
      setAppliedCoupon({
        code: res.code,
        description: res.description,
        discountInr: res.discountInr,
      });
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : 'Invalid promo code.');
    } finally {
      setCouponBusy(false);
    }
  };

  const handleInitiateCheckout = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in first so your Mystery Box unboxing stays securely linked to your account.');
      return;
    }
    if (!policyAccepted) {
      setError('Please review and accept the allergen & cancellation policy before paying.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const initiated = await initiateMysteryBoxOrder(
        {
          packageId: pkg.id,
          idempotencyKey,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          isGift,
          recipientName: (isGift ? recipientName : customerName).trim(),
          recipientPhone: (isGift ? recipientPhone : customerPhone).trim(),
          deliveryAddress: deliveryAddress.trim(),
          deliveryCity,
          deliveryDate,
          deliverySlot,
          giftMessage: isGift ? giftMessage.trim() : undefined,
          dietaryPreference,
          couponCode: appliedCoupon?.code,
          paymentMethod,
        },
        user
      );
      setSession(initiated);
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || !user) return;
    const ref = paymentRefInput.trim();
    if (ref.length < 6) {
      setError('Enter your 6+ character UPI UTR or payment reference number to verify payment.');
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      const res = await verifyMysteryBoxPayment(
        session.order.id,
        {
          paymentSessionToken: session.paymentSessionToken,
          paymentProviderRef: ref,
          paymentMethod,
        },
        user
      );
      onNotify?.('Payment verified! Your Mystery Box is ready to unwrap.');
      onOrderVerified(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleReportPaymentFailure = async () => {
    if (!session || !user) return;
    try {
      await markMysteryBoxPaymentFailed(session.order.id, user);
    } catch {
      // ignore
    }
    setError('Payment marked incomplete. No box was opened—you can retry payment safely below.');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Checkout ${pkg.name}`}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-neutral-950/75 p-3 backdrop-blur-sm sm:p-5"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#E9D8C8] bg-[#FFF8F0] shadow-2xl dark:border-purple-900/50 dark:bg-[#171020]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#EAD9C8] bg-white px-5 py-4 dark:border-purple-900/40 dark:bg-[#1E1529]">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={resolveMysteryBoxImage(pkg.image, 'celebration', cfg.seasonalEdition || 'christmas')}
              referrerPolicy="no-referrer"
              alt={pkg.name}
              className="size-11 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B21A8] dark:text-purple-300">
                {step === 'details' ? 'Step 1 of 2 · Delivery & Gift Details' : 'Step 2 of 2 · Secure Online Payment'}
              </p>
              <h3 className="truncate text-base font-extrabold text-neutral-950 dark:text-white">
                {pkg.name} · {formatInr(grandTotalInr)}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-neutral-200"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {!user ? (
            <div className="rounded-2xl border border-[#EAD9C8] bg-white p-6 text-center dark:border-purple-900/40 dark:bg-[#22182F]">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#6B21A8]/10 text-[#6B21A8] dark:bg-purple-500/20 dark:text-purple-300">
                <Lock className="size-6" aria-hidden="true" />
              </div>
              <h4 className="mt-3 text-lg font-extrabold text-neutral-950 dark:text-white">
                Sign in to reserve your Mystery Box
              </h4>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
                Signing in keeps your surprise contents private so only you can unwrap and track your box.
              </p>
              <button
                type="button"
                onClick={() => void onSignIn()}
                className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#FF6B35] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#EA5822]"
              >
                <LogIn className="size-4" aria-hidden="true" />
                Sign in with Google
              </button>
            </div>
          ) : step === 'details' ? (
            <form onSubmit={handleInitiateCheckout} className="space-y-5">
              {/* Self vs Gift Switch */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#EAD9C8] bg-white p-1 dark:border-purple-900/40 dark:bg-[#22182F]">
                <button
                  type="button"
                  onClick={() => setIsGift(false)}
                  className={`cursor-pointer rounded-lg py-2.5 text-xs font-bold transition-colors ${
                    !isGift
                      ? 'bg-[#6B21A8] text-white'
                      : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-300'
                  }`}
                >
                  Buy for Myself
                </button>
                <button
                  type="button"
                  onClick={() => setIsGift(true)}
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition-colors ${
                    isGift
                      ? 'bg-[#FF6B35] text-white'
                      : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-300'
                  }`}
                >
                  <Gift className="size-3.5" aria-hidden="true" />
                  Send as a Gift
                </button>
              </div>

              {/* Buyer details */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-xl border border-[#E5D4C3] bg-white px-3.5 py-2.5 text-sm text-neutral-950 outline-none focus:border-[#6B21A8] dark:border-purple-800/50 dark:bg-[#22182F] dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    Your Phone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-[#E5D4C3] bg-white px-3.5 py-2.5 text-sm text-neutral-950 outline-none focus:border-[#6B21A8] dark:border-purple-800/50 dark:bg-[#22182F] dark:text-white"
                  />
                </div>
              </div>

              {/* Gift recipient fields */}
              {isGift && (
                <div className="space-y-3 rounded-2xl border border-[#FF6B35]/30 bg-white p-4 dark:border-[#FF6B35]/40 dark:bg-[#22182F]">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#FF6B35]">
                    Gift Recipient Details
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Recipient full name *"
                      className="w-full rounded-xl border border-[#E5D4C3] bg-[#FFF8F0]/50 px-3.5 py-2.5 text-sm text-neutral-950 outline-none focus:border-[#FF6B35] dark:border-purple-800/50 dark:bg-[#171020] dark:text-white"
                    />
                    <input
                      type="tel"
                      required
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="Recipient phone number *"
                      className="w-full rounded-xl border border-[#E5D4C3] bg-[#FFF8F0]/50 px-3.5 py-2.5 text-sm text-neutral-950 outline-none focus:border-[#FF6B35] dark:border-purple-800/50 dark:bg-[#171020] dark:text-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    maxLength={280}
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    placeholder="Write a personal gift message to include with the box (optional)"
                    className="w-full rounded-xl border border-[#E5D4C3] bg-[#FFF8F0]/50 px-3.5 py-2.5 text-sm text-neutral-950 outline-none focus:border-[#FF6B35] dark:border-purple-800/50 dark:bg-[#171020] dark:text-white"
                  />
                </div>
              )}

              {/* Delivery details */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                      <MapPin className="size-3.5 text-[#FF6B35]" aria-hidden="true" />
                      City *
                    </label>
                    <select
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      className="w-full rounded-xl border border-[#E5D4C3] bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-[#6B21A8] dark:border-purple-800/50 dark:bg-[#22182F] dark:text-white"
                    >
                      {availableCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                      <Calendar className="size-3.5 text-[#FF6B35]" aria-hidden="true" />
                      Delivery Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().slice(0, 10)}
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full rounded-xl border border-[#E5D4C3] bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-[#6B21A8] dark:border-purple-800/50 dark:bg-[#22182F] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                      <Clock className="size-3.5 text-[#FF6B35]" aria-hidden="true" />
                      Time Slot *
                    </label>
                    <select
                      value={deliverySlot}
                      onChange={(e) => setDeliverySlot(e.target.value)}
                      className="w-full rounded-xl border border-[#E5D4C3] bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none focus:border-[#6B21A8] dark:border-purple-800/50 dark:bg-[#22182F] dark:text-white"
                    >
                      {MYSTERY_BOX_DELIVERY_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    Complete Delivery Address &amp; Landmark *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House / Flat no., Building, Street, Area, Pincode"
                    className="w-full rounded-xl border border-[#E5D4C3] bg-white px-3.5 py-2.5 text-sm text-neutral-950 outline-none focus:border-[#6B21A8] dark:border-purple-800/50 dark:bg-[#22182F] dark:text-white"
                  />
                </div>

                {/* Dietary preference */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EAD9C8] bg-white px-3.5 py-2.5 dark:border-purple-900/40 dark:bg-[#22182F]">
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    Dietary Preference
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDietaryPreference('eggless_only')}
                      className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-bold ${
                        dietaryPreference === 'eggless_only'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-purple-950/50 dark:text-neutral-300'
                      }`}
                    >
                      100% Eggless / Veg
                    </button>
                    <button
                      type="button"
                      onClick={() => setDietaryPreference('any')}
                      className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-bold ${
                        dietaryPreference === 'any'
                          ? 'bg-[#6B21A8] text-white'
                          : 'bg-neutral-100 text-neutral-600 dark:bg-purple-950/50 dark:text-neutral-300'
                      }`}
                    >
                      Chef’s Choice (Any)
                    </button>
                  </div>
                </div>
              </div>

              {/* Promo Coupon Code */}
              <div className="rounded-2xl border border-[#EAD9C8] bg-white p-4 dark:border-purple-900/40 dark:bg-[#22182F]">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200">
                  <Tag className="size-3.5 text-[#FF6B35]" aria-hidden="true" />
                  Promo Code (try UNWRAP100)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 rounded-xl border border-[#E5D4C3] bg-[#FFF8F0]/50 px-3.5 py-2 text-sm font-mono uppercase text-neutral-950 outline-none focus:border-[#6B21A8] dark:border-purple-800/50 dark:bg-[#171020] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponBusy || !couponInput.trim()}
                    className="cursor-pointer rounded-xl bg-[#6B21A8] px-4 py-2 text-xs font-bold text-white hover:bg-[#581C87] disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    {couponBusy ? 'Checking...' : 'Apply'}
                  </button>
                </div>
                {appliedCoupon && (
                  <p className="mt-2 flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <span>
                      {appliedCoupon.code} applied · You save {formatInr(appliedCoupon.discountInr)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponInput('');
                      }}
                      className="cursor-pointer underline"
                    >
                      Remove
                    </button>
                  </p>
                )}
                {couponError && (
                  <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                    {couponError}
                  </p>
                )}
              </div>

              {/* Price Summary */}
              <div className="rounded-2xl border border-[#EAD9C8] bg-white p-4 text-sm dark:border-purple-900/40 dark:bg-[#22182F]">
                <div className="flex justify-between text-neutral-700 dark:text-neutral-300">
                  <span>{pkg.name}</span>
                  <span className="font-semibold tabular-nums">{formatInr(pkg.priceInr)}</span>
                </div>
                <div className="mt-1.5 flex justify-between text-neutral-700 dark:text-neutral-300">
                  <span>Chilled-Safe Delivery Fee</span>
                  <span className="font-semibold tabular-nums">
                    {deliveryFeeInr === 0 ? 'FREE' : formatInr(deliveryFeeInr)}
                  </span>
                </div>
                {discountInr > 0 && (
                  <div className="mt-1.5 flex justify-between text-emerald-700 dark:text-emerald-300">
                    <span>Promo Discount ({appliedCoupon?.code})</span>
                    <span className="font-semibold tabular-nums">-{formatInr(discountInr)}</span>
                  </div>
                )}
                <div className="mt-3 flex justify-between border-t border-neutral-100 pt-3 text-base font-extrabold text-neutral-950 dark:border-purple-900/40 dark:text-white">
                  <span>Total Payable</span>
                  <span className="tabular-nums">{formatInr(grandTotalInr)}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-[#6B21A8] dark:text-purple-300">
                  Guaranteed minimum bakery retail value inside: {formatInr(pkg.guaranteedMinValueInr)}+
                </p>
              </div>

              {/* Allergen & Cancellation Policy */}
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#EAD9C8] bg-white p-3 text-xs text-neutral-600 dark:border-purple-900/40 dark:bg-[#22182F] dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={policyAccepted}
                  onChange={(e) => setPolicyAccepted(e.target.checked)}
                  className="mt-0.5 size-4 accent-[#6B21A8]"
                />
                <span>
                  I understand allergen notice ({pkg.allergenNotice}) and cancellation policy (
                  {pkg.cancellationPolicy}). Exact box contents will be locked for me before payment completes.
                </span>
              </label>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-3.5 text-sm font-extrabold tracking-wide text-white shadow-sm hover:bg-[#EA5822] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Reserving Your Surprise Box...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Reserve Box &amp; Proceed to Payment ({formatInr(grandTotalInr)})
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: SERVER-VERIFIED PAYMENT GATEWAY / UPI SESSION */
            <form onSubmit={handleVerifyPayment} className="space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/30">
                <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Box Reserved · Ref {session?.order.orderRef}
                </p>
                <p className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-200/90">
                  Your mystery goodies are already locked on our server. Complete online payment of{' '}
                  <strong>{formatInr(session?.order.totalPaidInr || grandTotalInr)}</strong> to immediately launch your interactive digital unboxing!
                </p>
              </div>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'upi' as const, label: 'UPI / QR', icon: Smartphone },
                  { id: 'card' as const, label: 'Card', icon: CreditCard },
                  { id: 'netbanking' as const, label: 'NetBanking', icon: ShieldCheck },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                      paymentMethod === id
                        ? 'border-[#6B21A8] bg-[#6B21A8] text-white'
                        : 'border-[#E5D4C3] bg-white text-neutral-700 dark:border-purple-800/50 dark:bg-[#22182F] dark:text-neutral-200'
                    }`}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>

              {/* UPI QR / Payment Instructions */}
              <div className="rounded-2xl border border-[#EAD9C8] bg-white p-5 dark:border-purple-900/40 dark:bg-[#22182F]">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  {upiQrDataUrl && (
                    <img
                      src={upiQrDataUrl}
                      alt="Scan UPI QR to pay"
                      className="size-36 shrink-0 rounded-xl border border-neutral-200 bg-white p-1.5"
                    />
                  )}
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6B21A8] dark:text-purple-300">
                      Pay {formatInr(session?.order.totalPaidInr || grandTotalInr)} via{' '}
                      {paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'card' ? 'Card Gateway' : 'NetBanking'}
                    </p>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                      Pay to <strong>{session?.upiMerchantName}</strong> ({session?.upiHandle}) using Google Pay, PhonePe, Paytm, or your bank app.
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          if (!session?.upiHandle) return;
                          void navigator.clipboard.writeText(session.upiHandle);
                          setCopiedUpi(true);
                          window.setTimeout(() => setCopiedUpi(false), 2000);
                        }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E5D4C3] px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 dark:border-purple-800/60 dark:text-purple-200"
                      >
                        {copiedUpi ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        {copiedUpi ? 'UPI ID Copied' : `Copy ${session?.upiHandle}`}
                      </button>
                      {session?.upiUri && (
                        <a
                          href={session.upiUri}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#6B21A8]/10 px-3 py-1.5 text-xs font-bold text-[#6B21A8] hover:bg-[#6B21A8]/15 dark:bg-purple-500/20 dark:text-purple-200"
                        >
                          Open UPI App
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Server-verified UTR / Payment Reference input */}
                <div className="mt-5 border-t border-neutral-100 pt-4 dark:border-purple-900/40">
                  <label className="mb-1.5 block text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    Transaction / UTR Reference Number *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={paymentRefInput}
                    onChange={(e) => setPaymentRefInput(e.target.value)}
                    placeholder="e.g. UTR432198765432 or Razorpay Pay ID"
                    className="w-full rounded-xl border border-[#E5D4C3] bg-[#FFF8F0]/50 px-3.5 py-2.5 font-mono text-sm text-neutral-950 outline-none focus:border-[#6B21A8] dark:border-purple-800/50 dark:bg-[#171020] dark:text-white"
                  />
                  <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                    Verified server-side with replay &amp; duplicate-order protection before unboxing unlocks.
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#6B21A8] py-3.5 text-sm font-extrabold text-white shadow-md hover:opacity-95 disabled:opacity-60"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Verifying Payment...
                    </>
                  ) : (
                    <>
                      <Gift className="size-4" aria-hidden="true" />
                      Verify Payment &amp; Unlock Unboxing
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReportPaymentFailure}
                  className="cursor-pointer rounded-xl border border-neutral-300 px-4 py-3 text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:border-purple-800/50 dark:text-neutral-300"
                >
                  Payment Failed?
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
