export type MarketplaceMode = 'all' | 'food' | 'party';

export type LaunchCountry =
  | 'All'
  | 'India'
  | 'Dubai / UAE'
  | 'Sri Lanka'
  | 'Pakistan'
  | 'Bangladesh'
  | 'Nepal';

export type PlanTier = 'business' | 'pro' | 'free';

export type PriceTier = '$' | '$$' | '$$$' | '$$$$';

export type CurrencyCode = 'INR' | 'AED' | 'LKR' | 'PKR' | 'BDT' | 'NPR' | 'USD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  rate: number; // conversion from 1 USD
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', rate: 84 },
  AED: { code: 'AED', symbol: 'AED ', rate: 3.67 },
  LKR: { code: 'LKR', symbol: 'LKR ', rate: 295 },
  PKR: { code: 'PKR', symbol: 'PKR ', rate: 278 },
  BDT: { code: 'BDT', symbol: '৳', rate: 119 },
  NPR: { code: 'NPR', symbol: 'NPR ', rate: 134 },
  USD: { code: 'USD', symbol: '$', rate: 1 },
};

export interface StateRegion {
  name: string;
  cities: string[];
  lat: number;
  lng: number;
}

export const COUNTRY_REGION_LABEL: Record<Exclude<LaunchCountry, 'All'>, string> = {
  India: 'State',
  'Dubai / UAE': 'Emirate',
  'Sri Lanka': 'Province',
  Pakistan: 'Province',
  Bangladesh: 'Division',
  Nepal: 'Province',
};

export const STATES_BY_COUNTRY: Record<Exclude<LaunchCountry, 'All'>, StateRegion[]> = {
  India: [
    { name: 'Maharashtra', cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik'], lat: 19.076, lng: 72.8777 },
    { name: 'Karnataka', cities: ['Bengaluru', 'Mysuru', 'Mangaluru'], lat: 12.9716, lng: 77.5946 },
    { name: 'Delhi NCR', cities: ['Delhi NCR', 'New Delhi', 'Gurugram', 'Noida'], lat: 28.6139, lng: 77.209 },
    { name: 'Kerala', cities: ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur'], lat: 9.9312, lng: 76.2673 },
    { name: 'Tamil Nadu', cities: ['Chennai', 'Coimbatore', 'Madurai'], lat: 13.0827, lng: 80.2707 },
    { name: 'Telangana', cities: ['Hyderabad', 'Warangal'], lat: 17.385, lng: 78.4867 },
    { name: 'Gujarat', cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'], lat: 23.0225, lng: 72.5714 },
    { name: 'West Bengal', cities: ['Kolkata', 'Siliguri', 'Howrah'], lat: 22.5726, lng: 88.3639 },
    { name: 'Rajasthan', cities: ['Jaipur', 'Udaipur', 'Jodhpur'], lat: 26.9124, lng: 75.7873 },
    { name: 'Punjab & Chandigarh', cities: ['Chandigarh', 'Ludhiana', 'Amritsar'], lat: 30.7333, lng: 76.7794 },
    { name: 'Uttar Pradesh', cities: ['Lucknow', 'Agra', 'Kanpur', 'Varanasi'], lat: 26.8467, lng: 80.9462 },
    { name: 'Goa', cities: ['Panaji', 'North Goa', 'South Goa'], lat: 15.2993, lng: 74.124 },
    { name: 'Andhra Pradesh', cities: ['Visakhapatnam', 'Vijayawada', 'Tirupati'], lat: 17.6868, lng: 83.2185 },
    { name: 'Madhya Pradesh', cities: ['Indore', 'Bhopal'], lat: 22.7196, lng: 75.8577 },
  ],
  'Dubai / UAE': [
    { name: 'Dubai', cities: ['Dubai', 'Downtown Dubai', 'Dubai Marina', 'Palm Jumeirah'], lat: 25.2048, lng: 55.2708 },
    { name: 'Abu Dhabi', cities: ['Abu Dhabi', 'Al Ain'], lat: 24.4539, lng: 54.3773 },
    { name: 'Sharjah', cities: ['Sharjah'], lat: 25.3463, lng: 55.4209 },
    { name: 'Ajman', cities: ['Ajman'], lat: 25.4052, lng: 55.5136 },
    { name: 'Ras Al Khaimah', cities: ['Ras Al Khaimah'], lat: 25.7895, lng: 55.9432 },
    { name: 'Fujairah', cities: ['Fujairah'], lat: 25.1288, lng: 56.3265 },
  ],
  'Sri Lanka': [
    { name: 'Western Province', cities: ['Colombo', 'Dehiwala', 'Mount Lavinia', 'Negombo'], lat: 6.9271, lng: 79.8612 },
    { name: 'Central Province', cities: ['Kandy', 'Nuwara Eliya'], lat: 7.2906, lng: 80.6337 },
    { name: 'Southern Province', cities: ['Galle', 'Matara', 'Bentota'], lat: 6.0535, lng: 80.221 },
    { name: 'North Western Province', cities: ['Kurunegala'], lat: 7.4818, lng: 80.3609 },
    { name: 'Northern Province', cities: ['Jaffna'], lat: 9.6615, lng: 80.0255 },
  ],
  Pakistan: [
    { name: 'Punjab', cities: ['Lahore', 'Rawalpindi', 'Faisalabad', 'Multan'], lat: 31.5204, lng: 74.3587 },
    { name: 'Sindh', cities: ['Karachi', 'Hyderabad'], lat: 24.8607, lng: 67.0011 },
    { name: 'Islamabad Capital Territory', cities: ['Islamabad'], lat: 33.6844, lng: 73.0479 },
    { name: 'Khyber Pakhtunkhwa', cities: ['Peshawar', 'Abbottabad'], lat: 34.0151, lng: 71.5249 },
    { name: 'Balochistan', cities: ['Quetta'], lat: 30.1798, lng: 66.975 },
  ],
  Bangladesh: [
    { name: 'Dhaka Division', cities: ['Dhaka', 'Gazipur', 'Narayanganj'], lat: 23.8103, lng: 90.4125 },
    { name: 'Chattogram Division', cities: ['Chattogram', "Cox's Bazar"], lat: 22.3569, lng: 91.7832 },
    { name: 'Sylhet Division', cities: ['Sylhet'], lat: 24.8949, lng: 91.8687 },
    { name: 'Rajshahi Division', cities: ['Rajshahi'], lat: 24.3745, lng: 88.6042 },
    { name: 'Khulna Division', cities: ['Khulna'], lat: 22.8456, lng: 89.5403 },
  ],
  Nepal: [
    { name: 'Bagmati Province', cities: ['Kathmandu', 'Lalitpur / Patan', 'Bhaktapur'], lat: 27.7172, lng: 85.324 },
    { name: 'Gandaki Province', cities: ['Pokhara'], lat: 28.2096, lng: 83.9856 },
    { name: 'Lumbini Province', cities: ['Butwal', 'Bhairahawa'], lat: 27.7006, lng: 83.4483 },
    { name: 'Koshi Province', cities: ['Biratnagar', 'Dharan'], lat: 26.4525, lng: 87.2718 },
    { name: 'Madhesh Province', cities: ['Janakpur', 'Birgunj'], lat: 26.7271, lng: 85.9407 },
  ],
};

export interface LaunchCityPreset {
  city: string;
  state: string;
  country: Exclude<LaunchCountry, 'All'>;
  lat: number;
  lng: number;
}

export const LAUNCH_CITY_PRESETS: LaunchCityPreset[] = [
  { city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.076, lng: 72.8777 },
  { city: 'Bengaluru', state: 'Karnataka', country: 'India', lat: 12.9716, lng: 77.5946 },
  { city: 'Delhi NCR', state: 'Delhi NCR', country: 'India', lat: 28.6139, lng: 77.209 },
  { city: 'Kochi', state: 'Kerala', country: 'India', lat: 9.9312, lng: 76.2673 },
  { city: 'Chennai', state: 'Tamil Nadu', country: 'India', lat: 13.0827, lng: 80.2707 },
  { city: 'Hyderabad', state: 'Telangana', country: 'India', lat: 17.385, lng: 78.4867 },
  { city: 'Dubai', state: 'Dubai', country: 'Dubai / UAE', lat: 25.2048, lng: 55.2708 },
  { city: 'Abu Dhabi', state: 'Abu Dhabi', country: 'Dubai / UAE', lat: 24.4539, lng: 54.3773 },
  { city: 'Colombo', state: 'Western Province', country: 'Sri Lanka', lat: 6.9271, lng: 79.8612 },
  { city: 'Lahore', state: 'Punjab', country: 'Pakistan', lat: 31.5204, lng: 74.3587 },
  { city: 'Karachi', state: 'Sindh', country: 'Pakistan', lat: 24.8607, lng: 67.0011 },
  { city: 'Dhaka', state: 'Dhaka Division', country: 'Bangladesh', lat: 23.8103, lng: 90.4125 },
  { city: 'Kathmandu', state: 'Bagmati Province', country: 'Nepal', lat: 27.7172, lng: 85.324 },
];

export interface VendorProduct {
  id: string;
  name: string;
  serves: string;
  priceUsd: number;
  description: string;
  image: string;
  tag?: string;
}

export interface VendorReview {
  id: string;
  author: string;
  role: string;
  date: string;
  rating: number;
  comment: string;
}

export interface Vendor {
  id: string;
  ownerId?: string;
  status?: 'active' | 'paused';
  slug: string;
  name: string;
  marketplace: 'food' | 'party';
  category: string;
  city: string;
  area: string;
  state: string;
  country: Exclude<LaunchCountry, 'All'>;
  lat: number;
  lng: number;
  whatsappNumber: string; // digits only with country code
  planTier: PlanTier;
  monthlyAutoPay: boolean;
  priceTier: PriceTier;
  startingPriceUsd: number;
  rating: number;
  reviewCount: number;
  responseTime: string;
  verified: boolean;
  tagline: string;
  description: string;
  serviceAreas: string[];
  specialties: string[];
  image: string;
  products: VendorProduct[];
  reviews: VendorReview[];
}

export interface BookingEnquiry {
  id: string;
  reference: string;
  customerId?: string;
  vendorOwnerId?: string;
  vendorId: string;
  vendorName: string;
  vendorCity: string;
  vendorCategory: string;
  packageName: string;
  estimatedUsd: number;
  eventDate: string;
  guests: number;
  customerName: string;
  customerEmail: string;
  notes: string;
  createdAt: string;
  status: 'Confirmed Enquiry' | 'Awaiting Vendor Reply' | 'Completed' | 'Cancelled';
}

export interface SaasPlan {
  id: PlanTier;
  name: string;
  badge: string;
  priceUsdMonthly: number;
  pricesByCurrency: Record<CurrencyCode, number>;
  tagline: string;
  billingNote: string;
  features: string[];
  highlighted?: boolean;
}

export const SAAS_PLANS: SaasPlan[] = [
  {
    id: 'free',
    name: 'Free Listing',
    badge: 'Start Free',
    priceUsdMonthly: 0,
    pricesByCurrency: { INR: 0, AED: 0, LKR: 0, PKR: 0, BDT: 0, NPR: 0, USD: 0 },
    tagline: 'List your business free today with a one-page website and direct WhatsApp button.',
    billingNote: 'Free forever · Zero commission',
    features: [
      'Listed in search & Near Me directory',
      'One-page vendor website with up to 5 products',
      'Direct WhatsApp customer button',
      'Verified customer reviews',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Partner',
    badge: 'Launch Offer · Auto-Pay',
    priceUsdMonthly: 4,
    pricesByCurrency: { INR: 299, AED: 15, LKR: 990, PKR: 999, BDT: 399, NPR: 499, USD: 4 },
    tagline: 'Rank above free listings across your city and convert leads straight on WhatsApp.',
    billingNote: 'Early launch price · Monthly auto-pay · Cancel anytime',
    highlighted: true,
    features: [
      'Priority placement ABOVE all Free listings',
      'Full one-page website with unlimited products & menus',
      'Featured Partner badge on cards & Near Me results',
      'Direct WhatsApp product order buttons',
      'AI Event Planner priority matching',
    ],
  },
  {
    id: 'business',
    name: 'Business Spotlight',
    badge: '#1 Top Pinned · Auto-Pay',
    priceUsdMonthly: 6,
    pricesByCurrency: { INR: 499, AED: 25, LKR: 1690, PKR: 1599, BDT: 699, NPR: 799, USD: 6 },
    tagline: 'Pin your brand #1 at the top across multiple areas for caterers, bakers & decor studios.',
    billingNote: 'Early launch price · Monthly auto-pay · Cancel anytime',
    features: [
      '#1 Pinned Top Listing in your category & city',
      'Multi-city & multi-area Near Me coverage',
      'Top recommendation slot in Josh AI Event Planner',
      'Custom shareable link + analytics dashboard',
      'Dedicated WhatsApp lead alerts & zero commission',
    ],
  },
];

export const HERO_FOOD_IMAGE = '/src/assets/images/hero-findmybites.png';
export const HERO_PARTY_IMAGE = '/src/assets/images/hero-pimpmpyparty.png';

export const IMG_CAKE = '/src/assets/images/vendor_wedding_cake_1795190931172.jpg';
export const IMG_CHEF = '/src/assets/images/vendor_private_chef_1795190930016.jpg';
export const IMG_CATERING = '/src/assets/images/vendor_gourmet_catering_1795190931142.jpg';
export const IMG_DESSERTS = '/src/assets/images/vendor_artisan_desserts_1795190928902.jpg';
export const IMG_LIVE_COUNTER = '/src/assets/images/vendor_live_counters_1795195513253.jpg';
export const IMG_BAR = '/src/assets/images/vendor_mocktail_bar_1795195514152.jpg';
export const IMG_GIFTING = '/src/assets/images/vendor_snackbox_gifting_1795195513732.jpg';
export const IMG_DECOR = '/src/assets/images/vendor_event_styling_1795190930150.jpg';
export const IMG_DJ = '/src/assets/images/vendor_dj_entertainment_1795190929542.jpg';
export const IMG_BALLOON = '/src/assets/images/cat_balloon_birthday_1795198470793.jpg';
export const IMG_MITHAI = '/src/assets/images/cat_mithai_chocolates_1795198470485.jpg';
export const IMG_VENUE = '/src/assets/images/cat_venue_rentals_1795198470730.jpg';
export const IMG_PHOTO = '/src/assets/images/cat_photo_mehendi_1795198470280.jpg';

export interface CategoryMeta {
  id: string;
  label: string;
  subtitle: string;
  ecosystem: 'food' | 'party';
  image: string;
  accent: string;
}

export const FOOD_CATEGORIES = [
  'Bakers & Cakes',
  'Home Bakers & Cloud Kitchens',
  'Live Counters & Food Stalls',
  'Catering Services',
  'Private Chefs & Home Dining',
  'Bar, Mocktails & Beverage Carts',
  'Snack Boxes & Party Platters',
  'Dessert Tables & Sweet Stations',
  'Gifting, Hampers & Return Favors',
  'Mithai, Chocolatiers & Dates',
  'Food Trucks & Pop-Up Carts',
  'Healthy, Vegan & Diet Catering',
] as const;

export const PARTY_CATEGORIES = [
  'Wedding & Party Decor',
  'Balloon & Theme Birthday Decor',
  'Event & Wedding Planners',
  'DJs, Sound & Live Bands',
  'Photographers & Videographers',
  'Venues, Farmhouses & Villas',
  'Photo Booths & 360 Spinners',
  'Kids Entertainment & Mascots',
  'Anchors, Emcees & Performers',
  'Makeup, Hair & Mehendi Artists',
  'Event Rentals, Furniture & Tents',
  'Lighting, AV & Cold Fireworks',
] as const;

export const ALL_CATEGORIES = [...FOOD_CATEGORIES, ...PARTY_CATEGORIES] as const;

export const CATEGORY_CARDS: CategoryMeta[] = [
  // FindMyBites (12 Categories)
  {
    id: 'Bakers & Cakes',
    label: 'Bakers & Cakes',
    subtitle: 'Wedding, birthday & eggless cakes',
    ecosystem: 'food',
    image: IMG_CAKE,
    accent: 'from-amber-400 to-orange-500',
  },
  {
    id: 'Home Bakers & Cloud Kitchens',
    label: 'Home Bakers & Cloud Kitchens',
    subtitle: 'Bento cakes, brownies & home chefs',
    ecosystem: 'food',
    image: IMG_DESSERTS,
    accent: 'from-orange-400 to-amber-500',
  },
  {
    id: 'Live Counters & Food Stalls',
    label: 'Live Counters & Food Stalls',
    subtitle: 'Chaat, tandoor, pizza, hoppers & BBQ',
    ecosystem: 'food',
    image: IMG_LIVE_COUNTER,
    accent: 'from-orange-500 to-red-500',
  },
  {
    id: 'Catering Services',
    label: 'Catering Services',
    subtitle: 'Weddings, house parties & corporate',
    ecosystem: 'food',
    image: IMG_CATERING,
    accent: 'from-amber-500 to-orange-600',
  },
  {
    id: 'Private Chefs & Home Dining',
    label: 'Private Chefs & Home Dining',
    subtitle: 'Tasting menus & villa grill masters',
    ecosystem: 'food',
    image: IMG_CHEF,
    accent: 'from-amber-600 to-rose-600',
  },
  {
    id: 'Bar, Mocktails & Beverage Carts',
    label: 'Bar, Mocktails & Beverage Carts',
    subtitle: 'Mobile bars, chai, coffee & matcha',
    ecosystem: 'food',
    image: IMG_BAR,
    accent: 'from-rose-500 to-amber-500',
  },
  {
    id: 'Snack Boxes & Party Platters',
    label: 'Snack Boxes & Party Platters',
    subtitle: 'Kids boxes, office high-tea & grazing',
    ecosystem: 'food',
    image: IMG_GIFTING,
    accent: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'Dessert Tables & Sweet Stations',
    label: 'Dessert Tables & Sweet Stations',
    subtitle: 'Macaron towers, gelato & waffles',
    ecosystem: 'food',
    image: IMG_DESSERTS,
    accent: 'from-rose-400 to-orange-500',
  },
  {
    id: 'Gifting, Hampers & Return Favors',
    label: 'Gifting, Hampers & Return Favors',
    subtitle: 'Wedding invites, Diwali, Eid & Holud',
    ecosystem: 'food',
    image: IMG_GIFTING,
    accent: 'from-orange-400 to-rose-500',
  },
  {
    id: 'Mithai, Chocolatiers & Dates',
    label: 'Mithai, Chocolatiers & Dates',
    subtitle: 'Artisan sweets, baklava & luxury dates',
    ecosystem: 'food',
    image: IMG_MITHAI,
    accent: 'from-amber-500 to-yellow-600',
  },
  {
    id: 'Food Trucks & Pop-Up Carts',
    label: 'Food Trucks & Pop-Up Carts',
    subtitle: 'Outdoor lawn, beach & festival trucks',
    ecosystem: 'food',
    image: IMG_LIVE_COUNTER,
    accent: 'from-red-500 to-orange-500',
  },
  {
    id: 'Healthy, Vegan & Diet Catering',
    label: 'Healthy, Vegan & Diet Catering',
    subtitle: 'Vegan, Jain, gluten-free & keto menus',
    ecosystem: 'food',
    image: IMG_CHEF,
    accent: 'from-emerald-500 to-amber-500',
  },

  // PimpMyParty (12 Categories)
  {
    id: 'Wedding & Party Decor',
    label: 'Wedding & Party Decor',
    subtitle: 'Mandaps, floral arches & stage styling',
    ecosystem: 'party',
    image: IMG_DECOR,
    accent: 'from-fuchsia-500 to-purple-600',
  },
  {
    id: 'Balloon & Theme Birthday Decor',
    label: 'Balloon & Theme Birthday Decor',
    subtitle: 'Kids themes, neon signs & baby showers',
    ecosystem: 'party',
    image: IMG_BALLOON,
    accent: 'from-pink-500 to-fuchsia-500',
  },
  {
    id: 'Event & Wedding Planners',
    label: 'Event & Wedding Planners',
    subtitle: 'End-to-end wedding & party coordination',
    ecosystem: 'party',
    image: IMG_VENUE,
    accent: 'from-pink-500 to-purple-600',
  },
  {
    id: 'DJs, Sound & Live Bands',
    label: 'DJs, Sound & Live Bands',
    subtitle: 'Sangeet DJs, sufi bands & live dhol',
    ecosystem: 'party',
    image: IMG_DJ,
    accent: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'Photographers & Videographers',
    label: 'Photographers & Videographers',
    subtitle: 'Candid weddings, drones & 48hr reels',
    ecosystem: 'party',
    image: IMG_PHOTO,
    accent: 'from-fuchsia-400 to-rose-500',
  },
  {
    id: 'Venues, Farmhouses & Villas',
    label: 'Venues, Farmhouses & Villas',
    subtitle: 'Banquets, lawns, villas & rooftops',
    ecosystem: 'party',
    image: IMG_VENUE,
    accent: 'from-violet-500 to-fuchsia-600',
  },
  {
    id: 'Photo Booths & 360 Spinners',
    label: 'Photo Booths & 360 Spinners',
    subtitle: '360 video spinners, mirror & polaroid',
    ecosystem: 'party',
    image: IMG_PHOTO,
    accent: 'from-fuchsia-500 to-pink-600',
  },
  {
    id: 'Kids Entertainment & Mascots',
    label: 'Kids Entertainment & Mascots',
    subtitle: 'Magicians, bouncy castles & soft play',
    ecosystem: 'party',
    image: IMG_BALLOON,
    accent: 'from-rose-400 to-purple-500',
  },
  {
    id: 'Anchors, Emcees & Performers',
    label: 'Anchors, Emcees & Performers',
    subtitle: 'Event hosts, dancers & live artists',
    ecosystem: 'party',
    image: IMG_DJ,
    accent: 'from-purple-500 to-pink-500',
  },
  {
    id: 'Makeup, Hair & Mehendi Artists',
    label: 'Makeup, Hair & Mehendi Artists',
    subtitle: 'Bridal makeup, draping & henna stalls',
    ecosystem: 'party',
    image: IMG_PHOTO,
    accent: 'from-pink-600 to-rose-500',
  },
  {
    id: 'Event Rentals, Furniture & Tents',
    label: 'Event Rentals, Furniture & Tents',
    subtitle: 'Lounge seating, marquees & tableware',
    ecosystem: 'party',
    image: IMG_VENUE,
    accent: 'from-indigo-500 to-purple-600',
  },
  {
    id: 'Lighting, AV & Cold Fireworks',
    label: 'Lighting, AV & Cold Fireworks',
    subtitle: 'Fairy canopies, LED floors & cold pyro',
    ecosystem: 'party',
    image: IMG_DECOR,
    accent: 'from-fuchsia-600 to-violet-600',
  },
];

export const LAUNCH_COUNTRIES: LaunchCountry[] = [
  'All',
  'India',
  'Dubai / UAE',
  'Sri Lanka',
  'Pakistan',
  'Bangladesh',
  'Nepal',
];

export const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'saffron-crumb-mumbai',
    slug: 'saffron-crumb-mumbai',
    name: 'Saffron & Crumb Bakehouse',
    marketplace: 'food',
    category: 'Bakers & Cakes',
    city: 'Mumbai',
    area: 'Bandra West',
    state: 'Maharashtra',
    country: 'India',
    lat: 19.0596,
    lng: 72.8295,
    whatsappNumber: '919820112233',
    planTier: 'business',
    monthlyAutoPay: true,
    priceTier: '$$',
    startingPriceUsd: 55,
    rating: 4.96,
    reviewCount: 248,
    responseTime: 'Under 15 mins on WhatsApp',
    verified: true,
    tagline: 'Custom tiered wedding & birthday cakes, 100% eggless sponges, and live dessert tables.',
    description:
      'Bandra’s award-winning boutique bakery crafting sculptural wedding cakes, kids theme birthday cakes, and Belgian chocolate dessert bars across Mumbai & Navi Mumbai. Every cake is baked to order with 100% eggless & vegan options.',
    serviceAreas: ['Bandra', 'Juhu', 'South Mumbai', 'Powai', 'Thane', 'Navi Mumbai'],
    specialties: ['Wedding Cakes', '100% Eggless', 'Kids Theme Cakes', 'Same-Week Custom Orders'],
    image: IMG_CAKE,
    products: [
      {
        id: 'sc-1',
        name: '3-Tier Botanical Wedding Cake',
        serves: '80–100 guests',
        priceUsd: 260,
        description: 'Belgian truffle, pistachio rose, or lotus biscoff sponge with fresh floral styling and venue setup.',
        image: IMG_CAKE,
        tag: 'Bestseller',
      },
      {
        id: 'sc-2',
        name: 'Custom Theme Birthday Cake (2 kg)',
        serves: '20–25 guests',
        priceUsd: 55,
        description: 'Hand-piped buttercream or fondant character cake with custom name topper.',
        image: IMG_DESSERTS,
        tag: '100% Eggless',
      },
      {
        id: 'sc-3',
        name: 'Luxury Cupcake & Macaron Tower (60 pcs)',
        serves: '35–50 guests',
        priceUsd: 95,
        description: 'Assorted pistachio, raspberry, and dark chocolate patisserie tower for engagement & baby showers.',
        image: IMG_DESSERTS,
      },
    ],
    reviews: [
      {
        id: 'r1',
        author: 'Rohan & Aditi Deshmukh',
        role: 'Sangeet & Reception · 120 Guests',
        date: 'October 2026',
        rating: 5,
        comment:
          'Messaged them directly on WhatsApp from their vendor page—taste, finish, and punctual hotel setup were flawless.',
      },
    ],
  },
  {
    id: 'royal-chaat-live-delhi',
    slug: 'royal-chaat-live-delhi',
    name: 'Royal Chaat & Tandoor Live Counters',
    marketplace: 'food',
    category: 'Live Counters & Food Stalls',
    city: 'Delhi NCR',
    area: 'Gurugram & South Delhi',
    state: 'Delhi NCR',
    country: 'India',
    lat: 28.5355,
    lng: 77.241,
    whatsappNumber: '919811223344',
    planTier: 'business',
    monthlyAutoPay: true,
    priceTier: '$$$',
    startingPriceUsd: 380,
    rating: 4.94,
    reviewCount: 192,
    responseTime: 'Under 20 mins on WhatsApp',
    verified: true,
    tagline: 'Signature copper live chaat, wood-fired pizza, live dimsum, and tandoor counters for weddings & parties.',
    description:
      'Turn any lawn, farmhouse, or terrace party into an interactive food festival. Our uniformed chefs arrive with hammered copper stalls, live lighting, hygienic RO water prep, and unlimited servings for 3–5 hours.',
    serviceAreas: ['South Delhi', 'Gurugram', 'Noida', 'Chhatarpur Farmhouses', 'Faridabad'],
    specialties: ['Live Chaat Bazaar', 'Wood-Fired Pizza', 'Live Kebabs & Tandoor', 'Kulfi & Jalebi Counter'],
    image: IMG_LIVE_COUNTER,
    products: [
      {
        id: 'rc-1',
        name: 'Old Delhi Live Chaat Counter (6 Items)',
        serves: '100 guests',
        priceUsd: 380,
        description: 'Golgappa shots, palak patta chaat, aloo tikki, dahi bhalla, ram ladoo & live kulhad chai.',
        image: IMG_LIVE_COUNTER,
        tag: 'Most Booked',
      },
      {
        id: 'rc-2',
        name: 'Grand 3-Counter Wedding Package',
        serves: '200 guests',
        priceUsd: 1120,
        description: 'Live Chaat Bazaar + Charcoal Tandoor Kebabs + Live Rabri Jalebi station with copper brass setup.',
        image: IMG_CATERING,
        tag: 'Wedding Favorite',
      },
      {
        id: 'rc-3',
        name: 'Artisan Live Pasta & Pizza Stall',
        serves: '80 guests',
        priceUsd: 460,
        description: 'Freshly stretched sourdough pizzas and live tossed pastas ideal for kids birthdays & house parties.',
        image: IMG_CHEF,
      },
    ],
    reviews: [
      {
        id: 'r2',
        author: 'Vikram Malhotra',
        role: 'Mehendi Brunch · 180 Guests',
        date: 'October 2026',
        rating: 5,
        comment:
          'The hammered copper live chaat setup stole the entire afternoon. Guests lined up for seconds and thirds.',
      },
    ],
  },
  {
    id: 'botanical-bar-dubai',
    slug: 'botanical-bar-dubai',
    name: 'Saffron Pour Mobile Bar & Mocktails',
    marketplace: 'food',
    category: 'Bar, Mocktails & Beverage Carts',
    city: 'Dubai',
    area: 'Downtown & Palm Jumeirah',
    state: 'Dubai',
    country: 'Dubai / UAE',
    lat: 25.1972,
    lng: 55.2744,
    whatsappNumber: '971504455667',
    planTier: 'business',
    monthlyAutoPay: true,
    priceTier: '$$$',
    startingPriceUsd: 520,
    rating: 4.95,
    reviewCount: 164,
    responseTime: 'Under 15 mins on WhatsApp',
    verified: true,
    tagline: 'Bespoke zero-proof botanical mocktail bars, smoked cocktail counters, and luxury glassware.',
    description:
      'Dubai’s premier mobile bar studio for villa parties, yacht celebrations, corporate launches, and weddings across Dubai & Abu Dhabi. Custom backlit brass bar counters, dry-ice signatures, and certified mixologists.',
    serviceAreas: ['Downtown Dubai', 'Palm Jumeirah', 'Dubai Marina', 'JBR', 'Abu Dhabi', 'Sharjah'],
    specialties: ['100% Zero-Proof Mocktails', 'Backlit Brass Bar', 'Smoked Signatures', 'Yacht & Villa Setup'],
    image: IMG_BAR,
    products: [
      {
        id: 'bp-1',
        name: 'Zero-Proof Botanical Mocktail Bar (4 hrs)',
        serves: '50–75 guests',
        priceUsd: 520,
        description: 'Backlit brass counter, 2 mixologists, crystal glassware, and 5 signature saffron/citrus mocktails.',
        image: IMG_BAR,
        tag: 'Halal Friendly',
      },
      {
        id: 'bp-2',
        name: 'Luxury Villa Full Bar & Molecular Station',
        serves: '100–150 guests',
        priceUsd: 1180,
        description: 'Custom monogrammed ice cubes, smoke bubble infusions, espresso martinis, and 3 bartenders.',
        image: IMG_BAR,
        tag: 'VIP Package',
      },
    ],
    reviews: [
      {
        id: 'r3',
        author: 'Layla Al-Mansoori',
        role: 'Villa Engagement · 90 Guests',
        date: 'October 2026',
        rating: 5,
        comment:
          'Found them using Near Me in Dubai and finalized the custom mocktail menu on WhatsApp in 10 minutes.',
      },
    ],
  },
  {
    id: 'marigold-decor-dubai',
    slug: 'marigold-decor-dubai',
    name: 'Marigold & Silk Event Decor',
    marketplace: 'party',
    category: 'Wedding & Party Decor',
    city: 'Dubai',
    area: 'Jumeirah & Business Bay',
    state: 'Dubai',
    country: 'Dubai / UAE',
    lat: 25.2145,
    lng: 55.2612,
    whatsappNumber: '971559988776',
    planTier: 'business',
    monthlyAutoPay: true,
    priceTier: '$$$',
    startingPriceUsd: 680,
    rating: 4.97,
    reviewCount: 138,
    responseTime: 'Under 30 mins on WhatsApp',
    verified: true,
    tagline: 'Floral wedding mandaps, balloon & neon birthday backdrops, candlelit dinners, and baby showers.',
    description:
      'Full-service event styling studio in Dubai designing dreamy floral arches, luxury birthday setups, intimate beach dinners, and grand wedding stages with complete setup and next-day dismantling.',
    serviceAreas: ['Dubai', 'Abu Dhabi', 'Al Barsha', 'Emirates Hills', 'Palm Jumeirah'],
    specialties: ['Wedding Mandaps', 'Kids & Adult Birthdays', 'Baby Showers', 'Candlelight Tablescapes'],
    image: IMG_DECOR,
    products: [
      {
        id: 'md-1',
        name: 'Luxury Birthday & Milestone Backdrop Setup',
        serves: 'Home / Hotel Hall',
        priceUsd: 680,
        description: 'Custom acrylic arch, organic balloon & fresh flower styling, plinth cake stands, and warm uplighting.',
        image: IMG_DECOR,
        tag: 'Popular',
      },
      {
        id: 'md-2',
        name: 'Courtyard Candlelight Dinner & Floral Runner',
        serves: 'Up to 60 guests',
        priceUsd: 1350,
        description: 'Fresh floral runners, tapered candles, linen drapery, festoon lights, and welcome easel.',
        image: IMG_DECOR,
      },
    ],
    reviews: [
      {
        id: 'r4',
        author: 'Farah Siddiqui',
        role: '1st Birthday Party · 65 Guests',
        date: 'September 2026',
        rating: 5,
        comment: 'Exceeded every expectation and set up two hours ahead of schedule.',
      },
    ],
  },
  {
    id: 'festive-hamper-bengaluru',
    slug: 'festive-hamper-bengaluru',
    name: 'The Festive Box — Snack Boxes & Gifting',
    marketplace: 'food',
    category: 'Snack Boxes & Party Platters',
    city: 'Bengaluru',
    area: 'Indiranagar & Koramangala',
    state: 'Karnataka',
    country: 'India',
    lat: 12.9784,
    lng: 77.6408,
    whatsappNumber: '919900445566',
    planTier: 'pro',
    monthlyAutoPay: true,
    priceTier: '$',
    startingPriceUsd: 95,
    rating: 4.91,
    reviewCount: 215,
    responseTime: 'Under 20 mins on WhatsApp',
    verified: true,
    tagline: 'Freshly packed party snack boxes, kids birthday return boxes, and luxury wedding & Diwali hampers.',
    description:
      'Trusted by 400+ Bengaluru families and tech teams for hygienic, delicious individual snack boxes and ribbon-tied festive gifting hampers delivered hot and on time across the city.',
    serviceAreas: ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'JP Nagar', 'Yelahanka'],
    specialties: ['Birthday Snack Boxes', 'Corporate High-Tea Boxes', 'Wedding Return Hampers', 'Custom Ribbon Branding'],
    image: IMG_GIFTING,
    products: [
      {
        id: 'fb-1',
        name: 'Party Gourmet Snack Box (Pack of 25)',
        serves: '25 guests',
        priceUsd: 95,
        description: 'Veg puff, paneer tikka slider, brownie square, spiced nuts, and cold-pressed juice in eco box.',
        image: IMG_GIFTING,
        tag: 'Best Value',
      },
      {
        id: 'fb-2',
        name: 'Royal Wedding Invitation & Gifting Hamper (20 Boxes)',
        serves: '20 hampers',
        priceUsd: 290,
        description: 'Gold-foiled keepsake box with artisanal laddoos, truffle chocolates, roasted almonds & custom card.',
        image: IMG_GIFTING,
        tag: 'Custom Logo',
      },
    ],
    reviews: [
      {
        id: 'r5',
        author: 'Sneha Rao',
        role: 'Office Celebration · 120 Boxes',
        date: 'October 2026',
        rating: 4.9,
        comment: 'Every snack box arrived warm, crisp, and neatly labeled with dietary tags.',
      },
    ],
  },
  {
    id: 'ceylon-feast-colombo',
    slug: 'ceylon-feast-colombo',
    name: 'Ceylon Spice & Hopper Catering',
    marketplace: 'food',
    category: 'Catering Services',
    city: 'Colombo',
    area: 'Cinnamon Gardens (Colombo 07)',
    state: 'Western Province',
    country: 'Sri Lanka',
    lat: 6.9125,
    lng: 79.8636,
    whatsappNumber: '94771234567',
    planTier: 'pro',
    monthlyAutoPay: true,
    priceTier: '$$',
    startingPriceUsd: 310,
    rating: 4.93,
    reviewCount: 118,
    responseTime: 'Under 30 mins on WhatsApp',
    verified: true,
    tagline: 'Authentic Sri Lankan wedding catering, live hopper & kottu action stations, and love cake gifting.',
    description:
      'Bringing the warmth of Colombo hospitality to weddings, homecoming receptions, and garden birthdays. Choose from gourmet buffets, live crispy hopper pans, and traditional Sri Lankan love cake boxes.',
    serviceAreas: ['Colombo 01–15', 'Dehiwala', 'Mount Lavinia', 'Negombo', 'Kandy'],
    specialties: ['Live Hopper Counter', 'Wedding Buffets', 'Sri Lankan Love Cake', 'Seafood Grazing'],
    image: IMG_CATERING,
    products: [
      {
        id: 'cf-1',
        name: 'Live Hopper & Kottu Action Counter',
        serves: '60 guests',
        priceUsd: 310,
        description: 'Plain, egg & honey hoppers cooked live with lunu miris, seeni sambol, and chicken curry.',
        image: IMG_LIVE_COUNTER,
        tag: 'Signature',
      },
      {
        id: 'cf-2',
        name: 'Grand Colombo Wedding Buffet',
        serves: '120 guests',
        priceUsd: 1380,
        description: 'Full 14-item Sri Lankan & continental spread with uniformed servers and porcelain tableware.',
        image: IMG_CATERING,
      },
    ],
    reviews: [
      {
        id: 'r6',
        author: 'Dilshan Perera',
        role: 'Homecoming Dinner · 100 Guests',
        date: 'September 2026',
        rating: 5,
        comment: 'The live hopper station was a massive hit with our overseas relatives.',
      },
    ],
  },
  {
    id: 'lahore-shahi-caterers',
    slug: 'lahore-shahi-caterers',
    name: 'Shahi Dastarkhwan Catering & Live BBQ',
    marketplace: 'food',
    category: 'Live Counters & Food Stalls',
    city: 'Lahore',
    area: 'DHA Phase 5 & Gulberg',
    state: 'Punjab',
    country: 'Pakistan',
    lat: 31.4697,
    lng: 74.4071,
    whatsappNumber: '923001234567',
    planTier: 'pro',
    monthlyAutoPay: true,
    priceTier: '$$',
    startingPriceUsd: 340,
    rating: 4.92,
    reviewCount: 174,
    responseTime: 'Under 25 mins on WhatsApp',
    verified: true,
    tagline: 'Live charcoal seekh kabab, mutton kunnah, live jalebi, and dholki event catering across Lahore & Karachi.',
    description:
      'Specializing in grand Mehndi, Barat, Walima, and home dholki menus with smoky live BBQ grills, traditional Lahori tawa stations, and elegant silver-service buffet setups.',
    serviceAreas: ['DHA Lahore', 'Gulberg', 'Model Town', 'Bahria Town', 'Islamabad (on request)'],
    specialties: ['Live Charcoal BBQ', 'Dholki & Mehndi Catering', 'Live Jalebi & Chai', '100% Zabiha Halal'],
    image: IMG_LIVE_COUNTER,
    products: [
      {
        id: 'ls-1',
        name: 'Dholki Night Live BBQ & Chai Bar',
        serves: '80 guests',
        priceUsd: 340,
        description: 'Live malai boti, reshmi seekh kabab, poori paratha, live doodh patti chai & crispy jalebi.',
        image: IMG_LIVE_COUNTER,
        tag: 'Dholki Hit',
      },
      {
        id: 'ls-2',
        name: 'Royal Walima Full Feast',
        serves: '200 guests',
        priceUsd: 1650,
        description: 'Mutton qorma, Sindhi biryani, live BBQ counter, salad bar, and shahi tukray dessert.',
        image: IMG_CATERING,
      },
    ],
    reviews: [
      {
        id: 'r7',
        author: 'Zainab Tariq',
        role: 'Mehndi Night · 140 Guests',
        date: 'October 2026',
        rating: 5,
        comment: 'Hot jalebis and smoky malai boti straight off the grill—everyone asked for their WhatsApp.',
      },
    ],
  },
  {
    id: 'dhaka-velvet-bakes',
    slug: 'dhaka-velvet-bakes',
    name: 'Velvet Crumb Dhaka & Gift Boxes',
    marketplace: 'food',
    category: 'Gifting, Hampers & Return Favors',
    city: 'Dhaka',
    area: 'Gulshan 2 & Banani',
    state: 'Dhaka Division',
    country: 'Bangladesh',
    lat: 23.7925,
    lng: 90.4078,
    whatsappNumber: '8801711223344',
    planTier: 'pro',
    monthlyAutoPay: true,
    priceTier: '$$',
    startingPriceUsd: 75,
    rating: 4.9,
    reviewCount: 132,
    responseTime: 'Under 20 mins on WhatsApp',
    verified: true,
    tagline: 'Holud wedding gifting hampers, custom celebration cakes, and gourmet snack boxes in Dhaka.',
    description:
      'Crafting bespoke Gaye Holud sweet boxes, Eid gifting hampers, and velvet celebration cakes from our Gulshan atelier with express temperature-controlled delivery across Dhaka.',
    serviceAreas: ['Gulshan', 'Banani', 'Dhanmondi', 'Uttara', 'Bashundhara R/A'],
    specialties: ['Gaye Holud Hampers', 'Custom Cakes', 'Corporate Gift Boxes', 'Fresh Mishti & Chocolates'],
    image: IMG_GIFTING,
    products: [
      {
        id: 'dv-1',
        name: 'Gaye Holud Luxury Gifting Box (30 pcs)',
        serves: '30 guests',
        priceUsd: 185,
        description: 'Handcrafted silk-ribbon hampers filled with shondesh, pistachio baklava, and dark chocolate truffles.',
        image: IMG_GIFTING,
        tag: 'Wedding Favorite',
      },
      {
        id: 'dv-2',
        name: 'Signature Floral Buttercream Cake (2 kg)',
        serves: '22–28 guests',
        priceUsd: 75,
        description: 'Belgian chocolate hazelnut or red velvet celebration cake with custom calligraphy plaque.',
        image: IMG_CAKE,
      },
    ],
    reviews: [
      {
        id: 'r8',
        author: 'Tasnim Rahman',
        role: 'Gaye Holud · 150 Hampers',
        date: 'September 2026',
        rating: 4.9,
        comment: 'Stunning ribbon packaging and super fresh sweets delivered straight to our venue in Gulshan.',
      },
    ],
  },
  {
    id: 'himalayan-bloom-kathmandu',
    slug: 'himalayan-bloom-kathmandu',
    name: 'Himalayan Bloom Wedding & Party Decor',
    marketplace: 'party',
    category: 'Wedding & Party Decor',
    city: 'Kathmandu',
    area: 'Jhamsikhel & Lazimpat',
    state: 'Bagmati Province',
    country: 'Nepal',
    lat: 27.6788,
    lng: 85.3111,
    whatsappNumber: '9779801122334',
    planTier: 'pro',
    monthlyAutoPay: true,
    priceTier: '$$',
    startingPriceUsd: 420,
    rating: 4.91,
    reviewCount: 89,
    responseTime: 'Under 30 mins on WhatsApp',
    verified: true,
    tagline: 'Floral wedding mandaps, Bratabandha & Pasni decor, and cozy courtyard fairy-light setups in Kathmandu.',
    description:
      'Transforming Kathmandu and Pokhara venues with fresh marigold & orchid mandaps, charming Pasni and birthday stages, and warm architectural lighting tailored to every budget.',
    serviceAreas: ['Kathmandu', 'Lalitpur / Patan', 'Bhaktapur', 'Pokhara'],
    specialties: ['Wedding Mandaps', 'Pasni & Birthday Decor', 'Fairy Light Canopies', 'Floral Photobooths'],
    image: IMG_DECOR,
    products: [
      {
        id: 'hb-1',
        name: 'Pasni / Birthday Floral Arch & Stage',
        serves: 'Up to 100 guests',
        priceUsd: 420,
        description: 'Fresh seasonal flowers, custom wooden backdrop, cake pedestal, and warm string lighting.',
        image: IMG_DECOR,
        tag: 'Most Popular',
      },
      {
        id: 'hb-2',
        name: 'Complete Heritage Wedding Mandap & Reception',
        serves: '200–400 guests',
        priceUsd: 1490,
        description: 'Four-pillar floral mandap, entry walkway, seating drapes, and illuminated photo corner.',
        image: IMG_DECOR,
      },
    ],
    reviews: [
      {
        id: 'r9',
        author: 'Suman Shrestha',
        role: 'Pasni Celebration · 120 Guests',
        date: 'October 2026',
        rating: 4.9,
        comment: 'Warm, tasteful decor that looked amazing in photos and stayed right on budget.',
      },
    ],
  },
  {
    id: 'pulse-nights-mumbai',
    slug: 'pulse-nights-mumbai',
    name: 'Pulse Nights DJ & Sangeet Sound',
    marketplace: 'party',
    category: 'DJs, Sound & Live Bands',
    city: 'Mumbai',
    area: 'Andheri West & Juhu',
    state: 'Maharashtra',
    country: 'India',
    lat: 19.1197,
    lng: 72.8464,
    whatsappNumber: '919821556677',
    planTier: 'pro',
    monthlyAutoPay: true,
    priceTier: '$$',
    startingPriceUsd: 390,
    rating: 4.89,
    reviewCount: 156,
    responseTime: 'Under 20 mins on WhatsApp',
    verified: true,
    tagline: 'High-energy Bollywood, house & Afro-beats DJ sets, dhol percussionists, and rooftop sound systems.',
    description:
      'From packed Sangeet dancefloors to stylish rooftop birthday sets in Mumbai and Goa. Complete JBL line-array audio, intelligent lighting trusses, and live percussion add-ons.',
    serviceAreas: ['Mumbai', 'Navi Mumbai', 'Lonavala', 'Alibaug', 'Goa'],
    specialties: ['Wedding Sangeet DJ', 'Rooftop House Parties', 'Live Dhol & Sax', 'LED Console & Lighting'],
    image: IMG_DJ,
    products: [
      {
        id: 'pn-1',
        name: 'House Party / Birthday DJ + Sound (4 hrs)',
        serves: 'Up to 100 guests',
        priceUsd: 390,
        description: 'Curated DJ set, sleek booth, dual speakers, wireless mic, and ambient party lighting.',
        image: IMG_DJ,
      },
      {
        id: 'pn-2',
        name: 'Grand Sangeet Night DJ + Live Percussion',
        serves: '150–400 guests',
        priceUsd: 890,
        description: 'Full concert audio, moving-head lights, cold-spark entry, and 2 live dhol percussionists.',
        image: IMG_DJ,
        tag: 'Sangeet Hit',
      },
    ],
    reviews: [
      {
        id: 'r10',
        author: 'Kabir Mehta',
        role: 'Sangeet Night · 250 Guests',
        date: 'October 2026',
        rating: 4.9,
        comment: 'Dancefloor never emptied once until 3 AM!',
      },
    ],
  },
  {
    id: 'karachi-sweet-home-baker',
    slug: 'karachi-sweet-home-baker',
    name: 'Noor’s Home Bakery & Bento Cakes',
    marketplace: 'food',
    category: 'Home Bakers & Cloud Kitchens',
    city: 'Karachi',
    area: 'Clifton & Defence',
    state: 'Sindh',
    country: 'Pakistan',
    lat: 24.8138,
    lng: 67.03,
    whatsappNumber: '923219876543',
    planTier: 'free',
    monthlyAutoPay: false,
    priceTier: '$',
    startingPriceUsd: 35,
    rating: 4.82,
    reviewCount: 41,
    responseTime: 'Under 1 hr on WhatsApp',
    verified: true,
    tagline: 'Fresh home-baked tres leches, Korean bento cakes, and weekend dessert boxes in Clifton.',
    description:
      'Small-batch home bakery in Karachi creating delicate lotus tres leches, vintage buttercream birthday cakes, and brownie gift boxes.',
    serviceAreas: ['Clifton', 'DHA Karachi', 'PECHS'],
    specialties: ['Bento Cakes', 'Tres Leches', 'Fudge Brownie Boxes'],
    image: IMG_DESSERTS,
    products: [
      {
        id: 'nb-1',
        name: 'Vintage Lambeth Birthday Cake (1.5 kg)',
        serves: '14–18 guests',
        priceUsd: 35,
        description: 'Soft chocolate fudge or vanilla berry sponge with piped vintage ribbons.',
        image: IMG_CAKE,
      },
      {
        id: 'nb-2',
        name: 'Assorted Brownie & Cupcake Box (12 pcs)',
        serves: '10–12 guests',
        priceUsd: 24,
        description: 'Gooey Belgian brownies and salted caramel cupcakes.',
        image: IMG_DESSERTS,
      },
    ],
    reviews: [
      {
        id: 'r11',
        author: 'Hina Kamran',
        role: 'Birthday Surprise · 15 Guests',
        date: 'September 2026',
        rating: 4.8,
        comment: 'Super moist cake and lovely vintage piping.',
      },
    ],
  },
  {
    id: 'colombo-moments-photo',
    slug: 'colombo-moments-photo',
    name: 'Lanka Frame Event Photography',
    marketplace: 'party',
    category: 'Photographers & Videographers',
    city: 'Colombo',
    area: 'Bambalapitiya & Kollupitiya',
    state: 'Western Province',
    country: 'Sri Lanka',
    lat: 6.8935,
    lng: 79.8555,
    whatsappNumber: '94712233445',
    planTier: 'free',
    monthlyAutoPay: false,
    priceTier: '$$',
    startingPriceUsd: 260,
    rating: 4.84,
    reviewCount: 53,
    responseTime: 'Under 2 hrs on WhatsApp',
    verified: true,
    tagline: 'Candid wedding, Poruwa, birthday, and event photography with 48-hour highlight reels.',
    description:
      'Documentary event photographers capturing natural candid smiles, decor details, and family portraits across Colombo and coastal resorts.',
    serviceAreas: ['Colombo', 'Galle', 'Bentota', 'Negombo'],
    specialties: ['Candid Weddings', 'Birthday Coverage', '48-Hr Highlight Gallery'],
    image: IMG_PHOTO,
    products: [
      {
        id: 'lf-1',
        name: 'Birthday & Private Party Coverage (4 hrs)',
        serves: '150+ edited photos',
        priceUsd: 260,
        description: 'One lead photographer, candid & family portraits, online gallery within 48 hours.',
        image: IMG_PHOTO,
      },
    ],
    reviews: [
      {
        id: 'r12',
        author: 'Nimali Fernando',
        role: '50th Birthday · 80 Guests',
        date: 'August 2026',
        rating: 4.8,
        comment: 'Warm candid shots delivered super quickly.',
      },
    ],
  },
  {
    id: 'pastel-pop-balloons-bengaluru',
    slug: 'pastel-pop-balloons-bengaluru',
    name: 'Pastel Pop Balloon & Birthday Studio',
    marketplace: 'party',
    category: 'Balloon & Theme Birthday Decor',
    city: 'Bengaluru',
    area: 'Whitefield & Indiranagar',
    state: 'Karnataka',
    country: 'India',
    lat: 12.9698,
    lng: 77.7499,
    whatsappNumber: '919845112233',
    planTier: 'pro',
    monthlyAutoPay: true,
    priceTier: '$$',
    startingPriceUsd: 165,
    rating: 4.94,
    reviewCount: 147,
    responseTime: 'Under 15 mins on WhatsApp',
    verified: true,
    tagline: 'Organic balloon garlands, kids theme backdrops, custom neon signs & baby shower setups.',
    description:
      'Bengaluru’s favorite birthday & baby shower decor studio crafting pastel arches, safari & princess kids themes, cake plinths, and soft-play add-ons with 3-hour setup at homes or clubhouses.',
    serviceAreas: ['Whitefield', 'Indiranagar', 'Koramangala', 'HSR Layout', 'Sarjapur', 'Hebbal'],
    specialties: ['Organic Balloon Arches', '1st Birthday Themes', 'Baby Showers', 'Custom Neon Signs'],
    image: IMG_BALLOON,
    products: [
      {
        id: 'pp-1',
        name: 'Pastel Organic Balloon Arch & Neon Backdrop',
        serves: 'Home / Clubhouse',
        priceUsd: 165,
        description: 'Double-panel arch, luxury pastel balloon garland, 3 cake plinths, and custom name neon.',
        image: IMG_BALLOON,
        tag: 'Bestseller',
      },
      {
        id: 'pp-2',
        name: 'Grand Kids Theme Birthday + Soft Play Zone',
        serves: '30–60 kids & adults',
        priceUsd: 390,
        description: '3D themed backdrop, welcome board, balloon ceiling, kids seating & soft play corner.',
        image: IMG_BALLOON,
      },
    ],
    reviews: [
      {
        id: 'r13',
        author: 'Meera Nair',
        role: '1st Birthday · Whitefield',
        date: 'October 2026',
        rating: 5,
        comment: 'Set up everything cleanly in our apartment clubhouse before noon. Photos looked straight out of Pinterest!',
      },
    ],
  },
  {
    id: 'qasr-dates-mithai-dubai',
    slug: 'qasr-dates-mithai-dubai',
    name: 'Qasr Al-Mithai, Baklava & Stuffed Dates',
    marketplace: 'food',
    category: 'Mithai, Chocolatiers & Dates',
    city: 'Dubai',
    area: 'Al Quoz & Downtown Dubai',
    state: 'Dubai',
    country: 'Dubai / UAE',
    lat: 25.1585,
    lng: 55.231,
    whatsappNumber: '971523344556',
    planTier: 'pro',
    monthlyAutoPay: true,
    priceTier: '$$',
    startingPriceUsd: 110,
    rating: 4.95,
    reviewCount: 129,
    responseTime: 'Under 20 mins on WhatsApp',
    verified: true,
    tagline: '24k gold-leaf stuffed Medjool dates, saffron kaju katli, pistachio baklava & wedding sweet trays.',
    description:
      'Handcrafted luxury sweet boxes, Eid & Diwali hampers, and bridal mithai platters crafted daily in Dubai with zero preservatives and custom monogram ribbons.',
    serviceAreas: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
    specialties: ['Stuffed Medjool Dates', 'Pistachio Baklava', 'Artisanal Mithai', 'Wedding Sweet Trays'],
    image: IMG_MITHAI,
    products: [
      {
        id: 'qm-1',
        name: 'Royal Brass Platter — Dates, Baklava & Bonbons',
        serves: '25–30 guests',
        priceUsd: 110,
        description: '60 assorted gold-leaf pistachio dates, flaky Turkish baklava, and Belgian truffles.',
        image: IMG_MITHAI,
        tag: 'Festive Favorite',
      },
      {
        id: 'qm-2',
        name: 'Luxury Wedding Favor Boxes (50 Boxes)',
        serves: '50 guests',
        priceUsd: 420,
        description: 'Velvet keepsake favor boxes with custom couple monogram and 6 gourmet sweets each.',
        image: IMG_MITHAI,
      },
    ],
    reviews: [
      {
        id: 'r14',
        author: 'Omar Khalid',
        role: 'Engagement Dinner · Dubai',
        date: 'October 2026',
        rating: 5,
        comment: 'The gold-leaf pistachio dates and baklava platters were gone within minutes.',
      },
    ],
  },
  {
    id: 'chhatarpur-villa-lawns-delhi',
    slug: 'chhatarpur-villa-lawns-delhi',
    name: 'Amaltas Courtyard Villa & Event Lawns',
    marketplace: 'party',
    category: 'Venues, Farmhouses & Villas',
    city: 'Delhi NCR',
    area: 'Chhatarpur & Mehrauli',
    state: 'Delhi NCR',
    country: 'India',
    lat: 28.5045,
    lng: 77.1812,
    whatsappNumber: '919810778899',
    planTier: 'business',
    monthlyAutoPay: true,
    priceTier: '$$$$',
    startingPriceUsd: 1450,
    rating: 4.96,
    reviewCount: 112,
    responseTime: 'Under 20 mins on WhatsApp',
    verified: true,
    tagline: 'Private luxury farmhouse lawn with fairy-light canopy, bridal suites & poolside party deck.',
    description:
      'Host intimate 80-guest cocktail nights or grand 500-guest garden weddings at our heritage stone villa in Chhatarpur. Includes warm fairy-light canopy, valet parking, generator backup, and flexible vendor policy.',
    serviceAreas: ['South Delhi', 'Chhatarpur', 'Gurugram', 'Noida', 'Faridabad'],
    specialties: ['Wedding Lawns', 'Poolside Cocktail Parties', 'Fairy Light Canopy', 'Bridal Suites Included'],
    image: IMG_VENUE,
    products: [
      {
        id: 'av-1',
        name: 'Evening Cocktail / Birthday Lawn Hire (Up to 150 pax)',
        serves: 'Up to 150 guests',
        priceUsd: 1450,
        description: '6-hour private access to manicured garden, fairy-light canopy, 2 rooms & valet.',
        image: IMG_VENUE,
        tag: 'Top Venue',
      },
      {
        id: 'av-2',
        name: 'Full-Day Grand Wedding Farmhouse + 6 Suites',
        serves: '250–500 guests',
        priceUsd: 3200,
        description: 'Full estate buyout including indoor hall, poolside lawn, overnight villa suites & power backup.',
        image: IMG_VENUE,
      },
    ],
    reviews: [
      {
        id: 'r15',
        author: 'Ananya Kapoor',
        role: 'Sangeet & Dinner · 220 Guests',
        date: 'October 2026',
        rating: 5,
        comment: 'Magical fairy-light canopy at dusk and super easy WhatsApp walkthrough booking.',
      },
    ],
  },
  {
    id: 'spin360-booths-mumbai',
    slug: 'spin360-booths-mumbai',
    name: 'Flash360 Photo Booths & Mirror Kiosks',
    marketplace: 'party',
    category: 'Photo Booths & 360 Spinners',
    city: 'Mumbai',
    area: 'Lower Parel & Bandra',
    state: 'Maharashtra',
    country: 'India',
    lat: 19.0008,
    lng: 72.8304,
    whatsappNumber: '919820667788',
    planTier: 'pro',
    monthlyAutoPay: true,
    priceTier: '$$',
    startingPriceUsd: 240,
    rating: 4.92,
    reviewCount: 96,
    responseTime: 'Under 15 mins on WhatsApp',
    verified: true,
    tagline: 'Slow-motion 360° video spinners, instant WhatsApp video sharing, glam mirror booths & props.',
    description:
      'Add unforgettable viral energy to weddings, sangeets, corporate mixers, and birthdays across Mumbai & Pune. Guests receive branded slow-motion reels straight on WhatsApp in 15 seconds.',
    serviceAreas: ['South Mumbai', 'Bandra', 'Juhu', 'Powai', 'Navi Mumbai', 'Pune'],
    specialties: ['360 Video Spinner', 'Instant WhatsApp Reels', 'Custom Event Overlay', 'Glam Mirror Prints'],
    image: IMG_PHOTO,
    products: [
      {
        id: 'fb360-1',
        name: '360° Slow-Mo Video Booth (4 hrs Unlimited)',
        serves: 'Unlimited guests',
        priceUsd: 240,
        description: 'LED platform, ring lights, custom wedding/birthday frame, props & instant WhatsApp/QR sharing.',
        image: IMG_PHOTO,
        tag: 'Viral Hit',
      },
      {
        id: 'fb360-2',
        name: 'Magic Mirror Instant Print Booth + Guestbook',
        serves: 'Unlimited 4x6 prints',
        priceUsd: 360,
        description: 'Full-length interactive touchscreen mirror with unlimited glossy prints and physical guestbook.',
        image: IMG_PHOTO,
      },
    ],
    reviews: [
      {
        id: 'r16',
        author: 'Riya Shah',
        role: 'Cocktail Night · 160 Guests',
        date: 'October 2026',
        rating: 4.9,
        comment: 'Every single guest lined up twice for the 360 spinner and shared reels all night!',
      },
    ],
  },
];

export const PLATFORM_TESTIMONIALS = [
  {
    quote:
      'I pressed Near Me in Mumbai, compared 3 live chaat counters, clicked directly into their mini-website, and finalized our 180-guest menu on WhatsApp in 15 minutes.',
    author: 'Vikram Malhotra',
    context: 'Mehendi & Sangeet · Delhi NCR & Mumbai',
  },
  {
    quote:
      'Upgrading to the Pro Monthly Auto-Pay plan put our Dubai mocktail bar right at the top of local search. We now get daily direct WhatsApp leads with zero commission.',
    author: 'Tariq Al-Hashimi',
    context: 'Founder, Saffron Pour Mobile Bar · Dubai',
  },
  {
    quote:
      'The AI Event Planner asked our guest count and budget for our Colombo homecoming dinner, split our budget cleanly, and matched us straight to our caterer and photographer.',
    author: 'Dilshan Perera',
    context: 'Homecoming Reception · Colombo, Sri Lanka',
  },
];

export function planRankWeight(plan: PlanTier): number {
  if (plan === 'business') return 3;
  if (plan === 'pro') return 2;
  return 1;
}

export function buildWhatsAppUrl(vendor: Vendor, customText?: string): string {
  const digits = vendor.whatsappNumber.replace(/[^\d]/g, '');
  const text =
    customText ||
    `Hi ${vendor.name}, I found your storefront on FindMyBites × PimpMyParty and would love to enquire about your ${vendor.category} packages in ${vendor.city}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function formatMoney(usdAmount: number, currency: CurrencyCode): string {
  const cfg = CURRENCIES[currency];
  const converted = Math.round(usdAmount * cfg.rate);
  return `${cfg.symbol}${converted.toLocaleString('en-US')}`;
}

export function formatPlanPrice(plan: SaasPlan, currency: CurrencyCode): string {
  const cfg = CURRENCIES[currency];
  const amount = plan.pricesByCurrency[currency];
  return `${cfg.symbol}${amount.toLocaleString('en-US')}`;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type QuickFilterTag =
  | 'Eggless'
  | 'Pure Veg'
  | 'Halal'
  | 'Same-Day'
  | 'Corporate / Bulk'
  | 'Wedding Ready';

export const QUICK_FILTER_TAGS: QuickFilterTag[] = [
  'Eggless',
  'Pure Veg',
  'Halal',
  'Same-Day',
  'Corporate / Bulk',
  'Wedding Ready',
];

export function getVendorQuickTags(vendor: Vendor): QuickFilterTag[] {
  const hay = `${vendor.name} ${vendor.category} ${vendor.tagline} ${vendor.description} ${vendor.specialties.join(' ')} ${vendor.products.map((p) => `${p.name} ${p.description} ${p.tag ?? ''}`).join(' ')}`.toLowerCase();
  const tags: QuickFilterTag[] = [];

  if (
    hay.includes('eggless') ||
    (vendor.marketplace === 'food' &&
      (vendor.category.includes('Bakers') || vendor.category.includes('Mithai') || vendor.category.includes('Gifting')))
  ) {
    tags.push('Eggless');
  }

  if (
    hay.includes('veg') ||
    hay.includes('jain') ||
    hay.includes('chaat') ||
    hay.includes('mithai') ||
    hay.includes('mocktail') ||
    hay.includes('hamper') ||
    hay.includes('date')
  ) {
    tags.push('Pure Veg');
  }

  if (
    hay.includes('halal') ||
    vendor.country === 'Dubai / UAE' ||
    vendor.country === 'Pakistan' ||
    vendor.country === 'Bangladesh'
  ) {
    tags.push('Halal');
  }

  if (
    hay.includes('same-day') ||
    hay.includes('same day') ||
    hay.includes('express') ||
    vendor.category.includes('Balloon') ||
    vendor.category.includes('Snack') ||
    vendor.category.includes('Home Bakers') ||
    vendor.category.includes('Mithai')
  ) {
    tags.push('Same-Day');
  }

  if (
    hay.includes('corporate') ||
    hay.includes('bulk') ||
    hay.includes('office') ||
    hay.includes('platter') ||
    hay.includes('hamper') ||
    hay.includes('catering') ||
    hay.includes('mocktail')
  ) {
    tags.push('Corporate / Bulk');
  }

  if (
    hay.includes('wedding') ||
    hay.includes('mehendi') ||
    hay.includes('sangeet') ||
    hay.includes('nikah') ||
    hay.includes('valima') ||
    hay.includes('reception') ||
    vendor.marketplace === 'party'
  ) {
    tags.push('Wedding Ready');
  }

  return tags;
}

