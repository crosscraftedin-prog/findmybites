import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BarChart3,
  BookOpen,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  ChefHat,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  Eye,
  Gift,
  Globe2,
  ImagePlus,
  Instagram,
  Link2,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  MessageCircle,
  Package,
  PauseCircle,
  PlayCircle,
  Plus,
  QrCode,
  Send,
  Share2,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Truck,
  Users,
  X,
} from 'lucide-react';
import {
  BALLOON_COLOR_PRESETS,
  BALLOON_COLOR_QUICK_PACKS,
  BUILDER_PRESET_OPTIONS,
  BillingCycle,
  BioTheme,
  BookingEnquiry,
  BuilderPresetId,
  CAKE_WEIGHT_PRESETS,
  COUNTRY_REGION_LABEL,
  CURRENCIES,
  CUSTOM_BUILDER_MODES,
  CloudVendorMetric,
  CurrencyCode,
  CustomBuilderMode,
  DEFAULT_ORDERING_TIME_SLOTS,
  EventRequest,
  FOOD_CATEGORIES,
  PARTY_CATEGORIES,
  PRODUCT_DIETARY_OPTIONS,
  PRODUCT_UNIT_OPTIONS,
  PlanTier,
  ProductFoodType,
  ProductUnitType,
  SAAS_PLANS,
  STARTING_PRICE_UNIT_OPTIONS,
  STATES_BY_COUNTRY,
  Vendor,
  VendorBioLink,
  VendorOrderingConfig,
  VendorProduct,
  VendorProductVariant,
  VendorPromoCode,
  formatMoney,
  formatPlanPrice,
  formatProductServesLabel,
  getBalloonColorSwatchHex,
  getBusinessPlan,
  getCustomBuilderModeConfig,
  getEffectiveProductColorOptions,
  getVendorBioHandle,
  getVendorStartingPriceUnit,
  isBalloonDecorProduct,
  isPaidPlanTier,
  localToUsd,
  parseProductUnitFromServes,
  suggestBuilderModeForCategory,
  usdToLocal,
} from '../data/vendors';
import {
  deleteVendorInCloud,
  submitEventQuoteInCloud,
  subscribeVendorMetric,
  updateBookingStatusInCloud,
  updateVendorInCloud,
} from '../services/firestoreService';
import { requestBrowserGpsLocation } from '../utils/geolocation';
import { compressDataUrlImage, compressImageFile } from '../utils/imageUpload';
import { FoodTypeBadge, FoodTypeIcon } from './FoodTypeBadge';
import { PromoCardModal } from './PromoCardModal';
import { QrPosterModal } from './QrPosterModal';
import { StateCoveragePicker } from './StateCoveragePicker';
import { VendorGoogleToolkit } from './VendorGoogleToolkit';
import { VendorMysteryBoxTab } from './mysterybox/VendorMysteryBoxTab';

interface VendorDashboardModalProps {
  isOpen: boolean;
  user: User | null;
  myVendors: Vendor[];
  vendorLeads: BookingEnquiry[];
  openEventRequests: EventRequest[];
  currency: CurrencyCode;
  initialEditVendorId?: string | null;
  onClearInitialEdit?: () => void;
  onClose: () => void;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onOpenListModal: (plan?: PlanTier) => void;
  onOpenVendorWebsite: (vendor: Vendor) => void;
  onOpenBioLink?: (vendor: Vendor) => void;
  onOpenPricingKit?: () => void;
  onOpenGrowthHub?: () => void;
  onTrackShare?: (vendorId: string) => void;
  onNotify: (msg: string) => void;
}

function StorefrontAnalyticsStrip({
  vendor,
  currency,
  onUpgradePlan,
}: {
  vendor: Vendor;
  currency: CurrencyCode;
  onUpgradePlan: (vendor: Vendor, plan: PlanTier) => void;
}) {
  const [metric, setMetric] = useState<CloudVendorMetric>({
    vendorId: vendor.id,
    views: 0,
    whatsappClicks: 0,
    shares: 0,
  });

  useEffect(() => {
    const unsub = subscribeVendorMetric(vendor.id, setMetric);
    return () => unsub();
  }, [vendor.id]);

  const conversion =
    metric.views > 0 ? Math.min(100, Math.round((metric.whatsappClicks / metric.views) * 100)) : 0;
  const businessPlan = getBusinessPlan();

  return (
    <div className="mt-4 space-y-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-2.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            <Eye className="size-3 text-brand" aria-hidden="true" />
            Views
          </p>
          <p className="mt-0.5 font-mono text-lg font-extrabold text-foreground">{metric.views}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            <MessageCircle className="size-3 text-[#25D366]" aria-hidden="true" />
            WA Clicks
          </p>
          <p className="mt-0.5 font-mono text-lg font-extrabold text-foreground">
            {metric.whatsappClicks}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            <Share2 className="size-3 text-brand" aria-hidden="true" />
            Story/QR
          </p>
          <p className="mt-0.5 font-mono text-lg font-extrabold text-foreground">{metric.shares}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2.5">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
            <BarChart3 className="size-3 text-amber-500" aria-hidden="true" />
            Lead Rate
          </p>
          <p className="mt-0.5 font-mono text-lg font-extrabold text-foreground">{conversion}%</p>
        </div>
      </div>

      {vendor.planTier === 'free' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-border bg-brand-soft/45 px-3 py-2 text-xs">
          <span className="text-foreground">
            <Crown className="mr-1 inline size-3.5 text-brand" aria-hidden="true" />
            Unlock Direct Online Ordering &amp; rank above Free listings in <strong>{vendor.city}</strong> —{' '}
            <strong>{formatPlanPrice(businessPlan, currency, 'monthly')}/mo</strong> or{' '}
            <strong>{formatPlanPrice(businessPlan, currency, 'annual')}/yr</strong> (2 mo free).
          </span>
          <button
            type="button"
            onClick={() => onUpgradePlan(vendor, 'business')}
            className="cursor-pointer rounded-lg bg-brand px-3 py-1 text-[11px] font-bold text-brand-foreground hover:bg-brand-hover"
          >
            Upgrade to Business
          </button>
        </div>
      )}
    </div>
  );
}

export function VendorDashboardModal({
  isOpen,
  user,
  myVendors,
  vendorLeads,
  openEventRequests,
  currency,
  initialEditVendorId,
  onClearInitialEdit,
  onClose,
  onSignIn,
  onSignOut,
  onOpenListModal,
  onOpenVendorWebsite,
  onOpenBioLink,
  onOpenPricingKit,
  onOpenGrowthHub,
  onTrackShare,
  onNotify,
}: VendorDashboardModalProps) {
  const [tab, setTab] = useState<'storefronts' | 'growth' | 'board' | 'leads' | 'mystery-boxes'>(
    'storefronts'
  );
  const [addingProductForId, setAddingProductForId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [confirmDeleteProdKey, setConfirmDeleteProdKey] = useState<string | null>(null);
  const [confirmDeleteVendorId, setConfirmDeleteVendorId] = useState<string | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  // Add / Edit product state
  const [prodName, setProdName] = useState('');
  const [prodUnitQty, setProdUnitQty] = useState('1');
  const [prodUnitType, setProdUnitType] = useState<ProductUnitType>('kg');
  const [prodServes, setProdServes] = useState('1 kg');
  const [prodFoodType, setProdFoodType] = useState<ProductFoodType | ''>('');
  const [prodDietaryTags, setProdDietaryTags] = useState<string[]>([]);
  const [prodColorOptions, setProdColorOptions] = useState<string[]>([]);
  const [prodDisableColorSelector, setProdDisableColorSelector] = useState(false);
  const [prodCustomColorInput, setProdCustomColorInput] = useState('');
  const [prodPriceLocal, setProdPriceLocal] = useState(usdToLocal(40, currency));
  const [prodDesc, setProdDesc] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodMenuSection, setProdMenuSection] = useState('');
  const [prodAdvanceHours, setProdAdvanceHours] = useState('');
  const [prodBuilderSection, setProdBuilderSection] = useState('');
  const [prodBuilderPresets, setProdBuilderPresets] = useState<BuilderPresetId[]>([]);
  const [prodVariants, setProdVariants] = useState<
    Array<{ id: string; label: string; priceLocal: string; serves: string }>
  >([]);
  const [prodIsPackage, setProdIsPackage] = useState(false);
  const [prodIncludedItemsText, setProdIncludedItemsText] = useState('');
  const [prodMinOrderQty, setProdMinOrderQty] = useState('');
  const [prodDishPickerSearch, setProdDishPickerSearch] = useState('');
  const [prodListFilter, setProdListFilter] = useState<'all' | 'packages' | 'items'>('all');

  // Storefront full editor state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editExtraCategories, setEditExtraCategories] = useState<string[]>([]);
  const [editTagline, setEditTagline] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editPromoBanner, setEditPromoBanner] = useState('');
  const [editChristmasSpecial, setEditChristmasSpecial] = useState(false);
  const [editChristmasOffer, setEditChristmasOffer] = useState('');
  const [editCustomBuilderEnabled, setEditCustomBuilderEnabled] = useState(false);
  const [editCustomBuilderMode, setEditCustomBuilderMode] = useState<CustomBuilderMode>('snackbox');
  const [editCustomBuilderMinQty, setEditCustomBuilderMinQty] = useState(10);
  const [editCustomBuilderPackagingLocal, setEditCustomBuilderPackagingLocal] = useState(0);
  const [editBioHandle, setEditBioHandle] = useState('');
  const [editBioTheme, setEditBioTheme] = useState<BioTheme>('saffron');
  const [editInstagram, setEditInstagram] = useState('');
  const [editGoogleMapsUrl, setEditGoogleMapsUrl] = useState('');
  const [editGoogleReviewUrl, setEditGoogleReviewUrl] = useState('');
  const [editCustomLinks, setEditCustomLinks] = useState<VendorBioLink[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkBadge, setNewLinkBadge] = useState('');
  const [editPlanTier, setEditPlanTier] = useState<PlanTier>('free');
  const [editBillingCycle, setEditBillingCycle] = useState<BillingCycle>('monthly');
  const [editLogo, setEditLogo] = useState('');
  const [editCover, setEditCover] = useState('');
  const [editGallery, setEditGallery] = useState<string[]>([]);
  const [editState, setEditState] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCustomCityMode, setEditCustomCityMode] = useState(false);
  const [editArea, setEditArea] = useState('');
  const [editExtraCities, setEditExtraCities] = useState('');
  const [editAllStatesCoverage, setEditAllStatesCoverage] = useState(false);
  const [editServiceStates, setEditServiceStates] = useState<string[]>([]);
  const [editStartingPriceLocal, setEditStartingPriceLocal] = useState('');
  const [editStartingPriceUnit, setEditStartingPriceUnit] = useState('per plate');
  const [editStartingPriceLabel, setEditStartingPriceLabel] = useState('');
  const [editSecondaryPriceLocal, setEditSecondaryPriceLocal] = useState('');
  const [editSecondaryPriceUnit, setEditSecondaryPriceUnit] = useState('per plate');
  const [editSecondaryPriceLabel, setEditSecondaryPriceLabel] = useState('');
  const [editShowSecondaryPrice, setEditShowSecondaryPrice] = useState(false);

  // Direct Online Ordering & UPI editor state
  const [editOrderAccepting, setEditOrderAccepting] = useState(true);
  const [editOrderDelivery, setEditOrderDelivery] = useState(true);
  const [editOrderPickup, setEditOrderPickup] = useState(true);
  const [editOrderCod, setEditOrderCod] = useState(true);
  const [editOrderDeliveryFeeLocal, setEditOrderDeliveryFeeLocal] = useState(0);
  const [editOrderFreeDeliveryLocal, setEditOrderFreeDeliveryLocal] = useState(0);
  const [editOrderMinAdvanceHours, setEditOrderMinAdvanceHours] = useState(2);
  const [editOrderTimeSlots, setEditOrderTimeSlots] = useState(
    DEFAULT_ORDERING_TIME_SLOTS.join(', ')
  );
  const [editOrderUpiId, setEditOrderUpiId] = useState('');
  const [editOrderUpiName, setEditOrderUpiName] = useState('');
  const [editOrderPaymentLink, setEditOrderPaymentLink] = useState('');
  const [editOrderPromoCodes, setEditOrderPromoCodes] = useState<VendorPromoCode[]>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoType, setNewPromoType] = useState<'percent' | 'flat'>('percent');
  const [newPromoValue, setNewPromoValue] = useState('10');
  const [newPromoMinLocal, setNewPromoMinLocal] = useState('0');
  const [customSectionOptions, setCustomSectionOptions] = useState<string[]>([]);
  const [addingCustomSection, setAddingCustomSection] = useState(false);
  const [newSectionInput, setNewSectionInput] = useState('');

  // Order Board filter state
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Event Board quoting state
  const [quotingRequestId, setQuotingRequestId] = useState<string | null>(null);
  const [quoteVendorId, setQuoteVendorId] = useState<string>('');
  const [quotePriceLocal, setQuotePriceLocal] = useState(usdToLocal(180, currency));
  const [quoteMessage, setQuoteMessage] = useState('');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [qrVendor, setQrVendor] = useState<Vendor | null>(null);
  const [promoVendor, setPromoVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    setProdPriceLocal(usdToLocal(40, currency));
    setQuotePriceLocal(usdToLocal(180, currency));
  }, [currency]);

  useEffect(() => {
    if (myVendors.length > 0 && !quoteVendorId) {
      setQuoteVendorId(myVendors[0].id);
    }
  }, [myVendors, quoteVendorId]);

  const populateVendorEditForm = useCallback(
    (v: Vendor) => {
      setEditingVendorId(v.id);
      setEditName(v.name);
      setEditCategory(v.category);
      setEditExtraCategories(
        Array.isArray(v.extraCategories)
          ? v.extraCategories.filter((c) => c && c !== v.category)
          : []
      );
      setEditTagline(v.tagline);
      setEditDescription(v.description);
      setEditWhatsapp(v.whatsappNumber);
      setEditPromoBanner(v.promoBanner || '');
      setEditChristmasSpecial(Boolean(v.christmasSpecial));
      setEditChristmasOffer(v.christmasOffer || '');
      const suggestedMode = v.customBuilderMode ?? suggestBuilderModeForCategory(v.category);
      setEditCustomBuilderEnabled(Boolean(v.customBuilderEnabled));
      setEditCustomBuilderMode(suggestedMode);
      setEditCustomBuilderMinQty(
        v.customBuilderMinQty ?? getCustomBuilderModeConfig(suggestedMode).defaultMinQty
      );
      setEditCustomBuilderPackagingLocal(
        v.customBuilderPackagingUsd && v.customBuilderPackagingUsd > 0
          ? usdToLocal(v.customBuilderPackagingUsd, currency)
          : 0
      );
      setEditBioHandle(getVendorBioHandle(v));
      setEditBioTheme(v.bioTheme ?? (v.marketplace === 'party' ? 'party' : 'saffron'));
      setEditInstagram(v.instagramHandle || '');
      setEditGoogleMapsUrl(v.googleMapsUrl || '');
      setEditGoogleReviewUrl(v.googleReviewUrl || '');
      setEditCustomLinks(v.customLinks ? [...v.customLinks] : []);
      setNewLinkTitle('');
      setNewLinkUrl('');
      setNewLinkBadge('');
      setEditPlanTier(v.planTier === 'pro' ? 'business' : v.planTier);
      setEditBillingCycle(v.orderingConfig?.billingCycle ?? 'monthly');
      setEditLogo(v.logo || '');
      setEditCover(v.image);
      setEditGallery(v.gallery ? [...v.gallery] : []);

      const countryRegions = STATES_BY_COUNTRY[v.country] || [];
      const rawState = (v.state || '').trim();
      const matchedState =
        countryRegions.find((s) => s.name.toLowerCase() === rawState.toLowerCase()) ||
        countryRegions[0];
      const resolvedState = matchedState
        ? rawState && matchedState.name.toLowerCase() === rawState.toLowerCase()
          ? matchedState.name
          : rawState || matchedState.name
        : rawState;
      const rawCity = (v.city || '').trim();
      const matchedCity = matchedState?.cities.find(
        (c) => c.toLowerCase() === rawCity.toLowerCase()
      );
      const resolvedCity = matchedCity || rawCity || matchedState?.cities[0] || '';

      setEditState(resolvedState);
      setEditCity(resolvedCity);
      setEditCustomCityMode(
        Boolean(resolvedCity && matchedState && !matchedState.cities.includes(resolvedCity))
      );
      setEditArea(v.area || '');
      setEditExtraCities(
        (v.serviceAreas || [])
          .filter(
            (a) =>
              a &&
              a !== v.city &&
              a !== v.area &&
              a !== v.state &&
              a !== `${v.city} Metro`
          )
          .join(', ')
      );
      setEditAllStatesCoverage(Boolean(v.allStatesCoverage));
      setEditServiceStates(Array.isArray(v.serviceStates) ? [...v.serviceStates] : []);

      const oc = v.orderingConfig;
      const resolvedUnit = getVendorStartingPriceUnit(v);
      setEditStartingPriceLocal(
        v.startingPriceUsd > 0 ? String(usdToLocal(v.startingPriceUsd, currency)) : ''
      );
      setEditStartingPriceUnit(resolvedUnit);
      setEditStartingPriceLabel(oc?.startingPriceLabel || '');
      const hasSec = Boolean(oc?.secondaryStartingPriceUsd && oc.secondaryStartingPriceUsd > 0);
      setEditShowSecondaryPrice(hasSec);
      setEditSecondaryPriceLocal(
        hasSec && oc?.secondaryStartingPriceUsd
          ? String(usdToLocal(oc.secondaryStartingPriceUsd, currency))
          : ''
      );
      setEditSecondaryPriceUnit(oc?.secondaryStartingPriceUnit || resolvedUnit);
      setEditSecondaryPriceLabel(oc?.secondaryStartingPriceLabel || '');
      setEditOrderAccepting(oc?.acceptingOrders !== false);
      setEditOrderDelivery(oc?.deliveryEnabled !== false);
      setEditOrderPickup(oc?.pickupEnabled !== false);
      setEditOrderCod(oc?.codEnabled !== false);
      setEditOrderDeliveryFeeLocal(
        oc?.deliveryFeeUsd && oc.deliveryFeeUsd > 0 ? usdToLocal(oc.deliveryFeeUsd, currency) : 0
      );
      setEditOrderFreeDeliveryLocal(
        oc?.freeDeliveryAboveUsd && oc.freeDeliveryAboveUsd > 0
          ? usdToLocal(oc.freeDeliveryAboveUsd, currency)
          : 0
      );
      setEditOrderMinAdvanceHours(oc?.minAdvanceHours ?? 2);
      setEditOrderTimeSlots(
        oc?.timeSlots && oc.timeSlots.length > 0
          ? oc.timeSlots.join(', ')
          : DEFAULT_ORDERING_TIME_SLOTS.join(', ')
      );
      setEditOrderUpiId(oc?.upiId || '');
      setEditOrderUpiName(oc?.upiPayeeName || v.name);
      setEditOrderPaymentLink(oc?.paymentLinkUrl || '');
      setEditOrderPromoCodes(oc?.promoCodes ? [...oc.promoCodes] : []);
      setNewPromoCode('');
      setNewPromoType('percent');
      setNewPromoValue('10');
      setNewPromoMinLocal('0');
    },
    [currency]
  );

  useEffect(() => {
    if (!isOpen || !initialEditVendorId) return;
    const target = myVendors.find((v) => v.id === initialEditVendorId);
    if (!target) return;
    setTab('storefronts');
    populateVendorEditForm(target);
    onClearInitialEdit?.();
  }, [isOpen, initialEditVendorId, myVendors, populateVendorEditForm, onClearInitialEdit]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !qrVendor && !promoVendor) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, qrVendor, promoVendor, onClose]);

  if (!isOpen) return null;

  const currencyMeta = CURRENCIES[currency];

  const startEditingVendor = (v: Vendor) => {
    if (editingVendorId === v.id) {
      setEditingVendorId(null);
      return;
    }
    populateVendorEditForm(v);
  };

  const handleToggleChristmasHighlight = async (v: Vendor) => {
    setBusyId(v.id);
    try {
      const next = !v.christmasSpecial;
      await updateVendorInCloud(v.id, { christmasSpecial: next });
      onNotify(
        next
          ? `${v.name} is now highlighted in the Christmas & New Year Spotlight!`
          : `Removed ${v.name} from the Christmas Spotlight.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      onNotify(
        msg.toLowerCase().includes('permission')
          ? 'Could not update — permission denied. Please refresh or sign in again.'
          : 'Could not update Christmas highlight. Please try again.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleCustomBuilder = async (v: Vendor) => {
    if (!isPaidPlanTier(v.planTier)) {
      onNotify(
        'Custom Plate / Box Menu Builder is a Business Plan feature. Free stores can add per-plate packages & catering offerings under Products & Packages.'
      );
      if (editingVendorId !== v.id) startEditingVendor(v);
      return;
    }
    setBusyId(v.id);
    try {
      const next = !v.customBuilderEnabled;
      const mode = v.customBuilderMode ?? suggestBuilderModeForCategory(v.category);
      const modeCfg = getCustomBuilderModeConfig(mode);
      await updateVendorInCloud(v.id, {
        customBuilderEnabled: next,
        customBuilderMode: mode,
        customBuilderMinQty: v.customBuilderMinQty ?? modeCfg.defaultMinQty,
      });
      if (editingVendorId === v.id) {
        setEditCustomBuilderEnabled(next);
        setEditCustomBuilderMode(mode);
      }
      onNotify(
        next
          ? `Enabled ${modeCfg.label} on ${v.name}! Customers can now build custom boxes/plates.`
          : `Turned OFF Custom Builder on ${v.name}.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      onNotify(
        msg.toLowerCase().includes('permission')
          ? 'Could not toggle Custom Builder — permission denied. Please check your sign-in.'
          : 'Could not toggle Custom Builder. Please try again.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleAddCustomBioLink = () => {
    const title = newLinkTitle.trim();
    const url = newLinkUrl.trim();
    if (!title || !url || editCustomLinks.length >= 8) return;
    setEditCustomLinks((prev) => [
      ...prev,
      {
        id: `link-${Date.now()}`,
        title: title.slice(0, 60),
        url: url.slice(0, 300),
        ...(newLinkBadge.trim() ? { badge: newLinkBadge.trim().slice(0, 24) } : {}),
      },
    ]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setNewLinkBadge('');
  };

  const handleAddPromoCode = () => {
    const code = newPromoCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20);
    const valNum = Number(newPromoValue);
    if (!code || !Number.isFinite(valNum) || valNum <= 0 || editOrderPromoCodes.length >= 10) {
      return;
    }
    const minLocal = Math.max(0, Number(newPromoMinLocal) || 0);
    const nextPromo: VendorPromoCode = {
      code,
      type: newPromoType,
      value:
        newPromoType === 'percent'
          ? Math.min(90, Math.round(valNum))
          : Math.max(0.5, Number(localToUsd(valNum, currency).toFixed(2))),
      ...(minLocal > 0 ? { minOrderUsd: Number(localToUsd(minLocal, currency).toFixed(2)) } : {}),
      active: true,
    };
    setEditOrderPromoCodes((prev) => [
      ...prev.filter((p) => p.code !== code),
      nextPromo,
    ]);
    setNewPromoCode('');
    setNewPromoValue('10');
    setNewPromoMinLocal('0');
  };

  const handleSaveVendorEdit = async (e: FormEvent, vendor: Vendor) => {
    e.preventDefault();
    setBusyId(vendor.id);
    try {
      const parsedSlots = editOrderTimeSlots
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);

      const parsedStartLocal = Number(editStartingPriceLocal);
      const hasValidStartPrice = Number.isFinite(parsedStartLocal) && parsedStartLocal > 0;
      const nextStartingPriceUsd = hasValidStartPrice
        ? Math.max(0.5, Number(localToUsd(parsedStartLocal, currency).toFixed(2)))
        : vendor.startingPriceUsd;
      const parsedSecLocal = Number(editSecondaryPriceLocal);
      const nextSecondaryUsd =
        editShowSecondaryPrice && Number.isFinite(parsedSecLocal) && parsedSecLocal > 0
          ? Math.max(0.5, Number(localToUsd(parsedSecLocal, currency).toFixed(2)))
          : undefined;

      const orderingConfig: VendorOrderingConfig = {
        enabled: true,
        acceptingOrders: editOrderAccepting,
        deliveryEnabled: editOrderDelivery,
        pickupEnabled: editOrderPickup,
        codEnabled: editOrderCod,
        deliveryFeeUsd:
          editOrderDeliveryFeeLocal > 0
            ? Number(localToUsd(editOrderDeliveryFeeLocal, currency).toFixed(2))
            : 0,
        freeDeliveryAboveUsd:
          editOrderFreeDeliveryLocal > 0
            ? Number(localToUsd(editOrderFreeDeliveryLocal, currency).toFixed(2))
            : 0,
        minAdvanceHours: Math.max(0, Math.min(168, Math.round(editOrderMinAdvanceHours || 0))),
        timeSlots: parsedSlots.length > 0 ? parsedSlots : [...DEFAULT_ORDERING_TIME_SLOTS],
        ...(editOrderUpiId.trim() ? { upiId: editOrderUpiId.trim().slice(0, 80) } : {}),
        ...(editOrderUpiName.trim() ? { upiPayeeName: editOrderUpiName.trim().slice(0, 80) } : {}),
        ...(editOrderPaymentLink.trim()
          ? { paymentLinkUrl: editOrderPaymentLink.trim().slice(0, 300) }
          : {}),
        promoCodes: editOrderPromoCodes,
        billingCycle: editBillingCycle,
        startingPriceUnit: editStartingPriceUnit.trim() || getVendorStartingPriceUnit(vendor),
        ...(editStartingPriceLabel.trim()
          ? { startingPriceLabel: editStartingPriceLabel.trim().slice(0, 40) }
          : {}),
        ...(hasValidStartPrice ? { customStartingPrice: true } : {}),
        ...(nextSecondaryUsd
          ? {
              secondaryStartingPriceUsd: nextSecondaryUsd,
              secondaryStartingPriceUnit:
                editSecondaryPriceUnit.trim() ||
                editStartingPriceUnit.trim() ||
                getVendorStartingPriceUnit(vendor),
              ...(editSecondaryPriceLabel.trim()
                ? { secondaryStartingPriceLabel: editSecondaryPriceLabel.trim().slice(0, 40) }
                : {}),
            }
          : {}),
      };

      const resolvedPrimaryCategory = editCategory.trim() || vendor.category;
      const cleanedExtraCategories = editExtraCategories.filter(
        (c) => c && c !== resolvedPrimaryCategory
      );

      await updateVendorInCloud(vendor.id, {
        name: editName,
        category: resolvedPrimaryCategory,
        extraCategories: cleanedExtraCategories,
        tagline: editTagline,
        description: editDescription,
        whatsappNumber: editWhatsapp,
        promoBanner: editPromoBanner,
        startingPriceUsd: nextStartingPriceUsd,
        christmasSpecial: editChristmasSpecial,
        christmasOffer: editChristmasOffer,
        customBuilderEnabled: isPaidPlanTier(editPlanTier) && editCustomBuilderEnabled,
        customBuilderMode: editCustomBuilderMode,
        customBuilderMinQty: Math.max(1, Math.min(5000, Math.round(editCustomBuilderMinQty || 10))),
        customBuilderPackagingUsd:
          editCustomBuilderPackagingLocal > 0
            ? Math.max(0, Math.min(500, localToUsd(editCustomBuilderPackagingLocal, currency)))
            : 0,
        bioHandle: editBioHandle,
        bioTheme: editBioTheme,
        instagramHandle: editInstagram,
        googleMapsUrl: editGoogleMapsUrl.trim(),
        googleReviewUrl: editGoogleReviewUrl.trim(),
        customLinks: editCustomLinks,
        orderingConfig,
        planTier: editPlanTier,
        monthlyAutoPay: editPlanTier !== 'free' && editBillingCycle === 'monthly',
        logo: editLogo,
        image: editCover,
        gallery: editGallery,
        state: editState.trim() || vendor.state,
        city: editCity.trim() || vendor.city,
        area: editArea.trim() || editCity.trim() || vendor.area,
        serviceAreas: [
          editArea.trim() || editCity.trim() || vendor.city,
          editCity.trim() || vendor.city,
          editState.trim() || vendor.state,
          ...editExtraCities
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        ].filter((val, idx, arr) => val && arr.indexOf(val) === idx),
        allStatesCoverage: editAllStatesCoverage,
        serviceStates: editAllStatesCoverage
          ? []
          : editServiceStates.filter((s) => s && s !== (editState.trim() || vendor.state)),
      });
      setEditingVendorId(null);
      onNotify(`Saved storefront, UPI & Direct Ordering updates for ${editName}!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      onNotify(
        msg.toLowerCase().includes('permission')
          ? 'Could not save storefront — permission denied. Please check your sign-in.'
          : 'Could not save storefront updates. Please check your inputs and try again.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleEditLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 220,
        maxHeight: 220,
        quality: 0.8,
        maxChars: 55000,
      });
      setEditLogo(dataUrl);
    } catch {
      onNotify('Could not process logo image. Try JPG or PNG.');
    }
  };

  const handleEditCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 960,
        maxHeight: 540,
        quality: 0.76,
        maxChars: 130000,
      });
      setEditCover(dataUrl);
    } catch {
      onNotify('Could not process cover photo. Try JPG or PNG.');
    }
  };

  const handleAddGalleryPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || editGallery.length >= 6) return;
    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 640,
        maxHeight: 480,
        quality: 0.7,
        maxChars: 85000,
      });
      setEditGallery((prev) => [...prev, dataUrl].slice(0, 6));
    } catch {
      onNotify('Could not process gallery photo. Try JPG or PNG.');
    }
  };

  const handleProductPhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 420,
        maxHeight: 320,
        quality: 0.62,
        maxChars: 24000,
      });
      setProdImage(dataUrl);
    } catch {
      onNotify('Could not read product photo. Please try a JPG or PNG.');
    }
  };

  const handleToggleStatus = async (vendor: Vendor) => {
    const nextStatus = vendor.status === 'paused' ? 'active' : 'paused';
    setBusyId(vendor.id);
    try {
      await updateVendorInCloud(vendor.id, { status: nextStatus });
      onNotify(
        nextStatus === 'active'
          ? `${vendor.name} is now live in public search.`
          : `${vendor.name} paused — hidden from public search.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleUpgradePlan = async (vendor: Vendor, nextPlan: PlanTier) => {
    setBusyId(vendor.id);
    try {
      await updateVendorInCloud(vendor.id, {
        planTier: nextPlan,
        monthlyAutoPay: nextPlan !== 'free',
      });
      onNotify(
        `${vendor.name} upgraded to ${nextPlan === 'free' ? 'Free Plan' : 'Business Plan (Direct Online Ordering unlocked)'}!`
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleProductStock = async (vendor: Vendor, productId: string) => {
    setBusyId(vendor.id);
    try {
      const target = vendor.products.find((p) => p.id === productId);
      if (!target) return;
      const nextInStock = target.inStock === false;
      const updatedProducts = vendor.products.map((p) =>
        p.id === productId ? { ...p, inStock: nextInStock } : p
      );
      await updateVendorInCloud(vendor.id, { products: updatedProducts });
      onNotify(
        nextInStock
          ? `"${target.name}" is back In Stock.`
          : `"${target.name}" marked as Sold Out on your storefront.`
      );
    } finally {
      setBusyId(null);
    }
  };

  const resetProductForm = () => {
    setProdName('');
    setProdUnitQty('1');
    setProdUnitType('kg');
    setProdServes('1 kg');
    setProdFoodType('');
    setProdDietaryTags([]);
    setProdColorOptions([]);
    setProdDisableColorSelector(false);
    setProdCustomColorInput('');
    setProdPriceLocal(usdToLocal(40, currency));
    setProdDesc('');
    setProdImage('');
    setProdMenuSection('');
    setProdAdvanceHours('');
    setProdBuilderSection('');
    setProdBuilderPresets([]);
    setProdVariants([]);
    setProdIsPackage(false);
    setProdIncludedItemsText('');
    setProdMinOrderQty('');
    setProdDishPickerSearch('');
    setEditingProductId(null);
    setAddingCustomSection(false);
    setNewSectionInput('');
  };

  const scrollToProductForm = (vendorId: string) => {
    window.requestAnimationFrame(() => {
      const el = document.getElementById(`vendor-product-form-${vendorId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const openAddProductForm = (vendorId: string, asPackage = false) => {
    if (addingProductForId === vendorId && !editingProductId && prodIsPackage === asPackage) {
      setAddingProductForId(null);
      resetProductForm();
      return;
    }
    resetProductForm();
    const targetVendor = myVendors.find((item) => item.id === vendorId);
    const isPartyVendor = targetVendor?.marketplace === 'party';
    if (isPartyVendor) {
      setProdUnitType('custom');
      setProdServes('Full Event · Custom');
    } else if (asPackage) {
      setProdIsPackage(true);
      setProdUnitType('custom');
      setProdServes('Per Plate');
      setProdPriceLocal(usdToLocal(3, currency)); // ~₹250 default in INR
      setProdMinOrderQty('20');
    }
    setAddingProductForId(vendorId);
    setConfirmDeleteProdKey(null);
    scrollToProductForm(vendorId);
  };

  const openEditProductForm = (vendorId: string, product: VendorProduct) => {
    const parsed = parseProductUnitFromServes(
      product.serves,
      product.unitQuantity,
      product.unitType
    );
    setAddingProductForId(vendorId);
    setEditingProductId(product.id);
    setConfirmDeleteProdKey(null);
    setProdName(product.name);
    setProdUnitQty(parsed.qty);
    setProdUnitType(parsed.unit);
    setProdServes(parsed.custom);
    setProdFoodType(product.foodType || '');
    setProdDietaryTags(product.dietaryTags ? [...product.dietaryTags] : []);
    const targetVendor = myVendors.find((item) => item.id === vendorId);
    const effectiveColors = targetVendor
      ? getEffectiveProductColorOptions(targetVendor, product)
      : product.colorOptions ?? [];
    setProdColorOptions([...effectiveColors]);
    setProdDisableColorSelector(Boolean(product.disableColorSelector));
    setProdCustomColorInput('');
    setProdPriceLocal(Math.max(1, usdToLocal(product.priceUsd, currency)));
    setProdDesc(product.description || '');
    setProdImage(product.image || '');
    setProdMenuSection(product.menuSection || '');
    setProdAdvanceHours(
      product.advanceHours && product.advanceHours > 0 ? String(product.advanceHours) : ''
    );
    setProdBuilderSection(product.builderSection || '');
    setProdBuilderPresets(product.builderPresets ? [...product.builderPresets] : []);
    setProdIsPackage(Boolean(product.isPackage));
    setProdIncludedItemsText(
      product.includedItems && product.includedItems.length > 0
        ? product.includedItems.join('\n')
        : ''
    );
    setProdMinOrderQty(
      product.minOrderQty && product.minOrderQty > 0 ? String(product.minOrderQty) : ''
    );
    setProdDishPickerSearch('');
    setProdVariants(
      product.variants && product.variants.length > 0
        ? product.variants.map((v) => ({
            id: v.id,
            label: v.label,
            priceLocal: String(Math.max(1, usdToLocal(v.priceUsd, currency))),
            serves: v.serves || '',
          }))
        : []
    );
    scrollToProductForm(vendorId);
  };

  const getBaseOneKgLocalPrice = () => {
    const qtyNum = Number(prodUnitQty);
    if (prodUnitType === 'kg' && Number.isFinite(qtyNum) && qtyNum > 0) {
      return prodPriceLocal / qtyNum;
    }
    if (prodUnitType === 'g' && Number.isFinite(qtyNum) && qtyNum > 0) {
      return (prodPriceLocal * 1000) / qtyNum;
    }
    return prodPriceLocal;
  };

  const roundNicePrice = (raw: number) => {
    if (raw >= 200) return Math.max(10, Math.round(raw / 10) * 10);
    return Math.max(1, Math.round(raw));
  };

  const toggleWeightPreset = (preset: (typeof CAKE_WEIGHT_PRESETS)[number]) => {
    setProdVariants((prev) => {
      const exists = prev.some(
        (v) => v.id === preset.id || v.label.toLowerCase() === preset.label.toLowerCase()
      );
      if (exists) {
        return prev.filter(
          (v) => v.id !== preset.id && v.label.toLowerCase() !== preset.label.toLowerCase()
        );
      }
      const base1Kg = getBaseOneKgLocalPrice();
      const suggested = roundNicePrice(base1Kg * preset.kgRatio);
      const next = [
        ...prev,
        {
          id: preset.id,
          label: preset.label,
          priceLocal: String(suggested),
          serves: preset.serves,
        },
      ];
      // Keep standard cake presets ordered naturally (500g -> 5 kg)
      const orderMap = new Map(CAKE_WEIGHT_PRESETS.map((p, i) => [p.id, i]));
      return next.sort((a, b) => (orderMap.get(a.id) ?? 99) - (orderMap.get(b.id) ?? 99));
    });
  };

  const autoFillCakeWeights = () => {
    const base1Kg = getBaseOneKgLocalPrice();
    const standardIds = new Set(['w-250g', 'w-500g', 'w-1kg', 'w-2kg', 'w-3kg', 'w-5kg']);
    const generated = CAKE_WEIGHT_PRESETS.filter((p) => standardIds.has(p.id)).map((preset) => ({
      id: preset.id,
      label: preset.label,
      priceLocal: String(roundNicePrice(base1Kg * preset.kgRatio)),
      serves: preset.serves,
    }));
    setProdVariants(generated);
  };

  const addCustomVariantRow = () => {
    if (prodVariants.length >= 12) return;
    setProdVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}-${prev.length + 1}`,
        label: '',
        priceLocal: String(Math.max(1, prodPriceLocal)),
        serves: '',
      },
    ]);
  };

  const toggleProdDietaryTag = (tag: string) => {
    setProdDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleProdColorOption = (colorName: string) => {
    setProdDisableColorSelector(false);
    setProdColorOptions((prev) =>
      prev.some((c) => c.toLowerCase() === colorName.toLowerCase())
        ? prev.filter((c) => c.toLowerCase() !== colorName.toLowerCase())
        : prev.length < 24
          ? [...prev, colorName]
          : prev
    );
  };

  const addCustomProdColor = () => {
    const cleaned = prodCustomColorInput.trim().slice(0, 36);
    if (!cleaned) return;
    setProdDisableColorSelector(false);
    setProdColorOptions((prev) => {
      if (prev.length >= 24 || prev.some((c) => c.toLowerCase() === cleaned.toLowerCase())) {
        return prev;
      }
      return [...prev, cleaned];
    });
    setProdCustomColorInput('');
  };

  const toggleProdBuilderPreset = (presetId: BuilderPresetId) => {
    setProdBuilderPresets((prev) =>
      prev.includes(presetId) ? prev.filter((p) => p !== presetId) : [...prev, presetId]
    );
  };

  const handleSaveProduct = async (e: FormEvent, vendor: Vendor) => {
    e.preventDefault();
    if (!prodName.trim()) return;
    setBusyId(vendor.id);
    try {
      const cleanedVariants: VendorProductVariant[] = prodVariants
        .map((v, idx) => {
          const label = v.label.trim().slice(0, 32);
          const localVal = Number(v.priceLocal);
          if (!label || !Number.isFinite(localVal) || localVal <= 0) return null;
          return {
            id: v.id || `var-${idx + 1}`,
            label,
            priceUsd: Math.max(0.5, localToUsd(localVal, currency)),
            ...(v.serves.trim() ? { serves: v.serves.trim().slice(0, 40) } : {}),
          };
        })
        .filter((v): v is VendorProductVariant => Boolean(v))
        .slice(0, 12);

      const formattedServes =
        cleanedVariants.length >= 2
          ? `${cleanedVariants[0].label} – ${cleanedVariants[cleanedVariants.length - 1].label}`
          : cleanedVariants.length === 1
            ? cleanedVariants[0].label
            : formatProductServesLabel(prodUnitQty, prodUnitType, prodServes);

      const resolvedPriceUsd =
        cleanedVariants.length > 0
          ? Math.min(...cleanedVariants.map((v) => v.priceUsd))
          : Math.max(1, localToUsd(prodPriceLocal, currency));

      let resolvedImage = prodImage || vendor.image;
      if (resolvedImage.startsWith('data:image/') && resolvedImage.length > 24000) {
        try {
          resolvedImage = await compressDataUrlImage(resolvedImage, {
            maxWidth: 420,
            maxHeight: 320,
            quality: 0.62,
            maxChars: 22000,
          });
        } catch {
          // Keep original if canvas re-compression fails
        }
      }

      const parsedAdvanceHours = Math.max(0, Math.min(168, Math.round(Number(prodAdvanceHours) || 0)));
      const parsedMinOrderQty = Math.max(0, Math.min(5000, Math.round(Number(prodMinOrderQty) || 0)));
      const parsedIncludedItems = prodIsPackage
        ? Array.from(
            new Set(
              prodIncludedItemsText
                .split(/[\n,]+/)
                .map((s) => s.replace(/^[-•*\d.)\s]+/, '').trim())
                .filter(Boolean)
                .map((s) => s.slice(0, 80))
            )
          ).slice(0, 40)
        : [];
      const existingProduct = editingProductId
        ? vendor.products.find((p) => p.id === editingProductId)
        : undefined;

      const isPartyStore = vendor.marketplace === 'party';
      const nextProd: VendorProduct = {
        id: editingProductId || `prod-${Date.now()}`,
        name: prodName.trim().slice(0, 100),
        serves: formattedServes.slice(0, 60),
        ...(!isPartyStore && prodUnitType !== 'custom' ? { unitQuantity: prodUnitQty.trim() || '1' } : {}),
        unitType: isPartyStore ? 'custom' : prodUnitType,
        ...(!isPartyStore && prodFoodType ? { foodType: prodFoodType } : {}),
        ...(!isPartyStore && prodDietaryTags.length > 0 ? { dietaryTags: prodDietaryTags } : {}),
        ...(isPartyStore && prodColorOptions.length > 0 ? { colorOptions: prodColorOptions } : {}),
        ...(isPartyStore &&
        prodColorOptions.length === 0 &&
        (prodDisableColorSelector ||
          (editingProductId &&
            isBalloonDecorProduct(vendor, {
              name: prodName.trim(),
              description: prodDesc.trim(),
              menuSection: prodMenuSection.trim(),
            })))
          ? { disableColorSelector: true }
          : {}),
        ...(prodMenuSection.trim() ? { menuSection: prodMenuSection.trim().slice(0, 48) } : {}),
        ...(parsedAdvanceHours > 0 ? { advanceHours: parsedAdvanceHours } : {}),
        ...(existingProduct?.inStock === false ? { inStock: false } : {}),
        ...(!isPartyStore && !prodIsPackage && prodBuilderSection.trim()
          ? { builderSection: prodBuilderSection.trim().slice(0, 60) }
          : {}),
        ...(!isPartyStore && !prodIsPackage && prodBuilderPresets.length > 0
          ? { builderPresets: prodBuilderPresets }
          : {}),
        ...(!isPartyStore && !prodIsPackage && cleanedVariants.length > 0 ? { variants: cleanedVariants } : {}),
        ...(!isPartyStore && prodIsPackage ? { isPackage: true } : {}),
        ...(!isPartyStore && prodIsPackage && parsedIncludedItems.length > 0
          ? { includedItems: parsedIncludedItems }
          : {}),
        ...(!isPartyStore && prodIsPackage && parsedMinOrderQty > 0 ? { minOrderQty: parsedMinOrderQty } : {}),
        priceUsd: resolvedPriceUsd,
        description:
          prodDesc.trim().slice(0, 400) ||
          (!isPartyStore && prodIsPackage && parsedIncludedItems.length > 0
            ? `Includes ${parsedIncludedItems.slice(0, 4).join(', ')}${parsedIncludedItems.length > 4 ? ` + ${parsedIncludedItems.length - 4} more` : ''}`
            : prodName.trim()),
        image: resolvedImage,
      };
      let updatedProducts = editingProductId
        ? vendor.products.map((p) =>
            p.id === editingProductId ? { ...nextProd, ...(p.tag ? { tag: p.tag } : {}) } : p
          )
        : [...vendor.products, nextProd];

      // Auto-optimize oversized inline product thumbnails to keep total vendor document compact
      // (well under Firestore's 1MB doc cap and cutting read/write quota usage by ~70%)
      const totalImageChars = updatedProducts.reduce(
        (sum, p) => sum + (p.image?.startsWith('data:image/') ? p.image.length : 0),
        0
      );
      if (totalImageChars > 420000) {
        const targetPerPhoto = Math.max(
          10000,
          Math.min(20000, Math.floor(420000 / Math.max(1, updatedProducts.length)))
        );
        updatedProducts = await Promise.all(
          updatedProducts.map(async (p) => {
            if (!p.image || !p.image.startsWith('data:image/') || p.image.length <= targetPerPhoto) {
              return p;
            }
            try {
              const smaller = await compressDataUrlImage(p.image, {
                maxWidth: 360,
                maxHeight: 270,
                quality: 0.58,
                maxChars: targetPerPhoto,
              });
              return { ...p, image: smaller };
            } catch {
              return p;
            }
          })
        );
      }

      const nextStartingUsd = vendor.orderingConfig?.customStartingPrice
        ? vendor.startingPriceUsd
        : updatedProducts.length > 0
          ? Math.min(...updatedProducts.map((p) => p.priceUsd))
          : vendor.startingPriceUsd;

      await updateVendorInCloud(vendor.id, {
        products: updatedProducts,
        startingPriceUsd: nextStartingUsd,
      });
      const wasEdit = Boolean(editingProductId);
      resetProductForm();
      setAddingProductForId(null);
      onNotify(
        wasEdit
          ? `Updated "${nextProd.name}" on ${vendor.name} in the cloud!`
          : `Added "${nextProd.name}" to ${vendor.name} in the cloud!`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const lower = msg.toLowerCase();
      onNotify(
        lower.includes('quota') || lower.includes('resource-exhausted')
          ? 'Firestore daily quota temporarily reached. Your existing products are safe — wait a moment or upgrade quota in Firebase Console.'
          : lower.includes('permission')
            ? 'Could not save product — permission denied. Please refresh or sign in again.'
            : lower.includes('exceeds the maximum') || lower.includes('too large')
              ? 'Storefront photo data is too large. Try using smaller or fewer product photos.'
              : 'Could not save product right now. Please try again.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveProduct = async (vendor: Vendor, productId: string) => {
    setBusyId(vendor.id);
    try {
      const remaining = vendor.products.filter((p) => p.id !== productId);
      await updateVendorInCloud(vendor.id, {
        products: remaining,
        ...(!vendor.orderingConfig?.customStartingPrice && remaining.length > 0
          ? { startingPriceUsd: Math.min(...remaining.map((p) => p.priceUsd)) }
          : {}),
      });
      if (editingProductId === productId) {
        resetProductForm();
        setAddingProductForId(null);
      }
      setConfirmDeleteProdKey(null);
      onNotify(`Deleted product from ${vendor.name}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      onNotify(
        msg.toLowerCase().includes('permission')
          ? 'Could not remove product — permission denied. Please refresh or sign in again.'
          : 'Could not remove product right now. Please try again.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    setBusyId(vendor.id);
    try {
      await deleteVendorInCloud(vendor.id);
      setConfirmDeleteVendorId(null);
      onNotify(`${vendor.name} removed from cloud directory.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      onNotify(
        msg.toLowerCase().includes('permission')
          ? 'Could not delete storefront — permission denied. Please refresh or sign in again.'
          : 'Could not delete storefront right now. Please try again.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateVendorGps = async (vendor: Vendor) => {
    setBusyId(vendor.id);
    try {
      const coords = await requestBrowserGpsLocation();
      await updateVendorInCloud(vendor.id, { lat: coords.lat, lng: coords.lng });
      onNotify(`Updated ${vendor.name} GPS pin to ${coords.lat}, ${coords.lng}.`);
    } catch (err) {
      onNotify(
        err instanceof Error
          ? err.message
          : 'Could not read GPS location. Allow location permission and try again.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitQuote = async (e: FormEvent, req: EventRequest) => {
    e.preventDefault();
    if (!user) return;
    const chosenVendor = myVendors.find((v) => v.id === quoteVendorId) ?? myVendors[0];
    if (!chosenVendor) {
      onNotify('Publish a storefront first so you can send quotes on Event Board leads!');
      return;
    }
    if (quoteMessage.trim().length < 5) return;

    setBusyId(req.id);
    try {
      await submitEventQuoteInCloud(
        req,
        user.uid,
        chosenVendor,
        Math.max(1, localToUsd(quotePriceLocal, currency)),
        quoteMessage.trim()
      );
      setQuotingRequestId(null);
      setQuoteMessage('');
      onNotify(`Quote sent to ${req.customerName} for ${req.occasion} in ${req.city}!`);
    } finally {
      setBusyId(null);
    }
  };

  const handleLeadStatus = async (
    leadId: string,
    status:
      | 'New Order'
      | 'Accepted'
      | 'Preparing'
      | 'Out for Delivery'
      | 'Confirmed Enquiry'
      | 'Completed'
      | 'Cancelled'
  ) => {
    setBusyId(leadId);
    try {
      await updateBookingStatusInCloud(leadId, status);
      onNotify(`Order status updated to "${status}".`);
    } finally {
      setBusyId(null);
    }
  };

  const buildOrderStatusWhatsAppHref = (lead: BookingEnquiry) => {
    const rawDigits = (lead.customerEmail || '').replace(/[^\d]/g, '');
    const hasPhone = rawDigits.length >= 10 && rawDigits.length <= 15;
    const msg = [
      `Hi ${lead.customerName}!`,
      `Update on your order ${lead.reference} with ${lead.vendorName}:`,
      `Status: ${lead.status}`,
      `Order: ${lead.packageName}`,
      `Date: ${lead.eventDate}`,
      `Thank you for ordering directly with us!`,
    ].join('\n');
    return hasPhone
      ? `https://wa.me/${rawDigits}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Vendor Cloud Dashboard"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-brand-foreground">
              <Store className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-foreground">
                Vendor Cloud Portal, Analytics &amp; Event Board
              </h2>
              <p className="text-xs text-muted-foreground">
                {user
                  ? `Signed in as ${user.displayName || user.email}`
                  : 'Sign in with Google, Phone, or Email to manage storefronts, quote leads & track views'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && onOpenGrowthHub && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGrowthHub();
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-brand-foreground"
              >
                <BookOpen className="size-3.5" aria-hidden="true" />
                <span>Growth Tips</span>
              </button>
            )}
            {onOpenPricingKit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPricingKit();
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-brand-foreground"
              >
                <Calculator className="size-3.5" aria-hidden="true" />
                Cake Pricing Kit
              </button>
            )}
            {user && (
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <LogOut className="size-3.5" aria-hidden="true" />
                Sign out
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Vendor Dashboard"
              className="grid size-9 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Body */}
        {!user ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Store className="size-7" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-xl font-extrabold text-foreground">
              Sign in to open your Vendor Portal
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Sign in with Google, Phone + Password, or Email to edit your storefront, upload
              photos, view real-time analytics, and quote incoming local event requests.
            </p>
            <button
              type="button"
              onClick={() => void onSignIn()}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-brand-foreground shadow-md transition-transform hover:scale-[1.02] hover:bg-brand-hover"
            >
              <LogIn className="size-4" aria-hidden="true" />
              Sign In / Vendor Login
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-6 py-3">
              <div className="inline-flex flex-wrap rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setTab('storefronts')}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === 'storefronts'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  My Storefronts ({myVendors.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab('growth')}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === 'growth'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Globe2 className="size-3.5 text-brand" aria-hidden="true" />
                  Google &amp; Growth
                </button>
                <button
                  type="button"
                  onClick={() => setTab('board')}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === 'board'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Megaphone className="size-3.5 text-brand" aria-hidden="true" />
                  Event Board ({openEventRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab('leads')}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === 'leads'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ShoppingBag className="size-3.5 text-brand" aria-hidden="true" />
                  Orders &amp; Leads ({vendorLeads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab('mystery-boxes')}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === 'mystery-boxes'
                      ? 'bg-[#6B21A8] text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Gift className="size-3.5" aria-hidden="true" />
                  Mystery Boxes
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenListModal('free');
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Publish New Storefront
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'storefronts' ? (
                myVendors.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                    <p className="text-base font-bold text-foreground">
                      You haven&apos;t published a cloud storefront yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Start on our Free Plan (₹0 forever) or Business Plan (₹499/mo Auto-Pay or
                      ₹4,990/yr · 2 months free) with Direct Online Ordering &amp; 0% commission.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenListModal('free');
                      }}
                      className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      Create My First Storefront
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {myVendors.map((v) => {
                      const isBusy = busyId === v.id;
                      const isPaused = v.status === 'paused';
                      const isEditing = editingVendorId === v.id;
                      return (
                        <div
                          key={v.id}
                          className="rounded-2xl border border-border bg-background p-5"
                        >
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-extrabold text-foreground">
                                  {v.name}
                                </h3>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    isPaused
                                      ? 'bg-amber-500/15 text-amber-600'
                                      : 'bg-emerald-500/15 text-emerald-600'
                                  }`}
                                >
                                  {isPaused ? 'Paused' : 'Live in Cloud'}
                                </span>
                                {v.planTier !== 'free' && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
                                    <Crown className="size-3" aria-hidden="true" />
                                    Business Partner
                                  </span>
                                )}
                                {v.customBuilderEnabled && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-extrabold text-brand-foreground">
                                    <Package className="size-3" aria-hidden="true" />
                                    {
                                      getCustomBuilderModeConfig(
                                        v.customBuilderMode ??
                                          suggestBuilderModeForCategory(v.category)
                                      ).label
                                    }
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {v.category} · {v.city}, {v.state}, {v.country} · Bio:{' '}
                                <span className="font-mono font-semibold text-brand">
                                  findmybites.com/fmb/{getVendorBioHandle(v)}
                                </span>
                              </p>
                              {v.promoBanner && (
                                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand">
                                  <Sparkles className="size-3" aria-hidden="true" />
                                  Offer: {v.promoBanner}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {onOpenBioLink && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onOpenBioLink(v);
                                  }}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                                >
                                  <Link2 className="size-3.5" aria-hidden="true" />
                                  Bio Link
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenVendorWebsite(v);
                                }}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
                              >
                                <ExternalLink className="size-3.5" aria-hidden="true" />
                                Storefront
                              </button>
                              <button
                                type="button"
                                onClick={() => setPromoVendor(v)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-brand-border bg-brand-soft/60 px-2.5 py-1.5 text-xs font-bold text-brand hover:bg-brand-soft"
                              >
                                <Instagram className="size-3.5" aria-hidden="true" />
                                Story Card
                              </button>
                              <button
                                type="button"
                                onClick={() => setQrVendor(v)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
                              >
                                <QrCode className="size-3.5" aria-hidden="true" />
                                QR
                              </button>
                              <button
                                type="button"
                                onClick={() => startEditingVendor(v)}
                                className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                                  isEditing
                                    ? 'border-brand bg-brand text-brand-foreground shadow-xs'
                                    : 'border-brand bg-brand text-brand-foreground shadow-xs hover:bg-brand-hover'
                                }`}
                              >
                                <Edit3 className="size-3.5" aria-hidden="true" />
                                {isEditing ? 'Close Editor' : 'Edit Storefront'}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleUpdateVendorGps(v)}
                                title={`Current pin: ${v.lat}, ${v.lng}`}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand disabled:opacity-50"
                              >
                                <LocateFixed className="size-3.5 text-brand" aria-hidden="true" />
                                Set GPS
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleToggleCustomBuilder(v)}
                                title={
                                  isPaidPlanTier(v.planTier)
                                    ? 'Toggle Custom Plate / Box Menu Builder'
                                    : 'Business Plan feature — Free stores list per-plate packages & catering offerings'
                                }
                                className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                                  !isPaidPlanTier(v.planTier)
                                    ? 'border-border bg-muted/60 text-muted-foreground hover:border-brand/50 hover:text-foreground'
                                    : v.customBuilderEnabled
                                      ? 'border-brand bg-brand text-brand-foreground hover:bg-brand-hover'
                                      : 'border-brand-border bg-brand-soft/45 text-brand hover:bg-brand-soft'
                                }`}
                              >
                                {isPaidPlanTier(v.planTier) ? (
                                  <Package className="size-3.5" aria-hidden="true" />
                                ) : (
                                  <Crown className="size-3.5 text-brand" aria-hidden="true" />
                                )}
                                {!isPaidPlanTier(v.planTier)
                                  ? 'Menu Builder · Business'
                                  : v.customBuilderEnabled
                                    ? 'Builder ON'
                                    : 'Custom Builder'}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleToggleChristmasHighlight(v)}
                                className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                                  v.christmasSpecial
                                    ? 'border-emerald-500 bg-emerald-700 text-white hover:bg-emerald-800'
                                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300'
                                }`}
                              >
                                <Snowflake className="size-3.5" aria-hidden="true" />
                                {v.christmasSpecial ? 'In Christmas' : 'Highlight Xmas'}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleToggleStatus(v)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50"
                              >
                                {isPaused ? (
                                  <>
                                    <PlayCircle className="size-3.5 text-emerald-500" />
                                    Resume
                                  </>
                                ) : (
                                  <>
                                    <PauseCircle className="size-3.5 text-amber-500" />
                                    Pause
                                  </>
                                )}
                              </button>
                              {confirmDeleteVendorId === v.id ? (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1">
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => void handleDeleteVendor(v)}
                                    className="cursor-pointer rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
                                  >
                                    Delete Store
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteVendorId(null)}
                                    className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setConfirmDeleteVendorId(v.id)}
                                  aria-label={`Delete ${v.name}`}
                                  title="Delete storefront"
                                  className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground hover:border-red-500 hover:text-red-500 disabled:opacity-50"
                                >
                                  <Trash2 className="size-3.5" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Real Cloud Analytics Strip */}
                          <StorefrontAnalyticsStrip
                            vendor={v}
                            currency={currency}
                            onUpgradePlan={(target, plan) => void handleUpgradePlan(target, plan)}
                          />

                          {/* Full Storefront & Gallery Editor */}
                          {isEditing && (
                            <form
                              onSubmit={(e) => void handleSaveVendorEdit(e, v)}
                              className="mt-4 space-y-3 rounded-2xl border border-brand-border bg-brand-soft/25 p-4"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-extrabold uppercase tracking-wide text-brand">
                                  Edit Storefront, Offer Banner &amp; Portfolio Gallery
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setEditingVendorId(null)}
                                  className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                                >
                                  Cancel
                                </button>
                              </div>

                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="block text-[11px] font-semibold text-foreground">
                                    Business Name
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-foreground">
                                    WhatsApp Number
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={editWhatsapp}
                                    onChange={(e) => setEditWhatsapp(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                                  />
                                </div>
                              </div>

                              {/* Primary + Multi-Select Categories */}
                              {(() => {
                                const availableCats: readonly string[] =
                                  v.marketplace === 'party' ? PARTY_CATEGORIES : FOOD_CATEGORIES;
                                const extraOptions = availableCats.filter(
                                  (c) => c !== editCategory
                                );
                                return (
                                  <div className="space-y-2.5 rounded-xl border border-border bg-background/80 p-3">
                                    <div>
                                      <label className="block text-[11px] font-semibold text-foreground">
                                        {v.marketplace === 'party'
                                          ? 'Primary Event Category'
                                          : 'Primary Food Category'}
                                      </label>
                                      <select
                                        value={editCategory}
                                        onChange={(e) => {
                                          const nextCat = e.target.value;
                                          setEditCategory(nextCat);
                                          setEditExtraCategories((prev) =>
                                            prev.filter((c) => c !== nextCat)
                                          );
                                        }}
                                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                      >
                                        {!availableCats.includes(editCategory) && editCategory && (
                                          <option value={editCategory}>{editCategory}</option>
                                        )}
                                        {availableCats.map((cat) => (
                                          <option key={cat} value={cat}>
                                            {cat}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <div className="flex flex-wrap items-center justify-between gap-1">
                                        <label className="block text-[11px] font-semibold text-foreground">
                                          Also List This Store Under (Multi-Select Categories)
                                        </label>
                                        <span className="text-[10px] font-semibold text-brand">
                                          {editExtraCategories.length + 1}{' '}
                                          {editExtraCategories.length === 0
                                            ? 'category'
                                            : 'categories'}{' '}
                                          selected
                                        </span>
                                      </div>
                                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                                        Select all services this store offers so customers find it under every selected category without creating another store.
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {extraOptions.map((cat) => {
                                          const checked = editExtraCategories.includes(cat);
                                          return (
                                            <button
                                              key={cat}
                                              type="button"
                                              onClick={() =>
                                                setEditExtraCategories((prev) =>
                                                  prev.includes(cat)
                                                    ? prev.filter((item) => item !== cat)
                                                    : [...prev, cat]
                                                )
                                              }
                                              className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                                checked
                                                  ? 'border-brand bg-brand text-brand-foreground shadow-xs'
                                                  : 'border-border bg-card text-foreground hover:border-brand/60 hover:bg-brand-soft/40'
                                              }`}
                                            >
                                              {checked && (
                                                <Check className="size-3 shrink-0" aria-hidden="true" />
                                              )}
                                              {cat}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="block text-[11px] font-semibold text-foreground">
                                    Tagline
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={editTagline}
                                    onChange={(e) => setEditTagline(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-foreground">
                                    Seasonal / Festival Promo Banner (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    maxLength={120}
                                    value={editPromoBanner}
                                    onChange={(e) => setEditPromoBanner(e.target.value)}
                                    placeholder="e.g. 10% Off Wedding Cakes this month!"
                                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-foreground">
                                  About Description
                                </label>
                                <textarea
                                  rows={2}
                                  required
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                />
                              </div>

                              {/* Starting Price Box Editor */}
                              <div className="space-y-2.5 rounded-xl border border-brand-border/70 bg-brand-soft/30 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-foreground">
                                    Starting Price Card (Shown at Top Right of Storefront)
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setEditShowSecondaryPrice((prev) => !prev)}
                                    className="cursor-pointer rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-foreground hover:border-brand hover:text-brand"
                                  >
                                    {editShowSecondaryPrice ? 'Hide 2nd Row' : '+ Add 2nd Price Row'}
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  <div>
                                    <label className="block text-[10px] font-semibold text-foreground">
                                      Starting Price ({CURRENCIES[currency].symbol.trim()})
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={editStartingPriceLocal}
                                      onChange={(e) => setEditStartingPriceLocal(e.target.value)}
                                      placeholder={v.marketplace === 'party' ? 'e.g. 15000' : 'e.g. 200'}
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs font-semibold text-foreground"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-semibold text-foreground">
                                      Price Unit
                                    </label>
                                    <select
                                      value={editStartingPriceUnit}
                                      onChange={(e) => setEditStartingPriceUnit(e.target.value)}
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                    >
                                      {STARTING_PRICE_UNIT_OPTIONS.map((unit) => (
                                        <option key={unit} value={unit}>
                                          {unit}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-semibold text-foreground">
                                      Right-Side Label
                                    </label>
                                    <input
                                      type="text"
                                      maxLength={40}
                                      value={editStartingPriceLabel}
                                      onChange={(e) => setEditStartingPriceLabel(e.target.value)}
                                      placeholder={v.marketplace === 'party' ? 'e.g. Starting Package' : 'e.g. Veg Price'}
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                    />
                                  </div>
                                </div>
                                {editShowSecondaryPrice && (
                                  <div className="grid grid-cols-1 gap-2 border-t border-border/60 pt-2 sm:grid-cols-3">
                                    <div>
                                      <label className="block text-[10px] font-semibold text-foreground">
                                        2nd Price ({CURRENCIES[currency].symbol.trim()})
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={editSecondaryPriceLocal}
                                        onChange={(e) => setEditSecondaryPriceLocal(e.target.value)}
                                        placeholder={v.marketplace === 'party' ? 'e.g. 50000' : 'e.g. 350'}
                                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs font-semibold text-foreground"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-semibold text-foreground">
                                        2nd Unit
                                      </label>
                                      <select
                                        value={editSecondaryPriceUnit}
                                        onChange={(e) => setEditSecondaryPriceUnit(e.target.value)}
                                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                      >
                                        {STARTING_PRICE_UNIT_OPTIONS.map((unit) => (
                                          <option key={unit} value={unit}>
                                            {unit}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-semibold text-foreground">
                                        2nd Label
                                      </label>
                                      <input
                                        type="text"
                                        maxLength={40}
                                        value={editSecondaryPriceLabel}
                                        onChange={(e) => setEditSecondaryPriceLabel(e.target.value)}
                                        placeholder={v.marketplace === 'party' ? 'e.g. Wedding Package' : 'e.g. Non-Veg Price'}
                                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Location, Custom City & Pan-India / Multi-State Delivery Coverage */}
                              {(() => {
                                const editRegions = STATES_BY_COUNTRY[v.country] || [];
                                const activeEditState = editState || v.state || editRegions[0]?.name || '';
                                const editStateObj =
                                  editRegions.find(
                                    (s) => s.name.toLowerCase() === activeEditState.toLowerCase()
                                  ) || editRegions[0];
                                const hasCustomStateOption =
                                  Boolean(activeEditState) &&
                                  !editRegions.some(
                                    (s) => s.name.toLowerCase() === activeEditState.toLowerCase()
                                  );
                                return (
                                  <div className="space-y-3 rounded-xl border border-border bg-card p-3">
                                    <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-foreground">
                                      <MapPin className="size-3.5 text-brand" aria-hidden="true" />
                                      Location, Custom Cities &amp; Delivery Coverage ({v.country})
                                    </p>
                                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                      <div>
                                        <label className="block text-[11px] font-semibold text-foreground">
                                          {COUNTRY_REGION_LABEL[v.country]}
                                        </label>
                                        <select
                                          value={editStateObj && !hasCustomStateOption ? editStateObj.name : activeEditState}
                                          onChange={(e) => {
                                            const nextSt = e.target.value;
                                            setEditState(nextSt);
                                            const stObj = editRegions.find((s) => s.name === nextSt);
                                            if (stObj) {
                                              setEditCity(stObj.cities[0] || stObj.name);
                                              setEditCustomCityMode(false);
                                            }
                                          }}
                                          className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                        >
                                          {hasCustomStateOption && (
                                            <option value={activeEditState}>{activeEditState}</option>
                                          )}
                                          {editRegions.map((st) => (
                                            <option key={st.name} value={st.name}>
                                              {st.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      <div>
                                        <div className="flex items-center justify-between gap-1">
                                          <label className="block text-[11px] font-semibold text-foreground">
                                            City
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (editCustomCityMode) {
                                                setEditCustomCityMode(false);
                                                if (
                                                  editStateObj?.cities[0] &&
                                                  !editStateObj.cities.includes(editCity)
                                                ) {
                                                  setEditCity(editStateObj.cities[0]);
                                                }
                                              } else {
                                                setEditCustomCityMode(true);
                                                setEditCity('');
                                              }
                                            }}
                                            className="cursor-pointer text-[10px] font-bold text-brand hover:underline"
                                          >
                                            {editCustomCityMode ? 'Pick list' : '+ Custom City'}
                                          </button>
                                        </div>
                                        {editCustomCityMode ||
                                        (editStateObj &&
                                          !editStateObj.cities.includes(editCity) &&
                                          editCity.trim() !== '') ? (
                                          <input
                                            type="text"
                                            required
                                            value={editCity}
                                            onChange={(e) => setEditCity(e.target.value)}
                                            placeholder="Type custom city name"
                                            className="mt-1 w-full rounded-lg border border-brand/60 bg-background px-2.5 py-1.5 text-xs text-foreground"
                                          />
                                        ) : (
                                          <select
                                            value={editCity}
                                            onChange={(e) => {
                                              if (e.target.value === '__custom__') {
                                                setEditCustomCityMode(true);
                                                setEditCity('');
                                              } else {
                                                setEditCity(e.target.value);
                                              }
                                            }}
                                            className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                          >
                                            {(editStateObj?.cities || [editCity]).map((ct) => (
                                              <option key={ct} value={ct}>
                                                {ct}
                                              </option>
                                            ))}
                                            <option value="__custom__">+ Create Custom City…</option>
                                          </select>
                                        )}
                                      </div>

                                      <div>
                                        <label className="block text-[11px] font-semibold text-foreground">
                                          Locality / Area
                                        </label>
                                        <input
                                          type="text"
                                          value={editArea}
                                          onChange={(e) => setEditArea(e.target.value)}
                                          placeholder="e.g. Jubilee Hills"
                                          className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-semibold text-foreground">
                                        Additional Delivery Cities (Optional, comma separated)
                                      </label>
                                      <input
                                        type="text"
                                        value={editExtraCities}
                                        onChange={(e) => setEditExtraCities(e.target.value)}
                                        placeholder="e.g. Secunderabad, Vijayawada, Khammam"
                                        className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                      />
                                    </div>

                                    <StateCoveragePicker
                                      country={v.country}
                                      primaryState={editState || v.state}
                                      allStatesCoverage={editAllStatesCoverage}
                                      serviceStates={editServiceStates}
                                      onChangeAllStates={setEditAllStatesCoverage}
                                      onChangeServiceStates={setEditServiceStates}
                                      compact
                                    />
                                  </div>
                                );
                              })()}

                              {/* Christmas & New Year Spotlight Controls (Food / FindMyBites Only) */}
                              {v.marketplace !== 'party' && (
                              <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/85 p-3 text-white">
                                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-amber-200">
                                  <input
                                    type="checkbox"
                                    checked={editChristmasSpecial}
                                    onChange={(e) => setEditChristmasSpecial(e.target.checked)}
                                    className="size-4 accent-amber-400"
                                  />
                                  <Snowflake className="size-3.5" aria-hidden="true" />
                                  <span>Highlight in Christmas &amp; New Year 2026 Spotlight</span>
                                </label>
                                {editChristmasSpecial && (
                                  <input
                                    type="text"
                                    maxLength={140}
                                    value={editChristmasOffer}
                                    onChange={(e) => setEditChristmasOffer(e.target.value)}
                                    placeholder="Christmas menu highlight (e.g. Rum Plum Cakes, Yule Logs & NYE Hampers)"
                                    className="mt-2 w-full rounded-lg border border-white/25 bg-black/30 px-2.5 py-1.5 text-xs text-white placeholder:text-white/50"
                                  />
                                )}
                              </div>
                              )}

                              {/* Custom Plate / Snack Box / Meal Box Builder Controls (Food Only, Business Plan) */}
                              {v.marketplace !== 'party' && (
                              <div className="rounded-xl border border-brand-border bg-card p-3">
                                {!isPaidPlanTier(editPlanTier) ? (
                                  <div className="flex flex-wrap items-start justify-between gap-2.5">
                                    <div className="flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                                          <Package className="size-3.5 text-brand" aria-hidden="true" />
                                          Custom Plate / Snack Box / Meal Box Menu Builder
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-foreground">
                                          <Crown className="size-2.5" aria-hidden="true" />
                                          Business Plan Only
                                        </span>
                                      </div>
                                      <p className="mt-1 text-[11px] text-muted-foreground">
                                        Free stores can add per-plate packages &amp; list what you offer in catering under <strong>Products &amp; Packages</strong> below. Upgrade to the Business Plan above to unlock the interactive Build Your Own Plate / Box Menu Builder.
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setEditPlanTier('business')}
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-bold text-brand-foreground hover:bg-brand-hover"
                                    >
                                      <Crown className="size-3" aria-hidden="true" />
                                      Switch to Business
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <label className="flex cursor-pointer items-start gap-2 text-xs font-bold text-foreground">
                                      <input
                                        type="checkbox"
                                        checked={editCustomBuilderEnabled}
                                        onChange={(e) => setEditCustomBuilderEnabled(e.target.checked)}
                                        className="mt-0.5 size-4 accent-[#ef6c22]"
                                      />
                                      <div className="flex-1">
                                        <span className="inline-flex items-center gap-1.5 text-brand">
                                          <Package className="size-3.5" aria-hidden="true" />
                                          Enable Custom Plate / Snack Box / Meal Box Builder
                                        </span>
                                        <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                                          Let customers pick individual items from your catalog to build their own custom box or catering plate &amp; order directly on WhatsApp.
                                        </p>
                                      </div>
                                    </label>
                                  </>
                                )}

                                {isPaidPlanTier(editPlanTier) && editCustomBuilderEnabled && (
                                  <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-border pt-3 sm:grid-cols-3">
                                    <div>
                                      <label className="block text-[11px] font-semibold text-foreground">
                                        Builder Mode
                                      </label>
                                      <select
                                        value={editCustomBuilderMode}
                                        onChange={(e) => {
                                          const nextMode = e.target.value as CustomBuilderMode;
                                          setEditCustomBuilderMode(nextMode);
                                          setEditCustomBuilderMinQty(
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
                                        Minimum{' '}
                                        {getCustomBuilderModeConfig(editCustomBuilderMode).unitPlural}
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        max={5000}
                                        value={editCustomBuilderMinQty}
                                        onChange={(e) =>
                                          setEditCustomBuilderMinQty(
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
                                        value={editCustomBuilderPackagingLocal}
                                        onChange={(e) =>
                                          setEditCustomBuilderPackagingLocal(
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

                              {/* Direct Online Ordering, UPI, Time Slots & Promo Codes */}
                              <div className="space-y-3 rounded-xl border border-emerald-500/35 bg-card p-3.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                      <ShoppingBag className="size-3.5" aria-hidden="true" />
                                      Direct Online Ordering &amp; Direct UPI Checkout (0% Commission)
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      Accept Pickup/Delivery orders with date/time slots, cake message, promo codes &amp; direct UPI QR.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = `https://www.findmybites.com/v/${v.slug}?menu=1`;
                                      navigator.clipboard?.writeText(url).catch(() => {});
                                      onNotify(`Copied Clean QR Menu link: ${url}`);
                                    }}
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-bold text-foreground hover:border-brand hover:text-brand"
                                  >
                                    <Copy className="size-3" aria-hidden="true" />
                                    Copy QR Menu Link
                                  </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 border-b border-border pb-2.5 text-xs">
                                  <label className="inline-flex cursor-pointer items-center gap-1.5 font-bold text-foreground">
                                    <input
                                      type="checkbox"
                                      checked={editOrderAccepting}
                                      onChange={(e) => setEditOrderAccepting(e.target.checked)}
                                      className="size-4 accent-emerald-600"
                                    />
                                    Store Open (Accepting Online Orders)
                                  </label>
                                  <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-foreground">
                                    <input
                                      type="checkbox"
                                      checked={editOrderDelivery}
                                      onChange={(e) => setEditOrderDelivery(e.target.checked)}
                                      className="size-3.5 accent-[#ef6c22]"
                                    />
                                    Delivery
                                  </label>
                                  <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-foreground">
                                    <input
                                      type="checkbox"
                                      checked={editOrderPickup}
                                      onChange={(e) => setEditOrderPickup(e.target.checked)}
                                      className="size-3.5 accent-[#ef6c22]"
                                    />
                                    Self Pickup
                                  </label>
                                  <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-foreground">
                                    <input
                                      type="checkbox"
                                      checked={editOrderCod}
                                      onChange={(e) => setEditOrderCod(e.target.checked)}
                                      className="size-3.5 accent-[#ef6c22]"
                                    />
                                    Pay on Delivery/Pickup
                                  </label>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-foreground">
                                      Delivery Fee ({currencyMeta.symbol.trim()})
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={50000}
                                      value={editOrderDeliveryFeeLocal}
                                      onChange={(e) =>
                                        setEditOrderDeliveryFeeLocal(
                                          Math.max(0, Number(e.target.value) || 0)
                                        )
                                      }
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-foreground">
                                      Free Delivery Above ({currencyMeta.symbol.trim()})
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={500000}
                                      value={editOrderFreeDeliveryLocal}
                                      onChange={(e) =>
                                        setEditOrderFreeDeliveryLocal(
                                          Math.max(0, Number(e.target.value) || 0)
                                        )
                                      }
                                      placeholder="0 = disabled"
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-foreground">
                                      Min Pre-Order Notice (Hours)
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={168}
                                      value={editOrderMinAdvanceHours}
                                      onChange={(e) =>
                                        setEditOrderMinAdvanceHours(
                                          Math.max(0, Math.min(168, Number(e.target.value) || 0))
                                        )
                                      }
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-semibold text-foreground">
                                    Delivery / Pickup Time Slots (comma separated)
                                  </label>
                                  <input
                                    type="text"
                                    value={editOrderTimeSlots}
                                    onChange={(e) => setEditOrderTimeSlots(e.target.value)}
                                    placeholder="10:00 AM – 12:00 PM, 12:00 PM – 3:00 PM, 3:00 PM – 6:00 PM, 6:00 PM – 9:00 PM"
                                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                  />
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-foreground">
                                      Direct UPI ID (0% fee QR)
                                    </label>
                                    <input
                                      type="text"
                                      value={editOrderUpiId}
                                      onChange={(e) => setEditOrderUpiId(e.target.value)}
                                      placeholder="yourbakery@okicici"
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-foreground">
                                      UPI Account / Business Name
                                    </label>
                                    <input
                                      type="text"
                                      value={editOrderUpiName}
                                      onChange={(e) => setEditOrderUpiName(e.target.value)}
                                      placeholder={v.name}
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-foreground">
                                      Razorpay / Stripe Link (Optional)
                                    </label>
                                    <input
                                      type="url"
                                      value={editOrderPaymentLink}
                                      onChange={(e) => setEditOrderPaymentLink(e.target.value)}
                                      placeholder="https://rzp.io/l/..."
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                    />
                                  </div>
                                </div>

                                {/* Promo Codes Builder */}
                                <div className="border-t border-border pt-2.5">
                                  <p className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                                    <Tag className="size-3 text-brand" aria-hidden="true" />
                                    Promo / Discount Codes ({editOrderPromoCodes.length}/10)
                                  </p>
                                  {editOrderPromoCodes.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                      {editOrderPromoCodes.map((pc) => (
                                        <span
                                          key={pc.code}
                                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-200"
                                        >
                                          {pc.code} ·{' '}
                                          {pc.type === 'percent'
                                            ? `${pc.value}% OFF`
                                            : `${formatMoney(pc.value, currency)} OFF`}
                                          {pc.minOrderUsd
                                            ? ` (min ${formatMoney(pc.minOrderUsd, currency)})`
                                            : ''}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditOrderPromoCodes((prev) =>
                                                prev.filter((item) => item.code !== pc.code)
                                              )
                                            }
                                            className="cursor-pointer text-muted-foreground hover:text-rose-600"
                                            aria-label={`Remove promo ${pc.code}`}
                                          >
                                            <X className="size-3" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {editOrderPromoCodes.length < 10 && (
                                    <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-12">
                                      <input
                                        type="text"
                                        value={newPromoCode}
                                        onChange={(e) =>
                                          setNewPromoCode(e.target.value.toUpperCase())
                                        }
                                        placeholder="Code (e.g. FEST10)"
                                        className="rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs uppercase text-foreground sm:col-span-3"
                                      />
                                      <select
                                        value={newPromoType}
                                        onChange={(e) =>
                                          setNewPromoType(e.target.value as 'percent' | 'flat')
                                        }
                                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold text-foreground sm:col-span-3"
                                      >
                                        <option value="percent">% Discount</option>
                                        <option value="flat">
                                          Flat {currencyMeta.symbol.trim()} Off
                                        </option>
                                      </select>
                                      <input
                                        type="number"
                                        min={1}
                                        value={newPromoValue}
                                        onChange={(e) => setNewPromoValue(e.target.value)}
                                        placeholder="Value"
                                        className="rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground sm:col-span-2"
                                      />
                                      <input
                                        type="number"
                                        min={0}
                                        value={newPromoMinLocal}
                                        onChange={(e) => setNewPromoMinLocal(e.target.value)}
                                        placeholder={`Min ${currencyMeta.symbol.trim()}`}
                                        className="rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground sm:col-span-2"
                                      />
                                      <button
                                        type="button"
                                        onClick={handleAddPromoCode}
                                        className="col-span-2 cursor-pointer rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-bold text-background hover:opacity-90 sm:col-span-2"
                                      >
                                        + Add
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Branding + Plan (Free vs Business · Monthly Auto-Pay or Yearly 2 Months Free) */}
                              <div className="flex flex-wrap items-center gap-2">
                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand">
                                  <ImagePlus className="size-3.5" aria-hidden="true" />
                                  {editLogo ? 'Change Logo' : 'Upload Logo'}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => void handleEditLogoUpload(e)}
                                    className="hidden"
                                  />
                                </label>
                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand">
                                  <ImagePlus className="size-3.5" aria-hidden="true" />
                                  Change Cover Photo
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => void handleEditCoverUpload(e)}
                                    className="hidden"
                                  />
                                </label>
                                <select
                                  aria-label="Listing plan tier"
                                  value={editPlanTier}
                                  onChange={(e) => setEditPlanTier(e.target.value as PlanTier)}
                                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground"
                                >
                                  {SAAS_PLANS.map((plan) => (
                                    <option key={plan.id} value={plan.id}>
                                      {plan.name} (
                                      {plan.id === 'free'
                                        ? `${formatPlanPrice(plan, currency)} forever`
                                        : editBillingCycle === 'annual'
                                          ? `${formatPlanPrice(plan, currency, 'annual')}/yr · 2 mo free`
                                          : `${formatPlanPrice(plan, currency, 'monthly')}/mo Auto-Pay`}
                                      )
                                    </option>
                                  ))}
                                </select>
                                {editPlanTier !== 'free' && (
                                  <div className="inline-flex rounded-lg border border-border bg-background p-0.5 text-[11px] font-bold">
                                    <button
                                      type="button"
                                      onClick={() => setEditBillingCycle('monthly')}
                                      className={`cursor-pointer rounded-md px-2 py-1 transition-colors ${
                                        editBillingCycle === 'monthly'
                                          ? 'bg-brand text-brand-foreground'
                                          : 'text-muted-foreground hover:text-foreground'
                                      }`}
                                    >
                                      Monthly Auto-Pay
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditBillingCycle('annual')}
                                      className={`cursor-pointer rounded-md px-2 py-1 transition-colors ${
                                        editBillingCycle === 'annual'
                                          ? 'bg-emerald-600 text-white'
                                          : 'text-muted-foreground hover:text-foreground'
                                      }`}
                                    >
                                      Yearly (2 Mo Free)
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Portfolio Gallery (up to 6) */}
                              <div className="border-t border-border pt-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-[11px] font-bold text-foreground">
                                    Portfolio Gallery ({editGallery.length}/6 photos)
                                  </p>
                                  {editGallery.length < 6 && (
                                    <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-brand hover:underline">
                                      <Plus className="size-3.5" aria-hidden="true" />
                                      Add Gallery Photo
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => void handleAddGalleryPhoto(e)}
                                        className="hidden"
                                      />
                                    </label>
                                  )}
                                </div>
                                {editGallery.length > 0 && (
                                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                                    {editGallery.map((imgUrl, i) => (
                                      <div
                                        key={`${imgUrl.slice(0, 20)}-${i}`}
                                        className="relative aspect-square overflow-hidden rounded-lg border border-border"
                                      >
                                        <img
                                          src={imgUrl}
                                          alt={`Gallery ${i + 1}`}
                                          className="h-full w-full object-cover"
                                        />
                                        <button
                                          type="button"
                                          aria-label="Remove gallery photo"
                                          onClick={() =>
                                            setEditGallery((prev) =>
                                              prev.filter((_, idx) => idx !== i)
                                            )
                                          }
                                          className="absolute right-1 top-1 grid size-5 cursor-pointer place-items-center rounded-full bg-black/70 text-white hover:bg-red-600"
                                        >
                                          <X className="size-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* FMB Bio-Link (Linktree) Settings */}
                              <div className="space-y-3 border-t border-border pt-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-brand">
                                    <Link2 className="size-3.5" aria-hidden="true" />
                                    FindMyBites Link-in-Bio (Your Short Bio Page)
                                  </p>
                                  <span className="font-mono text-[11px] text-muted-foreground">
                                    findmybites.com/fmb/{editBioHandle || v.slug}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-foreground">
                                      Short Bio Handle
                                    </label>
                                    <input
                                      type="text"
                                      maxLength={50}
                                      value={editBioHandle}
                                      onChange={(e) =>
                                        setEditBioHandle(
                                          e.target.value
                                            .toLowerCase()
                                            .replace(/[^a-z0-9-]+/g, '-')
                                        )
                                      }
                                      placeholder="e.g. govada-bakery"
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-foreground">
                                      Bio Page Theme
                                    </label>
                                    <select
                                      value={editBioTheme}
                                      onChange={(e) => setEditBioTheme(e.target.value as BioTheme)}
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground"
                                    >
                                      <option value="saffron">Sunset Saffron (Food)</option>
                                      <option value="party">PimpMyParty Neon (Events)</option>
                                      <option value="cream">Artisan Cream (Bakery)</option>
                                      <option value="midnight">Midnight Luxe (Gold)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-foreground">
                                      Instagram Handle (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      maxLength={80}
                                      value={editInstagram}
                                      onChange={(e) => setEditInstagram(e.target.value)}
                                      placeholder="@yourbakery"
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-foreground">
                                      Google Maps Place Link (Optional)
                                    </label>
                                    <input
                                      type="url"
                                      maxLength={300}
                                      value={editGoogleMapsUrl}
                                      onChange={(e) => setEditGoogleMapsUrl(e.target.value)}
                                      placeholder="https://maps.app.goo.gl/..."
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-foreground">
                                      Google Review Link (Optional)
                                    </label>
                                    <input
                                      type="url"
                                      maxLength={300}
                                      value={editGoogleReviewUrl}
                                      onChange={(e) => setEditGoogleReviewUrl(e.target.value)}
                                      placeholder="https://g.page/r/.../review"
                                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                    />
                                  </div>
                                </div>

                                {/* Custom External Bio Links (Swiggy, Zomato, Talabat, Reviews, Website, Reels) */}
                                <div className="rounded-xl border border-border bg-card p-3">
                                  <p className="text-[11px] font-bold text-foreground">
                                    Extra Bio Links ({editCustomLinks.length}/8) — Swiggy, Zomato,
                                    Talabat, Google Reviews, Menu PDF, YouTube
                                  </p>

                                  {editCustomLinks.length > 0 && (
                                    <div className="mt-2 space-y-1.5">
                                      {editCustomLinks.map((lnk) => (
                                        <div
                                          key={lnk.id}
                                          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
                                        >
                                          <div className="min-w-0">
                                            <span className="font-semibold text-foreground">
                                              {lnk.title}
                                            </span>
                                            {lnk.badge && (
                                              <span className="ml-1.5 rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">
                                                {lnk.badge}
                                              </span>
                                            )}
                                            <p className="truncate font-mono text-[10px] text-muted-foreground">
                                              {lnk.url}
                                            </p>
                                          </div>
                                          <button
                                            type="button"
                                            aria-label={`Remove ${lnk.title}`}
                                            onClick={() =>
                                              setEditCustomLinks((prev) =>
                                                prev.filter((item) => item.id !== lnk.id)
                                              )
                                            }
                                            className="cursor-pointer text-muted-foreground hover:text-red-500"
                                          >
                                            <Trash2 className="size-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {editCustomLinks.length < 8 && (
                                    <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-12">
                                      <input
                                        type="text"
                                        value={newLinkTitle}
                                        onChange={(e) => setNewLinkTitle(e.target.value)}
                                        placeholder="Button title (e.g. Order on Zomato)"
                                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground sm:col-span-4"
                                      />
                                      <input
                                        type="text"
                                        value={newLinkUrl}
                                        onChange={(e) => setNewLinkUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground sm:col-span-4"
                                      />
                                      <input
                                        type="text"
                                        value={newLinkBadge}
                                        onChange={(e) => setNewLinkBadge(e.target.value)}
                                        placeholder="Subtitle (optional)"
                                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground sm:col-span-2"
                                      />
                                      <button
                                        type="button"
                                        onClick={handleAddCustomBioLink}
                                        className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-bold text-background hover:opacity-90 sm:col-span-2"
                                      >
                                        <Plus className="size-3.5" />
                                        Add
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <button
                                  type="submit"
                                  disabled={isBusy}
                                  className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-xs font-bold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
                                >
                                  Save Storefront Updates
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Live Product Catalog Editor */}
                          <div className="mt-4 border-t border-border pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-bold text-foreground">
                                  Products &amp; Ready Packages ({v.products.length})
                                </p>
                                {v.products.some((p) => p.isPackage) && (
                                  <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-background p-0.5 text-[11px] font-bold">
                                    {(
                                      [
                                        { id: 'all', label: `All (${v.products.length})` },
                                        {
                                          id: 'packages',
                                          label: `Ready Packages (${v.products.filter((p) => p.isPackage).length})`,
                                        },
                                        {
                                          id: 'items',
                                          label: `Dishes (${v.products.filter((p) => !p.isPackage).length})`,
                                        },
                                      ] as const
                                    ).map((tabOpt) => (
                                      <button
                                        key={tabOpt.id}
                                        type="button"
                                        onClick={() => setProdListFilter(tabOpt.id)}
                                        className={`cursor-pointer rounded-md px-2 py-0.5 transition-colors ${
                                          prodListFilter === tabOpt.id
                                            ? 'bg-brand text-brand-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        {tabOpt.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {v.products.length === 0 ? (
                              <p className="mt-2 rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                                No products listed yet. Click <strong>+ Add Product</strong> or{' '}
                                <strong>+ Add Ready-Made Package</strong> below.
                              </p>
                            ) : (
                              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                                {v.products
                                  .filter((p) => {
                                    if (prodListFilter === 'packages') return Boolean(p.isPackage);
                                    if (prodListFilter === 'items') return !p.isPackage;
                                    return true;
                                  })
                                  .map((p) => {
                                  const delKey = `${v.id}:${p.id}`;
                                  const isEditingThis =
                                    addingProductForId === v.id && editingProductId === p.id;
                                  return (
                                    <div
                                      key={p.id}
                                      className={`flex items-start justify-between gap-2.5 rounded-xl border px-3 py-2.5 text-xs transition-colors ${
                                        isEditingThis
                                          ? 'border-brand bg-brand-soft/30'
                                          : p.isPackage
                                            ? 'border-amber-500/40 bg-amber-500/5'
                                            : 'border-border bg-card'
                                      }`}
                                    >
                                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                        {p.image && (
                                          <div className="flex aspect-[4/3] w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white dark:bg-neutral-900">
                                            <img
                                              src={p.image}
                                              alt={p.name}
                                              className="h-full w-full object-contain object-center"
                                            />
                                          </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <p className="truncate font-semibold text-foreground">
                                              {p.name}
                                            </p>
                                            {p.isPackage && (
                                              <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-300">
                                                Ready Package
                                              </span>
                                            )}
                                            <FoodTypeBadge foodType={p.foodType} size="xs" />
                                          </div>
                                          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                                            {p.variants && p.variants.length > 1 ? 'From ' : ''}
                                            {formatMoney(p.priceUsd, currency)} · {p.serves}
                                            {p.minOrderQty ? ` · Min ${p.minOrderQty}` : ''}
                                          </p>
                                          {p.isPackage &&
                                            p.includedItems &&
                                            p.includedItems.length > 0 && (
                                              <p className="mt-1 line-clamp-2 text-[11px] text-foreground/80">
                                                <strong className="text-brand">
                                                  {p.includedItems.length} items:
                                                </strong>{' '}
                                                {p.includedItems.join(', ')}
                                              </p>
                                            )}
                                          {p.variants && p.variants.length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                              {p.variants.map((variant) => (
                                                <span
                                                  key={variant.id}
                                                  className="rounded border border-brand-border bg-brand-soft/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-foreground"
                                                >
                                                  {variant.label} ·{' '}
                                                  {formatMoney(variant.priceUsd, currency)}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                          {(p.builderSection ||
                                            (p.builderPresets && p.builderPresets.length > 0)) && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                              {p.builderSection && (
                                                <span className="rounded border border-brand-border bg-brand-soft/60 px-1.5 py-0.5 text-[10px] font-bold text-brand">
                                                  {p.builderSection}
                                                </span>
                                              )}
                                              {p.builderPresets?.map((pid) => {
                                                const meta = BUILDER_PRESET_OPTIONS.find(
                                                  (opt) => opt.id === pid
                                                );
                                                return (
                                                  <span
                                                    key={pid}
                                                    className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300"
                                                  >
                                                    {meta?.shortLabel ?? pid}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          )}
                                          {p.dietaryTags && p.dietaryTags.length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                              {p.dietaryTags.map((tag) => (
                                                <span
                                                  key={tag}
                                                  className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                                                >
                                                  {tag}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                          {p.colorOptions && p.colorOptions.length > 0 && (
                                            <div className="mt-1 flex flex-wrap items-center gap-1">
                                              {p.colorOptions.slice(0, 6).map((colorName) => (
                                                <span
                                                  key={colorName}
                                                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground"
                                                >
                                                  <span
                                                    className="size-2.5 shrink-0 rounded-full border border-black/20"
                                                    style={{ backgroundColor: getBalloonColorSwatchHex(colorName) }}
                                                    aria-hidden="true"
                                                  />
                                                  {colorName}
                                                </span>
                                              ))}
                                              {p.colorOptions.length > 6 && (
                                                <span className="text-[10px] font-bold text-brand">
                                                  +{p.colorOptions.length - 6} colors
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => void handleToggleProductStock(v, p.id)}
                                          title={
                                            p.inStock === false
                                              ? 'Mark back In Stock'
                                              : 'Mark Sold Out on menu'
                                          }
                                          className={`cursor-pointer rounded-md border px-2 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                                            p.inStock === false
                                              ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300'
                                              : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300'
                                          }`}
                                        >
                                          {p.inStock === false ? 'Sold Out' : 'In Stock'}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isBusy}
                                          onClick={() => openEditProductForm(v.id, p)}
                                          aria-label={`Edit ${p.name}`}
                                          title="Edit product"
                                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
                                        >
                                          <Edit3 className="size-3" aria-hidden="true" />
                                          Edit
                                        </button>

                                        {confirmDeleteProdKey === delKey ? (
                                          <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => void handleRemoveProduct(v, p.id)}
                                            className="cursor-pointer rounded-md bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                                          >
                                            Confirm
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => setConfirmDeleteProdKey(delKey)}
                                            aria-label={`Delete ${p.name}`}
                                            title="Delete product"
                                            className="grid size-7 cursor-pointer place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-rose-500/50 hover:text-rose-600 disabled:opacity-50"
                                          >
                                            <Trash2 className="size-3.5" aria-hidden="true" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                              {v.marketplace !== 'party' && (
                                <button
                                  type="button"
                                  onClick={() => openAddProductForm(v.id, true)}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-500/60 bg-amber-500/15 px-3.5 py-2 text-xs font-extrabold text-amber-900 transition-colors hover:bg-amber-500 hover:text-white dark:text-amber-200"
                                >
                                  <Plus className="size-3.5" aria-hidden="true" />
                                  {addingProductForId === v.id && !editingProductId && prodIsPackage
                                    ? 'Close Package Form'
                                    : 'Add Ready-Made Package'}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openAddProductForm(v.id, false)}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand bg-brand-soft/70 px-3.5 py-2 text-xs font-bold text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
                              >
                                <Plus className="size-3.5" aria-hidden="true" />
                                {addingProductForId === v.id && !editingProductId && !prodIsPackage
                                  ? 'Close Form'
                                  : v.marketplace === 'party'
                                    ? 'Add Event Package / Service'
                                    : 'Add Product / Dish'}
                              </button>
                            </div>

                            {addingProductForId === v.id && (
                              <form
                                id={`vendor-product-form-${v.id}`}
                                onSubmit={(e) => void handleSaveProduct(e, v)}
                                className="mt-3 space-y-3 rounded-xl border border-brand-border bg-brand-soft/25 p-3.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-xs font-extrabold text-foreground">
                                      {v.marketplace === 'party'
                                        ? editingProductId
                                          ? 'Edit Event Package / Service'
                                          : 'Add New Event Package / Service'
                                        : editingProductId
                                          ? prodIsPackage
                                            ? 'Edit Ready-Made Package'
                                            : 'Edit Product Details'
                                          : prodIsPackage
                                            ? 'Add Ready-Made Per-Plate Package / Deal'
                                            : 'Add New Product / Dish'}
                                    </p>
                                    {v.marketplace !== 'party' && (
                                      <div className="inline-flex rounded-lg border border-border bg-background p-0.5 text-[11px] font-bold">
                                        <button
                                          type="button"
                                          onClick={() => setProdIsPackage(false)}
                                          className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors ${
                                            !prodIsPackage
                                              ? 'bg-brand text-brand-foreground'
                                              : 'text-muted-foreground hover:text-foreground'
                                          }`}
                                        >
                                          Single Dish / Product
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setProdIsPackage(true);
                                            if (prodUnitType !== 'custom') {
                                              setProdUnitType('custom');
                                              setProdServes('Per Plate');
                                            }
                                          }}
                                          className={`cursor-pointer rounded-md px-2.5 py-1 transition-colors ${
                                            prodIsPackage
                                              ? 'bg-amber-600 text-white'
                                              : 'text-muted-foreground hover:text-foreground'
                                          }`}
                                        >
                                          Ready-Made Package (₹/plate)
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      resetProductForm();
                                      setAddingProductForId(null);
                                    }}
                                    className="cursor-pointer text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                                  >
                                    Cancel
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                                  <input
                                    type="text"
                                    required
                                    value={prodName}
                                    onChange={(e) => setProdName(e.target.value)}
                                    placeholder={
                                      v.marketplace === 'party'
                                        ? 'Package / Service Name (e.g. Wedding Stage Decor)'
                                        : prodIsPackage
                                          ? 'Package Name (e.g. ₹250 Classic Veg Catering Plate)'
                                          : 'Product Name (e.g. Belgian Truffle Cake)'
                                    }
                                    className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-medium text-foreground focus:border-brand focus:outline-none sm:col-span-5"
                                  />

                                  {/* Scope / Duration (Party) OR Quantity + Unit (Food) */}
                                  <div className="flex items-center gap-1.5 sm:col-span-4">
                                    {v.marketplace === 'party' ? (
                                      <input
                                        type="text"
                                        value={prodServes}
                                        onChange={(e) => setProdServes(e.target.value)}
                                        placeholder="e.g. Full Event / 4 Hours / Up to 150 Guests"
                                        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                                      />
                                    ) : (
                                      <>
                                        {prodUnitType === 'custom' ? (
                                          <input
                                            type="text"
                                            value={prodServes}
                                            onChange={(e) => setProdServes(e.target.value)}
                                            placeholder="e.g. Serves 10-12"
                                            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                                          />
                                        ) : (
                                          <input
                                            type="number"
                                            step="any"
                                            min="0.1"
                                            value={prodUnitQty}
                                            onChange={(e) => setProdUnitQty(e.target.value)}
                                            placeholder="Qty"
                                            aria-label="Quantity"
                                            className="w-20 rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-xs tabular-nums text-foreground focus:border-brand focus:outline-none"
                                          />
                                        )}
                                        <select
                                          aria-label="Product Unit"
                                          value={prodUnitType}
                                          onChange={(e) =>
                                            setProdUnitType(e.target.value as ProductUnitType)
                                          }
                                          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2 py-2 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
                                        >
                                          {PRODUCT_UNIT_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                      </>
                                    )}
                                  </div>

                                  <div className="relative sm:col-span-3">
                                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted-foreground">
                                      {currencyMeta.symbol.trim()}
                                    </span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={50000000}
                                      required
                                      value={prodPriceLocal}
                                      onChange={(e) =>
                                        setProdPriceLocal(Math.max(1, Number(e.target.value) || 0))
                                      }
                                      placeholder={`Price (${currencyMeta.code})`}
                                      className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-2.5 font-mono text-xs tabular-nums text-foreground focus:border-brand focus:outline-none"
                                    />
                                  </div>
                                </div>

                                {/* Balloon / Decor Color Options (Event & Party Stores) */}
                                {v.marketplace === 'party' && (
                                  <div className="space-y-2.5 rounded-xl border border-brand-border/70 bg-background/85 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div>
                                        <p className="text-[11px] font-extrabold text-foreground">
                                          Balloon / Decor Color Options (Optional)
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                          Choose the balloon colors customers can select when booking this decor package.
                                        </p>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-1">
                                        {BALLOON_COLOR_QUICK_PACKS.map((pack) => (
                                          <button
                                            key={pack.label}
                                            type="button"
                                            onClick={() => {
                                              setProdDisableColorSelector(false);
                                              setProdColorOptions((prev) =>
                                                Array.from(new Set([...prev, ...pack.colors])).slice(0, 24)
                                              );
                                            }}
                                            className="cursor-pointer rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
                                          >
                                            + {pack.label}
                                          </button>
                                        ))}
                                        {prodColorOptions.length > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setProdColorOptions([]);
                                              setProdDisableColorSelector(true);
                                            }}
                                            className="cursor-pointer rounded-md border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:border-rose-500/50 hover:text-rose-600"
                                          >
                                            Clear ({prodColorOptions.length})
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5">
                                      {BALLOON_COLOR_PRESETS.map((preset) => {
                                        const selected = prodColorOptions.some(
                                          (c) => c.toLowerCase() === preset.name.toLowerCase()
                                        );
                                        return (
                                          <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => toggleProdColorOption(preset.name)}
                                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                              selected
                                                ? 'border-brand bg-brand text-brand-foreground shadow-xs'
                                                : 'border-border bg-card text-foreground hover:border-brand/60'
                                            }`}
                                          >
                                            <span
                                              className="size-3 shrink-0 rounded-full border border-black/20 shadow-2xs"
                                              style={{ backgroundColor: preset.hex }}
                                              aria-hidden="true"
                                            />
                                            <span>{preset.name}</span>
                                            {selected && <Check className="size-3 shrink-0" aria-hidden="true" />}
                                          </button>
                                        );
                                      })}
                                      {prodColorOptions
                                        .filter(
                                          (c) =>
                                            !BALLOON_COLOR_PRESETS.some(
                                              (p) => p.name.toLowerCase() === c.toLowerCase()
                                            )
                                        )
                                        .map((customColor) => (
                                          <button
                                            key={customColor}
                                            type="button"
                                            onClick={() => toggleProdColorOption(customColor)}
                                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-brand bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-foreground shadow-xs"
                                          >
                                            <span
                                              className="size-3 shrink-0 rounded-full border border-white/40"
                                              style={{ backgroundColor: getBalloonColorSwatchHex(customColor) }}
                                              aria-hidden="true"
                                            />
                                            <span>{customColor}</span>
                                            <X className="size-3 shrink-0" aria-hidden="true" />
                                          </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <input
                                        type="text"
                                        value={prodCustomColorInput}
                                        onChange={(e) => setProdCustomColorInput(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addCustomProdColor();
                                          }
                                        }}
                                        maxLength={36}
                                        placeholder="Add custom balloon color (e.g. Confetti Gold, Teal, Burgundy)"
                                        className="min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] text-foreground focus:border-brand focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={addCustomProdColor}
                                        disabled={!prodCustomColorInput.trim() || prodColorOptions.length >= 24}
                                        className="cursor-pointer rounded-lg border border-brand bg-brand-soft px-2.5 py-1.5 text-[11px] font-bold text-brand transition-colors hover:bg-brand hover:text-brand-foreground disabled:opacity-50"
                                      >
                                        + Add Color
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {v.marketplace !== 'party' && (
                                  prodIsPackage ? (
                                  /* Ready-Made Package / Per-Plate Deal: Included Food List + Min Plates */
                                  <div className="space-y-2.5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div>
                                        <p className="text-xs font-extrabold text-foreground">
                                          Included Food List in This Package
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                          Type one dish per line (or separated by commas) — customers will see this exact menu under your Ready Packages tab.
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <label className="text-[11px] font-bold text-foreground">
                                          Min Plates / Qty:
                                        </label>
                                        <input
                                          type="number"
                                          min={1}
                                          max={5000}
                                          value={prodMinOrderQty}
                                          onChange={(e) => setProdMinOrderQty(e.target.value)}
                                          placeholder="e.g. 20"
                                          className="w-20 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-foreground focus:border-brand focus:outline-none"
                                        />
                                      </div>
                                    </div>

                                    <textarea
                                      rows={4}
                                      value={prodIncludedItemsText}
                                      onChange={(e) => setProdIncludedItemsText(e.target.value)}
                                      placeholder={`Welcome Drink\nPaneer Tikka (Starter)\nVeg Dum Biryani\nPaneer Butter Masala\nRumali Roti & Dal Tadka\nGulab Jamun, Raita & Salad`}
                                      className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground focus:border-brand focus:outline-none"
                                    />

                                    {/* 1-Tap Quick Picker from Vendor's Existing Individual Dishes */}
                                    {v.products.some((p) => !p.isPackage) && (() => {
                                      const existingDishes = v.products.filter((p) => !p.isPackage);
                                      const currentList = prodIncludedItemsText
                                        .split(/[\n,]+/)
                                        .map((s) => s.trim().toLowerCase())
                                        .filter(Boolean);
                                      const q = prodDishPickerSearch.trim().toLowerCase();
                                      const filteredDishes = existingDishes
                                        .filter((d) => !q || d.name.toLowerCase().includes(q))
                                        .slice(0, 24);

                                      const toggleDishInPackage = (dishName: string) => {
                                        const lines = prodIncludedItemsText
                                          .split(/[\n,]+/)
                                          .map((s) => s.trim())
                                          .filter(Boolean);
                                        const existsIdx = lines.findIndex(
                                          (l) => l.toLowerCase() === dishName.toLowerCase()
                                        );
                                        if (existsIdx >= 0) {
                                          lines.splice(existsIdx, 1);
                                        } else {
                                          lines.push(dishName);
                                        }
                                        setProdIncludedItemsText(lines.join('\n'));
                                      };

                                      return (
                                        <div className="space-y-1.5 border-t border-amber-500/25 pt-2">
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-[11px] font-bold text-foreground">
                                              Quick-pick from your existing dishes ({existingDishes.length}):
                                            </span>
                                            <input
                                              type="text"
                                              value={prodDishPickerSearch}
                                              onChange={(e) => setProdDishPickerSearch(e.target.value)}
                                              placeholder="Search your dishes..."
                                              className="w-44 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground focus:border-brand focus:outline-none"
                                            />
                                          </div>
                                          <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                                            {filteredDishes.map((dish) => {
                                              const isAdded = currentList.includes(
                                                dish.name.toLowerCase()
                                              );
                                              return (
                                                <button
                                                  key={dish.id}
                                                  type="button"
                                                  onClick={() => toggleDishInPackage(dish.name)}
                                                  className={`cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                                                    isAdded
                                                      ? 'border-emerald-600 bg-emerald-600 text-white'
                                                      : 'border-border bg-background text-foreground hover:border-brand hover:text-brand'
                                                  }`}
                                                >
                                                  {isAdded ? '✓ ' : '+ '}
                                                  {dish.name}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <>
                                {/* 1-Tap Quick Weight / Pieces Presets */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-muted-foreground">
                                    Quick Size:
                                  </span>
                                  {(
                                    [
                                      { qty: '0.5', unit: 'kg', label: '0.5 kg' },
                                      { qty: '1', unit: 'kg', label: '1 kg' },
                                      { qty: '2', unit: 'kg', label: '2 kg' },
                                      { qty: '6', unit: 'pcs', label: '6 pcs' },
                                      { qty: '12', unit: 'pcs', label: '12 pcs' },
                                      { qty: '1', unit: 'box', label: '1 box' },
                                    ] as const
                                  ).map((preset) => {
                                    const active =
                                      prodUnitType === preset.unit && prodUnitQty === preset.qty;
                                    return (
                                      <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => {
                                          setProdUnitQty(preset.qty);
                                          setProdUnitType(preset.unit);
                                        }}
                                        className={`cursor-pointer rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                                          active
                                            ? 'border-brand bg-brand text-brand-foreground'
                                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        {preset.label}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Multiple Weight / Size Options on the Same Product (250g – 5 kg & custom) */}
                                <div className="space-y-2 rounded-lg border border-brand-border/80 bg-background/80 p-2.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="text-[11px] font-extrabold text-foreground">
                                        Multiple Weight / Size Options (Same Product)
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        Offer 250g, 500g, 1 kg up to 5 kg — or add any custom gram, box, or pack size.
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={autoFillCakeWeights}
                                        className="cursor-pointer rounded-md bg-brand/15 px-2 py-1 text-[10px] font-extrabold text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
                                      >
                                        Auto-fill 250g – 5 kg
                                      </button>
                                      <button
                                        type="button"
                                        onClick={addCustomVariantRow}
                                        className="cursor-pointer rounded-md border border-border bg-background px-2 py-1 text-[10px] font-bold text-foreground transition-colors hover:border-brand hover:text-brand"
                                      >
                                        + Custom Size / Gram
                                      </button>
                                    </div>
                                  </div>

                                  {/* 1-Tap Weight Toggle Chips (500g to 5 kg) */}
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {CAKE_WEIGHT_PRESETS.map((preset) => {
                                      const selected = prodVariants.some(
                                        (v) =>
                                          v.id === preset.id ||
                                          v.label.toLowerCase() === preset.label.toLowerCase()
                                      );
                                      return (
                                        <button
                                          key={preset.id}
                                          type="button"
                                          onClick={() => toggleWeightPreset(preset)}
                                          className={`cursor-pointer rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold transition-colors ${
                                            selected
                                              ? 'border-brand bg-brand text-brand-foreground'
                                              : 'border-border bg-muted/40 text-muted-foreground hover:border-brand/60 hover:text-foreground'
                                          }`}
                                        >
                                          {selected ? '✓ ' : '+ '}
                                          {preset.label}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Editable Price Rows for Enabled Weights */}
                                  {prodVariants.length > 0 && (
                                    <div className="grid grid-cols-1 gap-1.5 pt-1 sm:grid-cols-2">
                                      {prodVariants.map((variant) => (
                                        <div
                                          key={variant.id}
                                          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5"
                                        >
                                          <input
                                            type="text"
                                            value={variant.label}
                                            onChange={(e) =>
                                              setProdVariants((prev) =>
                                                prev.map((row) =>
                                                  row.id === variant.id
                                                    ? { ...row, label: e.target.value }
                                                    : row
                                                )
                                              )
                                            }
                                            placeholder="e.g. 250g / Box of 6"
                                            aria-label="Variant weight or size"
                                            className="w-28 min-w-0 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] font-bold text-foreground focus:border-brand focus:outline-none"
                                          />
                                          <div className="relative flex-1">
                                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[11px] font-bold text-muted-foreground">
                                              {currencyMeta.symbol.trim()}
                                            </span>
                                            <input
                                              type="number"
                                              min={1}
                                              max={50000000}
                                              value={variant.priceLocal}
                                              onChange={(e) =>
                                                setProdVariants((prev) =>
                                                  prev.map((row) =>
                                                    row.id === variant.id
                                                      ? { ...row, priceLocal: e.target.value }
                                                      : row
                                                  )
                                                )
                                              }
                                              placeholder="Price"
                                              aria-label={`Price for ${variant.label || 'size'}`}
                                              className="w-full rounded border border-border bg-background py-1 pl-7 pr-2 font-mono text-[11px] tabular-nums text-foreground focus:border-brand focus:outline-none"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setProdVariants((prev) =>
                                                prev.filter((row) => row.id !== variant.id)
                                              )
                                            }
                                            aria-label={`Remove ${variant.label || 'size'}`}
                                            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                                          >
                                            <X className="size-3" aria-hidden="true" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                  </>
                                  )
                                )}

                                {/* Veg / Non-Veg Food Type Selector (Food Stores Only) */}
                                {v.marketplace !== 'party' && (
                                  <>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-muted-foreground">
                                    Food Type:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setProdFoodType((prev) => (prev === 'veg' ? '' : 'veg'))
                                    }
                                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                      prodFoodType === 'veg'
                                        ? 'border-emerald-600 bg-emerald-600 text-white'
                                        : 'border-emerald-600/35 bg-background text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                                    }`}
                                  >
                                    <FoodTypeIcon foodType="veg" size="xs" />
                                    Veg
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setProdFoodType((prev) =>
                                        prev === 'non-veg' ? '' : 'non-veg'
                                      )
                                    }
                                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                      prodFoodType === 'non-veg'
                                        ? 'border-red-600 bg-red-600 text-white'
                                        : 'border-red-600/35 bg-background text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40'
                                    }`}
                                  >
                                    <FoodTypeIcon foodType="non-veg" size="xs" />
                                    Non-Veg
                                  </button>
                                  {prodFoodType && (
                                    <button
                                      type="button"
                                      onClick={() => setProdFoodType('')}
                                      className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>

                                {/* Sweetener & Dietary Options (Sugar-Free, Jaggery, Stevia, Eggless, etc.) */}
                                <div>
                                  <p className="text-[11px] font-semibold text-muted-foreground">
                                    Sweetener &amp; Dietary Options (Optional — tap to select):
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {PRODUCT_DIETARY_OPTIONS.map((option) => {
                                      const selected = prodDietaryTags.includes(option);
                                      return (
                                        <button
                                          key={option}
                                          type="button"
                                          onClick={() => toggleProdDietaryTag(option)}
                                          className={`cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                            selected
                                              ? 'border-emerald-600 bg-emerald-600 text-white'
                                              : 'border-border bg-background text-foreground/80 hover:border-emerald-500/60 hover:text-emerald-700 dark:hover:text-emerald-300'
                                          }`}
                                        >
                                          {selected ? `✓ ${option}` : option}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                  </>
                                )}

                                {/* Custom Builder Section & Quick-Start Presets (Business Plan Only, Food Individual Dishes) */}
                                {v.marketplace !== 'party' &&
                                  !prodIsPackage &&
                                  isPaidPlanTier(v.planTier) &&
                                  (v.customBuilderEnabled ||
                                    prodBuilderSection ||
                                    prodBuilderPresets.length > 0) && (() => {
                                  const modeCfg = getCustomBuilderModeConfig(
                                    v.customBuilderMode ?? suggestBuilderModeForCategory(v.category)
                                  );
                                  const availableSections = Array.from(
                                    new Set([
                                      ...modeCfg.sections,
                                      ...v.products
                                        .map((p) => p.builderSection?.trim() || '')
                                        .filter(Boolean),
                                      ...customSectionOptions,
                                      ...(prodBuilderSection.trim()
                                        ? [prodBuilderSection.trim()]
                                        : []),
                                    ])
                                  );
                                  const commitNewSection = () => {
                                    const cleaned = newSectionInput.trim().slice(0, 60);
                                    if (!cleaned) return;
                                    setCustomSectionOptions((prev) =>
                                      prev.includes(cleaned) ? prev : [...prev, cleaned]
                                    );
                                    setProdBuilderSection(cleaned);
                                    setNewSectionInput('');
                                    setAddingCustomSection(false);
                                  };
                                  return (
                                    <div className="space-y-2 rounded-lg border border-brand-border bg-card p-2.5">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <label className="text-[11px] font-bold text-foreground">
                                          {modeCfg.label} Section:
                                        </label>
                                        <select
                                          value={prodBuilderSection}
                                          onChange={(e) => {
                                            if (e.target.value === '__add_new__') {
                                              setAddingCustomSection(true);
                                              return;
                                            }
                                            setProdBuilderSection(e.target.value);
                                          }}
                                          className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground"
                                        >
                                          <option value="">General / All Items</option>
                                          {availableSections.map((sec) => (
                                            <option key={sec} value={sec}>
                                              {sec}
                                            </option>
                                          ))}
                                          <option value="__add_new__">+ Add New Category...</option>
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => setAddingCustomSection((prev) => !prev)}
                                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-brand-border bg-brand-soft/60 px-2 py-1 text-[11px] font-bold text-brand hover:bg-brand hover:text-brand-foreground"
                                        >
                                          <Plus className="size-3" aria-hidden="true" />
                                          Add Category
                                        </button>
                                      </div>
                                      {addingCustomSection && (
                                        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-brand-border/70 bg-brand-soft/20 p-2">
                                          <input
                                            type="text"
                                            value={newSectionInput}
                                            onChange={(e) => setNewSectionInput(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                e.preventDefault();
                                                commitNewSection();
                                              }
                                            }}
                                            maxLength={60}
                                            placeholder="New category name (e.g. Live Counters, Chaat, Salads, Ice Creams)"
                                            className="min-w-[180px] flex-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:border-brand focus:outline-none"
                                          />
                                          <button
                                            type="button"
                                            onClick={commitNewSection}
                                            disabled={!newSectionInput.trim()}
                                            className="cursor-pointer rounded-md bg-brand px-2.5 py-1 text-[11px] font-bold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
                                          >
                                            Add
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setAddingCustomSection(false);
                                              setNewSectionInput('');
                                            }}
                                            className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[11px] font-semibold text-muted-foreground">
                                          Include in Quick-Start Presets:
                                        </span>
                                        {BUILDER_PRESET_OPTIONS.map((preset) => {
                                          const active = prodBuilderPresets.includes(preset.id);
                                          return (
                                            <button
                                              key={preset.id}
                                              type="button"
                                              onClick={() => toggleProdBuilderPreset(preset.id)}
                                              className={`cursor-pointer rounded-md border px-2 py-0.5 text-[11px] font-bold transition-colors ${
                                                active
                                                  ? 'border-brand bg-brand text-brand-foreground'
                                                  : 'border-border bg-background text-muted-foreground hover:border-brand hover:text-foreground'
                                              }`}
                                            >
                                              {active
                                                ? `✓ ${preset.modeLabels[modeCfg.id]}`
                                                : preset.modeLabels[modeCfg.id]}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Menu Section & Advance Pre-Order Hours */}
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <input
                                    type="text"
                                    value={prodMenuSection}
                                    onChange={(e) => setProdMenuSection(e.target.value)}
                                    placeholder="Menu Section (e.g. Cakes, Brownies, Hampers)"
                                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none"
                                  />
                                  <input
                                    type="number"
                                    min={0}
                                    max={168}
                                    value={prodAdvanceHours}
                                    onChange={(e) => setProdAdvanceHours(e.target.value)}
                                    placeholder="Advance Pre-Order Notice in hours (e.g. 24)"
                                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-brand focus:outline-none"
                                  />
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand">
                                    <ImagePlus className="size-3.5" aria-hidden="true" />
                                    {prodImage ? 'Photo Ready ✓' : 'Upload Product Photo'}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => void handleProductPhotoUpload(e)}
                                      className="hidden"
                                    />
                                  </label>
                                  <input
                                    type="text"
                                    value={prodDesc}
                                    onChange={(e) => setProdDesc(e.target.value)}
                                    placeholder="Short description (flavors, fillings, inclusions...)"
                                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none"
                                  />
                                  <button
                                    type="submit"
                                    disabled={isBusy}
                                    className="cursor-pointer rounded-lg bg-brand px-4 py-1.5 text-xs font-bold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
                                  >
                                    {editingProductId ? 'Update Product' : 'Save to Cloud'}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : tab === 'growth' ? (
                <VendorGoogleToolkit
                  vendors={myVendors}
                  onNotify={onNotify}
                  onOpenGrowthHub={
                    onOpenGrowthHub
                      ? () => {
                          onClose();
                          onOpenGrowthHub();
                        }
                      : undefined
                  }
                  onOpenVendorWebsite={(vendor) => {
                    onClose();
                    onOpenVendorWebsite(vendor);
                  }}
                />
              ) : tab === 'mystery-boxes' ? (
                <VendorMysteryBoxTab user={user} myVendors={myVendors} onNotify={onNotify} />
              ) : tab === 'board' ? (
                openEventRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                    <Megaphone className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                    <p className="mt-3 text-base font-bold text-foreground">
                      No open event requests on the board yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      When customers broadcast birthday, wedding, or corporate requirements, they
                      appear here live so you can send a quote right away.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myVendors.length === 0 && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                        Publish a free storefront first so you can send official quotes with your
                        WhatsApp link on these customer event requests.
                      </div>
                    )}
                    {openEventRequests.map((req) => {
                      const isQuoting = quotingRequestId === req.id;
                      return (
                        <div
                          key={req.id}
                          className="rounded-2xl border border-border bg-background p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-extrabold text-foreground">
                                  {req.occasion} — Posted by {req.customerName}
                                </h4>
                                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                  Open Lead
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="size-3.5 text-brand" aria-hidden="true" />
                                  {req.city}, {req.state}, {req.country}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="size-3.5" aria-hidden="true" />
                                  {req.eventDate}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Users className="size-3.5" aria-hidden="true" />
                                  {req.guests} guests
                                </span>
                                <span className="font-mono font-bold text-foreground">
                                  Budget: {formatMoney(req.budgetUsd, currency)}
                                </span>
                              </div>
                            </div>

                            {myVendors.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuotingRequestId((cur) => (cur === req.id ? null : req.id));
                                  setQuotePriceLocal(usdToLocal(req.budgetUsd || 150, currency));
                                }}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
                              >
                                <Send className="size-3.5" aria-hidden="true" />
                                {isQuoting ? 'Close' : 'Send Quote'}
                              </button>
                            )}
                          </div>

                          <p className="mt-2 text-xs text-muted-foreground">{req.details}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {req.categories.map((c) => (
                              <span
                                key={c}
                                className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground"
                              >
                                {c}
                              </span>
                            ))}
                          </div>

                          {isQuoting && myVendors.length > 0 && (
                            <form
                              onSubmit={(e) => void handleSubmitQuote(e, req)}
                              className="mt-3 space-y-2.5 rounded-xl border border-brand-border bg-brand-soft/30 p-3"
                            >
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <select
                                  aria-label="Quote as vendor"
                                  value={quoteVendorId}
                                  onChange={(e) => setQuoteVendorId(e.target.value)}
                                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground"
                                >
                                  {myVendors.map((mv) => (
                                    <option key={mv.id} value={mv.id}>
                                      Quote as: {mv.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="relative">
                                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted-foreground">
                                    {currencyMeta.symbol.trim()}
                                  </span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={50000000}
                                    required
                                    value={quotePriceLocal}
                                    onChange={(e) =>
                                      setQuotePriceLocal(Math.max(1, Number(e.target.value) || 0))
                                    }
                                    placeholder={`Your Quote (${currencyMeta.code})`}
                                    className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-2.5 font-mono text-xs font-bold text-foreground"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  required
                                  minLength={5}
                                  maxLength={600}
                                  value={quoteMessage}
                                  onChange={(e) => setQuoteMessage(e.target.value)}
                                  placeholder="What's included in your quote? (menu, delivery, setup, availability)"
                                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                />
                                <button
                                  type="submit"
                                  disabled={busyId === req.id}
                                  className="cursor-pointer rounded-lg bg-[#25D366] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#1ebe5d] disabled:opacity-50"
                                >
                                  Send Quote to Customer
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : vendorLeads.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <ShoppingBag className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-base font-bold text-foreground">
                    No online orders or enquiries yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    When customers place direct online orders or booking enquiries on your storefront or
                    QR menu, they appear here live so you can accept, prepare, and update them on WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Live Order Stage Filter Bar */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'New Order', label: 'New Orders' },
                        { id: 'Accepted', label: 'Accepted' },
                        { id: 'Preparing', label: 'Preparing' },
                        { id: 'Out for Delivery', label: 'Out for Delivery' },
                        { id: 'Completed', label: 'Completed' },
                        { id: 'Cancelled', label: 'Cancelled' },
                      ] as const
                    ).map((st) => {
                      const count =
                        st.id === 'all'
                          ? vendorLeads.length
                          : vendorLeads.filter((l) => l.status === st.id).length;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setOrderStatusFilter(st.id)}
                          className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
                            orderStatusFilter === st.id
                              ? 'border-brand bg-brand text-brand-foreground'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {st.label} ({count})
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    {vendorLeads
                      .filter(
                        (lead) =>
                          orderStatusFilter === 'all' || lead.status === orderStatusFilter
                      )
                      .map((lead) => {
                        const isTerminal =
                          lead.status === 'Completed' || lead.status === 'Cancelled';
                        const statusStyle =
                          lead.status === 'New Order'
                            ? 'bg-brand/15 text-brand'
                            : lead.status === 'Accepted'
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                              : lead.status === 'Preparing'
                                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                                : lead.status === 'Out for Delivery'
                                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                  : lead.status === 'Completed'
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : lead.status === 'Cancelled'
                                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                      : 'bg-muted text-foreground';
                        return (
                          <div
                            key={lead.id}
                            className="rounded-2xl border border-border bg-background p-4"
                          >
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs font-extrabold text-foreground">
                                    {lead.reference}
                                  </span>
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${statusStyle}`}
                                  >
                                    {lead.status}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {lead.vendorName}
                                  </span>
                                </div>
                                <h4 className="mt-1 text-sm font-bold text-foreground">
                                  {lead.customerName} — {lead.packageName}
                                </h4>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Date: <strong className="text-foreground">{lead.eventDate}</strong> ·{' '}
                                  Total:{' '}
                                  <span className="font-mono font-bold text-foreground">
                                    {formatMoney(lead.estimatedUsd, currency)}
                                  </span>
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Customer Contact:{' '}
                                  <strong className="text-foreground">{lead.customerEmail}</strong>
                                </p>
                                {lead.notes && (
                                  <p className="mt-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs text-foreground/90">
                                    {lead.notes}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 sm:max-w-[260px] sm:justify-end">
                                {!isTerminal &&
                                  (lead.status === 'New Order' ||
                                    lead.status === 'Confirmed Enquiry' ||
                                    lead.status === 'Awaiting Vendor Reply') && (
                                    <button
                                      type="button"
                                      disabled={busyId === lead.id}
                                      onClick={() => void handleLeadStatus(lead.id, 'Accepted')}
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                                      Accept Order
                                    </button>
                                  )}
                                {!isTerminal && lead.status === 'Accepted' && (
                                  <button
                                    type="button"
                                    disabled={busyId === lead.id}
                                    onClick={() => void handleLeadStatus(lead.id, 'Preparing')}
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                                  >
                                    <ChefHat className="size-3.5" aria-hidden="true" />
                                    Start Preparing
                                  </button>
                                )}
                                {!isTerminal && lead.status === 'Preparing' && (
                                  <button
                                    type="button"
                                    disabled={busyId === lead.id}
                                    onClick={() =>
                                      void handleLeadStatus(lead.id, 'Out for Delivery')
                                    }
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                                  >
                                    <Truck className="size-3.5" aria-hidden="true" />
                                    Out for Delivery
                                  </button>
                                )}
                                {!isTerminal && (
                                  <button
                                    type="button"
                                    disabled={busyId === lead.id}
                                    onClick={() => void handleLeadStatus(lead.id, 'Completed')}
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                                    Complete
                                  </button>
                                )}
                                <a
                                  href={buildOrderStatusWhatsAppHref(lead)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#1ebe5d]"
                                >
                                  <MessageCircle className="size-3.5" aria-hidden="true" />
                                  Notify WA
                                </a>
                                {!isTerminal && (
                                  <button
                                    type="button"
                                    disabled={busyId === lead.id}
                                    onClick={() => void handleLeadStatus(lead.id, 'Cancelled')}
                                    className="cursor-pointer rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:border-rose-500/50 hover:text-rose-600 disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <QrPosterModal vendor={qrVendor} onClose={() => setQrVendor(null)} />
      <PromoCardModal
        vendor={promoVendor}
        currency={currency}
        onClose={() => setPromoVendor(null)}
        onTrackShare={onTrackShare}
      />
    </div>
  );
}
