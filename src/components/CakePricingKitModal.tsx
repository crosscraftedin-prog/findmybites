import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Bookmark,
  Calculator,
  Check,
  ChefHat,
  Copy,
  Crown,
  Link2,
  Lock,
  MessageCircle,
  Plus,
  Save,
  Sparkles,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import {
  BAKER_PANTRY_PRESETS,
  IngredientUnit,
  ProRecipeDraft,
  RecipeIngredient,
  buildStarterRecipes,
  computeIngredientLineCost,
  computeProRecipePricing,
  formatLocalAmount,
  roundToNicePrice,
} from '../data/bakeryPricingPresets';
import {
  CURRENCIES,
  CurrencyCode,
  SAAS_PLANS,
  Vendor,
  VendorProduct,
  formatPlanPrice,
  localToUsd,
} from '../data/vendors';
import { updateVendorInCloud } from '../services/firestoreService';

const STORAGE_SAVED_RECIPES = 'fmb_cake_pricing_saved_recipes_v1';

interface CakePricingKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  onChangeCurrency: (next: CurrencyCode) => void;
  user: User | null;
  isProUnlocked: boolean;
  isAdmin?: boolean;
  myVendors: Vendor[];
  onUpgradePlan: () => void;
  onSignIn: () => void;
  onToast: (message: string) => void;
}

const USED_UNITS: IngredientUnit[] = ['g', 'kg', 'ml', 'L', 'pcs', 'tbsp', 'cup'];
const PACK_UNITS: Array<'g' | 'kg' | 'ml' | 'L' | 'pcs'> = ['g', 'kg', 'ml', 'L', 'pcs'];

function defaultSimpleValues(currency: CurrencyCode) {
  const rate = CURRENCIES[currency].rate || 1;
  const scale = (usd: number) => (rate >= 50 ? Math.round((usd * rate) / 10) * 10 : Math.round(usd * rate));
  return {
    ingredients: scale(6.5),
    packaging: scale(1.4),
    hourlyRate: scale(3.5),
  };
}

export function CakePricingKitModal({
  isOpen,
  onClose,
  currency,
  onChangeCurrency,
  user,
  isProUnlocked,
  isAdmin = false,
  myVendors,
  onUpgradePlan,
  onSignIn,
  onToast,
}: CakePricingKitModalProps) {
  const [mode, setMode] = useState<'simple' | 'pro'>('simple');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // --- Mode 1: Simple Free Calculator State ---
  const initSimple = useMemo(() => defaultSimpleValues(currency), [currency]);
  const [simpleName, setSimpleName] = useState('Belgian Chocolate Truffle Cake');
  const [simpleWeightKg, setSimpleWeightKg] = useState<number>(1);
  const [simpleServings, setSimpleServings] = useState<number>(10);
  const [simpleIngredients, setSimpleIngredients] = useState<number>(initSimple.ingredients);
  const [simplePackaging, setSimplePackaging] = useState<number>(initSimple.packaging);
  const [simpleHours, setSimpleHours] = useState<number>(2);
  const [simpleHourlyRate, setSimpleHourlyRate] = useState<number>(initSimple.hourlyRate);
  const [simpleMarginPct, setSimpleMarginPct] = useState<number>(35);

  // Re-baseline defaults cleanly when currency changes
  useEffect(() => {
    const next = defaultSimpleValues(currency);
    setSimpleIngredients(next.ingredients);
    setSimplePackaging(next.packaging);
    setSimpleHourlyRate(next.hourlyRate);
  }, [currency]);

  // --- Mode 2: Full Pro Suite State ---
  const starterTemplates = useMemo(() => buildStarterRecipes(currency), [currency]);
  const [proDraft, setProDraft] = useState<ProRecipeDraft>(() => starterTemplates[0]);
  const [selectedPantryKey, setSelectedPantryKey] = useState<string>(BAKER_PANTRY_PRESETS[0].key);
  const [savedRecipes, setSavedRecipes] = useState<ProRecipeDraft[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED_RECIPES);
      return raw ? (JSON.parse(raw) as ProRecipeDraft[]) : [];
    } catch {
      return [];
    }
  });
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [publishingToStore, setPublishingToStore] = useState(false);

  // Update starter recipe currency when switching currency (if user hasn't customized saved recipe)
  useEffect(() => {
    setProDraft((prev) => {
      const match = starterTemplates.find((t) => t.id === prev.id);
      return match ? match : prev;
    });
  }, [starterTemplates]);

  useEffect(() => {
    if (myVendors.length > 0 && !selectedStoreId) {
      setSelectedStoreId(myVendors[0].id);
    }
  }, [myVendors, selectedStoreId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SAVED_RECIPES, JSON.stringify(savedRecipes));
    } catch {
      // ignore localStorage quota errors
    }
  }, [savedRecipes]);

  // Lock Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // --- Simple Free Calculations ---
  const simpleCalc = useMemo(() => {
    const ing = Math.max(0, Number(simpleIngredients) || 0);
    const pkg = Math.max(0, Number(simplePackaging) || 0);
    const labor = Math.max(0, Number(simpleHours) || 0) * Math.max(0, Number(simpleHourlyRate) || 0);
    const totalCost = ing + pkg + labor;
    const margin = Math.max(10, Math.min(70, Number(simpleMarginPct) || 35));
    const suggestedPrice = roundToNicePrice(totalCost / (1 - margin / 100), currency);
    const netProfit = Math.max(0, suggestedPrice - totalCost);
    const weight = Math.max(0.25, Number(simpleWeightKg) || 1);
    const servings = Math.max(1, Number(simpleServings) || 8);
    return {
      ing,
      pkg,
      labor,
      totalCost,
      suggestedPrice,
      netProfit,
      effectiveMarginPct: suggestedPrice > 0 ? (netProfit / suggestedPrice) * 100 : 0,
      pricePerKg: suggestedPrice / weight,
      pricePerServing: suggestedPrice / servings,
    };
  }, [
    simpleIngredients,
    simplePackaging,
    simpleHours,
    simpleHourlyRate,
    simpleMarginPct,
    simpleWeightKg,
    simpleServings,
    currency,
  ]);

  // --- Full Pro Calculations ---
  const proCalc = useMemo(() => computeProRecipePricing(proDraft, currency), [proDraft, currency]);

  if (!isOpen) return null;

  const triggerCopy = async (key: string, text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      onToast(successMessage);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      onToast('Unable to copy automatically — please select and copy the text.');
    }
  };

  const buildCustomerQuoteText = (
    cakeTitle: string,
    weightKg: number,
    servings: number,
    finalPrice: number,
    deliveryFee = 0
  ) => {
    const lines = [
      `Custom Cake Quote — ${cakeTitle}`,
      `Weight: ${weightKg} kg (Serves ~${servings} guests)`,
      deliveryFee > 0 ? `Includes Local Delivery: ${formatLocalAmount(deliveryFee, currency)}` : 'Freshly baked to order (Pickup / Local Delivery available)',
      `Total Price: ${formatLocalAmount(finalPrice, currency)}`,
      ``,
      `Reply to confirm your date & flavor preference.`,
    ];
    return lines.join('\n');
  };

  const handleCopyShareToolUrl = () => {
    const shareUrl = `${window.location.origin}/pricing-kit`;
    void triggerCopy('share-url', shareUrl, 'Copied shareable Cake Pricing Kit link!');
  };

  const requireProOrNotify = (): boolean => {
    if (isProUnlocked) return true;
    onToast('Upgrade to FindMyBites Pro to customize recipes, save pricing sheets & publish to your storefront.');
    return false;
  };

  const handleUpdateIngredient = (
    id: string,
    patch: Partial<RecipeIngredient>
  ) => {
    if (!requireProOrNotify()) return;
    setProDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const handleRemoveIngredient = (id: string) => {
    if (!requireProOrNotify()) return;
    setProDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((item) => item.id !== id),
    }));
  };

  const handleAddPantryIngredient = () => {
    if (!requireProOrNotify()) return;
    const preset = BAKER_PANTRY_PRESETS.find((p) => p.key === selectedPantryKey) ?? BAKER_PANTRY_PRESETS[0];
    const rate = CURRENCIES[currency].rate || 1;
    const packPriceLocal =
      rate >= 50
        ? Math.round((preset.packPriceUsd * rate) / 5) * 5
        : Number((preset.packPriceUsd * rate).toFixed(2));
    const newItem: RecipeIngredient = {
      id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: preset.name,
      packPriceLocal,
      packSize: preset.packSize,
      packUnit: preset.packUnit,
      usedQty: preset.defaultUsedQty,
      usedUnit: preset.defaultUsedUnit,
    };
    setProDraft((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, newItem],
    }));
  };

  const handleAddBlankIngredient = () => {
    if (!requireProOrNotify()) return;
    const newItem: RecipeIngredient = {
      id: `ing-${Date.now()}`,
      name: 'Custom Ingredient',
      packPriceLocal: currency === 'INR' ? 250 : 10,
      packSize: 500,
      packUnit: 'g',
      usedQty: 100,
      usedUnit: 'g',
    };
    setProDraft((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, newItem],
    }));
  };

  const handleSaveCurrentRecipe = () => {
    if (!requireProOrNotify()) return;
    const cleanName = proDraft.name.trim() || 'Untitled Cake Recipe';
    const record: ProRecipeDraft = {
      ...proDraft,
      id: `saved-${Date.now()}`,
      name: cleanName,
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
    setSavedRecipes((prev) => [record, ...prev].slice(0, 20));
    onToast(`Saved "${cleanName}" to your Baker Recipe Library.`);
  };

  const handlePublishToStorefront = async () => {
    if (!requireProOrNotify()) return;
    const targetVendor = myVendors.find((v) => v.id === selectedStoreId) ?? myVendors[0];
    if (!targetVendor) {
      onToast('Create a storefront first to publish priced cakes directly to your menu.');
      return;
    }

    const scaledWeight = Number((proDraft.weightKg * proDraft.scaleMultiplier).toFixed(2));
    const scaledServings = Math.max(1, Math.round(proDraft.servings * proDraft.scaleMultiplier));
    const newProduct: VendorProduct = {
      id: `prod-${Date.now()}`,
      name: proDraft.name.trim().slice(0, 95) || 'Custom Celebration Cake',
      serves: `${scaledWeight} kg · Serves ${scaledServings}`,
      priceUsd: Math.max(1, localToUsd(proCalc.recommendedPrice, currency)),
      description: `Handcrafted ${scaledWeight} kg cake freshly baked with ${proDraft.ingredients
        .slice(0, 4)
        .map((i) => i.name.split('(')[0].trim())
        .join(', ')}.`,
      image: targetVendor.image,
      tag: proDraft.name.toLowerCase().includes('christmas') ? 'Christmas Special' : 'Custom Order',
    };

    setPublishingToStore(true);
    try {
      await updateVendorInCloud(targetVendor.id, {
        products: [...targetVendor.products, newProduct],
      });
      onToast(`Added "${newProduct.name}" (${formatLocalAmount(proCalc.recommendedPrice, currency)}) to ${targetVendor.name}!`);
    } catch {
      onToast('Could not add product to storefront right now. Please try again.');
    } finally {
      setPublishingToStore(false);
    }
  };

  const simpleQuoteText = buildCustomerQuoteText(
    simpleName.trim() || 'Custom Cake',
    simpleWeightKg,
    simpleServings,
    simpleCalc.suggestedPrice
  );
  const simpleWaHref = `https://wa.me/?text=${encodeURIComponent(simpleQuoteText)}`;

  const scaledProWeight = Number((proDraft.weightKg * proDraft.scaleMultiplier).toFixed(2));
  const scaledProServings = Math.max(1, Math.round(proDraft.servings * proDraft.scaleMultiplier));
  const proQuoteText = buildCustomerQuoteText(
    proDraft.name.trim() || 'Custom Cake',
    scaledProWeight,
    scaledProServings,
    proCalc.recommendedPrice,
    proCalc.deliveryCost
  );
  const proWaHref = `https://wa.me/?text=${encodeURIComponent(proQuoteText)}`;

  // Composition bar widths for Simple mode
  const simpleDenom = Math.max(1, simpleCalc.suggestedPrice);
  const simpleIngPct = Math.min(100, (simpleCalc.ing / simpleDenom) * 100);
  const simplePkgPct = Math.min(100 - simpleIngPct, (simpleCalc.pkg / simpleDenom) * 100);
  const simpleLabPct = Math.min(100 - simpleIngPct - simplePkgPct, (simpleCalc.labor / simpleDenom) * 100);
  const simpleProfPct = Math.max(0, 100 - simpleIngPct - simplePkgPct - simpleLabPct);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bakery and Cake Pricing Kit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 backdrop-blur-xs sm:p-4"
    >
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl">
        {/* Top Command Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg border border-border bg-brand text-brand-foreground">
              <Calculator className="size-4.5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                  Bakery &amp; Cake Pricing Kit
                </h2>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {isProUnlocked ? (isAdmin ? 'Admin Full Access' : 'Pro Unlocked') : 'Free + Pro'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Calculate true cake costs, protect your profit margin, and send instant WhatsApp quotes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Currency selector */}
            <label className="sr-only" htmlFor="pricing-kit-currency">
              Currency
            </label>
            <select
              id="pricing-kit-currency"
              value={currency}
              onChange={(e) => onChangeCurrency(e.target.value as CurrencyCode)}
              className="h-9 rounded-lg border border-border bg-background px-2.5 font-mono text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
            >
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                <option key={code} value={code}>
                  {code} ({CURRENCIES[code].symbol.trim()})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleCopyShareToolUrl}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand"
            >
              {copiedKey === 'share-url' ? (
                <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
              ) : (
                <Link2 className="size-3.5" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Copy Tool Link</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Cake Pricing Kit"
              className="grid size-9 cursor-pointer place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mode Switcher Bar (Segmented Control) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5 sm:px-6">
          <div
            role="tablist"
            aria-label="Pricing kit edition"
            className="inline-flex rounded-lg border border-border bg-background p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'simple'}
              onClick={() => setMode('simple')}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-bold transition-colors ${
                mode === 'simple'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calculator className="size-3.5" aria-hidden="true" />
              Simple Calculator
              <span className="font-mono text-[10px] uppercase opacity-75">Free</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'pro'}
              onClick={() => setMode('pro')}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-bold transition-colors ${
                mode === 'pro'
                  ? 'bg-brand text-brand-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isProUnlocked ? (
                <ChefHat className="size-3.5" aria-hidden="true" />
              ) : (
                <Lock className="size-3.5" aria-hidden="true" />
              )}
              Full Pro Suite
              <span className="font-mono text-[10px] uppercase opacity-80">
                {isProUnlocked ? 'Active' : 'Paid'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {mode === 'simple' ? (
              <span>Quick cost + margin calculator · No login required</span>
            ) : (
              <span>Recipe gram costing · Overhead &amp; wastage · 3-tier pricing · Storefront sync</span>
            )}
          </div>
        </div>

        {/* Scrollable Workspace Body */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {mode === 'simple' ? (
            /* ================= MODE 1: FREE SIMPLE CALCULATOR ================= */
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Inputs (7 cols) */}
              <div className="space-y-5 lg:col-span-7">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    1 · Cake Details
                  </p>
                  <div className="mt-2.5 grid gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <label
                        htmlFor="simple-cake-name"
                        className="block text-xs font-semibold text-foreground"
                      >
                        Cake / Order Name
                      </label>
                      <input
                        id="simple-cake-name"
                        type="text"
                        value={simpleName}
                        onChange={(e) => setSimpleName(e.target.value)}
                        placeholder="e.g. 1 kg Belgian Chocolate Truffle"
                        className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label
                        htmlFor="simple-weight"
                        className="block text-xs font-semibold text-foreground"
                      >
                        Weight (kg)
                      </label>
                      <input
                        id="simple-weight"
                        type="number"
                        step="0.25"
                        min="0.25"
                        max="50"
                        value={simpleWeightKg}
                        onChange={(e) => setSimpleWeightKg(Math.max(0.25, Number(e.target.value) || 0.25))}
                        className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 font-mono text-sm tabular-nums text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label
                        htmlFor="simple-servings"
                        className="block text-xs font-semibold text-foreground"
                      >
                        Servings
                      </label>
                      <input
                        id="simple-servings"
                        type="number"
                        min="1"
                        max="500"
                        value={simpleServings}
                        onChange={(e) => setSimpleServings(Math.max(1, Number(e.target.value) || 1))}
                        className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 font-mono text-sm tabular-nums text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>
                  </div>
                  {/* Quick weight presets */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {[
                      { kg: 0.5, serves: 5 },
                      { kg: 1, serves: 10 },
                      { kg: 1.5, serves: 15 },
                      { kg: 2, serves: 22 },
                      { kg: 3, serves: 32 },
                    ].map((preset) => (
                      <button
                        key={preset.kg}
                        type="button"
                        onClick={() => {
                          setSimpleWeightKg(preset.kg);
                          setSimpleServings(preset.serves);
                        }}
                        className={`cursor-pointer rounded-md border px-2.5 py-1 font-mono text-xs font-semibold tabular-nums transition-colors ${
                          simpleWeightKg === preset.kg
                            ? 'border-brand bg-brand/10 text-brand'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {preset.kg} kg
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    2 · Direct Costs ({CURRENCIES[currency].code})
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="simple-ingredients"
                        className="block text-xs font-semibold text-foreground"
                      >
                        Total Ingredients Cost ({CURRENCIES[currency].symbol.trim()})
                      </label>
                      <input
                        id="simple-ingredients"
                        type="number"
                        min="0"
                        value={simpleIngredients}
                        onChange={(e) => setSimpleIngredients(Math.max(0, Number(e.target.value) || 0))}
                        className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 font-mono text-sm tabular-nums text-foreground focus:border-brand focus:outline-none"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Flour, butter, chocolate, cream, eggs, fillings.
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="simple-packaging"
                        className="block text-xs font-semibold text-foreground"
                      >
                        Box, Board &amp; Packaging ({CURRENCIES[currency].symbol.trim()})
                      </label>
                      <input
                        id="simple-packaging"
                        type="number"
                        min="0"
                        value={simplePackaging}
                        onChange={(e) => setSimplePackaging(Math.max(0, Number(e.target.value) || 0))}
                        className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 font-mono text-sm tabular-nums text-foreground focus:border-brand focus:outline-none"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Cake drum, tall box, ribbon, topper, sticker.
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="simple-hours"
                        className="block text-xs font-semibold text-foreground"
                      >
                        Baking &amp; Decor Time (Hours)
                      </label>
                      <input
                        id="simple-hours"
                        type="number"
                        step="0.25"
                        min="0"
                        max="100"
                        value={simpleHours}
                        onChange={(e) => setSimpleHours(Math.max(0, Number(e.target.value) || 0))}
                        className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 font-mono text-sm tabular-nums text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="simple-hourly-rate"
                        className="block text-xs font-semibold text-foreground"
                      >
                        Your Hourly Labor Rate ({CURRENCIES[currency].symbol.trim()}/hr)
                      </label>
                      <input
                        id="simple-hourly-rate"
                        type="number"
                        min="0"
                        value={simpleHourlyRate}
                        onChange={(e) => setSimpleHourlyRate(Math.max(0, Number(e.target.value) || 0))}
                        className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 font-mono text-sm tabular-nums text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="simple-margin-slider"
                      className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      3 · Desired Profit Margin
                    </label>
                    <span className="font-mono text-sm font-extrabold tabular-nums text-brand">
                      {simpleMarginPct}%
                    </span>
                  </div>
                  <input
                    id="simple-margin-slider"
                    type="range"
                    min="15"
                    max="65"
                    step="1"
                    value={simpleMarginPct}
                    onChange={(e) => setSimpleMarginPct(Number(e.target.value))}
                    className="mt-3 h-2 w-full cursor-pointer accent-brand"
                  />
                  <div className="mt-1.5 flex justify-between font-mono text-[11px] text-muted-foreground">
                    <span>15% Budget</span>
                    <span>35% Standard Bakery</span>
                    <span>50%+ Custom Art</span>
                    <span>65% Luxury</span>
                  </div>
                </div>

                {/* Clean Upgrade Bridge to Full Pro Suite */}
                <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">
                      Need exact gram-by-gram recipe costing?
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">
                      Open the Full Pro Pricing Suite
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Pantry unit converter (g/kg/ml/cup), oven electricity %, wastage buffer, 3-tier wedding scaler, saved recipes &amp; 1-click Storefront publish.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('pro')}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-bold text-brand-foreground transition-colors hover:bg-brand-hover"
                  >
                    <Crown className="size-3.5" aria-hidden="true" />
                    {isProUnlocked ? 'Open Pro Suite' : 'Preview Full Pro'}
                  </button>
                </div>
              </div>

              {/* Right Live Pricing Sheet (5 cols) */}
              <div className="lg:col-span-5">
                <div className="sticky top-0 rounded-xl border border-border bg-card p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Suggested Retail Selling Price
                  </p>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <p className="font-mono text-4xl font-black tracking-tight tabular-nums text-foreground">
                      {formatLocalAmount(simpleCalc.suggestedPrice, currency)}
                    </p>
                    <span className="font-mono text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {simpleCalc.effectiveMarginPct.toFixed(0)}% margin
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {simpleName.trim() || 'Custom Cake'} · {simpleWeightKg} kg · Serves {simpleServings}
                  </p>

                  {/* Flat 3-column KPI hairline grid */}
                  <div className="mt-5 grid grid-cols-3 divide-x divide-border border-y border-border py-3.5">
                    <div className="pr-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Total Cost
                      </p>
                      <p className="mt-1 font-mono text-sm font-extrabold tabular-nums text-foreground">
                        {formatLocalAmount(simpleCalc.totalCost, currency)}
                      </p>
                    </div>
                    <div className="px-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Net Profit
                      </p>
                      <p className="mt-1 font-mono text-sm font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatLocalAmount(simpleCalc.netProfit, currency)}
                      </p>
                    </div>
                    <div className="pl-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Per Serving
                      </p>
                      <p className="mt-1 font-mono text-sm font-extrabold tabular-nums text-foreground">
                        {formatLocalAmount(simpleCalc.pricePerServing, currency)}
                      </p>
                    </div>
                  </div>

                  {/* Cost Breakdown List */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Ingredients</span>
                      <span className="font-mono font-semibold tabular-nums text-foreground">
                        {formatLocalAmount(simpleCalc.ing, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Packaging &amp; Box</span>
                      <span className="font-mono font-semibold tabular-nums text-foreground">
                        {formatLocalAmount(simpleCalc.pkg, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Labor ({simpleHours} hrs × {formatLocalAmount(simpleHourlyRate, currency)})
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-foreground">
                        {formatLocalAmount(simpleCalc.labor, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <span className="font-semibold text-foreground">Price per kg</span>
                      <span className="font-mono font-bold tabular-nums text-foreground">
                        {formatLocalAmount(simpleCalc.pricePerKg, currency)} / kg
                      </span>
                    </div>
                  </div>

                  {/* Cost Composition Horizontal Bar */}
                  <div className="mt-4">
                    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div style={{ width: `${simpleIngPct}%` }} className="bg-amber-500" title="Ingredients" />
                      <div style={{ width: `${simplePkgPct}%` }} className="bg-sky-500" title="Packaging" />
                      <div style={{ width: `${simpleLabPct}%` }} className="bg-violet-500" title="Labor" />
                      <div style={{ width: `${simpleProfPct}%` }} className="bg-emerald-500" title="Net Profit" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-xs bg-amber-500" /> Ingredients
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-xs bg-sky-500" /> Box
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-xs bg-violet-500" /> Labor
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-xs bg-emerald-500" /> Profit
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        void triggerCopy(
                          'simple-quote',
                          simpleQuoteText,
                          'Copied customer quote (without your private costs)!'
                        )
                      }
                      className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-bold text-foreground transition-colors hover:border-brand hover:text-brand"
                    >
                      {copiedKey === 'simple-quote' ? (
                        <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                      ) : (
                        <Copy className="size-3.5" aria-hidden="true" />
                      )}
                      Copy Quote
                    </button>
                    <a
                      href={simpleWaHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
                    >
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                      WhatsApp Quote
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= MODE 2: FULL PRO PRICING SUITE ================= */
            <div className="space-y-5">
              {/* Pro Access Banner if Locked */}
              {!isProUnlocked && (
                <div className="flex flex-col justify-between gap-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500 text-neutral-950">
                      <Crown className="size-4.5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-foreground">
                        Full Pro Bakery Pricing Suite — Live Preview Mode
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Explore the 4 starter cake templates below. Unlock custom ingredient editing, saved recipes, Direct Online Ordering, and 1-click Storefront publishing with the FindMyBites Business Plan ({formatPlanPrice(SAAS_PLANS[1], currency, 'monthly')}/mo Auto-Pay or {formatPlanPrice(SAAS_PLANS[1], currency, 'annual')}/yr · 2 months free).
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {!user && (
                      <button
                        type="button"
                        onClick={onSignIn}
                        className="h-9 cursor-pointer rounded-lg border border-border bg-card px-3 text-xs font-bold text-foreground hover:border-brand"
                      >
                        Sign in (Pro Baker)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onUpgradePlan();
                      }}
                      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-4 text-xs font-extrabold text-brand-foreground hover:bg-brand-hover"
                    >
                      <Sparkles className="size-3.5" aria-hidden="true" />
                      Unlock Pro Kit
                    </button>
                  </div>
                </div>
              )}

              {/* Starter Recipe Templates + Saved Recipes Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Templates:
                  </span>
                  {starterTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setProDraft(tpl)}
                      className={`cursor-pointer rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        proDraft.id === tpl.id
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSaveCurrentRecipe}
                  className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors ${
                    isProUnlocked
                      ? 'border-border bg-card text-foreground hover:border-brand hover:text-brand'
                      : 'border-border bg-muted text-muted-foreground'
                  }`}
                >
                  {isProUnlocked ? (
                    <Save className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Lock className="size-3.5" aria-hidden="true" />
                  )}
                  Save Recipe
                </button>
              </div>

              {/* Saved Recipes Row (if any) */}
              {savedRecipes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <Bookmark className="size-3" aria-hidden="true" />
                    My Saved ({savedRecipes.length}):
                  </span>
                  {savedRecipes.map((rec) => (
                    <div
                      key={rec.id}
                      className="inline-flex items-center overflow-hidden rounded-md border border-border bg-card text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => setProDraft(rec)}
                        className="cursor-pointer px-2.5 py-1 font-semibold text-foreground hover:text-brand"
                      >
                        {rec.name}
                      </button>
                      {isProUnlocked && (
                        <button
                          type="button"
                          aria-label={`Delete ${rec.name}`}
                          onClick={() =>
                            setSavedRecipes((prev) => prev.filter((r) => r.id !== rec.id))
                          }
                          className="cursor-pointer border-l border-border px-1.5 py-1 text-muted-foreground hover:text-rose-600"
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Top 4-KPI Summary Strip (Flat hairline dashboard metrics) */}
              <div className="grid grid-cols-2 divide-y divide-border rounded-xl border border-border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Production Cost
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black tabular-nums text-foreground">
                    {formatLocalAmount(proCalc.totalProductionCost, currency)}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    Ing {formatLocalAmount(proCalc.ingredientsTotal, currency)} · Lab {formatLocalAmount(proCalc.laborTotal, currency)}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">
                    Recommended Price
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black tabular-nums text-brand">
                    {formatLocalAmount(proCalc.recommendedPrice, currency)}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {formatLocalAmount(proCalc.pricePerKg, currency)}/kg · {scaledProWeight} kg
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Net Profit
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatLocalAmount(proCalc.netProfitRecommended, currency)}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {proCalc.effectiveMarginPct.toFixed(1)}% real margin
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Price per Serving
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black tabular-nums text-foreground">
                    {formatLocalAmount(proCalc.pricePerServing, currency)}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {scaledProServings} servings · {proCalc.laborHours.toFixed(1)}h labor
                  </p>
                </div>
              </div>

              {/* Main Pro Grid: Left Recipe Table & Costs (8 cols), Right 3-Tier Strategy & Export (4 cols) */}
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="space-y-5 lg:col-span-8">
                  {/* Recipe Header + Tier Scaler */}
                  <div className="grid gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <label htmlFor="pro-recipe-name" className="block text-xs font-semibold text-foreground">
                        Recipe / Cake Name
                      </label>
                      <input
                        id="pro-recipe-name"
                        type="text"
                        value={proDraft.name}
                        readOnly={!isProUnlocked}
                        onClick={() => !isProUnlocked && requireProOrNotify()}
                        onChange={(e) => setProDraft((p) => ({ ...p, name: e.target.value }))}
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="pro-weight" className="block text-xs font-semibold text-foreground">
                        Base kg
                      </label>
                      <input
                        id="pro-weight"
                        type="number"
                        step="0.25"
                        min="0.25"
                        value={proDraft.weightKg}
                        readOnly={!isProUnlocked}
                        onChange={(e) =>
                          setProDraft((p) => ({ ...p, weightKg: Math.max(0.25, Number(e.target.value) || 0.25) }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-2.5 font-mono text-sm tabular-nums text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="pro-servings" className="block text-xs font-semibold text-foreground">
                        Servings
                      </label>
                      <input
                        id="pro-servings"
                        type="number"
                        min="1"
                        value={proDraft.servings}
                        readOnly={!isProUnlocked}
                        onChange={(e) =>
                          setProDraft((p) => ({ ...p, servings: Math.max(1, Number(e.target.value) || 1) }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-2.5 font-mono text-sm tabular-nums text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="pro-scale" className="block text-xs font-semibold text-foreground">
                        Tier Scale
                      </label>
                      <select
                        id="pro-scale"
                        value={proDraft.scaleMultiplier}
                        onChange={(e) => {
                          if (!requireProOrNotify()) return;
                          setProDraft((p) => ({ ...p, scaleMultiplier: Number(e.target.value) }));
                        }}
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-2 font-mono text-xs font-bold text-foreground focus:border-brand focus:outline-none"
                      >
                        <option value={0.5}>0.5× Mini</option>
                        <option value={1}>1× Base</option>
                        <option value={1.5}>1.5× Tall</option>
                        <option value={2}>2× 2-Tier</option>
                        <option value={3}>3× Wedding</option>
                      </select>
                    </div>
                  </div>

                  {/* Ingredient Costing Table */}
                  <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-foreground">
                          Recipe Ingredients ({proDraft.ingredients.length})
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          Auto-converts g ↔ kg, ml ↔ L, tbsp &amp; cups into exact recipe cost.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          aria-label="Choose pantry ingredient"
                          value={selectedPantryKey}
                          onChange={(e) => setSelectedPantryKey(e.target.value)}
                          className="h-8 max-w-[190px] rounded-md border border-border bg-background px-2 text-xs text-foreground focus:border-brand focus:outline-none"
                        >
                          {BAKER_PANTRY_PRESETS.map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddPantryIngredient}
                          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md bg-foreground px-2.5 text-xs font-bold text-background hover:opacity-90"
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          Pantry
                        </button>
                        <button
                          type="button"
                          onClick={handleAddBlankIngredient}
                          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          Custom
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/50 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            <th className="px-3 py-2.5">Ingredient</th>
                            <th className="px-2 py-2.5">Pack Price</th>
                            <th className="px-2 py-2.5">Pack Size</th>
                            <th className="px-2 py-2.5">Used ({proDraft.scaleMultiplier}×)</th>
                            <th className="px-3 py-2.5 text-right">Line Cost</th>
                            <th className="w-9 px-2 py-2.5" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {proDraft.ingredients.map((ing) => {
                            const lineCost = computeIngredientLineCost(ing, proDraft.scaleMultiplier);
                            return (
                              <tr key={ing.id} className="hover:bg-muted/30">
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={ing.name}
                                    readOnly={!isProUnlocked}
                                    onChange={(e) =>
                                      handleUpdateIngredient(ing.id, { name: e.target.value })
                                    }
                                    className="w-full bg-transparent font-medium text-foreground focus:outline-none"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={ing.packPriceLocal}
                                    readOnly={!isProUnlocked}
                                    onChange={(e) =>
                                      handleUpdateIngredient(ing.id, {
                                        packPriceLocal: Math.max(0, Number(e.target.value) || 0),
                                      })
                                    }
                                    className="h-7 w-20 rounded border border-border bg-background px-1.5 font-mono tabular-nums text-foreground focus:border-brand focus:outline-none"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0.1"
                                      step="any"
                                      value={ing.packSize}
                                      readOnly={!isProUnlocked}
                                      onChange={(e) =>
                                        handleUpdateIngredient(ing.id, {
                                          packSize: Math.max(0.01, Number(e.target.value) || 1),
                                        })
                                      }
                                      className="h-7 w-16 rounded border border-border bg-background px-1.5 font-mono tabular-nums text-foreground focus:border-brand focus:outline-none"
                                    />
                                    <select
                                      value={ing.packUnit}
                                      disabled={!isProUnlocked}
                                      onChange={(e) =>
                                        handleUpdateIngredient(ing.id, {
                                          packUnit: e.target.value as 'g' | 'kg' | 'ml' | 'L' | 'pcs',
                                        })
                                      }
                                      className="h-7 rounded border border-border bg-background px-1 font-mono text-[11px] text-foreground"
                                    >
                                      {PACK_UNITS.map((u) => (
                                        <option key={u} value={u}>
                                          {u}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={ing.usedQty}
                                      readOnly={!isProUnlocked}
                                      onChange={(e) =>
                                        handleUpdateIngredient(ing.id, {
                                          usedQty: Math.max(0, Number(e.target.value) || 0),
                                        })
                                      }
                                      className="h-7 w-16 rounded border border-border bg-background px-1.5 font-mono tabular-nums text-foreground focus:border-brand focus:outline-none"
                                    />
                                    <select
                                      value={ing.usedUnit}
                                      disabled={!isProUnlocked}
                                      onChange={(e) =>
                                        handleUpdateIngredient(ing.id, {
                                          usedUnit: e.target.value as IngredientUnit,
                                        })
                                      }
                                      className="h-7 rounded border border-border bg-background px-1 font-mono text-[11px] text-foreground"
                                    >
                                      {USED_UNITS.map((u) => (
                                        <option key={u} value={u}>
                                          {u}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold tabular-nums text-foreground">
                                  {formatLocalAmount(lineCost, currency, currency === 'USD' || currency === 'AED' ? 2 : 0)}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  <button
                                    type="button"
                                    aria-label={`Remove ${ing.name}`}
                                    onClick={() => handleRemoveIngredient(ing.id)}
                                    className="cursor-pointer rounded p-1 text-muted-foreground hover:text-rose-600"
                                  >
                                    <Trash2 className="size-3.5" aria-hidden="true" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border bg-muted/40 font-semibold">
                            <td colSpan={4} className="px-3 py-2 text-xs text-muted-foreground">
                              Ingredients Subtotal (+ {proDraft.wastagePct}% wastage buffer ={' '}
                              <span className="font-mono text-foreground">
                                {formatLocalAmount(proCalc.wastageCost, currency)}
                              </span>
                              )
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs font-extrabold tabular-nums text-foreground">
                              {formatLocalAmount(proCalc.ingredientsTotal, currency)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Multi-Stage Labor + Overhead & Packaging Matrix */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Multi-Stage Labor Costing
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-foreground">
                            Baking &amp; Prep (hrs)
                          </label>
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={proDraft.bakingHours}
                            readOnly={!isProUnlocked}
                            onChange={(e) =>
                              setProDraft((p) => ({ ...p, bakingHours: Math.max(0, Number(e.target.value) || 0) }))
                            }
                            className="mt-1 h-8 w-full rounded border border-border bg-background px-2 font-mono text-xs tabular-nums text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-foreground">
                            Fondant / Decor (hrs)
                          </label>
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={proDraft.decorHours}
                            readOnly={!isProUnlocked}
                            onChange={(e) =>
                              setProDraft((p) => ({ ...p, decorHours: Math.max(0, Number(e.target.value) || 0) }))
                            }
                            className="mt-1 h-8 w-full rounded border border-border bg-background px-2 font-mono text-xs tabular-nums text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-foreground">
                            Chat &amp; Cleanup (hrs)
                          </label>
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={proDraft.adminCleanupHours}
                            readOnly={!isProUnlocked}
                            onChange={(e) =>
                              setProDraft((p) => ({
                                ...p,
                                adminCleanupHours: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            className="mt-1 h-8 w-full rounded border border-border bg-background px-2 font-mono text-xs tabular-nums text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-foreground">
                            Hourly Rate ({CURRENCIES[currency].symbol.trim()})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={proDraft.hourlyRateLocal}
                            readOnly={!isProUnlocked}
                            onChange={(e) =>
                              setProDraft((p) => ({
                                ...p,
                                hourlyRateLocal: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            className="mt-1 h-8 w-full rounded border border-border bg-background px-2 font-mono text-xs tabular-nums text-foreground"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-xs">
                        <span className="text-muted-foreground">Total Labor ({proCalc.laborHours.toFixed(1)}h)</span>
                        <span className="font-mono font-bold tabular-nums text-foreground">
                          {formatLocalAmount(proCalc.laborTotal, currency)}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Overhead, Packaging &amp; Delivery
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-foreground">
                            Oven / Power (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="40"
                            value={proDraft.overheadPct}
                            readOnly={!isProUnlocked}
                            onChange={(e) =>
                              setProDraft((p) => ({ ...p, overheadPct: Math.max(0, Number(e.target.value) || 0) }))
                            }
                            className="mt-1 h-8 w-full rounded border border-border bg-background px-2 font-mono text-xs tabular-nums text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-foreground">
                            Wastage Buffer (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={proDraft.wastagePct}
                            readOnly={!isProUnlocked}
                            onChange={(e) =>
                              setProDraft((p) => ({ ...p, wastagePct: Math.max(0, Number(e.target.value) || 0) }))
                            }
                            className="mt-1 h-8 w-full rounded border border-border bg-background px-2 font-mono text-xs tabular-nums text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-foreground">
                            Board &amp; Box ({CURRENCIES[currency].symbol.trim()})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={proDraft.packagingLocal}
                            readOnly={!isProUnlocked}
                            onChange={(e) =>
                              setProDraft((p) => ({ ...p, packagingLocal: Math.max(0, Number(e.target.value) || 0) }))
                            }
                            className="mt-1 h-8 w-full rounded border border-border bg-background px-2 font-mono text-xs tabular-nums text-foreground"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-foreground">
                            Toppers / Dowels ({CURRENCIES[currency].symbol.trim()})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={proDraft.toppersDowelsLocal}
                            readOnly={!isProUnlocked}
                            onChange={(e) =>
                              setProDraft((p) => ({
                                ...p,
                                toppersDowelsLocal: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            className="mt-1 h-8 w-full rounded border border-border bg-background px-2 font-mono text-xs tabular-nums text-foreground"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-2.5 text-xs">
                        <label htmlFor="pro-delivery" className="text-muted-foreground">
                          Delivery Fee ({CURRENCIES[currency].symbol.trim()})
                        </label>
                        <input
                          id="pro-delivery"
                          type="number"
                          min="0"
                          value={proDraft.deliveryLocal}
                          readOnly={!isProUnlocked}
                          onChange={(e) =>
                            setProDraft((p) => ({ ...p, deliveryLocal: Math.max(0, Number(e.target.value) || 0) }))
                          }
                          className="h-7 w-24 rounded border border-border bg-background px-2 text-right font-mono text-xs tabular-nums text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: 3-Tier Pricing Strategy + Quote + Storefront Publish (4 cols) */}
                <div className="space-y-4 lg:col-span-4">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Target Margin
                      </p>
                      <span className="font-mono text-sm font-extrabold tabular-nums text-brand">
                        {proDraft.targetMarginPct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="70"
                      step="1"
                      value={proDraft.targetMarginPct}
                      onChange={(e) => {
                        if (!requireProOrNotify()) return;
                        setProDraft((p) => ({ ...p, targetMarginPct: Number(e.target.value) }));
                      }}
                      className="mt-2.5 h-2 w-full cursor-pointer accent-brand"
                    />

                    {/* 3-Tier Retail Pricing Matrix */}
                    <div className="mt-4 divide-y divide-border border-t border-border">
                      <div className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-xs font-bold text-foreground">Quick Sale Floor</p>
                          <p className="text-[11px] text-muted-foreground">Break-even + 22% minimum</p>
                        </div>
                        <p className="font-mono text-sm font-bold tabular-nums text-foreground">
                          {formatLocalAmount(proCalc.quickSalePrice, currency)}
                        </p>
                      </div>
                      <div className="-mx-4 flex items-center justify-between bg-brand/10 px-4 py-3">
                        <div>
                          <p className="text-xs font-extrabold text-brand">Recommended Retail</p>
                          <p className="text-[11px] text-muted-foreground">
                            Net profit {formatLocalAmount(proCalc.netProfitRecommended, currency)}
                          </p>
                        </div>
                        <p className="font-mono text-lg font-black tabular-nums text-brand">
                          {formatLocalAmount(proCalc.recommendedPrice, currency)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-xs font-bold text-foreground">Luxury / Bespoke</p>
                          <p className="text-[11px] text-muted-foreground">+18% custom artistry</p>
                        </div>
                        <p className="font-mono text-sm font-bold tabular-nums text-foreground">
                          {formatLocalAmount(proCalc.luxuryPrice, currency)}
                        </p>
                      </div>
                    </div>

                    {/* Full Cost Ledger */}
                    <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Ingredients + Wastage</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {formatLocalAmount(proCalc.ingredientsTotal, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Labor ({proCalc.laborHours.toFixed(1)} hrs)</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {formatLocalAmount(proCalc.laborTotal, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Overhead ({proDraft.overheadPct}%)</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {formatLocalAmount(proCalc.overheadCost, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Box, Toppers &amp; Delivery</span>
                        <span className="font-mono tabular-nums text-foreground">
                          {formatLocalAmount(proCalc.packagingAndDecorHardware + proCalc.deliveryCost, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Customer Quote Export */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!requireProOrNotify()) return;
                          void triggerCopy(
                            'pro-quote',
                            proQuoteText,
                            'Copied clean customer quote!'
                          );
                        }}
                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-bold text-foreground hover:border-brand hover:text-brand"
                      >
                        {copiedKey === 'pro-quote' ? (
                          <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                        ) : (
                          <Copy className="size-3.5" aria-hidden="true" />
                        )}
                        Copy Quote
                      </button>
                      {isProUnlocked ? (
                        <a
                          href={proWaHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          <MessageCircle className="size-3.5" aria-hidden="true" />
                          WhatsApp
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={requireProOrNotify}
                          className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-muted px-2.5 text-xs font-bold text-muted-foreground"
                        >
                          <Lock className="size-3.5" aria-hidden="true" />
                          WhatsApp
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Publish to FindMyBites Storefront */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <Store className="size-4 text-brand" aria-hidden="true" />
                      <p className="text-xs font-extrabold text-foreground">
                        Publish Direct to Storefront
                      </p>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Push this priced cake straight onto your FindMyBites storefront catalog with 1 click.
                    </p>
                    {isProUnlocked && myVendors.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {myVendors.length > 1 && (
                          <select
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            className="h-8 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground"
                          >
                            {myVendors.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name} ({v.city})
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          disabled={publishingToStore}
                          onClick={() => void handlePublishToStorefront()}
                          className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-extrabold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          {publishingToStore
                            ? 'Adding to Storefront…'
                            : `Add at ${formatLocalAmount(proCalc.recommendedPrice, currency)}`}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onUpgradePlan();
                        }}
                        className="mt-3 inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-brand bg-brand/10 px-3 text-xs font-extrabold text-brand hover:bg-brand hover:text-brand-foreground"
                      >
                        <Crown className="size-3.5" aria-hidden="true" />
                        {isProUnlocked ? 'Create Storefront First' : 'Upgrade to Pro to Publish'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
