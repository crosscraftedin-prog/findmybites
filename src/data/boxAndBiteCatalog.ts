export type CorporateCategoryId =
  | 'welcome-onboarding'
  | 'employee-appreciation'
  | 'executive-client'
  | 'conference-townhall'
  | 'boardroom-meals'
  | 'festive-hampers'
  | 'bulk-chocolates-cookies';

export type CorporateDietaryType = 'veg' | 'non-veg' | 'mixed';

export interface CorporateCategory {
  id: CorporateCategoryId;
  name: string;
  shortName: string;
  description: string;
  typicalMoq: string;
  dietarySummary: string;
  image: string;
}

export interface CorporatePackTier {
  id: string;
  label: string;
  minQty: number;
  maxQty?: number;
  unitPriceInr: number;
  note: string;
}

export interface CorporateProductVariant {
  id: string;
  label: string;
  dietary: 'veg' | 'non-veg';
  priceDeltaInr: number;
  contentsNote: string;
}

export interface CorporateProductReview {
  id: string;
  productId: string;
  authorName: string;
  companyAndRole: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface CorporateBoxProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  categoryId: CorporateCategoryId;
  categoryName: string;
  subtitle: string;
  description: string;
  dietary: CorporateDietaryType;
  dietaryBadgeText: string;
  servingsInfo: string;
  netWeightOrCount: string;
  moqSingleSample: boolean;
  moqBulk: number;
  samplePriceInr: number;
  bulkStartingPriceInr: number;
  isDemoPrice: boolean;
  featured: boolean;
  image: string;
  gallery: string[];
  contents: string[];
  tiers: CorporatePackTier[];
  variants: CorporateProductVariant[];
  customisationSupported: {
    logoBellySleeve: boolean;
    ribbonChoice: boolean;
    printedWelcomeCard: boolean;
    foilStampingMinQty: number;
  };
  disclosures: {
    ingredientsPlaceholder: string;
    allergensPlaceholder: string;
    shelfLifeAndStorage: string;
    deliveryTimeline: string;
  };
  active?: boolean;
  isCloudSaved?: boolean;
}

export interface BoxBuilderSize {
  id: 'petite-4' | 'signature-6' | 'grand-9';
  name: string;
  capacity: number;
  boxBaseInr: number;
  dimensions: string;
  description: string;
}

export type BoxBuilderItemGroup =
  | 'Snacks & Savouries'
  | 'Roasted Nuts'
  | 'Artisanal Chocolates'
  | 'Cookies & Brownies'
  | 'Beverages';

export interface BoxBuilderItem {
  id: string;
  name: string;
  group: BoxBuilderItemGroup;
  portion: string;
  dietary: 'veg' | 'non-veg';
  priceInr: number;
  available: boolean;
  unavailableReason?: string;
  note: string;
  active?: boolean;
  isCloudSaved?: boolean;
}

export interface CorporateQuoteEnquiry {
  id: string;
  referenceId: string;
  companyName: string;
  contactPerson: string;
  workEmail: string;
  phoneWhatsapp: string;
  giftingType: string;
  approximateQty: number;
  budgetRangeInr: string;
  requiredDeliveryDate: string;
  customisations: string[];
  notes: string;
  builderSnapshot?: string;
  createdAt: string;
  status: 'Submitted (Awaiting Review)' | 'Quote Shared' | 'Confirmed';
}

export interface BoxBiteCartItem {
  cartItemId: string;
  kind: 'catalog' | 'custom-box';
  productId: string;
  title: string;
  subtitle: string;
  image: string;
  unitPriceInr: number;
  quantity: number;
  variantLabel?: string;
  dietaryLabel: string;
  customisationSummary?: string;
  customNote?: string;
}

export interface BoxBiteSampleOrder {
  id: string;
  orderNumber: string;
  companyOrRecipient: string;
  contactName: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  cityPincode: string;
  items: BoxBiteCartItem[];
  subtotalInr: number;
  discountInr: number;
  promoCode?: string;
  shippingEstimateInr: number;
  totalInr: number;
  paymentStatus: 'Demo Order (No Live Payment Gateway Connected)';
  createdAt: string;
}

export const BOXBITE_IMAGES = {
  heroEditorial: '/src/assets/images/boxbite_hero_editorial_1795424832776.jpg',
  onboardingWelcome: '/src/assets/images/boxbite_onboarding_welcome_1795424832358.jpg',
  boardroomMeals: '/src/assets/images/boxbite_boardroom_meals_1795424831611.jpg',
  festiveHamper: '/src/assets/images/boxbite_festive_hamper_1795424832041.jpg',
  chocolateCookies: '/src/assets/images/boxbite_chocolate_cookies_1795424831679.jpg',
  snackboxGifting: '/src/assets/images/vendor_snackbox_gifting_1795195513732.jpg',
  mithaiChocolates: '/src/assets/images/cat_mithai_chocolates_1795198470485.jpg',
  artisanDesserts: '/src/assets/images/vendor_artisan_desserts_1795190928902.jpg',
  gourmetCatering: '/src/assets/images/vendor_gourmet_catering_1795190931142.jpg',
} as const;

export const CORPORATE_CATEGORIES: CorporateCategory[] = [
  {
    id: 'welcome-onboarding',
    name: 'Employee Welcome / Onboarding Boxes',
    shortName: 'Welcome & Onboarding',
    description:
      'Day-one desk hampers crafted with clean-label snacks, gourmet biscuits, and your company welcome letter.',
    typicalMoq: '10+ boxes (Single sample available)',
    dietarySummary: '100% Vegetarian',
    image: BOXBITE_IMAGES.onboardingWelcome,
  },
  {
    id: 'employee-appreciation',
    name: 'Employee Appreciation & Milestone Gifts',
    shortName: 'Appreciation & Milestones',
    description:
      'Work-anniversary, promotion, and quarter-close keepsake boxes with custom printed leadership notes.',
    typicalMoq: '10+ boxes',
    dietarySummary: 'Vegetarian & Eggless options',
    image: BOXBITE_IMAGES.heroEditorial,
  },
  {
    id: 'executive-client',
    name: 'Executive Client Gifting Hampers',
    shortName: 'Executive Client Hampers',
    description:
      'Architectural rigid trunks curated with single-origin chocolates, spiced cashews, and single-estate tea tins.',
    typicalMoq: '10+ trunks',
    dietarySummary: 'Vegetarian',
    image: BOXBITE_IMAGES.festiveHamper,
  },
  {
    id: 'conference-townhall',
    name: 'Conference & Townhall Snack Boxes',
    shortName: 'Conference & Townhall',
    description:
      'Spill-proof individual snack kits engineered for seamless auditorium, offsite, and panel distribution.',
    typicalMoq: '25+ boxes',
    dietarySummary: 'Vegetarian',
    image: BOXBITE_IMAGES.snackboxGifting,
  },
  {
    id: 'boardroom-meals',
    name: 'Meeting & Boardroom Meal Boxes',
    shortName: 'Boardroom Meal Boxes',
    description:
      'Hot, compartmentalised executive lunch & working-dinner boxes with clear Vegetarian and Non-Vegetarian seals.',
    typicalMoq: '10+ boxes',
    dietarySummary: 'Vegetarian & Non-Vegetarian',
    image: BOXBITE_IMAGES.boardroomMeals,
  },
  {
    id: 'festive-hampers',
    name: 'Festive Corporate Hampers (Diwali, New Year, etc.)',
    shortName: 'Festive Hampers',
    description:
      'Diwali, New Year, and harvest gifting collections balancing artisanal Indian mithai with modern confections.',
    typicalMoq: '15+ hampers',
    dietarySummary: '100% Vegetarian',
    image: BOXBITE_IMAGES.mithaiChocolates,
  },
  {
    id: 'bulk-chocolates-cookies',
    name: 'Bulk Chocolate & Cookie Gift Boxes',
    shortName: 'Chocolates & Cookies',
    description:
      'Small-batch bonbons, cardamom butter shortbread, and walnut brownies packed in foil-ready rigid boxes.',
    typicalMoq: '15+ boxes',
    dietarySummary: 'Eggless & Classic',
    image: BOXBITE_IMAGES.chocolateCookies,
  },
];

export const CORPORATE_BUDGET_RANGES = [
  '₹450 – ₹750 per box',
  '₹750 – ₹1,250 per box',
  '₹1,250 – ₹2,000 per box',
  '₹2,000 – ₹3,500 per box',
  '₹3,500+ (Bespoke Executive Trunk)',
] as const;

export const CORPORATE_BOX_PRODUCTS: CorporateBoxProduct[] = [
  {
    id: 'bb-welcome-day-one',
    slug: 'first-day-atelier-welcome-box',
    sku: 'BB-ONB-01',
    name: 'The First-Day Atelier Welcome Box',
    categoryId: 'welcome-onboarding',
    categoryName: 'Employee Welcome / Onboarding Boxes',
    subtitle: 'Masala chai biscuits, roasted California almonds, single-origin dark squares & custom welcome card',
    description:
      'Designed for HR and People Ops teams welcoming new hires across India. Presented in a deep chocolate-brown magnetic lid box with your brand sleeve and personalized Day-One welcome note.',
    dietary: 'veg',
    dietaryBadgeText: '100% Vegetarian',
    servingsInfo: 'Curated for 1 recipient (4 full-sized snacks)',
    netWeightOrCount: '420g net · 4 artisanal components',
    moqSingleSample: true,
    moqBulk: 10,
    samplePriceInr: 1290,
    bulkStartingPriceInr: 1090,
    isDemoPrice: true,
    featured: true,
    image: BOXBITE_IMAGES.onboardingWelcome,
    gallery: [BOXBITE_IMAGES.onboardingWelcome, BOXBITE_IMAGES.heroEditorial],
    contents: [
      'Hand-rolled Masala Chai Shortbread Cookies (120g sealed pouch)',
      'Slow-Roasted Sea-Salt & Pepper Almonds (100g kraft tin)',
      '70% Idukki Single-Origin Dark Chocolate Squares (8 pcs)',
      'Custom 350 GSM Welcome Letter Card with HR / CEO signature print',
    ],
    tiers: [
      { id: 'sample', label: 'Single Sample Box', minQty: 1, maxQty: 1, unitPriceInr: 1290, note: 'Illustrative demo sample rate' },
      { id: 'pack-10', label: 'Team Pack (10–49 boxes)', minQty: 10, maxQty: 49, unitPriceInr: 1150, note: 'Includes custom logo belly sleeve' },
      { id: 'pack-50', label: 'Enterprise Batch (50+ boxes)', minQty: 50, unitPriceInr: 1090, note: 'Includes foil sleeve + welcome card' },
    ],
    variants: [
      {
        id: 'veg-eggless',
        label: '100% Vegetarian · Eggless Bakes',
        dietary: 'veg',
        priceDeltaInr: 0,
        contentsNote: 'Prepared with eggless shortbread and pure dark chocolate.',
      },
      {
        id: 'veg-jaggery',
        label: '100% Vegetarian · Jaggery Sweetened Edition',
        dietary: 'veg',
        priceDeltaInr: 90,
        contentsNote: 'Substitutes refined sugar biscuits with millet-jaggery cookies.',
      },
    ],
    customisationSupported: {
      logoBellySleeve: true,
      ribbonChoice: true,
      printedWelcomeCard: true,
      foilStampingMinQty: 25,
    },
    disclosures: {
      ingredientsPlaceholder:
        'Sample component list: whole wheat flour, butter, Assam spice blend, roasted almonds, cocoa solids, cane sugar, cocoa butter, milk solids (varies by batch). Final kitchen ingredient sheet provided with confirmed order.',
      allergensPlaceholder:
        'Contains tree nuts (almonds), dairy, and wheat/gluten. Prepared in a facility that handles peanuts, sesame, and soy. Do not rely on demo labels for severe allergies—request batch-specific allergen sheet before dispatch.',
      shelfLifeAndStorage:
        'Dry snacks & chocolates best enjoyed within 21 days when stored in a cool, dry place away from direct sunlight (below 24°C).',
      deliveryTimeline:
        'Single sample dispatches in 2–4 business days. Branded bulk batches of 10–250 boxes ship in 5–8 business days after sleeve artwork approval.',
    },
  },
  {
    id: 'bb-boardroom-executive-meal',
    slug: 'boardroom-executive-lunch-box',
    sku: 'BB-MEL-02',
    name: 'Executive Boardroom Compartmentalised Meal Box',
    categoryId: 'boardroom-meals',
    categoryName: 'Meeting & Boardroom Meal Boxes',
    subtitle: 'Four-course plated executive working lunch in spill-proof warm kraft & espresso compartments',
    description:
      'Built for leadership offsites, investor meetings, and client lunches where messy takeout containers undermine the room. Clearly sealed Vegetarian and Non-Vegetarian editions with wooden cutlery and hand wipes.',
    dietary: 'mixed',
    dietaryBadgeText: 'Veg & Non-Veg Options',
    servingsInfo: '1 full executive meal per box',
    netWeightOrCount: '580g–640g complete hot meal',
    moqSingleSample: true,
    moqBulk: 10,
    samplePriceInr: 680,
    bulkStartingPriceInr: 560,
    isDemoPrice: true,
    featured: true,
    image: BOXBITE_IMAGES.boardroomMeals,
    gallery: [BOXBITE_IMAGES.boardroomMeals, BOXBITE_IMAGES.gourmetCatering],
    contents: [
      'Charred Starter Skewers (Saffron Paneer Tikka for Veg / Murgh Malai Tikka for Non-Veg)',
      'Fragrant Jeera & Coriander Basmati Pulao',
      '2 Mini Flaky Malabar Parathas + Slow-Simmered Dal Tadka Bowl',
      'Mint-Coriander Chutney + Chilled Pistachio Phirni Cup',
    ],
    tiers: [
      { id: 'sample', label: 'Single Tasting Box (Metro Only)', minQty: 1, maxQty: 1, unitPriceInr: 680, note: 'Sample tasting rate (demo)' },
      { id: 'pack-10', label: 'Boardroom Set (10–29 boxes)', minQty: 10, maxQty: 29, unitPriceInr: 610, note: 'Includes dietary seal stickers' },
      { id: 'pack-30', label: 'Townhall Meal Batch (30+ boxes)', minQty: 30, unitPriceInr: 560, note: 'Custom printed meeting agenda sleeve' },
    ],
    variants: [
      {
        id: 'veg-paneer',
        label: 'Vegetarian · Saffron Paneer & Dal Executive Meal',
        dietary: 'veg',
        priceDeltaInr: 0,
        contentsNote: 'Clearly green-dot sealed · Saffron Paneer Tikka + Dal Tadka + Pulao + Phirni.',
      },
      {
        id: 'nonveg-murgh',
        label: 'Non-Vegetarian · Murgh Malai & Dal Executive Meal',
        dietary: 'non-veg',
        priceDeltaInr: 110,
        contentsNote: 'Clearly brown-dot sealed · Murgh Malai Tikka + Dal Tadka + Pulao + Phirni.',
      },
    ],
    customisationSupported: {
      logoBellySleeve: true,
      ribbonChoice: false,
      printedWelcomeCard: true,
      foilStampingMinQty: 50,
    },
    disclosures: {
      ingredientsPlaceholder:
        'Freshly prepared Indian kitchen meal: cottage cheese or chicken, basmati rice, lentils, wheat paratha, dairy cream, clarified butter, whole spices, pistachios. Exact kitchen menu confirmed per city hub.',
      allergensPlaceholder:
        'Contains dairy, wheat/gluten, and tree nuts (pistachios/almonds). Non-Veg variant contains poultry. Kitchen handles sesame and mustard.',
      shelfLifeAndStorage:
        'Fresh hot meal box — consume within 2 hours of scheduled boardroom delivery for optimal temperature and food safety.',
      deliveryTimeline:
        'Same-city hot dispatch only (Hyderabad, Mumbai, Bengaluru, Delhi NCR). Requires minimum 24–48 hours advance scheduling.',
    },
  },
  {
    id: 'bb-festive-grand-trunk',
    slug: 'kaveri-festive-keepsake-trunk',
    sku: 'BB-FST-03',
    name: 'The Kaveri Festive Keepsake Trunk',
    categoryId: 'festive-hampers',
    categoryName: 'Festive Corporate Hampers (Diwali, New Year, etc.)',
    subtitle: 'Keepsake linen-finish trunk with artisanal kaju katli, chocolate bark, pecan brittle & Darjeeling tea',
    description:
      'A signature Diwali and New Year executive hamper pairing traditional Indian mithai craft with contemporary chocolate and single-estate tea, finished in a reusable brass-clasp keepsake trunk.',
    dietary: 'veg',
    dietaryBadgeText: '100% Vegetarian',
    servingsInfo: 'Shares across 3–4 people',
    netWeightOrCount: '780g net · Brass-clasp keepsake trunk',
    moqSingleSample: true,
    moqBulk: 15,
    samplePriceInr: 2650,
    bulkStartingPriceInr: 2290,
    isDemoPrice: true,
    featured: true,
    image: BOXBITE_IMAGES.festiveHamper,
    gallery: [BOXBITE_IMAGES.festiveHamper, BOXBITE_IMAGES.mithaiChocolates],
    contents: [
      'Kesar Kaju Katli Selection Box (250g · Saffron & Cashew)',
      'Roasted Pistachio & Rose Petal Dark Chocolate Bark (120g)',
      'Caramelised Spiced Pecan Brittle Jar (150g)',
      'First-Flush Darjeeling Loose Leaf Tea Tin (100g) + Brass Greeting Tag',
    ],
    tiers: [
      { id: 'sample', label: 'Single Executive Sample', minQty: 1, maxQty: 1, unitPriceInr: 2650, note: 'Illustrative demo sample rate' },
      { id: 'pack-15', label: 'Corporate Batch (15–49 trunks)', minQty: 15, maxQty: 49, unitPriceInr: 2450, note: 'Includes custom brand ribbon & tag' },
      { id: 'pack-50', label: 'Enterprise Festive Run (50+ trunks)', minQty: 50, unitPriceInr: 2290, note: 'Includes brass foil crest & multi-city split' },
    ],
    variants: [
      {
        id: 'veg-classic',
        label: '100% Vegetarian · Classic Diwali & New Year Edition',
        dietary: 'veg',
        priceDeltaInr: 0,
        contentsNote: 'Kesar Kaju Katli, Dark Bark, Pecan Brittle & Darjeeling Tea.',
      },
      {
        id: 'veg-low-sugar',
        label: '100% Vegetarian · Date-Sweetened Mithai Substitute',
        dietary: 'veg',
        priceDeltaInr: 180,
        contentsNote: 'Replaces Kaju Katli with Anjeer & Pistachio Date Bites.',
      },
    ],
    customisationSupported: {
      logoBellySleeve: true,
      ribbonChoice: true,
      printedWelcomeCard: true,
      foilStampingMinQty: 25,
    },
    disclosures: {
      ingredientsPlaceholder:
        'Sample composition: cashews, saffron, dark chocolate (cocoa mass, sugar, cocoa butter), pecans, rose petals, pistachios, Assam/Darjeeling black tea leaves.',
      allergensPlaceholder:
        'Contains tree nuts (cashews, pistachios, pecans) and may contain traces of milk and soy. Not certified allergen-free.',
      shelfLifeAndStorage:
        'Sweets best consumed within 14 days; tea and chocolate bark keep up to 45 days in cool storage (18–22°C).',
      deliveryTimeline:
        'Sample ships in 3–4 business days. Festive bulk orders require 7–10 business days prior to peak Diwali / New Year dispatch windows.',
    },
  },
  {
    id: 'bb-bulk-praline-cookie-coffret',
    slug: 'atelier-chocolate-cookie-coffret',
    sku: 'BB-CHC-04',
    name: 'Atelier Chocolate & Shortbread Coffret',
    categoryId: 'bulk-chocolates-cookies',
    categoryName: 'Bulk Chocolate & Cookie Gift Boxes',
    subtitle: 'Hazelnut dark pralines, cardamom butter shortbread & espresso walnut brownies in rigid dividers',
    description:
      'Ideal for client thank-yous, webinar speaker gifts, and festive team treats. Hand-packed in a chocolate-toned rigid box with precision dividers that keep every bonbon intact across courier transit.',
    dietary: 'veg',
    dietaryBadgeText: '100% Vegetarian (Eggless Option)',
    servingsInfo: '18 individual bites per box',
    netWeightOrCount: '460g net · 18-piece divided coffret',
    moqSingleSample: true,
    moqBulk: 15,
    samplePriceInr: 1180,
    bulkStartingPriceInr: 960,
    isDemoPrice: true,
    featured: true,
    image: BOXBITE_IMAGES.chocolateCookies,
    gallery: [BOXBITE_IMAGES.chocolateCookies, BOXBITE_IMAGES.artisanDesserts],
    contents: [
      'Roasted Hazelnut Dark Chocolate Bonbons (8 pcs)',
      'Green Cardamom Pure Butter Shortbread Rounds (5 pcs)',
      'Espresso & Walnut Fudge Brownie Squares (5 pcs)',
    ],
    tiers: [
      { id: 'sample', label: 'Single Sample Box', minQty: 1, maxQty: 1, unitPriceInr: 1180, note: 'Illustrative demo sample rate' },
      { id: 'pack-15', label: 'Team Pack (15–49 boxes)', minQty: 15, maxQty: 49, unitPriceInr: 1040, note: 'Custom belly sleeve included' },
      { id: 'pack-50', label: 'Bulk Gifting (50+ boxes)', minQty: 50, unitPriceInr: 960, note: 'Foil lid seal + bulk courier dispatch' },
    ],
    variants: [
      {
        id: 'veg-eggless',
        label: '100% Vegetarian · All-Eggless Edition',
        dietary: 'veg',
        priceDeltaInr: 0,
        contentsNote: 'All shortbread and espresso walnut brownies baked 100% eggless.',
      },
      {
        id: 'veg-classic',
        label: 'Vegetarian · Classic Patisserie Brownies',
        dietary: 'veg',
        priceDeltaInr: 0,
        contentsNote: 'Classic fudgy brownie batch (contains egg); pralines & shortbread remain eggless.',
      },
    ],
    customisationSupported: {
      logoBellySleeve: true,
      ribbonChoice: true,
      printedWelcomeCard: true,
      foilStampingMinQty: 30,
    },
    disclosures: {
      ingredientsPlaceholder:
        'Sample ingredients: couverture dark chocolate, roasted hazelnuts, cultured butter, refined wheat flour, Malabar green cardamom, walnuts, cocoa powder, espresso.',
      allergensPlaceholder:
        'Contains tree nuts (hazelnuts, walnuts), dairy, wheat/gluten, and soy lecithin. Classic variant contains egg.',
      shelfLifeAndStorage:
        'Chocolates & shortbread keep 21 days in AC room temperature; brownies best enjoyed within 7 days.',
      deliveryTimeline:
        '2–4 business days for samples; 5–7 business days for branded bulk runs with insulated summer gel-pack options.',
    },
  },
  {
    id: 'bb-executive-client-grand',
    slug: 'grand-atelier-client-collection',
    sku: 'BB-EXC-05',
    name: 'The Grand Atelier Client Collection',
    categoryId: 'executive-client',
    categoryName: 'Executive Client Gifting Hampers',
    subtitle: 'Curated signature hamper with pistachio rose barfi, glass nut jars, bonbons & cardamom cookies',
    description:
      'Our flagship client appreciation box designed to sit on an executive desk. Pairs Indian heritage flavours—pistachio rose barfi and spiced cashews—with Belgian-style bonbons in an architectural cream-and-espresso box.',
    dietary: 'veg',
    dietaryBadgeText: '100% Vegetarian',
    servingsInfo: 'Shares across 4–5 guests',
    netWeightOrCount: '840g net · Multi-compartment rigid box',
    moqSingleSample: true,
    moqBulk: 10,
    samplePriceInr: 2350,
    bulkStartingPriceInr: 1990,
    isDemoPrice: true,
    featured: true,
    image: BOXBITE_IMAGES.heroEditorial,
    gallery: [BOXBITE_IMAGES.heroEditorial, BOXBITE_IMAGES.festiveHamper],
    contents: [
      'Artisanal Gold-Leaf & Spiced Dark Chocolate Bonbons (12 pcs)',
      'Pistachio & Dried Rose Petal Barfi Squares (6 pcs)',
      'Hexagonal Cardamom & Pistachio Butter Cookies (120g)',
      '2 Corked Glass Jars: Spiced Pepper Cashews & Honey-Roasted Almonds',
    ],
    tiers: [
      { id: 'sample', label: 'Single Client Sample', minQty: 1, maxQty: 1, unitPriceInr: 2350, note: 'Illustrative demo sample rate' },
      { id: 'pack-10', label: 'Retainer Batch (10–39 boxes)', minQty: 10, maxQty: 39, unitPriceInr: 2150, note: 'Includes satin ribbon & custom sleeve' },
      { id: 'pack-40', label: 'Leadership Run (40+ boxes)', minQty: 40, unitPriceInr: 1990, note: 'Includes individual client courier dispatch' },
    ],
    variants: [
      {
        id: 'veg-standard',
        label: '100% Vegetarian · Signature Assortment',
        dietary: 'veg',
        priceDeltaInr: 0,
        contentsNote: 'Full signature selection with pistachio barfi, bonbons, cookies & dual nut jars.',
      },
    ],
    customisationSupported: {
      logoBellySleeve: true,
      ribbonChoice: true,
      printedWelcomeCard: true,
      foilStampingMinQty: 20,
    },
    disclosures: {
      ingredientsPlaceholder:
        'Sample ingredients: pistachios, cashews, almonds, khoya/milk solids, dark chocolate, edible rose petals, butter, wheat flour, whole cardamom.',
      allergensPlaceholder:
        'Contains tree nuts (pistachios, cashews, almonds), dairy, wheat/gluten, and soy. Batch-specific nutritional chart supplied with final quotation.',
      shelfLifeAndStorage:
        'Enjoy pistachio barfi within 10 days; cookies, bonbons & sealed nut jars keep up to 28 days in cool dry storage.',
      deliveryTimeline:
        'Sample ships in 2–4 business days. Multi-address client dispatches take 5–8 business days after recipient CSV verification.',
    },
  },
  {
    id: 'bb-conference-townhall-kit',
    slug: 'townhall-all-hands-snack-box',
    sku: 'BB-CNF-06',
    name: 'Townhall & Conference Break Box',
    categoryId: 'conference-townhall',
    categoryName: 'Conference & Townhall Snack Boxes',
    subtitle: 'Neatly portioned savoury & sweet break kit built for auditorium seats & hybrid team meets',
    description:
      'Eliminate buffet bottlenecks at all-hands meetings, hackathons, and offsites. Each guest receives an individually sealed, zero-spill box with balanced savoury, sweet, and cold-brew or spiced chai pairings.',
    dietary: 'veg',
    dietaryBadgeText: '100% Vegetarian',
    servingsInfo: '1 individual attendee break box',
    netWeightOrCount: '290g net · Individual carry box',
    moqSingleSample: true,
    moqBulk: 25,
    samplePriceInr: 520,
    bulkStartingPriceInr: 430,
    isDemoPrice: true,
    featured: false,
    image: BOXBITE_IMAGES.snackboxGifting,
    gallery: [BOXBITE_IMAGES.snackboxGifting, BOXBITE_IMAGES.onboardingWelcome],
    contents: [
      'Baked Methi & Jeera Khakhra Crisps with Mint Dip (75g)',
      'Roasted Makhana & Peri-Peri Cashew Mix (50g)',
      'Dark Chocolate Oatmeal Cookie (2 pcs)',
      'Single-Serve Cold Brew / Spiced Cardamom Iced Tea Bottle (200ml)',
    ],
    tiers: [
      { id: 'sample', label: 'Single Sample Box', minQty: 1, maxQty: 1, unitPriceInr: 520, note: 'Illustrative demo sample rate' },
      { id: 'pack-25', label: 'Conference Pack (25–99 boxes)', minQty: 25, maxQty: 99, unitPriceInr: 465, note: 'Includes event hashtag sticker seal' },
      { id: 'pack-100', label: 'Townhall Bulk (100+ boxes)', minQty: 100, unitPriceInr: 430, note: 'Custom event agenda card + single drop' },
    ],
    variants: [
      {
        id: 'veg-coffee',
        label: '100% Vegetarian · With Cold Brew Coffee',
        dietary: 'veg',
        priceDeltaInr: 0,
        contentsNote: 'Paired with 200ml glass-bottled Arabica cold brew.',
      },
      {
        id: 'veg-chai',
        label: '100% Vegetarian · With Spiced Iced Chai',
        dietary: 'veg',
        priceDeltaInr: 0,
        contentsNote: 'Paired with 200ml Assam cardamom iced chai.',
      },
    ],
    customisationSupported: {
      logoBellySleeve: true,
      ribbonChoice: false,
      printedWelcomeCard: true,
      foilStampingMinQty: 100,
    },
    disclosures: {
      ingredientsPlaceholder:
        'Sample ingredients: whole wheat, fenugreek leaves, fox nuts (makhana), cashews, oats, dark chocolate, cold-pressed oil, brewed coffee or tea.',
      allergensPlaceholder:
        'Contains wheat/gluten and tree nuts (cashews). May contain traces of dairy, soy, and sesame.',
      shelfLifeAndStorage:
        'Best consumed within 3 days of delivery; keep bottled beverage chilled prior to event distribution.',
      deliveryTimeline:
        'Scheduled morning drop-off across major Indian metros with 72 hours advance confirmation.',
    },
  },
  {
    id: 'bb-milestone-appreciation-box',
    slug: 'milestone-gratitude-atelier-box',
    sku: 'BB-APP-07',
    name: 'Milestone & Appreciation Keepsake Box',
    categoryId: 'employee-appreciation',
    categoryName: 'Employee Appreciation & Milestone Gifts',
    subtitle: 'Work-anniversary & recognition gift box with roasted nuts, brownies & custom milestone card',
    description:
      'Celebrate 1-year, 3-year, and 5-year work anniversaries or sprint wins with a tactile keepsake box tailored around genuine craftsmanship rather than generic corporate merch.',
    dietary: 'veg',
    dietaryBadgeText: '100% Vegetarian',
    servingsInfo: 'Curated for 1–2 recipients',
    netWeightOrCount: '540g net · 5 artisanal picks',
    moqSingleSample: true,
    moqBulk: 10,
    samplePriceInr: 1590,
    bulkStartingPriceInr: 1340,
    isDemoPrice: true,
    featured: true,
    image: BOXBITE_IMAGES.artisanDesserts,
    gallery: [BOXBITE_IMAGES.artisanDesserts, BOXBITE_IMAGES.heroEditorial],
    contents: [
      'Sea-Salt & Caramel Pecan Brownie Bites (4 pcs)',
      'Spiced Peri-Peri & Herb Roasted Cashews Jar (110g)',
      'Saffron & Almond Florentine Thins (100g)',
      'Artisanal Milk & Dark Chocolate Truffle Trio (6 pcs)',
      'Custom Foil-Framed Milestone Appreciation Card',
    ],
    tiers: [
      { id: 'sample', label: 'Single Sample Box', minQty: 1, maxQty: 1, unitPriceInr: 1590, note: 'Illustrative demo sample rate' },
      { id: 'pack-10', label: 'Department Pack (10–49 boxes)', minQty: 10, maxQty: 49, unitPriceInr: 1440, note: 'Includes custom card & satin ribbon' },
      { id: 'pack-50', label: 'Org-Wide Run (50+ boxes)', minQty: 50, unitPriceInr: 1340, note: 'Supports pan-India home address delivery' },
    ],
    variants: [
      {
        id: 'veg-eggless',
        label: '100% Vegetarian · Eggless Celebration Edit',
        dietary: 'veg',
        priceDeltaInr: 0,
        contentsNote: 'Prepared completely eggless with custom milestone note.',
      },
    ],
    customisationSupported: {
      logoBellySleeve: true,
      ribbonChoice: true,
      printedWelcomeCard: true,
      foilStampingMinQty: 20,
    },
    disclosures: {
      ingredientsPlaceholder:
        'Sample ingredients: almonds, cashews, pecans, Belgian dark/milk chocolate, saffron, honey, butter, wheat flour, cocoa solids.',
      allergensPlaceholder:
        'Contains tree nuts (almonds, cashews, pecans), dairy, wheat/gluten, and soy.',
      shelfLifeAndStorage:
        'Best consumed within 14 days in cool ambient storage.',
      deliveryTimeline:
        'Dispatches in 4–7 business days; individual home delivery tracking links shared for remote teams.',
    },
  },
];

export const BOX_BUILDER_SIZES: BoxBuilderSize[] = [
  {
    id: 'petite-4',
    name: 'Petite 4-Item Box',
    capacity: 4,
    boxBaseInr: 220,
    dimensions: '22 × 22 × 7 cm · Rigid Cream & Espresso Tray',
    description: 'Ideal for welcome desks, event speaker thank-yous, and light snacking.',
  },
  {
    id: 'signature-6',
    name: 'Signature 6-Item Box',
    capacity: 6,
    boxBaseInr: 320,
    dimensions: '28 × 22 × 8 cm · Magnetic Closure Box + Sleeve',
    description: 'Our most-requested format for onboarding kits and quarterly team gifting.',
  },
  {
    id: 'grand-9',
    name: 'Grand Trunk 9-Item',
    capacity: 9,
    boxBaseInr: 490,
    dimensions: '34 × 26 × 10 cm · Brass-Clasp Keepsake Trunk',
    description: 'Generous executive hamper format for client retainers and festive milestones.',
  },
];

export const BOX_BUILDER_ITEMS: BoxBuilderItem[] = [
  {
    id: 'bb-item-cashews',
    name: 'Black Pepper & Curry Leaf Roasted Cashews',
    group: 'Roasted Nuts',
    portion: '90g glass jar',
    dietary: 'veg',
    priceInr: 240,
    available: true,
    note: 'Slow-roasted whole W240 Goan cashews',
  },
  {
    id: 'bb-item-almonds',
    name: 'Himalayan Pink Salt & Rosemary Almonds',
    group: 'Roasted Nuts',
    portion: '90g kraft tin',
    dietary: 'veg',
    priceInr: 220,
    available: true,
    note: 'Crisp oven-toasted Californian almonds',
  },
  {
    id: 'bb-item-pistachios',
    name: 'Saffron & Cardamom Glazed Pistachios',
    group: 'Roasted Nuts',
    portion: '85g glass jar',
    dietary: 'veg',
    priceInr: 290,
    available: false,
    unavailableReason: 'Seasonal batch restocking',
    note: 'Small-batch Kashmiri saffron glaze',
  },
  {
    id: 'bb-item-makhana',
    name: 'Tandoori Masala Roasted Makhana',
    group: 'Snacks & Savouries',
    portion: '45g sealed pack',
    dietary: 'veg',
    priceInr: 130,
    available: true,
    note: 'Light popped lotus seeds tossed in ghee & spice',
  },
  {
    id: 'bb-item-khakhra',
    name: 'Crisp Methi & Jeera Mini Khakhras',
    group: 'Snacks & Savouries',
    portion: '75g vacuum pouch',
    dietary: 'veg',
    priceInr: 115,
    available: true,
    note: 'Artisanal Gujarati flat crisps',
  },
  {
    id: 'bb-item-lavash',
    name: 'Sesame Seed Lavash & Herb Dip Pack',
    group: 'Snacks & Savouries',
    portion: '80g pack',
    dietary: 'veg',
    priceInr: 145,
    available: true,
    note: 'Crisp flatbread shards with roasted garlic dip',
  },
  {
    id: 'bb-item-bonbons',
    name: '70% Idukki Dark Chocolate Bonbons (6 pcs)',
    group: 'Artisanal Chocolates',
    portion: '85g tray',
    dietary: 'veg',
    priceInr: 280,
    available: true,
    note: 'Single-origin Kerala cacao ganache',
  },
  {
    id: 'bb-item-bark',
    name: 'Pistachio, Cranberry & Sea Salt Bark',
    group: 'Artisanal Chocolates',
    portion: '100g slab',
    dietary: 'veg',
    priceInr: 260,
    available: true,
    note: 'Hand-tempered dark chocolate slab',
  },
  {
    id: 'bb-item-praline-truffle',
    name: 'Roasted Hazelnut Praline Truffles (4 pcs)',
    group: 'Artisanal Chocolates',
    portion: '65g tray',
    dietary: 'veg',
    priceInr: 250,
    available: true,
    note: 'Crisp feuilletine & hazelnut gianduja',
  },
  {
    id: 'bb-item-chai-cookies',
    name: 'Masala Chai Spiced Shortbread Cookies',
    group: 'Cookies & Brownies',
    portion: '100g pouch (6 pcs)',
    dietary: 'veg',
    priceInr: 165,
    available: true,
    note: 'Eggless cultured butter shortbread',
  },
  {
    id: 'bb-item-brownie',
    name: 'Espresso Walnut Fudge Brownie Square (2 pcs)',
    group: 'Cookies & Brownies',
    portion: '110g sealed pair',
    dietary: 'veg',
    priceInr: 195,
    available: true,
    note: 'Rich 55% dark chocolate brownie (eggless)',
  },
  {
    id: 'bb-item-nankhatai',
    name: 'Almond & Cardamom Heritage Nankhatai',
    group: 'Cookies & Brownies',
    portion: '100g box (6 pcs)',
    dietary: 'veg',
    priceInr: 160,
    available: true,
    note: 'Ghee-baked melt-in-mouth Indian cookies',
  },
  {
    id: 'bb-item-darjeeling-tea',
    name: 'First-Flush Darjeeling Loose Leaf Tin',
    group: 'Beverages',
    portion: '50g keepsake tin',
    dietary: 'veg',
    priceInr: 240,
    available: true,
    note: 'Floral single-estate spring harvest',
  },
  {
    id: 'bb-item-coldbrew',
    name: 'Chikmagalur Arabica Cold Brew Bottle',
    group: 'Beverages',
    portion: '200ml glass bottle',
    dietary: 'veg',
    priceInr: 175,
    available: true,
    note: 'Unsweetened slow-steeped estate roast',
  },
  {
    id: 'bb-item-hotchoc',
    name: 'Spiced Cinnamon Drinking Chocolate Mix',
    group: 'Beverages',
    portion: '100g kraft pouch',
    dietary: 'veg',
    priceInr: 210,
    available: false,
    unavailableReason: 'Back in stock next week',
    note: 'Real shaved dark chocolate with Ceylon cinnamon',
  },
];

export const INITIAL_BOX_REVIEWS: CorporateProductReview[] = [
  {
    id: 'rev-bb-1',
    productId: 'bb-welcome-day-one',
    authorName: 'Ananya Deshmukh',
    companyAndRole: 'Head of People Ops · FinStack Bengaluru',
    rating: 5,
    comment:
      'Ordered 45 welcome boxes for our Q3 onboarding cohort. The cream belly sleeve with our logo and printed CEO note felt thoughtful rather than overly promotional.',
    createdAt: 'Oct 14, 2026',
  },
  {
    id: 'rev-bb-2',
    productId: 'bb-boardroom-executive-meal',
    authorName: 'Rohan Kulkarni',
    companyAndRole: 'Workplace Operations · Meridian Advisory Mumbai',
    rating: 5,
    comment:
      'Having Vegetarian and Non-Vegetarian meal boxes clearly marked and neatly divided saved us from clattering plates during a 3-hour board review.',
    createdAt: 'Oct 28, 2026',
  },
  {
    id: 'rev-bb-3',
    productId: 'bb-festive-grand-trunk',
    authorName: 'Meera Krishnan',
    companyAndRole: 'Director of Client Partnerships · Verve Digital',
    rating: 5,
    comment:
      'Sent 80 Kaveri trunks across Mumbai, Hyderabad, and Gurugram. Every keepsake clasp arrived intact and the kaju katli + tea pairing stood out.',
    createdAt: 'Nov 03, 2026',
  },
];

export const BUILT_IN_BOXBITE_PRODUCT_IDS = new Set(
  CORPORATE_BOX_PRODUCTS.map((p) => p.id)
);

export const BUILT_IN_BOXBITE_BUILDER_ITEM_IDS = new Set(
  BOX_BUILDER_ITEMS.map((i) => i.id)
);

export function mergeBoxBiteProducts(cloudProducts: CorporateBoxProduct[]): {
  activeProducts: CorporateBoxProduct[];
  hiddenBuiltInProducts: CorporateBoxProduct[];
} {
  const cloudById = new Map<string, CorporateBoxProduct>();
  for (const prod of cloudProducts) {
    cloudById.set(prod.id, { ...prod, isCloudSaved: true });
  }

  const customAdded: CorporateBoxProduct[] = [];
  for (const prod of cloudProducts) {
    if (!BUILT_IN_BOXBITE_PRODUCT_IDS.has(prod.id) && prod.active !== false) {
      customAdded.push({ ...prod, isCloudSaved: true });
    }
  }

  const activeProducts: CorporateBoxProduct[] = [...customAdded];
  const hiddenBuiltInProducts: CorporateBoxProduct[] = [];

  for (const builtIn of CORPORATE_BOX_PRODUCTS) {
    const override = cloudById.get(builtIn.id);
    if (override) {
      if (override.active === false) {
        hiddenBuiltInProducts.push({ ...builtIn, ...override, isCloudSaved: true });
      } else {
        activeProducts.push({ ...builtIn, ...override, isCloudSaved: true });
      }
    } else {
      activeProducts.push(builtIn);
    }
  }

  return { activeProducts, hiddenBuiltInProducts };
}

export function mergeBoxBiteBuilderItems(cloudItems: BoxBuilderItem[]): BoxBuilderItem[] {
  const cloudById = new Map<string, BoxBuilderItem>();
  for (const item of cloudItems) {
    cloudById.set(item.id, { ...item, isCloudSaved: true });
  }

  const customAdded: BoxBuilderItem[] = [];
  for (const item of cloudItems) {
    if (!BUILT_IN_BOXBITE_BUILDER_ITEM_IDS.has(item.id) && item.active !== false) {
      customAdded.push({ ...item, isCloudSaved: true });
    }
  }

  const activeBuiltIns: BoxBuilderItem[] = [];
  for (const builtIn of BOX_BUILDER_ITEMS) {
    const override = cloudById.get(builtIn.id);
    if (override) {
      if (override.active !== false) {
        activeBuiltIns.push({ ...builtIn, ...override, isCloudSaved: true });
      }
    } else {
      activeBuiltIns.push(builtIn);
    }
  }

  return [...customAdded, ...activeBuiltIns];
}

