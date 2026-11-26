import { useMemo, useState } from 'react';
import {
  Calendar,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';
import {
  BUILDER_PRESET_OPTIONS,
  BuilderPresetId,
  CurrencyCode,
  Vendor,
  VendorProduct,
  buildWhatsAppUrl,
  formatMoney,
  getCustomBuilderModeConfig,
  suggestBuilderModeForCategory,
} from '../data/vendors';
import { FoodTypeIcon } from './FoodTypeBadge';

interface VendorCustomBoxBuilderProps {
  vendor: Vendor;
  currency: CurrencyCode;
  shareUrl: string;
  browsingLocation?: string;
  onTrackWhatsAppClick: (vendorId: string) => void;
}

export function VendorCustomBoxBuilder({
  vendor,
  currency,
  shareUrl,
  browsingLocation,
  onTrackWhatsAppClick,
}: VendorCustomBoxBuilderProps) {
  const mode = vendor.customBuilderMode ?? suggestBuilderModeForCategory(vendor.category);
  const modeConfig = getCustomBuilderModeConfig(mode);
  const minQty = Math.max(1, vendor.customBuilderMinQty ?? modeConfig.defaultMinQty);
  const packagingUsd = Math.max(0, vendor.customBuilderPackagingUsd ?? 0);

  const quickQtyChoices = useMemo(() => {
    const base = [minQty, 15, 25, 50, 100, 200].filter((n) => n >= minQty);
    return Array.from(new Set(base)).slice(0, 6);
  }, [minQty]);

  const [orderQty, setOrderQty] = useState<number>(minQty);
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date(Date.now() + 2 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [activeSection, setActiveSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePresetId, setActivePresetId] = useState<BuilderPresetId | null>(null);

  // Selected items map: productId -> quantity inside EACH box/plate (starts empty so customers pick their own items)
  const [itemQtys, setItemQtys] = useState<Record<string, number>>({});

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState(
    browsingLocation || `${vendor.city}, ${vendor.state}`
  );
  const [customNote, setCustomNote] = useState('');
  const [formHint, setFormHint] = useState<string | null>(null);

  const productsById = useMemo(() => {
    const map = new Map<string, VendorProduct>();
    for (const p of vendor.products) map.set(p.id, p);
    return map;
  }, [vendor.products]);

  const vegCount = useMemo(
    () => vendor.products.filter((p) => p.foodType === 'veg').length,
    [vendor.products]
  );
  const nonVegCount = useMemo(
    () => vendor.products.filter((p) => p.foodType === 'non-veg').length,
    [vendor.products]
  );
  const hasFoodTags = vegCount > 0 || nonVegCount > 0;

  const resolveProductSection = (p: VendorProduct): string =>
    p.builderSection?.trim() || p.menuSection?.trim() || '';

  // Build dynamic section tabs based on products actually listed
  const sectionTabs = useMemo(() => {
    const presentSections = new Set<string>();
    let hasUnassigned = false;
    for (const p of vendor.products) {
      const sec = resolveProductSection(p);
      if (sec) {
        presentSections.add(sec);
      } else {
        hasUnassigned = true;
      }
    }
    const ordered: string[] = [];
    for (const sec of modeConfig.sections) {
      if (presentSections.has(sec)) {
        ordered.push(sec);
        presentSections.delete(sec);
      }
    }
    for (const extra of presentSections) {
      ordered.push(extra);
    }
    if (hasUnassigned && ordered.length > 0) {
      ordered.push('Other Items');
    }
    return ordered;
  }, [vendor.products, modeConfig.sections]);

  // Preset cards (only show presets that have at least 1 item assigned by the vendor)
  const availablePresets = useMemo(() => {
    return BUILDER_PRESET_OPTIONS.map((opt) => {
      const items = vendor.products.filter((p) => (p.builderPresets ?? []).includes(opt.id));
      const itemsUsd = items.reduce((sum, p) => sum + p.priceUsd, 0);
      return {
        ...opt,
        title: opt.modeLabels[mode],
        subtitle: opt.modeSubtitles[mode],
        items,
        perUnitUsd: itemsUsd + packagingUsd,
      };
    }).filter((p) => p.items.length > 0);
  }, [vendor.products, mode, packagingUsd]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vendor.products.filter((p) => {
      if (foodFilter !== 'all' && p.foodType !== foodFilter) return false;
      const sec = resolveProductSection(p) || 'Other Items';
      if (activeSection !== 'all') {
        if (sec !== activeSection) return false;
      }
      if (q) {
        const hay = `${p.name} ${p.description} ${p.serves} ${p.builderSection ?? ''} ${p.menuSection ?? ''} ${(p.dietaryTags ?? []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [vendor.products, foodFilter, activeSection, searchQuery]);

  const selectedEntries = useMemo(() => {
    return Object.entries(itemQtys)
      .filter(([, q]) => q > 0)
      .map(([id, qty]) => {
        const product = productsById.get(id);
        return product ? { product, qty } : null;
      })
      .filter((entry): entry is { product: VendorProduct; qty: number } => Boolean(entry));
  }, [itemQtys, productsById]);

  const selectedCountBySection = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const { product } of selectedEntries) {
      const sec = resolveProductSection(product) || 'Other Items';
      counts[sec] = (counts[sec] || 0) + 1;
    }
    return counts;
  }, [selectedEntries]);

  const effectiveOrderQty = Math.max(minQty, orderQty || minQty);
  const itemsPerUnitUsd = useMemo(
    () => selectedEntries.reduce((sum, e) => sum + e.product.priceUsd * e.qty, 0),
    [selectedEntries]
  );
  const totalPerUnitUsd = selectedEntries.length > 0 ? itemsPerUnitUsd + packagingUsd : 0;
  const grandTotalUsd = totalPerUnitUsd * effectiveOrderQty;
  const totalPiecesPerUnit = selectedEntries.reduce((sum, e) => sum + e.qty, 0);

  const adjustItemQty = (productId: string, delta: number) => {
    setActivePresetId(null);
    setFormHint(null);
    setItemQtys((prev) => {
      const next = Math.max(0, Math.min(20, (prev[productId] ?? 0) + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const applyPreset = (presetId: BuilderPresetId, items: VendorProduct[]) => {
    const next: Record<string, number> = {};
    for (const p of items) next[p.id] = 1;
    setItemQtys(next);
    setActivePresetId(presetId);
    setFoodFilter('all');
    setActiveSection('all');
    setFormHint(null);
  };

  const updateOrderQty = (next: number) => {
    setOrderQty(Math.max(minQty, Math.min(5000, Math.round(next || minQty))));
  };

  const canOrder = selectedEntries.length > 0;

  const whatsappUrl = useMemo(() => {
    const itemLines = selectedEntries.map(({ product, qty }) => {
      const typeTag =
        product.foodType === 'veg' ? ' [Veg]' : product.foodType === 'non-veg' ? ' [Non-Veg]' : '';
      const qtyPrefix = qty > 1 ? `${qty}x ` : '';
      const lineTotal = formatMoney(product.priceUsd * qty, currency);
      return `  • ${qtyPrefix}${product.name}${typeTag} (${product.serves}) — ${lineTotal}`;
    });

    const unitCap = modeConfig.unitSingular.charAt(0).toUpperCase() + modeConfig.unitSingular.slice(1);
    const msg = [
      `Hi ${vendor.name}! I built a Custom ${unitCap} on your FindMyBites storefront (${shareUrl}):`,
      '',
      `Order Type: ${modeConfig.customerTitle}`,
      `Quantity: ${effectiveOrderQty} ${effectiveOrderQty === 1 ? modeConfig.unitSingular : modeConfig.unitPlural}`,
      eventDate ? `Event / Delivery Date: ${eventDate}` : '',
      deliveryLocation.trim() ? `Delivery Location: ${deliveryLocation.trim()}` : '',
      customerName.trim() ? `Name: ${customerName.trim()}` : '',
      customerPhone.trim() ? `Phone: ${customerPhone.trim()}` : '',
      '',
      `*Items Inside Each ${unitCap} (${selectedEntries.length} items):*`,
      ...itemLines,
      packagingUsd > 0
        ? `  • Box / Packaging: ${formatMoney(packagingUsd, currency)} / ${modeConfig.unitSingular}`
        : '',
      '',
      `Price Per ${unitCap}: ${formatMoney(totalPerUnitUsd, currency)}`,
      `Estimated Total (${effectiveOrderQty} ${modeConfig.unitPlural}): ${formatMoney(grandTotalUsd, currency)}`,
      customNote.trim() ? `Notes: ${customNote.trim()}` : '',
      '',
      'Please confirm availability and final quote!',
    ]
      .filter((line) => line !== '')
      .join('\n');

    return buildWhatsAppUrl(vendor, msg);
  }, [
    selectedEntries,
    vendor,
    currency,
    shareUrl,
    modeConfig,
    effectiveOrderQty,
    eventDate,
    deliveryLocation,
    customerName,
    customerPhone,
    packagingUsd,
    totalPerUnitUsd,
    grandTotalUsd,
    customNote,
  ]);

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Builder Top Header & Order Controls */}
      <div className="border-b border-border bg-muted/20 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-brand">
              {mode === 'snackbox' ? (
                <Package className="size-3.5" aria-hidden="true" />
              ) : (
                <UtensilsCrossed className="size-3.5" aria-hidden="true" />
              )}
              <span>{modeConfig.label}</span>
              <span aria-hidden="true">·</span>
              <span>
                Minimum {minQty} {minQty === 1 ? modeConfig.unitSingular : modeConfig.unitPlural}
              </span>
              {packagingUsd > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    +{formatMoney(packagingUsd, currency)}/{modeConfig.unitSingular} box packing
                  </span>
                </>
              )}
            </p>
            <h3 className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {modeConfig.customerTitle}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{modeConfig.subtitle}</p>
          </div>
        </div>

        {/* Quantity & Event Date Row */}
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Users className="size-3.5 text-brand" aria-hidden="true" />
              Number of {modeConfig.unitPlural} (Min {minQty})
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-border bg-background">
                <button
                  type="button"
                  aria-label={`Decrease ${modeConfig.unitPlural}`}
                  onClick={() => updateOrderQty(effectiveOrderQty - 5)}
                  disabled={effectiveOrderQty <= minQty}
                  className="grid size-9 cursor-pointer place-items-center text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="size-3.5" aria-hidden="true" />
                </button>
                <input
                  type="number"
                  min={minQty}
                  max={5000}
                  value={orderQty}
                  onChange={(e) => setOrderQty(Number(e.target.value))}
                  onBlur={() => updateOrderQty(orderQty)}
                  aria-label={`Number of ${modeConfig.unitPlural}`}
                  className="w-16 bg-transparent text-center font-mono text-sm font-bold tabular-nums text-foreground focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={`Increase ${modeConfig.unitPlural}`}
                  onClick={() => updateOrderQty(effectiveOrderQty + 5)}
                  className="grid size-9 cursor-pointer place-items-center text-foreground hover:bg-accent"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {quickQtyChoices.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setOrderQty(count)}
                    className={`cursor-pointer rounded-lg border px-2.5 py-1.5 font-mono text-xs font-bold tabular-nums transition-colors ${
                      effectiveOrderQty === count
                        ? 'border-brand bg-brand text-brand-foreground'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Calendar className="size-3.5 text-brand" aria-hidden="true" />
              Event / Delivery Date
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-3 font-mono text-xs text-foreground focus:border-brand focus:outline-none sm:w-auto"
            />
          </div>
        </div>

        {/* Optional 1-Click Quick-Start Presets (Veg / Non-Veg / Party) */}
        {availablePresets.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-bold text-muted-foreground">
              Quick-Start Presets (tap any option to load, then customize any item):
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {availablePresets.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id, preset.items)}
                    className={`flex cursor-pointer flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                      isActive
                        ? 'border-brand bg-brand-soft/60'
                        : 'border-border bg-background hover:border-brand/50'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                        {preset.id === 'veg' && <FoodTypeIcon foodType="veg" size="xs" />}
                        {preset.id === 'non-veg' && <FoodTypeIcon foodType="non-veg" size="xs" />}
                        {preset.id === 'party' && (
                          <Wine className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        )}
                        <span className="line-clamp-1">{preset.title}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs font-extrabold tabular-nums text-brand">
                        {formatMoney(preset.perUnitUsd, currency)}/{modeConfig.unitSingular}
                      </span>
                    </div>
                    <span className="mt-1 text-[11px] text-muted-foreground">
                      {preset.items.length} {preset.items.length === 1 ? 'item' : 'items'} ·{' '}
                      {preset.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT COLUMN: Item Picker */}
        <div className="border-b border-border p-5 sm:p-6 lg:col-span-7 lg:border-b-0 lg:border-r">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {hasFoodTags ? (
              <div
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1"
                role="group"
                aria-label="Filter items by Veg or Non-Veg"
              >
                <button
                  type="button"
                  onClick={() => setFoodFilter('all')}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    foodFilter === 'all'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({vendor.products.length})
                </button>
                {vegCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFoodFilter('veg')}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                      foodFilter === 'veg'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    <FoodTypeIcon foodType="veg" size="xs" />
                    Veg ({vegCount})
                  </button>
                )}
                {(nonVegCount > 0 || availablePresets.some((p) => p.id === 'non-veg')) && (
                  <button
                    type="button"
                    onClick={() => setFoodFilter('non-veg')}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                      foodFilter === 'non-veg'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40'
                    }`}
                  >
                    <FoodTypeIcon foodType="non-veg" size="xs" />
                    Non-Veg ({nonVegCount})
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs font-semibold text-muted-foreground">
                Select items to include inside each {modeConfig.unitSingular}:
              </p>
            )}

            <div className="relative sm:w-56">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-xs text-foreground focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {/* Section Tabs (if vendor organized items into sections) */}
          {sectionTabs.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5 border-b border-border pb-4">
              <button
                type="button"
                onClick={() => setActiveSection('all')}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                  activeSection === 'all'
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                All Sections
              </button>
              {sectionTabs.map((sec) => {
                const count = selectedCountBySection[sec] || 0;
                const active = activeSection === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setActiveSection(sec)}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-brand bg-brand text-brand-foreground'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {sec}
                    {count > 0 ? ` (${count})` : ''}
                  </button>
                );
              })}
            </div>
          )}

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm font-semibold text-foreground">
                {foodFilter === 'non-veg' && nonVegCount === 0
                  ? 'No dishes are tagged as Non-Veg yet.'
                  : 'No items match this filter.'}
              </p>
              {foodFilter === 'non-veg' && nonVegCount === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Open Edit Storefront and mark your chicken, mutton, egg or seafood dishes with the red Non-Veg food type to list them here.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setFoodFilter('all');
                  setActiveSection('all');
                  setSearchQuery('');
                }}
                className="mt-2 cursor-pointer text-xs font-bold text-brand hover:underline"
              >
                Show all menu items
              </button>
            </div>
          ) : (
            <div className="mt-4 grid max-h-[640px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredProducts.map((product) => {
                const qty = itemQtys[product.id] ?? 0;
                const isSelected = qty > 0;
                return (
                  <div
                    key={product.id}
                    className={`flex flex-col justify-between overflow-hidden rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-emerald-600/70 bg-emerald-500/5'
                        : 'border-border bg-background hover:border-foreground/25'
                    }`}
                  >
                    <div>
                      <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden border-b border-border/60 bg-white p-1.5">
                        <img
                          src={product.image}
                          alt={`${product.name} by ${vendor.name} - ${vendor.category} in ${vendor.area}, ${vendor.city}`}
                          width={400}
                          height={300}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-contain object-center"
                        />
                      </div>

                      <div className="p-3.5 pb-0">
                        <div className="flex items-start gap-2">
                          {product.foodType && (
                            <span className="mt-0.5">
                              <FoodTypeIcon foodType={product.foodType} size="sm" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold leading-snug text-foreground">
                              {product.name}
                            </h4>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {product.serves}
                              {resolveProductSection(product)
                                ? ` · ${resolveProductSection(product)}`
                                : ''}
                            </p>
                          </div>
                        </div>

                        {product.dietaryTags && product.dietaryTags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {product.dietaryTags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded border border-emerald-600/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {product.description && (
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 px-3.5 py-2.5">
                      <div>
                        <span className="font-mono text-sm font-extrabold tabular-nums text-foreground">
                          {formatMoney(product.priceUsd, currency)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {' '}
                          / {modeConfig.unitSingular}
                        </span>
                      </div>

                      {isSelected ? (
                        <div className="inline-flex items-center rounded-lg border border-emerald-600 bg-emerald-600 text-white">
                          <button
                            type="button"
                            aria-label={`Decrease ${product.name}`}
                            onClick={() => adjustItemQty(product.id, -1)}
                            className="grid size-7 cursor-pointer place-items-center hover:bg-emerald-700"
                          >
                            <Minus className="size-3" aria-hidden="true" />
                          </button>
                          <span className="min-w-[22px] text-center font-mono text-xs font-extrabold tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase ${product.name}`}
                            onClick={() => adjustItemQty(product.id, 1)}
                            className="grid size-7 cursor-pointer place-items-center hover:bg-emerald-700"
                          >
                            <Plus className="size-3" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => adjustItemQty(product.id, 1)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-brand hover:text-brand"
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
          )}
        </div>

        {/* RIGHT COLUMN: Live Box / Plate Summary & WhatsApp Order */}
        <div className="flex flex-col justify-between bg-muted/25 p-5 sm:p-6 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 text-base font-extrabold text-foreground">
                {mode === 'snackbox' ? (
                  <Package className="size-4 text-brand" aria-hidden="true" />
                ) : (
                  <UtensilsCrossed className="size-4 text-brand" aria-hidden="true" />
                )}
                Your Custom{' '}
                {modeConfig.unitSingular.charAt(0).toUpperCase() + modeConfig.unitSingular.slice(1)}
              </h4>
              {selectedEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setItemQtys({});
                    setActivePresetId(null);
                  }}
                  className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-rose-600"
                >
                  Clear all
                </button>
              )}
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {selectedEntries.length} items ({totalPiecesPerUnit} pcs/servings per{' '}
              {modeConfig.unitSingular}) · {effectiveOrderQty}{' '}
              {effectiveOrderQty === 1 ? modeConfig.unitSingular : modeConfig.unitPlural}
            </p>

            {selectedEntries.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-6 text-center">
                <Sparkles className="mx-auto size-5 text-brand" aria-hidden="true" />
                <p className="mt-2 text-xs font-semibold text-foreground">
                  Your {modeConfig.unitSingular} is empty — tap + Add on any item from the left to
                  start building.
                </p>
              </div>
            ) : (
              <div className="mt-3 max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-background px-3">
                {selectedEntries.map(({ product, qty }) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-2 py-2 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {product.foodType && <FoodTypeIcon foodType={product.foodType} size="xs" />}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {qty > 1 ? `${qty}× ` : ''}
                          {product.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{product.serves}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono font-bold tabular-nums text-foreground">
                        {formatMoney(product.priceUsd * qty, currency)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${product.name}`}
                        onClick={() => adjustItemQty(product.id, -qty)}
                        className="grid size-6 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Price Breakdown */}
            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Items cost per {modeConfig.unitSingular}</span>
                <span className="font-mono font-bold tabular-nums text-foreground">
                  {formatMoney(itemsPerUnitUsd, currency)}
                </span>
              </div>
              {packagingUsd > 0 && (
                <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Box / packaging per {modeConfig.unitSingular}</span>
                  <span className="font-mono font-bold tabular-nums text-foreground">
                    +{formatMoney(packagingUsd, currency)}
                  </span>
                </div>
              )}
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Per {modeConfig.unitSingular} × {effectiveOrderQty} {modeConfig.unitPlural}
                </span>
                <span className="font-mono font-bold tabular-nums text-foreground">
                  {formatMoney(totalPerUnitUsd, currency)} × {effectiveOrderQty}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                <div>
                  <p className="text-xs font-bold text-foreground">Estimated Total</p>
                  <p className="text-[11px] text-muted-foreground">
                    Direct order with {vendor.name} · 0% commission
                  </p>
                </div>
                <span className="font-mono text-2xl font-extrabold tabular-nums text-foreground">
                  {formatMoney(grandTotalUsd, currency)}
                </span>
              </div>
            </div>

            {/* Customer Delivery Info */}
            <div className="mt-4 space-y-2.5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your Name"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Mobile / WhatsApp No."
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              <div className="relative">
                <MapPin
                  className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  placeholder="Delivery Area / City / State"
                  className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-xs text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Notes (delivery time, spice level, custom branding, eggless...)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
              />
            </div>

            {formHint && <p className="mt-2 text-xs font-semibold text-rose-600">{formHint}</p>}
          </div>

          <div className="mt-5">
            {canOrder ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setFormHint(null);
                  onTrackWhatsAppClick(vendor.id);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-[#1ebe5d]"
              >
                <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
                Order Custom{' '}
                {modeConfig.unitSingular.charAt(0).toUpperCase() + modeConfig.unitSingular.slice(1)}{' '}
                on WhatsApp
              </a>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setFormHint(
                    `Please add at least 1 item to build your custom ${modeConfig.unitSingular}.`
                  )
                }
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#25D366]/60 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-[#25D366]/75"
              >
                <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
                Order Custom{' '}
                {modeConfig.unitSingular.charAt(0).toUpperCase() + modeConfig.unitSingular.slice(1)}{' '}
                on WhatsApp
              </button>
            )}
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Sends your itemized {modeConfig.unitSingular} straight to {vendor.name} on WhatsApp
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
