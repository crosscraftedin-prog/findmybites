import { FormEvent, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BadgeCheck,
  Cake,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  KeyRound,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Store,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ALL_CATEGORIES,
  AdminTransferRecord,
  CATEGORY_CARDS,
  COUNTRY_DEFAULT_CURRENCY,
  COUNTRY_REGION_LABEL,
  CURRENCIES,
  CurrencyCode,
  FOOD_CATEGORIES,
  LAUNCH_COUNTRIES,
  LaunchCountry,
  PlanTier,
  STATES_BY_COUNTRY,
  StoreClaim,
  Vendor,
  VendorProduct,
  formatMoney,
  generateTransferPasscode,
  getVendorBioHandle,
  localToUsd,
  normalizePasscode,
  normalizePhoneDigits,
} from '../data/vendors';
import {
  adminCreateStoreWithTransfer,
  adminIssueTransferForExistingStore,
  adminRevokeTransfer,
  updateVendorInCloud,
} from '../services/firestoreService';
import { compressImageFile } from '../utils/imageUpload';

interface AdminPanelModalProps {
  open: boolean;
  onClose: () => void;
  adminUser: User;
  cloudVendors: Vendor[];
  transfers: AdminTransferRecord[];
  claims: StoreClaim[];
  currency: CurrencyCode;
  onEditVendor: (vendor: Vendor) => void;
  onPreviewVendor: (vendor: Vendor) => void;
  onToast: (message: string) => void;
}

type AdminTab = 'create' | 'transfers' | 'stores';

interface DraftProductRow {
  id: string;
  name: string;
  priceLocal: string;
  serves: string;
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
    tag: 'Bestseller',
    description: 'Rich dark Belgian chocolate ganache layered over moist sponge, customizable with name topper.',
  },
  {
    name: 'Custom Theme Birthday Cake',
    priceLocal: '2200',
    serves: '1.5 kg · Serves 14–16',
    tag: 'Eggless Available',
    description: 'Hand-piped buttercream or fondant birthday cake crafted to your party colors and flavor choice.',
  },
  {
    name: 'Assorted Gourmet Cupcake Box (12 pcs)',
    priceLocal: '950',
    serves: 'Box of 12',
    tag: 'Party Favorite',
    description: 'Red velvet, lotus biscoff, Nutella hazelnut & vanilla berry swirl cupcakes freshly baked to order.',
  },
];

const CHRISTMAS_CAKE_PRESETS: Array<Omit<DraftProductRow, 'id' | 'image'>> = [
  {
    name: 'Rich Spiced Christmas Plum Cake',
    priceLocal: '1250',
    serves: '1 kg · Gift Tin',
    tag: 'Christmas Special',
    description: 'Traditional slow-matured dry fruit & warm spice plum cake (rum-soaked & alcohol-free options).',
  },
  {
    name: 'Chocolate Hazelnut Yule Log (Bûche de Noël)',
    priceLocal: '1850',
    serves: '1.2 kg · Serves 10',
    tag: 'Limited Edition',
    description: 'Rolled cocoa sponge filled with praline cream and textured dark chocolate bark.',
  },
  {
    name: 'Festive Christmas Hamper Box',
    priceLocal: '1600',
    serves: 'Gift Box · 6 Treats',
    tag: 'Corporate & Gifting',
    description: 'Mini plum cake, gingerbread cookies, fudge brownies, spiced nuts & festive ribbon packaging.',
  },
];

function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location.hostname.includes('findmybites.com')) {
    return 'https://www.findmybites.com';
  }
  return typeof window !== 'undefined' ? window.location.origin : 'https://www.findmybites.com';
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
  return [
    `Hi ${vendorName}!`,
    ``,
    `Great news — we have already built your FREE online storefront & menu on FindMyBites so local customers can discover your cakes and order directly on WhatsApp!`,
    ``,
    `Your Live Storefront: ${storeUrl}`,
    `Your Short Bio-Link (for Instagram): ${bioUrl}`,
    ``,
    `Claim full ownership & create your password here (takes 30 seconds):`,
    `${claimUrl}`,
    ``,
    `Phone Number: +${targetPhone}`,
    `Secret Passcode: ${passcode}`,
    ``,
    `Once you claim it, you can edit prices, add photos, update your Christmas menu, and receive direct customer orders with 0% commission!`,
  ].join('\n');
}

function makeEmptyProduct(defaultImg: string): DraftProductRow {
  return {
    id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    priceLocal: '',
    serves: '1 kg · Serves 8',
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
  transfers,
  claims,
  currency,
  onEditVendor,
  onPreviewVendor,
  onToast,
}: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('create');

  // --- Create & Transfer Store Form State ---
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Bakers & Cakes');
  const [country, setCountry] = useState<Exclude<LaunchCountry, 'All'>>('India');
  const [stateName, setStateName] = useState('Maharashtra');
  const [city, setCity] = useState('Mumbai');
  const [area, setArea] = useState('');
  const [lat, setLat] = useState(19.076);
  const [lng, setLng] = useState(72.8777);
  const [phoneCode, setPhoneCode] = useState('91');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [bioHandle, setBioHandle] = useState('');
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
  const [coverImage, setCoverImage] = useState('/src/assets/images/cat-bakers.png');
  const [passcode, setPasscode] = useState(() => generateTransferPasscode('CAKE'));
  const [products, setProducts] = useState<DraftProductRow[]>([
    {
      ...BIRTHDAY_CAKE_PRESETS[0],
      id: 'preset-1',
      image: '/src/assets/images/cat-bakers.png',
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

  // --- Transfers / Existing Store Handover State ---
  const [storeSearch, setStoreSearch] = useState('');
  const [transferTargetVendor, setTransferTargetVendor] = useState<Vendor | null>(null);
  const [existingPhone, setExistingPhone] = useState('');
  const [existingPasscode, setExistingPasscode] = useState('');
  const [busyVendorId, setBusyVendorId] = useState<string | null>(null);

  const formCurrency: CurrencyCode = COUNTRY_DEFAULT_CURRENCY[country] || currency;
  const currencySymbol = CURRENCIES[formCurrency].symbol;

  const statesForCountry = STATES_BY_COUNTRY[country] || [];
  const activeStateObj =
    statesForCountry.find((s) => s.name === stateName) || statesForCountry[0];

  const categoryDefaultImg = useMemo(() => {
    const meta = CATEGORY_CARDS.find((c) => c.label === category);
    return meta?.image || '/src/assets/images/cat-bakers.png';
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

  const filteredStores = useMemo(() => {
    const q = storeSearch.trim().toLowerCase();
    if (!q) return cloudVendors;
    return cloudVendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.whatsappNumber.includes(q) ||
        v.category.toLowerCase().includes(q)
    );
  }, [cloudVendors, storeSearch]);

  if (!open) return null;

  const handleCountryChange = (nextCountry: Exclude<LaunchCountry, 'All'>) => {
    setCountry(nextCountry);
    setPhoneCode(COUNTRY_PHONE_CODES[nextCountry] || '91');
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
    setPhoneLocal('');
    setBioHandle('');
    setCoverImage(categoryDefaultImg);
    setPasscode(generateTransferPasscode('CAKE'));
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
      setError('Passcode must be at least 6 letters/numbers (e.g., CAKE-7492).');
      return;
    }

    const validProducts: VendorProduct[] = products
      .filter((p) => p.name.trim().length >= 2)
      .map((p, idx) => {
        const localNum = Number(p.priceLocal) || 0;
        return {
          id: p.id || `prod-${idx + 1}`,
          name: p.name.trim().slice(0, 100),
          serves: p.serves.trim().slice(0, 60) || 'Custom',
          priceUsd: Math.max(1, localToUsd(localNum > 0 ? localNum : 500, formCurrency)),
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
      bioHandle: bioHandle.trim() || slugBase,
      serviceAreas: [area.trim() || city, city].filter(Boolean),
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

  const handleIssueTransferForExisting = async (e: FormEvent) => {
    e.preventDefault();
    if (!transferTargetVendor) return;
    setError(null);
    setBusyVendorId(transferTargetVendor.id);
    try {
      const prevTransfer = transfers.find((t) => t.vendorId === transferTargetVendor.id);
      const record = await adminIssueTransferForExistingStore(
        transferTargetVendor,
        adminUser.uid,
        existingPhone,
        existingPasscode,
        prevTransfer?.claimId
      );
      setCreatedHandover({ vendor: transferTargetVendor, transfer: record });
      setTransferTargetVendor(null);
      setActiveTab('create');
      onToast(`Transfer passcode generated for ${transferTargetVendor.name}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue transfer passcode.');
    } finally {
      setBusyVendorId(null);
    }
  };

  const handleRegeneratePasscode = async (t: AdminTransferRecord) => {
    const vendor = vendorsById.get(t.vendorId);
    if (!vendor) return;
    const nextCode = generateTransferPasscode('CAKE');
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

  const handleToggleChristmas = async (vendor: Vendor) => {
    setBusyVendorId(vendor.id);
    try {
      const next = !vendor.christmasSpecial;
      await updateVendorInCloud(vendor.id, {
        christmasSpecial: next,
        ...(next && !vendor.christmasOffer
          ? { christmasOffer: 'Christmas Plum Cakes & NYE Specials · Pre-orders Open' }
          : {}),
      });
      onToast(next ? `${vendor.name} added to Christmas Spotlight!` : `${vendor.name} removed from Christmas Spotlight.`);
    } catch {
      onToast('Could not update Christmas status.');
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
                  Admin Panel · Fast Baker Store &amp; Transfer
                </h2>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Concierge Mode
                </span>
              </div>
              <p className="text-xs text-white/70">
                Build a baker&apos;s store + products in 60 seconds, then send a phone passcode so she can claim it &amp; set her password.
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

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-5 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                activeTab === 'create'
                  ? 'bg-brand text-brand-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Cake className="size-3.5" aria-hidden="true" />
              Create &amp; Transfer Store
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('transfers')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                activeTab === 'transfers'
                  ? 'bg-brand text-brand-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <KeyRound className="size-3.5" aria-hidden="true" />
              Transfers &amp; Passcodes
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-white">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stores')}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                activeTab === 'stores'
                  ? 'bg-brand text-brand-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Store className="size-3.5" aria-hidden="true" />
              All Cloud Stores ({cloudVendors.length})
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-semibold text-muted-foreground">
            <span>
              Pending: <strong className="text-amber-600 dark:text-amber-400">{pendingCount}</strong>
            </span>
            <span>
              Claimed: <strong className="text-emerald-600 dark:text-emerald-400">{claimedCount}</strong>
            </span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* TAB 1: CREATE & TRANSFER STORE */}
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
                          copyText(createdHandover.transfer.passcode, 'pass', 'Passcode')
                        }
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-500/30 dark:text-amber-200"
                      >
                        {copiedKey === 'pass' ? <Check className="size-3" /> : <Copy className="size-3" />}
                        Copy
                      </button>
                    </div>
                    <p className="mt-1 font-mono text-xl font-black tracking-widest text-amber-900 dark:text-amber-200">
                      {createdHandover.transfer.passcode}
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
                          setCategory(e.target.value);
                          const nextMeta = CATEGORY_CARDS.find((c) => c.label === e.target.value);
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
                </div>

                {/* Section 2: Products / Cakes Menu Builder */}
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">
                        2. Add Baker&apos;s Cakes &amp; Products ({products.length}/20)
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
                        disabled={products.length >= 20}
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
                            <img
                              src={prod.image || categoryDefaultImg}
                              alt={prod.name || `Product ${idx + 1}`}
                              className="size-16 rounded-lg object-cover ring-1 ring-border"
                            />
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
                        3. Baker Transfer Passcode (Min 6 chars)
                      </label>
                      <p className="mb-2 text-xs text-amber-900/80 dark:text-amber-200/80">
                        Give this code to the baker on WhatsApp. She enters her phone + this passcode to claim the store &amp; set her own password.
                      </p>
                      <div className="flex max-w-md gap-2">
                        <input
                          type="text"
                          required
                          value={passcode}
                          onChange={(e) => setPasscode(normalizePasscode(e.target.value))}
                          className="flex-1 rounded-xl border border-amber-500/40 bg-background px-3.5 py-2.5 font-mono text-base font-black tracking-widest text-foreground focus:border-amber-600 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setPasscode(generateTransferPasscode('CAKE'))}
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
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              Phone:{' '}
                              <strong className="font-mono text-foreground">
                                +{t.targetPhone}
                              </strong>
                            </span>
                            <span>
                              Passcode:{' '}
                              <strong className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-amber-900 dark:text-amber-200">
                                {t.passcode}
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
                                disabled={isBusy}
                                onClick={() => void handleRegeneratePasscode(t)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold hover:border-brand disabled:opacity-50"
                              >
                                <RefreshCw className={`size-3 ${isBusy ? 'animate-spin' : ''}`} />
                                New Code
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

          {/* TAB 3: ALL CLOUD STORES (Quick Admin Control + Transfer Existing Store) */}
          {activeTab === 'stores' && (
            <div className="space-y-4">
              {/* Inline Transfer Existing Store Modal Banner */}
              {transferTargetVendor && (
                <form
                  onSubmit={(e) => void handleIssueTransferForExisting(e)}
                  className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-foreground">
                      Transfer &quot;{transferTargetVendor.name}&quot; to Baker&apos;s Phone
                    </h4>
                    <button
                      type="button"
                      onClick={() => setTransferTargetVendor(null)}
                      className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold">
                        Baker Phone (with country code)
                      </label>
                      <input
                        type="tel"
                        required
                        value={existingPhone}
                        onChange={(e) => setExistingPhone(e.target.value)}
                        placeholder="919876543210"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold">Transfer Passcode</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          value={existingPasscode}
                          onChange={(e) => setExistingPasscode(normalizePasscode(e.target.value))}
                          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs font-black tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={() => setExistingPasscode(generateTransferPasscode('FMB'))}
                          className="cursor-pointer rounded-xl border border-border bg-background px-2.5 text-xs"
                        >
                          <RefreshCw className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={busyVendorId === transferTargetVendor.id}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
                      >
                        <KeyRound className="size-3.5" />
                        Generate Handover Kit
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  placeholder="Search stores by name, city, phone, or category..."
                  className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-xs text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              {filteredStores.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No cloud storefronts match your search.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredStores.map((v) => {
                    const isOwnedByAdmin = v.ownerId === adminUser.uid;
                    const isBusy = busyVendorId === v.id;
                    return (
                      <div
                        key={v.id}
                        className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-3.5"
                      >
                        <div className="flex gap-3">
                          <img
                            src={v.image}
                            alt={v.name}
                            className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-border"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="truncate text-sm font-extrabold text-foreground">
                                {v.name}
                              </h4>
                              {v.verified && <BadgeCheck className="size-4 shrink-0 text-sky-500" />}
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="size-3" />
                              {v.city}, {v.country} · {v.products.length} items · From{' '}
                              {formatMoney(v.startingPriceUsd, currency)}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {v.claimStatus === 'claimed' ? (
                                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  Transferred to Baker
                                </span>
                              ) : v.claimStatus === 'pending' ? (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                  Pending Transfer
                                </span>
                              ) : isOwnedByAdmin ? (
                                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                                  Admin-Created
                                </span>
                              ) : (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                  Vendor-Owned
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onEditVendor(v);
                            }}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold hover:border-brand"
                          >
                            <Edit3 className="size-3" />
                            Edit Store &amp; Products
                          </button>

                          {isOwnedByAdmin && v.claimStatus !== 'claimed' && (
                            <button
                              type="button"
                              onClick={() => {
                                setTransferTargetVendor(v);
                                setExistingPhone(v.whatsappNumber);
                                setExistingPasscode(generateTransferPasscode('CAKE'));
                              }}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-amber-600"
                            >
                              <KeyRound className="size-3" />
                              Transfer to Phone
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleToggleChristmas(v)}
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                              v.christmasSpecial
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-border bg-background text-muted-foreground hover:border-emerald-600 hover:text-emerald-700'
                            }`}
                          >
                            <Snowflake className="size-3" />
                            {v.christmasSpecial ? 'In Christmas' : 'Highlight Xmas'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
