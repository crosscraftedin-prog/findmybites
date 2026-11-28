import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Clock,
  Gift,
  ImagePlus,
  IndianRupee,
  Loader2,
  Package,
  Plus,
  Send,
  Truck,
} from 'lucide-react';
import type { Vendor } from '../../data/vendors';
import {
  DELIVERY_STATUS_META,
  type MysteryBoxDietaryType,
  formatInr,
} from '../../data/mysteryBoxes';
import { resolveMysteryBoxImage } from '../../data/mysteryBoxImages';
import {
  type VendorMysteryBoxDashboardData,
  fetchVendorMysteryBoxData,
  submitVendorMysteryBoxProduct,
  updateVendorFulfillmentStatus,
} from '../../services/mysteryBoxService';
import { compressImageFile } from '../../utils/imageUpload';

interface VendorMysteryBoxTabProps {
  user: User | null;
  myVendors: Vendor[];
  onNotify: (msg: string) => void;
}

const GOODIE_CATEGORIES = [
  'Brownies',
  'Cookies',
  'Cupcakes',
  'Mini Cakes',
  'Celebration Cakes',
  'Chocolates',
  'Pastries',
  'Macarons',
  'Surprise Treat',
];

export function VendorMysteryBoxTab({ user, myVendors, onNotify }: VendorMysteryBoxTabProps) {
  const [data, setData] = useState<VendorMysteryBoxDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const [selectedVendorId, setSelectedVendorId] = useState(myVendors[0]?.id || '');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Brownies');
  const [shortDescription, setShortDescription] = useState('');
  const [quantityAvailable, setQuantityAvailable] = useState('15');
  const [unitLabel, setUnitLabel] = useState('pcs');
  const [contributionPriceInr, setContributionPriceInr] = useState('120');
  const [retailValueInr, setRetailValueInr] = useState('210');
  const [prepTimeHours, setPrepTimeHours] = useState('4');
  const [bestBefore, setBestBefore] = useState('48 hours chilled');
  const [dietary, setDietary] = useState<MysteryBoxDietaryType>('eggless');
  const [allergensInput, setAllergensInput] = useState('Dairy, Gluten');
  const [deliveryAreasInput, setDeliveryAreasInput] = useState(
    myVendors[0]?.city || 'Bengaluru'
  );
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedVendorId && myVendors[0]) {
      setSelectedVendorId(myVendors[0].id);
      setDeliveryAreasInput(myVendors[0].city || '');
    }
  }, [myVendors, selectedVendorId]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetchVendorMysteryBoxData(user);
      setData(res);
    } catch {
      // ignore transient error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleImagePick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 900,
        maxHeight: 900,
        quality: 0.8,
        maxChars: 220000,
      });
      setImageDataUrl(compressed);
    } catch {
      onNotify('Could not read image file.');
    }
  };

  const handleSubmitProduct = async (e: FormEvent) => {
    e.preventDefault();
    const vendor = myVendors.find((v) => v.id === selectedVendorId) || myVendors[0];
    if (!vendor) {
      setError('Create or claim a storefront first to participate in FindMyBites Mystery Boxes.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const allergens = allergensInput
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      const deliveryAreas = deliveryAreasInput
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      await submitVendorMysteryBoxProduct(
        {
          vendorId: vendor.id,
          vendorName: vendor.name,
          city: vendor.city || 'Bengaluru',
          deliveryAreas: deliveryAreas.length > 0 ? deliveryAreas : [vendor.city || 'Local City'],
          productName: productName.trim(),
          category,
          shortDescription: shortDescription.trim() || 'Freshly baked artisanal treat.',
          quantityAvailable: Math.max(1, Number(quantityAvailable) || 10),
          unitLabel: unitLabel.trim() || 'pcs',
          contributionPriceInr: Math.max(20, Number(contributionPriceInr) || 100),
          retailValueInr: Math.max(40, Number(retailValueInr) || 180),
          image: imageDataUrl || undefined,
          prepTimeHours: Math.max(1, Number(prepTimeHours) || 4),
          bestBefore: bestBefore.trim() || '48 hours chilled',
          dietary,
          allergens,
        },
        user
      );

      onNotify('Submitted for FindMyBites Mystery Boxes! Admin will review & approve shortly.');
      setProductName('');
      setShortDescription('');
      setImageDataUrl('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFulfillmentUpdate = async (
    orderId: string,
    vendorId: string,
    status: 'accepted' | 'preparing' | 'ready_for_pickup' | 'completed'
  ) => {
    setUpdatingOrderId(orderId);
    try {
      await updateVendorFulfillmentStatus(orderId, vendorId, status, user);
      onNotify(`Fulfillment updated to "${status.replace(/_/g, ' ')}".`);
      await refresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Could not update status.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const submissions = data?.submissions || [];
  const assignedFulfillments = data?.assignedFulfillments || [];
  const totalEarnedInr = data?.totalEarnedInr || 0;

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="rounded-2xl border border-[#EAD9C8] bg-[#FFF8F0] p-5 dark:border-purple-900/40 dark:bg-[#1C1425]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#6B21A8] dark:text-purple-300">
              <Gift className="size-3.5 text-[#FF6B35]" aria-hidden="true" />
              PARTICIPATE IN MYSTERY BOXES
            </p>
            <h3 className="mt-1 text-lg font-extrabold text-neutral-950 dark:text-white">
              Supply Your Cakes &amp; Goodies for FindMyBites Mystery Boxes
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-neutral-600 dark:text-neutral-300">
              Submit your signature brownies, cookies, cupcakes, chocolates, or mini cakes with your wholesale contribution price. Once approved by Admin, your goodies get featured in customer mystery boxes with guaranteed payouts.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-[#EAD9C8] bg-white px-3 py-2 dark:border-purple-800/40 dark:bg-[#241A30]">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Submitted</p>
              <p className="text-base font-extrabold tabular-nums text-neutral-950 dark:text-white">
                {submissions.length}
              </p>
            </div>
            <div className="rounded-xl border border-[#EAD9C8] bg-white px-3 py-2 dark:border-purple-800/40 dark:bg-[#241A30]">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Assigned Jobs</p>
              <p className="text-base font-extrabold tabular-nums text-[#6B21A8] dark:text-purple-300">
                {assignedFulfillments.length}
              </p>
            </div>
            <div className="rounded-xl border border-[#EAD9C8] bg-white px-3 py-2 dark:border-purple-800/40 dark:bg-[#241A30]">
              <p className="text-[10px] font-bold uppercase text-neutral-500">Earnings</p>
              <p className="text-base font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                {formatInr(totalEarnedInr)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Goodies Form */}
      <form
        onSubmit={handleSubmitProduct}
        className="space-y-4 rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <Plus className="size-4 text-[#FF6B35]" aria-hidden="true" />
            Submit Available Cakes / Goodies for Admin Approval
          </h4>
          {myVendors.length > 1 && (
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground"
            >
              {myVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {myVendors.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Create your FindMyBites storefront first to register as a Mystery Box partner baker.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-foreground">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Belgian Walnut Fudge Brownies (Box of 2)"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {GOODIE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">
                  Contribution Price (₹) *
                </label>
                <input
                  type="number"
                  min={20}
                  required
                  value={contributionPriceInr}
                  onChange={(e) => setContributionPriceInr(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">
                  Retail Value (₹) *
                </label>
                <input
                  type="number"
                  min={40}
                  required
                  value={retailValueInr}
                  onChange={(e) => setRetailValueInr(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">
                  Qty Available / Day
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantityAvailable}
                  onChange={(e) => setQuantityAvailable(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">Unit Label</label>
                <input
                  type="text"
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  placeholder="pcs / box / cake"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">
                  Prep Time (Hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={prepTimeHours}
                  onChange={(e) => setPrepTimeHours(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">
                  Expiry / Best Before
                </label>
                <input
                  type="text"
                  value={bestBefore}
                  onChange={(e) => setBestBefore(e.target.value)}
                  placeholder="e.g. 48 hours chilled"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">Dietary</label>
                <select
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value as MysteryBoxDietaryType)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="eggless">100% Eggless</option>
                  <option value="veg">Vegetarian</option>
                  <option value="non-veg">Contains Egg</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">
                  Allergens (comma separated)
                </label>
                <input
                  type="text"
                  value={allergensInput}
                  onChange={(e) => setAllergensInput(e.target.value)}
                  placeholder="Dairy, Gluten, Nuts"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">
                  Short Description (shown to customer on unboxing)
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Rich dark chocolate fudge brownies baked fresh daily"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">
                  Delivery Areas (comma separated)
                </label>
                <input
                  type="text"
                  value={deliveryAreasInput}
                  onChange={(e) => setDeliveryAreasInput(e.target.value)}
                  placeholder="Indiranagar, Koramangala, Whitefield"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold text-foreground hover:bg-accent">
                <ImagePlus className="size-4 text-[#FF6B35]" aria-hidden="true" />
                {imageDataUrl ? 'Change Product Photo' : 'Upload Product Photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImagePick}
                  className="hidden"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#EA5822] disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="size-3.5" aria-hidden="true" />
                )}
                Submit for Mystery Box Approval
              </button>
            </div>

            {imageDataUrl && (
              <img
                src={imageDataUrl}
                alt="Preview"
                className="h-20 w-28 rounded-xl border border-border object-cover"
              />
            )}
            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          </>
        )}
      </form>

      {/* Assigned Fulfillment Jobs */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h4 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Truck className="size-4 text-[#6B21A8] dark:text-purple-300" aria-hidden="true" />
          Assigned Mystery Box Orders ({assignedFulfillments.length})
        </h4>
        {loading ? (
          <p className="mt-3 text-xs text-muted-foreground">Loading assignments...</p>
        ) : assignedFulfillments.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Once Admin includes your approved goodies in active Mystery Box packages, customer orders assigned to you will appear here.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {assignedFulfillments.map((job) => (
              <div
                key={`${job.orderId}-${job.fulfillment.vendorId}`}
                className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-background p-3.5 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-[11px] font-bold uppercase text-[#6B21A8] dark:text-purple-300">
                    {job.orderRef} · {job.deliveryDate} ({job.deliverySlot}) · {job.deliveryCity}
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {job.packageName} — {job.fulfillment.itemNames.join(', ')}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Your payout:{' '}
                    <strong className="text-emerald-700 dark:text-emerald-300">
                      {formatInr(job.fulfillment.totalVendorCostInr)}
                    </strong>{' '}
                    ({job.fulfillment.payoutStatus}) · Box status:{' '}
                    {DELIVERY_STATUS_META[job.deliveryStatus]?.label}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(['accepted', 'preparing', 'ready_for_pickup'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingOrderId === job.orderId || job.fulfillment.status === st}
                      onClick={() =>
                        void handleFulfillmentUpdate(job.orderId, job.fulfillment.vendorId, st)
                      }
                      className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                        job.fulfillment.status === st
                          ? 'bg-[#6B21A8] text-white'
                          : 'border border-border bg-card text-foreground hover:bg-accent'
                      }`}
                    >
                      {st === 'accepted'
                        ? 'Accept'
                        : st === 'preparing'
                          ? 'Preparing'
                          : 'Ready for Pickup'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Submitted Goodies List */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h4 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Package className="size-4 text-[#FF6B35]" aria-hidden="true" />
          My Submitted Products ({submissions.length})
        </h4>
        {submissions.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No submissions yet. Submit your best-selling bakery goodies above!
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="flex gap-3 rounded-xl border border-border bg-background p-3"
              >
                <img
                  src={resolveMysteryBoxImage(sub.image, 'hero')}
                  alt={sub.productName}
                  className="size-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-foreground">{sub.productName}</p>
                    <span
                      className={`text-[11px] font-bold uppercase ${
                        sub.status === 'approved'
                          ? 'text-emerald-600'
                          : sub.status === 'rejected'
                            ? 'text-red-600'
                            : 'text-amber-600'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sub.category} · Contribution{' '}
                    <span className="font-bold text-foreground">
                      {formatInr(sub.contributionPriceInr)}
                    </span>{' '}
                    · Retail {formatInr(sub.retailValueInr)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Qty {sub.quantityAvailable} {sub.unitLabel} · Prep {sub.prepTimeHours}h ·{' '}
                    {sub.bestBefore}
                  </p>
                  {sub.adminNote && (
                    <p className="mt-1 text-[11px] font-medium text-[#6B21A8] dark:text-purple-300">
                      Admin note: {sub.adminNote}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
