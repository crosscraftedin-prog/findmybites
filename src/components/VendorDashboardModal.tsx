import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Crown,
  Edit3,
  ExternalLink,
  Eye,
  ImagePlus,
  Instagram,
  LocateFixed,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  Plus,
  QrCode,
  Send,
  Share2,
  Sparkles,
  Store,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  BookingEnquiry,
  CURRENCIES,
  CloudVendorMetric,
  CurrencyCode,
  EventRequest,
  PlanTier,
  SAAS_PLANS,
  Vendor,
  VendorProduct,
  formatMoney,
  formatPlanPrice,
  localToUsd,
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
import { compressImageFile } from '../utils/imageUpload';
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
  onTrackShare,
  onNotify,
}: VendorDashboardModalProps) {
  const [tab, setTab] = useState<'storefronts' | 'board' | 'leads'>('storefronts');
  const [addingProductForId, setAddingProductForId] = useState<string | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  // Add product state
  const [prodName, setProdName] = useState('');
  const [prodServes, setProdServes] = useState('Custom / 50 pax');
  const [prodPriceLocal, setProdPriceLocal] = useState(usdToLocal(40, currency));
  const [prodDesc, setProdDesc] = useState('');
  const [prodImage, setProdImage] = useState('');

  // Storefront full editor state
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editPromoBanner, setEditPromoBanner] = useState('');
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
    setEditPlanTier(v.planTier);
    setEditLogo(v.logo || '');
    setEditCover(v.image);
    setEditGallery(v.gallery ? [...v.gallery] : []);
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
        planTier: editPlanTier,
        monthlyAutoPay: editPlanTier !== 'free',
        logo: editLogo,
        image: editCover,
        gallery: editGallery,
      });
      setEditingVendorId(null);
      onNotify(`Saved storefront updates for ${editName} to Cloud Firestore!`);
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
        maxWidth: 640,
        maxHeight: 480,
        quality: 0.72,
        maxChars: 90000,
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

  const handleAddProduct = async (e: FormEvent, vendor: Vendor) => {
    e.preventDefault();
    if (!prodName.trim()) return;
    setBusyId(vendor.id);
    try {
      const nextProd: VendorProduct = {
        id: `prod-${Date.now()}`,
        name: prodName.trim().slice(0, 100),
        serves: prodServes.trim().slice(0, 60) || 'Custom',
        priceUsd: Math.max(1, localToUsd(prodPriceLocal, currency)),
        description: prodDesc.trim().slice(0, 400) || prodName.trim(),
        image: prodImage || vendor.image,
      };
      await updateVendorInCloud(vendor.id, {
        products: [...vendor.products, nextProd],
      });
      setProdName('');
      setProdDesc('');
      setProdImage('');
      setAddingProductForId(null);
      onNotify(`Added "${nextProd.name}" to ${vendor.name} in the cloud!`);
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveProduct = async (vendor: Vendor, productId: string) => {
    if (vendor.products.length <= 1) {
      onNotify('Each storefront must keep at least 1 product listed.');
      return;
    }
    setBusyId(vendor.id);
    try {
      await updateVendorInCloud(vendor.id, {
        products: vendor.products.filter((p) => p.id !== productId),
      });
      onNotify(`Updated catalog for ${vendor.name}.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    setBusyId(vendor.id);
    try {
      await deleteVendorInCloud(vendor.id);
      onNotify(`${vendor.name} removed from cloud directory.`);
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
                  : 'Sign in with Google to manage storefronts, quote local event leads & track views'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              Sign in with Google to open your Vendor Portal
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Edit your storefront, upload portfolio photos, generate WhatsApp Status promo cards,
              view real-time click analytics, and quote incoming local event requests.
            </p>
            <button
              type="button"
              onClick={() => void onSignIn()}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-brand-foreground shadow-md transition-transform hover:scale-[1.02] hover:bg-brand-hover"
            >
              <LogIn className="size-4" aria-hidden="true" />
              Continue with Google
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
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {v.category} · {v.city}, {v.state}, {v.country} ·{' '}
                                <span className="font-mono">findmybites.com/v/{v.slug}</span>
                              </p>
                              {v.promoBanner && (
                                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand">
                                  <Sparkles className="size-3" aria-hidden="true" />
                                  Offer: {v.promoBanner}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenVendorWebsite(v);
                                }}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
                              >
                                <ExternalLink className="size-3.5" aria-hidden="true" />
                                Open
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
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleDeleteVendor(v)}
                                aria-label={`Delete ${v.name}`}
                                className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground hover:border-red-500 hover:text-red-500 disabled:opacity-50"
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                              </button>
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
                                Products &amp; Packages ({v.products.length}/20)
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setAddingProductForId((cur) => (cur === v.id ? null : v.id))
                                }
                                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand hover:underline"
                              >
                                <Plus className="size-3.5" aria-hidden="true" />
                                Add Product
                              </button>
                            </div>

                            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                              {v.products.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-foreground">
                                      {p.name}
                                    </p>
                                    <p className="font-mono text-[11px] text-muted-foreground">
                                      {formatMoney(p.priceUsd, currency)} · {p.serves}
                                    </p>
                                  </div>
                                  {v.products.length > 1 && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void handleRemoveProduct(v, p.id)}
                                      aria-label={`Remove ${p.name}`}
                                      className="cursor-pointer text-muted-foreground hover:text-red-500"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            {addingProductForId === v.id && (
                              <form
                                onSubmit={(e) => void handleAddProduct(e, v)}
                                className="mt-3 space-y-2 rounded-xl border border-brand-border bg-brand-soft/30 p-3"
                              >
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  <input
                                    type="text"
                                    required
                                    value={prodName}
                                    onChange={(e) => setProdName(e.target.value)}
                                    placeholder="Product / Package Name"
                                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                  />
                                  <input
                                    type="text"
                                    value={prodServes}
                                    onChange={(e) => setProdServes(e.target.value)}
                                    placeholder="Serves (e.g. 2kg / 50 pax)"
                                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
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
                                      value={prodPriceLocal}
                                      onChange={(e) =>
                                        setProdPriceLocal(Math.max(1, Number(e.target.value) || 0))
                                      }
                                      placeholder={`Price (${currencyMeta.code})`}
                                      className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-2.5 font-mono text-xs text-foreground"
                                    />
                                  </div>
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
                                    placeholder="Short description (flavors, inclusions...)"
                                    className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                                  />
                                  <button
                                    type="submit"
                                    disabled={isBusy}
                                    className="cursor-pointer rounded-lg bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
                                  >
                                    Save to Cloud
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
