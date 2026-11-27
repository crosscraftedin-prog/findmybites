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
  PartyPopper,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Snowflake,
  Upload,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  AdminTransferRecord,
  BookingEnquiry,
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
  PARTY_CATEGORIES,
  PASSCODE_LOCK_DAYS,
  PlanTier,
  STARTING_PRICE_UNIT_OPTIONS,
  STATES_BY_COUNTRY,
  SiteSettings,
  StoreClaim,
  Vendor,
  formatDisplayPasscode,
  generateTransferPasscode,
  getCustomBuilderModeConfig,
  getVendorBioHandle,
  isBuilderSuggestedCategory,
  localToUsd,
  normalizePasscode,
  normalizePhoneDigits,
  suggestBuilderModeForCategory,
  suggestStartingPriceUnitForCategory,
} from '../data/vendors';
import {
  AdminReviewRecord,
  adminCreateStoreWithTransfer,
  adminIssueTransferForExistingStore,
  adminRevokeTransfer,
} from '../services/firestoreService';
import { compressImageFile } from '../utils/imageUpload';
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

const COUNTRY_PHONE_CODES: Record<Exclude<LaunchCountry, 'All'>, string> = {
  India: '91',
  'Dubai / UAE': '971',
  'Sri Lanka': '94',
  Pakistan: '92',
  Bangladesh: '880',
  Nepal: '977',
};

const FOOD_DEFAULT_TAGLINE = 'Handcrafted custom cakes, plum cakes & party desserts';
const FOOD_DEFAULT_DESCRIPTION =
  'Freshly baked to order with premium ingredients. Message us on WhatsApp for custom birthday cakes, wedding tiers, and festive hampers.';
const PARTY_DEFAULT_TAGLINE =
  'Complete event planning, custom decor & seamless celebration management';
const PARTY_DEFAULT_DESCRIPTION =
  'End-to-end event setup, theme styling, and on-site coordination for weddings, birthdays, corporate events & private celebrations. Message us on WhatsApp for custom packages.';

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
  const [marketplace, setMarketplace] = useState<'food' | 'party'>('food');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(FOOD_CATEGORIES[0]);
  const [extraCategories, setExtraCategories] = useState<string[]>([]);
  const [country, setCountry] = useState<Exclude<LaunchCountry, 'All'>>('India');
  const [stateName, setStateName] = useState('Maharashtra');
  const [city, setCity] = useState('Mumbai');
  const [customCityMode, setCustomCityMode] = useState(false);
  const [extraCities, setExtraCities] = useState('');
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
  const [tagline, setTagline] = useState(FOOD_DEFAULT_TAGLINE);
  const [description, setDescription] = useState(FOOD_DEFAULT_DESCRIPTION);
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
  const [startingPriceLocal, setStartingPriceLocal] = useState('');
  const [startingPriceUnit, setStartingPriceUnit] = useState('per kg');
  const [startingPriceLabel, setStartingPriceLabel] = useState('');
  const [secondaryPriceLocal, setSecondaryPriceLocal] = useState('');
  const [secondaryPriceUnit, setSecondaryPriceUnit] = useState('per plate');
  const [secondaryPriceLabel, setSecondaryPriceLabel] = useState('');
  const [showSecondaryPrice, setShowSecondaryPrice] = useState(false);
  const [coverImage, setCoverImage] = useState(IMG_CAKE);
  const [passcode, setPasscode] = useState(() => generateTransferPasscode());

  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
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

  const isParty = marketplace === 'party';
  const availableCategories = isParty ? PARTY_CATEGORIES : FOOD_CATEGORIES;

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
    setCustomCityMode(false);
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
    setCustomCityMode(false);
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

  const handleMarketplaceChange = (nextMarket: 'food' | 'party') => {
    if (nextMarket === marketplace) return;
    setMarketplace(nextMarket);
    const nextIsParty = nextMarket === 'party';
    const nextCat = nextIsParty ? PARTY_CATEGORIES[0] : FOOD_CATEGORIES[0];
    setCategory(nextCat);
    setExtraCategories([]);
    const nextUnit = suggestStartingPriceUnitForCategory(nextCat, nextMarket);
    setStartingPriceUnit(nextUnit);
    setSecondaryPriceUnit(nextUnit);
    const nextMeta = CATEGORY_CARDS.find((c) => c.label === nextCat);
    const nextImg = nextMeta?.image || IMG_CAKE;

    if (!coverImage || !coverImage.startsWith('data:image/')) {
      setCoverImage(nextImg);
    }

    if (nextIsParty) {
      if (!tagline.trim() || tagline.trim() === FOOD_DEFAULT_TAGLINE) {
        setTagline(PARTY_DEFAULT_TAGLINE);
      }
      if (!description.trim() || description.trim() === FOOD_DEFAULT_DESCRIPTION) {
        setDescription(PARTY_DEFAULT_DESCRIPTION);
      }
      setChristmasSpecial(false);
      setCustomBuilderEnabled(false);
    } else {
      if (!tagline.trim() || tagline.trim() === PARTY_DEFAULT_TAGLINE) {
        setTagline(FOOD_DEFAULT_TAGLINE);
      }
      if (!description.trim() || description.trim() === PARTY_DEFAULT_DESCRIPTION) {
        setDescription(FOOD_DEFAULT_DESCRIPTION);
      }
      setChristmasSpecial(true);
    }
  };

  const copyText = (text: string, key: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedKey(key);
    onToast(`${label} copied!`);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2200);
  };

  const resetBuilder = () => {
    setName('');
    setExtraCategories([]);
    setArea('');
    setCustomCityMode(false);
    setExtraCities('');
    setAllStatesCoverage(false);
    setServiceStates([]);
    setCustomBuilderEnabled(false);
    setCustomBuilderPackagingLocal(0);
    setPhoneLocal('');
    setBioHandle('');
    setGoogleMapsUrl('');
    setGoogleReviewUrl('');
    setTagline(isParty ? PARTY_DEFAULT_TAGLINE : FOOD_DEFAULT_TAGLINE);
    setDescription(isParty ? PARTY_DEFAULT_DESCRIPTION : FOOD_DEFAULT_DESCRIPTION);
    setChristmasSpecial(!isParty);
    setStartingPriceLocal('');
    const defaultUnit = suggestStartingPriceUnitForCategory(category, marketplace);
    setStartingPriceUnit(defaultUnit);
    setStartingPriceLabel('');
    setSecondaryPriceLocal('');
    setSecondaryPriceUnit(defaultUnit);
    setSecondaryPriceLabel('');
    setShowSecondaryPrice(false);
    setCoverImage(categoryDefaultImg);
    setPasscode(generateTransferPasscode());
    setCreatedHandover(null);
    setError(null);
  };

  const handleCreateAndGenerateTransfer = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Please enter the business / vendor name.');
      return;
    }

    const fullPhone = normalizePhoneDigits(
      phoneLocal.startsWith(phoneCode) && phoneLocal.replace(/\D/g, '').length >= 11
        ? phoneLocal
        : `${phoneCode}${phoneLocal}`
    );
    if (fullPhone.length < 8) {
      setError('Please enter the business owner’s full mobile / WhatsApp number.');
      return;
    }

    const cleanPass = normalizePasscode(passcode);
    if (cleanPass.length < 6) {
      setError('Secret key must be at least 6 letters/numbers (e.g., 7K4M9P).');
      return;
    }

    const isFood = !isParty;
    const parsedStartingLocal = Number(startingPriceLocal);
    const hasCustomStartingPrice = Number.isFinite(parsedStartingLocal) && parsedStartingLocal > 0;
    const resolvedStartingPriceUsd = hasCustomStartingPrice
      ? Math.max(0.5, localToUsd(parsedStartingLocal, formCurrency))
      : 0;
    const parsedSecondaryLocal = Number(secondaryPriceLocal);
    const secondaryStartingPriceUsd =
      showSecondaryPrice && Number.isFinite(parsedSecondaryLocal) && parsedSecondaryLocal > 0
        ? Math.max(0.5, localToUsd(parsedSecondaryLocal, formCurrency))
        : undefined;
    const slugBase = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const slug = `${slugBase || (isParty ? 'events' : 'bakery')}-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}`;

    const draftVendor: Vendor = {
      id: `${slug}-${Date.now().toString().slice(-4)}`,
      slug,
      name: trimmedName,
      marketplace: isParty ? 'party' : 'food',
      category,
      ...(extraCategories.filter((c) => c && c !== category).length > 0
        ? { extraCategories: extraCategories.filter((c) => c && c !== category) }
        : {}),
      country,
      state: stateName,
      city,
      area: area.trim() || city,
      lat,
      lng,
      whatsappNumber: fullPhone,
      planTier,
      monthlyAutoPay: planTier !== 'free',
      priceTier:
        resolvedStartingPriceUsd <= 0
          ? '$$'
          : resolvedStartingPriceUsd < 25
            ? '$'
            : resolvedStartingPriceUsd < 75
              ? '$$'
              : '$$$',
      startingPriceUsd: resolvedStartingPriceUsd,
      orderingConfig: {
        enabled: true,
        acceptingOrders: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        codEnabled: true,
        startingPriceUnit:
          startingPriceUnit.trim() || suggestStartingPriceUnitForCategory(category, marketplace),
        ...(startingPriceLabel.trim()
          ? { startingPriceLabel: startingPriceLabel.trim().slice(0, 40) }
          : {}),
        ...(hasCustomStartingPrice ? { customStartingPrice: true } : {}),
        ...(secondaryStartingPriceUsd
          ? {
              secondaryStartingPriceUsd,
              secondaryStartingPriceUnit:
                secondaryPriceUnit.trim() ||
                startingPriceUnit.trim() ||
                suggestStartingPriceUnitForCategory(category, marketplace),
              ...(secondaryPriceLabel.trim()
                ? { secondaryStartingPriceLabel: secondaryPriceLabel.trim().slice(0, 40) }
                : {}),
            }
          : {}),
      },
      rating: 5.0,
      reviewCount: 0,
      responseTime: 'Replies within 15 mins on WhatsApp',
      verified,
      tagline:
        tagline.trim() ||
        (isParty ? `Premier ${category} in ${city}` : `Artisan ${category} in ${city}`),
      description:
        description.trim() ||
        (isParty
          ? `Professional ${category} serving ${area.trim() || city}, ${city}.`
          : `Handcrafted ${category} serving ${area.trim() || city}, ${city}.`),
      christmasSpecial: isFood && christmasSpecial,
      christmasOffer: isFood && christmasSpecial ? christmasOffer.trim() : undefined,
      customBuilderEnabled: isFood && planTier !== 'free' && customBuilderEnabled,
      customBuilderMode:
        isFood && planTier !== 'free' && customBuilderEnabled ? customBuilderMode : undefined,
      customBuilderMinQty:
        isFood && planTier !== 'free' && customBuilderEnabled
          ? Math.max(1, Math.min(5000, Math.round(customBuilderMinQty || 10)))
          : undefined,
      customBuilderPackagingUsd:
        isFood && planTier !== 'free' && customBuilderEnabled && customBuilderPackagingLocal > 0
          ? Math.max(0, Math.min(500, localToUsd(customBuilderPackagingLocal, formCurrency)))
          : undefined,
      bioHandle: bioHandle.trim() || slugBase,
      bioTheme: isParty ? 'party' : 'saffron',
      ...(googleMapsUrl.trim() ? { googleMapsUrl: googleMapsUrl.trim() } : {}),
      ...(googleReviewUrl.trim() ? { googleReviewUrl: googleReviewUrl.trim() } : {}),
      serviceAreas: [
        area.trim() || city.trim(),
        city.trim(),
        ...extraCities
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ].filter((v, i, arr) => v && arr.indexOf(v) === i),
      allStatesCoverage,
      serviceStates: allStatesCoverage
        ? []
        : serviceStates.filter((s) => s && s !== stateName),
      specialties: [category, ...extraCategories.filter((c) => c && c !== category)],
      image: coverImage || categoryDefaultImg,
      products: [],
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
                          {isParty ? 'Build Next Event Store' : 'Build Next Food Store'}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* FAST STOREFRONT BUILDER FORM (FindMyBites OR PimpMyParty) */
              <form onSubmit={(e) => void handleCreateAndGenerateTransfer(e)} className="space-y-6">
                {/* Marketplace Selector: FindMyBites vs PimpMyParty */}
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Choose Platform / Listing Type *
                  </p>
                  <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleMarketplaceChange('food')}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                        !isParty
                          ? 'border-[#ef6c22] bg-[#ef6c22]/10 shadow-xs'
                          : 'border-border bg-background hover:border-foreground/30'
                      }`}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ef6c22] text-white">
                        <UtensilsCrossed className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-foreground">FindMyBites</p>
                        <p className="text-[11px] text-muted-foreground">
                          Home Bakers, Cakes, Catering, Live Counters &amp; Food
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMarketplaceChange('party')}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                        isParty
                          ? 'border-[#db2777] bg-[#db2777]/10 shadow-xs'
                          : 'border-border bg-background hover:border-foreground/30'
                      }`}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#db2777] text-white">
                        <PartyPopper className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-foreground">PimpMyParty</p>
                        <p className="text-[11px] text-muted-foreground">
                          Event Planners, Decor, DJs, Venues, Photography &amp; Rentals
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Section 1: Vendor Details & Transfer Phone */}
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">
                        {isParty
                          ? '1. Event / Party Vendor Details & Phone Number'
                          : '1. Baker / Food Store Details & Phone Number'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        The store will be assigned to this phone number so the{' '}
                        {isParty ? 'event vendor' : 'baker / vendor'} can claim it with their passcode.
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">
                      Currency: {formCurrency} ({currencySymbol.trim()})
                    </span>
                  </div>

                  <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-foreground">
                        {isParty ? 'Event / Business Name *' : 'Bakery / Store Name *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={isParty ? 'e.g. Thanusri Event Management' : "e.g. Riya's Cake Studio"}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-foreground">
                        {isParty ? 'Primary Event Category *' : 'Primary Food Category *'}
                      </label>
                      <select
                        value={category}
                        onChange={(e) => {
                          const nextCat = e.target.value;
                          setCategory(nextCat);
                          setExtraCategories((prev) => prev.filter((c) => c !== nextCat));
                          const suggestedUnit = suggestStartingPriceUnitForCategory(
                            nextCat,
                            marketplace
                          );
                          setStartingPriceUnit(suggestedUnit);
                          setSecondaryPriceUnit(suggestedUnit);
                          if (!isParty) {
                            const suggestedMode = suggestBuilderModeForCategory(nextCat);
                            setCustomBuilderMode(suggestedMode);
                            setCustomBuilderMinQty(
                              getCustomBuilderModeConfig(suggestedMode).defaultMinQty
                            );
                          }
                          const nextMeta = CATEGORY_CARDS.find((c) => c.label === nextCat);
                          if (nextMeta && (!coverImage || !coverImage.startsWith('data:image/'))) {
                            setCoverImage(nextMeta.image);
                          }
                        }}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                      >
                        {availableCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2 rounded-xl border border-border bg-muted/25 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <label className="block text-xs font-bold text-foreground">
                          Also List Store Under (Optional — Multi-Select Categories)
                        </label>
                        <span className="text-[11px] font-semibold text-brand">
                          {extraCategories.length + 1}{' '}
                          {extraCategories.length === 0 ? 'category' : 'categories'} selected
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Pick any additional {isParty ? 'event' : 'food'} categories so this single storefront appears in every selected category.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {availableCategories
                          .filter((c) => c !== category)
                          .map((c) => {
                            const selected = extraCategories.includes(c);
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() =>
                                  setExtraCategories((prev) =>
                                    prev.includes(c)
                                      ? prev.filter((item) => item !== c)
                                      : [...prev, c]
                                  )
                                }
                                className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                  selected
                                    ? 'border-brand bg-brand text-brand-foreground shadow-xs'
                                    : 'border-border bg-background text-foreground hover:border-brand/60 hover:bg-brand-soft/40'
                                }`}
                              >
                                {selected && <Check className="size-3 shrink-0" aria-hidden="true" />}
                                {c}
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {isParty
                          ? 'Vendor Phone / WhatsApp (Transfer Target) *'
                          : 'Baker Phone / WhatsApp (Transfer Target) *'}
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
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <label className="block text-xs font-bold text-foreground">City</label>
                        <button
                          type="button"
                          onClick={() => {
                            if (customCityMode) {
                              setCustomCityMode(false);
                              if (activeStateObj?.cities[0] && !activeStateObj.cities.includes(city)) {
                                setCity(activeStateObj.cities[0]);
                              }
                            } else {
                              setCustomCityMode(true);
                              setCity('');
                            }
                          }}
                          className="cursor-pointer text-[11px] font-bold text-brand hover:underline"
                        >
                          {customCityMode ? 'Pick from list' : '+ Custom City'}
                        </button>
                      </div>
                      {customCityMode ||
                      (activeStateObj && !activeStateObj.cities.includes(city) && city.trim() !== '') ? (
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Type new city name (e.g. Khammam, Secunderabad)"
                          className="w-full rounded-xl border border-brand/60 bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                        />
                      ) : (
                        <select
                          value={city}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setCustomCityMode(true);
                              setCity('');
                            } else {
                              setCity(e.target.value);
                            }
                          }}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                        >
                          {(activeStateObj?.cities || [city]).map((ct) => (
                            <option key={ct} value={ct}>
                              {ct}
                            </option>
                          ))}
                          <option value="__custom__">+ Create / Type Custom City…</option>
                        </select>
                      )}
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

                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-bold text-foreground">
                        Additional Delivery Cities / Towns (Optional)
                      </label>
                      <input
                        type="text"
                        value={extraCities}
                        onChange={(e) => setExtraCities(e.target.value)}
                        placeholder="Add extra city names (comma separated, e.g. Secunderabad, Vijayawada, Guntur)"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                      />
                    </div>

                    {/* Starting Price Card Display Settings */}
                    <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-brand-border/70 bg-brand-soft/30 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-extrabold text-foreground">
                            Storefront Starting Price Box (Shown at Top Right)
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Leave blank to auto-use the lowest package/item price, or enter an exact starting price (e.g. {currencySymbol.trim()}200 per plate · Veg Price).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSecondaryPrice((prev) => !prev)}
                          className="cursor-pointer rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-foreground hover:border-brand hover:text-brand"
                        >
                          {showSecondaryPrice ? 'Hide 2nd Price Row' : '+ Add 2nd Price Row'}
                        </button>
                      </div>

                      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-foreground">
                            Starting Price ({currencySymbol.trim()})
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={startingPriceLocal}
                            onChange={(e) => setStartingPriceLocal(e.target.value)}
                            placeholder={isParty ? 'e.g. 15000' : 'e.g. 200'}
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-foreground">
                            Price Unit
                          </label>
                          <select
                            value={startingPriceUnit}
                            onChange={(e) => setStartingPriceUnit(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                          >
                            {STARTING_PRICE_UNIT_OPTIONS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-foreground">
                            Right-Side Label (Optional)
                          </label>
                          <input
                            type="text"
                            maxLength={40}
                            value={startingPriceLabel}
                            onChange={(e) => setStartingPriceLabel(e.target.value)}
                            placeholder={isParty ? 'e.g. Starting Package' : 'e.g. Veg Price'}
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                          />
                        </div>
                      </div>

                      {showSecondaryPrice && (
                        <div className="mt-2.5 grid gap-2.5 border-t border-border/60 pt-2.5 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-foreground">
                              2nd Price ({currencySymbol.trim()})
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={secondaryPriceLocal}
                              onChange={(e) => setSecondaryPriceLocal(e.target.value)}
                              placeholder={isParty ? 'e.g. 50000' : 'e.g. 350'}
                              className="w-full rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-foreground">
                              2nd Unit
                            </label>
                            <select
                              value={secondaryPriceUnit}
                              onChange={(e) => setSecondaryPriceUnit(e.target.value)}
                              className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                            >
                              {STARTING_PRICE_UNIT_OPTIONS.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-foreground">
                              2nd Label
                            </label>
                            <input
                              type="text"
                              maxLength={40}
                              value={secondaryPriceLabel}
                              onChange={(e) => setSecondaryPriceLabel(e.target.value)}
                              placeholder={isParty ? 'e.g. Wedding Package' : 'e.g. Non-Veg Price'}
                              className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
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
                        placeholder={isParty ? 'e.g. thanusri-events' : 'e.g. riyas-cakes'}
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
                          {isParty ? 'About the Event Business' : 'About the Baker / Store'}
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
                            {isParty
                              ? 'Upload event setup or portfolio cover photo or keep the default.'
                              : "Upload baker's best cake photo or keep the default."}
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
                        {!isParty && (
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
                        )}
                        <select
                          value={planTier === 'pro' ? 'business' : planTier}
                          onChange={(e) => {
                            const nextPlan = e.target.value as PlanTier;
                            setPlanTier(nextPlan);
                            if (nextPlan === 'free') setCustomBuilderEnabled(false);
                          }}
                          className="ml-auto rounded-lg border border-border bg-background px-2 py-1 text-xs font-bold"
                        >
                          <option value="free">Free Plan (₹0)</option>
                          <option value="business">Business Plan (₹499/mo · Direct Ordering)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {!isParty && christmasSpecial && (
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

                  {/* Custom Plate / Snack Box / Meal Box Builder Setup (Business Plan Only, Food Only) */}
                  {!isParty && (FOOD_CATEGORIES as readonly string[]).includes(category) && (
                    <div className="mt-3 rounded-xl border border-brand-border bg-brand-soft/25 p-3">
                      {planTier === 'free' ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <p className="inline-flex items-center gap-1.5 font-extrabold text-foreground">
                              <Package className="size-3.5 text-brand" aria-hidden="true" />
                              Custom Menu Builder · Business Plan Only
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Free stores list ready-made packages &amp; menu items once claimed. Switch plan above to Business to unlock the interactive builder.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPlanTier('business');
                              setCustomBuilderEnabled(true);
                            }}
                            className="cursor-pointer rounded-lg bg-brand px-2.5 py-1 text-[11px] font-bold text-brand-foreground hover:bg-brand-hover"
                          >
                            Switch to Business
                          </button>
                        </div>
                      ) : (
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
                              Once claimed, the business owner can add individual menu items in Edit Storefront so customers can build their own custom Snack Box, Meal Box, or Catering Plate.
                            </p>
                          </div>
                        </label>
                      )}

                      {planTier !== 'free' && customBuilderEnabled && (
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

                {/* Section 2: Secret Claim Passcode & Publish */}
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex-1">
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                        <KeyRound className="size-3.5" aria-hidden="true" />
                        2. Secret Transfer Key (Letters &amp; Numbers, Min 6 chars)
                      </label>
                      <p className="mb-2 text-xs text-amber-900/80 dark:text-amber-200/80">
                        Give this secret key to the vendor on WhatsApp. Once they claim the storefront with their phone + key, they can add their own {isParty ? 'event packages, photos & prices' : 'products, menu items & prices'} directly from Edit Storefront.
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
