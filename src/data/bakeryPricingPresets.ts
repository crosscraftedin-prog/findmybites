import { CURRENCIES, CurrencyCode } from './vendors';

export type IngredientUnit = 'g' | 'kg' | 'ml' | 'L' | 'pcs' | 'tbsp' | 'cup';

export interface RecipeIngredient {
  id: string;
  name: string;
  packPriceLocal: number;
  packSize: number;
  packUnit: 'g' | 'kg' | 'ml' | 'L' | 'pcs';
  usedQty: number;
  usedUnit: IngredientUnit;
}

export interface PantryPreset {
  key: string;
  name: string;
  packPriceUsd: number;
  packSize: number;
  packUnit: 'g' | 'kg' | 'ml' | 'L' | 'pcs';
  defaultUsedQty: number;
  defaultUsedUnit: IngredientUnit;
}

export interface ProRecipeDraft {
  id: string;
  name: string;
  category: string;
  weightKg: number;
  servings: number;
  scaleMultiplier: number;
  ingredients: RecipeIngredient[];
  bakingHours: number;
  decorHours: number;
  adminCleanupHours: number;
  hourlyRateLocal: number;
  overheadPct: number;
  wastagePct: number;
  packagingLocal: number;
  toppersDowelsLocal: number;
  deliveryLocal: number;
  targetMarginPct: number;
  updatedAt?: string;
}

export interface ProPricingBreakdown {
  ingredientsBase: number;
  wastageCost: number;
  ingredientsTotal: number;
  laborHours: number;
  laborTotal: number;
  overheadCost: number;
  packagingAndDecorHardware: number;
  deliveryCost: number;
  totalProductionCost: number;
  breakEvenPrice: number;
  quickSalePrice: number;
  recommendedPrice: number;
  luxuryPrice: number;
  netProfitRecommended: number;
  effectiveMarginPct: number;
  pricePerKg: number;
  pricePerServing: number;
}

/**
 * Convert pack / used quantities into a comparable base unit (grams, ml, or pcs).
 * If pack is mass (g/kg) and used is tbsp/cup, assumes standard baking density
 * (1 tbsp ≈ 15g, 1 cup ≈ 240g/ml).
 */
export function toComparableUnits(qty: number, unit: IngredientUnit): { family: 'mass' | 'vol' | 'count'; base: number } {
  const safe = Math.max(0, Number(qty) || 0);
  switch (unit) {
    case 'kg':
      return { family: 'mass', base: safe * 1000 };
    case 'g':
      return { family: 'mass', base: safe };
    case 'L':
      return { family: 'vol', base: safe * 1000 };
    case 'ml':
      return { family: 'vol', base: safe };
    case 'tbsp':
      return { family: 'vol', base: safe * 15 };
    case 'cup':
      return { family: 'vol', base: safe * 240 };
    case 'pcs':
      return { family: 'count', base: safe };
  }
}

export function computeIngredientLineCost(item: RecipeIngredient, scaleMultiplier = 1): number {
  const packPrice = Math.max(0, Number(item.packPriceLocal) || 0);
  const packConv = toComparableUnits(item.packSize, item.packUnit);
  const usedConv = toComparableUnits(item.usedQty * scaleMultiplier, item.usedUnit);
  if (packConv.base <= 0 || usedConv.base <= 0) return 0;

  // If pack is count (pcs) and used is not pcs, fallback to direct ratio
  if (packConv.family === 'count' && usedConv.family !== 'count') {
    return (packPrice / packConv.base) * Math.max(0, item.usedQty * scaleMultiplier);
  }
  return (packPrice / packConv.base) * usedConv.base;
}

export function formatLocalAmount(amount: number, currency: CurrencyCode, decimals = 0): string {
  const cfg = CURRENCIES[currency];
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const formatted = safe.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${cfg.symbol}${formatted}`;
}

export function roundToNicePrice(amount: number, currency: CurrencyCode): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (currency === 'INR' || currency === 'LKR' || currency === 'PKR' || currency === 'BDT' || currency === 'NPR') {
    return Math.ceil(amount / 10) * 10;
  }
  return Math.ceil(amount);
}

export function computeProRecipePricing(draft: ProRecipeDraft, currency: CurrencyCode): ProPricingBreakdown {
  const scale = Math.max(0.25, Number(draft.scaleMultiplier) || 1);
  const ingredientsBase = draft.ingredients.reduce(
    (sum, item) => sum + computeIngredientLineCost(item, scale),
    0
  );
  const wastagePct = Math.max(0, Math.min(40, Number(draft.wastagePct) || 0));
  const wastageCost = ingredientsBase * (wastagePct / 100);
  const ingredientsTotal = ingredientsBase + wastageCost;

  // Labor scales sub-linearly for multi-tier batches (1 + (scale - 1) * 0.65)
  const laborScale = scale === 1 ? 1 : 1 + (scale - 1) * 0.65;
  const laborHours =
    (Math.max(0, Number(draft.bakingHours) || 0) +
      Math.max(0, Number(draft.decorHours) || 0) +
      Math.max(0, Number(draft.adminCleanupHours) || 0)) *
    laborScale;
  const laborTotal = laborHours * Math.max(0, Number(draft.hourlyRateLocal) || 0);

  const overheadPct = Math.max(0, Math.min(50, Number(draft.overheadPct) || 0));
  const overheadCost = (ingredientsTotal + laborTotal) * (overheadPct / 100);

  const packagingAndDecorHardware =
    (Math.max(0, Number(draft.packagingLocal) || 0) + Math.max(0, Number(draft.toppersDowelsLocal) || 0)) *
    (scale > 1.5 ? 1.5 : 1);
  const deliveryCost = Math.max(0, Number(draft.deliveryLocal) || 0);

  const totalProductionCost =
    ingredientsTotal + laborTotal + overheadCost + packagingAndDecorHardware + deliveryCost;

  const targetMargin = Math.max(10, Math.min(75, Number(draft.targetMarginPct) || 35));
  const rawRecommended = totalProductionCost / (1 - targetMargin / 100);

  const breakEvenPrice = roundToNicePrice(totalProductionCost, currency);
  const quickSalePrice = roundToNicePrice(totalProductionCost * 1.22, currency);
  const recommendedPrice = roundToNicePrice(rawRecommended, currency);
  const luxuryPrice = roundToNicePrice(rawRecommended * 1.18, currency);

  const netProfitRecommended = Math.max(0, recommendedPrice - totalProductionCost);
  const effectiveMarginPct =
    recommendedPrice > 0 ? (netProfitRecommended / recommendedPrice) * 100 : 0;

  const scaledWeight = Math.max(0.25, (Number(draft.weightKg) || 1) * scale);
  const scaledServings = Math.max(1, Math.round((Number(draft.servings) || 10) * scale));

  return {
    ingredientsBase,
    wastageCost,
    ingredientsTotal,
    laborHours,
    laborTotal,
    overheadCost,
    packagingAndDecorHardware,
    deliveryCost,
    totalProductionCost,
    breakEvenPrice,
    quickSalePrice,
    recommendedPrice,
    luxuryPrice,
    netProfitRecommended,
    effectiveMarginPct,
    pricePerKg: recommendedPrice / scaledWeight,
    pricePerServing: recommendedPrice / scaledServings,
  };
}

export const BAKER_PANTRY_PRESETS: PantryPreset[] = [
  { key: 'flour', name: 'All-Purpose Flour (Maida)', packPriceUsd: 0.9, packSize: 1, packUnit: 'kg', defaultUsedQty: 250, defaultUsedUnit: 'g' },
  { key: 'butter', name: 'Unsalted Butter', packPriceUsd: 3.4, packSize: 500, packUnit: 'g', defaultUsedQty: 150, defaultUsedUnit: 'g' },
  { key: 'sugar', name: 'Caster Sugar', packPriceUsd: 1.4, packSize: 1, packUnit: 'kg', defaultUsedQty: 220, defaultUsedUnit: 'g' },
  { key: 'dark-choc', name: 'Belgian Dark Chocolate (54%)', packPriceUsd: 14.5, packSize: 1, packUnit: 'kg', defaultUsedQty: 280, defaultUsedUnit: 'g' },
  { key: 'cream', name: 'Heavy Whipping Cream', packPriceUsd: 3.2, packSize: 1, packUnit: 'L', defaultUsedQty: 300, defaultUsedUnit: 'ml' },
  { key: 'cocoa', name: 'Dutch-Processed Cocoa Powder', packPriceUsd: 5.5, packSize: 500, packUnit: 'g', defaultUsedQty: 55, defaultUsedUnit: 'g' },
  { key: 'eggs', name: 'Free-Range Eggs', packPriceUsd: 1.5, packSize: 12, packUnit: 'pcs', defaultUsedQty: 4, defaultUsedUnit: 'pcs' },
  { key: 'fondant', name: 'Sugar Fondant Paste', packPriceUsd: 6.5, packSize: 1, packUnit: 'kg', defaultUsedQty: 300, defaultUsedUnit: 'g' },
  { key: 'cream-cheese', name: 'Cream Cheese', packPriceUsd: 7.2, packSize: 1, packUnit: 'kg', defaultUsedQty: 250, defaultUsedUnit: 'g' },
  { key: 'vanilla', name: 'Pure Vanilla Extract', packPriceUsd: 6.0, packSize: 100, packUnit: 'ml', defaultUsedQty: 15, defaultUsedUnit: 'ml' },
  { key: 'dry-fruits', name: 'Soaked Christmas Dry Fruits & Spices', packPriceUsd: 10.5, packSize: 1, packUnit: 'kg', defaultUsedQty: 350, defaultUsedUnit: 'g' },
  { key: 'nuts', name: 'Roasted Almonds & Walnuts', packPriceUsd: 13.0, packSize: 1, packUnit: 'kg', defaultUsedQty: 120, defaultUsedUnit: 'g' },
  { key: 'berries', name: 'Fresh Strawberries / Berries', packPriceUsd: 4.0, packSize: 250, packUnit: 'g', defaultUsedQty: 150, defaultUsedUnit: 'g' },
  { key: 'milk', name: 'Full-Cream Milk / Buttermilk', packPriceUsd: 0.9, packSize: 1, packUnit: 'L', defaultUsedQty: 200, defaultUsedUnit: 'ml' },
];

function scaleUsd(usd: number, currency: CurrencyCode): number {
  const rate = CURRENCIES[currency].rate || 1;
  const raw = usd * rate;
  if (rate >= 50) return Math.round(raw / 5) * 5;
  return Number(raw.toFixed(2));
}

export function buildStarterRecipes(currency: CurrencyCode): ProRecipeDraft[] {
  const pick = (key: string, usedQty?: number, usedUnit?: IngredientUnit): RecipeIngredient => {
    const p = BAKER_PANTRY_PRESETS.find((x) => x.key === key) ?? BAKER_PANTRY_PRESETS[0];
    return {
      id: `ing-${key}-${Math.random().toString(36).slice(2, 6)}`,
      name: p.name,
      packPriceLocal: scaleUsd(p.packPriceUsd, currency),
      packSize: p.packSize,
      packUnit: p.packUnit,
      usedQty: usedQty ?? p.defaultUsedQty,
      usedUnit: usedUnit ?? p.defaultUsedUnit,
    };
  };

  return [
    {
      id: 'tpl-truffle-1kg',
      name: 'Belgian Chocolate Truffle Cake (1 kg)',
      category: 'Bakers & Cakes',
      weightKg: 1,
      servings: 10,
      scaleMultiplier: 1,
      ingredients: [
        pick('dark-choc', 300, 'g'),
        pick('cream', 300, 'ml'),
        pick('flour', 220, 'g'),
        pick('sugar', 200, 'g'),
        pick('cocoa', 55, 'g'),
        pick('butter', 100, 'g'),
        pick('eggs', 3, 'pcs'),
        pick('vanilla', 10, 'ml'),
      ],
      bakingHours: 1.25,
      decorHours: 0.75,
      adminCleanupHours: 0.5,
      hourlyRateLocal: scaleUsd(3.5, currency),
      overheadPct: 10,
      wastagePct: 5,
      packagingLocal: scaleUsd(1.3, currency),
      toppersDowelsLocal: scaleUsd(0.9, currency),
      deliveryLocal: 0,
      targetMarginPct: 38,
    },
    {
      id: 'tpl-xmas-plum-1kg',
      name: 'Spiced Christmas Plum Cake (1 kg)',
      category: 'Bakers & Cakes',
      weightKg: 1,
      servings: 12,
      scaleMultiplier: 1,
      ingredients: [
        pick('dry-fruits', 380, 'g'),
        pick('nuts', 140, 'g'),
        pick('butter', 180, 'g'),
        pick('flour', 240, 'g'),
        pick('sugar', 180, 'g'),
        pick('eggs', 4, 'pcs'),
        pick('vanilla', 15, 'ml'),
      ],
      bakingHours: 1.75,
      decorHours: 0.5,
      adminCleanupHours: 0.5,
      hourlyRateLocal: scaleUsd(3.5, currency),
      overheadPct: 12,
      wastagePct: 5,
      packagingLocal: scaleUsd(2.0, currency),
      toppersDowelsLocal: scaleUsd(1.2, currency),
      deliveryLocal: 0,
      targetMarginPct: 42,
    },
    {
      id: 'tpl-wedding-2tier',
      name: '2-Tier Floral Wedding Cake (3 kg)',
      category: 'Bakers & Cakes',
      weightKg: 3,
      servings: 32,
      scaleMultiplier: 1,
      ingredients: [
        pick('flour', 680, 'g'),
        pick('butter', 450, 'g'),
        pick('sugar', 580, 'g'),
        pick('cream-cheese', 500, 'g'),
        pick('cream', 600, 'ml'),
        pick('eggs', 9, 'pcs'),
        pick('fondant', 600, 'g'),
        pick('berries', 250, 'g'),
      ],
      bakingHours: 3.0,
      decorHours: 3.5,
      adminCleanupHours: 1.5,
      hourlyRateLocal: scaleUsd(4.5, currency),
      overheadPct: 12,
      wastagePct: 6,
      packagingLocal: scaleUsd(4.2, currency),
      toppersDowelsLocal: scaleUsd(5.5, currency),
      deliveryLocal: scaleUsd(4.0, currency),
      targetMarginPct: 45,
    },
    {
      id: 'tpl-cupcakes-12',
      name: 'Gourmet Swirl Cupcakes (Box of 12)',
      category: 'Home Bakers & Cloud Kitchens',
      weightKg: 0.85,
      servings: 12,
      scaleMultiplier: 1,
      ingredients: [
        pick('flour', 190, 'g'),
        pick('butter', 160, 'g'),
        pick('sugar', 200, 'g'),
        pick('cream-cheese', 200, 'g'),
        pick('dark-choc', 120, 'g'),
        pick('eggs', 3, 'pcs'),
        pick('vanilla', 10, 'ml'),
      ],
      bakingHours: 0.75,
      decorHours: 0.75,
      adminCleanupHours: 0.5,
      hourlyRateLocal: scaleUsd(3.5, currency),
      overheadPct: 10,
      wastagePct: 5,
      packagingLocal: scaleUsd(1.5, currency),
      toppersDowelsLocal: scaleUsd(0.7, currency),
      deliveryLocal: 0,
      targetMarginPct: 40,
    },
  ];
}
