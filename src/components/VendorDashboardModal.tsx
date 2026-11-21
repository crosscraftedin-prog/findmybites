import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Crown,
  ExternalLink,
  ImagePlus,
  LocateFixed,
  LogIn,
  LogOut,
  PauseCircle,
  PlayCircle,
  Plus,
  QrCode,
  Store,
  Trash2,
  X,
} from 'lucide-react';
import {
  BookingEnquiry,
  CURRENCIES,
  CurrencyCode,
  PlanTier,
  Vendor,
  VendorProduct,
  formatMoney,
  localToUsd,
  usdToLocal,
} from '../data/vendors';
import {
  deleteVendorInCloud,
  updateBookingStatusInCloud,
  updateVendorInCloud,
} from '../services/firestoreService';
import { compressImageFile } from '../utils/imageUpload';
import { requestBrowserGpsLocation } from '../utils/geolocation';
import { QrPosterModal } from './QrPosterModal';

interface VendorDashboardModalProps {
  isOpen: boolean;
  user: User | null;
  myVendors: Vendor[];
  vendorLeads: BookingEnquiry[];
  currency: CurrencyCode;
  onClose: () => void;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onOpenListModal: (plan?: PlanTier) => void;
  onOpenVendorWebsite: (vendor: Vendor) => void;
  onNotify: (msg: string) => void;
}

export function VendorDashboardModal({
  isOpen,
  user,
  myVendors,
  vendorLeads,
  currency,
  onClose,
  onSignIn,
  onSignOut,
  onOpenListModal,
  onOpenVendorWebsite,
  onNotify,
}: VendorDashboardModalProps) {
  const [tab, setTab] = useState<'storefronts' | 'leads'>('storefronts');
  const [addingProductForId, setAddingProductForId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodServes, setProdServes] = useState('Custom / 50 pax');
  const [prodPriceLocal, setProdPriceLocal] = useState(usdToLocal(40, currency));
  const [prodDesc, setProdDesc] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [qrVendor, setQrVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    setProdPriceLocal(usdToLocal(40, currency));
  }, [currency]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !qrVendor) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, qrVendor, onClose]);

  if (!isOpen) return null;

  const currencyMeta = CURRENCIES[currency];

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

  const handleLeadStatus = async (
    leadId: string,
    status: 'Completed' | 'Cancelled'
  ) => {
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
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
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
                Vendor Cloud Portal &amp; Leads
              </h2>
              <p className="text-xs text-muted-foreground">
                {user
                  ? `Signed in as ${user.displayName || user.email}`
                  : 'Sign in with Google to publish & manage live storefronts across devices'}
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
              Sign in with Google to manage your storefront
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Publish your baker, live counter, catering, or event business live to the cloud,
              edit your product catalog anytime, download QR menu posters, and receive customer
              enquiries directly.
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
              <div className="inline-flex rounded-lg bg-muted p-1">
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
                  onClick={() => setTab('leads')}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tab === 'leads'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Incoming Leads ({vendorLeads.length})
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
                                onClick={() => setQrVendor(v)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
                              >
                                <QrCode className="size-3.5" aria-hidden="true" />
                                QR
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
              ) : vendorLeads.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                  <p className="text-base font-bold text-foreground">No incoming leads yet</p>
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
    </div>
  );
}
