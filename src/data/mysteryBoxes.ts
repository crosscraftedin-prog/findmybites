export type MysteryBoxTheme =
  | 'everyday'
  | 'christmas'
  | 'birthday'
  | 'chocolate'
  | 'brownie'
  | 'valentines'
  | 'kids'
  | 'anniversary'
  | 'corporate'
  | 'festival';

export const MYSTERY_BOX_THEMES: Array<{ id: MysteryBoxTheme; label: string; shortLabel: string }> = [
  { id: 'everyday', label: 'Everyday Surprise', shortLabel: 'Everyday' },
  { id: 'birthday', label: 'Birthday Mystery Box', shortLabel: 'Birthday' },
  { id: 'chocolate', label: "Chocolate Lover's Box", shortLabel: 'Chocolate' },
  { id: 'brownie', label: 'Brownie Mystery Box', shortLabel: 'Brownie' },
  { id: 'christmas', label: 'Christmas Mystery Box', shortLabel: 'Christmas' },
  { id: 'valentines', label: "Valentine's Mystery Box", shortLabel: "Valentine's" },
  { id: 'kids', label: "Kids' Treat Box", shortLabel: 'Kids' },
  { id: 'anniversary', label: 'Anniversary Surprise Box', shortLabel: 'Anniversary' },
  { id: 'corporate', label: 'Corporate Gift Mystery Box', shortLabel: 'Corporate' },
  { id: 'festival', label: 'Festival & Seasonal Box', shortLabel: 'Festival' },
];

export type MysteryBoxFulfillmentModel =
  | 'single_vendor'
  | 'central_packing'
  | 'fulfillment_partner';

export const FULFILLMENT_MODEL_LABELS: Record<MysteryBoxFulfillmentModel, string> = {
  single_vendor: 'Single Approved Baker Fulfillment',
  central_packing: 'Central FindMyBites Packing Hub',
  fulfillment_partner: 'Curated Fulfillment Partner',
};

export type MysteryBoxDietaryType = 'eggless' | 'veg' | 'non-veg' | 'mixed';

export type MysteryBoxPaymentStatus = 'pending' | 'verified' | 'failed' | 'refunded';

export type MysteryBoxDeliveryStatus =
  | 'payment_pending'
  | 'confirmed'
  | 'vendor_preparing'
  | 'packing'
  | 'dispatched'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export const DELIVERY_STATUS_META: Record<
  MysteryBoxDeliveryStatus,
  { label: string; stepIndex: number; description: string }
> = {
  payment_pending: {
    label: 'Awaiting Payment',
    stepIndex: 0,
    description: 'Complete payment to lock your surprise goodies.',
  },
  confirmed: {
    label: 'Order Confirmed',
    stepIndex: 1,
    description: 'Your mystery box contents are locked and assigned to our bakers.',
  },
  vendor_preparing: {
    label: 'Bakers Preparing',
    stepIndex: 2,
    description: 'Artisan home bakers are freshly baking your assigned goodies.',
  },
  packing: {
    label: 'Gift Packing & Ribbon Seal',
    stepIndex: 3,
    description: 'Quality-checked, temperature-safe packed, and tied with our signature ribbon.',
  },
  dispatched: {
    label: 'Dispatched',
    stepIndex: 4,
    description: 'Handed over to our chilled-safe local delivery partner.',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    stepIndex: 5,
    description: 'Your mystery box is heading straight to the doorstep.',
  },
  delivered: {
    label: 'Delivered',
    stepIndex: 6,
    description: 'Delivered! Enjoy every delicious bite.',
  },
  cancelled: {
    label: 'Cancelled',
    stepIndex: -1,
    description: 'This mystery box order was cancelled.',
  },
  refunded: {
    label: 'Refunded',
    stepIndex: -1,
    description: 'Payment has been refunded to the original payment source.',
  },
};

export const MYSTERY_BOX_DELIVERY_SLOTS = [
  '10:00 AM – 1:00 PM',
  '1:00 PM – 4:00 PM',
  '4:00 PM – 7:00 PM',
  '7:00 PM – 9:30 PM',
];

export const MYSTERY_BOX_DEFAULT_CITIES = ['Hyderabad'];

export interface MysteryBoxCuratedItem {
  id: string;
  productName: string;
  category: string;
  shortDescription: string;
  quantity: number;
  unitLabel: string;
  vendorId: string;
  vendorName: string;
  vendorContributionCostInr: number;
  retailValueInr: number;
  image: string;
  dietary: MysteryBoxDietaryType;
  allergens: string[];
  bestBefore: string;
  prepHours: number;
  isBackupAlternative?: boolean;
  showVendorName?: boolean;
}

export interface MysteryBoxPackage {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  theme: MysteryBoxTheme;
  priceInr: number;
  guaranteedMinValueInr: number;
  minGoodiesCount: number;
  description: string;
  categoryExpectations: string[];
  image: string;
  gallery: string[];
  stockCount: number;
  deliveryAvailable: boolean;
  deliveryCities: string[];
  estimatedDeliveryTime: string;
  deliveryFeeInr: number;
  packagingCostInr: number;
  estimatedDeliveryCostInr: number;
  fulfillmentModel: MysteryBoxFulfillmentModel;
  dietarySummary: MysteryBoxDietaryType;
  allergenNotice: string;
  storageNote: string;
  cancellationPolicy: string;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  /** Admin-only curated item pool. Stripped from public catalog responses before checkout. */
  curatedItems?: MysteryBoxCuratedItem[];
  updatedAt?: string;
}

export interface MysteryBoxAssignedItem {
  id: string;
  productName: string;
  category: string;
  shortDescription: string;
  quantity: number;
  unitLabel: string;
  vendorId: string;
  vendorName: string;
  showVendorName: boolean;
  image: string;
  dietary: MysteryBoxDietaryType;
  allergens: string[];
  bestBefore: string;
  vendorContributionCostInr: number;
  retailValueInr: number;
}

export interface MysteryBoxVendorFulfillment {
  vendorId: string;
  vendorName: string;
  itemNames: string[];
  totalVendorCostInr: number;
  status: 'assigned' | 'accepted' | 'preparing' | 'ready_for_pickup' | 'completed';
  payoutStatus: 'pending' | 'scheduled' | 'paid';
  updatedAt: string;
}

export interface MysteryBoxContentsAuditEntry {
  at: string;
  byEmail: string;
  reason: string;
  previousSummary: string;
  newSummary: string;
}

export interface MysteryBoxOrder {
  id: string;
  orderRef: string;
  idempotencyKey: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  packageId: string;
  packageName: string;
  packageImage: string;
  theme: MysteryBoxTheme;
  sellingPriceInr: number;
  deliveryFeeInr: number;
  discountInr: number;
  couponCode?: string;
  totalPaidInr: number;
  paymentStatus: MysteryBoxPaymentStatus;
  paymentMethod: 'razorpay' | 'upi' | 'card' | 'netbanking';
  paymentProviderRef?: string;
  verifiedAt?: string;
  isGift: boolean;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryDate: string;
  deliverySlot: string;
  giftMessage?: string;
  dietaryPreference: 'any' | 'eggless_only';
  fulfillmentModel: MysteryBoxFulfillmentModel;
  guaranteedMinValueInr: number;
  /** Immutable once payment is verified; hidden from customer until paymentStatus === 'verified'. */
  assignedItems?: MysteryBoxAssignedItem[];
  assignedTotalRetailValueInr?: number;
  contentsAuditLog?: MysteryBoxContentsAuditEntry[];
  unboxedAt?: string;
  deliveryStatus: MysteryBoxDeliveryStatus;
  vendorFulfillments?: MysteryBoxVendorFulfillment[];
  /** Financial ledger fields (exposed to admin). */
  vendorCostTotalInr?: number;
  packagingCostInr?: number;
  deliveryExpenseInr?: number;
  platformCommissionInr?: number;
  netProfitInr?: number;
  refundReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MysteryBoxVendorSubmission {
  id: string;
  vendorId: string;
  vendorName: string;
  ownerId: string;
  ownerEmail: string;
  city: string;
  deliveryAreas: string[];
  productName: string;
  category: string;
  shortDescription: string;
  quantityAvailable: number;
  unitLabel: string;
  contributionPriceInr: number;
  retailValueInr: number;
  image: string;
  prepTimeHours: number;
  bestBefore: string;
  dietary: MysteryBoxDietaryType;
  allergens: string[];
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MysteryBoxCoupon {
  code: string;
  description: string;
  type: 'flat' | 'percent';
  value: number;
  minOrderInr: number;
  maxDiscountInr: number;
  active: boolean;
  expiresAt?: string;
}

export type MysteryBoxSeasonalEdition =
  | 'christmas'
  | 'classic'
  | 'valentines'
  | 'diwali'
  | 'new_year';

export interface MysteryBoxSeasonalPreset {
  id: MysteryBoxSeasonalEdition;
  label: string;
  eyebrow: string;
  campaignHeadline: string;
  campaignTagline: string;
  campaignSubheading: string;
  ctaLabel: string;
  seasonalBannerText: string;
  boxBadgeLabel: string;
  enableSnowfall: boolean;
  enableGoldenLights: boolean;
}

export const MYSTERY_BOX_SEASONAL_PRESETS: Record<
  MysteryBoxSeasonalEdition,
  MysteryBoxSeasonalPreset
> = {
  christmas: {
    id: 'christmas',
    label: 'Christmas Special Edition',
    eyebrow: 'FINDMYBITES MYSTERY BOXES · CHRISTMAS SPECIAL EDITION',
    campaignHeadline: 'A CHRISTMAS FULL OF SURPRISES!',
    campaignTagline: "What's inside? That's the magic of Christmas!",
    campaignSubheading:
      'Choose your mystery box, unwrap the magic and discover a Christmas surprise waiting just for you.',
    ctaLabel: 'UNWRAP THE CHRISTMAS MAGIC',
    seasonalBannerText:
      'Christmas Special Edition · Use code UNWRAP100 for ₹100 off Mystery Boxes ₹799+ · Luxury sealed festive packaging',
    boxBadgeLabel: 'Christmas Edition',
    enableSnowfall: true,
    enableGoldenLights: true,
  },
  classic: {
    id: 'classic',
    label: 'Classic Year-Round Edition',
    eyebrow: 'FINDMYBITES MYSTERY BOXES · HYDERABAD',
    campaignHeadline: "Don't Just Buy a Treat. Unwrap a Surprise!",
    campaignTagline: 'THE BIGGER THE BOX, THE BIGGER THE SURPRISE!',
    campaignSubheading:
      "Beautifully sealed FindMyBites mystery boxes delivered across Hyderabad. You know what you pay and how many items you get—what's inside stays 100% secret until you unwrap!",
    ctaLabel: 'EXPLORE MYSTERY BOXES',
    seasonalBannerText:
      'Use code UNWRAP100 for ₹100 off Mystery Boxes ₹799+ · Sealed surprise boxes curated by verified FindMyBites partners',
    boxBadgeLabel: 'Sealed Mystery',
    enableSnowfall: false,
    enableGoldenLights: false,
  },
  valentines: {
    id: 'valentines',
    label: "Valentine's Edition",
    eyebrow: "FINDMYBITES MYSTERY BOXES · VALENTINE'S SPECIAL",
    campaignHeadline: 'UNWRAP A ROMANTIC SURPRISE!',
    campaignTagline: 'Sealed with ribbon, love, and a sweet mystery inside.',
    campaignSubheading:
      'Choose your sealed Valentine mystery box, unwrap the moment together, and receive your surprise at the doorstep.',
    ctaLabel: "UNWRAP VALENTINE'S MAGIC",
    seasonalBannerText:
      "Valentine's Edition · Use code UNWRAP100 for ₹100 off Mystery Boxes ₹799+ · Ribbon-sealed romantic gifting",
    boxBadgeLabel: "Valentine's Edition",
    enableSnowfall: false,
    enableGoldenLights: true,
  },
  diwali: {
    id: 'diwali',
    label: 'Diwali Festive Edition',
    eyebrow: 'FINDMYBITES MYSTERY BOXES · DIWALI SPECIAL',
    campaignHeadline: 'LIGHT UP THE SEASON WITH A SURPRISE!',
    campaignTagline: 'Festive sealed boxes filled with celebration and wonder.',
    campaignSubheading:
      'Pick your festive mystery box, unwrap the surprise online, and gift a celebration box to someone special.',
    ctaLabel: 'UNWRAP FESTIVE MAGIC',
    seasonalBannerText:
      'Diwali Festive Edition · Use code UNWRAP100 for ₹100 off Mystery Boxes ₹799+ · Luxury sealed festive gifting',
    boxBadgeLabel: 'Diwali Edition',
    enableSnowfall: false,
    enableGoldenLights: true,
  },
  new_year: {
    id: 'new_year',
    label: 'New Year Celebration Edition',
    eyebrow: 'FINDMYBITES MYSTERY BOXES · NEW YEAR EDITION',
    campaignHeadline: 'RING IN THE NEW YEAR WITH A SURPRISE!',
    campaignTagline: 'Start the celebration with a ribbon-sealed mystery.',
    campaignSubheading:
      'Select your celebration mystery box, unwrap the surprise digitally, and welcome the new year in style.',
    ctaLabel: 'UNWRAP NEW YEAR MAGIC',
    seasonalBannerText:
      'New Year Edition · Use code UNWRAP100 for ₹100 off Mystery Boxes ₹799+ · Sealed celebration packaging',
    boxBadgeLabel: 'New Year Edition',
    enableSnowfall: false,
    enableGoldenLights: true,
  },
};

export function getSeasonalEditionPreset(
  edition?: MysteryBoxSeasonalEdition | null
): MysteryBoxSeasonalPreset {
  if (edition && edition in MYSTERY_BOX_SEASONAL_PRESETS) {
    return MYSTERY_BOX_SEASONAL_PRESETS[edition];
  }
  return MYSTERY_BOX_SEASONAL_PRESETS.christmas;
}

export interface MysteryBoxMarketingConfig {
  seasonalEdition?: MysteryBoxSeasonalEdition;
  campaignHeadline: string;
  campaignSubheading: string;
  campaignTagline: string;
  seasonalBannerEnabled: boolean;
  seasonalBannerText: string;
  corporateBulkWhatsapp: string;
  defaultDeliveryFeeInr: number;
  freeDeliveryAboveInr: number;
  platformCommissionPercent: number;
  upiHandle: string;
  upiMerchantName: string;
  coupons: MysteryBoxCoupon[];
  updatedAt?: string;
}

export interface MysteryBoxFinanceSummary {
  totalVerifiedOrders: number;
  totalGrossRevenueInr: number;
  totalDeliveryCollectedInr: number;
  totalDiscountsInr: number;
  totalVendorCostInr: number;
  totalPackagingCostInr: number;
  totalDeliveryExpenseInr: number;
  totalPlatformCommissionInr: number;
  totalNetProfitInr: number;
}

export function formatInr(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `₹${safe.toLocaleString('en-IN')}`;
}

export function getThemeLabel(theme: MysteryBoxTheme): string {
  return MYSTERY_BOX_THEMES.find((t) => t.id === theme)?.label || 'Mystery Box';
}

export const DEFAULT_MARKETING_CONFIG: MysteryBoxMarketingConfig = {
  seasonalEdition: 'christmas',
  campaignHeadline: MYSTERY_BOX_SEASONAL_PRESETS.christmas.campaignHeadline,
  campaignSubheading: MYSTERY_BOX_SEASONAL_PRESETS.christmas.campaignSubheading,
  campaignTagline: MYSTERY_BOX_SEASONAL_PRESETS.christmas.campaignTagline,
  seasonalBannerEnabled: true,
  seasonalBannerText: MYSTERY_BOX_SEASONAL_PRESETS.christmas.seasonalBannerText,
  corporateBulkWhatsapp: '+91 98860 00000',
  defaultDeliveryFeeInr: 79,
  freeDeliveryAboveInr: 1999,
  platformCommissionPercent: 18,
  upiHandle: 'findmybites@okaxis',
  upiMerchantName: 'FindMyBites Mystery Boxes',
  coupons: [
    {
      code: 'UNWRAP100',
      description: '₹100 off on Mystery Boxes ₹799 & above',
      type: 'flat',
      value: 100,
      minOrderInr: 799,
      maxDiscountInr: 100,
      active: true,
    },
    {
      code: 'SURPRISE10',
      description: '10% off up to ₹250 on Celebration, Premium & Ultimate boxes',
      type: 'percent',
      value: 10,
      minOrderInr: 1299,
      maxDiscountInr: 250,
      active: true,
    },
  ],
};

export const DEFAULT_MYSTERY_BOX_PACKAGES: MysteryBoxPackage[] = [
  {
    id: 'mbox-little',
    slug: 'little-mystery-box',
    name: 'Little Mystery Box',
    tagline: 'A little box. A lot of surprises!',
    theme: 'everyday',
    priceInr: 499,
    guaranteedMinValueInr: 620,
    minGoodiesCount: 4,
    description:
      'A charming ribbon-sealed FindMyBites mystery box delivered in Hyderabad. Exact contents stay completely secret until you complete checkout and unwrap online.',
    categoryExpectations: ['Mystery'],
    image: 'preset:little',
    gallery: ['preset:little', 'preset:hero'],
    stockCount: 35,
    deliveryAvailable: true,
    deliveryCities: MYSTERY_BOX_DEFAULT_CITIES,
    estimatedDeliveryTime: 'Next-Day / Scheduled Delivery (Hyderabad · Min 24 hrs)',
    deliveryFeeInr: 69,
    packagingCostInr: 45,
    estimatedDeliveryCostInr: 65,
    fulfillmentModel: 'single_vendor',
    dietarySummary: 'eggless',
    allergenNotice: 'Prepared in kitchens that handle dairy, wheat/gluten, soy, and tree nuts.',
    storageNote: 'Keep refrigerated at 4–8°C on arrival. Best enjoyed fresh within 48 hours.',
    cancellationPolicy:
      'Free cancellation up to 4 hours before scheduled preparation slot. Full refund or replacement for transit damage.',
    active: true,
    featured: true,
    sortOrder: 1,
    curatedItems: [
      {
        id: 'li-1',
        productName: 'Belgian Dark Fudge Brownies',
        category: 'Brownies',
        shortDescription: 'Crinkle-top dark chocolate brownies baked in small batches.',
        quantity: 2,
        unitLabel: 'pcs',
        vendorId: 'fmb-partner-1',
        vendorName: 'Cocoa Crumb Home Bakery',
        vendorContributionCostInr: 110,
        retailValueInr: 190,
        image: 'preset:little',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '3 days refrigerated',
        prepHours: 3,
        showVendorName: true,
      },
      {
        id: 'li-2',
        productName: 'Brown-Butter Sea Salt Cookies',
        category: 'Cookies',
        shortDescription: 'Crisp edges with a gooey chocolate-chunk center.',
        quantity: 3,
        unitLabel: 'pcs',
        vendorId: 'fmb-partner-1',
        vendorName: 'Cocoa Crumb Home Bakery',
        vendorContributionCostInr: 95,
        retailValueInr: 165,
        image: 'preset:little',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '5 days airtight',
        prepHours: 2,
        showVendorName: true,
      },
      {
        id: 'li-3',
        productName: 'Madagascar Vanilla Swirl Cupcake',
        category: 'Cupcakes',
        shortDescription: 'Fluffy vanilla bean sponge topped with whipped buttercream.',
        quantity: 1,
        unitLabel: 'cupcake',
        vendorId: 'fmb-partner-2',
        vendorName: 'Velvet Whisk Patisserie',
        vendorContributionCostInr: 85,
        retailValueInr: 150,
        image: 'preset:hero',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '48 hours chilled',
        prepHours: 3,
        showVendorName: true,
      },
      {
        id: 'li-4',
        productName: 'Roasted Hazelnut Praline Bites',
        category: 'Chocolates',
        shortDescription: 'Hand-tempered dark chocolate bonbons with toasted hazelnut.',
        quantity: 2,
        unitLabel: 'truffles',
        vendorId: 'fmb-partner-3',
        vendorName: 'Cacao Atelier Studio',
        vendorContributionCostInr: 70,
        retailValueInr: 140,
        image: 'preset:hero',
        dietary: 'eggless',
        allergens: ['Dairy', 'Tree Nuts'],
        bestBefore: '10 days cool dry place',
        prepHours: 2,
        showVendorName: true,
      },
    ],
  },
  {
    id: 'mbox-happy',
    slug: 'happy-treats-box',
    name: 'Happy Treats Box',
    tagline: 'More excitement. More surprises. More happiness!',
    theme: 'everyday',
    priceInr: 799,
    guaranteedMinValueInr: 1020,
    minGoodiesCount: 5,
    description:
      'A generously packed ribbon-sealed FindMyBites mystery box delivered in Hyderabad, filled with curated surprises worth more than you pay—revealed only after checkout.',
    categoryExpectations: ['Mystery'],
    image: 'preset:happy',
    gallery: ['preset:happy', 'preset:hero'],
    stockCount: 28,
    deliveryAvailable: true,
    deliveryCities: MYSTERY_BOX_DEFAULT_CITIES,
    estimatedDeliveryTime: 'Next-Day / Scheduled Delivery (Hyderabad · Min 24 hrs)',
    deliveryFeeInr: 79,
    packagingCostInr: 65,
    estimatedDeliveryCostInr: 70,
    fulfillmentModel: 'central_packing',
    dietarySummary: 'eggless',
    allergenNotice: 'Prepared in kitchens that handle dairy, wheat/gluten, soy, and tree nuts.',
    storageNote: 'Chilled-safe doorstep delivery. Refrigerate promptly upon arrival.',
    cancellationPolicy:
      'Free cancellation up to 4 hours before scheduled preparation slot. Full freshness and packaging guarantee.',
    active: true,
    featured: true,
    sortOrder: 2,
    curatedItems: [
      {
        id: 'hp-1',
        productName: 'Roasted Walnut Fudge Brownies',
        category: 'Brownies',
        shortDescription: 'Rich 55% dark chocolate brownies studded with toasted walnuts.',
        quantity: 3,
        unitLabel: 'pcs',
        vendorId: 'fmb-partner-1',
        vendorName: 'Cocoa Crumb Home Bakery',
        vendorContributionCostInr: 165,
        retailValueInr: 285,
        image: 'preset:happy',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten', 'Tree Nuts'],
        bestBefore: '3 days refrigerated',
        prepHours: 3,
        showVendorName: true,
      },
      {
        id: 'hp-2',
        productName: 'Double Chocolate Chunk Cookies',
        category: 'Cookies',
        shortDescription: 'Thick NYC-style soft-baked cocoa cookies with molten chips.',
        quantity: 2,
        unitLabel: 'cookies',
        vendorId: 'fmb-partner-1',
        vendorName: 'Cocoa Crumb Home Bakery',
        vendorContributionCostInr: 110,
        retailValueInr: 195,
        image: 'preset:happy',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '5 days airtight',
        prepHours: 2,
        showVendorName: true,
      },
      {
        id: 'hp-3',
        productName: 'Signature Cupcake Duo (Belgian Choco & Vanilla Rose)',
        category: 'Cupcakes',
        shortDescription: 'Two hand-piped gourmet cupcakes finished with floral petals.',
        quantity: 2,
        unitLabel: 'cupcakes',
        vendorId: 'fmb-partner-2',
        vendorName: 'Velvet Whisk Patisserie',
        vendorContributionCostInr: 145,
        retailValueInr: 260,
        image: 'preset:happy',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '48 hours chilled',
        prepHours: 4,
        showVendorName: true,
      },
      {
        id: 'hp-4',
        productName: 'Gold-Leaf Dark Ganache Truffles',
        category: 'Chocolates',
        shortDescription: 'Silky single-origin dark chocolate truffles dusted in Dutch cocoa.',
        quantity: 4,
        unitLabel: 'truffles',
        vendorId: 'fmb-partner-3',
        vendorName: 'Cacao Atelier Studio',
        vendorContributionCostInr: 115,
        retailValueInr: 210,
        image: 'preset:happy',
        dietary: 'eggless',
        allergens: ['Dairy'],
        bestBefore: '10 days chilled',
        prepHours: 2,
        showVendorName: true,
      },
      {
        id: 'hp-5',
        productName: 'Salted Caramel Biscoff Blondie Bite',
        category: 'Surprise Treat',
        shortDescription: 'Chef-curated caramelized biscuit blondie square.',
        quantity: 1,
        unitLabel: 'bar',
        vendorId: 'fmb-partner-2',
        vendorName: 'Velvet Whisk Patisserie',
        vendorContributionCostInr: 75,
        retailValueInr: 140,
        image: 'preset:hero',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '4 days cool place',
        prepHours: 3,
        showVendorName: true,
      },
    ],
  },
  {
    id: 'mbox-celebration',
    slug: 'celebration-box',
    name: 'Celebration Box',
    tagline: 'Make your special moments even more surprising!',
    theme: 'birthday',
    priceInr: 1299,
    guaranteedMinValueInr: 1650,
    minGoodiesCount: 6,
    description:
      'An elevated, ribbon-sealed celebration mystery box delivered in Hyderabad. Crafted for birthdays, milestones, and unforgettable gifting—contents stay completely secret until you unwrap.',
    categoryExpectations: ['Mystery'],
    image: 'preset:celebration',
    gallery: ['preset:celebration', 'preset:hero'],
    stockCount: 22,
    deliveryAvailable: true,
    deliveryCities: MYSTERY_BOX_DEFAULT_CITIES,
    estimatedDeliveryTime: 'Scheduled Delivery (Hyderabad · Next-Day or Later)',
    deliveryFeeInr: 89,
    packagingCostInr: 95,
    estimatedDeliveryCostInr: 85,
    fulfillmentModel: 'central_packing',
    dietarySummary: 'eggless',
    allergenNotice: 'Prepared in kitchens that handle dairy, wheat/gluten, soy, and tree nuts.',
    storageNote: 'Delivered chilled-safe. Keep refrigerated at 4–8°C until ready to enjoy.',
    cancellationPolicy:
      'Free cancellation up to 6 hours before delivery slot. Instant replacement for any transit damage.',
    active: true,
    featured: true,
    sortOrder: 3,
    curatedItems: [
      {
        id: 'cb-1',
        productName: 'Berry Mascarpone Mini Celebration Cake (350g)',
        category: 'Mini Cakes',
        shortDescription: 'Velvety sponge layered with berry compote and whipped mascarpone.',
        quantity: 1,
        unitLabel: 'mini cake',
        vendorId: 'fmb-partner-2',
        vendorName: 'Velvet Whisk Patisserie',
        vendorContributionCostInr: 360,
        retailValueInr: 620,
        image: 'preset:celebration',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '48 hours chilled',
        prepHours: 5,
        showVendorName: true,
      },
      {
        id: 'cb-2',
        productName: 'Triple-Layer Pecan Fudge Brownies',
        category: 'Brownies',
        shortDescription: 'Intense Belgian chocolate brownies finished with roasted pecans.',
        quantity: 3,
        unitLabel: 'pcs',
        vendorId: 'fmb-partner-1',
        vendorName: 'Cocoa Crumb Home Bakery',
        vendorContributionCostInr: 175,
        retailValueInr: 310,
        image: 'preset:celebration',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten', 'Tree Nuts'],
        bestBefore: '4 days chilled',
        prepHours: 3,
        showVendorName: true,
      },
      {
        id: 'cb-3',
        productName: 'Berry & Dark Truffle Cupcake Trio',
        category: 'Cupcakes',
        shortDescription: 'Three hand-piped celebration cupcakes topped with fresh berries.',
        quantity: 3,
        unitLabel: 'cupcakes',
        vendorId: 'fmb-partner-2',
        vendorName: 'Velvet Whisk Patisserie',
        vendorContributionCostInr: 195,
        retailValueInr: 340,
        image: 'preset:celebration',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '48 hours chilled',
        prepHours: 4,
        showVendorName: true,
      },
      {
        id: 'cb-4',
        productName: 'Hand-Iced Artisanal Shortbread Cookies',
        category: 'Cookies',
        shortDescription: 'Melt-in-mouth French butter cookies glazed in royal icing.',
        quantity: 5,
        unitLabel: 'cookies',
        vendorId: 'fmb-partner-4',
        vendorName: 'Butter & Bloom Bakehouse',
        vendorContributionCostInr: 120,
        retailValueInr: 220,
        image: 'preset:celebration',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '7 days airtight',
        prepHours: 3,
        showVendorName: true,
      },
      {
        id: 'cb-5',
        productName: 'Artisan Bonbon Assortment (6 pcs)',
        category: 'Chocolates',
        shortDescription: 'Hand-painted pralines in raspberry, espresso, and hazelnut.',
        quantity: 6,
        unitLabel: 'bonbons',
        vendorId: 'fmb-partner-3',
        vendorName: 'Cacao Atelier Studio',
        vendorContributionCostInr: 155,
        retailValueInr: 280,
        image: 'preset:celebration',
        dietary: 'eggless',
        allergens: ['Dairy', 'Tree Nuts'],
        bestBefore: '12 days cool place',
        prepHours: 2,
        showVendorName: true,
      },
    ],
  },
  {
    id: 'mbox-premium',
    slug: 'premium-surprise-box',
    name: 'Premium Surprise Box',
    tagline: 'An extraordinary surprise awaits inside!',
    theme: 'everyday',
    priceInr: 1999,
    guaranteedMinValueInr: 2550,
    minGoodiesCount: 6,
    description:
      'A luxurious linen-wrapped FindMyBites mystery hamper delivered in Hyderabad. Every ribbon-sealed box guarantees high-value curated surprises—kept strictly secret until your digital unboxing.',
    categoryExpectations: ['Mystery'],
    image: 'preset:premium',
    gallery: ['preset:premium', 'preset:hero'],
    stockCount: 16,
    deliveryAvailable: true,
    deliveryCities: MYSTERY_BOX_DEFAULT_CITIES,
    estimatedDeliveryTime: 'Scheduled Delivery (Hyderabad · Min 24 hrs advance)',
    deliveryFeeInr: 0,
    packagingCostInr: 165,
    estimatedDeliveryCostInr: 110,
    fulfillmentModel: 'central_packing',
    dietarySummary: 'eggless',
    allergenNotice: 'Prepared in kitchens that handle dairy, wheat/gluten, soy, and tree nuts.',
    storageNote: 'Delivered in insulated cool-pack hampers. Refrigerate promptly on arrival.',
    cancellationPolicy:
      'Free cancellation up to 8 hours prior to delivery window. Free doorstep delivery included.',
    active: true,
    featured: true,
    sortOrder: 4,
    curatedItems: [
      {
        id: 'pm-1',
        productName: 'Belgian 64% Dark Ganache Celebration Cake (500g)',
        category: 'Celebration Cakes',
        shortDescription: 'Silky dark chocolate ganache cake garnished with gold leaf and berries.',
        quantity: 1,
        unitLabel: 'cake',
        vendorId: 'fmb-partner-2',
        vendorName: 'Velvet Whisk Patisserie',
        vendorContributionCostInr: 560,
        retailValueInr: 950,
        image: 'preset:premium',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '48 hours chilled',
        prepHours: 6,
        showVendorName: true,
      },
      {
        id: 'pm-2',
        productName: 'Pistachio Éclair & Raspberry Mille-Feuille Duo',
        category: 'Pastries',
        shortDescription: 'Crisp choux pastry & puff layers filled with roasted pistachio crème.',
        quantity: 2,
        unitLabel: 'pastries',
        vendorId: 'fmb-partner-4',
        vendorName: 'Butter & Bloom Bakehouse',
        vendorContributionCostInr: 250,
        retailValueInr: 440,
        image: 'preset:premium',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten', 'Tree Nuts'],
        bestBefore: '24 hours chilled',
        prepHours: 5,
        showVendorName: true,
      },
      {
        id: 'pm-3',
        productName: 'Salted Caramel Tartlet & Fudge Brownie Pair',
        category: 'Brownies & Tarts',
        shortDescription: 'Buttery chocolate pastry shell with sea-salt caramel plus fudgy brownie.',
        quantity: 2,
        unitLabel: 'pcs',
        vendorId: 'fmb-partner-1',
        vendorName: 'Cocoa Crumb Home Bakery',
        vendorContributionCostInr: 210,
        retailValueInr: 360,
        image: 'preset:premium',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '3 days chilled',
        prepHours: 4,
        showVendorName: true,
      },
      {
        id: 'pm-4',
        productName: 'Gourmet Belgian Cookie Trio',
        category: 'Cookies',
        shortDescription: 'Dark cocoa chunk, brown-butter oat, and roasted almond cookies.',
        quantity: 4,
        unitLabel: 'cookies',
        vendorId: 'fmb-partner-4',
        vendorName: 'Butter & Bloom Bakehouse',
        vendorContributionCostInr: 165,
        retailValueInr: 290,
        image: 'preset:premium',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten', 'Tree Nuts'],
        bestBefore: '6 days airtight',
        prepHours: 2,
        showVendorName: true,
      },
      {
        id: 'pm-5',
        productName: 'Artisan Signature Praline Box (9 pcs)',
        category: 'Chocolates',
        shortDescription: 'Luxury dark & milk chocolate pralines in a rigid keepsake tray.',
        quantity: 9,
        unitLabel: 'pralines',
        vendorId: 'fmb-partner-3',
        vendorName: 'Cacao Atelier Studio',
        vendorContributionCostInr: 235,
        retailValueInr: 420,
        image: 'preset:premium',
        dietary: 'eggless',
        allergens: ['Dairy', 'Tree Nuts'],
        bestBefore: '14 days cool dry place',
        prepHours: 2,
        showVendorName: true,
      },
      {
        id: 'pm-6',
        productName: 'Artisan Scented Soy Dessert Candle (Gift Surprise)',
        category: 'Gift Surprise',
        shortDescription: 'Hand-poured vanilla bean & roasted espresso mini keepsake candle.',
        quantity: 1,
        unitLabel: 'gift item',
        vendorId: 'fmb-partner-5',
        vendorName: 'FindMyBites Gifting Atelier',
        vendorContributionCostInr: 130,
        retailValueInr: 250,
        image: 'preset:premium',
        dietary: 'veg',
        allergens: [],
        bestBefore: 'Non-perishable keepsake',
        prepHours: 1,
        showVendorName: true,
      },
    ],
  },
  {
    id: 'mbox-ultimate',
    slug: 'ultimate-mystery-box',
    name: 'Ultimate Mystery Box',
    tagline: 'The ultimate mystery. The ultimate unboxing experience!',
    theme: 'anniversary',
    priceInr: 2999,
    guaranteedMinValueInr: 3850,
    minGoodiesCount: 7,
    description:
      'Our grandest ribbon-sealed keepsake mystery trunk delivered in Hyderabad. Maximum items, maximum guaranteed value, and pure surprise excitement from the moment you unwrap.',
    categoryExpectations: ['Mystery'],
    image: 'preset:ultimate',
    gallery: ['preset:ultimate', 'preset:hero'],
    stockCount: 10,
    deliveryAvailable: true,
    deliveryCities: MYSTERY_BOX_DEFAULT_CITIES,
    estimatedDeliveryTime: 'Priority Scheduled Delivery (Hyderabad · Min 24 hrs advance)',
    deliveryFeeInr: 0,
    packagingCostInr: 290,
    estimatedDeliveryCostInr: 145,
    fulfillmentModel: 'fulfillment_partner',
    dietarySummary: 'eggless',
    allergenNotice: 'Prepared in kitchens that handle dairy, wheat/gluten, soy, and tree nuts.',
    storageNote: 'Priority white-glove chilled delivery included. Refrigerate perishable surprises upon receipt.',
    cancellationPolicy:
      'Free cancellation up to 12 hours before delivery slot. Priority concierge support included.',
    active: true,
    featured: true,
    sortOrder: 5,
    curatedItems: [
      {
        id: 'ul-1',
        productName: 'Designer Floral Gold-Leaf Celebration Cake (750g)',
        category: 'Designer Cakes',
        shortDescription: 'Two-layer artisanal celebration cake adorned with buttercream florals and edible gold.',
        quantity: 1,
        unitLabel: 'designer cake',
        vendorId: 'fmb-partner-2',
        vendorName: 'Velvet Whisk Patisserie',
        vendorContributionCostInr: 860,
        retailValueInr: 1450,
        image: 'preset:ultimate',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '48 hours chilled',
        prepHours: 8,
        showVendorName: true,
      },
      {
        id: 'ul-2',
        productName: 'French Pastel Macaron Collection (8 pcs)',
        category: 'Luxury Desserts',
        shortDescription: 'Rose lychee, salted pistachio, lavender honey, and dark ganache macarons.',
        quantity: 8,
        unitLabel: 'macarons',
        vendorId: 'fmb-partner-4',
        vendorName: 'Butter & Bloom Bakehouse',
        vendorContributionCostInr: 390,
        retailValueInr: 680,
        image: 'preset:ultimate',
        dietary: 'eggless',
        allergens: ['Dairy', 'Tree Nuts'],
        bestBefore: '4 days chilled',
        prepHours: 5,
        showVendorName: true,
      },
      {
        id: 'ul-3',
        productName: 'Gourmet Pecan & Hazelnut Fudge Brownies',
        category: 'Brownies',
        shortDescription: 'Dense Valrhona-style dark chocolate brownies loaded with roasted nuts.',
        quantity: 4,
        unitLabel: 'pcs',
        vendorId: 'fmb-partner-1',
        vendorName: 'Cocoa Crumb Home Bakery',
        vendorContributionCostInr: 230,
        retailValueInr: 410,
        image: 'preset:ultimate',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten', 'Tree Nuts'],
        bestBefore: '4 days chilled',
        prepHours: 3,
        showVendorName: true,
      },
      {
        id: 'ul-4',
        productName: 'Gold-Leaf French Butter Shortbread Cookies',
        category: 'Cookies',
        shortDescription: 'Crisp cultured-butter sable cookies brushed with edible gold flake.',
        quantity: 6,
        unitLabel: 'cookies',
        vendorId: 'fmb-partner-4',
        vendorName: 'Butter & Bloom Bakehouse',
        vendorContributionCostInr: 190,
        retailValueInr: 340,
        image: 'preset:ultimate',
        dietary: 'eggless',
        allergens: ['Dairy', 'Gluten'],
        bestBefore: '7 days airtight',
        prepHours: 3,
        showVendorName: true,
      },
      {
        id: 'ul-5',
        productName: 'Grand Master Chocolatier Truffle Assortment (12 pcs)',
        category: 'Chocolates',
        shortDescription: 'Twelve signature hand-molded pralines & ganache domes.',
        quantity: 12,
        unitLabel: 'chocolates',
        vendorId: 'fmb-partner-3',
        vendorName: 'Cacao Atelier Studio',
        vendorContributionCostInr: 340,
        retailValueInr: 620,
        image: 'preset:ultimate',
        dietary: 'eggless',
        allergens: ['Dairy', 'Tree Nuts'],
        bestBefore: '14 days cool place',
        prepHours: 2,
        showVendorName: true,
      },
      {
        id: 'ul-6',
        productName: 'Gold-Trim Ceramic Cake Server & Keepsake Trunk',
        category: 'Special Gift Item',
        shortDescription: 'Reusable satin-ribbon velvet keepsake trunk with brushed brass dessert server.',
        quantity: 1,
        unitLabel: 'keepsake set',
        vendorId: 'fmb-partner-5',
        vendorName: 'FindMyBites Gifting Atelier',
        vendorContributionCostInr: 210,
        retailValueInr: 420,
        image: 'preset:ultimate',
        dietary: 'veg',
        allergens: [],
        bestBefore: 'Non-perishable keepsake',
        prepHours: 1,
        showVendorName: true,
      },
      {
        id: 'ul-7',
        productName: 'Wax-Sealed Personalised Greeting Card',
        category: 'Greeting Card',
        shortDescription: 'Heavy cotton stationery printed with your custom message and gold wax seal.',
        quantity: 1,
        unitLabel: 'card',
        vendorId: 'fmb-partner-5',
        vendorName: 'FindMyBites Gifting Atelier',
        vendorContributionCostInr: 45,
        retailValueInr: 120,
        image: 'preset:ultimate',
        dietary: 'veg',
        allergens: [],
        bestBefore: 'Keepsake',
        prepHours: 1,
        showVendorName: false,
      },
    ],
  },
];
