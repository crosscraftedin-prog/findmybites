import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BarChart3,
  Calculator,
  Calendar,
  CheckCircle2,
  Crown,
  Edit3,
  ExternalLink,
  Eye,
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
  Snowflake,
  Sparkles,
  Store,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  BUILDER_PRESET_OPTIONS,
  BioTheme,
  BookingEnquiry,
  BuilderPresetId,
  CAKE_WEIGHT_PRESETS,
  CURRENCIES,
  CUSTOM_BUILDER_MODES,
  CloudVendorMetric,
  CurrencyCode,
  CustomBuilderMode,
  EventRequest,
  PRODUCT_DIETARY_OPTIONS,
  PRODUCT_UNIT_OPTIONS,
  PlanTier,
  ProductFoodType,
  ProductUnitType,
  SAAS_PLANS,
  Vendor,
  VendorBioLink,
  VendorProduct,
  VendorProductVariant,
  formatMoney,
  formatPlanPrice,
  formatProductServesLabel,
  getCustomBuilderModeConfig,
  getVendorBioHandle,
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
  const proPlan = SAAS_PLANS.find((p) => p.id === 'pro') ?? SAAS_PLANS[1];

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
            Rank above all Free listings in <strong>{vendor.city}</strong> with Pro Partner (
            <strong>{formatPlanPrice(proPlan, currency)}/mo</strong>).
          </span>
          <button
            type="button"
            onClick={() => onUpgradePlan(vendor, 'pro')}
            className="cursor-pointer rounded-lg bg-brand px-3 py-1 text-[11px] font-bold text-brand-foreground hover:bg-brand-hover"
          >
            Boost to Pro
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
  onTrackShare,
  onNotify,
}: VendorDashboardModalProps) {
  const [tab, setTab] = useState<'storefronts' | 'board' | 'leads'>('storefronts');
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
  const [prodPriceLocal, setProdPriceLocal] = useState(usdToLocal(40, currency));
  const [prodDesc, setProdDesc] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodBuilderSection, setProdBuilderSection] = useState('');
  const [prodBuilderPresets, setProdBuilderPresets] = useState<BuilderPresetId[]>([]);
  const [prodVariants, setProdVariants] = useState<
    Array<{ id: string; label: string; priceLocal: string; serves: string }>
  >([]);

  // Storefront full editor state
  const [editName, setEditName] = useState('');
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
  const [editCustomLinks, setEditCustomLinks] = useState<VendorBioLink[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkBadge, setNewLinkBadge] = useState('');
  const [editPlanTier, setEditPlanTier] = useState<PlanTier>('free');
  const [editLogo, setEditLogo] = useState('');
  const [editCover, setEditCover] = useState('');
  const [editGallery, setEditGallery] = useState<string[]>([]);

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

  useEffect(() => {
    if (!isOpen || !initialEditVendorId) return;
    const target = myVendors.find((v) => v.id === initialEditVendorId);
    if (!target) return;
    setTab('storefronts');
    setEditingVendorId(target.id);
    setEditName(target.name);
    setEditTagline(target.tagline);
    setEditDescription(target.description);
    setEditWhatsapp(target.whatsappNumber);
    setEditPromoBanner(target.promoBanner || '');
    setEditChristmasSpecial(Boolean(target.christmasSpecial));
    setEditChristmasOffer(target.christmasOffer || '');
    const suggestedMode = target.customBuilderMode ?? suggestBuilderModeForCategory(target.category);
    setEditCustomBuilderEnabled(Boolean(target.customBuilderEnabled));
    setEditCustomBuilderMode(suggestedMode);
    setEditCustomBuilderMinQty(
      target.customBuilderMinQty ?? getCustomBuilderModeConfig(suggestedMode).defaultMinQty
    );
    setEditCustomBuilderPackagingLocal(
      target.customBuilderPackagingUsd && target.customBuilderPackagingUsd > 0
        ? usdToLocal(target.customBuilderPackagingUsd, currency)
        : 0
    );
    setEditBioHandle(getVendorBioHandle(target));
    setEditBioTheme(target.bioTheme ?? (target.marketplace === 'party' ? 'party' : 'saffron'));
    setEditInstagram(target.instagramHandle || '');
    setEditCustomLinks(target.customLinks ? [...target.customLinks] : []);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setNewLinkBadge('');
    setEditPlanTier(target.planTier);
    setEditLogo(target.logo || '');
    setEditCover(target.image);
    setEditGallery(target.gallery ? [...target.gallery] : []);
    onClearInitialEdit?.();
  }, [isOpen, initialEditVendorId, myVendors, onClearInitialEdit]);

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
    setEditingVendorId(v.id);
    setEditName(v.name);
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
    setEditCustomLinks(v.customLinks ? [...v.customLinks] : []);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setNewLinkBadge('');
    setEditPlanTier(v.planTier);
    setEditLogo(v.logo || '');
    setEditCover(v.image);
    setEditGallery(v.gallery ? [...v.gallery] : []);
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

  const handleSaveVendorEdit = async (e: FormEvent, vendor: Vendor) => {
    e.preventDefault();
    setBusyId(vendor.id);
    try {
      await updateVendorInCloud(vendor.id, {
        name: editName,
        tagline: editTagline,
        description: editDescription,
        whatsappNumber: editWhatsapp,
        promoBanner: editPromoBanner,
        christmasSpecial: editChristmasSpecial,
        christmasOffer: editChristmasOffer,
        customBuilderEnabled: editCustomBuilderEnabled,
        customBuilderMode: editCustomBuilderMode,
        customBuilderMinQty: Math.max(1, Math.min(5000, Math.round(editCustomBuilderMinQty || 10))),
        customBuilderPackagingUsd:
          editCustomBuilderPackagingLocal > 0
            ? Math.max(0, Math.min(500, localToUsd(editCustomBuilderPackagingLocal, currency)))
            : 0,
        bioHandle: editBioHandle,
        bioTheme: editBioTheme,
        instagramHandle: editInstagram,
        customLinks: editCustomLinks,
        planTier: editPlanTier,
        monthlyAutoPay: editPlanTier !== 'free',
        logo: editLogo,
        image: editCover,
        gallery: editGallery,
      });
      setEditingVendorId(null);
      onNotify(`Saved storefront & Bio-Link updates for ${editName} to Cloud!`);
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
      onNotify(`${vendor.name} upgraded to ${nextPlan === 'business' ? 'Business Spotlight' : 'Pro Partner'}!`);
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
    setProdPriceLocal(usdToLocal(40, currency));
    setProdDesc('');
    setProdImage('');
    setProdBuilderSection('');
    setProdBuilderPresets([]);
    setProdVariants([]);
    setEditingProductId(null);
  };

  const openAddProductForm = (vendorId: string) => {
    if (addingProductForId === vendorId && !editingProductId) {
      setAddingProductForId(null);
      resetProductForm();
      return;
    }
    resetProductForm();
    setAddingProductForId(vendorId);
    setConfirmDeleteProdKey(null);
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
    setProdPriceLocal(Math.max(1, usdToLocal(product.priceUsd, currency)));
    setProdDesc(product.description || '');
    setProdImage(product.image || '');
    setProdBuilderSection(product.builderSection || '');
    setProdBuilderPresets(product.builderPresets ? [...product.builderPresets] : []);
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
    const standardIds = new Set(['w-500g', 'w-1kg', 'w-2kg', 'w-3kg', 'w-5kg']);
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

      const nextProd: VendorProduct = {
        id: editingProductId || `prod-${Date.now()}`,
        name: prodName.trim().slice(0, 100),
        serves: formattedServes.slice(0, 60),
        ...(prodUnitType !== 'custom' ? { unitQuantity: prodUnitQty.trim() || '1' } : {}),
        unitType: prodUnitType,
        ...(prodFoodType ? { foodType: prodFoodType } : {}),
        ...(prodDietaryTags.length > 0 ? { dietaryTags: prodDietaryTags } : {}),
        ...(prodBuilderSection.trim() ? { builderSection: prodBuilderSection.trim().slice(0, 60) } : {}),
        ...(prodBuilderPresets.length > 0 ? { builderPresets: prodBuilderPresets } : {}),
        ...(cleanedVariants.length > 0 ? { variants: cleanedVariants } : {}),
        priceUsd: resolvedPriceUsd,
        description: prodDesc.trim().slice(0, 400) || prodName.trim(),
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

      const nextStartingUsd =
        updatedProducts.length > 0
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
        ...(remaining.length > 0
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

  const handleLeadStatus = async (leadId: string, status: 'Completed' | 'Cancelled') => {
    setBusyId(leadId);
    try {
      await updateBookingStatusInCloud(leadId, status);
      onNotify(`Enquiry marked as ${status}.`);
    } finally {
      setBusyId(null);
    }
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
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === 'leads'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Direct Leads ({vendorLeads.length})
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
                      Launch your Free Listing (₹0) or Pro Partner (₹299/mo) storefront in 2
                      minutes — visible immediately across all devices.
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
                                    {v.planTier === 'business' ? 'Business Spotlight' : 'Pro Partner'}
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
                                className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                                  v.customBuilderEnabled
                                    ? 'border-brand bg-brand text-brand-foreground hover:bg-brand-hover'
                                    : 'border-brand-border bg-brand-soft/45 text-brand hover:bg-brand-soft'
                                }`}
                              >
                                <Package className="size-3.5" aria-hidden="true" />
                                {v.customBuilderEnabled ? 'Builder ON' : 'Custom Builder'}
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

                              {/* Christmas & New Year Spotlight Controls */}
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

                              {/* Custom Plate / Snack Box / Meal Box Builder Controls */}
                              <div className="rounded-xl border border-brand-border bg-card p-3">
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

                                {editCustomBuilderEnabled && (
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

                              {/* Branding + Plan */}
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
                                      {plan.name} ({formatPlanPrice(plan, currency)}/mo)
                                    </option>
                                  ))}
                                </select>
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
                              <p className="text-xs font-bold text-foreground">
                                Products &amp; Packages ({v.products.length}/50)
                              </p>
                              <button
                                type="button"
                                onClick={() => openAddProductForm(v.id)}
                                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand hover:underline"
                              >
                                <Plus className="size-3.5" aria-hidden="true" />
                                {addingProductForId === v.id && !editingProductId
                                  ? 'Close Form'
                                  : 'Add Product'}
                              </button>
                            </div>

                            {v.products.length === 0 ? (
                              <p className="mt-2 rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                                No products listed yet. Click <strong>+ Add Product</strong> to add
                                your cakes or packages.
                              </p>
                            ) : (
                              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                                {v.products.map((p) => {
                                  const delKey = `${v.id}:${p.id}`;
                                  const isEditingThis =
                                    addingProductForId === v.id && editingProductId === p.id;
                                  return (
                                    <div
                                      key={p.id}
                                      className={`flex items-start justify-between gap-2.5 rounded-xl border px-3 py-2.5 text-xs transition-colors ${
                                        isEditingThis
                                          ? 'border-brand bg-brand-soft/30'
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
                                            <FoodTypeBadge foodType={p.foodType} size="xs" />
                                          </div>
                                          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                                            {p.variants && p.variants.length > 1 ? 'From ' : ''}
                                            {formatMoney(p.priceUsd, currency)} · {p.serves}
                                          </p>
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
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-1">
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

                            {addingProductForId === v.id && (
                              <form
                                onSubmit={(e) => void handleSaveProduct(e, v)}
                                className="mt-3 space-y-3 rounded-xl border border-brand-border bg-brand-soft/25 p-3.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-extrabold text-foreground">
                                    {editingProductId ? 'Edit Product Details' : 'Add New Product'}
                                  </p>
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
                                    placeholder="Product Name (e.g. Belgian Truffle Cake)"
                                    className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-medium text-foreground focus:border-brand focus:outline-none sm:col-span-5"
                                  />

                                  {/* Quantity + Unit (kg / g / pcs / box / dozen / pax / custom) */}
                                  <div className="flex items-center gap-1.5 sm:col-span-4">
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

                                {/* Multiple Weight / Size Options on the Same Product (500g – 5 kg & custom) */}
                                <div className="space-y-2 rounded-lg border border-brand-border/80 bg-background/80 p-2.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="text-[11px] font-extrabold text-foreground">
                                        Multiple Weight / Size Options (Same Product)
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        Offer 500g, 1 kg, 2 kg up to 5 kg on one cake card — customers pick their weight before ordering.
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={autoFillCakeWeights}
                                        className="cursor-pointer rounded-md bg-brand/15 px-2 py-1 text-[10px] font-extrabold text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
                                      >
                                        Auto-fill 500g – 5 kg
                                      </button>
                                      <button
                                        type="button"
                                        onClick={addCustomVariantRow}
                                        className="cursor-pointer rounded-md border border-border bg-background px-2 py-1 text-[10px] font-bold text-foreground transition-colors hover:border-brand hover:text-brand"
                                      >
                                        + Custom Size
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
                                            placeholder="e.g. 500g"
                                            aria-label="Variant weight or size"
                                            className="w-20 min-w-0 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] font-bold text-foreground focus:border-brand focus:outline-none"
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

                                {/* Veg / Non-Veg Food Type Selector */}
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

                                {/* Custom Builder Section & Quick-Start Presets */}
                                {(v.customBuilderEnabled ||
                                  prodBuilderSection ||
                                  prodBuilderPresets.length > 0) && (() => {
                                  const modeCfg = getCustomBuilderModeConfig(
                                    v.customBuilderMode ?? suggestBuilderModeForCategory(v.category)
                                  );
                                  return (
                                    <div className="space-y-2 rounded-lg border border-brand-border bg-card p-2.5">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <label className="text-[11px] font-bold text-foreground">
                                          {modeCfg.label} Section:
                                        </label>
                                        <select
                                          value={prodBuilderSection}
                                          onChange={(e) => setProdBuilderSection(e.target.value)}
                                          className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground"
                                        >
                                          <option value="">General / All Items</option>
                                          {modeCfg.sections.map((sec) => (
                                            <option key={sec} value={sec}>
                                              {sec}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
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
                  <p className="text-base font-bold text-foreground">No direct leads yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    When customers submit booking enquiries on your published one-page storefronts,
                    they appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vendorLeads.map((lead) => {
                    const isTerminal =
                      lead.status === 'Completed' || lead.status === 'Cancelled';
                    return (
                      <div
                        key={lead.id}
                        className="rounded-2xl border border-border bg-background p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {lead.reference} · {lead.status}
                            </p>
                            <h4 className="text-sm font-bold text-foreground">
                              {lead.customerName} — {lead.packageName}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {lead.eventDate} · {lead.guests} guests ·{' '}
                              <span className="font-mono font-semibold text-foreground">
                                {formatMoney(lead.estimatedUsd, currency)}
                              </span>
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Contact: <strong className="text-foreground">{lead.customerEmail}</strong>
                            </p>
                            {lead.notes && (
                              <p className="mt-1 text-xs italic text-muted-foreground">
                                “{lead.notes}”
                              </p>
                            )}
                          </div>

                          {!isTerminal && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={busyId === lead.id}
                                onClick={() => void handleLeadStatus(lead.id, 'Completed')}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                                Complete
                              </button>
                              <button
                                type="button"
                                disabled={busyId === lead.id}
                                onClick={() => void handleLeadStatus(lead.id, 'Cancelled')}
                                className="cursor-pointer rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
