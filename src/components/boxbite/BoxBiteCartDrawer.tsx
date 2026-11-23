import { FormEvent, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { BOX_AND_BITE_CONFIG, formatInr } from '../../data/boxAndBiteConfig';
import {
  BoxBiteCartItem,
  BoxBiteSampleOrder,
  CorporateBoxProduct,
} from '../../data/boxAndBiteCatalog';

interface BoxBiteCartDrawerProps {
  open: boolean;
  initialTab?: 'bag' | 'wishlist';
  cartItems: BoxBiteCartItem[];
  wishlistProducts: CorporateBoxProduct[];
  sampleOrders: BoxBiteSampleOrder[];
  onClose: () => void;
  onUpdateQty: (cartItemId: string, nextQty: number) => void;
  onRemoveCartItem: (cartItemId: string) => void;
  onToggleWishlist: (productId: string) => void;
  onOpenProduct: (product: CorporateBoxProduct) => void;
  onPlaceSampleOrder: (order: BoxBiteSampleOrder) => void;
}

export function BoxBiteCartDrawer({
  open,
  initialTab = 'bag',
  cartItems,
  wishlistProducts,
  sampleOrders,
  onClose,
  onUpdateQty,
  onRemoveCartItem,
  onToggleWishlist,
  onOpenProduct,
  onPlaceSampleOrder,
}: BoxBiteCartDrawerProps) {
  const { colors, promoCodes, shipping, paymentGatewayNotice } = BOX_AND_BITE_CONFIG;

  const [tab, setTab] = useState<'bag' | 'wishlist'>(initialTab);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Mobile-first sample checkout form state
  const [companyOrRecipient, setCompanyOrRecipient] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [cityPincode, setCityPincode] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<BoxBiteSampleOrder | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setCheckoutError(null);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const subtotalInr = cartItems.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0);
  const totalBoxesCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const matchedPromo = appliedPromoCode
    ? promoCodes.find((p) => p.code.toUpperCase() === appliedPromoCode.toUpperCase())
    : undefined;

  const promoEligible = matchedPromo && subtotalInr >= matchedPromo.minSubtotalInr;
  const discountInr = promoEligible
    ? matchedPromo.type === 'percent'
      ? Math.round((subtotalInr * matchedPromo.value) / 100)
      : matchedPromo.value
    : 0;

  const afterDiscountInr = Math.max(0, subtotalInr - discountInr);
  const shippingEstimateInr =
    subtotalInr === 0 || afterDiscountInr >= shipping.freeShippingThresholdInr
      ? 0
      : shipping.sampleFlatInr;
  const grandTotalInr = afterDiscountInr + shippingEstimateInr;

  const handleApplyPromo = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = promoInput.trim().toUpperCase();
    if (!cleaned) return;
    const found = promoCodes.find((p) => p.code.toUpperCase() === cleaned);
    if (!found) {
      setAppliedPromoCode(null);
      setPromoFeedback('Code not recognised. Try BITE10, CORP15, or WELCOME500.');
      return;
    }
    if (subtotalInr < found.minSubtotalInr) {
      setAppliedPromoCode(null);
      setPromoFeedback(
        `${found.code} applies on sample subtotals of ${formatInr(found.minSubtotalInr)} or more.`
      );
      return;
    }
    setAppliedPromoCode(found.code);
    setPromoFeedback(`Applied ${found.code} (${found.label}).`);
  };

  const handleCheckoutSubmit = (e: FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    if (cartItems.length === 0) return;

    if (!contactName.trim() || !email.trim() || phone.replace(/\D/g, '').length < 10) {
      setCheckoutError('Please provide Contact Name, Email, and a 10+ digit Phone number.');
      return;
    }
    if (!deliveryAddress.trim() || !cityPincode.trim()) {
      setCheckoutError('Please enter your delivery street address and City / PIN code.');
      return;
    }

    const order: BoxBiteSampleOrder = {
      id: `order-${Date.now()}`,
      orderNumber: `BB-SMP-${Math.floor(1000 + Math.random() * 9000)}`,
      companyOrRecipient: companyOrRecipient.trim() || contactName.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      cityPincode: cityPincode.trim(),
      items: [...cartItems],
      subtotalInr,
      discountInr,
      promoCode: promoEligible ? matchedPromo.code : undefined,
      shippingEstimateInr,
      totalInr: grandTotalInr,
      paymentStatus: 'Demo Order (No Live Payment Gateway Connected)',
      createdAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    onPlaceSampleOrder(order);
    setConfirmedOrder(order);
    setCheckoutOpen(false);
    setAppliedPromoCode(null);
    setPromoInput('');
    setPromoFeedback(null);
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex justify-end"
      style={{ backgroundColor: 'rgba(42, 25, 21, 0.65)' }}
      role="dialog"
      aria-modal="true"
      aria-label="BOX & BITE Bag and Wishlist"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l shadow-2xl"
        style={{
          backgroundColor: colors.cream,
          borderColor: colors.hairline,
          color: colors.chocolate,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: colors.hairline }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4" aria-hidden="true" />
            <h2
              className="text-2xl font-semibold"
              style={{ fontFamily: 'var(--font-editorial)' }}
            >
              Sample Bag &amp; Saved
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bag drawer"
            className="grid size-8 cursor-pointer place-items-center rounded-lg border"
            style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Bag / Wishlist Switcher */}
        <div
          className="grid grid-cols-2 gap-1 border-b p-2"
          style={{ borderColor: colors.hairline, backgroundColor: colors.beige }}
        >
          <button
            type="button"
            onClick={() => setTab('bag')}
            className="cursor-pointer rounded-md py-2 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: tab === 'bag' ? colors.cream : 'transparent',
              color: colors.chocolate,
            }}
          >
            Sample Bag ({totalBoxesCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('wishlist')}
            className="cursor-pointer rounded-md py-2 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: tab === 'wishlist' ? colors.cream : 'transparent',
              color: colors.chocolate,
            }}
          >
            Wishlist ({wishlistProducts.length})
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'bag' && confirmedOrder && cartItems.length === 0 && (
            <div
              className="mb-5 space-y-3 rounded-xl border p-4 text-xs"
              style={{ borderColor: colors.olive, backgroundColor: colors.oliveSoft }}
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0"
                  style={{ color: colors.olive }}
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold" style={{ color: colors.olive }}>
                    Sample Order Logged · {confirmedOrder.orderNumber}
                  </p>
                  <p className="mt-1 leading-relaxed opacity-85">
                    Reserved for <strong>{confirmedOrder.companyOrRecipient}</strong> (
                    {formatInr(confirmedOrder.totalInr)} illustrative total).
                  </p>
                  <p className="mt-1.5 text-[11px] opacity-75">
                    {confirmedOrder.paymentStatus}. Our gifting desk confirms dispatch schedules
                    before billing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === 'bag' ? (
            cartItems.length === 0 ? (
              <div className="space-y-6 py-8 text-center">
                <p className="text-sm opacity-75">Your sample bag is empty.</p>
                {sampleOrders.length > 0 && (
                  <div
                    className="space-y-2 rounded-xl border p-4 text-left text-xs"
                    style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
                  >
                    <p className="font-semibold uppercase tracking-wider opacity-70">
                      Recent Sample Orders ({sampleOrders.length})
                    </p>
                    {sampleOrders.slice(0, 3).map((ord) => (
                      <div
                        key={ord.id}
                        className="flex items-center justify-between border-t pt-2"
                        style={{ borderColor: colors.hairline }}
                      >
                        <div>
                          <p className="font-mono font-semibold">{ord.orderNumber}</p>
                          <p className="opacity-70">{ord.companyOrRecipient}</p>
                        </div>
                        <span className="font-mono font-semibold tabular-nums">
                          {formatInr(ord.totalInr)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex gap-3 rounded-xl border p-3.5"
                    style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="size-16 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold leading-snug">{item.title}</p>
                        <button
                          type="button"
                          onClick={() => onRemoveCartItem(item.cartItemId)}
                          aria-label={`Remove ${item.title}`}
                          className="cursor-pointer opacity-60 hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-[11px] opacity-70">
                        {item.variantLabel || item.dietaryLabel}
                      </p>
                      {item.customisationSummary && (
                        <p className="mt-1 text-[11px] opacity-80">{item.customisationSummary}</p>
                      )}
                      {item.customNote && (
                        <p className="mt-1 italic text-[11px] opacity-70">
                          Note: &ldquo;{item.customNote}&rdquo;
                        </p>
                      )}

                      <div className="mt-2.5 flex items-center justify-between">
                        <div
                          className="inline-flex items-center rounded-md border"
                          style={{ borderColor: colors.hairline }}
                        >
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.cartItemId, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="cursor-pointer px-2 py-1"
                          >
                            <Minus className="size-3" aria-hidden="true" />
                          </button>
                          <span className="w-7 text-center font-mono text-xs font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.cartItemId, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="cursor-pointer px-2 py-1"
                          >
                            <Plus className="size-3" aria-hidden="true" />
                          </button>
                        </div>

                        <span className="font-mono text-xs font-semibold tabular-nums">
                          {formatInr(item.unitPriceInr * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Promo Code Bar */}
                <form
                  onSubmit={handleApplyPromo}
                  className="rounded-xl border p-3.5"
                  style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
                >
                  <label htmlFor="bb-promo-code" className="flex items-center gap-1.5 text-xs font-semibold">
                    <Tag className="size-3.5" aria-hidden="true" />
                    Promo Code (try BITE10 or CORP15)
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="bb-promo-code"
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Enter code"
                      className="flex-1 rounded-lg border px-3 py-1.5 font-mono text-xs uppercase focus:outline-none"
                      style={{
                        borderColor: colors.hairline,
                        backgroundColor: colors.cream,
                        color: colors.chocolate,
                      }}
                    />
                    <button
                      type="submit"
                      className="cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold"
                      style={{ backgroundColor: colors.chocolate, color: colors.cream }}
                    >
                      Apply
                    </button>
                  </div>
                  {promoFeedback && (
                    <p
                      className="mt-1.5 text-[11px] font-medium"
                      style={{ color: promoEligible ? colors.olive : '#9B3B2B' }}
                    >
                      {promoFeedback}
                    </p>
                  )}
                </form>

                {/* Mobile-first Sample Order Checkout Form */}
                {checkoutOpen && (
                  <form
                    onSubmit={handleCheckoutSubmit}
                    className="space-y-3 rounded-xl border p-4"
                    style={{ borderColor: colors.chocolate, backgroundColor: '#FFFFFF' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider">
                      Sample Dispatch Details
                    </p>
                    <p
                      className="rounded-lg border p-2.5 text-[11px] leading-snug"
                      style={{ borderColor: colors.caramel, backgroundColor: colors.beige }}
                    >
                      {paymentGatewayNotice}
                    </p>

                    {checkoutError && (
                      <p className="text-[11px] font-semibold text-[#9B3B2B]">{checkoutError}</p>
                    )}

                    <input
                      type="text"
                      value={companyOrRecipient}
                      onChange={(e) => setCompanyOrRecipient(e.target.value)}
                      placeholder="Company Name (optional)"
                      className="w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                      style={{ borderColor: colors.hairline, backgroundColor: colors.cream }}
                    />
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Recipient / Contact Name *"
                      className="w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                      style={{ borderColor: colors.hairline, backgroundColor: colors.cream }}
                    />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Work Email *"
                        className="w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                        style={{ borderColor: colors.hairline, backgroundColor: colors.cream }}
                      />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone / WhatsApp *"
                        className="w-full rounded-lg border px-3 py-2 font-mono text-xs focus:outline-none"
                        style={{ borderColor: colors.hairline, backgroundColor: colors.cream }}
                      />
                    </div>
                    <textarea
                      rows={2}
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Office / Delivery Address *"
                      className="w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                      style={{ borderColor: colors.hairline, backgroundColor: colors.cream }}
                    />
                    <input
                      type="text"
                      required
                      value={cityPincode}
                      onChange={(e) => setCityPincode(e.target.value)}
                      placeholder="City & PIN Code (e.g. Bengaluru 560001) *"
                      className="w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                      style={{ borderColor: colors.hairline, backgroundColor: colors.cream }}
                    />
                    <button
                      type="submit"
                      className="w-full cursor-pointer rounded-lg px-4 py-2.5 text-xs font-semibold"
                      style={{ backgroundColor: colors.chocolate, color: colors.cream }}
                    >
                      Place Sample Order Request · {formatInr(grandTotalInr)}
                    </button>
                  </form>
                )}
              </div>
            )
          ) : wishlistProducts.length === 0 ? (
            <p className="py-10 text-center text-sm opacity-75">
              No saved boxes yet. Click the heart icon on any collection card to shortlist boxes for
              team review.
            </p>
          ) : (
            <div className="space-y-3">
              {wishlistProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                  style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
                >
                  <img
                    src={prod.image}
                    alt={prod.name}
                    referrerPolicy="no-referrer"
                    className="size-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{prod.name}</p>
                    <p className="mt-0.5 font-mono text-xs tabular-nums opacity-75">
                      Sample {formatInr(prod.samplePriceInr)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenProduct(prod);
                        }}
                        className="cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold"
                        style={{ backgroundColor: colors.chocolate, color: colors.cream }}
                      >
                        View Box
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleWishlist(prod.id)}
                        className="inline-flex cursor-pointer items-center gap-1 text-[11px] underline opacity-70 hover:opacity-100"
                      >
                        <Heart className="size-3" aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Totals & Checkout Trigger */}
        {tab === 'bag' && cartItems.length > 0 && (
          <div
            className="space-y-2.5 border-t p-5 text-xs"
            style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
          >
            <div className="flex justify-between">
              <span className="opacity-75">Illustrative Subtotal</span>
              <span className="font-mono font-semibold tabular-nums">{formatInr(subtotalInr)}</span>
            </div>
            {discountInr > 0 && (
              <div className="flex justify-between" style={{ color: colors.olive }}>
                <span>Promo ({matchedPromo?.code})</span>
                <span className="font-mono font-semibold tabular-nums">
                  −{formatInr(discountInr)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="opacity-75">
                Shipping Estimate (Free above {formatInr(shipping.freeShippingThresholdInr)})
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {shippingEstimateInr === 0 ? 'Free' : formatInr(shippingEstimateInr)}
              </span>
            </div>
            <div
              className="flex items-baseline justify-between border-t pt-2.5"
              style={{ borderColor: colors.hairline }}
            >
              <span className="text-sm font-semibold">Estimated Total</span>
              <span className="font-mono text-lg font-semibold tabular-nums">
                {formatInr(grandTotalInr)}
              </span>
            </div>
            <p className="text-[11px] opacity-65">
              {paymentGatewayNotice}
            </p>
            {!checkoutOpen && (
              <button
                type="button"
                onClick={() => setCheckoutOpen(true)}
                className="w-full cursor-pointer rounded-lg px-5 py-3 text-xs font-semibold tracking-wide"
                style={{ backgroundColor: colors.chocolate, color: colors.cream }}
              >
                Proceed to Sample Checkout
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
