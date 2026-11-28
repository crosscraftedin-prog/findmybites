import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_MARKETING_CONFIG,
  DEFAULT_MYSTERY_BOX_PACKAGES,
  MYSTERY_BOX_SEASONAL_PRESETS,
  type MysteryBoxAssignedItem,
  type MysteryBoxContentsAuditEntry,
  type MysteryBoxCoupon,
  type MysteryBoxCuratedItem,
  type MysteryBoxDeliveryStatus,
  type MysteryBoxDietaryType,
  type MysteryBoxFinanceSummary,
  type MysteryBoxFulfillmentModel,
  type MysteryBoxMarketingConfig,
  type MysteryBoxOrder,
  type MysteryBoxPackage,
  type MysteryBoxSeasonalEdition,
  type MysteryBoxTheme,
  type MysteryBoxVendorFulfillment,
  type MysteryBoxVendorSubmission,
} from '../../src/data/mysteryBoxes.ts';

interface DecodedUser {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

interface MicroReq {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
  query: Record<string, unknown>;
  body: unknown;
  ip?: string;
  user?: DecodedUser;
}

interface MicroRes {
  headersSent?: boolean;
  status: (code: number) => MicroRes;
  json: (payload: unknown) => unknown;
}

type MicroNext = () => void | Promise<unknown>;
type MicroHandler = (req: MicroReq, res: MicroRes, next: MicroNext) => unknown | Promise<unknown>;

export interface MicroRouterLike {
  get: (path: string, ...handlers: MicroHandler[]) => void;
  post: (path: string, ...handlers: MicroHandler[]) => void;
  put: (path: string, ...handlers: MicroHandler[]) => void;
  patch: (path: string, ...handlers: MicroHandler[]) => void;
  delete: (path: string, ...handlers: MicroHandler[]) => void;
}

export interface MysteryBoxRouterDeps {
  getSupabase: () => SupabaseClient;
  requireAuth: MicroHandler;
  requireAdmin: MicroHandler;
  isRootAdmin: (user?: DecodedUser) => boolean;
  mediaBucket: string;
  uploadDataUrlIfNeeded: (
    supabase: SupabaseClient,
    value: unknown,
    pathPrefix: string
  ) => Promise<string | null>;
  handleApiError: (res: MicroRes, err: unknown, fallback: string) => unknown;
}

const PACKAGES_OBJECT = 'mystery-boxes/packages.json';
const ORDERS_OBJECT = 'mystery-boxes/orders.json';
const SUBMISSIONS_OBJECT = 'mystery-boxes/submissions.json';
const MARKETING_OBJECT = 'mystery-boxes/marketing.json';

const VALID_THEMES = new Set<MysteryBoxTheme>([
  'everyday',
  'christmas',
  'birthday',
  'chocolate',
  'brownie',
  'valentines',
  'kids',
  'anniversary',
  'corporate',
  'festival',
]);

const VALID_FULFILLMENT = new Set<MysteryBoxFulfillmentModel>([
  'single_vendor',
  'central_packing',
  'fulfillment_partner',
]);

const VALID_DELIVERY_STATUS = new Set<MysteryBoxDeliveryStatus>([
  'payment_pending',
  'confirmed',
  'vendor_preparing',
  'packing',
  'dispatched',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
]);

// Serialize state mutations in-process to prevent lost updates on concurrent checkouts/admin saves
let writeChain: Promise<void> = Promise.resolve();
async function withMysteryBoxLock<T>(task: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const prev = writeChain;
  writeChain = prev.then(() => gate);
  await prev;
  try {
    return await task();
  } finally {
    release();
  }
}

function clampStr(val: unknown, min: number, max: number, fallback = ''): string {
  const s = typeof val === 'string' ? val.trim() : '';
  if (s.length < min) return fallback;
  return s.slice(0, max);
}

function sanitizeId(val: unknown, prefix = 'mb'): string {
  const raw = typeof val === 'string' ? val.trim().toLowerCase() : '';
  const cleaned = raw.replace(/[^a-z0-9_-]/g, '').slice(0, 64);
  if (cleaned.length >= 3) return cleaned;
  return `${prefix}-${crypto.randomBytes(5).toString('hex')}`;
}

function sanitizeSlug(val: unknown): string {
  const raw = typeof val === 'string' ? val.trim().toLowerCase() : '';
  const slug = raw
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || `mystery-box-${Date.now().toString(36)}`;
}

function getSigningSecret(): string {
  return (
    process.env.MYSTERY_BOX_SIGNING_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'findmybites-local-fallback-signing-key-v1'
  );
}

function createPaymentSessionToken(orderId: string, userId: string, amountInr: number): string {
  const exp = Date.now() + 30 * 60 * 1000; // 30 minutes
  const payload = `${orderId}|${userId}|${Math.round(amountInr)}|${exp}`;
  const sig = crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`, 'utf8').toString('base64url');
}

function verifyPaymentSessionToken(
  token: string,
  expectedOrderId: string,
  expectedUserId: string,
  expectedAmountInr: number
): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('|');
    if (parts.length !== 5) return false;
    const [orderId, userId, amountStr, expStr, providedSig] = parts;
    if (orderId !== expectedOrderId || userId !== expectedUserId) return false;
    if (Number(amountStr) !== Math.round(expectedAmountInr)) return false;
    if (Date.now() > Number(expStr)) return false;
    const payload = `${orderId}|${userId}|${amountStr}|${expStr}`;
    const expectedSig = crypto
      .createHmac('sha256', getSigningSecret())
      .update(payload)
      .digest('hex');
    const a = Buffer.from(providedSig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function readJsonFromBucket<T>(
  supabase: SupabaseClient,
  bucket: string,
  objectPath: string,
  fallback: T
): Promise<T> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(objectPath);
    if (error || !data) return fallback;
    const text = await data.text();
    if (!text.trim()) return fallback;
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonToBucket(
  supabase: SupabaseClient,
  bucket: string,
  objectPath: string,
  payload: unknown
): Promise<void> {
  const buffer = Buffer.from(JSON.stringify(payload), 'utf8');
  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: 'application/json',
    cacheControl: '0',
    upsert: true,
  });
  if (error) {
    throw new Error(error.message);
  }
}

const SPOILER_WORD_RE =
  /\b(brownie|brownies|cookie|cookies|cupcake|cupcakes|cake|cakes|chocolate|chocolates|pastry|pastries|macaron|macarons|truffle|truffles|praline|pralines|blondie|tartlet|bonbon|bonbons)\b/i;

const LEGACY_PUBLIC_TAGLINES = new Set([
  'a delightful little surprise.',
  'more goodies, more happiness.',
  'a grand celebration in a box.',
  'luxury treats & surprises.',
  'the ultimate bakery surprise experience.',
]);

const PUBLIC_CATEGORY_LEAK_RE = /\b(bakery|goodies|same[- ]day)\b/i;

function stripPublicPackageSecrets(pkg: MysteryBoxPackage): MysteryBoxPackage {
  const { curatedItems: _hidden, ...publicPkg } = pkg;
  const seededMatch = DEFAULT_MYSTERY_BOX_PACKAGES.find((d) => d.id === pkg.id);
  const rawTagline = (publicPkg.tagline || '').trim();
  const isLegacyTagline = LEGACY_PUBLIC_TAGLINES.has(rawTagline.toLowerCase());
  const safeTagline =
    isLegacyTagline || SPOILER_WORD_RE.test(rawTagline)
      ? seededMatch?.tagline || 'Unwrap the surprise!'
      : rawTagline;
  const safeDescription =
    SPOILER_WORD_RE.test(publicPkg.description || '') ||
    PUBLIC_CATEGORY_LEAK_RE.test(publicPkg.description || '')
      ? seededMatch?.description ||
        'A beautifully sealed FindMyBites mystery box delivered in Hyderabad. Exact items stay 100% secret until you complete checkout and unwrap online.'
      : publicPkg.description;
  const safeAllergenNotice = SPOILER_WORD_RE.test(publicPkg.allergenNotice || '')
    ? seededMatch?.allergenNotice ||
      'Prepared in artisan kitchens that handle wheat (gluten), dairy, soy, and tree nuts. Select 100% Eggless / Veg at checkout if required.'
    : publicPkg.allergenNotice;
  const safeStorageNote = SPOILER_WORD_RE.test(publicPkg.storageNote || '')
    ? seededMatch?.storageNote ||
      'Store in a cool, dry place or refrigerate chilled items upon delivery. Best enjoyed within 48 hours.'
    : publicPkg.storageNote;
  const safeDeliveryTime =
    /same[- ]day/i.test(publicPkg.estimatedDeliveryTime || '') ||
    !(publicPkg.estimatedDeliveryTime || '').toLowerCase().includes('hyderabad')
      ? seededMatch?.estimatedDeliveryTime ||
        'Next-Day / Scheduled Delivery (Hyderabad · Min 24 hrs)'
      : publicPkg.estimatedDeliveryTime;
  const safeTheme: MysteryBoxPackage['theme'] =
    publicPkg.theme === 'chocolate' || publicPkg.theme === 'brownie'
      ? 'everyday'
      : publicPkg.theme;
  return {
    ...publicPkg,
    theme: safeTheme,
    tagline: safeTagline,
    description: safeDescription,
    allergenNotice: safeAllergenNotice,
    storageNote: safeStorageNote,
    deliveryCities: ['Hyderabad'],
    estimatedDeliveryTime: safeDeliveryTime,
    categoryExpectations: ['Mystery'],
  };
}

const VALID_SEASONAL_EDITIONS = new Set<MysteryBoxSeasonalEdition>([
  'christmas',
  'classic',
  'valentines',
  'diwali',
  'new_year',
]);

const LEGACY_NON_CHRISTMAS_HEADLINES = new Set([
  "don't just buy a treat. unwrap a surprise!",
]);

const LEGACY_NON_CHRISTMAS_TAGLINES = new Set([
  'the bigger the box, the bigger the surprise!',
]);

function normalizeSeasonalEdition(raw: unknown): MysteryBoxSeasonalEdition {
  if (typeof raw === 'string' && VALID_SEASONAL_EDITIONS.has(raw as MysteryBoxSeasonalEdition)) {
    return raw as MysteryBoxSeasonalEdition;
  }
  return 'christmas';
}

function sanitizePublicMarketing(marketing: MysteryBoxMarketingConfig): MysteryBoxMarketingConfig {
  const edition = normalizeSeasonalEdition(marketing.seasonalEdition);
  const preset = MYSTERY_BOX_SEASONAL_PRESETS[edition];
  const rawHeadline = (marketing.campaignHeadline || '').trim();
  const rawTagline = (marketing.campaignTagline || '').trim();
  const rawSubheading = (marketing.campaignSubheading || '').trim();
  const rawBanner = (marketing.seasonalBannerText || '').trim();

  const shouldUpgradeHeadline =
    SPOILER_WORD_RE.test(rawHeadline) ||
    (edition === 'christmas' && LEGACY_NON_CHRISTMAS_HEADLINES.has(rawHeadline.toLowerCase()));
  const shouldUpgradeTagline =
    SPOILER_WORD_RE.test(rawTagline) ||
    (edition === 'christmas' && LEGACY_NON_CHRISTMAS_TAGLINES.has(rawTagline.toLowerCase()));
  const shouldUpgradeSubheading =
    SPOILER_WORD_RE.test(rawSubheading) ||
    (edition === 'christmas' && rawSubheading.toLowerCase().includes('bakery & goodies'));
  const shouldUpgradeBanner =
    SPOILER_WORD_RE.test(rawBanner) ||
    (edition === 'christmas' &&
      rawBanner.toLowerCase().startsWith('use code unwrap100'));

  return {
    ...marketing,
    seasonalEdition: edition,
    campaignHeadline: shouldUpgradeHeadline ? preset.campaignHeadline : rawHeadline || preset.campaignHeadline,
    campaignTagline: shouldUpgradeTagline ? preset.campaignTagline : rawTagline || preset.campaignTagline,
    campaignSubheading: shouldUpgradeSubheading ? preset.campaignSubheading : rawSubheading || preset.campaignSubheading,
    seasonalBannerText: shouldUpgradeBanner ? preset.seasonalBannerText : rawBanner,
    coupons: marketing.coupons.filter((c) => c.active),
  };
}

function stripOrderForCustomer(order: MysteryBoxOrder): MysteryBoxOrder {
  const base: MysteryBoxOrder = {
    ...order,
    vendorCostTotalInr: undefined,
    packagingCostInr: undefined,
    deliveryExpenseInr: undefined,
    platformCommissionInr: undefined,
    netProfitInr: undefined,
    contentsAuditLog: undefined,
  };
  if (order.paymentStatus !== 'verified') {
    base.assignedItems = undefined;
    base.assignedTotalRetailValueInr = undefined;
  }
  return base;
}

function reserveCuratedItemsForOrder(
  pkg: MysteryBoxPackage,
  dietaryPreference: 'any' | 'eggless_only'
): {
  assignedItems: MysteryBoxAssignedItem[];
  totalRetailValueInr: number;
  totalVendorCostInr: number;
  vendorFulfillments: MysteryBoxVendorFulfillment[];
} {
  const pool = Array.isArray(pkg.curatedItems) ? pkg.curatedItems : [];
  let primary = pool.filter((item) => !item.isBackupAlternative);
  const backups = pool.filter((item) => item.isBackupAlternative);

  if (dietaryPreference === 'eggless_only') {
    const filteredPrimary = primary.filter(
      (i) => i.dietary === 'eggless' || i.dietary === 'veg'
    );
    const filteredBackups = backups.filter(
      (i) => i.dietary === 'eggless' || i.dietary === 'veg'
    );
    if (filteredPrimary.length > 0) {
      primary = filteredPrimary;
    }
    if (primary.length < pkg.minGoodiesCount && filteredBackups.length > 0) {
      primary = [...primary, ...filteredBackups];
    }
  }

  let selected: MysteryBoxCuratedItem[] = primary.length > 0 ? [...primary] : [...pool];

  // Guarantee minimum retail value using backup items if pool was under-valued
  let retailTotal = selected.reduce((sum, item) => sum + Math.max(0, item.retailValueInr), 0);
  if (retailTotal < pkg.guaranteedMinValueInr && backups.length > 0) {
    for (const backup of backups) {
      if (selected.some((s) => s.id === backup.id)) continue;
      selected.push(backup);
      retailTotal += Math.max(0, backup.retailValueInr);
      if (retailTotal >= pkg.guaranteedMinValueInr) break;
    }
  }

  // Fallback safeguard if admin cleared pool completely
  if (selected.length === 0) {
    selected = [
      {
        id: 'fallback-curated-1',
        productName: `${pkg.name} Chef's Curated Bakery Assortment`,
        category: 'Bakery Goodies',
        shortDescription: 'Freshly baked brownies, cookies, cupcakes, and handmade chocolates.',
        quantity: Math.max(4, pkg.minGoodiesCount),
        unitLabel: 'assorted goodies',
        vendorId: 'fmb-central',
        vendorName: 'FindMyBites Curated Kitchen',
        vendorContributionCostInr: Math.round(pkg.priceInr * 0.52),
        retailValueInr: Math.max(pkg.guaranteedMinValueInr, pkg.priceInr),
        image: pkg.image,
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '48 hours chilled',
        prepHours: 4,
        showVendorName: true,
      },
    ];
  }

  const assignedItems: MysteryBoxAssignedItem[] = selected.map((item) => ({
    id: item.id,
    productName: item.productName,
    category: item.category,
    shortDescription: item.shortDescription,
    quantity: Math.max(1, Math.round(item.quantity || 1)),
    unitLabel: item.unitLabel || 'pcs',
    vendorId: item.vendorId || 'fmb-central',
    vendorName: item.vendorName || 'FindMyBites Partner Baker',
    showVendorName: item.showVendorName !== false,
    image: item.image || pkg.image,
    dietary: item.dietary || 'eggless',
    allergens: Array.isArray(item.allergens) ? item.allergens : [],
    bestBefore: item.bestBefore || '48 hours chilled',
    vendorContributionCostInr: Math.max(0, Math.round(item.vendorContributionCostInr || 0)),
    retailValueInr: Math.max(0, Math.round(item.retailValueInr || 0)),
  }));

  const totalRetailValueInr = Math.max(
    pkg.guaranteedMinValueInr,
    assignedItems.reduce((sum, i) => sum + i.retailValueInr, 0)
  );
  const totalVendorCostInr = assignedItems.reduce(
    (sum, i) => sum + i.vendorContributionCostInr,
    0
  );

  // Group vendor fulfillment tasks
  const byVendor = new Map<string, MysteryBoxVendorFulfillment>();
  const nowIso = new Date().toISOString();
  for (const item of assignedItems) {
    const existing = byVendor.get(item.vendorId);
    if (existing) {
      existing.itemNames.push(`${item.productName} (${item.quantity} ${item.unitLabel})`);
      existing.totalVendorCostInr += item.vendorContributionCostInr;
    } else {
      byVendor.set(item.vendorId, {
        vendorId: item.vendorId,
        vendorName: item.vendorName,
        itemNames: [`${item.productName} (${item.quantity} ${item.unitLabel})`],
        totalVendorCostInr: item.vendorContributionCostInr,
        status: 'assigned',
        payoutStatus: 'pending',
        updatedAt: nowIso,
      });
    }
  }

  return {
    assignedItems,
    totalRetailValueInr,
    totalVendorCostInr,
    vendorFulfillments: Array.from(byVendor.values()),
  };
}

function evaluateCoupon(
  coupons: MysteryBoxCoupon[],
  codeRaw: unknown,
  packagePriceInr: number
): { coupon: MysteryBoxCoupon | null; discountInr: number; error?: string } {
  const code = typeof codeRaw === 'string' ? codeRaw.trim().toUpperCase() : '';
  if (!code) return { coupon: null, discountInr: 0 };

  const found = coupons.find((c) => c.active && c.code.toUpperCase() === code);
  if (!found) {
    return { coupon: null, discountInr: 0, error: 'Invalid or inactive promo code.' };
  }
  if (found.expiresAt && Date.now() > new Date(found.expiresAt).getTime()) {
    return { coupon: null, discountInr: 0, error: 'This promo code has expired.' };
  }
  if (packagePriceInr < found.minOrderInr) {
    return {
      coupon: null,
      discountInr: 0,
      error: `Valid on Mystery Boxes ₹${found.minOrderInr} and above.`,
    };
  }
  const rawDiscount =
    found.type === 'percent'
      ? Math.round((packagePriceInr * Math.min(70, found.value)) / 100)
      : Math.round(found.value);
  const capped = Math.min(
    packagePriceInr,
    found.maxDiscountInr > 0 ? Math.min(rawDiscount, found.maxDiscountInr) : rawDiscount
  );
  return { coupon: found, discountInr: Math.max(0, capped) };
}

function computeFinanceSummary(orders: MysteryBoxOrder[]): MysteryBoxFinanceSummary {
  const verified = orders.filter((o) => o.paymentStatus === 'verified');
  return verified.reduce<MysteryBoxFinanceSummary>(
    (acc, o) => {
      acc.totalVerifiedOrders += 1;
      acc.totalGrossRevenueInr += o.sellingPriceInr || 0;
      acc.totalDeliveryCollectedInr += o.deliveryFeeInr || 0;
      acc.totalDiscountsInr += o.discountInr || 0;
      acc.totalVendorCostInr += o.vendorCostTotalInr || 0;
      acc.totalPackagingCostInr += o.packagingCostInr || 0;
      acc.totalDeliveryExpenseInr += o.deliveryExpenseInr || 0;
      acc.totalPlatformCommissionInr += o.platformCommissionInr || 0;
      acc.totalNetProfitInr += o.netProfitInr || 0;
      return acc;
    },
    {
      totalVerifiedOrders: 0,
      totalGrossRevenueInr: 0,
      totalDeliveryCollectedInr: 0,
      totalDiscountsInr: 0,
      totalVendorCostInr: 0,
      totalPackagingCostInr: 0,
      totalDeliveryExpenseInr: 0,
      totalPlatformCommissionInr: 0,
      totalNetProfitInr: 0,
    }
  );
}

export function registerMysteryBoxRoutes(baseRouter: MicroRouterLike, deps: MysteryBoxRouterDeps) {
  const router: MicroRouterLike = {
    get: (p, ...h) => baseRouter.get(`/mystery-boxes${p}`, ...h),
    post: (p, ...h) => baseRouter.post(`/mystery-boxes${p}`, ...h),
    put: (p, ...h) => baseRouter.put(`/mystery-boxes${p}`, ...h),
    patch: (p, ...h) => baseRouter.patch(`/mystery-boxes${p}`, ...h),
    delete: (p, ...h) => baseRouter.delete(`/mystery-boxes${p}`, ...h),
  };

  async function loadPackages(supabase: SupabaseClient): Promise<MysteryBoxPackage[]> {
    const stored = await readJsonFromBucket<{ packages?: MysteryBoxPackage[] }>(
      supabase,
      deps.mediaBucket,
      PACKAGES_OBJECT,
      {}
    );
    if (Array.isArray(stored.packages) && stored.packages.length > 0) {
      return stored.packages.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
    }
    return DEFAULT_MYSTERY_BOX_PACKAGES;
  }

  async function savePackages(
    supabase: SupabaseClient,
    packages: MysteryBoxPackage[]
  ): Promise<void> {
    await writeJsonToBucket(supabase, deps.mediaBucket, PACKAGES_OBJECT, {
      packages,
      updatedAt: new Date().toISOString(),
    });
  }

  async function loadOrders(supabase: SupabaseClient): Promise<MysteryBoxOrder[]> {
    const stored = await readJsonFromBucket<{ orders?: MysteryBoxOrder[] }>(
      supabase,
      deps.mediaBucket,
      ORDERS_OBJECT,
      {}
    );
    return Array.isArray(stored.orders) ? stored.orders : [];
  }

  async function saveOrders(supabase: SupabaseClient, orders: MysteryBoxOrder[]): Promise<void> {
    await writeJsonToBucket(supabase, deps.mediaBucket, ORDERS_OBJECT, {
      orders,
      updatedAt: new Date().toISOString(),
    });
  }

  async function loadSubmissions(
    supabase: SupabaseClient
  ): Promise<MysteryBoxVendorSubmission[]> {
    const stored = await readJsonFromBucket<{ submissions?: MysteryBoxVendorSubmission[] }>(
      supabase,
      deps.mediaBucket,
      SUBMISSIONS_OBJECT,
      {}
    );
    return Array.isArray(stored.submissions) ? stored.submissions : [];
  }

  async function saveSubmissions(
    supabase: SupabaseClient,
    submissions: MysteryBoxVendorSubmission[]
  ): Promise<void> {
    await writeJsonToBucket(supabase, deps.mediaBucket, SUBMISSIONS_OBJECT, {
      submissions,
      updatedAt: new Date().toISOString(),
    });
  }

  async function loadMarketing(supabase: SupabaseClient): Promise<MysteryBoxMarketingConfig> {
    const stored = await readJsonFromBucket<Partial<MysteryBoxMarketingConfig>>(
      supabase,
      deps.mediaBucket,
      MARKETING_OBJECT,
      {}
    );
    return {
      ...DEFAULT_MARKETING_CONFIG,
      ...stored,
      coupons:
        Array.isArray(stored.coupons) && stored.coupons.length > 0
          ? stored.coupons
          : DEFAULT_MARKETING_CONFIG.coupons,
    };
  }

  async function saveMarketing(
    supabase: SupabaseClient,
    marketing: MysteryBoxMarketingConfig
  ): Promise<void> {
    await writeJsonToBucket(supabase, deps.mediaBucket, MARKETING_OBJECT, {
      ...marketing,
      updatedAt: new Date().toISOString(),
    });
  }

  // =========================================================================
  // PUBLIC CATALOG (Secrets stripped — customers never see exact surprise items)
  // =========================================================================
  router.get('/catalog', async (_req, res) => {
    try {
      const supabase = deps.getSupabase();
      const [packages, marketing] = await Promise.all([
        loadPackages(supabase),
        loadMarketing(supabase),
      ]);
      const publicPackages = packages
        .filter((p) => p.active !== false)
        .map(stripPublicPackageSecrets);

      res.json({
        packages: publicPackages,
        marketing: sanitizePublicMarketing(marketing),
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
      });
    } catch (err) {
      deps.handleApiError(res, err, 'Failed to load Mystery Boxes catalog.');
    }
  });

  // Validate coupon server-side
  router.post('/coupons/validate', async (req, res) => {
    try {
      const supabase = deps.getSupabase();
      const { code, packageId } = (req.body || {}) as Record<string, unknown>;
      const [packages, marketing] = await Promise.all([
        loadPackages(supabase),
        loadMarketing(supabase),
      ]);
      const pkg = packages.find((p) => p.id === packageId && p.active !== false);
      if (!pkg) {
        return res.status(404).json({ error: 'Selected Mystery Box package was not found.' });
      }
      const result = evaluateCoupon(marketing.coupons, code, pkg.priceInr);
      if (result.error) {
        return res.status(400).json({ error: result.error });
      }
      res.json({
        valid: Boolean(result.coupon),
        code: result.coupon?.code || '',
        description: result.coupon?.description || '',
        discountInr: result.discountInr,
      });
    } catch (err) {
      deps.handleApiError(res, err, 'Could not validate promo code.');
    }
  });

  // =========================================================================
  // CUSTOMER ORDERS: INITIATE -> VERIFY PAYMENT -> UNBOX -> TRACK
  // =========================================================================
  router.post('/orders/initiate', deps.requireAuth, async (req: MicroReq, res) => {
    try {
      const user = req.user!;
      const body = (req.body || {}) as Record<string, unknown>;
      const packageId = clampStr(body.packageId, 2, 80);
      const idempotencyKey = clampStr(
        body.idempotencyKey,
        6,
        120,
        `idem-${user.uid}-${Date.now()}`
      );
      const customerName = clampStr(body.customerName, 2, 100);
      const customerPhone = clampStr(body.customerPhone, 7, 24);
      const isGift = Boolean(body.isGift);
      const recipientName = clampStr(
        isGift ? body.recipientName : customerName,
        2,
        100,
        customerName
      );
      const recipientPhone = clampStr(
        isGift ? body.recipientPhone : customerPhone,
        7,
        24,
        customerPhone
      );
      const deliveryAddress = clampStr(body.deliveryAddress, 6, 360);
      const deliveryCity = clampStr(body.deliveryCity, 2, 80, 'Hyderabad');
      const deliveryDate = clampStr(body.deliveryDate, 8, 20);
      const deliverySlot = clampStr(body.deliverySlot, 3, 60);
      const giftMessage = clampStr(body.giftMessage, 0, 320, '');
      const dietaryPreference =
        body.dietaryPreference === 'eggless_only' ? 'eggless_only' : 'any';
      const paymentMethod =
        body.paymentMethod === 'card' ||
        body.paymentMethod === 'netbanking' ||
        body.paymentMethod === 'razorpay'
          ? body.paymentMethod
          : 'upi';

      if (!packageId || !customerName || !customerPhone || !deliveryAddress) {
        return res
          .status(400)
          .json({ error: 'Please complete your name, phone, and Hyderabad delivery address.' });
      }
      if (deliveryCity.trim().toLowerCase() !== 'hyderabad') {
        return res.status(400).json({
          error: 'Mystery Box delivery is currently available exclusively in Hyderabad.',
        });
      }
      if (!deliveryDate || !deliverySlot) {
        return res
          .status(400)
          .json({ error: 'Please select a scheduled delivery date and time slot.' });
      }
      // Enforce NO same-day delivery (IST calendar date check)
      const nowIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      const todayIstIso = nowIst.toISOString().slice(0, 10);
      if (deliveryDate <= todayIstIso) {
        return res.status(400).json({
          error: 'Same-day delivery is not available. Please choose tomorrow or a later date.',
        });
      }

      const supabase = deps.getSupabase();

      const result = await withMysteryBoxLock(async () => {
        const [packages, orders, marketing] = await Promise.all([
          loadPackages(supabase),
          loadOrders(supabase),
          loadMarketing(supabase),
        ]);

        // Idempotency protection: reuse existing pending order for the same user + key
        const existing = orders.find(
          (o) => o.idempotencyKey === idempotencyKey && o.userId === user.uid
        );
        if (existing) {
          const paymentSessionToken = createPaymentSessionToken(
            existing.id,
            user.uid,
            existing.totalPaidInr
          );
          return { order: existing, paymentSessionToken, marketing };
        }

        const pkg = packages.find((p) => p.id === packageId && p.active !== false);
        if (!pkg) {
          throw new Error('Selected Mystery Box is no longer available.');
        }
        if (!pkg.deliveryAvailable || pkg.stockCount <= 0) {
          throw new Error('This Mystery Box is currently out of stock.');
        }

        const couponEval = evaluateCoupon(marketing.coupons, body.couponCode, pkg.priceInr);
        if (body.couponCode && couponEval.error) {
          throw new Error(couponEval.error);
        }

        const deliveryFeeInr =
          pkg.priceInr >= marketing.freeDeliveryAboveInr
            ? 0
            : Math.max(0, pkg.deliveryFeeInr ?? marketing.defaultDeliveryFeeInr);
        const totalPaidInr = Math.max(
          1,
          pkg.priceInr + deliveryFeeInr - couponEval.discountInr
        );

        // Reserve & snapshot immutable contents BEFORE payment verification
        const reserved = reserveCuratedItemsForOrder(pkg, dietaryPreference);
        const packagingCostInr = Math.max(0, pkg.packagingCostInr || 0);
        const deliveryExpenseInr = Math.max(0, pkg.estimatedDeliveryCostInr || 0);
        const platformCommissionInr = Math.round(
          ((pkg.priceInr - couponEval.discountInr) *
            Math.max(0, Math.min(50, marketing.platformCommissionPercent || 18))) /
            100
        );
        const netProfitInr =
          totalPaidInr -
          reserved.totalVendorCostInr -
          packagingCostInr -
          deliveryExpenseInr;

        const nowIso = new Date().toISOString();
        const orderId = `mbo-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
        const orderRef = `FMB-MB-${Math.floor(100000 + crypto.randomInt(899999))}`;

        const newOrder: MysteryBoxOrder = {
          id: orderId,
          orderRef,
          idempotencyKey,
          userId: user.uid,
          customerName,
          customerEmail: user.email || '',
          customerPhone,
          packageId: pkg.id,
          packageName: pkg.name,
          packageImage: pkg.image,
          theme: pkg.theme,
          sellingPriceInr: pkg.priceInr,
          deliveryFeeInr,
          discountInr: couponEval.discountInr,
          ...(couponEval.coupon ? { couponCode: couponEval.coupon.code } : {}),
          totalPaidInr,
          paymentStatus: 'pending',
          paymentMethod: process.env.RAZORPAY_KEY_ID ? 'razorpay' : paymentMethod,
          isGift,
          recipientName,
          recipientPhone,
          deliveryAddress,
          deliveryCity,
          deliveryDate,
          deliverySlot,
          ...(giftMessage ? { giftMessage } : {}),
          dietaryPreference,
          fulfillmentModel: pkg.fulfillmentModel,
          guaranteedMinValueInr: pkg.guaranteedMinValueInr,
          assignedItems: reserved.assignedItems,
          assignedTotalRetailValueInr: reserved.totalRetailValueInr,
          contentsAuditLog: [],
          deliveryStatus: 'payment_pending',
          vendorFulfillments: reserved.vendorFulfillments,
          vendorCostTotalInr: reserved.totalVendorCostInr,
          packagingCostInr,
          deliveryExpenseInr,
          platformCommissionInr,
          netProfitInr,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        orders.unshift(newOrder);
        await saveOrders(supabase, orders.slice(0, 1500));

        const paymentSessionToken = createPaymentSessionToken(
          newOrder.id,
          user.uid,
          newOrder.totalPaidInr
        );
        return { order: newOrder, paymentSessionToken, marketing };
      });

      // Optional real Razorpay order creation if credentials are configured in server env
      let razorpayOrder: { id: string; amount: number; currency: string } | null = null;
      const rzpKey = process.env.RAZORPAY_KEY_ID;
      const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
      if (rzpKey && rzpSecret) {
        try {
          const authHeader = Buffer.from(`${rzpKey}:${rzpSecret}`).toString('base64');
          const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: result.order.totalPaidInr * 100,
              currency: 'INR',
              receipt: result.order.orderRef,
              notes: { orderId: result.order.id, packageId: result.order.packageId },
            }),
          });
          if (rzpRes.ok) {
            razorpayOrder = (await rzpRes.json()) as {
              id: string;
              amount: number;
              currency: string;
            };
          }
        } catch {
          razorpayOrder = null;
        }
      }

      const upiUri = `upi://pay?pa=${encodeURIComponent(result.marketing.upiHandle)}&pn=${encodeURIComponent(result.marketing.upiMerchantName)}&am=${result.order.totalPaidInr}&cu=INR&tn=${encodeURIComponent(`Mystery Box ${result.order.orderRef}`)}`;

      res.status(201).json({
        order: stripOrderForCustomer(result.order),
        paymentSessionToken: result.paymentSessionToken,
        upiUri,
        upiHandle: result.marketing.upiHandle,
        upiMerchantName: result.marketing.upiMerchantName,
        razorpayKeyId: razorpayOrder ? rzpKey : null,
        razorpayOrder,
      });
    } catch (err) {
      deps.handleApiError(res, err, 'Unable to initiate Mystery Box order.');
    }
  });

  // Server-side Payment Verification (idempotent, HMAC-verified, decrements stock atomically)
  router.post(
    '/orders/:orderId/verify-payment',
    deps.requireAuth,
    async (req: MicroReq, res) => {
      try {
        const user = req.user!;
        const orderId = sanitizeId(req.params.orderId, 'mbo');
        const body = (req.body || {}) as Record<string, unknown>;
        const paymentSessionToken = clampStr(body.paymentSessionToken, 10, 600);
        const paymentProviderRef = clampStr(body.paymentProviderRef, 4, 120);
        const paymentMethod =
          body.paymentMethod === 'card' ||
          body.paymentMethod === 'netbanking' ||
          body.paymentMethod === 'razorpay'
            ? body.paymentMethod
            : 'upi';

        const razorpayOrderId = clampStr(body.razorpay_order_id, 0, 120);
        const razorpayPaymentId = clampStr(body.razorpay_payment_id, 0, 120);
        const razorpaySignature = clampStr(body.razorpay_signature, 0, 200);

        const supabase = deps.getSupabase();

        const verifiedOrder = await withMysteryBoxLock(async () => {
          const [orders, packages] = await Promise.all([
            loadOrders(supabase),
            loadPackages(supabase),
          ]);
          const idx = orders.findIndex((o) => o.id === orderId);
          if (idx === -1) {
            throw new Error('Order not found.');
          }
          const order = orders[idx];
          if (order.userId !== user.uid && !deps.isRootAdmin(user)) {
            const forbidden = new Error('You are not authorized to verify this order.');
            (forbidden as Error & { statusCode?: number }).statusCode = 403;
            throw forbidden;
          }

          // Idempotent duplicate callback handling
          if (order.paymentStatus === 'verified') {
            return order;
          }

          if (order.paymentStatus === 'refunded' || order.deliveryStatus === 'cancelled') {
            throw new Error('This order has already been cancelled or refunded.');
          }

          // Verify Razorpay signature if Razorpay is active
          const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
          if (rzpSecret && razorpayOrderId && razorpayPaymentId && razorpaySignature) {
            const expectedRzpSig = crypto
              .createHmac('sha256', rzpSecret)
              .update(`${razorpayOrderId}|${razorpayPaymentId}`)
              .digest('hex');
            const a = Buffer.from(razorpaySignature, 'hex');
            const b = Buffer.from(expectedRzpSig, 'hex');
            if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
              throw new Error('Payment gateway signature verification failed.');
            }
          } else {
            // Verify server-issued HMAC payment session token + valid transaction ref
            const sessionValid = verifyPaymentSessionToken(
              paymentSessionToken,
              order.id,
              order.userId,
              order.totalPaidInr
            );
            if (!sessionValid) {
              throw new Error('Invalid or expired payment verification session. Please retry checkout.');
            }
            if (!paymentProviderRef || paymentProviderRef.length < 6) {
              throw new Error('Please enter a valid payment transaction / UTR reference (min 6 chars).');
            }
            // Prevent replay of same transaction ref across different orders
            const duplicateRef = orders.find(
              (o) =>
                o.id !== order.id &&
                o.paymentStatus === 'verified' &&
                o.paymentProviderRef &&
                o.paymentProviderRef.toLowerCase() === paymentProviderRef.toLowerCase()
            );
            if (duplicateRef) {
              throw new Error('This payment reference has already been used for another order.');
            }
          }

          // Check and decrement package stock atomically
          const pkgIdx = packages.findIndex((p) => p.id === order.packageId);
          if (pkgIdx !== -1) {
            if (packages[pkgIdx].stockCount <= 0) {
              throw new Error('This Mystery Box just sold out before payment settled.');
            }
            packages[pkgIdx] = {
              ...packages[pkgIdx],
              stockCount: Math.max(0, packages[pkgIdx].stockCount - 1),
              updatedAt: new Date().toISOString(),
            };
            await savePackages(supabase, packages);
          }

          const nowIso = new Date().toISOString();
          const updated: MysteryBoxOrder = {
            ...order,
            paymentStatus: 'verified',
            paymentMethod: razorpayPaymentId ? 'razorpay' : paymentMethod,
            paymentProviderRef: razorpayPaymentId || paymentProviderRef,
            verifiedAt: nowIso,
            deliveryStatus: 'confirmed',
            updatedAt: nowIso,
          };
          orders[idx] = updated;
          await saveOrders(supabase, orders);
          return updated;
        });

        res.json({ order: stripOrderForCustomer(verifiedOrder) });
      } catch (err) {
        const statusCode = (err as Error & { statusCode?: number })?.statusCode;
        if (statusCode === 403) {
          return res.status(403).json({ error: (err as Error).message });
        }
        deps.handleApiError(res, err, 'Payment verification failed.');
      }
    }
  );

  // Mark payment failed (allows customer to retry safely)
  router.post(
    '/orders/:orderId/mark-failed',
    deps.requireAuth,
    async (req: MicroReq, res) => {
      try {
        const user = req.user!;
        const orderId = sanitizeId(req.params.orderId, 'mbo');
        const supabase = deps.getSupabase();

        await withMysteryBoxLock(async () => {
          const orders = await loadOrders(supabase);
          const idx = orders.findIndex((o) => o.id === orderId);
          if (idx === -1) return;
          const order = orders[idx];
          if (order.userId !== user.uid && !deps.isRootAdmin(user)) return;
          if (order.paymentStatus === 'verified') return;
          orders[idx] = {
            ...order,
            paymentStatus: 'failed',
            updatedAt: new Date().toISOString(),
          };
          await saveOrders(supabase, orders);
        });
        res.json({ ok: true });
      } catch (err) {
        deps.handleApiError(res, err, 'Could not update payment status.');
      }
    }
  );

  // List authenticated customer's own Mystery Box orders
  router.get('/orders/mine', deps.requireAuth, async (req: MicroReq, res) => {
    try {
      const user = req.user!;
      const supabase = deps.getSupabase();
      const orders = await loadOrders(supabase);
      const mine = orders
        .filter((o) => o.userId === user.uid)
        .map(stripOrderForCustomer);
      res.json({ orders: mine });
    } catch (err) {
      deps.handleApiError(res, err, 'Failed to load your Mystery Box orders.');
    }
  });

  // Get single Mystery Box order (strict owner or admin only)
  router.get('/orders/:orderId', deps.requireAuth, async (req: MicroReq, res) => {
    try {
      const user = req.user!;
      const orderId = sanitizeId(req.params.orderId, 'mbo');
      const supabase = deps.getSupabase();
      const orders = await loadOrders(supabase);
      const order = orders.find((o) => o.id === orderId || o.orderRef === req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: 'Mystery Box order not found.' });
      }
      if (order.userId !== user.uid && !deps.isRootAdmin(user)) {
        return res
          .status(403)
          .json({ error: 'You cannot view or open another customer’s Mystery Box.' });
      }
      res.json({
        order: deps.isRootAdmin(user) ? order : stripOrderForCustomer(order),
      });
    } catch (err) {
      deps.handleApiError(res, err, 'Failed to load Mystery Box order.');
    }
  });

  // Interactive Unboxing endpoint (idempotent, never mutates or randomizes assignedItems)
  router.post(
    '/orders/:orderId/unbox',
    deps.requireAuth,
    async (req: MicroReq, res) => {
      try {
        const user = req.user!;
        const orderId = sanitizeId(req.params.orderId, 'mbo');
        const supabase = deps.getSupabase();

        const order = await withMysteryBoxLock(async () => {
          const orders = await loadOrders(supabase);
          const idx = orders.findIndex((o) => o.id === orderId);
          if (idx === -1) {
            throw new Error('Mystery Box order not found.');
          }
          const found = orders[idx];
          if (found.userId !== user.uid && !deps.isRootAdmin(user)) {
            const forbidden = new Error('Only the order owner can unwrap this Mystery Box.');
            (forbidden as Error & { statusCode?: number }).statusCode = 403;
            throw forbidden;
          }
          if (found.paymentStatus !== 'verified') {
            throw new Error('Payment must be verified before unwrapping your Mystery Box.');
          }
          if (found.unboxedAt) {
            return found; // Never regenerate or change contents!
          }
          const nowIso = new Date().toISOString();
          const updated: MysteryBoxOrder = {
            ...found,
            unboxedAt: nowIso,
            updatedAt: nowIso,
          };
          orders[idx] = updated;
          await saveOrders(supabase, orders);
          return updated;
        });

        res.json({ order: stripOrderForCustomer(order) });
      } catch (err) {
        const statusCode = (err as Error & { statusCode?: number })?.statusCode;
        if (statusCode === 403) {
          return res.status(403).json({ error: (err as Error).message });
        }
        deps.handleApiError(res, err, 'Unable to unwrap Mystery Box.');
      }
    }
  );

  // =========================================================================
  // VENDOR PARTICIPATION & FULFILLMENT
  // =========================================================================
  router.get('/vendor/mine', deps.requireAuth, async (req: MicroReq, res) => {
    try {
      const user = req.user!;
      const supabase = deps.getSupabase();

      // Determine caller's owned vendor IDs from Supabase vendors table
      const { data: ownedVendors } = await supabase
        .from('vendors')
        .select('id, name, city')
        .eq('owner_id', user.uid);
      const ownedIds = new Set((ownedVendors || []).map((v) => String(v.id)));

      const [submissions, orders] = await Promise.all([
        loadSubmissions(supabase),
        loadOrders(supabase),
      ]);

      const mySubmissions = submissions.filter(
        (s) => s.ownerId === user.uid || ownedIds.has(s.vendorId)
      );

      // Find assigned fulfillment tasks belonging to caller's vendors
      const assignedFulfillments: Array<{
        orderId: string;
        orderRef: string;
        packageName: string;
        deliveryDate: string;
        deliverySlot: string;
        deliveryCity: string;
        deliveryStatus: MysteryBoxDeliveryStatus;
        fulfillment: MysteryBoxVendorFulfillment;
      }> = [];

      for (const order of orders) {
        if (order.paymentStatus !== 'verified') continue;
        for (const f of order.vendorFulfillments || []) {
          if (ownedIds.has(f.vendorId) || deps.isRootAdmin(user)) {
            assignedFulfillments.push({
              orderId: order.id,
              orderRef: order.orderRef,
              packageName: order.packageName,
              deliveryDate: order.deliveryDate,
              deliverySlot: order.deliverySlot,
              deliveryCity: order.deliveryCity,
              deliveryStatus: order.deliveryStatus,
              fulfillment: f,
            });
          }
        }
      }

      const totalEarnedInr = assignedFulfillments.reduce(
        (sum, item) => sum + (item.fulfillment.totalVendorCostInr || 0),
        0
      );

      res.json({
        submissions: mySubmissions,
        assignedFulfillments,
        totalEarnedInr,
      });
    } catch (err) {
      deps.handleApiError(res, err, 'Failed to load vendor Mystery Box data.');
    }
  });

  router.post('/vendor/submissions', deps.requireAuth, async (req: MicroReq, res) => {
    try {
      const user = req.user!;
      const body = (req.body || {}) as Record<string, unknown>;
      const vendorId = clampStr(body.vendorId, 2, 80);
      const productName = clampStr(body.productName, 2, 120);
      if (!vendorId || !productName) {
        return res.status(400).json({ error: 'Vendor and product name are required.' });
      }

      const supabase = deps.getSupabase();
      const { data: vendorRow } = await supabase
        .from('vendors')
        .select('id, name, owner_id, city')
        .eq('id', vendorId)
        .maybeSingle();

      if (
        !deps.isRootAdmin(user) &&
        (!vendorRow || String(vendorRow.owner_id || '') !== user.uid)
      ) {
        return res
          .status(403)
          .json({ error: 'You can only submit Mystery Box products for your own storefront.' });
      }

      const uploadedImage = body.image
        ? await deps.uploadDataUrlIfNeeded(
            supabase,
            body.image,
            `mystery-boxes/vendor-${sanitizeId(vendorId)}`
          )
        : null;

      const contributionPriceInr = Math.max(
        20,
        Math.min(25000, Math.round(Number(body.contributionPriceInr) || 120))
      );
      const retailValueInr = Math.max(
        contributionPriceInr,
        Math.min(50000, Math.round(Number(body.retailValueInr) || Math.round(contributionPriceInr * 1.6)))
      );

      const dietary: MysteryBoxDietaryType =
        body.dietary === 'veg' || body.dietary === 'non-veg' || body.dietary === 'mixed'
          ? body.dietary
          : 'eggless';

      const allergens = Array.isArray(body.allergens)
        ? body.allergens
            .map((a) => (typeof a === 'string' ? a.trim().slice(0, 40) : ''))
            .filter(Boolean)
            .slice(0, 10)
        : [];

      const deliveryAreas = Array.isArray(body.deliveryAreas)
        ? body.deliveryAreas
            .map((a) => (typeof a === 'string' ? a.trim().slice(0, 60) : ''))
            .filter(Boolean)
            .slice(0, 12)
        : [String(vendorRow?.city || 'Local City')];

      const nowIso = new Date().toISOString();
      const submission: MysteryBoxVendorSubmission = {
        id: `mbs-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
        vendorId,
        vendorName: clampStr(body.vendorName, 2, 100, String(vendorRow?.name || 'Partner Baker')),
        ownerId: user.uid,
        ownerEmail: user.email || '',
        city: clampStr(body.city, 2, 80, String(vendorRow?.city || 'Bengaluru')),
        deliveryAreas,
        productName,
        category: clampStr(body.category, 2, 60, 'Brownies'),
        shortDescription: clampStr(body.shortDescription, 2, 240, 'Freshly baked artisanal treat.'),
        quantityAvailable: Math.max(1, Math.min(500, Math.round(Number(body.quantityAvailable) || 10))),
        unitLabel: clampStr(body.unitLabel, 1, 30, 'pcs'),
        contributionPriceInr,
        retailValueInr,
        image: uploadedImage || 'preset:hero',
        prepTimeHours: Math.max(1, Math.min(72, Math.round(Number(body.prepTimeHours) || 4))),
        bestBefore: clampStr(body.bestBefore, 2, 80, '48 hours chilled'),
        dietary,
        allergens,
        status: 'pending',
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await withMysteryBoxLock(async () => {
        const list = await loadSubmissions(supabase);
        list.unshift(submission);
        await saveSubmissions(supabase, list.slice(0, 1000));
      });

      res.status(201).json({ submission });
    } catch (err) {
      deps.handleApiError(res, err, 'Failed to submit Mystery Box product.');
    }
  });

  router.patch(
    '/vendor/fulfillment/:orderId',
    deps.requireAuth,
    async (req: MicroReq, res) => {
      try {
        const user = req.user!;
        const orderId = sanitizeId(req.params.orderId, 'mbo');
        const body = (req.body || {}) as Record<string, unknown>;
        const vendorId = clampStr(body.vendorId, 2, 80);
        const rawStatus = body.status;
        if (
          rawStatus !== 'accepted' &&
          rawStatus !== 'preparing' &&
          rawStatus !== 'ready_for_pickup' &&
          rawStatus !== 'completed'
        ) {
          return res.status(400).json({ error: 'Invalid fulfillment status.' });
        }
        const status: 'accepted' | 'preparing' | 'ready_for_pickup' | 'completed' = rawStatus;

        const supabase = deps.getSupabase();
        const { data: ownedVendors } = await supabase
          .from('vendors')
          .select('id')
          .eq('owner_id', user.uid);
        const ownedIds = new Set((ownedVendors || []).map((v) => String(v.id)));
        if (!deps.isRootAdmin(user) && !ownedIds.has(vendorId)) {
          return res.status(403).json({ error: 'Not authorized to update this vendor task.' });
        }

        await withMysteryBoxLock(async () => {
          const orders = await loadOrders(supabase);
          const idx = orders.findIndex((o) => o.id === orderId);
          if (idx === -1) throw new Error('Order not found.');
          const order = orders[idx];
          const nowIso = new Date().toISOString();
          const nextFulfillments = (order.vendorFulfillments || []).map((f) =>
            f.vendorId === vendorId ? { ...f, status, updatedAt: nowIso } : f
          );
          let nextDeliveryStatus = order.deliveryStatus;
          if (status === 'preparing' && order.deliveryStatus === 'confirmed') {
            nextDeliveryStatus = 'vendor_preparing';
          } else if (
            status === 'ready_for_pickup' &&
            (order.deliveryStatus === 'confirmed' || order.deliveryStatus === 'vendor_preparing')
          ) {
            nextDeliveryStatus = 'packing';
          }
          orders[idx] = {
            ...order,
            vendorFulfillments: nextFulfillments,
            deliveryStatus: nextDeliveryStatus,
            updatedAt: nowIso,
          };
          await saveOrders(supabase, orders);
        });

        res.json({ ok: true });
      } catch (err) {
        deps.handleApiError(res, err, 'Could not update fulfillment status.');
      }
    }
  );

  // =========================================================================
  // ADMIN MANAGEMENT ENDPOINTS (Packages, Orders, Submissions, Finance, Marketing)
  // =========================================================================
  router.get('/admin/state', deps.requireAdmin, async (_req, res) => {
    try {
      const supabase = deps.getSupabase();
      const [packages, orders, submissions, marketing] = await Promise.all([
        loadPackages(supabase),
        loadOrders(supabase),
        loadSubmissions(supabase),
        loadMarketing(supabase),
      ]);
      res.json({
        packages,
        orders,
        submissions,
        marketing,
        finance: computeFinanceSummary(orders),
      });
    } catch (err) {
      deps.handleApiError(res, err, 'Failed to load Mystery Boxes admin state.');
    }
  });

  router.put('/admin/packages/:packageId', deps.requireAdmin, async (req: MicroReq, res) => {
    try {
      const supabase = deps.getSupabase();
      const packageId = sanitizeId(req.params.packageId, 'mbox');
      const p = (req.body || {}) as Record<string, unknown>;

      const uploadedImage = p.image
        ? await deps.uploadDataUrlIfNeeded(supabase, p.image, `mystery-boxes/pkg-${packageId}`)
        : null;
      const imageValue =
        uploadedImage ||
        (typeof p.image === 'string' && p.image.trim() ? p.image.trim() : 'preset:celebration');

      const theme: MysteryBoxTheme =
        typeof p.theme === 'string' && VALID_THEMES.has(p.theme as MysteryBoxTheme)
          ? (p.theme as MysteryBoxTheme)
          : 'everyday';

      const fulfillmentModel: MysteryBoxFulfillmentModel =
        typeof p.fulfillmentModel === 'string' &&
        VALID_FULFILLMENT.has(p.fulfillmentModel as MysteryBoxFulfillmentModel)
          ? (p.fulfillmentModel as MysteryBoxFulfillmentModel)
          : 'central_packing';

      const dietarySummary: MysteryBoxDietaryType =
        p.dietarySummary === 'veg' ||
        p.dietarySummary === 'non-veg' ||
        p.dietarySummary === 'mixed'
          ? p.dietarySummary
          : 'eggless';

      const priceInr = Math.max(99, Math.min(100000, Math.round(Number(p.priceInr) || 499)));
      const guaranteedMinValueInr = Math.max(
        priceInr,
        Math.min(200000, Math.round(Number(p.guaranteedMinValueInr) || Math.round(priceInr * 1.25)))
      );

      const rawPool = Array.isArray(p.curatedItems) ? p.curatedItems.slice(0, 24) : [];
      const curatedItems: MysteryBoxCuratedItem[] = [];
      for (let i = 0; i < rawPool.length; i++) {
        const item = (rawPool[i] || {}) as Record<string, unknown>;
        const itemId = sanitizeId(item.id || `${packageId}-item-${i + 1}`, 'mbi');
        const uploadedItemImg = item.image
          ? await deps.uploadDataUrlIfNeeded(
              supabase,
              item.image,
              `mystery-boxes/item-${itemId}`
            )
          : null;
        curatedItems.push({
          id: itemId,
          productName: clampStr(item.productName, 2, 120, `Goodie ${i + 1}`),
          category: clampStr(item.category, 2, 60, 'Bakery Goodies'),
          shortDescription: clampStr(item.shortDescription, 0, 220, 'Freshly curated treat.'),
          quantity: Math.max(1, Math.min(50, Math.round(Number(item.quantity) || 1))),
          unitLabel: clampStr(item.unitLabel, 1, 30, 'pcs'),
          vendorId: clampStr(item.vendorId, 1, 80, 'fmb-central'),
          vendorName: clampStr(item.vendorName, 2, 100, 'FindMyBites Partner Baker'),
          vendorContributionCostInr: Math.max(
            0,
            Math.min(50000, Math.round(Number(item.vendorContributionCostInr) || 100))
          ),
          retailValueInr: Math.max(
            0,
            Math.min(100000, Math.round(Number(item.retailValueInr) || 180))
          ),
          image:
            uploadedItemImg ||
            (typeof item.image === 'string' && item.image.trim() ? item.image.trim() : imageValue),
          dietary:
            item.dietary === 'veg' || item.dietary === 'non-veg' || item.dietary === 'mixed'
              ? item.dietary
              : 'eggless',
          allergens: Array.isArray(item.allergens)
            ? item.allergens
                .map((a) => (typeof a === 'string' ? a.trim().slice(0, 40) : ''))
                .filter(Boolean)
                .slice(0, 8)
            : [],
          bestBefore: clampStr(item.bestBefore, 2, 80, '48 hours chilled'),
          prepHours: Math.max(1, Math.min(72, Math.round(Number(item.prepHours) || 3))),
          isBackupAlternative: Boolean(item.isBackupAlternative),
          showVendorName: item.showVendorName !== false,
        });
      }

      const name = clampStr(p.name, 2, 100, 'Mystery Box');
      const savedPkg: MysteryBoxPackage = {
        id: packageId,
        slug: sanitizeSlug(p.slug || name),
        name,
        tagline: clampStr(p.tagline, 2, 140, 'Unwrap a sealed mystery surprise!'),
        theme,
        priceInr,
        guaranteedMinValueInr,
        minGoodiesCount: Math.max(1, Math.min(30, Math.round(Number(p.minGoodiesCount) || 4))),
        description: clampStr(
          p.description,
          5,
          900,
          'A sealed FindMyBites mystery box delivered across Hyderabad.'
        ),
        categoryExpectations: ['Mystery'],
        image: imageValue,
        gallery: [imageValue],
        stockCount: Math.max(0, Math.min(5000, Math.round(Number(p.stockCount) || 0))),
        deliveryAvailable: p.deliveryAvailable !== false,
        deliveryCities: ['Hyderabad'],
        estimatedDeliveryTime: clampStr(
          p.estimatedDeliveryTime,
          2,
          80,
          'Next-Day / Scheduled Delivery (Hyderabad · Min 24 hrs)'
        ),
        deliveryFeeInr: Math.max(0, Math.min(2000, Math.round(Number(p.deliveryFeeInr) || 0))),
        packagingCostInr: Math.max(0, Math.min(5000, Math.round(Number(p.packagingCostInr) || 60))),
        estimatedDeliveryCostInr: Math.max(
          0,
          Math.min(5000, Math.round(Number(p.estimatedDeliveryCostInr) || 75))
        ),
        fulfillmentModel,
        dietarySummary,
        allergenNotice: clampStr(
          p.allergenNotice,
          0,
          240,
          'Contains dairy, wheat/gluten, and cocoa. May contain traces of nuts.'
        ),
        storageNote: clampStr(
          p.storageNote,
          0,
          240,
          'Keep refrigerated at 4–8°C on arrival.'
        ),
        cancellationPolicy: clampStr(
          p.cancellationPolicy,
          0,
          300,
          'Free cancellation up to 4 hours before baking slot.'
        ),
        active: p.active !== false,
        featured: Boolean(p.featured),
        sortOrder: Math.max(1, Math.min(999, Math.round(Number(p.sortOrder) || 10))),
        curatedItems,
        updatedAt: new Date().toISOString(),
      };

      await withMysteryBoxLock(async () => {
        const current = await loadPackages(supabase);
        const next = current.filter((item) => item.id !== packageId);
        next.push(savedPkg);
        next.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
        await savePackages(supabase, next);
      });

      res.json({ package: savedPkg });
    } catch (err) {
      deps.handleApiError(res, err, 'Failed to save Mystery Box package.');
    }
  });

  router.delete(
    '/admin/packages/:packageId',
    deps.requireAdmin,
    async (req: MicroReq, res) => {
      try {
        const supabase = deps.getSupabase();
        const packageId = sanitizeId(req.params.packageId, 'mbox');
        await withMysteryBoxLock(async () => {
          const current = await loadPackages(supabase);
          const next = current.filter((item) => item.id !== packageId);
          await savePackages(supabase, next);
        });
        res.json({ ok: true });
      } catch (err) {
        deps.handleApiError(res, err, 'Failed to delete Mystery Box package.');
      }
    }
  );

  // Admin order status, refund, payout, or audited contents correction
  router.patch('/admin/orders/:orderId', deps.requireAdmin, async (req: MicroReq, res) => {
    try {
      const admin = req.user!;
      const supabase = deps.getSupabase();
      const orderId = sanitizeId(req.params.orderId, 'mbo');
      const body = (req.body || {}) as Record<string, unknown>;

      const updatedOrder = await withMysteryBoxLock(async () => {
        const orders = await loadOrders(supabase);
        const idx = orders.findIndex((o) => o.id === orderId);
        if (idx === -1) throw new Error('Order not found.');
        const current = orders[idx];
        const nowIso = new Date().toISOString();

        const next: MysteryBoxOrder = {
          ...current,
          updatedAt: nowIso,
        };

        if (
          typeof body.deliveryStatus === 'string' &&
          VALID_DELIVERY_STATUS.has(body.deliveryStatus as MysteryBoxDeliveryStatus)
        ) {
          next.deliveryStatus = body.deliveryStatus as MysteryBoxDeliveryStatus;
          if (body.deliveryStatus === 'refunded') {
            next.paymentStatus = 'refunded';
          }
        }

        if (typeof body.refundReason === 'string' && body.refundReason.trim()) {
          next.refundReason = body.refundReason.trim().slice(0, 240);
        }

        if (
          typeof body.payoutVendorId === 'string' &&
          (body.payoutStatus === 'pending' ||
            body.payoutStatus === 'scheduled' ||
            body.payoutStatus === 'paid')
        ) {
          next.vendorFulfillments = (current.vendorFulfillments || []).map((f) =>
            f.vendorId === body.payoutVendorId
              ? { ...f, payoutStatus: body.payoutStatus as 'pending' | 'scheduled' | 'paid', updatedAt: nowIso }
              : f
          );
        }

        // Audited admin override of assignedItems (requires explicit reason)
        if (Array.isArray(body.overrideAssignedItems)) {
          const reason = clampStr(body.overrideReason, 5, 240);
          if (!reason) {
            throw new Error('An audit reason (min 5 chars) is required to edit assigned contents.');
          }
          const prevSummary = (current.assignedItems || [])
            .map((i) => `${i.productName} x${i.quantity}`)
            .join(', ');
          const cleanItems: MysteryBoxAssignedItem[] = body.overrideAssignedItems
            .slice(0, 20)
            .map((raw, i) => {
              const obj = (raw || {}) as Record<string, unknown>;
              return {
                id: sanitizeId(obj.id || `ov-${i + 1}`, 'ov'),
                productName: clampStr(obj.productName, 2, 120, 'Curated Item'),
                category: clampStr(obj.category, 2, 60, 'Bakery'),
                shortDescription: clampStr(obj.shortDescription, 0, 220, ''),
                quantity: Math.max(1, Math.min(50, Math.round(Number(obj.quantity) || 1))),
                unitLabel: clampStr(obj.unitLabel, 1, 30, 'pcs'),
                vendorId: clampStr(obj.vendorId, 1, 80, 'fmb-central'),
                vendorName: clampStr(obj.vendorName, 2, 100, 'Partner Baker'),
                showVendorName: obj.showVendorName !== false,
                image: clampStr(obj.image, 0, 500, current.packageImage),
                dietary:
                  obj.dietary === 'veg' || obj.dietary === 'non-veg' || obj.dietary === 'mixed'
                    ? obj.dietary
                    : 'eggless',
                allergens: Array.isArray(obj.allergens)
                  ? obj.allergens.filter((a): a is string => typeof a === 'string').slice(0, 8)
                  : [],
                bestBefore: clampStr(obj.bestBefore, 2, 80, '48 hours chilled'),
                vendorContributionCostInr: Math.max(
                  0,
                  Math.round(Number(obj.vendorContributionCostInr) || 0)
                ),
                retailValueInr: Math.max(0, Math.round(Number(obj.retailValueInr) || 0)),
              };
            });

          const newSummary = cleanItems.map((i) => `${i.productName} x${i.quantity}`).join(', ');
          const auditEntry: MysteryBoxContentsAuditEntry = {
            at: nowIso,
            byEmail: admin.email || admin.uid,
            reason,
            previousSummary: prevSummary || 'None',
            newSummary,
          };
          next.assignedItems = cleanItems;
          next.assignedTotalRetailValueInr = cleanItems.reduce(
            (sum, i) => sum + i.retailValueInr,
            0
          );
          next.vendorCostTotalInr = cleanItems.reduce(
            (sum, i) => sum + i.vendorContributionCostInr,
            0
          );
          next.netProfitInr =
            next.totalPaidInr -
            (next.vendorCostTotalInr || 0) -
            (next.packagingCostInr || 0) -
            (next.deliveryExpenseInr || 0);
          next.contentsAuditLog = [...(current.contentsAuditLog || []), auditEntry];
        }

        orders[idx] = next;
        await saveOrders(supabase, orders);
        return next;
      });

      res.json({ order: updatedOrder });
    } catch (err) {
      deps.handleApiError(res, err, 'Failed to update Mystery Box order.');
    }
  });

  // Admin approve / reject vendor product submissions
  router.patch(
    '/admin/submissions/:submissionId',
    deps.requireAdmin,
    async (req: MicroReq, res) => {
      try {
        const supabase = deps.getSupabase();
        const submissionId = sanitizeId(req.params.submissionId, 'mbs');
        const body = (req.body || {}) as Record<string, unknown>;
        const status =
          body.status === 'approved' || body.status === 'rejected' || body.status === 'pending'
            ? body.status
            : undefined;

        const updated = await withMysteryBoxLock(async () => {
          const list = await loadSubmissions(supabase);
          const idx = list.findIndex((s) => s.id === submissionId);
          if (idx === -1) throw new Error('Submission not found.');
          const next: MysteryBoxVendorSubmission = {
            ...list[idx],
            ...(status ? { status } : {}),
            ...(body.contributionPriceInr !== undefined
              ? {
                  contributionPriceInr: Math.max(
                    10,
                    Math.min(50000, Math.round(Number(body.contributionPriceInr) || 100))
                  ),
                }
              : {}),
            ...(typeof body.adminNote === 'string'
              ? { adminNote: body.adminNote.trim().slice(0, 240) }
              : {}),
            updatedAt: new Date().toISOString(),
          };
          list[idx] = next;
          await saveSubmissions(supabase, list);
          return next;
        });

        res.json({ submission: updated });
      } catch (err) {
        deps.handleApiError(res, err, 'Failed to update vendor submission.');
      }
    }
  );

  // Admin marketing, coupons & platform pricing settings
  router.put('/admin/marketing', deps.requireAdmin, async (req: MicroReq, res) => {
    try {
      const supabase = deps.getSupabase();
      const m = (req.body || {}) as Record<string, unknown>;
      const rawCoupons = Array.isArray(m.coupons) ? m.coupons.slice(0, 25) : [];
      const coupons: MysteryBoxCoupon[] = rawCoupons
        .map((raw) => {
          const c = (raw || {}) as Record<string, unknown>;
          const code = clampStr(c.code, 3, 24).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
          if (!code) return null;
          return {
            code,
            description: clampStr(c.description, 2, 160, 'Mystery Box discount'),
            type: c.type === 'percent' ? ('percent' as const) : ('flat' as const),
            value: Math.max(1, Math.min(5000, Math.round(Number(c.value) || 50))),
            minOrderInr: Math.max(0, Math.min(50000, Math.round(Number(c.minOrderInr) || 0))),
            maxDiscountInr: Math.max(
              0,
              Math.min(10000, Math.round(Number(c.maxDiscountInr) || 250))
            ),
            active: c.active !== false,
            ...(typeof c.expiresAt === 'string' && c.expiresAt.trim()
              ? { expiresAt: c.expiresAt.trim() }
              : {}),
          };
        })
        .filter((c): c is MysteryBoxCoupon => c !== null);

      const seasonalEdition = normalizeSeasonalEdition(m.seasonalEdition);
      const editionPreset = MYSTERY_BOX_SEASONAL_PRESETS[seasonalEdition];
      const saved: MysteryBoxMarketingConfig = {
        seasonalEdition,
        campaignHeadline: clampStr(
          m.campaignHeadline,
          4,
          140,
          editionPreset.campaignHeadline
        ),
        campaignSubheading: clampStr(
          m.campaignSubheading,
          6,
          300,
          editionPreset.campaignSubheading
        ),
        campaignTagline: clampStr(
          m.campaignTagline,
          4,
          140,
          editionPreset.campaignTagline
        ),
        seasonalBannerEnabled: Boolean(m.seasonalBannerEnabled),
        seasonalBannerText: clampStr(m.seasonalBannerText, 0, 220, ''),
        corporateBulkWhatsapp: clampStr(
          m.corporateBulkWhatsapp,
          6,
          32,
          DEFAULT_MARKETING_CONFIG.corporateBulkWhatsapp
        ),
        defaultDeliveryFeeInr: Math.max(
          0,
          Math.min(1000, Math.round(Number(m.defaultDeliveryFeeInr) ?? 79))
        ),
        freeDeliveryAboveInr: Math.max(
          0,
          Math.min(20000, Math.round(Number(m.freeDeliveryAboveInr) ?? 1999))
        ),
        platformCommissionPercent: Math.max(
          0,
          Math.min(50, Math.round(Number(m.platformCommissionPercent) ?? 18))
        ),
        upiHandle: clampStr(m.upiHandle, 4, 80, DEFAULT_MARKETING_CONFIG.upiHandle),
        upiMerchantName: clampStr(
          m.upiMerchantName,
          2,
          80,
          DEFAULT_MARKETING_CONFIG.upiMerchantName
        ),
        coupons: coupons.length > 0 ? coupons : DEFAULT_MARKETING_CONFIG.coupons,
        updatedAt: new Date().toISOString(),
      };

      await withMysteryBoxLock(async () => {
        await saveMarketing(supabase, saved);
      });

      res.json({ marketing: saved });
    } catch (err) {
      deps.handleApiError(res, err, 'Failed to save Mystery Box marketing settings.');
    }
  });

}
