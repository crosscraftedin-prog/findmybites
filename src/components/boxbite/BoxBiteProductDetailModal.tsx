import { FormEvent, useEffect, useState } from 'react';
import {
  Check,
  Heart,
  Package,
  ShieldAlert,
  ShoppingBag,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { BOX_AND_BITE_CONFIG, formatInr } from '../../data/boxAndBiteConfig';
import {
  BoxBiteCartItem,
  CorporateBoxProduct,
  CorporateProductReview,
} from '../../data/boxAndBiteCatalog';
import { localizeProductNameForLocation } from '../../data/vendors';

interface BoxBiteProductDetailModalProps {
  product: CorporateBoxProduct | null;
  locationLabel?: string;
  isWishlisted: boolean;
  reviews: CorporateProductReview[];
  onClose: () => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (item: BoxBiteCartItem) => void;
  onSubmitReview: (review: Omit<CorporateProductReview, 'id' | 'createdAt'>) => void;
  onRequestBulkQuote: (product: CorporateBoxProduct) => void;
}

export function BoxBiteProductDetailModal({
  product,
  locationLabel,
  isWishlisted,
  reviews,
  onClose,
  onToggleWishlist,
  onAddToCart,
  onSubmitReview,
  onRequestBulkQuote,
}: BoxBiteProductDetailModalProps) {
  const { colors, ribbonOptions, sleeveFinishes } = BOX_AND_BITE_CONFIG;

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedTierId, setSelectedTierId] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Customisation options
  const [sleeveOption, setSleeveOption] = useState('Standard BOX & BITE Cream Wrap (No Logo)');
  const [ribbonId, setRibbonId] = useState(ribbonOptions[0]?.id || 'caramel-satin');
  const [includeWelcomeCard, setIncludeWelcomeCard] = useState(true);
  const [welcomeCardMessage, setWelcomeCardMessage] = useState('');

  // Disclosure tab
  const [disclosureTab, setDisclosureTab] = useState<'ingredients' | 'allergens' | 'delivery'>(
    'ingredients'
  );

  // Review submission state
  const [revName, setRevName] = useState('');
  const [revCompany, setRevCompany] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [revSubmitted, setRevSubmitted] = useState(false);

  const [imgFailed, setImgFailed] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!product) return;
    setActiveImageIdx(0);
    setSelectedVariantId(product.variants[0]?.id || '');
    setSelectedTierId(product.tiers[0]?.id || 'sample');
    setQuantity(product.tiers[0]?.minQty || 1);
    setSleeveOption(
      product.customisationSupported.logoBellySleeve
        ? 'Standard BOX & BITE Cream Wrap (No Logo)'
        : 'Not applicable'
    );
    setRibbonId(ribbonOptions[0]?.id || 'caramel-satin');
    setIncludeWelcomeCard(product.customisationSupported.printedWelcomeCard);
    setWelcomeCardMessage('');
    setDisclosureTab('ingredients');
    setImgFailed(false);
    setJustAdded(false);
    setRevSubmitted(false);
  }, [product, ribbonOptions]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [product, onClose]);

  if (!product) return null;

  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0];
  const activeTier = product.tiers.find((t) => t.id === selectedTierId) ?? product.tiers[0];
  const selectedRibbon = ribbonOptions.find((r) => r.id === ribbonId) ?? ribbonOptions[0];

  // Auto-resolve tier price based on selected quantity if user increments into a bulk tier
  const applicableTier =
    [...product.tiers]
      .sort((a, b) => b.minQty - a.minQty)
      .find((t) => quantity >= t.minQty) ?? activeTier;

  const unitPriceInr = Math.max(
    1,
    (applicableTier?.unitPriceInr ?? product.samplePriceInr) + (activeVariant?.priceDeltaInr ?? 0)
  );
  const lineTotalInr = unitPriceInr * quantity;
  const activeImage = product.gallery[activeImageIdx] || product.image;

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  const handleSelectTier = (tierId: string, minQty: number) => {
    setSelectedTierId(tierId);
    setQuantity(minQty);
  };

  const handleAdd = () => {
    const customParts: string[] = [];
    if (product.customisationSupported.logoBellySleeve) {
      customParts.push(sleeveOption);
    }
    if (product.customisationSupported.ribbonChoice && selectedRibbon) {
      customParts.push(`${selectedRibbon.label} Ribbon`);
    }
    if (product.customisationSupported.printedWelcomeCard && includeWelcomeCard) {
      customParts.push('Printed Welcome Card');
    }

    onAddToCart({
      cartItemId: `${product.id}__${activeVariant?.id || 'std'}__${ribbonId}__${sleeveOption.slice(0, 18)}__${welcomeCardMessage.trim().slice(0, 24)}`,
      kind: 'catalog',
      productId: product.id,
      title: product.name,
      subtitle: `${product.sku} · ${product.netWeightOrCount}`,
      image: product.image,
      unitPriceInr,
      quantity,
      variantLabel: activeVariant?.label,
      dietaryLabel:
        activeVariant?.dietary === 'non-veg' ? 'Non-Vegetarian' : 'Vegetarian',
      customisationSummary: customParts.join(' · '),
      customNote: welcomeCardMessage.trim() || undefined,
    });

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  };

  const handleReviewSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!revName.trim() || !revComment.trim()) return;
    onSubmitReview({
      productId: product.id,
      authorName: revName.trim(),
      companyAndRole: revCompany.trim() || 'Corporate Buyer',
      rating: revRating,
      comment: revComment.trim(),
    });
    setRevName('');
    setRevCompany('');
    setRevRating(5);
    setRevComment('');
    setRevSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto"
      style={{ backgroundColor: 'rgba(42, 25, 21, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-label={localizeProductNameForLocation(product.name, locationLabel)}
      onClick={onClose}
    >
      <div
        className="mx-auto my-4 max-w-6xl overflow-hidden rounded-2xl border shadow-2xl sm:my-8"
        style={{
          backgroundColor: colors.cream,
          borderColor: colors.hairline,
          color: colors.chocolate,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Utility Bar */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b px-5 py-3.5 backdrop-blur-md sm:px-8"
          style={{
            backgroundColor: 'rgba(255, 248, 239, 0.94)',
            borderColor: colors.hairline,
          }}
        >
          <div className="min-w-0 text-xs font-medium opacity-80">
            <span className="truncate">
              {product.categoryName} · {product.sku}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleWishlist(product.id)}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors whitespace-nowrap"
              style={{
                borderColor: colors.hairline,
                backgroundColor: isWishlisted ? colors.beige : '#FFFFFF',
                color: colors.chocolate,
              }}
            >
              <Heart
                className="size-3.5"
                style={{
                  color: isWishlisted ? colors.caramel : colors.chocolate,
                  fill: isWishlisted ? colors.caramel : 'none',
                }}
                aria-hidden="true"
              />
              {isWishlisted ? 'Saved' : 'Wishlist'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close product detail"
              className="grid size-9 cursor-pointer place-items-center rounded-lg border transition-colors"
              style={{
                borderColor: colors.hairline,
                backgroundColor: '#FFFFFF',
                color: colors.chocolate,
              }}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Sticky Left Gallery + Sticky Right Purchase Module */}
        <div className="grid grid-cols-1 gap-8 p-5 sm:p-8 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Imagery + Box Contents + Honest Disclosures */}
          <div className="space-y-6 lg:col-span-6 lg:sticky lg:top-20">
            <div
              className="overflow-hidden rounded-xl border"
              style={{ borderColor: colors.hairline, backgroundColor: colors.beige }}
            >
              <div className="aspect-[4/3] w-full overflow-hidden">
                {!imgFailed ? (
                  <img
                    src={activeImage}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                    <Package className="size-10 opacity-40" aria-hidden="true" />
                    <p className="mt-2 text-sm font-semibold">{product.name}</p>
                  </div>
                )}
              </div>
            </div>

            {product.gallery.length > 1 && (
              <div className="flex gap-3">
                {product.gallery.map((imgSrc, idx) => (
                  <button
                    key={imgSrc + idx}
                    type="button"
                    onClick={() => {
                      setActiveImageIdx(idx);
                      setImgFailed(false);
                    }}
                    className="h-16 w-24 cursor-pointer overflow-hidden rounded-lg border transition-all"
                    style={{
                      borderColor:
                        activeImageIdx === idx ? colors.chocolate : colors.hairline,
                      opacity: activeImageIdx === idx ? 1 : 0.7,
                    }}
                  >
                    <img
                      src={imgSrc}
                      alt={`${product.name} view ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* What Is Inside */}
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
            >
              <h3
                className="text-xl font-semibold"
                style={{ fontFamily: 'var(--font-editorial)' }}
              >
                Inside This Box
              </h3>
              <p className="mt-1 text-xs opacity-75">
                {product.servingsInfo} · {product.netWeightOrCount}
              </p>
              <ul className="mt-3.5 space-y-2 text-sm leading-relaxed">
                {product.contents.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check
                      className="mt-1 size-3.5 shrink-0"
                      style={{ color: colors.olive }}
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Honest Placeholder Disclosures */}
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
            >
              <div className="flex flex-wrap gap-1.5 border-b pb-3" style={{ borderColor: colors.hairline }}>
                {(
                  [
                    { id: 'ingredients', label: 'Ingredients (Sample)' },
                    { id: 'allergens', label: 'Allergen Disclosure' },
                    { id: 'delivery', label: 'Shelf Life & Delivery' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDisclosureTab(t.id)}
                    className="cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap"
                    style={{
                      backgroundColor:
                        disclosureTab === t.id ? colors.chocolate : colors.beige,
                      color: disclosureTab === t.id ? colors.cream : colors.chocolate,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {disclosureTab === 'ingredients' && (
                <div className="mt-3.5 space-y-2 text-xs leading-relaxed opacity-85">
                  <p>{product.disclosures.ingredientsPlaceholder}</p>
                </div>
              )}

              {disclosureTab === 'allergens' && (
                <div className="mt-3.5 space-y-2 text-xs leading-relaxed">
                  <div className="flex items-start gap-2">
                    <ShieldAlert
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: colors.caramel }}
                      aria-hidden="true"
                    />
                    <p>{product.disclosures.allergensPlaceholder}</p>
                  </div>
                </div>
              )}

              {disclosureTab === 'delivery' && (
                <div className="mt-3.5 space-y-2 text-xs leading-relaxed opacity-90">
                  <p>
                    <strong>Storage:</strong> {product.disclosures.shelfLifeAndStorage}
                  </p>
                  <p className="flex items-start gap-2">
                    <Truck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    <span>{product.disclosures.deliveryTimeline}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Contiguous Purchase & Customisation Module */}
          <div className="space-y-6 lg:col-span-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium opacity-80">
                <span>{product.categoryName}</span>
                <span aria-hidden="true">·</span>
                <span style={{ color: colors.olive, fontWeight: 700 }}>
                  {product.dietaryBadgeText}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Star
                    className="size-3.5"
                    style={{ color: colors.caramel, fill: colors.caramel }}
                    aria-hidden="true"
                  />
                  {avgRating} ({reviews.length})
                </span>
              </div>

              <h2
                className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
                style={{ fontFamily: 'var(--font-editorial)' }}
              >
                {localizeProductNameForLocation(product.name, locationLabel)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed opacity-80">{product.subtitle}</p>
              <p className="mt-3 text-sm leading-relaxed opacity-90">{product.description}</p>
            </div>

            {/* Pricing & MOQ Tier Selector */}
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-mono text-3xl font-semibold tabular-nums">
                    {formatInr(unitPriceInr)}
                  </span>
                  <span className="ml-1.5 text-xs opacity-70">per box (illustrative sample rate)</span>
                </div>
                <span className="text-xs font-medium" style={{ color: colors.olive }}>
                  {applicableTier?.label}
                </span>
              </div>

              <p className="mt-2 text-[11px] leading-snug opacity-70">
                {BOX_AND_BITE_CONFIG.samplePriceNotice}
              </p>

              {/* Volume / Pack Tiers */}
              <div className="mt-4">
                <p className="text-xs font-semibold tracking-wide opacity-75">
                  Select Pack / MOQ Tier
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {product.tiers.map((tier) => {
                    const active = applicableTier?.id === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => handleSelectTier(tier.id, tier.minQty)}
                        className="cursor-pointer rounded-lg border p-3 text-left transition-colors"
                        style={{
                          borderColor: active ? colors.chocolate : colors.hairline,
                          backgroundColor: active ? colors.beige : '#FFFFFF',
                        }}
                      >
                        <p className="text-xs font-semibold">{tier.label}</p>
                        <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                          {formatInr(tier.unitPriceInr + (activeVariant?.priceDeltaInr ?? 0))}
                        </p>
                        <p className="mt-0.5 text-[11px] opacity-70">{tier.note}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Variants (Veg / Non-Veg / Dietary Edits) */}
              {product.variants.length > 0 && (
                <div className="mt-5 border-t pt-4" style={{ borderColor: colors.hairline }}>
                  <p className="text-xs font-semibold tracking-wide opacity-75">
                    Select Box Variant
                  </p>
                  <div className="mt-2 space-y-2">
                    {product.variants.map((variant) => {
                      const active = activeVariant?.id === variant.id;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => setSelectedVariantId(variant.id)}
                          className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors"
                          style={{
                            borderColor: active ? colors.chocolate : colors.hairline,
                            backgroundColor: active ? colors.beige : '#FFFFFF',
                          }}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold">
                              <span
                                className="mr-2 inline-block size-2 rounded-xs align-middle"
                                style={{
                                  backgroundColor:
                                    variant.dietary === 'veg' ? colors.olive : '#9B3B2B',
                                }}
                                aria-hidden="true"
                              />
                              {variant.label}
                            </p>
                            <p className="mt-0.5 text-[11px] opacity-75">
                              {variant.contentsNote}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-xs font-semibold tabular-nums">
                            {variant.priceDeltaInr > 0
                              ? `+${formatInr(variant.priceDeltaInr)}`
                              : 'Included'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Customisation Options */}
              <div className="mt-5 space-y-4 border-t pt-4" style={{ borderColor: colors.hairline }}>
                <p className="text-xs font-semibold tracking-wide opacity-75">
                  Corporate Customisation
                </p>

                {product.customisationSupported.logoBellySleeve && (
                  <div>
                    <label
                      htmlFor="pdp-sleeve"
                      className="block text-xs font-medium opacity-85"
                    >
                      Logo Belly Sleeve Option (Foil stamping from {product.customisationSupported.foilStampingMinQty}+ boxes)
                    </label>
                    <select
                      id="pdp-sleeve"
                      value={sleeveOption}
                      onChange={(e) => setSleeveOption(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border px-3 py-2 text-xs font-medium focus:outline-none"
                      style={{
                        borderColor: colors.hairline,
                        backgroundColor: colors.cream,
                        color: colors.chocolate,
                      }}
                    >
                      <option value="Standard BOX & BITE Cream Wrap (No Logo)">
                        Standard BOX &amp; BITE Cream Wrap (Sample Ready)
                      </option>
                      {sleeveFinishes.map((finish) => (
                        <option key={finish} value={finish}>
                          {finish}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {product.customisationSupported.ribbonChoice && (
                  <div>
                    <p className="text-xs font-medium opacity-85">Satin Ribbon Colour</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {ribbonOptions.map((rib) => {
                        const active = rib.id === ribbonId;
                        return (
                          <button
                            key={rib.id}
                            type="button"
                            onClick={() => setRibbonId(rib.id)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                            style={{
                              borderColor: active ? colors.chocolate : colors.hairline,
                              backgroundColor: active ? colors.beige : '#FFFFFF',
                            }}
                          >
                            <span
                              className="size-3 rounded-full border border-black/15"
                              style={{ backgroundColor: rib.hex }}
                              aria-hidden="true"
                            />
                            {rib.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {product.customisationSupported.printedWelcomeCard && (
                  <div>
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={includeWelcomeCard}
                        onChange={(e) => setIncludeWelcomeCard(e.target.checked)}
                        className="size-4"
                        style={{ accentColor: colors.chocolate }}
                      />
                      Include custom printed welcome / milestone card
                    </label>
                    {includeWelcomeCard && (
                      <textarea
                        rows={2}
                        value={welcomeCardMessage}
                        onChange={(e) => setWelcomeCardMessage(e.target.value)}
                        placeholder="Optional message to print on your sample welcome card..."
                        className="mt-2 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                        style={{
                          borderColor: colors.hairline,
                          backgroundColor: colors.cream,
                          color: colors.chocolate,
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Quantity & Primary Action */}
              <div className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center" style={{ borderColor: colors.hairline }}>
                <div
                  className="inline-flex items-center rounded-lg border"
                  style={{ borderColor: colors.hairline, backgroundColor: colors.cream }}
                >
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="cursor-pointer px-3 py-2 text-sm font-semibold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))
                    }
                    aria-label="Box quantity"
                    className="w-14 bg-transparent text-center font-mono text-sm font-semibold tabular-nums focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(1000, q + 1))}
                    aria-label="Increase quantity"
                    className="cursor-pointer px-3 py-2 text-sm font-semibold"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs font-semibold tracking-wide transition-colors whitespace-nowrap"
                  style={{
                    backgroundColor: justAdded ? colors.olive : colors.chocolate,
                    color: colors.cream,
                  }}
                >
                  {justAdded ? (
                    <>
                      <Check className="size-4" aria-hidden="true" />
                      Added to Bag ({formatInr(lineTotalInr)})
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="size-4" aria-hidden="true" />
                      Add to Sample Bag · {formatInr(lineTotalInr)}
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestBulkQuote(product);
                }}
                className="mt-2.5 w-full cursor-pointer rounded-lg border px-4 py-2.5 text-xs font-semibold transition-colors"
                style={{
                  borderColor: colors.chocolate,
                  color: colors.chocolate,
                  backgroundColor: 'transparent',
                }}
              >
                Need 10+ Branded Boxes? Request Formal Corporate Quote ({product.sku})
              </button>
            </div>

            {/* Customer Reviews & Feedback Submission */}
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
            >
              <div className="flex items-center justify-between gap-2">
                <h3
                  className="text-xl font-semibold"
                  style={{ fontFamily: 'var(--font-editorial)' }}
                >
                  Corporate Buyer Reviews ({reviews.length})
                </h3>
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {avgRating} / 5.0
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-xs opacity-70">
                    Be the first team to leave feedback on this corporate box.
                  </p>
                ) : (
                  reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="border-t pt-3 first:border-t-0 first:pt-0"
                      style={{ borderColor: colors.hairline }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold">
                          {rev.authorName}{' '}
                          <span className="font-normal opacity-70">· {rev.companyAndRole}</span>
                        </p>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className="size-3"
                              style={{
                                color: colors.caramel,
                                fill: n <= rev.rating ? colors.caramel : 'none',
                              }}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed opacity-85">{rev.comment}</p>
                      <p className="mt-1 text-[10px] opacity-55">{rev.createdAt}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Leave a Review Form */}
              <form
                onSubmit={handleReviewSubmit}
                className="mt-5 space-y-3 border-t pt-4"
                style={{ borderColor: colors.hairline }}
              >
                <p className="text-xs font-semibold">Leave Box Review</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    value={revName}
                    onChange={(e) => setRevName(e.target.value)}
                    placeholder="Your Name"
                    className="rounded-lg border px-3 py-2 text-xs focus:outline-none"
                    style={{
                      borderColor: colors.hairline,
                      backgroundColor: colors.cream,
                      color: colors.chocolate,
                    }}
                  />
                  <input
                    type="text"
                    value={revCompany}
                    onChange={(e) => setRevCompany(e.target.value)}
                    placeholder="Company & Role (optional)"
                    className="rounded-lg border px-3 py-2 text-xs focus:outline-none"
                    style={{
                      borderColor: colors.hairline,
                      backgroundColor: colors.cream,
                      color: colors.chocolate,
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">Rating:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRevRating(n)}
                        aria-label={`Rate ${n} stars`}
                        className="cursor-pointer p-0.5"
                      >
                        <Star
                          className="size-4"
                          style={{
                            color: colors.caramel,
                            fill: n <= revRating ? colors.caramel : 'none',
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  required
                  value={revComment}
                  onChange={(e) => setRevComment(e.target.value)}
                  placeholder="Share packaging, freshness, or delivery experience..."
                  className="w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                  style={{
                    borderColor: colors.hairline,
                    backgroundColor: colors.cream,
                    color: colors.chocolate,
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  {revSubmitted ? (
                    <span className="text-xs font-semibold" style={{ color: colors.olive }}>
                      Review added — thank you for sharing feedback.
                    </span>
                  ) : (
                    <span className="text-[11px] opacity-60">Visible immediately on this product</span>
                  )}
                  <button
                    type="submit"
                    className="cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors"
                    style={{ backgroundColor: colors.chocolate, color: colors.cream }}
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
