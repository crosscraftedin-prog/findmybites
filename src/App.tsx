import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Crown,
  Globe2,
  Heart,
  Home,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  MessageSquareHeart,
  Navigation,
  PartyPopper,
  Quote,
  RefreshCw,
  Search,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { ChristmasSpotlightSection } from './components/ChristmasSpotlightSection';
import { Ecosystem, Header } from './components/Header';
import { JoshPlannerDrawer } from './components/JoshPlannerDrawer';
import { ListBusinessModal } from './components/ListBusinessModal';
import { LocationPickerModal, SelectedLocation } from './components/LocationPickerModal';
import { PostEventRequestModal } from './components/PostEventRequestModal';
import { SavedBookingsDrawer } from './components/SavedBookingsDrawer';
import { SnowfallOverlay } from './components/SnowfallOverlay';
import { VendorBioLinkView } from './components/VendorBioLinkView';
import { VendorCard } from './components/VendorCard';
import { VendorDashboardModal } from './components/VendorDashboardModal';
import { VendorMetrics, VendorWebsiteView } from './components/VendorWebsiteView';
import {
  BookingEnquiry,
  CATEGORY_CARDS,
  COUNTRY_REGION_LABEL,
  CURRENCIES,
  CurrencyCode,
  EventRequest,
  FOOD_CATEGORIES,
  HERO_FOOD_IMAGE,
  HERO_PARTY_IMAGE,
  INITIAL_VENDORS,
  LAUNCH_COUNTRIES,
  LaunchCountry,
  PARTY_CATEGORIES,
  PLATFORM_TESTIMONIALS,
  PlanTier,
  PriceTier,
  QUICK_FILTER_TAGS,
  QuickFilterTag,
  SAAS_PLANS,
  STATES_BY_COUNTRY,
  Vendor,
  formatPlanPrice,
  getVendorBioHandle,
  getVendorQuickTags,
  haversineKm,
  planRankWeight,
} from './data/vendors';
import { ADMIN_EMAIL, auth, signInWithGoogle, signOutUser } from './firebase';
import { useSeoMeta } from './hooks/useSeoMeta';
import {
  createBookingInCloud,
  createVendorInCloud,
  ensureUserProfile,
  incrementVendorMetricInCloud,
  subscribeActiveVendors,
  subscribeMyBookings,
  subscribeMyEventRequests,
  subscribeMyVendors,
  subscribeOpenEventRequests,
  subscribeVendorLeads,
  syncSavedVendorsToCloud,
  updateBookingStatusInCloud,
} from './services/firestoreService';
import { requestBrowserGpsLocation, resolveRegionFromCoords } from './utils/geolocation';

function slugifySeo(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const POPULAR_LOCAL_SEARCHES: Array<{
  label: string;
  category: string;
  ecosystem: Ecosystem;
  country: Exclude<LaunchCountry, 'All'>;
  state: string;
  cityHint: string;
}> = [
  {
    label: 'Bakers & Wedding Cakes in Mumbai',
    category: 'Bakers & Cakes',
    ecosystem: 'FINDMYBITES',
    country: 'India',
    state: 'Maharashtra',
    cityHint: 'Mumbai',
  },
  {
    label: 'Live Chaat Counters in Delhi NCR',
    category: 'Live Counters & Food Stalls',
    ecosystem: 'FINDMYBITES',
    country: 'India',
    state: 'Delhi NCR',
    cityHint: 'Delhi NCR',
  },
  {
    label: 'Balloon Birthday Decor in Bengaluru',
    category: 'Balloon & Theme Birthday Decor',
    ecosystem: 'PIMPMYPARTY',
    country: 'India',
    state: 'Karnataka',
    cityHint: 'Bengaluru',
  },
  {
    label: 'Mocktail & Mobile Bars in Dubai',
    category: 'Bar, Mocktails & Beverage Carts',
    ecosystem: 'FINDMYBITES',
    country: 'Dubai / UAE',
    state: 'Dubai',
    cityHint: 'Dubai',
  },
  {
    label: 'Mithai & Stuffed Dates in Dubai',
    category: 'Mithai, Chocolatiers & Dates',
    ecosystem: 'FINDMYBITES',
    country: 'Dubai / UAE',
    state: 'Dubai',
    cityHint: 'Dubai',
  },
  {
    label: 'Wedding & Party Decor in Dubai',
    category: 'Wedding & Party Decor',
    ecosystem: 'PIMPMYPARTY',
    country: 'Dubai / UAE',
    state: 'Dubai',
    cityHint: 'Dubai',
  },
  {
    label: 'Gifting Hampers & Favors in Bengaluru',
    category: 'Gifting, Hampers & Return Favors',
    ecosystem: 'FINDMYBITES',
    country: 'India',
    state: 'Karnataka',
    cityHint: 'Bengaluru',
  },
  {
    label: 'Venues & Farmhouses in Delhi NCR',
    category: 'Venues, Farmhouses & Villas',
    ecosystem: 'PIMPMYPARTY',
    country: 'India',
    state: 'Delhi NCR',
    cityHint: 'Delhi NCR',
  },
  {
    label: '360 Photo Booths in Mumbai',
    category: 'Photo Booths & 360 Spinners',
    ecosystem: 'PIMPMYPARTY',
    country: 'India',
    state: 'Maharashtra',
    cityHint: 'Mumbai',
  },
  {
    label: 'Wedding Catering in Colombo',
    category: 'Catering Services',
    ecosystem: 'FINDMYBITES',
    country: 'Sri Lanka',
    state: 'Western Province',
    cityHint: 'Colombo',
  },
  {
    label: 'Live BBQ & Catering in Lahore',
    category: 'Catering Services',
    ecosystem: 'FINDMYBITES',
    country: 'Pakistan',
    state: 'Punjab',
    cityHint: 'Lahore',
  },
  {
    label: 'Home Bakers & Cakes in Karachi',
    category: 'Home Bakers & Cloud Kitchens',
    ecosystem: 'FINDMYBITES',
    country: 'Pakistan',
    state: 'Sindh',
    cityHint: 'Karachi',
  },
  {
    label: 'Custom Cakes & Hampers in Dhaka',
    category: 'Bakers & Cakes',
    ecosystem: 'FINDMYBITES',
    country: 'Bangladesh',
    state: 'Dhaka Division',
    cityHint: 'Dhaka',
  },
  {
    label: 'Wedding Decor & Florists in Kathmandu',
    category: 'Wedding & Party Decor',
    ecosystem: 'PIMPMYPARTY',
    country: 'Nepal',
    state: 'Bagmati Province',
    cityHint: 'Kathmandu',
  },
];

const SEO_FAQS = [
  {
    question: 'How do I find bakers, live counters, catering, or party decor near me?',
    answer:
      'Tap Find Vendors Near Me to select your country, state or emirate, and city. All local FindMyBites food artisans and PimpMyParty event professionals appear immediately with their one-page product websites and direct WhatsApp buttons.',
  },
  {
    question: 'Can customers talk directly to bakers and event vendors on WhatsApp?',
    answer:
      'Yes. Every vendor card and every product on a vendor’s one-page storefront includes a direct WhatsApp chat button with zero middleman fees or booking commissions.',
  },
  {
    question: 'How much does it cost for bakers and event vendors to list their business?',
    answer:
      'Vendors can start with a Free Listing (₹0/month) including a one-page website and WhatsApp button. Paid monthly auto-pay plans start at ₹299/month (Pro Partner) and ₹499/month (Business Spotlight) to rank above Free listings at the top of search and Near Me results.',
  },
  {
    question: 'Which countries does FindMyBites × PimpMyParty serve?',
    answer:
      'Phase 1 covers India, Dubai / UAE, Sri Lanka, Pakistan, Bangladesh, and Nepal across all major states, emirates, provinces, and cities, with global expansion planned next.',
  },
  {
    question: 'How does the AI Event Planner chatbot work?',
    answer:
      'Click Plan My Event with AI to chat with Josh AI. Share your occasion, city, guest count, and budget to receive a structured budget split, menu, live counter and decor ideas, an action checklist, and matched local vendors with direct WhatsApp links.',
  },
];

type SortOption = 'featured' | 'rating' | 'price-asc' | 'nearest';
type RadiusOption = 5 | 15 | 35 | 100 | 0; // 0 = Any distance

const STORAGE_SAVED = 'fmb_saved_ids_v2';
const STORAGE_BOOKINGS = 'fmb_bookings_v2';
const STORAGE_CUSTOM_VENDORS = 'fmb_custom_vendors_v2';
const STORAGE_ANALYTICS = 'fmb_vendor_analytics_v1';

const TRUST_ITEMS = [
  { icon: Navigation, label: 'Instant Near Me', desc: 'Local vendors by area' },
  { icon: MessageCircle, label: 'Direct WhatsApp', desc: 'Chat with zero middlemen' },
  { icon: Globe2, label: '6 Launch Countries', desc: 'India, UAE, SL, PK, BD, NP' },
  { icon: Crown, label: 'Paid On Top SaaS', desc: 'Monthly auto-pay priority' },
  { icon: Sparkles, label: 'AI Event Planner', desc: 'Chatbot builds your plan' },
  { icon: BadgeCheck, label: 'Vendor Mini-Sites', desc: 'Full catalog on 1 page' },
];

const VENDOR_BENEFITS = [
  {
    icon: Crown,
    title: 'Paid listings rank #1 on top',
    desc: 'Pro & Business monthly auto-pay partners appear above Free listings in every search & Near Me.',
  },
  {
    icon: Globe2,
    title: 'Your own one-page website',
    desc: 'Shareable findmybites.com/v/your-brand page listing all cakes, counters, menus & packages.',
  },
  {
    icon: MessageCircle,
    title: 'Direct WhatsApp orders',
    desc: 'Every product card has a direct WhatsApp button so customers message you with zero commission.',
  },
  {
    icon: Sparkles,
    title: 'AI Event Planner matching',
    desc: 'Josh AI recommends paid verified partners directly inside custom event plans.',
  },
  {
    icon: TrendingUp,
    title: '6-country regional reach',
    desc: 'Launching across India, Dubai/UAE, Sri Lanka, Pakistan, Bangladesh & Nepal — expanding globally next.',
  },
  {
    icon: BarChart3,
    title: 'Simple monthly SaaS auto-pay',
    desc: 'Predictable monthly subscription with zero per-booking cuts. Pause or cancel anytime.',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    icon: Navigation,
    title: 'Press Near Me or Ask AI',
    description:
      'Tap Near Me to see bakers, live counters, caterers, bars, gifting & decor around your area — or let Josh AI build a complete event plan.',
    accent: 'from-amber-400 to-orange-500',
  },
  {
    icon: MessageSquareHeart,
    title: 'Open Vendor Website & WhatsApp',
    description:
      'Explore each vendor’s one-page storefront with full product catalogs and click WhatsApp to talk directly with zero middlemen.',
    accent: 'from-rose-400 to-fuchsia-500',
  },
  {
    icon: PartyPopper,
    title: 'Celebrate & Review',
    description:
      'Confirm dates directly with the vendor, host an unforgettable wedding, birthday or party, and leave a verified review.',
    accent: 'from-fuchsia-500 to-purple-600',
  },
];

const HERO_META = {
  FINDMYBITES: {
    eyebrow: 'FindMyBites · 12 Food, Live Counter, Catering, Bar, Mithai & Gifting Categories',
    headlineLead: 'Every baker, live counter &',
    headlineAccent: 'catering artisan near you',
    subtitle:
      'Press Near Me for local bakers, custom cakes, live chaat counters, catering, mocktail bars, snack boxes, mithai & gifting hampers across India, Dubai, Sri Lanka, Pakistan, Bangladesh & Nepal — chat straight on WhatsApp.',
    searchPlaceholder: 'Search cakes, live chaat, caterers, mocktail bars, snack boxes…',
    image: HERO_FOOD_IMAGE,
    overlay: 'from-amber-950/85 via-orange-950/70 to-rose-950/45',
    chips: [
      'Bakers & Cakes',
      'Live Counters & Food Stalls',
      'Catering Services',
      'Bar, Mocktails & Beverage Carts',
      'Snack Boxes & Party Platters',
      'Gifting, Hampers & Return Favors',
      'Mithai, Chocolatiers & Dates',
    ],
  },
  PIMPMYPARTY: {
    eyebrow: 'PimpMyParty · 12 Decor, Balloon, Venue, DJ, Photo Booth & Celebration Categories',
    headlineLead: 'Every wedding decor, DJ &',
    headlineAccent: 'party professional near you',
    subtitle:
      'Press Near Me for wedding decor, balloon birthday themes, farmhouses, DJs, photographers, 360 photo booths, mehendi artists & event planners across India, Dubai, Sri Lanka, Pakistan, Bangladesh & Nepal — chat straight on WhatsApp.',
    searchPlaceholder: 'Search wedding decor, balloon themes, DJs, venues, 360 booths…',
    image: HERO_PARTY_IMAGE,
    overlay: 'from-fuchsia-950/85 via-purple-950/70 to-pink-950/45',
    chips: [
      'Wedding & Party Decor',
      'Balloon & Theme Birthday Decor',
      'DJs, Sound & Live Bands',
      'Photographers & Videographers',
      'Venues, Farmhouses & Villas',
      'Photo Booths & 360 Spinners',
    ],
  },
} as const;

const COUNTRY_COVERAGE_STATS = [
  { country: 'India' as const, cities: 'Mumbai · Delhi NCR · Bengaluru · Hyderabad · Jaipur', count: 680 },
  { country: 'Dubai / UAE' as const, cities: 'Dubai · Abu Dhabi · Sharjah', count: 310 },
  { country: 'Pakistan' as const, cities: 'Lahore · Karachi · Islamabad', count: 245 },
  { country: 'Sri Lanka' as const, cities: 'Colombo · Kandy · Galle', count: 160 },
  { country: 'Bangladesh' as const, cities: 'Dhaka · Chattogram · Sylhet', count: 185 },
  { country: 'Nepal' as const, cities: 'Kathmandu · Lalitpur · Pokhara', count: 115 },
];

export default function App() {
  const [ecosystem, setEcosystem] = useState<Ecosystem>('FINDMYBITES');
  const [darkMode, setDarkMode] = useState(false);

  const [customVendors, setCustomVendors] = useState<Vendor[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_VENDORS);
      return raw ? (JSON.parse(raw) as Vendor[]) : [];
    } catch {
      return [];
    }
  });

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED);
      return raw ? (JSON.parse(raw) as string[]) : ['saffron-crumb-mumbai'];
    } catch {
      return ['saffron-crumb-mumbai'];
    }
  });

  const [bookings, setBookings] = useState<BookingEnquiry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_BOOKINGS);
      return raw ? (JSON.parse(raw) as BookingEnquiry[]) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCountry, setSelectedCountry] = useState<LaunchCountry>('All');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [selectedTierFilter, setSelectedTierFilter] = useState<'all' | 'paid' | 'free'>('all');
  const [selectedQuickTag, setSelectedQuickTag] = useState<QuickFilterTag | 'All'>('All');
  const [selectedPrice, setSelectedPrice] = useState<PriceTier | 'All'>('All');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [language, setLanguage] = useState('English');

  const [vendorAnalytics, setVendorAnalytics] = useState<Record<string, VendorMetrics>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_ANALYTICS);
      return raw ? (JSON.parse(raw) as Record<string, VendorMetrics>) : {};
    } catch {
      return {};
    }
  });

  // Near Me Location State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; label: string } | null>(
    null
  );
  const [nearMeRadiusKm, setNearMeRadiusKm] = useState<RadiusOption>(0);
  const [nearMeAllEcosystems, setNearMeAllEcosystems] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [locationBannerDismissed, setLocationBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('fmb_loc_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const [activeVendor, setActiveVendor] = useState<Vendor | null>(null);
  const [bioVendor, setBioVendor] = useState<Vendor | null>(null);
  const [drawerTab, setDrawerTab] = useState<'saved' | 'bookings' | null>(null);
  const [aiPlannerOpen, setAiPlannerOpen] = useState(false);
  const [eventRequestModalOpen, setEventRequestModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [listModalPlan, setListModalPlan] = useState<PlanTier>('free');
  const [listModalChristmas, setListModalChristmas] = useState(false);
  const [snowEnabled, setSnowEnabled] = useState(true);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [editVendorId, setEditVendorId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Firebase Auth & Live Cloud Firestore State
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudVendors, setCloudVendors] = useState<Vendor[]>([]);
  const [myCloudVendors, setMyCloudVendors] = useState<Vendor[]>([]);
  const [cloudBookings, setCloudBookings] = useState<BookingEnquiry[]>([]);
  const [vendorLeads, setVendorLeads] = useState<BookingEnquiry[]>([]);
  const [myEventRequests, setMyEventRequests] = useState<EventRequest[]>([]);
  const [openEventRequests, setOpenEventRequests] = useState<EventRequest[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = subscribeActiveVendors((list) => {
        setCloudVendors(list);
      });
    } catch {
      // ignore if offline
    }
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!authReady || !authUser) {
      setMyCloudVendors([]);
      setCloudBookings([]);
      setVendorLeads([]);
      setMyEventRequests([]);
      setOpenEventRequests([]);
      return;
    }

    let active = true;
    void ensureUserProfile(authUser, savedIds)
      .then((cloudSaved) => {
        if (active && cloudSaved.length > 0) {
          setSavedIds(cloudSaved);
        }
      })
      .catch(() => {
        // non-blocking profile sync fallback
      });

    const unsubMine = subscribeMyVendors(authUser.uid, setMyCloudVendors);
    const unsubBookings = subscribeMyBookings(authUser.uid, setCloudBookings);
    const unsubLeads = subscribeVendorLeads(authUser.uid, setVendorLeads);
    const unsubMyRequests = subscribeMyEventRequests(authUser.uid, setMyEventRequests);
    const unsubOpenRequests = subscribeOpenEventRequests(setOpenEventRequests);

    return () => {
      active = false;
      unsubMine();
      unsubBookings();
      unsubLeads();
      unsubMyRequests();
      unsubOpenRequests();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, authUser]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-ecosystem', ecosystem);
    setHeroImgFailed(false);
  }, [ecosystem]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SAVED, JSON.stringify(savedIds));
    } catch {
      // ignore storage quota errors
    }
  }, [savedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BOOKINGS, JSON.stringify(bookings));
    } catch {
      // ignore storage quota errors
    }
  }, [bookings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CUSTOM_VENDORS, JSON.stringify(customVendors));
    } catch {
      // ignore storage quota errors
    }
  }, [customVendors]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ANALYTICS, JSON.stringify(vendorAnalytics));
    } catch {
      // ignore storage quota errors
    }
  }, [vendorAnalytics]);

  useEffect(() => {
    if (!activeVendor) return;
    const id = activeVendor.id;
    setVendorAnalytics((prev) => {
      const current = prev[id] ?? { views: 24 + (activeVendor.reviewCount % 40), whatsappClicks: 6 + (activeVendor.reviewCount % 12) };
      return {
        ...prev,
        [id]: { ...current, views: current.views + 1 },
      };
    });
    void incrementVendorMetricInCloud(id, 'views');
  }, [activeVendor]);

  const trackWhatsAppClick = (vendorId: string) => {
    setVendorAnalytics((prev) => {
      const current = prev[vendorId] ?? { views: 28, whatsappClicks: 8 };
      return {
        ...prev,
        [vendorId]: { ...current, whatsappClicks: current.whatsappClicks + 1 },
      };
    });
    void incrementVendorMetricInCloud(vendorId, 'whatsappClicks');
  };

  const trackShare = (vendorId: string) => {
    void incrementVendorMetricInCloud(vendorId, 'shares');
  };

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(t);
  }, [notice]);

  const allVendors = useMemo(() => {
    const seen = new Set<string>();
    const merged: Vendor[] = [];
    for (const v of [...cloudVendors, ...customVendors, ...INITIAL_VENDORS]) {
      if (!seen.has(v.id)) {
        seen.add(v.id);
        merged.push(v);
      }
    }
    return merged;
  }, [cloudVendors, customVendors]);

  const resolvedActiveVendor = useMemo(() => {
    if (!activeVendor) return null;
    return allVendors.find((v) => v.id === activeVendor.id) ?? activeVendor;
  }, [activeVendor, allVendors]);

  const resolvedBioVendor = useMemo(() => {
    if (!bioVendor) return null;
    return allVendors.find((v) => v.id === bioVendor.id) ?? bioVendor;
  }, [bioVendor, allVendors]);

  const isAdminUser = Boolean(
    authUser?.email && authUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  const dashboardVendors = useMemo(() => {
    if (!isAdminUser) return myCloudVendors;
    const seen = new Set<string>();
    const combined: Vendor[] = [];
    for (const v of [...myCloudVendors, ...cloudVendors]) {
      if (!seen.has(v.id)) {
        seen.add(v.id);
        combined.push(v);
      }
    }
    return combined;
  }, [isAdminUser, myCloudVendors, cloudVendors]);

  const dashboardVendorIds = useMemo(
    () => new Set(dashboardVendors.map((v) => v.id)),
    [dashboardVendors]
  );

  const canEditVendor = (vendor: Vendor): boolean =>
    Boolean(authUser && dashboardVendorIds.has(vendor.id));

  const handleEditStorefront = (vendor: Vendor) => {
    setActiveVendor(null);
    setBioVendor(null);
    setEditVendorId(vendor.id);
    setDashboardOpen(true);
  };

  const handleOpenBioLink = (vendor: Vendor) => {
    setActiveVendor(null);
    setBioVendor(vendor);
  };

  const handleOpenStorefrontFromBio = (vendor: Vendor) => {
    setBioVendor(null);
    setActiveVendor(vendor);
  };

  const effectiveBookings = authUser ? cloudBookings : bookings;
  const ecoKey: 'food' | 'party' = ecosystem === 'FINDMYBITES' ? 'food' : 'party';

  useSeoMeta({
    activeVendor: resolvedActiveVendor ?? resolvedBioVendor,
    selectedCategory,
    selectedCountry,
    selectedState,
    ecosystem,
  });

  // Track cloud view when Bio Link opens
  useEffect(() => {
    if (!bioVendor) return;
    void incrementVendorMetricInCloud(bioVendor.id, 'views');
  }, [bioVendor]);

  // Hydrate /v/<slug>, /fmb/<handle>, and /@<handle> deep links for BOTH built-in & Cloud Firestore vendors + Back button
  useEffect(() => {
    const findByBioHandleOrSlug = (raw: string) => {
      const target = raw.toLowerCase();
      return allVendors.find(
        (v) => getVendorBioHandle(v).toLowerCase() === target || v.slug.toLowerCase() === target
      );
    };

    const syncRouteFromUrl = (fromPopState: boolean) => {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/fmb/')) {
        const handle = decodeURIComponent(pathname.slice(5)).replace(/\/$/, '').toLowerCase();
        const matched = findByBioHandleOrSlug(handle);
        if (matched) {
          setActiveVendor(null);
          setBioVendor((prev) => (prev?.id === matched.id ? prev : matched));
        }
      } else if (pathname.startsWith('/@')) {
        const handle = decodeURIComponent(pathname.slice(2)).replace(/\/$/, '').toLowerCase();
        const matched = findByBioHandleOrSlug(handle);
        if (matched) {
          setActiveVendor(null);
          setBioVendor((prev) => (prev?.id === matched.id ? prev : matched));
        }
      } else if (pathname.startsWith('/v/')) {
        const slug = decodeURIComponent(pathname.slice(3)).replace(/\/$/, '').toLowerCase();
        const matched = allVendors.find((v) => v.slug.toLowerCase() === slug);
        if (matched) {
          setBioVendor(null);
          setActiveVendor((prev) => (prev?.id === matched.id ? prev : matched));
        }
      } else if (fromPopState) {
        setActiveVendor(null);
        setBioVendor(null);
      }
    };

    syncRouteFromUrl(false);
    const onPopState = () => syncRouteFromUrl(true);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [allVendors]);

  // Keep browser address bar synced with /fmb/<handle> or /v/<slug> on www.findmybites.com
  useEffect(() => {
    const pathname = window.location.pathname;
    if (resolvedBioVendor) {
      const bioHandle = getVendorBioHandle(resolvedBioVendor);
      const targetFmb = `/fmb/${bioHandle}`;
      const targetAt = `/@${bioHandle}`;
      if (pathname !== targetFmb && pathname !== targetAt) {
        try {
          window.history.pushState({ bioHandle }, '', targetFmb);
        } catch {
          // ignore sandbox history restrictions
        }
      }
    } else if (resolvedActiveVendor) {
      const targetPath = `/v/${resolvedActiveVendor.slug}`;
      if (pathname !== targetPath) {
        try {
          window.history.pushState({ vendorSlug: resolvedActiveVendor.slug }, '', targetPath);
        } catch {
          // ignore sandbox history restrictions
        }
      }
    } else if (pathname.startsWith('/v/') || pathname.startsWith('/fmb/') || pathname.startsWith('/@')) {
      const raw = pathname.startsWith('/fmb/')
        ? pathname.slice(5)
        : pathname.startsWith('/@')
          ? pathname.slice(2)
          : pathname.slice(3);
      const key = decodeURIComponent(raw).replace(/\/$/, '').toLowerCase();
      const existsInCatalog = allVendors.some(
        (v) => v.slug.toLowerCase() === key || getVendorBioHandle(v).toLowerCase() === key
      );
      if (existsInCatalog) {
        try {
          window.history.pushState({}, '', '/');
        } catch {
          // ignore sandbox history restrictions
        }
      }
    }
  }, [resolvedActiveVendor, resolvedBioVendor, allVendors]);

  // Hydrate query deep links from Google Search / sitemap.xml (?q=, ?country=, ?category=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    const countryParam = params.get('country');
    const categoryParam = params.get('category');

    if (qParam) {
      setSearchQuery(qParam);
      setNearMeAllEcosystems(true);
    }

    if (countryParam) {
      const norm = slugifySeo(countryParam);
      const matchedCountry = LAUNCH_COUNTRIES.find(
        (c) => c !== 'All' && slugifySeo(c) === norm
      );
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
      }
    }

    if (categoryParam) {
      const norm = slugifySeo(categoryParam);
      const matchedFood = FOOD_CATEGORIES.find((cat) => slugifySeo(cat) === norm);
      const matchedParty = PARTY_CATEGORIES.find((cat) => slugifySeo(cat) === norm);
      if (matchedFood) {
        setEcosystem('FINDMYBITES');
        setSelectedCategory(matchedFood);
      } else if (matchedParty) {
        setEcosystem('PIMPMYPARTY');
        setSelectedCategory(matchedParty);
      }
    }
    // Run once on initial mount for query deep-link hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ecoVendors = useMemo(
    () => allVendors.filter((v) => v.marketplace === ecoKey),
    [allVendors, ecoKey]
  );

  const [categoryTab, setCategoryTab] = useState<'eco' | 'all'>('eco');

  const ecoCategories = ecosystem === 'FINDMYBITES' ? FOOD_CATEGORIES : PARTY_CATEGORIES;

  const displayedCategoryCards = useMemo(() => {
    const source =
      categoryTab === 'all'
        ? CATEGORY_CARDS
        : CATEGORY_CARDS.filter((c) => c.ecosystem === ecoKey);
    return source.map((c) => ({
      ...c,
      count: allVendors.filter((v) => v.category === c.id).length,
    }));
  }, [categoryTab, ecoKey, allVendors]);

  const handleChangeEcosystem = (nextEco: Ecosystem) => {
    setEcosystem(nextEco);
    setSelectedCategory('All');
    setNearMeAllEcosystems(false);
    setCategoryTab('eco');
  };

  const detectDefaultCountry = (): Exclude<LaunchCountry, 'All'> => {
    if (selectedCountry !== 'All') return selectedCountry;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.includes('Dubai') || tz.includes('Muscat') || tz.includes('Abu_Dhabi')) return 'Dubai / UAE';
      if (tz.includes('Colombo')) return 'Sri Lanka';
      if (tz.includes('Karachi')) return 'Pakistan';
      if (tz.includes('Dhaka')) return 'Bangladesh';
      if (tz.includes('Kathmandu') || tz.includes('Katmandu')) return 'Nepal';
    } catch {
      // default below
    }
    return 'India';
  };

  const handleCountrySelect = (nextCountry: LaunchCountry) => {
    setSelectedCountry(nextCountry);
    setSelectedState('All');
    setUserCoords(null);
  };

  const handleStateSelect = (nextState: string) => {
    setSelectedState(nextState);
    if (nextState === 'All' || selectedCountry === 'All') {
      setUserCoords(null);
      return;
    }
    const region = STATES_BY_COUNTRY[selectedCountry].find((s) => s.name === nextState);
    if (region) {
      setUserCoords({
        lat: region.lat,
        lng: region.lng,
        label: `${region.name}, ${selectedCountry}`,
      });
      setNearMeRadiusKm(0);
      setNearMeAllEcosystems(true);
      setSortBy('nearest');
    }
  };

  const handleSelectLocation = (loc: SelectedLocation) => {
    setSelectedCountry(loc.country);
    setSelectedState(loc.state);
    setUserCoords({
      lat: loc.lat,
      lng: loc.lng,
      label: loc.label,
    });
    setNearMeRadiusKm(0);
    setNearMeAllEcosystems(true);
    setSortBy('nearest');
    setLocationBannerDismissed(true);
    setNotice(`Showing vendors in ${loc.label}, ${loc.country} (Paid partners on top).`);
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRequestLiveLocation = async (options?: { silentError?: boolean; scroll?: boolean }) => {
    setGpsDetecting(true);
    try {
      const coords = await requestBrowserGpsLocation();
      const resolved = await resolveRegionFromCoords(coords.lat, coords.lng);
      setUserCoords({
        lat: coords.lat,
        lng: coords.lng,
        label: resolved.label,
      });
      if (resolved.exactCountryMatched) {
        setSelectedCountry(resolved.country);
        setSelectedState(resolved.state);
      }
      setNearMeRadiusKm(0);
      setNearMeAllEcosystems(true);
      setSortBy('nearest');
      setLocationBannerDismissed(true);
      setNotice(`Location detected: ${resolved.label} — showing vendors near you.`);
      if (options?.scroll) {
        document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      if (!options?.silentError) {
        setNotice(
          err instanceof Error
            ? err.message
            : 'Location access blocked. Click "Search by City instead" to pick your area.'
        );
      }
    } finally {
      setGpsDetecting(false);
    }
  };

  // Trigger browser's native "Allow location" prompt once when a visitor opens the website
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    try {
      if (sessionStorage.getItem('fmb_geo_auto_prompted') === '1') return;
      sessionStorage.setItem('fmb_geo_auto_prompted', '1');
    } catch {
      // ignore storage errors
    }
    const timer = window.setTimeout(() => {
      void handleRequestLiveLocation({ silentError: true, scroll: false });
    }, 650);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNearMe = () => {
    setLocationPickerOpen(true);
  };

  const availableStates =
    selectedCountry === 'All' ? [] : STATES_BY_COUNTRY[selectedCountry];

  // Base pool: when Near Me is active, show BOTH Food & Event vendors near the user unless they filter a specific category
  const activeVendorPool = nearMeAllEcosystems ? allVendors : ecoVendors;

  const filteredVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const loc = locationQuery.trim().toLowerCase();

    const list = activeVendorPool.filter((v) => {
      if (selectedCategory !== 'All' && v.category !== selectedCategory) return false;
      if (selectedCountry !== 'All' && v.country !== selectedCountry) return false;
      if (selectedState !== 'All' && v.state !== selectedState) return false;
      if (selectedTierFilter === 'paid' && v.planTier === 'free') return false;
      if (selectedTierFilter === 'free' && v.planTier !== 'free') return false;
      if (selectedQuickTag !== 'All' && !getVendorQuickTags(v).includes(selectedQuickTag)) return false;
      if (selectedPrice !== 'All' && v.priceTier !== selectedPrice) return false;
      if (minRating > 0 && v.rating < minRating) return false;

      if (userCoords && nearMeRadiusKm > 0) {
        const d = haversineKm(userCoords.lat, userCoords.lng, v.lat, v.lng);
        if (d > nearMeRadiusKm) return false;
      }

      if (loc) {
        const locHay = `${v.city} ${v.area} ${v.state} ${v.country} ${v.serviceAreas.join(' ')}`.toLowerCase();
        if (!locHay.includes(loc)) return false;
      }

      if (q) {
        const prodNames = v.products.map((p) => p.name).join(' ');
        const hay = `${v.name} ${v.category} ${v.city} ${v.area} ${v.state} ${v.country} ${v.tagline} ${v.specialties.join(' ')} ${prodNames}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    // Paid SaaS listings (Business Spotlight > Pro Partner > Free) ALWAYS rank at the top!
    return [...list].sort((a, b) => {
      const rankDiff = planRankWeight(b.planTier) - planRankWeight(a.planTier);

      if (sortBy === 'nearest' && userCoords) {
        const distA = haversineKm(userCoords.lat, userCoords.lng, a.lat, a.lng);
        const distB = haversineKm(userCoords.lat, userCoords.lng, b.lat, b.lng);
        const localA = distA <= 60 ? 1 : 0;
        const localB = distB <= 60 ? 1 : 0;
        if (localA !== localB) return localB - localA;
        if (rankDiff !== 0) return rankDiff;
        return distA - distB;
      }

      if (rankDiff !== 0) return rankDiff;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price-asc') return a.startingPriceUsd - b.startingPriceUsd;
      return b.rating - a.rating;
    });
  }, [
    activeVendorPool,
    selectedCategory,
    selectedCountry,
    selectedState,
    selectedTierFilter,
    selectedQuickTag,
    selectedPrice,
    minRating,
    searchQuery,
    locationQuery,
    sortBy,
    userCoords,
    nearMeRadiusKm,
  ]);

  const featuredVendors = useMemo(
    () =>
      [...ecoVendors]
        .filter((v) => v.planTier === 'business' || v.planTier === 'pro')
        .sort((a, b) => planRankWeight(b.planTier) - planRankWeight(a.planTier) || b.rating - a.rating)
        .slice(0, 3),
    [ecoVendors]
  );

  const savedVendors = useMemo(
    () => allVendors.filter((v) => savedIds.includes(v.id)),
    [allVendors, savedIds]
  );

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    selectedCountry !== 'All' ||
    selectedState !== 'All' ||
    selectedTierFilter !== 'all' ||
    selectedQuickTag !== 'All' ||
    selectedPrice !== 'All' ||
    minRating > 0 ||
    searchQuery.trim().length > 0 ||
    locationQuery.trim().length > 0 ||
    Boolean(userCoords);

  const resetFilters = () => {
    setSearchQuery('');
    setLocationQuery('');
    setSelectedCategory('All');
    setSelectedCountry('All');
    setSelectedState('All');
    setSelectedTierFilter('all');
    setSelectedQuickTag('All');
    setSelectedPrice('All');
    setMinRating(0);
    setUserCoords(null);
    setNearMeRadiusKm(0);
    setNearMeAllEcosystems(false);
    setSortBy('featured');
  };

  const handleSignIn = async () => {
    try {
      const user = await signInWithGoogle();
      setNotice(`Signed in as ${user.displayName || user.email}. Cloud sync is active!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in cancelled.';
      if (msg.includes('unauthorized-domain')) {
        setNotice(
          `Add "${window.location.hostname}" in Firebase Console → Authentication → Settings → Authorized domains to enable Google Sign-In on this domain.`
        );
      } else if (!msg.includes('popup-closed-by-user')) {
        setNotice('Could not complete Google Sign-In. Please allow popups and try again.');
      }
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setDashboardOpen(false);
    setNotice('Signed out cleanly.');
  };

  const toggleSave = (vendorId: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId];
      if (authUser) {
        void syncSavedVendorsToCloud(authUser.uid, next).catch(() => {});
      }
      return next;
    });
  };

  const handleCreateBooking = (booking: BookingEnquiry) => {
    if (authUser) {
      const targetVendor = allVendors.find((v) => v.id === booking.vendorId);
      const vendorOwnerId = targetVendor?.ownerId || 'platform';
      void createBookingInCloud(booking, authUser.uid, vendorOwnerId)
        .then(() => {
          setNotice(`Enquiry ${booking.reference} saved to Cloud for ${booking.vendorName}.`);
        })
        .catch(() => {
          setBookings((prev) => [booking, ...prev]);
          setNotice(`Enquiry ${booking.reference} saved locally for ${booking.vendorName}.`);
        });
      return;
    }
    setBookings((prev) => [booking, ...prev]);
    setNotice(`Enquiry ${booking.reference} saved for ${booking.vendorName}.`);
  };

  const handleCancelBooking = (bookingId: string) => {
    if (authUser) {
      void updateBookingStatusInCloud(bookingId, 'Cancelled')
        .then(() => setNotice('Booking enquiry cancelled.'))
        .catch(() => {});
      return;
    }
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
  };

  const handleOpenListModal = (plan: PlanTier = 'free', christmasDefault = false) => {
    setListModalPlan(plan);
    setListModalChristmas(christmasDefault);
    setListModalOpen(true);
  };

  const handleAddVendor = async (vendor: Vendor) => {
    let savedVendor = vendor;
    if (authUser) {
      const isAdminUser =
        authUser.emailVerified && authUser.email?.toLowerCase() === ADMIN_EMAIL;
      savedVendor = await createVendorInCloud(vendor, authUser.uid, isAdminUser);
    } else {
      setCustomVendors((prev) => [vendor, ...prev]);
    }

    setEcosystem(savedVendor.marketplace === 'party' ? 'PIMPMYPARTY' : 'FINDMYBITES');
    setSelectedCategory('All');
    setSelectedCountry('All');
    setSelectedState('All');
    setNearMeAllEcosystems(false);
    setNotice(
      savedVendor.planTier === 'free'
        ? `${savedVendor.name} published live to Cloud! Opening your new one-page vendor website.`
        : `${savedVendor.name} activated on ${savedVendor.planTier === 'business' ? 'Business Spotlight' : 'Pro Auto-Pay'} — now pinned at the top!`
    );
    setActiveVendor(savedVendor);
  };

  const handleHeroSearch = (e: FormEvent) => {
    e.preventDefault();
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
  };

  const jumpToCategory = (cat: string, targetEco?: Ecosystem) => {
    if (targetEco) setEcosystem(targetEco);
    setNearMeAllEcosystems(false);
    setSelectedCategory(cat);
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
  };

  const jumpToCountry = (c: LaunchCountry) => {
    setSelectedCountry(c);
    setSelectedState('All');
    setUserCoords(null);
    setNearMeAllEcosystems(c !== 'All');
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
  };

  const hero = HERO_META[ecosystem];
  const heroStats = [
    {
      label: 'Verified Vendors',
      value: 1695 + cloudVendors.length + customVendors.length,
      suffix: '+',
      icon: Users,
    },
    { label: 'Launch Countries', value: 6, suffix: '', icon: Globe2 },
    { label: 'Direct WhatsApp', value: 100, suffix: '%', icon: MessageCircle },
    { label: 'AI Plans Built', value: 4280 + effectiveBookings.length, suffix: '+', icon: Sparkles },
  ];

  const sidebarCategories = nearMeAllEcosystems
    ? [...FOOD_CATEGORIES, ...PARTY_CATEGORIES]
    : ecoCategories;

  return (
    <div id="top" className="flex min-h-screen flex-col bg-background text-foreground pb-16 lg:pb-0">
      <Header
        ecosystem={ecosystem}
        onChangeEcosystem={handleChangeEcosystem}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        savedCount={savedIds.length}
        bookingsCount={effectiveBookings.length}
        user={authUser}
        myVendorCount={dashboardVendors.length}
        onOpenSaved={() => setDrawerTab('saved')}
        onOpenBookings={() => setDrawerTab('bookings')}
        onOpenListBusiness={() => handleOpenListModal('free')}
        onOpenDashboard={() => setDashboardOpen(true)}
        onSignIn={() => void handleSignIn()}
      />

      {/* Location Access Banner — matches live website Allow Location + Search by City bar */}
      {!userCoords && !locationBannerDismissed && (
        <div className="border-b border-brand-border bg-brand-soft/70 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-soft-foreground sm:text-sm">
              <MapPin className="size-4 shrink-0 text-brand" aria-hidden="true" />
              <span>Allow location access to find vendors near you</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={gpsDetecting}
                onClick={() => void handleRequestLiveLocation({ scroll: true })}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-brand-foreground shadow-xs transition-colors hover:bg-brand-hover disabled:opacity-60"
              >
                {gpsDetecting ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Navigation className="size-3.5" aria-hidden="true" />
                )}
                {gpsDetecting ? 'Locating…' : 'Allow Location'}
              </button>
              <button
                type="button"
                onClick={() => setLocationPickerOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand"
              >
                <Search className="size-3.5" aria-hidden="true" />
                Search by City instead
              </button>
              <button
                type="button"
                aria-label="Dismiss location bar"
                onClick={() => {
                  setLocationBannerDismissed(true);
                  try {
                    sessionStorage.setItem('fmb_loc_banner_dismissed', '1');
                  } catch {
                    // ignore
                  }
                }}
                className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="fixed bottom-24 right-4 z-50 max-w-sm rounded-xl border border-border bg-foreground px-4 py-3 text-sm text-background shadow-xl lg:bottom-24"
        >
          {notice}
        </div>
      )}

      <main id="main-content" className="flex-1">
        {/* Festive Christmas & New Year 2026 Promotion Strip */}
        <div className="border-b border-emerald-800/40 bg-gradient-to-r from-[#0B2B22] via-[#154234] to-[#6A1123] text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 font-semibold">
              <Snowflake className="size-3.5 shrink-0 text-amber-300" aria-hidden="true" />
              <span>
                <strong>Christmas &amp; New Year 2026 Special:</strong> Pre-order Plum Cakes, Yule
                Logs, Gift Hampers &amp; NYE Party Decor
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="#christmas-special"
                className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-extrabold text-neutral-950 transition-colors hover:bg-amber-300"
              >
                Explore Christmas Bakers →
              </a>
              <button
                type="button"
                onClick={() => handleOpenListModal('free', true)}
                className="cursor-pointer rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold text-white transition-colors hover:bg-white/20"
              >
                List Christmas Cakes Free
              </button>
            </div>
          </div>
        </div>

        {/* 1. EXACT PREMIUM HERO FROM WWW.FINDMYBITES.COM */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0">
            {!heroImgFailed ? (
              <img
                src={hero.image}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className={`h-full w-full bg-gradient-to-br ${
                  ecosystem === 'FINDMYBITES'
                    ? 'from-amber-700 via-orange-700 to-rose-800'
                    : 'from-fuchsia-700 via-purple-700 to-pink-800'
                }`}
              />
            )}
            <div className={`absolute inset-0 bg-gradient-to-r ${hero.overlay}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-4xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                <Sparkles className="size-3.5" aria-hidden="true" />
                {hero.eyebrow}
              </span>

              <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {hero.headlineLead}{' '}
                <span
                  className={`bg-gradient-to-r bg-clip-text text-transparent ${
                    ecosystem === 'FINDMYBITES'
                      ? 'from-amber-300 via-orange-300 to-rose-300'
                      : 'from-fuchsia-300 via-pink-300 to-amber-200'
                  }`}
                >
                  {hero.headlineAccent}
                </span>
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
                {hero.subtitle}
              </p>

              {/* 4-segment frosted white search box matching findmybites.com */}
              <form onSubmit={handleHeroSearch} className="mx-auto mt-7 max-w-3xl">
                <div className="flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/95 p-2 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center dark:bg-neutral-900/95">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={hero.searchPlaceholder}
                      aria-label="Search vendors"
                      className="h-12 w-full rounded-xl bg-transparent pl-10 pr-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>

                  <div className="relative border-t border-border/60 sm:border-l sm:border-t-0">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      aria-label="Select category"
                      className="h-12 w-full appearance-none rounded-xl bg-transparent px-3 pr-8 text-sm font-medium text-foreground focus:outline-none sm:w-44"
                    >
                      <option value="All">All categories</option>
                      {ecoCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="relative border-t border-border/60 sm:border-l sm:border-t-0">
                    <MapPin
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <input
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      placeholder="Area / City"
                      aria-label="Area or City"
                      className="h-12 w-full rounded-xl bg-transparent pl-9 pr-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none sm:w-32"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand px-6 text-sm font-semibold text-brand-foreground shadow-lg transition-transform hover:scale-[1.02] hover:bg-brand-hover sm:px-7 whitespace-nowrap"
                  >
                    <Search className="size-4" aria-hidden="true" />
                    <span>Search</span>
                  </button>
                </div>

                {/* Primary Hero Quick Actions: Instant Near Me + AI Event Planner + List Business */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleNearMe}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold shadow-lg transition-all sm:text-sm ${
                      userCoords
                        ? 'bg-[#25D366] text-white hover:bg-[#1ebe5d]'
                        : 'bg-white text-neutral-950 hover:bg-white/90'
                    }`}
                  >
                    <Navigation className="size-4" aria-hidden="true" />
                    {userCoords ? `Near Me Active · ${userCoords.label}` : 'Find Vendors Near Me'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAiPlannerOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#FF6B35] px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-[1.02] hover:bg-[#e55926] sm:text-sm"
                  >
                    <Sparkles className="size-4" aria-hidden="true" />
                    Plan My Event with AI
                  </button>

                  <button
                    type="button"
                    onClick={() => setEventRequestModalOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/25 sm:text-sm"
                  >
                    <Megaphone className="size-4" aria-hidden="true" />
                    Post Event Request
                    {myEventRequests.length > 0 && (
                      <span className="rounded-full bg-[#25D366] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                        {myEventRequests.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenListModal('pro')}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:text-sm"
                  >
                    <Crown className="size-4" aria-hidden="true" />
                    List Your Business
                  </button>
                </div>
              </form>

              {/* 6 Launch Countries Quick Switcher */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs font-semibold text-white/75">Launch Regions:</span>
                {LAUNCH_COUNTRIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => jumpToCountry(c)}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md transition-colors ${
                      selectedCountry === c
                        ? 'border-white bg-white text-neutral-950'
                        : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {c === 'All' ? 'All 6 Countries' : c}
                  </button>
                ))}
              </div>

              {/* 4-column translucent stats cards inside hero */}
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {heroStats.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className="flex items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-md"
                    >
                      <Icon className="size-4 shrink-0 text-white/80" aria-hidden="true" />
                      <div className="text-left">
                        <p className="font-mono text-lg font-extrabold leading-none tabular-nums text-white sm:text-xl">
                          {s.value.toLocaleString()}
                          {s.suffix}
                        </p>
                        <p className="mt-0.5 text-[10px] text-white/75">{s.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 1B. CHRISTMAS & NEW YEAR 2026 BAKERS & FESTIVE SPOTLIGHT */}
        <ChristmasSpotlightSection
          vendors={allVendors}
          currency={currency}
          canEditVendor={canEditVendor}
          onSelectVendor={setActiveVendor}
          onEditVendor={handleEditStorefront}
          onOpenChristmasListModal={() => handleOpenListModal('free', true)}
          onTrackWhatsAppClick={trackWhatsAppClick}
        />

        {/* 2. TRUST STRIP */}
        <section className="border-b border-border bg-background" aria-label="Platform highlights">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {TRUST_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3 transition-colors hover:border-brand/40"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{item.label}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. BROWSE BY CATEGORY (4:5 visual cards matching CategoriesSection) */}
        <section id="categories" className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                  Browse by category
                </p>
                <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {categoryTab === 'all'
                    ? 'All 24 FindMyBites & PimpMyParty categories'
                    : ecosystem === 'FINDMYBITES'
                      ? '12 FindMyBites food, beverage & gifting categories'
                      : '12 PimpMyParty decor, venue & entertainment categories'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {categoryTab === 'all'
                    ? 'Everything from wedding cakes, live chaat counters, mithai & mocktail bars to balloon decor, venues, 360 photo booths & cold fireworks.'
                    : ecosystem === 'FINDMYBITES'
                      ? 'Every culinary category for weddings, birthdays, corporate events and house parties — click any category to browse local vendors.'
                      : 'Every decor, entertainment, venue, lighting and hospitality category to make any celebration unforgettable.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-muted p-1 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    handleChangeEcosystem('FINDMYBITES');
                    setCategoryTab('eco');
                  }}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    categoryTab === 'eco' && ecosystem === 'FINDMYBITES'
                      ? 'bg-[#ef6c22] text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  FindMyBites (12)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleChangeEcosystem('PIMPMYPARTY');
                    setCategoryTab('eco');
                  }}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    categoryTab === 'eco' && ecosystem === 'PIMPMYPARTY'
                      ? 'bg-[#db2fb2] text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  PimpMyParty (12)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('all')}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    categoryTab === 'all'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All 24
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {displayedCategoryCards.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    jumpToCategory(cat.id, cat.ecosystem === 'food' ? 'FINDMYBITES' : 'PIMPMYPARTY')
                  }
                  className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-border hover:shadow-lg"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                    <img
                      src={cat.image}
                      alt={cat.label}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                    <div
                      className={`absolute left-3 top-3 grid size-8 place-items-center rounded-xl text-white backdrop-blur-md ${
                        cat.ecosystem === 'food' ? 'bg-[#ef6c22]/85' : 'bg-[#db2fb2]/85'
                      }`}
                    >
                      {cat.ecosystem === 'food' ? (
                        <UtensilsCrossed className="size-4" aria-hidden="true" />
                      ) : (
                        <PartyPopper className="size-4" aria-hidden="true" />
                      )}
                    </div>
                    <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[10px] font-semibold text-white backdrop-blur-md">
                      {cat.count} {cat.count === 1 ? 'vendor' : 'vendors'}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="text-sm font-bold leading-tight text-white">{cat.label}</p>
                      <p className="mt-1 line-clamp-1 text-[11px] text-white/80">{cat.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="truncate text-xs text-muted-foreground">
                      {cat.ecosystem === 'food' ? 'FindMyBites' : 'PimpMyParty'}
                    </span>
                    <ArrowUpRight
                      className="size-3.5 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
                      aria-hidden="true"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 4. TOP PAID SPOTLIGHT PARTNERS */}
        {featuredVendors.length > 0 && (
          <section id="featured" className="border-b border-border bg-muted/30">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-brand">
                    <Crown className="size-4" aria-hidden="true" />
                    Top Listed Paid Partners
                  </p>
                  <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                    {ecosystem === 'FINDMYBITES'
                      ? 'Spotlight food & catering vendors'
                      : 'Spotlight decor & event partners'}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Monthly SaaS Pro &amp; Business Spotlight vendors rank at the top — open their
                    one-page website or talk directly on WhatsApp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenListModal('business')}
                  className="cursor-pointer self-start text-xs font-bold text-brand hover:underline sm:self-auto whitespace-nowrap"
                >
                  Want the #1 pinned spot? Upgrade to Business Spotlight →
                </button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featuredVendors.map((vendor) => (
                  <VendorCard
                    key={`feat-${vendor.id}`}
                    vendor={vendor}
                    currency={currency}
                    isSaved={savedIds.includes(vendor.id)}
                    distanceKm={
                      userCoords
                        ? haversineKm(userCoords.lat, userCoords.lng, vendor.lat, vendor.lng)
                        : null
                    }
                    canEdit={canEditVendor(vendor)}
                    onToggleSave={toggleSave}
                    onSelect={setActiveVendor}
                    onEdit={handleEditStorefront}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 5. THE MARKETPLACE + INSTANT NEAR ME DISCOVERY BAR */}
        <section id="explore" className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                  {userCoords ? `Near Me · ${userCoords.label}` : 'The marketplace'}
                </p>
                <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {userCoords
                    ? `All food & event vendors near ${userCoords.label}`
                    : 'Explore vendors across 6 launch countries'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Paid monthly SaaS partners appear first, followed by Free listings. Click any card
                  to open the vendor&apos;s one-page website or message directly on WhatsApp.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setEventRequestModalOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand/40 bg-brand-soft px-3 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
                >
                  <Megaphone className="size-3.5" aria-hidden="true" />
                  Post Event Request
                  {myEventRequests.length > 0 && (
                    <span className="rounded-full bg-brand px-1.5 py-0.5 font-mono text-[10px] text-brand-foreground">
                      {myEventRequests.length}
                    </span>
                  )}
                </button>
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {filteredVendors.length} {filteredVendors.length === 1 ? 'vendor' : 'vendors'}
                </span>
                <select
                  aria-label="Currency selector"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
                >
                  {Object.values(CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol.trim()})
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Sort vendors"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground focus:border-brand focus:outline-none"
                >
                  <option value="featured">Sort: Paid on Top + Rating</option>
                  {userCoords && <option value="nearest">Sort: Near Me (Paid first)</option>}
                  <option value="rating">Sort: Highest rated</option>
                  <option value="price-asc">Sort: Price low to high</option>
                </select>
              </div>
            </div>

            {/* Country -> State/Province -> City Near Me Location Bar */}
            <div className="mt-6 rounded-2xl border border-brand-border bg-brand-soft/40 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLocationPickerOpen(true)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                      userCoords
                        ? 'bg-[#25D366] text-white hover:bg-[#1ebe5d]'
                        : 'bg-brand text-brand-foreground hover:bg-brand-hover'
                    }`}
                  >
                    <Navigation className="size-3.5" aria-hidden="true" />
                    {userCoords ? `Location: ${userCoords.label} (Change)` : 'Choose State & City'}
                  </button>

                  {/* Quick Country dropdown */}
                  <select
                    aria-label="Filter by country"
                    value={selectedCountry}
                    onChange={(e) => handleCountrySelect(e.target.value as LaunchCountry)}
                    className="cursor-pointer rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
                  >
                    {LAUNCH_COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c === 'All' ? 'All 6 Countries' : c}
                      </option>
                    ))}
                  </select>

                  {/* Dynamic State / Emirate / Province dropdown */}
                  {selectedCountry !== 'All' && (
                    <select
                      aria-label={`Filter by ${COUNTRY_REGION_LABEL[selectedCountry]}`}
                      value={selectedState}
                      onChange={(e) => handleStateSelect(e.target.value)}
                      className="cursor-pointer rounded-full border border-brand bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
                    >
                      <option value="All">
                        All {COUNTRY_REGION_LABEL[selectedCountry]}s in {selectedCountry}
                      </option>
                      {availableStates.map((st) => (
                        <option key={st.name} value={st.name}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {userCoords && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserCoords(null);
                        setSelectedState('All');
                        setNearMeRadiusKm(0);
                        setSortBy('featured');
                      }}
                      className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Clear location
                    </button>
                  )}
                </div>

                {userCoords && (
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-semibold text-muted-foreground">Radius:</span>
                    {([0, 15, 35, 100] as const).map((km) => (
                      <button
                        key={km}
                        type="button"
                        onClick={() => setNearMeRadiusKm(km)}
                        className={`cursor-pointer rounded-md border px-2 py-1 font-mono text-[11px] font-semibold transition-colors ${
                          nearMeRadiusKm === km
                            ? 'border-brand bg-brand text-brand-foreground'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {km === 0 ? 'All in State' : `${km} km`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dietary, Halal & Occasion Quick Filters */}
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-brand-border/60 pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick filters:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedQuickTag('All')}
                  className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    selectedQuickTag === 'All'
                      ? 'border-brand bg-brand text-brand-foreground'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                {QUICK_FILTER_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setSelectedQuickTag((prev) => (prev === tag ? 'All' : tag))
                    }
                    className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      selectedQuickTag === tag
                        ? 'border-brand bg-brand text-brand-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-brand/50 hover:text-foreground'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left Filter Sidebar */}
              <aside className="h-fit space-y-6 rounded-2xl border border-border bg-card p-5 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Filters</h3>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="cursor-pointer text-xs font-semibold text-brand hover:underline"
                    >
                      Reset all
                    </button>
                  )}
                </div>

                {/* Scope toggle: Food + Events together when Near Me */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Marketplace View
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setNearMeAllEcosystems(true);
                        setSelectedCategory('All');
                      }}
                      className={`cursor-pointer rounded-md py-1.5 transition-colors ${
                        nearMeAllEcosystems
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeEcosystem('FINDMYBITES')}
                      className={`cursor-pointer rounded-md py-1.5 transition-colors ${
                        !nearMeAllEcosystems && ecosystem === 'FINDMYBITES'
                          ? 'bg-[#ef6c22] text-white'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Food
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeEcosystem('PIMPMYPARTY')}
                      className={`cursor-pointer rounded-md py-1.5 transition-colors ${
                        !nearMeAllEcosystems && ecosystem === 'PIMPMYPARTY'
                          ? 'bg-[#db2fb2] text-white'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Events
                    </button>
                  </div>
                </div>

                <div className="border-t border-border pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Categories ({sidebarCategories.length})
                  </p>
                  <div className="mt-2.5 flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('All')}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                        selectedCategory === 'All'
                          ? 'bg-brand-soft font-semibold text-brand-soft-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <span>All categories</span>
                      <span className="font-mono tabular-nums">({activeVendorPool.length})</span>
                    </button>
                    {sidebarCategories.map((cat) => {
                      const count = activeVendorPool.filter((v) => v.category === cat).length;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                            selectedCategory === cat
                              ? 'bg-brand-soft font-semibold text-brand-soft-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          <span>{cat}</span>
                          <span className="font-mono tabular-nums">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 border-t border-border pt-5">
                  <div>
                    <label
                      htmlFor="sidebar-country"
                      className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Launch Country
                    </label>
                    <select
                      id="sidebar-country"
                      value={selectedCountry}
                      onChange={(e) => handleCountrySelect(e.target.value as LaunchCountry)}
                      className="mt-2 w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-brand focus:outline-none"
                    >
                      {LAUNCH_COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c === 'All' ? 'All 6 Countries' : c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCountry !== 'All' && (
                    <div>
                      <label
                        htmlFor="sidebar-state"
                        className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {COUNTRY_REGION_LABEL[selectedCountry]}
                      </label>
                      <select
                        id="sidebar-state"
                        value={selectedState}
                        onChange={(e) => handleStateSelect(e.target.value)}
                        className="mt-1.5 w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-brand focus:outline-none"
                      >
                        <option value="All">
                          All {COUNTRY_REGION_LABEL[selectedCountry]}s
                        </option>
                        {availableStates.map((st) => (
                          <option key={st.name} value={st.name}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Listing Plan
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'paid', label: 'Paid Top' },
                        { id: 'free', label: 'Free' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedTierFilter(opt.id)}
                        className={`cursor-pointer rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                          selectedTierFilter === opt.id
                            ? 'border-brand bg-brand text-brand-foreground'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Price range
                  </p>
                  <div className="mt-2 grid grid-cols-5 gap-1">
                    {(['All', '$', '$$', '$$$', '$$$$'] as const).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedPrice(tier)}
                        className={`cursor-pointer rounded-lg border py-1.5 font-mono text-xs font-semibold transition-colors ${
                          selectedPrice === tier
                            ? 'border-brand bg-brand text-brand-foreground'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tier === 'All' ? 'Any' : tier}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Minimum rating
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      { label: 'Any', value: 0 },
                      { label: '4.5+', value: 4.5 },
                      { label: '4.8+', value: 4.8 },
                      { label: '4.9+', value: 4.9 },
                    ].map((r) => (
                      <button
                        key={r.label}
                        type="button"
                        onClick={() => setMinRating(r.value)}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          minRating === r.value
                            ? 'border-brand bg-brand text-brand-foreground'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Main Marketplace Grid */}
              <div className="lg:col-span-9">
                {filteredVendors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
                    <h3 className="text-lg font-bold text-foreground">
                      No vendors found within these filters
                    </h3>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                      Expand your Near Me radius to All, switch cities, or ask Josh AI to plan your
                      event and suggest nearby options.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="cursor-pointer rounded-full bg-brand px-5 py-2 text-xs font-semibold text-brand-foreground"
                      >
                        Reset filters
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiPlannerOpen(true)}
                        className="cursor-pointer rounded-full bg-[#FF6B35] px-5 py-2 text-xs font-semibold text-white"
                      >
                        Ask AI Event Planner
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenListModal('pro')}
                        className="cursor-pointer rounded-full border border-border bg-background px-5 py-2 text-xs font-semibold text-foreground hover:bg-accent"
                      >
                        List your business here
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredVendors.map((vendor) => (
                      <VendorCard
                        key={vendor.id}
                        vendor={vendor}
                        currency={currency}
                        isSaved={savedIds.includes(vendor.id)}
                        distanceKm={
                          userCoords
                            ? haversineKm(userCoords.lat, userCoords.lng, vendor.lat, vendor.lng)
                            : null
                        }
                        canEdit={canEditVendor(vendor)}
                        onToggleSave={toggleSave}
                        onSelect={setActiveVendor}
                        onEdit={handleEditStorefront}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 6. 6 LAUNCH COUNTRIES FOOTPRINT */}
        <section className="border-b border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand">
                <Globe2 className="size-4" aria-hidden="true" /> Phase 1 Launch Regions
              </p>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Starting strong in 6 countries, scaling globally
              </h2>
              <p className="mt-2 text-muted-foreground">
                Built first for high-celebration markets across India, Dubai / UAE, Sri Lanka,
                Pakistan, Bangladesh &amp; Nepal — with international expansion next.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {COUNTRY_COVERAGE_STATS.map((c) => {
                const pct = Math.round((c.count / 680) * 100);
                return (
                  <button
                    key={c.country}
                    type="button"
                    onClick={() => jumpToCountry(c.country)}
                    className="cursor-pointer rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-brand hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{c.country}</span>
                      <span className="font-mono text-sm font-bold tabular-nums text-brand">
                        {c.count}+ vendors
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{c.cities}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-fuchsia-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 7. SAAS MONTHLY AUTO-PAY PRICING & VENDOR GROWTH SECTION */}
        <section id="pricing" className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-brand">
                <RefreshCw className="size-4" aria-hidden="true" /> Early Launch Vendor Pricing
              </p>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                List free today. Boost to the top from {formatPlanPrice(SAAS_PLANS[1], currency)}/mo.
              </h2>
              <p className="mt-2 text-muted-foreground">
                Built to get every baker, caterer &amp; event vendor online first — start free with
                your one-page website and WhatsApp button, or unlock top placement with simple
                monthly auto-pay and zero commission.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {SAAS_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-2xl border p-6 transition-all ${
                    plan.highlighted
                      ? 'border-brand bg-brand-soft/35 shadow-xl ring-2 ring-brand/20'
                      : 'border-border bg-card shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-extrabold text-foreground">{plan.name}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        plan.id === 'free'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-brand text-brand-foreground'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-extrabold tracking-tight text-foreground">
                      {formatPlanPrice(plan, currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-brand">{plan.billingNote}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{plan.tagline}</p>

                  <ul className="mt-5 flex-1 space-y-2.5 border-t border-border pt-5 text-sm">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2 text-foreground">
                        <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleOpenListModal(plan.id)}
                    className={`mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                      plan.highlighted || plan.id === 'business'
                        ? 'bg-brand text-brand-foreground hover:bg-brand-hover'
                        : 'border border-border bg-background text-foreground hover:border-brand hover:text-brand'
                    }`}
                  >
                    {plan.id === 'free' ? 'Create Free Storefront' : `Start ${plan.name}`}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            {/* Vendor CTA Grid */}
            <div className="mt-14 overflow-hidden rounded-3xl border border-brand-border bg-gradient-to-br from-brand-soft via-background to-brand-soft p-6 sm:p-10 lg:p-12">
              <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-background/85 px-3 py-1 text-xs font-semibold text-brand-soft-foreground">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    Built for Bakers, Caterers &amp; Event Pros
                  </span>
                  <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                    Your website, catalog &amp; WhatsApp leads in one place.
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    No need to build a separate website. Publish your one-page storefront in 2
                    minutes, list every cake, live counter, snack box, hamper or decor setup, and
                    talk to local customers directly on WhatsApp.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenListModal('pro')}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-lg transition-transform hover:scale-105 hover:bg-brand-hover"
                    >
                      <Sparkles className="size-4" aria-hidden="true" />
                      Launch My Vendor Page
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiPlannerOpen(true)}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-accent"
                    >
                      Try AI Event Planner
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
                  {VENDOR_BENEFITS.map((b) => {
                    const Icon = b.icon;
                    return (
                      <div
                        key={b.title}
                        className="rounded-xl border border-border bg-background/90 p-4 backdrop-blur transition-shadow hover:shadow-md"
                      >
                        <div className="grid size-9 place-items-center rounded-lg bg-brand text-brand-foreground">
                          <Icon className="size-4" aria-hidden="true" />
                        </div>
                        <h4 className="mt-2.5 text-sm font-bold text-foreground">{b.title}</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">{b.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. LOVED BY CUSTOMERS */}
        <section id="reviews" className="border-b border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand">
                <Star className="size-4 fill-brand" aria-hidden="true" />
                Loved by customers &amp; vendors
              </p>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Real celebrations booked directly on WhatsApp
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_TESTIMONIALS.map((r) => (
                <div
                  key={r.author}
                  className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-9 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                        {r.author.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{r.author}</p>
                        <p className="text-[11px] text-muted-foreground">{r.context}</p>
                      </div>
                    </div>
                    <Quote className="size-5 shrink-0 text-muted-foreground/30" aria-hidden="true" />
                  </div>
                  <div className="mt-3 flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-amber-400" aria-hidden="true" />
                    ))}
                  </div>
                  <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                    “{r.quote}”
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9. HOW IT WORKS */}
        <section id="how-it-works" className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">How it works</p>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                From craving to celebration in 3 simple steps
              </h2>
            </div>

            <div className="relative mt-12 grid gap-8 md:grid-cols-3">
              <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
              {HOW_IT_WORKS_STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="relative flex flex-col items-center text-center">
                    <div
                      className={`relative grid size-16 place-items-center rounded-2xl bg-gradient-to-br ${s.accent} text-white shadow-lg`}
                    >
                      <Icon className="size-8" aria-hidden="true" />
                      <span className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-background font-mono text-xs font-bold text-foreground shadow-md ring-1 ring-border">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-foreground">{s.title}</h3>
                    <p className="mt-2 max-w-xs text-sm text-muted-foreground">{s.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 9B. POPULAR LOCAL SEARCHES & FAQ (GOOGLE SEO INDEXABLE SECTION) */}
        <section id="faq" className="border-b border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                Popular local searches
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                Explore bakers, caterers &amp; event vendors by city
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Jump directly to top-rated local food artisans and party professionals across
                India, Dubai / UAE, Sri Lanka, Pakistan, Bangladesh &amp; Nepal.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {POPULAR_LOCAL_SEARCHES.map((item) => {
                  const href = `/?category=${encodeURIComponent(slugifySeo(item.category))}&country=${encodeURIComponent(slugifySeo(item.country))}`;
                  return (
                    <a
                      key={item.label}
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        setEcosystem(item.ecosystem);
                        setSelectedCategory(item.category);
                        setSelectedCountry(item.country);
                        setSelectedState(item.state);
                        setLocationQuery('');
                        setSearchQuery('');
                        setNearMeAllEcosystems(false);
                        document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
                    >
                      <MapPin className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
                      {item.label}
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="mt-12 border-t border-border pt-12">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                  Frequently asked questions
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  Everything about FindMyBites × PimpMyParty
                </h2>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {SEO_FAQS.map((faq) => (
                  <article
                    key={faq.question}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <h3 className="text-base font-bold text-foreground">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {faq.answer}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 10. SITE FOOTER MATCHING WWW.FINDMYBITES.COM */}
      <footer className="mt-auto border-t border-border bg-background">
        <div className="border-b border-border bg-gradient-to-r from-amber-500/5 via-fuchsia-500/5 to-purple-500/5">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-center sm:px-6 lg:flex-row lg:px-8 lg:text-left">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Ready to get direct WhatsApp orders in your city?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Launch your one-page vendor storefront free or upgrade to monthly auto-pay to rank #1 on top.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setAiPlannerOpen(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-accent whitespace-nowrap"
              >
                <Sparkles className="size-4 text-[#FF6B35]" aria-hidden="true" />
                Plan Event with AI
              </button>
              <button
                type="button"
                onClick={() => handleOpenListModal('pro')}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-sm transition-transform hover:scale-105 hover:bg-brand-hover whitespace-nowrap"
              >
                <Crown className="size-4" aria-hidden="true" />
                List your business
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6">
            <div className="col-span-2">
              <div className="flex items-center gap-2 font-bold">
                <span className="relative flex items-center">
                  <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                    <UtensilsCrossed className="size-4" aria-hidden="true" />
                  </span>
                  <span className="grid size-8 -ml-2 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white ring-2 ring-background">
                    <PartyPopper className="size-4" aria-hidden="true" />
                  </span>
                </span>
                <span className="text-sm leading-none text-foreground">
                  FindMyBites<span className="mx-1 text-muted-foreground">×</span>PimpMyParty
                </span>
              </div>
              <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                The dual marketplace for bakers, live counters, catering, bars, snack boxes,
                gifting &amp; event decor with one-page vendor websites, WhatsApp ordering &amp; AI
                event planning.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">FindMyBites</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {FOOD_CATEGORIES.map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => jumpToCategory(cat, 'FINDMYBITES')}
                      className="cursor-pointer transition-colors hover:text-brand"
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">PimpMyParty</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {PARTY_CATEGORIES.map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => jumpToCategory(cat, 'PIMPMYPARTY')}
                      className="cursor-pointer transition-colors hover:text-brand"
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">Launch Markets</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {LAUNCH_COUNTRIES.filter((c) => c !== 'All').map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => jumpToCountry(c)}
                      className="cursor-pointer transition-colors hover:text-brand"
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">Vendors &amp; AI</h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenListModal('free')}
                    className="cursor-pointer transition-colors hover:text-brand"
                  >
                    Free Listing
                  </button>
                </li>
                <li>
                  <a href="#pricing" className="transition-colors hover:text-brand">
                    Paid SaaS Auto-Pay Plans
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setEventRequestModalOpen(true)}
                    className="cursor-pointer transition-colors hover:text-brand"
                  >
                    Post an Event Request
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setAiPlannerOpen(true)}
                    className="cursor-pointer transition-colors hover:text-brand"
                  >
                    Josh AI Event Planner
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('bookings')}
                    className="cursor-pointer transition-colors hover:text-brand"
                  >
                    My Bookings
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© 2026 FindMyBites × PimpMyParty. Phase 1: India, UAE, Sri Lanka, Pakistan, Bangladesh &amp; Nepal.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3.5" aria-hidden="true" /> hello@findmybites.com
              </span>
              <select
                aria-label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="cursor-pointer rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                {['English', 'हिन्दी', 'العربية', 'اردو', 'বাংলা', 'नेपाली', 'සිංහල'].map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              <select
                aria-label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="cursor-pointer rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} {c.symbol.trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-card/95 py-1.5 backdrop-blur lg:hidden"
      >
        <a
          href="#top"
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium text-brand"
        >
          <Home className="size-5" aria-hidden="true" />
          Home
        </a>
        <button
          type="button"
          onClick={handleNearMe}
          className="flex cursor-pointer flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        >
          <Navigation className="size-5" aria-hidden="true" />
          Near Me
        </button>
        <button
          type="button"
          onClick={() => setAiPlannerOpen(true)}
          className="flex cursor-pointer flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium text-[#FF6B35]"
        >
          <Sparkles className="size-5" aria-hidden="true" />
          AI Plan
        </button>
        <button
          type="button"
          onClick={() => setDrawerTab('saved')}
          className="flex cursor-pointer flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        >
          <Heart className="size-5" aria-hidden="true" />
          Saved
        </button>
        <button
          type="button"
          onClick={() => handleOpenListModal('pro')}
          className="flex cursor-pointer flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        >
          <User className="size-5" aria-hidden="true" />
          Vendor
        </button>
      </nav>

      {/* Real Gemini-Powered AI Event Planner Chatbot */}
      <JoshPlannerDrawer
        isOpen={aiPlannerOpen}
        onOpenChange={setAiPlannerOpen}
        vendors={allVendors}
        currency={currency}
        userLocationLabel={userCoords?.label}
        onSelectVendor={setActiveVendor}
      />

      {/* Full One-Page Vendor Mini-Website */}
      <VendorWebsiteView
        vendor={resolvedActiveVendor}
        currency={currency}
        isSaved={resolvedActiveVendor ? savedIds.includes(resolvedActiveVendor.id) : false}
        metrics={resolvedActiveVendor ? vendorAnalytics[resolvedActiveVendor.id] : undefined}
        user={authUser}
        canEdit={resolvedActiveVendor ? canEditVendor(resolvedActiveVendor) : false}
        onSignIn={handleSignIn}
        onEditStorefront={handleEditStorefront}
        onOpenBioLink={handleOpenBioLink}
        onClose={() => setActiveVendor(null)}
        onToggleSave={toggleSave}
        onCreateBooking={handleCreateBooking}
        onOpenBookings={() => setDrawerTab('bookings')}
        onTrackWhatsAppClick={trackWhatsAppClick}
        onTrackShare={trackShare}
      />

      {/* FindMyBites Bio-Link (Linktree) Page: /fmb/<handle> & /@<handle> */}
      <VendorBioLinkView
        vendor={resolvedBioVendor}
        currency={currency}
        canEdit={resolvedBioVendor ? canEditVendor(resolvedBioVendor) : false}
        onClose={() => setBioVendor(null)}
        onOpenStorefront={handleOpenStorefrontFromBio}
        onEditStorefront={handleEditStorefront}
        onClaimOwnBioLink={() => {
          setBioVendor(null);
          handleOpenListModal('free');
        }}
        onTrackWhatsAppClick={trackWhatsAppClick}
        onTrackShare={trackShare}
      />

      <SavedBookingsDrawer
        activeTab={drawerTab}
        onChangeTab={setDrawerTab}
        onClose={() => setDrawerTab(null)}
        savedVendors={savedVendors}
        bookings={effectiveBookings}
        currency={currency}
        onSelectVendor={setActiveVendor}
        onToggleSave={toggleSave}
        onCancelBooking={handleCancelBooking}
        onTrackWhatsAppClick={trackWhatsAppClick}
      />

      <ListBusinessModal
        isOpen={listModalOpen}
        initialPlanTier={listModalPlan}
        initialChristmasSpecial={listModalChristmas}
        currency={currency}
        user={authUser}
        onSignIn={handleSignIn}
        onClose={() => setListModalOpen(false)}
        onAddVendor={handleAddVendor}
      />

      <VendorDashboardModal
        isOpen={dashboardOpen}
        user={authUser}
        myVendors={dashboardVendors}
        vendorLeads={vendorLeads}
        openEventRequests={openEventRequests}
        currency={currency}
        initialEditVendorId={editVendorId}
        onClearInitialEdit={() => setEditVendorId(null)}
        onClose={() => setDashboardOpen(false)}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenListModal={handleOpenListModal}
        onOpenVendorWebsite={setActiveVendor}
        onOpenBioLink={handleOpenBioLink}
        onTrackShare={trackShare}
        onNotify={setNotice}
      />

      <PostEventRequestModal
        isOpen={eventRequestModalOpen}
        user={authUser}
        currency={currency}
        defaultCountry={detectDefaultCountry()}
        myRequests={myEventRequests}
        onClose={() => setEventRequestModalOpen(false)}
        onSignIn={handleSignIn}
        onNotify={setNotice}
      />

      <LocationPickerModal
        isOpen={locationPickerOpen}
        defaultCountry={detectDefaultCountry()}
        onClose={() => setLocationPickerOpen(false)}
        onSelectLocation={handleSelectLocation}
      />

      {/* Festive Winter Snowfall Overlay + On/Off Toggle */}
      <SnowfallOverlay enabled={snowEnabled} onToggle={() => setSnowEnabled((prev) => !prev)} />
    </div>
  );
}
