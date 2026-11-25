import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Cloud,
  Crown,
  ImagePlus,
  Loader2,
  LocateFixed,
  LogIn,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  RefreshCw,
  Snowflake,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  BUILDER_PRESET_OPTIONS,
  BillingCycle,
  BuilderPresetId,
  COUNTRY_DEFAULT_CURRENCY,
  COUNTRY_REGION_LABEL,
  CURRENCIES,
  CUSTOM_BUILDER_MODES,
  CurrencyCode,
  CustomBuilderMode,
  FOOD_CATEGORIES,
  IMG_BALLOON,
  IMG_BAR,
  IMG_CAKE,
  IMG_CATERING,
  IMG_CHEF,
  IMG_DECOR,
  IMG_DESSERTS,
  IMG_DJ,
  IMG_GIFTING,
  IMG_LIVE_COUNTER,
  IMG_MITHAI,
  IMG_PHOTO,
  IMG_VENUE,
  LAUNCH_CITY_PRESETS,
  LAUNCH_COUNTRIES,
  LaunchCountry,
  PARTY_CATEGORIES,
  PRODUCT_DIETARY_OPTIONS,
  PRODUCT_UNIT_OPTIONS,
  PlanTier,
  PriceTier,
  ProductFoodType,
  ProductUnitType,
  SAAS_PLANS,
  STATES_BY_COUNTRY,
  Vendor,
  VendorProduct,
  formatPlanPrice,
  formatProductServesLabel,
  getCustomBuilderModeConfig,
  isBuilderSuggestedCategory,
  localToUsd,
  suggestBuilderModeForCategory,
  usdToLocal,
} from '../data/vendors';
import { compressImageFile, parseCoordsFromMapsLink } from '../utils/imageUpload';
import { requestBrowserGpsLocation, resolveRegionFromCoords } from '../utils/geolocation';
import { FoodTypeIcon } from './FoodTypeBadge';
import { StateCoveragePicker } from './StateCoveragePicker';

interface ListBusinessModalProps {
  isOpen: boolean;
  initialPlanTier?: PlanTier;
  initialBillingCycle?: BillingCycle;
  initialChristmasSpecial?: boolean;
  defaultCountry?: Exclude<LaunchCountry, 'All'>;
  existingSlugs?: string[];
  currency: CurrencyCode;
  user: User | null;
  onSignIn: () => Promise<void>;
  onClose: () => void;
  onAddVendor: (vendor: Vendor) => Promise<void> | void;
}

interface DraftProduct {
  id: string;
  name: string;
  unitQuantity: string;
  unitType: ProductUnitType;
  serves: string;
  foodType: ProductFoodType | '';
  dietaryTags: string[];
  builderSection: string;
  builderPresets: BuilderPresetId[];
  priceLocal: number;
  description: string;
  image: string;
}

const COUNTRY_DEFAULT_COORDS: Record<
  Exclude<LaunchCountry, 'All'>,
  { city: string; lat: number; lng: number; phonePrefix: string }
> = {
  India: { city: 'Mumbai', lat: 19.076, lng: 72.8777, phonePrefix: '91' },
  'Dubai / UAE': { city: 'Dubai', lat: 25.2048, lng: 55.2708, phonePrefix: '971' },
  'Sri Lanka': { city: 'Colombo', lat: 6.9271, lng: 79.8612, phonePrefix: '94' },
  Pakistan: { city: 'Lahore', lat: 31.5204, lng: 74.3587, phonePrefix: '92' },
  Bangladesh: { city: 'Dhaka', lat: 23.8103, lng: 90.4125, phonePrefix: '880' },
  Nepal: { city: 'Kathmandu', lat: 27.7172, lng: 85.324, phonePrefix: '977' },
};

const DEFAULT_IMAGE_BY_CATEGORY: Record<string, string> = {
  // FindMyBites (12)
  'Bakers & Cakes': IMG_CAKE,
  'Home Bakers & Cloud Kitchens': IMG_DESSERTS,
  'Live Counters & Food Stalls': IMG_LIVE_COUNTER,
  'Catering Services': IMG_CATERING,
  'Private Chefs & Home Dining': IMG_CHEF,
  'Bar, Mocktails & Beverage Carts': IMG_BAR,
  'Snack Boxes & Party Platters': IMG_GIFTING,
  'Dessert Tables & Sweet Stations': IMG_DESSERTS,
  'Gifting, Hampers & Return Favors': IMG_GIFTING,
  'Mithai, Chocolatiers & Dates': IMG_MITHAI,
  'Food Trucks & Pop-Up Carts': IMG_LIVE_COUNTER,
  'Healthy, Vegan & Diet Catering': IMG_CHEF,
  // PimpMyParty (12)
  'Wedding & Party Decor': IMG_DECOR,
  'Balloon & Theme Birthday Decor': IMG_BALLOON,
  'Event & Wedding Planners': IMG_VENUE,
  'DJs, Sound & Live Bands': IMG_DJ,
  'Photographers & Videographers': IMG_PHOTO,
  'Venues, Farmhouses & Villas': IMG_VENUE,
  'Photo Booths & 360 Spinners': IMG_PHOTO,
  'Kids Entertainment & Mascots': IMG_BALLOON,
  'Anchors, Emcees & Performers': IMG_DJ,
  'Makeup, Hair & Mehendi Artists': IMG_PHOTO,
  'Event Rentals, Furniture & Tents': IMG_VENUE,
  'Lighting, AV & Cold Fireworks': IMG_DECOR,
};

export function ListBusinessModal({
  isOpen,
  initialPlanTier = 'free',
  initialBillingCycle = 'monthly',
  initialChristmasSpecial = false,
  defaultCountry = 'India',
  existingSlugs = [],
  currency,
  user,
  onSignIn,
  onClose,
  onAddVendor,
}: ListBusinessModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [marketplace, setMarketplace] = useState<'food' | 'party'>('food');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(FOOD_CATEGORIES[0]);
  const [country, setCountry] = useState<Exclude<LaunchCountry, 'All'>>(defaultCountry);
  const [formCurrency, setFormCurrency] = useState<CurrencyCode>(
    COUNTRY_DEFAULT_CURRENCY[defaultCountry] || currency || 'INR'
  );
  const [stateName, setStateName] = useState<string>(STATES_BY_COUNTRY[defaultCountry][0].name);
  const [city, setCity] = useState(STATES_BY_COUNTRY[defaultCountry][0].cities[0]);
  const [customCityMode, setCustomCityMode] = useState(false);
  const [extraCities, setExtraCities] = useState('');
  const [allStatesCoverage, setAllStatesCoverage] = useState(false);
  const [serviceStates, setServiceStates] = useState<string[]>([]);
  const [area, setArea] = useState('');
  const [latInput, setLatInput] = useState<string>(String(STATES_BY_COUNTRY[defaultCountry][0].lat));
  const [lngInput, setLngInput] = useState<string>(String(STATES_BY_COUNTRY[defaultCountry][0].lng));
  const [mapsPaste, setMapsPaste] = useState('');
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [tagline, setTagline] = useState('');
  const [christmasSpecial, setChristmasSpecial] = useState(initialChristmasSpecial);
  const [christmasOffer, setChristmasOffer] = useState('');
  const [customBuilderEnabled, setCustomBuilderEnabled] = useState(false);
  const [customBuilderMode, setCustomBuilderMode] = useState<CustomBuilderMode>('snackbox');
  const [customBuilderMinQty, setCustomBuilderMinQty] = useState(10);
  const [customBuilderPackagingLocal, setCustomBuilderPackagingLocal] = useState(0);
  const [planTier, setPlanTier] = useState<PlanTier>(
    initialPlanTier === 'pro' ? 'business' : initialPlanTier
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialBillingCycle);
  const [autoPayAccepted, setAutoPayAccepted] = useState(true);

  // Branding uploads
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  const [coverDataUrl, setCoverDataUrl] = useState<string>('');

  // Multi-product builder with local currency & product image upload
  const [products, setProducts] = useState<DraftProduct[]>([
    {
      id: 'draft-1',
      name: '',
      unitQuantity: '1',
      unitType: 'kg',
      serves: '1 kg',
      foodType: '',
      dietaryTags: [],
      builderSection: '',
      builderPresets: [],
      priceLocal: usdToLocal(35, currency || 'INR'),
      description: '',
      image: '',
    },
  ]);

  useEffect(() => {
    setPlanTier(initialPlanTier === 'pro' ? 'business' : initialPlanTier);
    setBillingCycle(initialBillingCycle);
  }, [initialPlanTier, initialBillingCycle, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setChristmasSpecial(initialChristmasSpecial);
      if (!name.trim()) {
        setCountry(defaultCountry);
        const firstState = STATES_BY_COUNTRY[defaultCountry][0];
        setStateName(firstState.name);
        setCity(firstState.cities[0]);
        setLatInput(String(firstState.lat));
        setLngInput(String(firstState.lng));
        setFormCurrency(COUNTRY_DEFAULT_CURRENCY[defaultCountry] || currency || 'INR');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChristmasSpecial, isOpen, defaultCountry]);

  useEffect(() => {
    setCategory(marketplace === 'food' ? FOOD_CATEGORIES[0] : PARTY_CATEGORIES[0]);
  }, [marketplace]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = marketplace === 'food' ? FOOD_CATEGORIES : PARTY_CATEGORIES;
  const isPaidPlan = planTier === 'pro' || planTier === 'business';
  const selectedPlanMeta = SAAS_PLANS.find((p) => p.id === planTier) ?? SAAS_PLANS[0];
  const statesForCountry = STATES_BY_COUNTRY[country];
  const activeStateObj =
    statesForCountry.find((s) => s.name === stateName) || statesForCountry[0];
  const currencyMeta = CURRENCIES[formCurrency];
  const defaultCover = DEFAULT_IMAGE_BY_CATEGORY[category] || IMG_CAKE;

  const handleCountryChange = (nextCountry: Exclude<LaunchCountry, 'All'>) => {
    setCountry(nextCountry);
    const firstState = STATES_BY_COUNTRY[nextCountry][0];
    setStateName(firstState.name);
    setCity(firstState.cities[0]);
    setCustomCityMode(false);
    setAllStatesCoverage(false);
    setServiceStates([]);
    setLatInput(String(firstState.lat));
    setLngInput(String(firstState.lng));

    // Auto-switch currency to match the selected country and keep prices sensible
    const nextCurrency = COUNTRY_DEFAULT_CURRENCY[nextCountry];
    if (nextCurrency !== formCurrency) {
      setProducts((prev) =>
        prev.map((p) => ({
          ...p,
          priceLocal: usdToLocal(localToUsd(p.priceLocal, formCurrency), nextCurrency),
        }))
      );
      setFormCurrency(nextCurrency);
    }
  };

  const handleStateChange = (nextState: string) => {
    setStateName(nextState);
    const found = statesForCountry.find((s) => s.name === nextState);
    if (found) {
      setCity(found.cities[0]);
      setCustomCityMode(false);
      setLatInput(String(found.lat));
      setLngInput(String(found.lng));
    }
  };

  const handleCityChange = (nextCity: string) => {
    setCity(nextCity);
    const matched = LAUNCH_CITY_PRESETS.find(
      (c) => c.city.toLowerCase() === nextCity.trim().toLowerCase()
    );
    if (matched) {
      setLatInput(String(matched.lat));
      setLngInput(String(matched.lng));
    }
  };

  const handleCurrencyChange = (nextCurr: CurrencyCode) => {
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        priceLocal: usdToLocal(localToUsd(p.priceLocal, formCurrency), nextCurr),
      }))
    );
    setFormCurrency(nextCurr);
  };

  const handleMapsLinkPaste = (value: string) => {
    setMapsPaste(value);
    const parsed = parseCoordsFromMapsLink(value);
    if (parsed) {
      setLatInput(String(parsed.lat));
      setLngInput(String(parsed.lng));
      setGpsStatus({
        type: 'ok',
        text: `Extracted coordinates: ${parsed.lat}, ${parsed.lng}`,
      });
    }
  };

  const handleDetectVendorGps = async () => {
    setDetectingGps(true);
    setGpsStatus(null);
    try {
      const coords = await requestBrowserGpsLocation();
      setLatInput(String(coords.lat));
      setLngInput(String(coords.lng));

      const resolved = await resolveRegionFromCoords(coords.lat, coords.lng);
      if (resolved.exactCountryMatched) {
        setCountry(resolved.country);
        setStateName(resolved.state);
        setCity(resolved.city);
        if (resolved.area) setArea(resolved.area);
        const nextCurrency = COUNTRY_DEFAULT_CURRENCY[resolved.country];
        if (nextCurrency !== formCurrency) {
          setProducts((prev) =>
            prev.map((p) => ({
              ...p,
              priceLocal: usdToLocal(localToUsd(p.priceLocal, formCurrency), nextCurrency),
            }))
          );
          setFormCurrency(nextCurrency);
        }
      }

      setGpsStatus({
        type: 'ok',
        text: `GPS pin captured: ${coords.lat}, ${coords.lng} (${resolved.label})`,
      });
    } catch (err) {
      setGpsStatus({
        type: 'err',
        text:
          err instanceof Error
            ? err.message
            : 'Could not access GPS. Allow location in your browser or paste a Google Maps link.',
      });
    } finally {
      setDetectingGps(false);
    }
  };

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 220,
        maxHeight: 220,
        quality: 0.8,
        maxChars: 55000,
      });
      setLogoDataUrl(dataUrl);
    } catch {
      setUploadError('Could not process logo image. Please try a JPG or PNG file.');
    }
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 960,
        maxHeight: 540,
        quality: 0.76,
        maxChars: 130000,
      });
      setCoverDataUrl(dataUrl);
    } catch {
      setUploadError('Could not process cover photo. Please try a JPG or PNG file.');
    }
  };

  const handleProductImageUpload = async (
    productId: string,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 640,
        maxHeight: 480,
        quality: 0.72,
        maxChars: 90000,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, image: dataUrl } : p))
      );
    } catch {
      setUploadError('Could not process product photo. Please try a JPG or PNG file.');
    }
  };

  const updateProductField = <K extends keyof DraftProduct>(
    id: string,
    field: K,
    value: DraftProduct[K]
  ) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const toggleDraftDietaryTag = (id: string, tag: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              dietaryTags: p.dietaryTags.includes(tag)
                ? p.dietaryTags.filter((t) => t !== tag)
                : [...p.dietaryTags, tag],
            }
          : p
      )
    );
  };

  const toggleDraftBuilderPreset = (id: string, presetId: BuilderPresetId) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              builderPresets: p.builderPresets.includes(presetId)
                ? p.builderPresets.filter((x) => x !== presetId)
                : [...p.builderPresets, presetId],
            }
          : p
      )
    );
  };

  const addDraftProduct = () => {
    if (products.length >= 25) return;
    setProducts((prev) => [
      ...prev,
      {
        id: `draft-${Date.now()}`,
        name: '',
        unitQuantity: '1',
        unitType: customBuilderEnabled ? 'pcs' : 'kg',
        serves: customBuilderEnabled ? '1 pc' : '1 kg',
        foodType: '',
        dietaryTags: [],
        builderSection: '',
        builderPresets: [],
        priceLocal: usdToLocal(customBuilderEnabled ? 2 : 50, formCurrency),
        description: '',
        image: '',
      },
    ]);
  };

  const removeDraftProduct = (id: string) => {
    if (products.length <= 1) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const computeTier = (priceUsd: number): PriceTier => {
    if (priceUsd < 120) return '$';
    if (priceUsd < 450) return '$$';
    if (priceUsd < 1000) return '$$$';
    return '$$$$';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!name.trim() || !city.trim() || !tagline.trim()) {
      setSubmitError('Please fill in Business Name, City, and Short Headline.');
      return;
    }
    const rawWaDigits = whatsappNumber.replace(/[^\d]/g, '');
    if (rawWaDigits.length < 8) {
      setSubmitError('Please enter a valid WhatsApp number with country code (e.g. 919876543210).');
      return;
    }
    if (isPaidPlan && billingCycle === 'monthly' && !autoPayAccepted) return;
    if (!user) {
      await onSignIn();
      return;
    }

    setSubmitting(true);

    const matchedCity = LAUNCH_CITY_PRESETS.find(
      (p) => p.city.toLowerCase() === city.trim().toLowerCase()
    );
    const matchedState = statesForCountry.find((s) => s.name === stateName);
    const fallback = COUNTRY_DEFAULT_COORDS[country];

    const parsedLat = Number(latInput);
    const parsedLng = Number(lngInput);
    const lat =
      Number.isFinite(parsedLat) && parsedLat >= -90 && parsedLat <= 90
        ? parsedLat
        : (matchedCity?.lat ?? matchedState?.lat ?? fallback.lat);
    const lng =
      Number.isFinite(parsedLng) && parsedLng >= -180 && parsedLng <= 180
        ? parsedLng
        : (matchedCity?.lng ?? matchedState?.lng ?? fallback.lng);

    const cleanNamePart = name
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const cleanCityPart = city
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 28);
    const baseNameSlug = cleanNamePart || `store-${Date.now().toString(36).slice(-5)}`;
    const baseFullSlug =
      cleanCityPart && !baseNameSlug.endsWith(`-${cleanCityPart}`)
        ? `${baseNameSlug}-${cleanCityPart}`
        : baseNameSlug;

    const existingSlugSet = new Set(existingSlugs.map((s) => s.toLowerCase()));
    let slug = baseFullSlug;
    let suffix = 2;
    while (existingSlugSet.has(slug.toLowerCase())) {
      slug = `${baseFullSlug}-${suffix}`;
      suffix += 1;
    }

    let bioHandle = baseNameSlug;
    if (existingSlugSet.has(bioHandle.toLowerCase())) {
      bioHandle = slug;
    }

    const trimmedMaps = mapsPaste.trim();
    const googleMapsUrl =
      /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(
        trimmedMaps
      )
        ? trimmedMaps
        : undefined;

    const coverImg = coverDataUrl || defaultCover;
    const digits =
      rawWaDigits.startsWith(fallback.phonePrefix) || rawWaDigits.length >= 11
        ? rawWaDigits
        : `${fallback.phonePrefix}${rawWaDigits}`;

    const finalProducts: VendorProduct[] = products.map((p, idx) => {
      const priceUsd = Math.max(1, localToUsd(p.priceLocal, formCurrency));
      const formattedServes = formatProductServesLabel(p.unitQuantity, p.unitType, p.serves);
      return {
        id: `prod-${Date.now()}-${idx + 1}`,
        name: p.name.trim() || `${category} Package ${idx + 1}`,
        serves: formattedServes,
        ...(p.unitType !== 'custom' ? { unitQuantity: p.unitQuantity.trim() || '1' } : {}),
        unitType: p.unitType,
        ...(p.foodType ? { foodType: p.foodType } : {}),
        ...(p.dietaryTags.length > 0 ? { dietaryTags: p.dietaryTags } : {}),
        ...(customBuilderEnabled && p.builderSection.trim()
          ? { builderSection: p.builderSection.trim().slice(0, 60) }
          : {}),
        ...(customBuilderEnabled && p.builderPresets.length > 0
          ? { builderPresets: p.builderPresets }
          : {}),
        priceUsd,
        description:
          p.description.trim() ||
          `Direct WhatsApp booking with ${name.trim()} in ${city.trim()}, ${stateName}.`,
        image: p.image || coverImg,
        ...(idx === 0 ? { tag: isPaidPlan ? 'Featured' : 'Popular' } : {}),
      };
    });

    const minPriceUsd = Math.min(...finalProducts.map((p) => p.priceUsd));

    const newVendor: Vendor = {
      id: `custom-${Date.now()}`,
      slug,
      bioHandle,
      ...(googleMapsUrl ? { googleMapsUrl } : {}),
      name: name.trim(),
      marketplace,
      category,
      city: city.trim(),
      state: stateName,
      area: area.trim() || city.trim(),
      country,
      lat,
      lng,
      whatsappNumber: digits,
      planTier: isPaidPlan ? 'business' : 'free',
      monthlyAutoPay: isPaidPlan && billingCycle === 'monthly' && autoPayAccepted,
      orderingConfig: {
        enabled: true,
        acceptingOrders: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        codEnabled: true,
        billingCycle,
      },
      priceTier: computeTier(minPriceUsd),
      startingPriceUsd: minPriceUsd,
      rating: 5.0,
      reviewCount: 0,
      responseTime: isPaidPlan
        ? 'Replies within 10 mins on WhatsApp'
        : 'Replies within 30 mins on WhatsApp',
      verified: false,
      tagline: tagline.trim(),
      description: `${tagline.trim()} Published directly on FindMyBites × PimpMyParty with a dedicated one-page storefront and direct WhatsApp ordering across ${area.trim() || city.trim()}, ${city.trim()}, ${stateName}.`,
      christmasSpecial,
      christmasOffer: christmasOffer.trim() || undefined,
      customBuilderEnabled: marketplace === 'food' && customBuilderEnabled,
      customBuilderMode:
        marketplace === 'food' && customBuilderEnabled ? customBuilderMode : undefined,
      customBuilderMinQty:
        marketplace === 'food' && customBuilderEnabled
          ? Math.max(1, Math.min(5000, Math.round(customBuilderMinQty || 10)))
          : undefined,
      customBuilderPackagingUsd:
        marketplace === 'food' && customBuilderEnabled && customBuilderPackagingLocal > 0
          ? Math.max(0, Math.min(500, localToUsd(customBuilderPackagingLocal, formCurrency)))
          : undefined,
      serviceAreas: [
        area.trim() || city.trim(),
        city.trim(),
        stateName,
        ...extraCities
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ].filter((v, i, arr) => v && arr.indexOf(v) === i),
      allStatesCoverage,
      serviceStates: allStatesCoverage
        ? []
        : serviceStates.filter((s) => s && s !== stateName),
      specialties: [category, 'Direct WhatsApp Booking', 'Custom Orders'],
      image: coverImg,
      logo: logoDataUrl || undefined,
      products: finalProducts,
      reviews: [],
    };

    try {
      await onAddVendor(newVendor);
      setName('');
      setArea('');
      setCustomCityMode(false);
      setExtraCities('');
      setAllStatesCoverage(false);
      setServiceStates([]);
      setWhatsappNumber('');
      setTagline('');
      setChristmasOffer('');
      setCustomBuilderEnabled(false);
      setCustomBuilderPackagingLocal(0);
      setLogoDataUrl('');
      setCoverDataUrl('');
      setMapsPaste('');
      setSubmitError(null);
      setProducts([
        {
          id: `draft-${Date.now()}`,
          name: '',
          unitQuantity: '1',
          unitType: 'kg',
          serves: '1 kg',
          foodType: '',
          dietaryTags: [],
          builderSection: '',
          builderPresets: [],
          priceLocal: usdToLocal(35, formCurrency),
          description: '',
          image: '',
        },
      ]);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Could not publish storefront right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="List your business and create vendor page"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-extrabold text-foreground">
              Launch Your One-Page Vendor Website
            </h2>
            <p className="text-xs text-muted-foreground">
              Upload your logo, cover &amp; product photos, set your local currency &amp; map pin
            </p>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* 1. Plan Selection (Free vs Monthly Auto-Pay SaaS) */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                1. Choose Your Listing Plan
              </label>
              <div className="flex items-center gap-1.5">
                <label htmlFor="biz-currency" className="text-xs font-semibold text-muted-foreground">
                  Currency:
                </label>
                <select
                  id="biz-currency"
                  value={formCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                  className="cursor-pointer rounded-lg border border-brand bg-background px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none"
                >
                  {Object.values(CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol.trim()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SAAS_PLANS.map((p) => {
                const active = (planTier === 'pro' ? 'business' : planTier) === p.id;
                const isBiz = p.id === 'business';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanTier(p.id)}
                    className={`cursor-pointer rounded-xl border p-4 text-left transition-all ${
                      active
                        ? 'border-brand bg-brand-soft/60 ring-2 ring-brand/20'
                        : 'border-border bg-background hover:border-brand/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-extrabold text-foreground">{p.name}</span>
                      {isBiz ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-foreground">
                          <Crown className="size-3" aria-hidden="true" />
                          {billingCycle === 'annual' ? '2 Months Free' : 'Direct Ordering'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          ₹0 Forever
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 font-mono text-xl font-extrabold text-foreground">
                      {formatPlanPrice(p, formCurrency, isBiz ? billingCycle : 'monthly')}
                      <span className="text-xs font-normal text-muted-foreground">
                        {p.id === 'free'
                          ? ' / forever'
                          : billingCycle === 'annual'
                            ? ' / year (10 mo)'
                            : ' / month'}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {p.id === 'free'
                        ? 'Storefront + Bio-Link + WhatsApp + QR Poster'
                        : 'Direct Online Ordering, UPI Checkout, Order Board, Promo Codes & Top Ranking'}
                    </p>
                  </button>
                );
              })}
            </div>

            {isPaidPlan && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5">
                <span className="text-xs font-bold text-foreground">Billing Cycle:</span>
                <div className="inline-flex rounded-lg border border-border bg-background p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`cursor-pointer rounded-md px-3 py-1 transition-colors ${
                      billingCycle === 'monthly'
                        ? 'bg-brand text-brand-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Monthly ({formatPlanPrice(selectedPlanMeta, formCurrency, 'monthly')}/mo Auto-Pay)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`cursor-pointer rounded-md px-3 py-1 transition-colors ${
                      billingCycle === 'annual'
                        ? 'bg-emerald-600 text-white'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    1 Year ({formatPlanPrice(selectedPlanMeta, formCurrency, 'annual')}/yr · 2 Mo Free)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Marketplace & Core Info */}
          <div className="space-y-4 border-t border-border pt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              2. Marketplace &amp; Business Details
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setMarketplace('food')}
                className={`cursor-pointer rounded-lg py-2 text-xs font-bold transition-colors ${
                  marketplace === 'food'
                    ? 'bg-[#ef6c22] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                FindMyBites · Food &amp; Catering
              </button>
              <button
                type="button"
                onClick={() => setMarketplace('party')}
                className={`cursor-pointer rounded-lg py-2 text-xs font-bold transition-colors ${
                  marketplace === 'party'
                    ? 'bg-[#db2fb2] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                PimpMyParty · Decor &amp; Events
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="biz-name" className="block text-xs font-semibold text-foreground">
                  Business Name
                </label>
                <input
                  id="biz-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Govada Foods or Velvet Whisk Bakery"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="biz-cat" className="block text-xs font-semibold text-foreground">
                  Category
                </label>
                <select
                  id="biz-cat"
                  value={category}
                  onChange={(e) => {
                    const nextCat = e.target.value;
                    setCategory(nextCat);
                    const suggestedMode = suggestBuilderModeForCategory(nextCat);
                    setCustomBuilderMode(suggestedMode);
                    setCustomBuilderMinQty(getCustomBuilderModeConfig(suggestedMode).defaultMinQty);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="biz-wa"
                  className="flex items-center gap-1 text-xs font-semibold text-foreground"
                >
                  <MessageCircle className="size-3.5 text-[#25D366]" aria-hidden="true" />
                  WhatsApp Number (with country code)
                </label>
                <input
                  id="biz-wa"
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder={`${COUNTRY_DEFAULT_COORDS[country].phonePrefix}9876543210`}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="biz-tagline" className="block text-xs font-semibold text-foreground">
                  Short Storefront Headline &amp; Specialties
                </label>
                <input
                  id="biz-tagline"
                  type="text"
                  required
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Custom eggless cakes, live counters & wedding snacks"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Location + Exact Latitude & Longitude */}
          <div className="space-y-4 border-t border-border pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <MapPin className="size-3.5 text-brand" aria-hidden="true" />
                3. Storefront Location &amp; Map Coordinates (Lat / Lng)
              </p>
              <button
                type="button"
                disabled={detectingGps}
                onClick={() => void handleDetectVendorGps()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-foreground shadow-xs transition-colors hover:bg-brand-hover disabled:opacity-60"
              >
                {detectingGps ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <LocateFixed className="size-3.5" aria-hidden="true" />
                )}
                {detectingGps ? 'Detecting GPS…' : 'Use My Current Location (Lat & Lng)'}
              </button>
            </div>

            {gpsStatus && (
              <p
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  gpsStatus.type === 'ok'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                }`}
              >
                {gpsStatus.text}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="biz-country" className="block text-xs font-semibold text-foreground">
                  Country
                </label>
                <select
                  id="biz-country"
                  value={country}
                  onChange={(e) =>
                    handleCountryChange(e.target.value as Exclude<LaunchCountry, 'All'>)
                  }
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
                >
                  {LAUNCH_COUNTRIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="biz-state" className="block text-xs font-semibold text-foreground">
                  {COUNTRY_REGION_LABEL[country]}
                </label>
                <select
                  id="biz-state"
                  value={stateName}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
                >
                  {statesForCountry.map((st) => (
                    <option key={st.name} value={st.name}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between gap-1">
                  <label htmlFor="biz-city" className="block text-xs font-semibold text-foreground">
                    City
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (customCityMode) {
                        setCustomCityMode(false);
                        if (activeStateObj?.cities[0] && !activeStateObj.cities.includes(city)) {
                          handleCityChange(activeStateObj.cities[0]);
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
                    id="biz-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    placeholder="Type any city name (e.g. Khammam)"
                    className="mt-1.5 w-full rounded-lg border border-brand/60 bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                ) : (
                  <select
                    id="biz-city"
                    value={city}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setCustomCityMode(true);
                        setCity('');
                      } else {
                        handleCityChange(e.target.value);
                      }
                    }}
                    className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
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
                <label htmlFor="biz-area" className="block text-xs font-semibold text-foreground">
                  Area / Locality
                </label>
                <input
                  id="biz-area"
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Kompally / Jubilee Hills"
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="biz-extra-cities" className="block text-xs font-semibold text-foreground">
                Additional Delivery Cities / Towns (Optional)
              </label>
              <input
                id="biz-extra-cities"
                type="text"
                value={extraCities}
                onChange={(e) => setExtraCities(e.target.value)}
                placeholder="Add custom cities you also serve (comma separated, e.g. Secunderabad, Vijayawada, Guntur)"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
              />
            </div>

            {/* Pan-India / Nationwide & Multi-State Delivery Coverage */}
            <StateCoveragePicker
              country={country}
              primaryState={stateName}
              allStatesCoverage={allStatesCoverage}
              serviceStates={serviceStates}
              onChangeAllStates={setAllStatesCoverage}
              onChangeServiceStates={setServiceStates}
            />

            <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="biz-lat" className="block text-xs font-semibold text-foreground">
                    Latitude (Lat)
                  </label>
                  <input
                    id="biz-lat"
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    required
                    value={latInput}
                    onChange={(e) => setLatInput(e.target.value)}
                    placeholder="17.3850"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="biz-lng" className="block text-xs font-semibold text-foreground">
                    Longitude (Lng)
                  </label>
                  <input
                    id="biz-lng"
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    required
                    value={lngInput}
                    onChange={(e) => setLngInput(e.target.value)}
                    placeholder="78.4867"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="biz-maps-paste"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Or Paste Google Maps Link
                  </label>
                  <input
                    id="biz-maps-paste"
                    type="text"
                    value={mapsPaste}
                    onChange={(e) => handleMapsLinkPaste(e.target.value)}
                    placeholder="Paste Maps URL or 17.53, 78.48"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
                <span>
                  Click once to auto-capture your exact storefront GPS coordinates for Near Me
                  search.
                </span>
                <button
                  type="button"
                  disabled={detectingGps}
                  onClick={() => void handleDetectVendorGps()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand bg-brand-soft/60 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-soft disabled:opacity-60"
                >
                  {detectingGps ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <LocateFixed className="size-3.5" aria-hidden="true" />
                  )}
                  {detectingGps ? 'Getting Coordinates…' : 'Get Lat & Lng Now'}
                </button>
              </div>
            </div>
          </div>

          {/* 4. Storefront Logo & Cover Banner Upload */}
          <div className="space-y-3 border-t border-border pt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              4. Storefront Branding — Logo &amp; Cover Photo
            </p>
            {uploadError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                {uploadError}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              {/* Logo Upload */}
              <div className="rounded-xl border border-border bg-background p-3.5 sm:col-span-4">
                <p className="text-xs font-semibold text-foreground">Business Logo</p>
                <p className="text-[11px] text-muted-foreground">Square PNG / JPG</p>
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-muted">
                    {logoDataUrl ? (
                      <img
                        src={logoDataUrl}
                        alt="Business logo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand">
                      <ImagePlus className="size-3.5" aria-hidden="true" />
                      {logoDataUrl ? 'Change' : 'Upload Logo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleLogoUpload(e)}
                        className="hidden"
                      />
                    </label>
                    {logoDataUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoDataUrl('')}
                        className="cursor-pointer text-left text-[11px] text-muted-foreground hover:text-red-500"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Cover Banner Upload */}
              <div className="rounded-xl border border-border bg-background p-3.5 sm:col-span-8">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Storefront Cover Banner</p>
                    <p className="text-[11px] text-muted-foreground">
                      Shown at the top of your mini-website &amp; marketplace card
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand whitespace-nowrap">
                      <ImagePlus className="size-3.5" aria-hidden="true" />
                      {coverDataUrl ? 'Change Cover' : 'Upload Cover'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleCoverUpload(e)}
                        className="hidden"
                      />
                    </label>
                    {coverDataUrl && (
                      <button
                        type="button"
                        onClick={() => setCoverDataUrl('')}
                        className="cursor-pointer text-xs text-muted-foreground hover:text-red-500"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 h-24 w-full overflow-hidden rounded-lg border border-border bg-muted">
                  <img
                    src={coverDataUrl || defaultCover}
                    alt="Storefront cover preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. Products / Packages with Optional Custom Plate / Snack Box Builder */}
          <div className="space-y-3 border-t border-border pt-5">
            {marketplace === 'food' && (
              <div className="rounded-xl border border-brand-border bg-brand-soft/30 p-3.5">
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
                          Recommended for {category}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Let customers pick individual items below to assemble their own custom Snack Box, Meal Box, or Catering Plate with automatic per-box pricing &amp; WhatsApp ordering.
                    </p>
                  </div>
                </label>

                {customBuilderEnabled && (
                  <div className="mt-3 grid grid-cols-1 gap-3 border-t border-brand-border/60 pt-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground">
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
                      <label className="block text-[11px] font-semibold text-foreground">
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
                      <label className="block text-[11px] font-semibold text-foreground">
                        Box / Plate Fee ({currencyMeta.symbol.trim()}, optional)
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

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  5. Products &amp; Packages ({currencyMeta.code} {currencyMeta.symbol.trim()}) ·{' '}
                  {products.length}/25
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {customBuilderEnabled
                    ? `Add individual ${getCustomBuilderModeConfig(customBuilderMode).label.toLowerCase()} items with per-item prices so customers can mix & match`
                    : 'Add your cakes, counters, snack boxes or decor packages with photos & local prices'}
                </p>
              </div>
              <button
                type="button"
                onClick={addDraftProduct}
                disabled={products.length >= 25}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-brand bg-brand-soft/60 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-soft disabled:opacity-50"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add Product
              </button>
            </div>

            <div className="space-y-3">
              {products.map((prod, index) => (
                <div
                  key={prod.id}
                  className="rounded-xl border border-border bg-background p-3.5"
                >
                  <div className="flex items-start gap-3">
                    {/* Product Photo Upload */}
                    <div className="shrink-0">
                      <label className="group relative flex aspect-[4/3] w-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-white dark:bg-neutral-900">
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt={prod.name || `Product ${index + 1}`}
                            className="h-full w-full object-contain object-center"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center p-1 text-center text-[10px] font-semibold text-muted-foreground group-hover:text-brand">
                            <ImagePlus className="size-4" aria-hidden="true" />
                            <span className="mt-1">Photo</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => void handleProductImageUpload(prod.id, e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <input
                          type="text"
                          required={index === 0}
                          value={prod.name}
                          onChange={(e) => updateProductField(prod.id, 'name', e.target.value)}
                          placeholder={
                            index === 0
                              ? 'Product Name (e.g. Hyderabadi Biryani Box)'
                              : `Product ${index + 1} Name`
                          }
                          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground focus:border-brand focus:outline-none sm:col-span-2"
                        />
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted-foreground">
                            {currencyMeta.symbol.trim()}
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={50000000}
                            required
                            value={prod.priceLocal}
                            onChange={(e) =>
                              updateProductField(
                                prod.id,
                                'priceLocal',
                                Math.max(0, Number(e.target.value) || 0)
                              )
                            }
                            aria-label={`Price in ${currencyMeta.code}`}
                            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-2.5 font-mono text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                        <div className="flex items-center gap-1.5 sm:col-span-5">
                          {prod.unitType === 'custom' ? (
                            <input
                              type="text"
                              value={prod.serves}
                              onChange={(e) => updateProductField(prod.id, 'serves', e.target.value)}
                              placeholder="Custom (e.g. Serves 15)"
                              className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none"
                            />
                          ) : (
                            <input
                              type="number"
                              step="any"
                              min="0.1"
                              value={prod.unitQuantity}
                              onChange={(e) =>
                                updateProductField(prod.id, 'unitQuantity', e.target.value)
                              }
                              aria-label="Quantity"
                              className="w-16 rounded-lg border border-border bg-card px-2 py-1.5 font-mono text-xs tabular-nums text-foreground focus:border-brand focus:outline-none"
                            />
                          )}
                          <select
                            aria-label="Unit"
                            value={prod.unitType}
                            onChange={(e) =>
                              updateProductField(
                                prod.id,
                                'unitType',
                                e.target.value as ProductUnitType
                              )
                            }
                            className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
                          >
                            {PRODUCT_UNIT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <input
                          type="text"
                          value={prod.description}
                          onChange={(e) =>
                            updateProductField(prod.id, 'description', e.target.value)
                          }
                          placeholder="Short description / flavors / inclusions"
                          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none sm:col-span-7"
                        />
                      </div>

                      {/* Veg / Non-Veg + Sweetener & Dietary Options */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateProductField(
                              prod.id,
                              'foodType',
                              prod.foodType === 'veg' ? '' : 'veg'
                            )
                          }
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors ${
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
                            updateProductField(
                              prod.id,
                              'foodType',
                              prod.foodType === 'non-veg' ? '' : 'non-veg'
                            )
                          }
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold transition-colors ${
                            prod.foodType === 'non-veg'
                              ? 'border-red-600 bg-red-600 text-white'
                              : 'border-red-600/35 bg-card text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40'
                          }`}
                        >
                          <FoodTypeIcon foodType="non-veg" size="xs" />
                          Non-Veg
                        </button>
                        <span className="mx-0.5 h-3.5 w-px bg-border" aria-hidden="true" />
                        {PRODUCT_DIETARY_OPTIONS.map((opt) => {
                          const selected = prod.dietaryTags.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => toggleDraftDietaryTag(prod.id, opt)}
                              className={`cursor-pointer rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                selected
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-border bg-card text-muted-foreground hover:border-emerald-500/60 hover:text-foreground'
                              }`}
                            >
                              {selected ? `✓ ${opt}` : opt}
                            </button>
                          );
                        })}
                      </div>

                      {marketplace === 'food' && customBuilderEnabled && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-soft/20 px-2.5 py-1.5">
                          <select
                            aria-label="Builder Section"
                            value={prod.builderSection}
                            onChange={(e) =>
                              updateProductField(prod.id, 'builderSection', e.target.value)
                            }
                            className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground"
                          >
                            <option value="">
                              {getCustomBuilderModeConfig(customBuilderMode).label} Section (Optional)
                            </option>
                            {getCustomBuilderModeConfig(customBuilderMode).sections.map((sec) => (
                              <option key={sec} value={sec}>
                                {sec}
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            Presets:
                          </span>
                          {BUILDER_PRESET_OPTIONS.map((preset) => {
                            const active = prod.builderPresets.includes(preset.id);
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => toggleDraftBuilderPreset(prod.id, preset.id)}
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

                    {products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDraftProduct(prod.id)}
                        aria-label="Remove product"
                        className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-red-500"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Christmas & New Year 2026 Free Spotlight Opt-In */}
          <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/90 via-emerald-900/90 to-rose-950/90 p-4 text-white">
            <label className="flex cursor-pointer items-start gap-2.5 text-xs">
              <input
                type="checkbox"
                checked={christmasSpecial}
                onChange={(e) => setChristmasSpecial(e.target.checked)}
                className="mt-0.5 size-4 accent-amber-400"
              />
              <div className="flex-1">
                <p className="inline-flex items-center gap-1.5 font-extrabold text-amber-200">
                  <Snowflake className="size-3.5" aria-hidden="true" />
                  Feature in Christmas &amp; New Year 2026 Spotlight (Free Holiday Boost)
                </p>
                <p className="mt-0.5 text-emerald-100/85">
                  Selling plum cakes, Christmas bakes, festive hampers, or NYE party packages?
                  Get highlighted in our promoted homepage Christmas section!
                </p>
              </div>
            </label>
            {christmasSpecial && (
              <div className="mt-3">
                <label className="block text-[11px] font-bold text-amber-200">
                  Christmas &amp; New Year Special Offer / Menu Highlight
                </label>
                <input
                  type="text"
                  maxLength={140}
                  value={christmasOffer}
                  onChange={(e) => setChristmasOffer(e.target.value)}
                  placeholder="e.g. Rich Rum & Eggless Plum Cakes, Yule Logs & Secret Santa Hampers — Pre-book by Dec 22!"
                  className="mt-1 w-full rounded-lg border border-white/25 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/50 focus:border-amber-300 focus:outline-none"
                />
              </div>
            )}
          </div>

          {isPaidPlan && (
            <div className="rounded-xl border border-brand-border bg-brand-soft/40 p-4">
              <div className="flex items-start gap-2.5">
                <RefreshCw className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <div className="flex-1 text-xs">
                  {billingCycle === 'annual' ? (
                    <>
                      <p className="font-bold text-foreground">
                        {selectedPlanMeta.name} —{' '}
                        {formatPlanPrice(selectedPlanMeta, formCurrency, 'annual')}/year (Pay for 10
                        months · 2 Months FREE)
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        Includes full Direct Online Ordering, Direct UPI checkout, Live Order
                        Board, Promo Codes &amp; priority ranking in {city} with 0% commission.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-foreground">
                        {selectedPlanMeta.name} —{' '}
                        {formatPlanPrice(selectedPlanMeta, formCurrency, 'monthly')}/month auto-pay
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        Unlocks Direct Online Ordering, Direct UPI checkout &amp; priority ranking
                        in {city}. Auto-renews monthly; cancel anytime with 0% commission.
                      </p>
                      <label className="mt-2.5 inline-flex cursor-pointer items-center gap-2 font-semibold text-foreground">
                        <input
                          type="checkbox"
                          checked={autoPayAccepted}
                          onChange={(e) => setAutoPayAccepted(e.target.checked)}
                          className="size-4 accent-[#ef6c22]"
                        />
                        <span>
                          Enable {formatPlanPrice(selectedPlanMeta, formCurrency, 'monthly')}/mo
                          auto-pay (or switch to Yearly above for 2 months free)
                        </span>
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {!user ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-soft/40 p-4">
              <div className="flex items-start gap-2.5 text-xs">
                <Cloud className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <p className="font-bold text-foreground">
                    Sign in or create a free account to save your storefront to the live cloud
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Works with Google, Email, or Phone + Password so you can edit products anytime.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void onSignIn()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-brand-foreground hover:bg-brand-hover whitespace-nowrap"
              >
                <LogIn className="size-3.5" aria-hidden="true" />
                Sign In / Sign Up
              </button>
            </div>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <Cloud className="size-3.5" aria-hidden="true" />
              Publishing live to Cloud as <strong>{user.displayName || user.email}</strong>
            </p>
          )}

          {submitError && (
            <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {submitError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="size-3.5 text-emerald-500" aria-hidden="true" />
              Creates live one-page website + QR poster + WhatsApp link instantly
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (isPaidPlan && billingCycle === 'monthly' && !autoPayAccepted)}
                className="cursor-pointer rounded-lg bg-brand px-5 py-2 text-sm font-bold text-brand-foreground hover:bg-brand-hover disabled:opacity-50 whitespace-nowrap"
              >
                {submitting
                  ? 'Publishing to Cloud…'
                  : !user
                    ? 'Sign In & Publish'
                    : isPaidPlan
                      ? `Activate ${selectedPlanMeta.name} & Publish`
                      : 'Publish Free Listing'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
