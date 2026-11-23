import { useMemo, useState } from 'react';
import { Check, Minus, Plus, RotateCcw, ShoppingBag } from 'lucide-react';
import { BOX_AND_BITE_CONFIG, formatInr } from '../../data/boxAndBiteConfig';
import {
  BOXBITE_IMAGES,
  BOX_BUILDER_ITEMS,
  BOX_BUILDER_SIZES,
  BoxBiteCartItem,
  BoxBuilderItem,
  BoxBuilderItemGroup,
} from '../../data/boxAndBiteCatalog';

interface BoxBiteBuilderSectionProps {
  builderItems?: BoxBuilderItem[];
  onAddCustomBoxToCart: (item: BoxBiteCartItem) => void;
  onRequestQuoteForCustomBox: (snapshotText: string) => void;
}

const ITEM_GROUPS: BoxBuilderItemGroup[] = [
  'Roasted Nuts',
  'Snacks & Savouries',
  'Artisanal Chocolates',
  'Cookies & Brownies',
  'Beverages',
];

export function BoxBiteBuilderSection({
  builderItems,
  onAddCustomBoxToCart,
  onRequestQuoteForCustomBox,
}: BoxBiteBuilderSectionProps) {
  const { colors, greetingCardStyles, ribbonOptions } = BOX_AND_BITE_CONFIG;
  const catalogItems = builderItems && builderItems.length > 0 ? builderItems : BOX_BUILDER_ITEMS;

  const [sizeId, setSizeId] = useState<'petite-4' | 'signature-6' | 'grand-9'>('signature-6');
  const [selectedItemCounts, setSelectedItemCounts] = useState<Record<string, number>>({
    'bb-item-cashews': 1,
    'bb-item-bonbons': 1,
    'bb-item-chai-cookies': 1,
  });
  const [activeGroup, setActiveGroup] = useState<'All' | BoxBuilderItemGroup>('All');
  const [cardStyleId, setCardStyleId] = useState(greetingCardStyles[0].id);
  const [ribbonId, setRibbonId] = useState(ribbonOptions[0].id);
  const [companySenderName, setCompanySenderName] = useState('');
  const [welcomeNote, setWelcomeNote] = useState(
    'Wishing you warmth, energy, and great beginnings with our team.'
  );
  const [capacityWarning, setCapacityWarning] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  const selectedSize =
    BOX_BUILDER_SIZES.find((s) => s.id === sizeId) ?? BOX_BUILDER_SIZES[1];
  const selectedCardStyle =
    greetingCardStyles.find((c) => c.id === cardStyleId) ?? greetingCardStyles[0];
  const selectedRibbon = ribbonOptions.find((r) => r.id === ribbonId) ?? ribbonOptions[0];

  const totalPickedCount = useMemo(
    () => Object.values(selectedItemCounts).reduce((sum, n) => sum + n, 0),
    [selectedItemCounts]
  );

  const pickedItemsList = useMemo(() => {
    return catalogItems
      .filter((item) => (selectedItemCounts[item.id] || 0) > 0)
      .map((item) => ({
        item,
        qty: selectedItemCounts[item.id] || 0,
      }));
  }, [catalogItems, selectedItemCounts]);

  const itemsTotalInr = useMemo(
    () => pickedItemsList.reduce((sum, entry) => sum + entry.item.priceInr * entry.qty, 0),
    [pickedItemsList]
  );

  const perBoxTotalInr = selectedSize.boxBaseInr + itemsTotalInr;
  const remainingSlots = Math.max(0, selectedSize.capacity - totalPickedCount);

  const handleSizeChange = (nextSizeId: 'petite-4' | 'signature-6' | 'grand-9') => {
    const nextSize = BOX_BUILDER_SIZES.find((s) => s.id === nextSizeId);
    if (!nextSize) return;
    setSizeId(nextSizeId);
    setCapacityWarning(null);

    // Trim excess items cleanly if shrinking box capacity
    if (totalPickedCount > nextSize.capacity) {
      let running = 0;
      const trimmed: Record<string, number> = {};
      for (const entry of pickedItemsList) {
        const allow = Math.min(entry.qty, nextSize.capacity - running);
        if (allow > 0) {
          trimmed[entry.item.id] = allow;
          running += allow;
        }
      }
      setSelectedItemCounts(trimmed);
      setCapacityWarning(
        `Adjusted selection to fit ${nextSize.name} (${nextSize.capacity} slots).`
      );
    }
  };

  const handleIncrementItem = (itemId: string) => {
    const item = catalogItems.find((i) => i.id === itemId);
    if (!item || !item.available) return;
    if (totalPickedCount >= selectedSize.capacity) {
      setCapacityWarning(
        `${selectedSize.name} holds up to ${selectedSize.capacity} items. Remove an item or upgrade to a larger box.`
      );
      return;
    }
    setCapacityWarning(null);
    setSelectedItemCounts((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const handleDecrementItem = (itemId: string) => {
    setCapacityWarning(null);
    setSelectedItemCounts((prev) => {
      const current = prev[itemId] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: current - 1 };
    });
  };

  const handleReset = () => {
    setSelectedItemCounts({});
    setCapacityWarning(null);
  };

  const buildSnapshotSummary = () => {
    const listText = pickedItemsList.map((e) => `${e.qty}× ${e.item.name}`).join(', ');
    return `${selectedSize.name} (${totalPickedCount}/${selectedSize.capacity} items: ${listText}) · ${selectedCardStyle.name} · ${selectedRibbon.label} Ribbon · Illustrative ${formatInr(perBoxTotalInr)}/box`;
  };

  const handleAddSampleBox = () => {
    if (totalPickedCount === 0) {
      setCapacityWarning('Select at least 1 item to compose your corporate box.');
      return;
    }
    const itemsList = pickedItemsList.map((e) => `${e.qty}× ${e.item.name}`).join(', ');
    onAddCustomBoxToCart({
      cartItemId: `custom-${sizeId}-${Date.now()}`,
      kind: 'custom-box',
      productId: `custom-${sizeId}`,
      title: `Custom ${selectedSize.name}`,
      subtitle: itemsList,
      image: BOXBITE_IMAGES.heroEditorial,
      unitPriceInr: perBoxTotalInr,
      quantity: 1,
      variantLabel: `${totalPickedCount}/${selectedSize.capacity} slots filled`,
      dietaryLabel: '100% Vegetarian',
      customisationSummary: `${selectedCardStyle.name} · ${selectedRibbon.label} Ribbon`,
      customNote: `${companySenderName.trim() ? `[From ${companySenderName.trim()}] ` : ''}${welcomeNote.trim()}`,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  };

  const visibleItems =
    activeGroup === 'All'
      ? catalogItems
      : catalogItems.filter((item) => item.group === activeGroup);

  return (
    <section
      id="boxbite-builder"
      className="border-t py-16 sm:py-20"
      style={{
        backgroundColor: colors.beige,
        borderColor: colors.hairline,
        color: colors.chocolate,
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b pb-8 lg:flex-row lg:items-end" style={{ borderColor: colors.hairline }}>
          <div className="max-w-2xl">
            <p
              className="text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: colors.olive }}
            >
              Interactive Box Configurator
            </p>
            <h2
              className="mt-2 text-3xl font-semibold leading-tight sm:text-5xl"
              style={{ fontFamily: 'var(--font-editorial)' }}
            >
              Build Your Own Corporate Box
            </h2>
            <p className="mt-3 text-sm leading-relaxed opacity-85 sm:text-base">
              Choose a rigid box size, pair Indian snacks, roasted nuts, chocolates, cookies, and
              beverages, preview your welcome stationery card, and add a sample box directly to your
              bag.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors lg:self-auto"
            style={{
              borderColor: colors.hairline,
              backgroundColor: colors.cream,
              color: colors.chocolate,
            }}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Clear Selection
          </button>
        </div>

        {/* Step 1: Pick Box Size */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
            01. Choose Box Size
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            {BOX_BUILDER_SIZES.map((size) => {
              const active = size.id === sizeId;
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => handleSizeChange(size.id)}
                  className="cursor-pointer rounded-xl border p-5 text-left transition-all"
                  style={{
                    borderColor: active ? colors.chocolate : colors.hairline,
                    backgroundColor: active ? colors.cream : 'rgba(255, 248, 239, 0.55)',
                    boxShadow: active ? '0 10px 25px -12px rgba(56,35,30,0.22)' : 'none',
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="text-xl font-semibold"
                      style={{ fontFamily: 'var(--font-editorial)' }}
                    >
                      {size.name}
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {formatInr(size.boxBaseInr)} box
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium" style={{ color: colors.olive }}>
                    Up to {size.capacity} items · {size.dimensions}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed opacity-75">{size.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Split: Item Selection Left + Live Box & Card Preview Right */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Step 2: Select Food & Beverage Items */}
          <div className="space-y-4 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
                02. Pick Items ({totalPickedCount} / {selectedSize.capacity} Filled)
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(['All', ...ITEM_GROUPS] as const).map((group) => {
                  const active = activeGroup === group;
                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setActiveGroup(group)}
                      className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap"
                      style={{
                        backgroundColor: active ? colors.chocolate : colors.cream,
                        color: active ? colors.cream : colors.chocolate,
                      }}
                    >
                      {group}
                    </button>
                  );
                })}
              </div>
            </div>

            {capacityWarning && (
              <div
                role="alert"
                className="rounded-lg border px-4 py-2.5 text-xs font-medium"
                style={{
                  borderColor: colors.caramel,
                  backgroundColor: colors.cream,
                  color: colors.chocolate,
                }}
              >
                {capacityWarning}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visibleItems.map((item) => {
                const qty = selectedItemCounts[item.id] || 0;
                const canAddMore = item.available && totalPickedCount < selectedSize.capacity;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-xl border p-4 transition-colors"
                    style={{
                      borderColor: qty > 0 ? colors.chocolate : colors.hairline,
                      backgroundColor: item.available ? colors.cream : 'rgba(255,248,239,0.45)',
                      opacity: item.available ? 1 : 0.65,
                    }}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 text-[11px]">
                        <span className="font-medium opacity-70">
                          {item.group} · {item.portion}
                        </span>
                        <span
                          className="font-semibold"
                          style={{ color: item.available ? colors.olive : '#8B4A3B' }}
                        >
                          {item.available ? 'Veg' : item.unavailableReason || 'Unavailable'}
                        </span>
                      </div>
                      <h4 className="mt-1.5 text-sm font-semibold leading-snug">{item.name}</h4>
                      <p className="mt-1 text-xs opacity-75">{item.note}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3" style={{ borderColor: colors.hairline }}>
                      <span className="font-mono text-sm font-semibold tabular-nums">
                        {formatInr(item.priceInr)}
                      </span>

                      {!item.available ? (
                        <span className="text-[11px] font-medium opacity-75">
                          Currently Out of Stock
                        </span>
                      ) : qty > 0 ? (
                        <div
                          className="inline-flex items-center rounded-md border"
                          style={{ borderColor: colors.chocolate }}
                        >
                          <button
                            type="button"
                            onClick={() => handleDecrementItem(item.id)}
                            aria-label={`Remove ${item.name}`}
                            className="cursor-pointer p-1.5"
                          >
                            <Minus className="size-3.5" aria-hidden="true" />
                          </button>
                          <span className="w-7 text-center font-mono text-xs font-semibold tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            disabled={!canAddMore}
                            onClick={() => handleIncrementItem(item.id)}
                            aria-label={`Add one more ${item.name}`}
                            className="cursor-pointer p-1.5 disabled:opacity-35"
                          >
                            <Plus className="size-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAddMore}
                          onClick={() => handleIncrementItem(item.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                          style={{
                            backgroundColor: colors.chocolate,
                            color: colors.cream,
                          }}
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Greeting Card + Summary Drawer Card */}
          <div
            className="space-y-5 rounded-xl border p-5 sm:p-6 lg:col-span-5 lg:sticky lg:top-24"
            style={{
              borderColor: colors.hairline,
              backgroundColor: colors.cream,
            }}
          >
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
                03. Greeting Card &amp; Live Summary
              </h3>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <p
                  className="text-2xl font-semibold"
                  style={{ fontFamily: 'var(--font-editorial)' }}
                >
                  {selectedSize.name}
                </p>
                <span className="font-mono text-xs font-semibold tabular-nums" style={{ color: colors.olive }}>
                  {totalPickedCount} / {selectedSize.capacity} slots
                </span>
              </div>
              {/* Slot progress bar */}
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: colors.beige }}
              >
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    width: `${Math.min(100, (totalPickedCount / selectedSize.capacity) * 100)}%`,
                    backgroundColor: remainingSlots === 0 ? colors.olive : colors.caramel,
                  }}
                />
              </div>
              <p className="mt-1.5 text-[11px] opacity-70">
                {remainingSlots > 0
                  ? `${remainingSlots} open ${remainingSlots === 1 ? 'slot' : 'slots'} remaining in this box`
                  : 'Box capacity full — ready for sample bag or bulk quote'}
              </p>
            </div>

            {/* Picked Items Manifest */}
            <div className="space-y-2 border-t pt-4" style={{ borderColor: colors.hairline }}>
              {pickedItemsList.length === 0 ? (
                <p className="py-3 text-center text-xs opacity-65">
                  No items selected yet. Choose snacks, chocolates, cookies, or beverages on the left.
                </p>
              ) : (
                pickedItemsList.map((entry) => (
                  <div
                    key={entry.item.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate font-medium">
                      <span className="font-mono tabular-nums">{entry.qty}×</span> {entry.item.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono tabular-nums">
                        {formatInr(entry.item.priceInr * entry.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDecrementItem(entry.item.id)}
                        className="cursor-pointer text-[11px] underline opacity-65 hover:opacity-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Greeting Card Style & Welcome Note */}
            <div className="space-y-3 border-t pt-4" style={{ borderColor: colors.hairline }}>
              <label className="block text-xs font-semibold">Greeting Card Style</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {greetingCardStyles.map((style) => {
                  const active = style.id === cardStyleId;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setCardStyleId(style.id)}
                      className="cursor-pointer rounded-lg border p-2.5 text-left text-xs transition-colors"
                      style={{
                        borderColor: active ? colors.chocolate : colors.hairline,
                        backgroundColor: active ? colors.beige : '#FFFFFF',
                      }}
                    >
                      <span
                        className="block h-2 w-8 rounded-xs"
                        style={{ backgroundColor: style.surfaceHex, border: '1px solid rgba(0,0,0,0.12)' }}
                      />
                      <span className="mt-1.5 block font-semibold">{style.name}</span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label htmlFor="builder-ribbon" className="block text-xs font-semibold">
                  Satin Ribbon
                </label>
                <div id="builder-ribbon" className="mt-1.5 flex flex-wrap gap-1.5">
                  {ribbonOptions.map((rib) => {
                    const active = rib.id === ribbonId;
                    return (
                      <button
                        key={rib.id}
                        type="button"
                        onClick={() => setRibbonId(rib.id)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium"
                        style={{
                          borderColor: active ? colors.chocolate : colors.hairline,
                          backgroundColor: active ? colors.beige : '#FFFFFF',
                        }}
                      >
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: rib.hex }}
                          aria-hidden="true"
                        />
                        {rib.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <input
                type="text"
                value={companySenderName}
                onChange={(e) => setCompanySenderName(e.target.value)}
                placeholder="Company / Team Name (for card header)"
                className="w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                style={{
                  borderColor: colors.hairline,
                  backgroundColor: '#FFFFFF',
                  color: colors.chocolate,
                }}
              />
              <textarea
                rows={2}
                value={welcomeNote}
                onChange={(e) => setWelcomeNote(e.target.value)}
                placeholder="Custom company welcome note..."
                className="w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                style={{
                  borderColor: colors.hairline,
                  backgroundColor: '#FFFFFF',
                  color: colors.chocolate,
                }}
              />

              {/* Live Card Preview */}
              <div
                className="rounded-lg border p-4 text-center"
                style={{
                  backgroundColor: selectedCardStyle.surfaceHex,
                  borderColor: selectedCardStyle.accentHex,
                  color:
                    selectedCardStyle.surfaceHex === colors.chocolate
                      ? colors.cream
                      : colors.chocolate,
                }}
              >
                <p
                  className="text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: selectedCardStyle.accentHex }}
                >
                  {companySenderName.trim() || BOX_AND_BITE_CONFIG.brandName}
                </p>
                <p
                  className="mt-1.5 text-base italic leading-snug"
                  style={{ fontFamily: 'var(--font-editorial)' }}
                >
                  &ldquo;{welcomeNote.trim() || 'Warmest wishes from our team.'}&rdquo;
                </p>
              </div>
            </div>

            {/* Dynamic Total + CTAs */}
            <div className="space-y-3 border-t pt-4" style={{ borderColor: colors.hairline }}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="opacity-75">Rigid Box &amp; Ribbon Packaging</span>
                <span className="font-mono tabular-nums">{formatInr(selectedSize.boxBaseInr)}</span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="opacity-75">Selected Artisanal Items ({totalPickedCount})</span>
                <span className="font-mono tabular-nums">{formatInr(itemsTotalInr)}</span>
              </div>
              <div
                className="flex items-baseline justify-between border-t pt-2.5"
                style={{ borderColor: colors.hairline }}
              >
                <span className="text-sm font-semibold">Illustrative Per-Box Total</span>
                <span className="font-mono text-2xl font-semibold tabular-nums">
                  {formatInr(perBoxTotalInr)}
                </span>
              </div>
              <p className="text-[11px] opacity-65">
                Demo sample estimate. Bulk orders of 25+ boxes qualify for custom sleeve pricing on
                quote.
              </p>

              <button
                type="button"
                onClick={handleAddSampleBox}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs font-semibold tracking-wide transition-colors"
                style={{
                  backgroundColor: justAdded ? colors.olive : colors.chocolate,
                  color: colors.cream,
                }}
              >
                {justAdded ? (
                  <>
                    <Check className="size-4" aria-hidden="true" />
                    Custom Sample Added to Bag
                  </>
                ) : (
                  <>
                    <ShoppingBag className="size-4" aria-hidden="true" />
                    Add Sample Box to Bag · {formatInr(perBoxTotalInr)}
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={totalPickedCount === 0}
                onClick={() => onRequestQuoteForCustomBox(buildSnapshotSummary())}
                className="w-full cursor-pointer rounded-lg border px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-45"
                style={{
                  borderColor: colors.chocolate,
                  color: colors.chocolate,
                }}
              >
                Request Corporate Quote for This Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
