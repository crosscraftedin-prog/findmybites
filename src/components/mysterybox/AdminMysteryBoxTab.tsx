import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  CheckCircle2,
  Download,
  Edit3,
  Gift,
  ImagePlus,
  IndianRupee,
  Loader2,
  Megaphone,
  Package,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Store,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  DEFAULT_MARKETING_CONFIG,
  DELIVERY_STATUS_META,
  FULFILLMENT_MODEL_LABELS,
  MYSTERY_BOX_DEFAULT_CITIES,
  MYSTERY_BOX_SEASONAL_PRESETS,
  MYSTERY_BOX_THEMES,
  type MysteryBoxAssignedItem,
  type MysteryBoxCoupon,
  type MysteryBoxCuratedItem,
  type MysteryBoxDeliveryStatus,
  type MysteryBoxDietaryType,
  type MysteryBoxFulfillmentModel,
  type MysteryBoxMarketingConfig,
  type MysteryBoxOrder,
  type MysteryBoxPackage,
  type MysteryBoxSeasonalEdition,
  type MysteryBoxTheme,
  type MysteryBoxVendorSubmission,
  formatInr,
  getThemeLabel,
} from '../../data/mysteryBoxes';
import { resolveMysteryBoxImage } from '../../data/mysteryBoxImages';
import {
  type AdminMysteryBoxState,
  deleteAdminMysteryBoxPackage,
  fetchAdminMysteryBoxState,
  saveAdminMysteryBoxMarketing,
  saveAdminMysteryBoxPackage,
  updateAdminMysteryBoxOrder,
  updateAdminVendorSubmission,
} from '../../services/mysteryBoxService';
import { compressImageFile } from '../../utils/imageUpload';

interface AdminMysteryBoxTabProps {
  user: User | null;
  onNotify: (msg: string) => void;
}

type SubTab = 'packages' | 'orders' | 'vendors' | 'finance' | 'marketing';

function createEmptyPackage(): MysteryBoxPackage {
  return {
    id: `mbox-${Date.now().toString(36)}`,
    slug: '',
    name: 'New Seasonal Mystery Box',
    tagline: 'A sealed surprise waiting just for you!',
    theme: 'christmas',
    priceInr: 999,
    guaranteedMinValueInr: 1250,
    minGoodiesCount: 5,
    description:
      'Limited-edition sealed mystery box delivered across Hyderabad. Exact contents stay secret until you unwrap online after checkout.',
    categoryExpectations: ['Mystery'],
    image: 'preset:celebration',
    gallery: ['preset:celebration'],
    stockCount: 25,
    deliveryAvailable: true,
    deliveryCities: MYSTERY_BOX_DEFAULT_CITIES,
    estimatedDeliveryTime: 'Next-Day / Scheduled Delivery (Hyderabad · Min 24 hrs)',
    deliveryFeeInr: 79,
    packagingCostInr: 75,
    estimatedDeliveryCostInr: 80,
    fulfillmentModel: 'central_packing',
    dietarySummary: 'eggless',
    allergenNotice: 'Prepared in kitchens that handle dairy, wheat/gluten, soy, and tree nuts.',
    storageNote: 'Keep refrigerated at 4–8°C on arrival.',
    cancellationPolicy: 'Free cancellation up to 4 hours before baking slot.',
    active: true,
    featured: true,
    sortOrder: 6,
    curatedItems: [],
  };
}

export function AdminMysteryBoxTab({ user, onNotify }: AdminMysteryBoxTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('packages');
  const [state, setState] = useState<AdminMysteryBoxState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Package editor state
  const [editingPkg, setEditingPkg] = useState<MysteryBoxPackage | null>(null);
  const [expectationsText, setExpectationsText] = useState('');
  const [citiesText, setCitiesText] = useState('');

  // Marketing editor state
  const [marketingDraft, setMarketingDraft] = useState<MysteryBoxMarketingConfig>(
    DEFAULT_MARKETING_CONFIG
  );

  // Order audited contents override state
  const [overrideOrder, setOverrideOrder] = useState<MysteryBoxOrder | null>(null);
  const [overrideItems, setOverrideItems] = useState<MysteryBoxAssignedItem[]>([]);
  const [overrideReason, setOverrideReason] = useState('');

  const loadState = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchAdminMysteryBoxState(user);
      setState(data);
      setMarketingDraft(data.marketing);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to load Mystery Boxes admin state.');
    } finally {
      setLoading(false);
    }
  }, [user, onNotify]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const openPkgEditor = (pkg: MysteryBoxPackage) => {
    setEditingPkg({
      ...pkg,
      curatedItems: (pkg.curatedItems || []).map((i) => ({ ...i })),
    });
    setExpectationsText((pkg.categoryExpectations || []).join('\n'));
    setCitiesText((pkg.deliveryCities || []).join(', '));
  };

  const handlePkgImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPkg) return;
    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.82,
        maxChars: 260000,
      });
      setEditingPkg({ ...editingPkg, image: compressed });
    } catch {
      onNotify('Could not read uploaded image.');
    }
  };

  const handleSavePackage = async () => {
    if (!editingPkg) return;
    setSaving(true);
    try {
      const payload: MysteryBoxPackage = {
        ...editingPkg,
        categoryExpectations: expectationsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        deliveryCities: citiesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await saveAdminMysteryBoxPackage(payload, user);
      onNotify(`Saved Mystery Box package "${payload.name}".`);
      setEditingPkg(null);
      await loadState();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to save package.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePackage = async (pkg: MysteryBoxPackage) => {
    setSaving(true);
    try {
      await deleteAdminMysteryBoxPackage(pkg.id, user);
      onNotify(`Deleted "${pkg.name}".`);
      await loadState();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to delete package.');
    } finally {
      setSaving(false);
    }
  };

  const addBlankCuratedItem = () => {
    if (!editingPkg) return;
    const newItem: MysteryBoxCuratedItem = {
      id: `item-${Date.now().toString(36)}`,
      productName: 'Assorted Fudge Brownies',
      category: 'Brownies',
      shortDescription: 'Freshly baked artisanal treat.',
      quantity: 2,
      unitLabel: 'pcs',
      vendorId: 'fmb-central',
      vendorName: 'FindMyBites Partner Baker',
      vendorContributionCostInr: 120,
      retailValueInr: 220,
      image: editingPkg.image || 'preset:hero',
      dietary: 'eggless',
      allergens: ['Dairy', 'Gluten'],
      bestBefore: '48 hours chilled',
      prepHours: 4,
      isBackupAlternative: false,
      showVendorName: true,
    };
    setEditingPkg({
      ...editingPkg,
      curatedItems: [...(editingPkg.curatedItems || []), newItem],
    });
  };

  const addFromApprovedSubmission = (sub: MysteryBoxVendorSubmission) => {
    if (!editingPkg) return;
    const item: MysteryBoxCuratedItem = {
      id: `sub-${sub.id}-${Date.now().toString(36)}`,
      productName: sub.productName,
      category: sub.category,
      shortDescription: sub.shortDescription,
      quantity: 1,
      unitLabel: sub.unitLabel,
      vendorId: sub.vendorId,
      vendorName: sub.vendorName,
      vendorContributionCostInr: sub.contributionPriceInr,
      retailValueInr: sub.retailValueInr,
      image: sub.image || editingPkg.image,
      dietary: sub.dietary,
      allergens: sub.allergens,
      bestBefore: sub.bestBefore,
      prepHours: sub.prepTimeHours,
      isBackupAlternative: false,
      showVendorName: true,
    };
    setEditingPkg({
      ...editingPkg,
      curatedItems: [...(editingPkg.curatedItems || []), item],
    });
    onNotify(`Added "${sub.productName}" by ${sub.vendorName} to curated pool.`);
  };

  const handleOrderStatusChange = async (orderId: string, deliveryStatus: MysteryBoxDeliveryStatus) => {
    try {
      await updateAdminMysteryBoxOrder(orderId, { deliveryStatus }, user);
      onNotify(`Order status updated to ${DELIVERY_STATUS_META[deliveryStatus].label}.`);
      await loadState();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to update order status.');
    }
  };

  const handlePayoutStatusChange = async (
    orderId: string,
    vendorId: string,
    payoutStatus: 'pending' | 'scheduled' | 'paid'
  ) => {
    try {
      await updateAdminMysteryBoxOrder(orderId, { payoutVendorId: vendorId, payoutStatus }, user);
      onNotify(`Vendor payout marked "${payoutStatus}".`);
      await loadState();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to update payout status.');
    }
  };

  const handleSaveAuditedOverride = async () => {
    if (!overrideOrder) return;
    if (overrideReason.trim().length < 5) {
      onNotify('Please provide an audit reason (min 5 characters) before saving.');
      return;
    }
    setSaving(true);
    try {
      await updateAdminMysteryBoxOrder(
        overrideOrder.id,
        {
          overrideAssignedItems: overrideItems,
          overrideReason: overrideReason.trim(),
        },
        user
      );
      onNotify('Assigned contents updated and logged to order audit trail.');
      setOverrideOrder(null);
      setOverrideReason('');
      await loadState();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to override contents.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmissionAction = async (
    sub: MysteryBoxVendorSubmission,
    status: 'approved' | 'rejected',
    priceOverride?: number
  ) => {
    try {
      await updateAdminVendorSubmission(
        sub.id,
        {
          status,
          ...(priceOverride !== undefined ? { contributionPriceInr: priceOverride } : {}),
        },
        user
      );
      onNotify(`Submission "${sub.productName}" marked ${status}.`);
      await loadState();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to update submission.');
    }
  };

  const handleSaveMarketing = async () => {
    setSaving(true);
    try {
      await saveAdminMysteryBoxMarketing(marketingDraft, user);
      onNotify('Mystery Box marketing, pricing & coupon settings saved.');
      await loadState();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to save marketing settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportFinanceCsv = () => {
    const orders = (state?.orders || []).filter((o) => o.paymentStatus === 'verified');
    const headers = [
      'Order Ref',
      'Date',
      'Package',
      'Customer',
      'City',
      'Selling Price',
      'Delivery Fee',
      'Discount',
      'Total Paid',
      'Vendor Cost',
      'Packaging Cost',
      'Delivery Expense',
      'Net Profit',
      'Status',
    ];
    const rows = orders.map((o) => [
      o.orderRef,
      o.createdAt.slice(0, 10),
      o.packageName,
      o.customerName,
      o.deliveryCity,
      o.sellingPriceInr,
      o.deliveryFeeInr,
      o.discountInr,
      o.totalPaidInr,
      o.vendorCostTotalInr || 0,
      o.packagingCostInr || 0,
      o.deliveryExpenseInr || 0,
      o.netProfitInr || 0,
      o.deliveryStatus,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `findmybites-mystery-box-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const packages = state?.packages || [];
  const orders = state?.orders || [];
  const submissions = state?.submissions || [];
  const approvedSubmissions = submissions.filter((s) => s.status === 'approved');
  const pendingSubmissionsCount = submissions.filter((s) => s.status === 'pending').length;
  const finance = state?.finance;

  return (
    <div className="space-y-5">
      {/* Top Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'packages' as const, label: `Packages (${packages.length})`, icon: Gift },
            { id: 'orders' as const, label: `Orders (${orders.length})`, icon: Truck },
            {
              id: 'vendors' as const,
              label: `Vendors${pendingSubmissionsCount > 0 ? ` (${pendingSubmissionsCount} new)` : ''}`,
              icon: Store,
            },
            { id: 'finance' as const, label: 'Finance & Profit', icon: IndianRupee },
            { id: 'marketing' as const, label: 'Marketing & Coupons', icon: Megaphone },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                subTab === id
                  ? 'bg-[#6B21A8] text-white'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void loadState()}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {loading && !state ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          Loading Mystery Boxes operations...
        </div>
      ) : null}

      {/* SUB-TAB 1: PACKAGES & CURATED CONTENTS */}
      {subTab === 'packages' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-foreground">
                Mystery Box Packages &amp; Curated Item Pools
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure pricing, stock, seasonal themes, guaranteed retail value, and exact secret item pools.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openPkgEditor(createEmptyPackage())}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#FF6B35] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#EA5822]"
            >
              <Plus className="size-4" aria-hidden="true" />
              New Mystery Box Theme
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {packages.map((pkg) => {
              const poolCost = (pkg.curatedItems || [])
                .filter((i) => !i.isBackupAlternative)
                .reduce((s, i) => s + (i.vendorContributionCostInr || 0), 0);
              const poolRetail = (pkg.curatedItems || [])
                .filter((i) => !i.isBackupAlternative)
                .reduce((s, i) => s + (i.retailValueInr || 0), 0);
              const estNet =
                pkg.priceInr +
                (pkg.deliveryFeeInr || 0) -
                poolCost -
                (pkg.packagingCostInr || 0) -
                (pkg.estimatedDeliveryCostInr || 0);
              return (
                <div
                  key={pkg.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex gap-3.5">
                    <img
                      src={resolveMysteryBoxImage(pkg.image, 'celebration')}
                      alt={pkg.name}
                      className="size-20 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-bold uppercase text-[#6B21A8] dark:text-purple-300">
                          {getThemeLabel(pkg.theme)} · {pkg.active ? 'Active' : 'Paused'}
                        </p>
                        <span className="text-xs font-bold tabular-nums text-muted-foreground">
                          Stock: {pkg.stockCount}
                        </span>
                      </div>
                      <h4 className="truncate text-sm font-extrabold text-foreground">
                        {pkg.name} · {formatInr(pkg.priceInr)}
                      </h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {(pkg.curatedItems || []).length} curated items · Pool retail{' '}
                        {formatInr(poolRetail)} (min {formatInr(pkg.guaranteedMinValueInr)})
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Vendor cost {formatInr(poolCost)} · Est. Net Profit:{' '}
                        <strong
                          className={estNet >= 0 ? 'text-emerald-600' : 'text-red-600'}
                        >
                          {formatInr(estNet)}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => openPkgEditor(pkg)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#6B21A8] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#581C87]"
                    >
                      <Edit3 className="size-3.5" aria-hidden="true" />
                      Edit Package &amp; Contents
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeletePackage(pkg)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ORDERS & TRACKING */}
      {subTab === 'orders' && (
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-foreground">
            Mystery Box Orders, Unboxing Status &amp; Fulfillment ({orders.length})
          </h3>
          {orders.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No Mystery Box orders placed yet. Orders will appear here as soon as customers check out.
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="space-y-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase text-[#6B21A8] dark:text-purple-300">
                        {order.orderRef} · Payment: {order.paymentStatus.toUpperCase()}
                        {order.paymentProviderRef ? ` (${order.paymentProviderRef})` : ''} ·{' '}
                        {order.unboxedAt ? 'UNWRAPPED' : 'SEALED'}
                      </p>
                      <h4 className="text-sm font-extrabold text-foreground">
                        {order.packageName} · {formatInr(order.totalPaidInr)} ·{' '}
                        {order.customerName} ({order.customerPhone})
                      </h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Deliver {order.deliveryDate} ({order.deliverySlot}) · {order.deliveryCity} —{' '}
                        {order.deliveryAddress}
                        {order.isGift ? ` · GIFT for ${order.recipientName} (${order.recipientPhone})` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={order.deliveryStatus}
                        onChange={(e) =>
                          void handleOrderStatusChange(
                            order.id,
                            e.target.value as MysteryBoxDeliveryStatus
                          )
                        }
                        className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground"
                      >
                        {(Object.keys(DELIVERY_STATUS_META) as MysteryBoxDeliveryStatus[]).map(
                          (st) => (
                            <option key={st} value={st}>
                              {DELIVERY_STATUS_META[st].label}
                            </option>
                          )
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setOverrideOrder(order);
                          setOverrideItems((order.assignedItems || []).map((i) => ({ ...i })));
                          setOverrideReason('');
                        }}
                        className="cursor-pointer rounded-xl border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent"
                      >
                        Inspect / Audited Override
                      </button>
                    </div>
                  </div>

                  {/* Assigned Items Summary & Vendor Payout Controls */}
                  <div className="rounded-xl bg-muted/50 p-3 text-xs">
                    <p className="font-bold text-foreground">
                      Locked Box Contents ({order.assignedItems?.length || 0} items · Retail{' '}
                      {formatInr(order.assignedTotalRetailValueInr || 0)} · Net Profit{' '}
                      <span className="text-emerald-600">{formatInr(order.netProfitInr || 0)}</span>):
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {(order.assignedItems || [])
                        .map((i) => `${i.productName} (${i.quantity} ${i.unitLabel} — ${i.vendorName})`)
                        .join(' · ')}
                    </p>
                    {(order.vendorFulfillments || []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(order.vendorFulfillments || []).map((vf) => (
                          <div
                            key={vf.vendorId}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px]"
                          >
                            <span className="font-semibold text-foreground">
                              {vf.vendorName}: {formatInr(vf.totalVendorCostInr)} ({vf.status})
                            </span>
                            <select
                              value={vf.payoutStatus}
                              onChange={(e) =>
                                void handlePayoutStatusChange(
                                  order.id,
                                  vf.vendorId,
                                  e.target.value as 'pending' | 'scheduled' | 'paid'
                                )
                              }
                              className="rounded border border-border bg-card px-1.5 py-0.5 text-[11px] font-bold"
                            >
                              <option value="pending">Payout Pending</option>
                              <option value="scheduled">Scheduled</option>
                              <option value="paid">Paid</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                    {(order.contentsAuditLog || []).length > 0 && (
                      <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        Audit log: {order.contentsAuditLog!.length} admin edit(s) — last reason:{' '}
                        “{order.contentsAuditLog![order.contentsAuditLog!.length - 1].reason}”
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: VENDOR PARTICIPATION SUBMISSIONS */}
      {subTab === 'vendors' && (
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-foreground">
            Vendor Product Submissions for Mystery Boxes ({submissions.length})
          </h3>
          {submissions.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No vendor submissions yet. Bakers can submit products from their Vendor Dashboard → Mystery Boxes tab.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex gap-3">
                    <img
                      src={resolveMysteryBoxImage(sub.image, 'hero')}
                      alt={sub.productName}
                      className="size-16 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase text-[#6B21A8] dark:text-purple-300">
                        {sub.vendorName} ({sub.city}) · {sub.status}
                      </p>
                      <h4 className="truncate text-sm font-extrabold text-foreground">
                        {sub.productName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Contribution: <strong>{formatInr(sub.contributionPriceInr)}</strong> · Retail:{' '}
                        {formatInr(sub.retailValueInr)} · Qty: {sub.quantityAvailable}{' '}
                        {sub.unitLabel}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Prep {sub.prepTimeHours}h · {sub.bestBefore} · {sub.dietary}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-border pt-2.5">
                    <button
                      type="button"
                      onClick={() => void handleSubmissionAction(sub, 'approved')}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <Check className="size-3.5" aria-hidden="true" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSubmissionAction(sub, 'rejected')}
                      className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900/50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: FINANCE & PROFIT REPORT */}
      {subTab === 'finance' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-foreground">
                Mystery Box Financial &amp; Order Profit Report
              </h3>
              <p className="text-xs text-muted-foreground">
                Order-level revenue, vendor contribution costs, packaging, delivery expense, and net profit.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportFinanceCsv}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#6B21A8] px-4 py-2 text-xs font-bold text-white hover:bg-[#581C87]"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: 'Verified Orders', value: String(finance?.totalVerifiedOrders || 0) },
              { label: 'Gross Revenue', value: formatInr(finance?.totalGrossRevenueInr || 0) },
              { label: 'Vendor Payouts', value: formatInr(finance?.totalVendorCostInr || 0) },
              {
                label: 'Packing + Delivery',
                value: formatInr(
                  (finance?.totalPackagingCostInr || 0) + (finance?.totalDeliveryExpenseInr || 0)
                ),
              },
              {
                label: 'Net Profit',
                value: formatInr(finance?.totalNetProfitInr || 0),
                highlight: true,
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className={`rounded-2xl border p-3.5 ${
                  kpi.highlight
                    ? 'border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/25'
                    : 'border-border bg-card'
                }`}
              >
                <p className="text-[11px] font-bold uppercase text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums text-foreground">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Ref</th>
                  <th className="px-3 py-2.5">Box</th>
                  <th className="px-3 py-2.5">Selling</th>
                  <th className="px-3 py-2.5">Deliv. Fee</th>
                  <th className="px-3 py-2.5">Discount</th>
                  <th className="px-3 py-2.5">Vendor Cost</th>
                  <th className="px-3 py-2.5">Pack+Ship</th>
                  <th className="px-3 py-2.5">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders
                  .filter((o) => o.paymentStatus === 'verified')
                  .map((o) => (
                    <tr key={o.id}>
                      <td className="px-3 py-2.5 font-mono font-semibold">{o.orderRef}</td>
                      <td className="px-3 py-2.5 font-semibold">{o.packageName}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatInr(o.sellingPriceInr)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatInr(o.deliveryFeeInr)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-amber-600">
                        -{formatInr(o.discountInr)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {formatInr(o.vendorCostTotalInr || 0)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">
                        {formatInr((o.packagingCostInr || 0) + (o.deliveryExpenseInr || 0))}
                      </td>
                      <td className="px-3 py-2.5 font-extrabold tabular-nums text-emerald-600">
                        {formatInr(o.netProfitInr || 0)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: MARKETING, CAMPAIGNS & COUPONS */}
      {subTab === 'marketing' && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-extrabold text-foreground">
              Homepage Campaign Copy, UPI Checkout &amp; Promo Coupons
            </h3>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveMarketing()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#FF6B35] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#EA5822] disabled:opacity-60"
            >
              <Save className="size-3.5" aria-hidden="true" />
              Save Settings
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-2xl border border-border bg-muted/30 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-foreground">
                    Seasonal Packaging &amp; Theme Edition
                  </label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Switch seasonal packaging, festive atmosphere, and campaign copy anytime without rebuilding Mystery Boxes.
                  </p>
                </div>
                <select
                  value={marketingDraft.seasonalEdition || 'christmas'}
                  onChange={(e) => {
                    const nextEdition = e.target.value as MysteryBoxSeasonalEdition;
                    const nextPreset = MYSTERY_BOX_SEASONAL_PRESETS[nextEdition];
                    setMarketingDraft({
                      ...marketingDraft,
                      seasonalEdition: nextEdition,
                      campaignHeadline: nextPreset.campaignHeadline,
                      campaignTagline: nextPreset.campaignTagline,
                      campaignSubheading: nextPreset.campaignSubheading,
                      seasonalBannerText: nextPreset.seasonalBannerText,
                    });
                  }}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold"
                >
                  {(Object.keys(MYSTERY_BOX_SEASONAL_PRESETS) as MysteryBoxSeasonalEdition[]).map(
                    (edKey) => (
                      <option key={edKey} value={edKey}>
                        {MYSTERY_BOX_SEASONAL_PRESETS[edKey].label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Main Headline</label>
              <input
                type="text"
                value={marketingDraft.campaignHeadline}
                onChange={(e) =>
                  setMarketingDraft({ ...marketingDraft, campaignHeadline: e.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Campaign Tagline</label>
              <input
                type="text"
                value={marketingDraft.campaignTagline}
                onChange={(e) =>
                  setMarketingDraft({ ...marketingDraft, campaignTagline: e.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold">Subheading</label>
              <textarea
                rows={2}
                value={marketingDraft.campaignSubheading}
                onChange={(e) =>
                  setMarketingDraft({ ...marketingDraft, campaignSubheading: e.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Seasonal Banner Strip</label>
              <input
                type="text"
                value={marketingDraft.seasonalBannerText}
                onChange={(e) =>
                  setMarketingDraft({ ...marketingDraft, seasonalBannerText: e.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">UPI Handle (for QR Checkout)</label>
              <input
                type="text"
                value={marketingDraft.upiHandle}
                onChange={(e) =>
                  setMarketingDraft({ ...marketingDraft, upiHandle: e.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Free Delivery Above (₹)</label>
              <input
                type="number"
                value={marketingDraft.freeDeliveryAboveInr}
                onChange={(e) =>
                  setMarketingDraft({
                    ...marketingDraft,
                    freeDeliveryAboveInr: Number(e.target.value) || 0,
                  })
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Platform Commission (%)</label>
              <input
                type="number"
                value={marketingDraft.platformCommissionPercent}
                onChange={(e) =>
                  setMarketingDraft({
                    ...marketingDraft,
                    platformCommissionPercent: Number(e.target.value) || 0,
                  })
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm tabular-nums"
              />
            </div>
          </div>

          {/* Coupon Editor */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Promotional Coupons
              </h4>
              <button
                type="button"
                onClick={() =>
                  setMarketingDraft({
                    ...marketingDraft,
                    coupons: [
                      ...marketingDraft.coupons,
                      {
                        code: `TREAT${Math.floor(10 + Math.random() * 89)}`,
                        description: 'Special Mystery Box discount',
                        type: 'flat',
                        value: 100,
                        minOrderInr: 799,
                        maxDiscountInr: 100,
                        active: true,
                      },
                    ],
                  })
                }
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#6B21A8] px-2.5 py-1 text-xs font-bold text-white"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add Coupon
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {marketingDraft.coupons.map((c, idx) => (
                <div
                  key={`${c.code}-${idx}`}
                  className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-2.5 sm:grid-cols-6"
                >
                  <input
                    type="text"
                    value={c.code}
                    onChange={(e) => {
                      const next = [...marketingDraft.coupons];
                      next[idx] = { ...c, code: e.target.value.toUpperCase() };
                      setMarketingDraft({ ...marketingDraft, coupons: next });
                    }}
                    className="rounded-lg border border-border px-2 py-1 font-mono text-xs uppercase"
                    placeholder="CODE"
                  />
                  <select
                    value={c.type}
                    onChange={(e) => {
                      const next = [...marketingDraft.coupons];
                      next[idx] = { ...c, type: e.target.value as MysteryBoxCoupon['type'] };
                      setMarketingDraft({ ...marketingDraft, coupons: next });
                    }}
                    className="rounded-lg border border-border px-2 py-1 text-xs"
                  >
                    <option value="flat">Flat ₹</option>
                    <option value="percent">Percent %</option>
                  </select>
                  <input
                    type="number"
                    value={c.value}
                    onChange={(e) => {
                      const next = [...marketingDraft.coupons];
                      next[idx] = { ...c, value: Number(e.target.value) || 0 };
                      setMarketingDraft({ ...marketingDraft, coupons: next });
                    }}
                    className="rounded-lg border border-border px-2 py-1 text-xs"
                    placeholder="Value"
                  />
                  <input
                    type="number"
                    value={c.minOrderInr}
                    onChange={(e) => {
                      const next = [...marketingDraft.coupons];
                      next[idx] = { ...c, minOrderInr: Number(e.target.value) || 0 };
                      setMarketingDraft({ ...marketingDraft, coupons: next });
                    }}
                    className="rounded-lg border border-border px-2 py-1 text-xs"
                    placeholder="Min ₹"
                  />
                  <label className="flex items-center gap-1.5 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={c.active}
                      onChange={(e) => {
                        const next = [...marketingDraft.coupons];
                        next[idx] = { ...c, active: e.target.checked };
                        setMarketingDraft({ ...marketingDraft, coupons: next });
                      }}
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setMarketingDraft({
                        ...marketingDraft,
                        coupons: marketingDraft.coupons.filter((_, i) => i !== idx),
                      })
                    }
                    className="cursor-pointer justify-self-end text-xs font-bold text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PACKAGE & CURATED POOL EDITOR MODAL */}
      {editingPkg && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[95] flex items-center justify-center bg-neutral-950/75 p-3 backdrop-blur-sm"
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h4 className="text-sm font-extrabold text-foreground">
                Configure Mystery Box: {editingPkg.name}
              </h4>
              <button
                type="button"
                onClick={() => setEditingPkg(null)}
                className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold">Package Name</label>
                  <input
                    type="text"
                    value={editingPkg.name}
                    onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">Theme / Season</label>
                  <select
                    value={editingPkg.theme}
                    onChange={(e) =>
                      setEditingPkg({ ...editingPkg, theme: e.target.value as MysteryBoxTheme })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    {MYSTERY_BOX_THEMES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">Fulfillment Model</label>
                  <select
                    value={editingPkg.fulfillmentModel}
                    onChange={(e) =>
                      setEditingPkg({
                        ...editingPkg,
                        fulfillmentModel: e.target.value as MysteryBoxFulfillmentModel,
                      })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    {(Object.keys(FULFILLMENT_MODEL_LABELS) as MysteryBoxFulfillmentModel[]).map(
                      (k) => (
                        <option key={k} value={k}>
                          {FULFILLMENT_MODEL_LABELS[k]}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                <div>
                  <label className="mb-1 block text-xs font-bold">Price (₹)</label>
                  <input
                    type="number"
                    value={editingPkg.priceInr}
                    onChange={(e) =>
                      setEditingPkg({ ...editingPkg, priceInr: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">Min Value (₹)</label>
                  <input
                    type="number"
                    value={editingPkg.guaranteedMinValueInr}
                    onChange={(e) =>
                      setEditingPkg({
                        ...editingPkg,
                        guaranteedMinValueInr: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">Min Items</label>
                  <input
                    type="number"
                    value={editingPkg.minGoodiesCount}
                    onChange={(e) =>
                      setEditingPkg({
                        ...editingPkg,
                        minGoodiesCount: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">Stock</label>
                  <input
                    type="number"
                    value={editingPkg.stockCount}
                    onChange={(e) =>
                      setEditingPkg({ ...editingPkg, stockCount: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">Pack Cost (₹)</label>
                  <input
                    type="number"
                    value={editingPkg.packagingCostInr}
                    onChange={(e) =>
                      setEditingPkg({
                        ...editingPkg,
                        packagingCostInr: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold">Deliv Fee (₹)</label>
                  <input
                    type="number"
                    value={editingPkg.deliveryFeeInr}
                    onChange={(e) =>
                      setEditingPkg({
                        ...editingPkg,
                        deliveryFeeInr: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold">
                    Public Category Hints (one per line — no spoilers)
                  </label>
                  <textarea
                    rows={3}
                    value={expectationsText}
                    onChange={(e) => setExpectationsText(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold">
                      Delivery Cities (comma separated)
                    </label>
                    <input
                      type="text"
                      value={citiesText}
                      onChange={(e) => setCitiesText(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-bold">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={editingPkg.active}
                        onChange={(e) =>
                          setEditingPkg({ ...editingPkg, active: e.target.checked })
                        }
                      />
                      Active on Storefront
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5">
                      <ImagePlus className="size-3.5 text-[#FF6B35]" aria-hidden="true" />
                      Upload Box Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePkgImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Secret Curated Item Pool Editor */}
              <div className="space-y-3 rounded-2xl border border-[#6B21A8]/30 bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#6B21A8] dark:text-purple-300">
                      Secret Curated Contents Pool ({(editingPkg.curatedItems || []).length} items)
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      Hidden from customers until verified checkout. Locked immutably into each order.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addBlankCuratedItem}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#6B21A8] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Add Item
                  </button>
                </div>

                {approvedSubmissions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground">
                      Import approved vendor item:
                    </span>
                    {approvedSubmissions.slice(0, 6).map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => addFromApprovedSubmission(sub)}
                        className="cursor-pointer rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
                      >
                        + {sub.productName} ({sub.vendorName} · {formatInr(sub.contributionPriceInr)})
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {(editingPkg.curatedItems || []).map((item, idx) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-6"
                    >
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => {
                          const next = [...(editingPkg.curatedItems || [])];
                          next[idx] = { ...item, productName: e.target.value };
                          setEditingPkg({ ...editingPkg, curatedItems: next });
                        }}
                        placeholder="Item name"
                        className="col-span-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold"
                      />
                      <input
                        type="text"
                        value={item.vendorName}
                        onChange={(e) => {
                          const next = [...(editingPkg.curatedItems || [])];
                          next[idx] = { ...item, vendorName: e.target.value };
                          setEditingPkg({ ...editingPkg, curatedItems: next });
                        }}
                        placeholder="Vendor name"
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                      />
                      <input
                        type="number"
                        value={item.vendorContributionCostInr}
                        onChange={(e) => {
                          const next = [...(editingPkg.curatedItems || [])];
                          next[idx] = {
                            ...item,
                            vendorContributionCostInr: Number(e.target.value) || 0,
                          };
                          setEditingPkg({ ...editingPkg, curatedItems: next });
                        }}
                        title="Vendor Contribution Cost (₹)"
                        placeholder="Cost ₹"
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs tabular-nums"
                      />
                      <input
                        type="number"
                        value={item.retailValueInr}
                        onChange={(e) => {
                          const next = [...(editingPkg.curatedItems || [])];
                          next[idx] = { ...item, retailValueInr: Number(e.target.value) || 0 };
                          setEditingPkg({ ...editingPkg, curatedItems: next });
                        }}
                        title="Retail Value (₹)"
                        placeholder="Retail ₹"
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs tabular-nums"
                      />
                      <div className="flex items-center justify-between gap-1">
                        <label className="flex items-center gap-1 text-[10px] font-bold">
                          <input
                            type="checkbox"
                            checked={Boolean(item.isBackupAlternative)}
                            onChange={(e) => {
                              const next = [...(editingPkg.curatedItems || [])];
                              next[idx] = { ...item, isBackupAlternative: e.target.checked };
                              setEditingPkg({ ...editingPkg, curatedItems: next });
                            }}
                          />
                          Backup
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingPkg({
                              ...editingPkg,
                              curatedItems: (editingPkg.curatedItems || []).filter(
                                (_, i) => i !== idx
                              ),
                            })
                          }
                          className="cursor-pointer text-xs font-bold text-red-600"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
              <button
                type="button"
                onClick={() => setEditingPkg(null)}
                className="cursor-pointer rounded-xl border border-border px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSavePackage()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#FF6B35] px-5 py-2 text-xs font-extrabold text-white hover:bg-[#EA5822] disabled:opacity-60"
              >
                <Save className="size-3.5" aria-hidden="true" />
                Save Mystery Box Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDITED ORDER CONTENTS OVERRIDE MODAL */}
      {overrideOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[95] flex items-center justify-center bg-neutral-950/75 p-3 backdrop-blur-sm"
        >
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div>
                <h4 className="text-sm font-extrabold text-foreground">
                  Assigned Contents · {overrideOrder.orderRef}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  All customer orders stay locked unless edited here with an audit trail reason.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOverrideOrder(null)}
                className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {overrideItems.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-4"
                >
                  <input
                    type="text"
                    value={item.productName}
                    onChange={(e) => {
                      const next = [...overrideItems];
                      next[idx] = { ...item, productName: e.target.value };
                      setOverrideItems(next);
                    }}
                    className="sm:col-span-2 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={item.vendorName}
                    onChange={(e) => {
                      const next = [...overrideItems];
                      next[idx] = { ...item, vendorName: e.target.value };
                      setOverrideItems(next);
                    }}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {
                      const next = [...overrideItems];
                      next[idx] = { ...item, quantity: Number(e.target.value) || 1 };
                      setOverrideItems(next);
                    }}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs tabular-nums"
                  />
                </div>
              ))}

              <div>
                <label className="mb-1 block text-xs font-bold text-foreground">
                  Audit Reason (Required to save changes) *
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Substituted walnut brownie with nut-free fudge brownie per customer allergy"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
              <button
                type="button"
                onClick={() => setOverrideOrder(null)}
                className="cursor-pointer rounded-xl border border-border px-4 py-2 text-xs font-bold"
              >
                Close
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveAuditedOverride()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#6B21A8] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#581C87]"
              >
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Save Audited Correction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
