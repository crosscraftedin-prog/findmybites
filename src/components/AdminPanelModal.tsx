import { FormEvent, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BarChart3,
  BadgeCheck,
  Briefcase,
  Cake,
  Check,
  ClipboardCheck,
  Copy,
  Edit3,
  ExternalLink,
  Globe2,
  KeyRound,
  Loader2,
  Lock,
  MessageCircle,
  MessageSquareWarning,
  Navigation,
  Package,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  ALL_CATEGORIES,
  AdminTransferRecord,
  BUILDER_PRESET_OPTIONS,
  BookingEnquiry,
  BuilderPresetId,
  CAKE_WEIGHT_PRESETS,
  CATEGORY_CARDS,
  COUNTRY_DEFAULT_CURRENCY,
  COUNTRY_REGION_LABEL,
  CURRENCIES,
  CUSTOM_BUILDER_MODES,
  CloudVendorMetric,
  CurrencyCode,
  CustomBuilderMode,
  EventRequest,
  FOOD_CATEGORIES,
  IMG_CAKE,
  LAUNCH_COUNTRIES,
  LaunchCountry,
  PASSCODE_LOCK_DAYS,
  PlanTier,
  ProductFoodType,
  STATES_BY_COUNTRY,
  SiteSettings,
  StoreClaim,
  Vendor,
  VendorProduct,
  VendorProductVariant,
  formatDisplayPasscode,
  generateTransferPasscode,
  getCustomBuilderModeConfig,
  getVendorBioHandle,
  isBuilderSuggestedCategory,
  localToUsd,
  normalizePasscode,
  normalizePhoneDigits,
  suggestBuilderModeForCategory,
} from '../data/vendors';
import {
  AdminReviewRecord,
  adminCreateStoreWithTransfer,
  adminIssueTransferForExistingStore,
  adminRevokeTransfer,
} from '../services/firestoreService';
import { compressImageFile } from '../utils/imageUpload';
import { FoodTypeIcon } from './FoodTypeBadge';
import { StateCoveragePicker } from './StateCoveragePicker';
import {
  AdminApprovalsTab,
  AdminCampaignsTab,
  AdminModerationTab,
  AdminOverviewTab,
  AdminSeoManagerTab,
} from './AdminCommandTabs';
import { AdminChristmasMenuTab } from './AdminChristmasMenuTab';
import { AdminBoxBiteTab } from './AdminBoxBiteTab';
import { CustomMenuDish, mergeChristmasDishes } from '../data/christmasMenu';
import {
  BoxBuilderItem,
  CorporateBoxProduct,
  mergeBoxBiteProducts,
} from '../data/boxAndBiteCatalog';

interface AdminPanelModalProps {
  open: boolean;
  onClose: () => void;
  adminUser: User;
  cloudVendors: Vendor[];
  allCatalogVendors: Vendor[];
  cloudChristmasDishes: CustomMenuDish[];
  cloudBoxBiteProducts: CorporateBoxProduct[];
  cloudBoxBiteBuilderItems: BoxBuilderItem[];
  transfers: AdminTransferRecord[];
  claims: StoreClaim[];
  bookings: BookingEnquiry[];
  reviews: AdminReviewRecord[];
  eventRequests: EventRequest[];
  vendorMetrics: CloudVendorMetric[];
  siteSettings: SiteSettings;
  currency: CurrencyCode;
  onEditVendor: (vendor: Vendor) => void;
  onPreviewVendor: (vendor: Vendor) => void;
  onPreviewBoxAndBite: () => void;
  onNavigateSeoPath: (path: string) => void;
  onToast: (message: string) => void;
}

type AdminTab =
  | 'overview'
  | 'approvals'
  | 'christmas-menu'
  | 'box-and-bite'
  | 'create'
  | 'transfers'
  | 'seo'
  | 'moderation'
  | 'campaigns';

interface DraftProductRow {
  id: string;
  name: string;
  priceLocal: string;
  serves: string;
  foodType: ProductFoodType | '';
  builderSection?: string;
  builderPresets?: BuilderPresetId[];
  variants?: Array<{ id: string; label: string; priceLocal: string; serves: string }>;
  tag: string;
  description: string;
  image: string;
}

const COUNTRY_PHONE_CODES: Record<Exclude<LaunchCountry, 'All'>, string> = {
  India: '91',
  'Dubai / UAE': '971',
  'Sri Lanka': '94',
  Pakistan: '92',
  Bangladesh: '880',
  Nepal: '977',
};

const BIRTHDAY_CAKE_PRESETS: Array<Omit<DraftProductRow, 'id' | 'image'>> = [
  {
    name: 'Belgian Chocolate Truffle Cake',
    priceLocal: '1450',
    serves: '1 kg · Serves 8–10',
    foodType: 'veg',
    tag: 'Bestseller',
    description: 'Rich dark Belgian chocolate ganache layered over moist sponge, customizable with name topper.',
  },
  {
    name: 'Custom Theme Birthday Cake',
    priceLocal: '2200',
    serves: '1.5 kg · Serves 14–16',
    foodType: 'veg',
    tag: 'Eggless Available',
    description: 'Hand-piped buttercream or fondant birthday cake crafted to your party colors and flavor choice.',
  },
  {
    name: 'Assorted Gourmet Cupcake Box (12 pcs)',
    priceLocal: '950',
    serves: 'Box of 12',
    foodType: 'veg',
    tag: 'Party Favorite',
    description: 'Red velvet, lotus biscoff, Nutella hazelnut & vanilla berry swirl cupcakes freshly baked to order.',
  },
];

const CHRISTMAS_CAKE_PRESETS: Array<Omit<DraftProductRow, 'id' | 'image'>> = [
  {
    name: 'Rich Spiced Christmas Plum Cake',
    priceLocal: '1250',
    serves: '1 kg · Gift Tin',
    foodType: 'veg',
    tag: 'Christmas Special',
    description: 'Traditional slow-matured dry fruit & warm spice plum cake (rum-soaked & alcohol-free options).',
  },
  {
    name: 'Chocolate Hazelnut Yule Log (Bûche de Noël)',
    priceLocal: '1850',
    serves: '1.2 kg · Serves 10',
    foodType: 'veg',
    tag: 'Limited Edition',
    description: 'Rolled cocoa sponge filled with praline cream and textured dark chocolate bark.',
  },
  {
    name: 'Festive Christmas Hamper Box',
    priceLocal: '1600',
    serves: 'Gift Box · 6 Treats',
    foodType: 'veg',
    tag: 'Corporate & Gifting',
    description: 'Mini plum cake, gingerbread cookies, fudge brownies, spiced nuts & festive ribbon packaging.',
  },
];

function getSiteOrigin(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (
      host.includes('findmybites.com') ||
      host.endsWith('.run.app') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    ) {
      return 'https://www.findmybites.com';
    }
    return window.location.origin;
  }
  return 'https://www.findmybites.com';
}

function buildHandoverWhatsAppMessage(
  vendorName: string,
  vendorSlug: string,
  bioHandle: string,
  targetPhone: string,
  passcode: string
): string {
  const origin = getSiteOrigin();
  const storeUrl = `${origin}/v/${vendorSlug}`;
  const bioUrl = `${origin}/fmb/${bioHandle}`;
  const claimUrl = `${origin}/claim/${vendorSlug}`;
  const displayCode = formatDisplayPasscode(passcode);
  return [
    `Hi ${vendorName}!`,
    ``,
    `Great news — we have already built your FREE online storefront & catalog on FindMyBites × PimpMyParty so local customers can discover your services and order directly on WhatsApp!`,
    ``,
    `Your Live Storefront: ${storeUrl}`,
    `Your Short Bio-Link (for Instagram): ${bioUrl}`,
    ``,
    `Claim full ownership & create your password here (takes 30 seconds):`,
    `${claimUrl}`,
    ``,
    `Phone Number: +${targetPhone}`,
    `Secret Key: ${displayCode}`,
    ``,
    `Once you claim it, you can edit prices, add photos, update your menu & offers, and receive direct customer orders with 0% commission!`,
  ].join('\n');
}

function getPasscodeLockInfo(t: AdminTransferRecord): {
  locked: boolean;
  daysLeft: number;
  unlockDateLabel: string;
} {
  const lockMs = PASSCODE_LOCK_DAYS * 24 * 60 * 60 * 1000;
  let unlockMs = NaN;
  if (t.lockedUntilIso) {
    unlockMs = Date.parse(t.lockedUntilIso);
  } else {
    const baseStr = t.issuedAtIso || t.updatedAt || t.createdAt;
    const baseMs = baseStr ? Date.parse(baseStr) : NaN;
    if (Number.isFinite(baseMs)) {
      unlockMs = baseMs + lockMs;
    }
  }
  if (!Number.isFinite(unlockMs)) {
    return { locked: false, daysLeft: 0, unlockDateLabel: '' };
  }
  const remainingMs = unlockMs - Date.now();
  const unlockDateLabel = new Date(unlockMs).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (remainingMs <= 0) {
    return { locked: false, daysLeft: 0, unlockDateLabel };
  }
  return {
    locked: true,
    daysLeft: Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))),
    unlockDateLabel,
  };
}

function makeEmptyProduct(defaultImg: string): DraftProductRow {
  return {
    id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    priceLocal: '',
    serves: '1 kg · Serves 8',
    foodType: '',
    builderSection: '',
    builderPresets: [],
    tag: 'Bestseller',
    description: '',
    image: defaultImg,
  };
}

export function AdminPanelModal({
  open,
  onClose,
  adminUser,
  cloudVendors,
  allCatalogVendors,
  cloudChristmasDishes,
  cloudBoxBiteProducts,
  cloudBoxBiteBuilderItems,
  transfers,
  claims,
  bookings,
  reviews,
  eventRequests,
  vendorMetrics,
  siteSettings,
  currency,
  onEditVendor,
  onPreviewVendor,
  onPreviewBoxAndBite,
  onNavigateSeoPath,
  onToast,
}: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const activeChristmasDishCount = useMemo(
    () => mergeChristmasDishes(cloudChristmasDishes).activeDishes.length,
    [cloudChristmasDishes]
  );
  const activeBoxBiteProductCount = useMemo(
    () => mergeBoxBiteProducts(cloudBoxBiteProducts).activeProducts.length,
    [cloudBoxBiteProducts]
  );

  // --- Create & Transfer Store Form State ---
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Bakers & Cakes');
  const [country, setCountry] = useState<Exclude<LaunchCountry, 'All'>>('India');
  const [stateName, setStateName] = useState('Maharashtra');
  const [city, setCity] = useState('Mumbai');
  const [area, setArea] = useState('');
  const [allStatesCoverage, setAllStatesCoverage] = useState(false);
  const [serviceStates, setServiceStates] = useState<string[]>([]);
  const [lat, setLat] = useState(19.076);
  const [lng, setLng] = useState(72.8777);
  const [phoneCode, setPhoneCode] = useState('91');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [bioHandle, setBioHandle] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [tagline, setTagline] = useState('Handcrafted custom cakes, plum cakes & party desserts');
  const [description, setDescription] = useState(
    'Freshly baked to order with premium ingredients. Message us on WhatsApp for custom birthday cakes, wedding tiers, and festive hampers.'
  );
  const [planTier, setPlanTier] = useState<PlanTier>('free');
  const [verified, setVerified] = useState(true);
  const [christmasSpecial, setChristmasSpecial] = useState(true);
  const [christmasOffer, setChristmasOffer] = useState(
    'Christmas Plum Cakes, Yule Logs & Festive Gift Boxes · Pre-orders Open'
  );
  const [customBuilderEnabled, setCustomBuilderEnabled] = useState(false);
  const [customBuilderMode, setCustomBuilderMode] = useState<CustomBuilderMode>('snackbox');
  const [customBuilderMinQty, setCustomBuilderMinQty] = useState(10);
  const [customBuilderPackagingLocal, setCustomBuilderPackagingLocal] = useState(0);
  const [coverImage, setCoverImage] = useState(IMG_CAKE);
  const [passcode, setPasscode] = useState(() => generateTransferPasscode());
  const [products, setProducts] = useState<DraftProductRow[]>([
    {
      ...BIRTHDAY_CAKE_PRESETS[0],
      id: 'preset-1',
      image: IMG_CAKE,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingProdId, setUploadingProdId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdHandover, setCreatedHandover] = useState<{
    vendor: Vendor;
    transfer: AdminTransferRecord;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [busyVendorId, setBusyVendorId] = useState<string | null>(null);

  const formCurrency: CurrencyCode = COUNTRY_DEFAULT_CURRENCY[country] || currency;
  const currencySymbol = CURRENCIES[formCurrency].symbol;

  const statesForCountry = STATES_BY_COUNTRY[country] || [];
  const activeStateObj =
    statesForCountry.find((s) => s.name === stateName) || statesForCountry[0];

  const categoryDefaultImg = useMemo(() => {
    const meta = CATEGORY_CARDS.find((c) => c.label === category);
    return meta?.image || IMG_CAKE;
  }, [category]);

  const claimsById = useMemo(() => {
    const map = new Map<string, StoreClaim>();
    for (const c of claims) map.set(c.id, c);
    return map;
  }, [claims]);

  const vendorsById = useMemo(() => {
    const map = new Map<string, Vendor>();
    for (const v of cloudVendors) map.set(v.id, v);
    return map;
  }, [cloudVendors]);

  // Compute live status for every transfer by cross-checking live /storeClaims & /vendors
  const enrichedTransfers = useMemo(() => {
    return transfers.map((t) => {
      const liveClaim = claimsById.get(t.claimId);
      const liveVendor = vendorsById.get(t.vendorId);
      const liveStatus: 'pending' | 'claimed' | 'revoked' =
        liveClaim?.status === 'claimed' || liveVendor?.claimStatus === 'claimed'
          ? 'claimed'
          : liveClaim?.status === 'revoked' || t.status === 'revoked'
            ? 'revoked'
            : 'pending';
      return {
        ...t,
        liveStatus,
        liveVendor,
        claimedByUid: liveClaim?.claimedBy,
      };
    });
  }, [transfers, claimsById, vendorsById]);

  const pendingCount = enrichedTransfers.filter((t) => t.liveStatus === 'pending').length;
  const claimedCount = enrichedTransfers.filter((t) => t.liveStatus === 'claimed').length;
  const pendingApprovalCount = cloudVendors.filter((v) => v.status === 'pending_review').length;

  if (!open) return null;

  const handleCountryChange = (nextCountry: Exclude<LaunchCountry, 'All'>) => {
    setCountry(nextCountry);
    setPhoneCode(COUNTRY_PHONE_CODES[nextCountry] || '91');
    setAllStatesCoverage(false);
    setServiceStates([]);
    const regions = STATES_BY_COUNTRY[nextCountry] || [];
    if (regions[0]) {
      setStateName(regions[0].name);
      setCity(regions[0].cities[0] || regions[0].name);
      setLat(regions[0].lat);
      setLng(regions[0].lng);
    }
  };

  const handleStateChange = (nextState: string) => {
    setStateName(nextState);
    const region = statesForCountry.find((s) => s.name === nextState);
    if (region) {
      setCity(region.cities[0] || region.name);
      setLat(region.lat);
      setLng(region.lng);
    }
  };

  const handleUseMyGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(5)));
        setLng(Number(pos.coords.longitude.toFixed(5)));
        setLocating(false);
        onToast('GPS coordinates captured!');
      },
      () => {
        setLocating(false);
        setError('Could not read GPS location. Using city coordinates instead.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingCover(true);
    setError(null);
    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 900,
        maxHeight: 640,
        quality: 0.72,
        maxChars: 130000,
      });
      setCoverImage(dataUrl);
    } catch {
      setError('Could not process cover photo. Try a smaller JPG/PNG.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleProductPhotoUpload = async (prodId: string, file: File | null) => {
    if (!file) return;
    setUploadingProdId(prodId);
    setError(null);
    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 640,
        maxHeight: 480,
        quality: 0.7,
        maxChars: 85000,
      });
      setProducts((prev) => prev.map((p) => (p.id === prodId ? { ...p, image: dataUrl } : p)));
    } catch {
      setError('Could not compress product photo. Try a smaller image.');
    } finally {
      setUploadingProdId(null);
    }
  };

  const loadPresets = (kind: 'birthday' | 'christmas') => {
    const src = kind === 'christmas' ? CHRISTMAS_CAKE_PRESETS : BIRTHDAY_CAKE_PRESETS;
    const rate = CURRENCIES[formCurrency].rate / CURRENCIES.INR.rate;
    const mapped: DraftProductRow[] = src.map((item, idx) => ({
      ...item,
      id: `${kind}-${Date.now()}-${idx}`,
      priceLocal: String(Math.max(10, Math.round(Number(item.priceLocal) * rate))),
      image: categoryDefaultImg,
    }));
    setProducts(mapped);
    if (kind === 'christmas') {
      setChristmasSpecial(true);
    }
    onToast(`Loaded ${mapped.length} ${kind} cake products — edit names & prices as needed!`);
  };

  const copyText = (text: string, key: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedKey(key);
    onToast(`${label} copied!`);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2200);
  };

  const resetBuilder = () => {
    setName('');
    setArea('');
    setAllStatesCoverage(false);
    setServiceStates([]);
    setCustomBuilderEnabled(false);
    setCustomBuilderPackagingLocal(0);
    setPhoneLocal('');
    setBioHandle('');
    setGoogleMapsUrl('');
    setGoogleReviewUrl('');
    setCoverImage(categoryDefaultImg);
    setPasscode(generateTransferPasscode());
    setProducts([
      {
        ...BIRTHDAY_CAKE_PRESETS[0],
        id: `preset-${Date.now()}`,
        image: categoryDefaultImg,
      },
    ]);
    setCreatedHandover(null);
    setError(null);
  };

  const handleCreateAndGenerateTransfer = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Please enter the bakery / vendor name.');
      return;
    }

    const fullPhone = normalizePhoneDigits(
      phoneLocal.startsWith(phoneCode) && phoneLocal.replace(/\D/g, '').length >= 11
        ? phoneLocal
        : `${phoneCode}${phoneLocal}`
    );
    if (fullPhone.length < 8) {
      setError('Please enter the baker’s full mobile / WhatsApp number.');
      return;
    }

    const cleanPass = normalizePasscode(passcode);
    if (cleanPass.length < 6) {
      setError('Secret key must be at least 6 letters/numbers (e.g., 7K4M9P).');
      return;
    }

    const validProducts: VendorProduct[] = products
      .filter((p) => p.name.trim().length >= 2)
      .map((p, idx) => {
        const localNum = Number(p.priceLocal) || 0;
        const cleanedVariants: VendorProductVariant[] = (p.variants || [])
          .map((v, vIdx) => {
            const label = v.label.trim().slice(0, 32);
            const vLocal = Number(v.priceLocal);
            if (!label || !Number.isFinite(vLocal) || vLocal <= 0) return null;
            return {
              id: v.id || `var-${vIdx + 1}`,
              label,
              priceUsd: Math.max(0.5, localToUsd(vLocal, formCurrency)),
              ...(v.serves.trim() ? { serves: v.serves.trim().slice(0, 40) } : {}),
            };
          })
          .filter((v): v is VendorProductVariant => Boolean(v))
          .slice(0, 12);

        const resolvedServes =
          cleanedVariants.length >= 2
            ? `${cleanedVariants[0].label} – ${cleanedVariants[cleanedVariants.length - 1].label}`
            : cleanedVariants.length === 1
              ? cleanedVariants[0].label
              : p.serves.trim().slice(0, 60) || 'Custom';

        const resolvedPriceUsd =
          cleanedVariants.length > 0
            ? Math.min(...cleanedVariants.map((v) => v.priceUsd))
            : Math.max(1, localToUsd(localNum > 0 ? localNum : 500, formCurrency));

        return {
          id: p.id || `prod-${idx + 1}`,
          name: p.name.trim().slice(0, 100),
          serves: resolvedServes,
          ...(p.foodType ? { foodType: p.foodType } : {}),
          ...(customBuilderEnabled && p.builderSection?.trim()
            ? { builderSection: p.builderSection.trim().slice(0, 60) }
            : {}),
          ...(customBuilderEnabled && p.builderPresets && p.builderPresets.length > 0
            ? { builderPresets: p.builderPresets }
            : {}),
          ...(cleanedVariants.length > 0 ? { variants: cleanedVariants } : {}),
          priceUsd: resolvedPriceUsd,
          description:
            p.description.trim().slice(0, 400) ||
            `${p.name.trim()} freshly handcrafted to order.`,
          image: p.image || categoryDefaultImg,
          ...(p.tag.trim() ? { tag: p.tag.trim().slice(0, 40) } : {}),
        };
      });

    if (validProducts.length === 0) {
      setError('Please add at least 1 product or cake to the baker’s menu.');
      return;
    }

    const isFood = (FOOD_CATEGORIES as readonly string[]).includes(category);
    const minPriceUsd = Math.min(...validProducts.map((p) => p.priceUsd));
    const slugBase = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const slug = `${slugBase || 'bakery'}-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}`;

    const draftVendor: Vendor = {
      id: `${slug}-${Date.now().toString().slice(-4)}`,
      slug,
      name: trimmedName,
      marketplace: isFood ? 'food' : 'party',
      category,
      country,
      state: stateName,
      city,
      area: area.trim() || city,
      lat,
      lng,
      whatsappNumber: fullPhone,
      planTier,
      monthlyAutoPay: planTier !== 'free',
      priceTier: minPriceUsd < 25 ? '$' : minPriceUsd < 75 ? '$$' : '$$$',
      startingPriceUsd: minPriceUsd,
      rating: 5.0,
      reviewCount: 0,
      responseTime: 'Replies within 15 mins on WhatsApp',
      verified,
      tagline: tagline.trim() || `Artisan ${category} in ${city}`,
      description:
        description.trim() || `Handcrafted ${category} serving ${area.trim() || city}, ${city}.`,
      christmasSpecial,
      christmasOffer: christmasSpecial ? christmasOffer.trim() : undefined,
      customBuilderEnabled: isFood && customBuilderEnabled,
      customBuilderMode: isFood && customBuilderEnabled ? customBuilderMode : undefined,
      customBuilderMinQty:
        isFood && customBuilderEnabled
          ? Math.max(1, Math.min(5000, Math.round(customBuilderMinQty || 10)))
          : undefined,
      customBuilderPackagingUsd:
        isFood && customBuilderEnabled && customBuilderPackagingLocal > 0
          ? Math.max(0, Math.min(500, localToUsd(customBuilderPackagingLocal, formCurrency)))
          : undefined,
      bioHandle: bioHandle.trim() || slugBase,
      ...(googleMapsUrl.trim() ? { googleMapsUrl: googleMapsUrl.trim() } : {}),
      ...(googleReviewUrl.trim() ? { googleReviewUrl: googleReviewUrl.trim() } : {}),
      serviceAreas: [area.trim() || city, city].filter(Boolean),
      allStatesCoverage,
      serviceStates: allStatesCoverage
        ? []
        : serviceStates.filter((s) => s && s !== stateName),
      specialties: [category, ...validProducts.slice(0, 3).map((p) => p.name)],
      image: coverImage || categoryDefaultImg,
      products: validProducts,
      reviews: [],
      status: 'active',
      claimStatus: 'pending',
    };

    setSubmitting(true);
    try {
      const result = await adminCreateStoreWithTransfer(
        draftVendor,
        adminUser.uid,
        fullPhone,
        cleanPass
      );
      setCreatedHandover(result);
      onToast(`Store "${result.vendor.name}" created & ready to transfer!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create store & transfer ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueTransferForExistingVendor = async (
    vendor: Vendor,
    phone: string,
    pass: string
  ) => {
    setError(null);
    try {
      const prevTransfer = transfers.find((t) => t.vendorId === vendor.id);
      if (prevTransfer && prevTransfer.status === 'pending') {
        const lockInfo = getPasscodeLockInfo(prevTransfer);
        if (lockInfo.locked) {
          setCreatedHandover({ vendor, transfer: prevTransfer });
          setActiveTab('create');
          onToast(
            `Same secret key ${formatDisplayPasscode(prevTransfer.passcode)} stays locked until ${lockInfo.unlockDateLabel} (${lockInfo.daysLeft}d left).`
          );
          return;
        }
      }
      const record = await adminIssueTransferForExistingStore(
        vendor,
        adminUser.uid,
        phone,
        pass,
        prevTransfer?.claimId
      );
      setCreatedHandover({ vendor, transfer: record });
      setActiveTab('create');
      onToast(`Transfer secret key generated for ${vendor.name}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue transfer secret key.');
    }
  };

  const handleRegeneratePasscode = async (t: AdminTransferRecord) => {
    const vendor = vendorsById.get(t.vendorId);
    if (!vendor) return;
    const lockInfo = getPasscodeLockInfo(t);
    if (lockInfo.locked) {
      onToast(
        `Secret key ${formatDisplayPasscode(t.passcode)} is locked until ${lockInfo.unlockDateLabel} (${lockInfo.daysLeft}d left) so the vendor's link stays valid.`
      );
      return;
    }
    const nextCode = generateTransferPasscode();
    setBusyVendorId(t.vendorId);
    try {
      await adminIssueTransferForExistingStore(
        vendor,
        adminUser.uid,
        t.targetPhone,
        nextCode,
        t.claimId
      );
      onToast(`New passcode ${nextCode} issued for ${t.vendorName}!`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not regenerate passcode.');
    } finally {
      setBusyVendorId(null);
    }
  };

  const handleRevoke = async (t: AdminTransferRecord) => {
    setBusyVendorId(t.vendorId);
    try {
      await adminRevokeTransfer(t.vendorId, t.claimId);
      onToast(`Transfer passcode revoked for ${t.vendorName}.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not revoke transfer.');
    } finally {
      setBusyVendorId(null);
    }
  };

  const origin = getSiteOrigin();

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-neutral-950/75 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Admin Concierge Panel"
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        {/* Top Admin Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-neutral-950 via-neutral-900 to-emerald-950 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight sm:text-lg">
                  FindMyBites Admin Command Center
                </h2>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Full Control
                </span>
              </div>
              <p className="text-xs text-white/70">
                Approve vendors, review stores, manage Google SEO &amp; live sitemap, moderate leads, and transfer baker storefronts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Admin Panel"
            className="grid size-9 cursor-pointer place-items-center rounded-xl bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* 7-Tab Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                { id: 'overview', label: 'Overview', icon: BarChart3, badge: 0 },
                {
                  id: 'approvals',
                  label: 'Approvals & Stores',
                  icon: ClipboardCheck,
                  badge: pendingApprovalCount,
                  badgeTone: 'bg-rose-600 text-white',
                },
                {
                  id: 'christmas-menu',
                  label: 'Christmas Menu',
                  icon: UtensilsCrossed,
                  badge: activeChristmasDishCount,
                  badgeTone: 'bg-emerald-600 text-white',
                },
                {
                  id: 'box-and-bite',
                  label: 'BOX & BITE',
                  icon: Briefcase,
                  badge: activeBoxBiteProductCount,
                  badgeTone: 'bg-[#38231E] text-[#FFF8EF]',
                },
                { id: 'create', label: 'Create & Transfer', icon: Cake, badge: 0 },
                {
                  id: 'transfers',
                  label: 'Passcodes',
                  icon: KeyRound,
                  badge: pendingCount,
                  badgeTone: 'bg-amber-500 text-white',
                },
                { id: 'seo', label: 'SEO & Google', icon: Globe2, badge: 0 },
                {
                  id: 'moderation',
                  label: 'Reviews & Leads',
                  icon: MessageSquareWarning,
                  badge: 0,
                },
                { id: 'campaigns', label: 'Site Controls', icon: Settings2, badge: 0 },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-brand text-brand-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-extrabold leading-none ${
                        'badgeTone' in tab ? tab.badgeTone : 'bg-amber-500 text-white'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* TAB 1: OVERVIEW & LIVE KPIs */}
          {activeTab === 'overview' && (
            <AdminOverviewTab
              allCloudVendors={cloudVendors}
              allCatalogVendors={allCatalogVendors}
              pendingTransfersCount={pendingCount}
              claimedTransfersCount={claimedCount}
              bookings={bookings}
              reviews={reviews}
              eventRequests={eventRequests}
              vendorMetrics={vendorMetrics}
              onSwitchTab={(t) => setActiveTab(t)}
              onPreviewVendor={(v) => {
                onClose();
                onPreviewVendor(v);
              }}
            />
          )}

          {/* TAB 2: APPROVALS & STORE REVIEW QUEUE */}
          {activeTab === 'approvals' && (
            <AdminApprovalsTab
              adminUser={adminUser}
              allCloudVendors={cloudVendors}
              transfers={transfers}
              currency={currency}
              onEditVendor={(v) => {
                onClose();
                onEditVendor(v);
              }}
              onPreviewVendor={(v) => {
                onClose();
                onPreviewVendor(v);
              }}
              onIssueTransfer={handleIssueTransferForExistingVendor}
              onToast={onToast}
            />
          )}

          {/* TAB 3: CREATE & TRANSFER STORE */}
          {activeTab === 'create' && (
            createdHandover ? (
              /* INSTANT HANDOVER SUCCESS KIT */
              <div className="mx-auto max-w-2xl space-y-5 py-2">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
                    <Check className="size-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3 text-xl font-extrabold text-foreground">
                    Store Live &amp; Handover Passcode Ready!
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <strong>{createdHandover.vendor.name}</strong> is live right now with{' '}
                    {createdHandover.vendor.products.length} product(s). Send the message below to{' '}
                    <span className="font-mono font-bold text-foreground">
                      +{createdHandover.transfer.targetPhone}
                    </span>{' '}
                    so she can enter the passcode and set her password.
                  </p>
                </div>

                {/* Credentials Box */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Baker Phone Number
                    </p>
                    <p className="mt-1 font-mono text-lg font-extrabold text-foreground">
                      +{createdHandover.transfer.targetPhone}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Secret Claim Passcode
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            formatDisplayPasscode(createdHandover.transfer.passcode),
                            'pass',
                            'Secret key'
                          )
                        }
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-500/30 dark:text-amber-200"
                      >
                        {copiedKey === 'pass' ? <Check className="size-3" /> : <Copy className="size-3" />}
                        Copy
                      </button>
                    </div>
                    <p className="mt-1 font-mono text-xl font-black tracking-widest text-amber-900 dark:text-amber-200">
                      {formatDisplayPasscode(createdHandover.transfer.passcode)}
                    </p>
                  </div>
                </div>

                {/* Links Box */}
                <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-muted-foreground">Claim Link:</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <code className="truncate font-mono text-foreground">
                        {origin}/claim/{createdHandover.transfer.vendorSlug}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            `${origin}/claim/${createdHandover.transfer.vendorSlug}`,
                            'claimUrl',
                            'Claim link'
                          )
                        }
                        className="shrink-0 cursor-pointer rounded-md border border-border px-2 py-1 font-semibold hover:border-brand"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-muted-foreground">Live Storefront:</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <code className="truncate font-mono text-foreground">
                        {origin}/v/{createdHandover.transfer.vendorSlug}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            `${origin}/v/${createdHandover.transfer.vendorSlug}`,
                            'storeUrl',
                            'Store link'
                          )
                        }
                        className="shrink-0 cursor-pointer rounded-md border border-border px-2 py-1 font-semibold hover:border-brand"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary WhatsApp Handover Button */}
                {(() => {
                  const bio = getVendorBioHandle(createdHandover.vendor);
                  const waMessage = buildHandoverWhatsAppMessage(
                    createdHandover.vendor.name,
                    createdHandover.transfer.vendorSlug,
                    bio,
                    createdHandover.transfer.targetPhone,
                    createdHandover.transfer.passcode
                  );
                  const waUrl = `https://wa.me/${normalizePhoneDigits(createdHandover.transfer.targetPhone)}?text=${encodeURIComponent(waMessage)}`;
                  return (
                    <div className="space-y-3">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition-transform hover:scale-[1.01] hover:bg-[#1ebe5d]"
                      >
                        <MessageCircle className="size-5" aria-hidden="true" />
                        Send Store Link &amp; Passcode to Baker on WhatsApp
                      </a>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => copyText(waMessage, 'fullmsg', 'WhatsApp handover message')}
                          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-bold text-foreground hover:border-brand"
                        >
                          <Copy className="size-3.5" aria-hidden="true" />
                          Copy Full Invite
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onPreviewVendor(createdHandover.vendor);
                          }}
                          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-bold text-foreground hover:border-brand"
                        >
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                          Preview Live Store
                        </button>
                        <button
                          type="button"
                          onClick={resetBuilder}
                          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2.5 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                          Build Next Baker Store
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* FAST BAKER STORE BUILDER FORM */
              <form onSubmit={(e) => void handleCreateAndGenerateTransfer(e)} className="space-y-6">
                {/* Section 1: Baker Details & Transfer Phone */}
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">
                        1. Baker / Store Details &amp; Phone Number
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        The store will be assigned to this phone number so the baker can claim it with her passcode.
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">
                      Currency: {formCurrency} ({currencySymbol.trim()})
                    </span>
                  </div>

                  <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-foreground">
                        Bakery / Store Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Riya's Cake Studio"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-foreground">
                        Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => {
                          const nextCat = e.target.value;
                          setCategory(nextCat);
                          const suggestedMode = suggestBuilderModeForCategory(nextCat);
                          setCustomBuilderMode(suggestedMode);
                          setCustomBuilderMinQty(
                            getCustomBuilderModeConfig(suggestedMode).defaultMinQty
                          );
                          const nextMeta = CATEGORY_CARDS.find((c) => c.label === nextCat);
                          if (nextMeta && coverImage.startsWith('/src/assets/images/')) {
                            setCoverImage(nextMeta.image);
                          }
                        }}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                      >
                        {ALL_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        Baker Phone / WhatsApp (Transfer Target) *
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="91"
                          aria-label="Country code"
                          className="w-16 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-2.5 py-2 text-center font-mono text-sm font-bold text-foreground focus:border-emerald-600 focus:outline-none"
                        />
                        <input
                          type="tel"
                          required
                          value={phoneLocal}
                          onChange={(e) => setPhoneLocal(e.target.value)}
                          placeholder="9876543210"
                          className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 font-mono text-sm font-semibold text-foreground focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-foreground">Country</label>
                      <select
                        value={country}
                        onChange={(e) =>
                          handleCountryChange(e.target.value as Exclude<LaunchCountry, 'All'>)
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                      >
                        {LAUNCH_COUNTRIES.filter((c) => c !== 'All').map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-foreground">
                        {COUNTRY_REGION_LABEL[country]}
                      </label>
                      <select
                        value={stateName}
                        onChange={(e) => handleStateChange(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                      >
                        {statesForCountry.map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-foreground">City</label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                      >
                        {(activeStateObj?.cities || [city]).map((ct) => (
                          <option key={ct} value={ct}>
                            {ct}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-foreground">
                        Locality / Area
                      </label>
                      <input
                        type="text"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        placeholder="e.g. Bandra West / Indiranagar"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-foreground">
                        Short Bio-Link Handle (/fmb/...)
                      </label>
                      <input
                        type="text"
                        value={bioHandle}
                        onChange={(e) =>
                          setBioHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                        }
                        placeholder="e.g. riyas-cakes"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-foreground">
                        GPS Pin (Near Me)
                      </label>
                      <button
                        type="button"
                        onClick={handleUseMyGps}
                        disabled={locating}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:border-brand disabled:opacity-60"
                      >
                        {locating ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Navigation className="size-3.5 text-brand" />
                        )}
                        {lat.toFixed(3)}, {lng.toFixed(3)} · Tap GPS
                      </button>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-foreground">
                        Google Maps Place Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={googleMapsUrl}
                        onChange={(e) => setGoogleMapsUrl(e.target.value)}
                        placeholder="https://maps.app.goo.gl/..."
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-foreground">
                        Google Review Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={googleReviewUrl}
                        onChange={(e) => setGoogleReviewUrl(e.target.value)}
                        placeholder="https://g.page/r/.../review"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Multi-State / Pan-India Coverage Selector */}
                  <div className="mt-4">
                    <StateCoveragePicker
                      country={country}
                      primaryState={stateName}
                      allStatesCoverage={allStatesCoverage}
                      serviceStates={serviceStates}
                      onChangeAllStates={setAllStatesCoverage}
                      onChangeServiceStates={setServiceStates}
                      compact
                    />
                  </div>

                  {/* Tagline, Description & Cover Image */}
                  <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-foreground">
                          Store Tagline
                        </label>
                        <input
                          type="text"
                          value={tagline}
                          onChange={(e) => setTagline(e.target.value)}
                          maxLength={180}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-foreground">
                          About the Baker
                        </label>
                        <textarea
                          rows={2}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          maxLength={1200}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={coverImage}
                          alt="Store cover preview"
                          className="h-16 w-24 rounded-lg object-cover ring-1 ring-border"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground">Storefront Cover Photo</p>
                          <p className="text-[11px] text-muted-foreground">
                            Upload baker&apos;s best cake photo or keep the default.
                          </p>
                          <label className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-bold hover:border-brand">
                            {uploadingCover ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Upload className="size-3" />
                            )}
                            Upload Cover
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => void handleCoverUpload(e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-2.5 text-xs">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold">
                          <input
                            type="checkbox"
                            checked={verified}
                            onChange={(e) => setVerified(e.target.checked)}
                            className="size-4 accent-brand"
                          />
                          <BadgeCheck className="size-3.5 text-sky-500" />
                          Verified Badge
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                          <input
                            type="checkbox"
                            checked={christmasSpecial}
                            onChange={(e) => setChristmasSpecial(e.target.checked)}
                            className="size-4 accent-emerald-600"
                          />
                          <Snowflake className="size-3.5" />
                          Feature in Christmas 2026
                        </label>
                        <select
                          value={planTier}
                          onChange={(e) => setPlanTier(e.target.value as PlanTier)}
                          className="ml-auto rounded-lg border border-border bg-background px-2 py-1 text-xs font-bold"
                        >
                          <option value="free">Free Plan</option>
                          <option value="pro">Pro Plan</option>
                          <option value="business">Business Plan</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {christmasSpecial && (
                    <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <label className="mb-1 block text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Christmas &amp; New Year Offer Banner
                      </label>
                      <input
                        type="text"
                        value={christmasOffer}
                        onChange={(e) => setChristmasOffer(e.target.value)}
                        maxLength={140}
                        placeholder="e.g. Rum Plum Cakes & Gingerbread Boxes · Pre-order by Dec 23"
                        className="w-full rounded-lg border border-emerald-500/30 bg-background px-3 py-1.5 text-xs text-foreground focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Custom Plate / Snack Box / Meal Box Builder Setup */}
                  {(FOOD_CATEGORIES as readonly string[]).includes(category) && (
                    <div className="mt-3 rounded-xl border border-brand-border bg-brand-soft/25 p-3">
                      <label className="flex cursor-pointer items-start gap-2.5 text-xs">
                        <input
                          type="checkbox"
                          checked={customBuilderEnabled}
                          onChange={(e) => setCustomBuilderEnabled(e.target.checked)}
                          className="mt-0.5 size-4 accent-[#ef6c22]"
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 font-extrabold text-brand">
                              <Package className="size-3.5" aria-hidden="true" />
                              Enable Custom Plate / Snack Box / Meal Box Builder
                            </span>
                            {isBuilderSuggestedCategory(category) && (
                              <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-brand-foreground">
                                Best for {category}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Customers can add individual items from Section 2 below to build their own custom Snack Box, Meal Box, or Catering Plate and order on WhatsApp.
                          </p>
                        </div>
                      </label>

                      {customBuilderEnabled && (
                        <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-brand-border/60 pt-3 sm:grid-cols-3">
                          <div>
                            <label className="block text-[11px] font-bold text-foreground">
                              Builder Mode
                            </label>
                            <select
                              value={customBuilderMode}
                              onChange={(e) => {
                                const nextMode = e.target.value as CustomBuilderMode;
                                setCustomBuilderMode(nextMode);
                                setCustomBuilderMinQty(
                                  getCustomBuilderModeConfig(nextMode).defaultMinQty
                                );
                              }}
                              className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground"
                            >
                              {CUSTOM_BUILDER_MODES.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-foreground">
                              Min {getCustomBuilderModeConfig(customBuilderMode).unitPlural}
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={5000}
                              value={customBuilderMinQty}
                              onChange={(e) =>
                                setCustomBuilderMinQty(
                                  Math.max(1, Math.min(5000, Number(e.target.value) || 1))
                                )
                              }
                              className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-foreground">
                              Box / Plate Fee ({currencySymbol.trim()}, optional)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={50000}
                              value={customBuilderPackagingLocal}
                              onChange={(e) =>
                                setCustomBuilderPackagingLocal(
                                  Math.max(0, Number(e.target.value) || 0)
                                )
                              }
                              placeholder="0"
                              className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 2: Products / Cakes Menu Builder */}
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">
                        2. Add Baker&apos;s Cakes &amp; Products ({products.length}/50)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Pre-fill their menu so their storefront looks complete the moment you send the link!
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => loadPresets('christmas')}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                      >
                        <Snowflake className="size-3" />
                        3 Christmas Presets
                      </button>
                      <button
                        type="button"
                        onClick={() => loadPresets('birthday')}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-brand-border bg-brand-soft px-2.5 py-1.5 text-[11px] font-bold text-brand hover:opacity-90"
                      >
                        <Sparkles className="size-3" />
                        3 Cake Presets
                      </button>
                      <button
                        type="button"
                        disabled={products.length >= 50}
                        onClick={() =>
                          setProducts((prev) => [...prev, makeEmptyProduct(categoryDefaultImg)])
                        }
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-bold text-background hover:opacity-90 disabled:opacity-50"
                      >
                        <Plus className="size-3" />
                        Add Product
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {products.map((prod, idx) => (
                      <div
                        key={prod.id}
                        className="rounded-xl border border-border bg-background p-3 shadow-2xs"
                      >
                        <div className="flex flex-wrap items-start gap-3">
                          {/* Product Thumbnail + Upload */}
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex aspect-[4/3] w-20 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border dark:bg-neutral-900">
                              <img
                                src={prod.image || categoryDefaultImg}
                                alt={prod.name || `Product ${idx + 1}`}
                                className="h-full w-full object-contain object-center"
                              />
                            </div>
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-bold hover:border-brand">
                              {uploadingProdId === prod.id ? (
                                <Loader2 className="size-2.5 animate-spin" />
                              ) : (
                                <Upload className="size-2.5" />
                              )}
                              Photo
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  void handleProductPhotoUpload(prod.id, e.target.files?.[0] || null)
                                }
                              />
                            </label>
                          </div>

                          {/* Product Fields */}
                          <div className="grid flex-1 gap-2 sm:grid-cols-4">
                            <div className="sm:col-span-2">
                              <input
                                type="text"
                                required
                                value={prod.name}
                                onChange={(e) =>
                                  setProducts((prev) =>
                                    prev.map((p) =>
                                      p.id === prod.id ? { ...p, name: e.target.value } : p
                                    )
                                  )
                                }
                                placeholder="Cake / Product Name *"
                                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
                              />
                            </div>

                            <div>
                              <div className="relative">
                                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">
                                  {currencySymbol.trim()}
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={prod.priceLocal}
                                  onChange={(e) =>
                                    setProducts((prev) =>
                                      prev.map((p) =>
                                        p.id === prod.id ? { ...p, priceLocal: e.target.value } : p
                                      )
                                    )
                                  }
                                  placeholder="Price"
                                  className="w-full rounded-lg border border-border bg-card py-1.5 pl-8 pr-2 text-xs font-bold text-foreground focus:border-brand focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={prod.serves}
                                onChange={(e) =>
                                  setProducts((prev) =>
                                    prev.map((p) =>
                                      p.id === prod.id ? { ...p, serves: e.target.value } : p
                                    )
                                  )
                                }
                                placeholder="1 kg · Serves 8"
                                className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none"
                              />
                              {products.length > 1 && (
                                <button
                                  type="button"
                                  aria-label="Remove product"
                                  onClick={() =>
                                    setProducts((prev) => prev.filter((p) => p.id !== prod.id))
                                  }
                                  className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="sm:col-span-3">
                              <input
                                type="text"
                                value={prod.description}
                                onChange={(e) =>
                                  setProducts((prev) =>
                                    prev.map((p) =>
                                      p.id === prod.id ? { ...p, description: e.target.value } : p
                                    )
                                  )
                                }
                                placeholder="Short description (flavors, eggless option, delivery info)..."
                                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none"
                              />
                            </div>

                            <div>
                              <input
                                type="text"
                                value={prod.tag}
                                onChange={(e) =>
                                  setProducts((prev) =>
                                    prev.map((p) =>
                                      p.id === prod.id ? { ...p, tag: e.target.value } : p
                                    )
                                  )
                                }
                                placeholder="Badge (e.g. Eggless)"
                                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none"
                              />
                            </div>

                            {/* Multi-Weight / Size Options (500g to 5 kg on same product) */}
                            <div className="space-y-1.5 rounded-lg border border-border/80 bg-muted/30 p-2 sm:col-span-4">
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <span className="text-[11px] font-bold text-foreground">
                                  Weight / Size Options (Same Product):
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const base = Number(prod.priceLocal) || 1000;
                                    const isHalfKg = /500\s*g|0\.5\s*kg/i.test(prod.serves);
                                    const base1Kg = isHalfKg ? base * 1.85 : base;
                                    const std = new Set(['w-500g', 'w-1kg', 'w-2kg', 'w-3kg', 'w-5kg']);
                                    const autoRows = CAKE_WEIGHT_PRESETS.filter((w) => std.has(w.id)).map((w) => ({
                                      id: w.id,
                                      label: w.label,
                                      priceLocal: String(Math.max(10, Math.round((base1Kg * w.kgRatio) / 10) * 10)),
                                      serves: w.serves,
                                    }));
                                    setProducts((prev) =>
                                      prev.map((p) => (p.id === prod.id ? { ...p, variants: autoRows } : p))
                                    );
                                  }}
                                  className="cursor-pointer rounded bg-brand/15 px-2 py-0.5 text-[10px] font-extrabold text-brand hover:bg-brand hover:text-brand-foreground"
                                >
                                  Auto-fill 500g – 5 kg
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-1">
                                {CAKE_WEIGHT_PRESETS.map((preset) => {
                                  const active = (prod.variants || []).some(
                                    (v) => v.id === preset.id || v.label.toLowerCase() === preset.label.toLowerCase()
                                  );
                                  return (
                                    <button
                                      key={preset.id}
                                      type="button"
                                      onClick={() => {
                                        const base = Number(prod.priceLocal) || 1000;
                                        const isHalfKg = /500\s*g|0\.5\s*kg/i.test(prod.serves);
                                        const base1Kg = isHalfKg ? base * 1.85 : base;
                                        setProducts((prev) =>
                                          prev.map((p) => {
                                            if (p.id !== prod.id) return p;
                                            const existing = p.variants || [];
                                            if (active) {
                                              return {
                                                ...p,
                                                variants: existing.filter(
                                                  (v) => v.id !== preset.id && v.label.toLowerCase() !== preset.label.toLowerCase()
                                                ),
                                              };
                                            }
                                            const orderMap = new Map(CAKE_WEIGHT_PRESETS.map((w, i) => [w.id, i]));
                                            const next = [
                                              ...existing,
                                              {
                                                id: preset.id,
                                                label: preset.label,
                                                priceLocal: String(Math.max(10, Math.round((base1Kg * preset.kgRatio) / 10) * 10)),
                                                serves: preset.serves,
                                              },
                                            ].sort((a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99));
                                            return { ...p, variants: next };
                                          })
                                        );
                                      }}
                                      className={`cursor-pointer rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors ${
                                        active
                                          ? 'border-brand bg-brand text-brand-foreground'
                                          : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                      }`}
                                    >
                                      {active ? '✓ ' : '+ '}
                                      {preset.label}
                                    </button>
                                  );
                                })}
                              </div>
                              {prod.variants && prod.variants.length > 0 && (
                                <div className="grid grid-cols-2 gap-1.5 pt-1 sm:grid-cols-3">
                                  {prod.variants.map((v) => (
                                    <div
                                      key={v.id}
                                      className="flex items-center gap-1 rounded border border-border bg-card px-1.5 py-1"
                                    >
                                      <span className="font-mono text-[10px] font-bold text-foreground">
                                        {v.label}
                                      </span>
                                      <input
                                        type="number"
                                        min="1"
                                        value={v.priceLocal}
                                        onChange={(e) =>
                                          setProducts((prev) =>
                                            prev.map((p) =>
                                              p.id === prod.id
                                                ? {
                                                    ...p,
                                                    variants: (p.variants || []).map((row) =>
                                                      row.id === v.id
                                                        ? { ...row, priceLocal: e.target.value }
                                                        : row
                                                    ),
                                                  }
                                                : p
                                            )
                                          )
                                        }
                                        className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground focus:border-brand focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        aria-label={`Remove ${v.label}`}
                                        onClick={() =>
                                          setProducts((prev) =>
                                            prev.map((p) =>
                                              p.id === prod.id
                                                ? {
                                                    ...p,
                                                    variants: (p.variants || []).filter((row) => row.id !== v.id),
                                                  }
                                                : p
                                            )
                                          )
                                        }
                                        className="cursor-pointer text-muted-foreground hover:text-rose-600"
                                      >
                                        <X className="size-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 sm:col-span-4">
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                Food Type:
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setProducts((prev) =>
                                    prev.map((p) =>
                                      p.id === prod.id
                                        ? { ...p, foodType: p.foodType === 'veg' ? '' : 'veg' }
                                        : p
                                    )
                                  )
                                }
                                className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold transition-colors ${
                                  prod.foodType === 'veg'
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-emerald-600/35 bg-card text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                                }`}
                              >
                                <FoodTypeIcon foodType="veg" size="xs" />
                                Veg
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setProducts((prev) =>
                                    prev.map((p) =>
                                      p.id === prod.id
                                        ? {
                                            ...p,
                                            foodType: p.foodType === 'non-veg' ? '' : 'non-veg',
                                          }
                                        : p
                                    )
                                  )
                                }
                                className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold transition-colors ${
                                  prod.foodType === 'non-veg'
                                    ? 'border-red-600 bg-red-600 text-white'
                                    : 'border-red-600/35 bg-card text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40'
                                }`}
                              >
                                <FoodTypeIcon foodType="non-veg" size="xs" />
                                Non-Veg
                              </button>
                            </div>

                            {customBuilderEnabled && (
                              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-soft/20 px-2.5 py-1.5 sm:col-span-4">
                                <select
                                  aria-label="Builder Section"
                                  value={prod.builderSection || ''}
                                  onChange={(e) =>
                                    setProducts((prev) =>
                                      prev.map((p) =>
                                        p.id === prod.id
                                          ? { ...p, builderSection: e.target.value }
                                          : p
                                      )
                                    )
                                  }
                                  className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground"
                                >
                                  <option value="">
                                    {getCustomBuilderModeConfig(customBuilderMode).label} Section
                                  </option>
                                  {getCustomBuilderModeConfig(customBuilderMode).sections.map(
                                    (sec) => (
                                      <option key={sec} value={sec}>
                                        {sec}
                                      </option>
                                    )
                                  )}
                                </select>
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  Presets:
                                </span>
                                {BUILDER_PRESET_OPTIONS.map((preset) => {
                                  const active = (prod.builderPresets || []).includes(preset.id);
                                  return (
                                    <button
                                      key={preset.id}
                                      type="button"
                                      onClick={() =>
                                        setProducts((prev) =>
                                          prev.map((p) => {
                                            if (p.id !== prod.id) return p;
                                            const curr = p.builderPresets || [];
                                            return {
                                              ...p,
                                              builderPresets: curr.includes(preset.id)
                                                ? curr.filter((x) => x !== preset.id)
                                                : [...curr, preset.id],
                                            };
                                          })
                                        )
                                      }
                                      className={`cursor-pointer rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors ${
                                        active
                                          ? 'border-brand bg-brand text-brand-foreground'
                                          : 'border-border bg-card text-muted-foreground hover:border-brand hover:text-foreground'
                                      }`}
                                    >
                                      {active
                                        ? `✓ ${preset.modeLabels[customBuilderMode]}`
                                        : preset.modeLabels[customBuilderMode]}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Secret Claim Passcode & Publish */}
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex-1">
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                        <KeyRound className="size-3.5" aria-hidden="true" />
                        3. Secret Transfer Key (Letters &amp; Numbers, Min 6 chars)
                      </label>
                      <p className="mb-2 text-xs text-amber-900/80 dark:text-amber-200/80">
                        Give this secret key to the vendor on WhatsApp. They enter their phone + this key to claim the store &amp; set their own password.
                      </p>
                      <div className="flex max-w-md gap-2">
                        <input
                          type="text"
                          required
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="characters"
                          spellCheck={false}
                          value={passcode}
                          onChange={(e) => setPasscode(e.target.value)}
                          placeholder="e.g. 7K4M9P"
                          className="flex-1 rounded-xl border border-amber-500/40 bg-background px-3.5 py-2.5 font-mono text-base font-black uppercase tracking-widest text-foreground focus:border-amber-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setPasscode(generateTransferPasscode())}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-500/40 bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-amber-500/10"
                        >
                          <RefreshCw className="size-3.5" />
                          New Code
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-extrabold text-brand-foreground shadow-lg transition-transform hover:scale-[1.01] hover:bg-brand-hover disabled:opacity-60"
                    >
                      {submitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Create Store &amp; Generate Handover
                    </button>
                  </div>
                </div>
              </form>
            )
          )}

          {/* TAB 2: PENDING & CLAIMED TRANSFERS */}
          {activeTab === 'transfers' && (
            <div className="space-y-3">
              {enrichedTransfers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <KeyRound className="mx-auto size-8 text-muted-foreground" />
                  <h3 className="mt-3 text-base font-bold text-foreground">
                    No store transfers yet
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use &quot;Create &amp; Transfer Store&quot; to build a baker&apos;s storefront and generate a WhatsApp claim passcode.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-brand-foreground"
                  >
                    <Plus className="size-3.5" />
                    Create First Baker Store
                  </button>
                </div>
              ) : (
                enrichedTransfers.map((t) => {
                  const vendor = t.liveVendor;
                  const bioHandle = vendor ? getVendorBioHandle(vendor) : t.vendorSlug;
                  const waMessage = buildHandoverWhatsAppMessage(
                    t.vendorName,
                    t.vendorSlug,
                    bioHandle,
                    t.targetPhone,
                    t.passcode
                  );
                  const waUrl = `https://wa.me/${normalizePhoneDigits(t.targetPhone)}?text=${encodeURIComponent(waMessage)}`;
                  const claimUrl = `${origin}/claim/${t.vendorSlug}`;
                  const isBusy = busyVendorId === t.vendorId;
                  const lockInfo = getPasscodeLockInfo(t);

                  return (
                    <div
                      key={t.vendorId}
                      className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-brand/40"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-extrabold text-foreground">
                              {t.vendorName}
                            </h4>
                            {t.liveStatus === 'claimed' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                <Check className="size-3" />
                                Claimed &amp; Owned by Baker
                              </span>
                            ) : t.liveStatus === 'revoked' ? (
                              <span className="rounded-full bg-neutral-500/15 px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                                Revoked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                                <KeyRound className="size-3" />
                                Awaiting Baker Claim
                              </span>
                            )}
                            {t.liveStatus === 'pending' && lockInfo.locked && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                <Lock className="size-2.5" />
                                Same code locked until {lockInfo.unlockDateLabel} ({lockInfo.daysLeft}d)
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              Phone:{' '}
                              <strong className="font-mono text-foreground">
                                +{t.targetPhone}
                              </strong>
                            </span>
                            <span>
                              Secret Key:{' '}
                              <strong className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-amber-900 dark:text-amber-200">
                                {formatDisplayPasscode(t.passcode)}
                              </strong>
                            </span>
                            {vendor && (
                              <span>
                                Products: <strong className="text-foreground">{vendor.products.length}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {t.liveStatus === 'pending' && (
                            <>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1ebe5d]"
                              >
                                <MessageCircle className="size-3.5" />
                                Send WhatsApp
                              </a>
                              <button
                                type="button"
                                onClick={() => copyText(claimUrl, `link-${t.vendorId}`, 'Claim link')}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold hover:border-brand"
                              >
                                <Copy className="size-3" />
                                Claim Link
                              </button>
                              <button
                                type="button"
                                disabled={isBusy || lockInfo.locked}
                                onClick={() => void handleRegeneratePasscode(t)}
                                title={
                                  lockInfo.locked
                                    ? `Passcode stays unchanged for 30 days (unlocks ${lockInfo.unlockDateLabel})`
                                    : 'Generate a new passcode'
                                }
                                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold hover:border-brand disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                {lockInfo.locked ? (
                                  <>
                                    <Lock className="size-3 text-muted-foreground" />
                                    Locked ({lockInfo.daysLeft}d)
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className={`size-3 ${isBusy ? 'animate-spin' : ''}`} />
                                    New Code
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleRevoke(t)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 disabled:opacity-50"
                              >
                                Revoke
                              </button>
                            </>
                          )}
                          {vendor && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onEditVendor(vendor);
                              }}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold hover:border-brand"
                            >
                              <Edit3 className="size-3" />
                              Edit Products
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 5: SEO & GOOGLE RANKING MANAGER */}
          {activeTab === 'seo' && (
            <AdminSeoManagerTab
              adminUser={adminUser}
              siteSettings={siteSettings}
              allCloudVendors={cloudVendors}
              allCatalogVendors={allCatalogVendors}
              onNavigateSeoPath={(path) => {
                onClose();
                onNavigateSeoPath(path);
              }}
              onToast={onToast}
            />
          )}

          {/* TAB 6: REVIEWS, BOOKINGS & EVENT LEADS MODERATION */}
          {activeTab === 'moderation' && (
            <AdminModerationTab
              reviews={reviews}
              bookings={bookings}
              eventRequests={eventRequests}
              allCatalogVendors={allCatalogVendors}
              currency={currency}
              onToast={onToast}
            />
          )}

          {/* TAB 2B: HYDERABAD CHRISTMAS LUNCH & DINNER MENU MANAGER */}
          {activeTab === 'christmas-menu' && (
            <AdminChristmasMenuTab
              adminUser={adminUser}
              cloudChristmasDishes={cloudChristmasDishes}
              onToast={onToast}
            />
          )}

          {/* TAB 2C: SELF-OWNED BOX & BITE CORPORATE GIFTING CATALOG */}
          {activeTab === 'box-and-bite' && (
            <AdminBoxBiteTab
              cloudProducts={cloudBoxBiteProducts}
              cloudBuilderItems={cloudBoxBiteBuilderItems}
              onPreviewStorefront={onPreviewBoxAndBite}
              onToast={onToast}
            />
          )}

          {/* TAB 7: CAMPAIGNS & GLOBAL SITE CONTROLS */}
          {activeTab === 'campaigns' && (
            <AdminCampaignsTab
              adminUser={adminUser}
              siteSettings={siteSettings}
              onToast={onToast}
            />
          )}
        </div>
      </div>
    </div>
  );
}
