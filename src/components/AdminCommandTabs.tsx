import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Loader2,
  MapPin,
  Megaphone,
  MessageCircle,
  RefreshCw,
  Save,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Star,
  Store,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  AdminTransferRecord,
  BookingEnquiry,
  CloudVendorMetric,
  CurrencyCode,
  EventRequest,
  SiteSettings,
  Vendor,
  formatMoney,
  generateTransferPasscode,
  normalizePasscode,
  normalizePhoneDigits,
} from '../data/vendors';
import {
  AdminReviewRecord,
  adminDeleteBookingInCloud,
  adminDeleteEventRequestInCloud,
  adminUpdateEventRequestStatus,
  deleteReviewInCloud,
  deleteVendorInCloud,
  saveSiteSettingsInCloud,
  updateBookingStatusInCloud,
  updateVendorInCloud,
} from '../services/firestoreService';
import {
  PRIORITY_SEO_CITY_SLUGS,
  SEO_CATEGORIES,
  SEO_CITIES,
  generateAutoStoreSeo,
  generateLiveSitemapXml,
} from '../utils/seoDirectory';

function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location.hostname.includes('findmybites.com')) {
    return 'https://www.findmybites.com';
  }
  return typeof window !== 'undefined' ? window.location.origin : 'https://www.findmybites.com';
}

/* ============================================================================
 * TAB 1: OVERVIEW & LIVE KPIs + LEADERBOARD
 * ========================================================================== */

interface AdminOverviewTabProps {
  allCloudVendors: Vendor[];
  allCatalogVendors: Vendor[];
  pendingTransfersCount: number;
  claimedTransfersCount: number;
  bookings: BookingEnquiry[];
  reviews: AdminReviewRecord[];
  eventRequests: EventRequest[];
  vendorMetrics: CloudVendorMetric[];
  onSwitchTab: (tab: 'approvals' | 'create' | 'transfers' | 'seo' | 'moderation' | 'campaigns') => void;
  onPreviewVendor: (vendor: Vendor) => void;
}

export function AdminOverviewTab({
  allCloudVendors,
  allCatalogVendors,
  pendingTransfersCount,
  claimedTransfersCount,
  bookings,
  reviews,
  eventRequests,
  vendorMetrics,
  onSwitchTab,
  onPreviewVendor,
}: AdminOverviewTabProps) {
  const activeCount = allCloudVendors.filter((v) => v.status !== 'paused' && v.status !== 'pending_review').length;
  const pendingReviewCount = allCloudVendors.filter((v) => v.status === 'pending_review').length;
  const verifiedCount = allCloudVendors.filter((v) => v.verified).length;
  const christmasCount = allCloudVendors.filter((v) => v.christmasSpecial).length;
  const openRequestsCount = eventRequests.filter((r) => r.status === 'open').length;

  const vendorLookup = useMemo(() => {
    const map = new Map<string, Vendor>();
    for (const v of allCatalogVendors) map.set(v.id, v);
    for (const v of allCloudVendors) map.set(v.id, v);
    return map;
  }, [allCatalogVendors, allCloudVendors]);

  const leaderboard = useMemo(() => {
    return [...vendorMetrics]
      .sort((a, b) => b.whatsappClicks * 5 + b.views - (a.whatsappClicks * 5 + a.views))
      .slice(0, 8)
      .map((m) => ({
        metric: m,
        vendor: vendorLookup.get(m.vendorId) ?? null,
      }));
  }, [vendorMetrics, vendorLookup]);

  const kpis = [
    {
      label: 'Live Cloud Stores',
      value: activeCount,
      sub: `${verifiedCount} verified · ${christmasCount} Christmas`,
      icon: Store,
      tone: 'text-brand bg-brand-soft',
      action: () => onSwitchTab('approvals'),
    },
    {
      label: 'Pending Approvals',
      value: pendingReviewCount,
      sub: pendingReviewCount > 0 ? 'Needs review now' : 'Queue clear',
      icon: Clock,
      tone: pendingReviewCount > 0 ? 'text-rose-600 bg-rose-500/15' : 'text-emerald-600 bg-emerald-500/15',
      action: () => onSwitchTab('approvals'),
    },
    {
      label: 'Passcode Transfers',
      value: pendingTransfersCount,
      sub: `${claimedTransfersCount} claimed by bakers`,
      icon: KeyRound,
      tone: 'text-amber-700 bg-amber-500/15 dark:text-amber-300',
      action: () => onSwitchTab('transfers'),
    },
    {
      label: 'Bookings & Leads',
      value: bookings.length,
      sub: `${openRequestsCount} open event requests`,
      icon: Calendar,
      tone: 'text-sky-600 bg-sky-500/15',
      action: () => onSwitchTab('moderation'),
    },
    {
      label: 'Customer Reviews',
      value: reviews.length,
      sub: 'Live cloud feedback',
      icon: Star,
      tone: 'text-amber-600 bg-amber-500/15',
      action: () => onSwitchTab('moderation'),
    },
    {
      label: 'SEO Indexed Pages',
      value: PRIORITY_SEO_CITY_SLUGS.length * 16 + activeCount * 2,
      sub: 'City × Category + Storefronts',
      icon: Globe2,
      tone: 'text-emerald-600 bg-emerald-500/15',
      action: () => onSwitchTab('seo'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <button
              key={k.label}
              type="button"
              onClick={k.action}
              className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-brand/50 hover:shadow-sm"
            >
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${k.tone}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {k.label}
                </p>
                <p className="mt-0.5 font-mono text-2xl font-black leading-none text-foreground">
                  {k.value}
                </p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{k.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Shortcuts */}
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onSwitchTab('create')}
          className="flex cursor-pointer items-center justify-between rounded-2xl border border-brand-border bg-brand-soft/60 p-4 text-left hover:bg-brand-soft"
        >
          <div>
            <p className="text-xs font-extrabold text-brand">60-Second Concierge Builder</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Build a baker store + generate WhatsApp passcode
            </p>
          </div>
          <Sparkles className="size-5 shrink-0 text-brand" />
        </button>
        <button
          type="button"
          onClick={() => onSwitchTab('seo')}
          className="flex cursor-pointer items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left hover:bg-emerald-500/15"
        >
          <div>
            <p className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
              Google SEO &amp; Live Sitemap
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Optimize titles, descriptions &amp; export sitemap.xml
            </p>
          </div>
          <Globe2 className="size-5 shrink-0 text-emerald-600" />
        </button>
        <button
          type="button"
          onClick={() => onSwitchTab('campaigns')}
          className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-card p-4 text-left hover:border-brand/50"
        >
          <div>
            <p className="text-xs font-extrabold text-foreground">Site &amp; Campaign Controls</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Toggle approval queue, snowfall &amp; promo banner
            </p>
          </div>
          <Snowflake className="size-5 shrink-0 text-sky-500" />
        </button>
      </div>

      {/* Top Performing Stores Leaderboard */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              <TrendingUp className="size-4 text-brand" />
              Top Performing Stores (Live Analytics)
            </h3>
            <p className="text-xs text-muted-foreground">
              Ranked by direct WhatsApp clicks &amp; storefront views from Cloud Firestore.
            </p>
          </div>
          <BarChart3 className="size-4 text-muted-foreground" />
        </div>

        {leaderboard.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Storefront views and WhatsApp clicks will appear here in real time as shoppers browse.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {leaderboard.map(({ metric, vendor }, idx) => (
              <div
                key={metric.vendorId}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-muted font-mono text-[11px] font-extrabold text-foreground">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">
                      {vendor ? vendor.name : metric.vendorId}
                    </p>
                    {vendor && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {vendor.category} · {vendor.city}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Eye className="size-3" /> {metric.views}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <MessageCircle className="size-3" /> {metric.whatsappClicks} WA
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Share2 className="size-3" /> {metric.shares}
                  </span>
                  {vendor && (
                    <button
                      type="button"
                      onClick={() => onPreviewVendor(vendor)}
                      className="cursor-pointer rounded-lg border border-border px-2 py-1 font-sans text-[11px] font-bold hover:border-brand"
                    >
                      Open
                    </button>
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

/* ============================================================================
 * TAB 2: APPROVALS & STORE REVIEW QUEUE
 * ========================================================================== */

interface AdminApprovalsTabProps {
  adminUser: User;
  allCloudVendors: Vendor[];
  transfers: AdminTransferRecord[];
  currency: CurrencyCode;
  onEditVendor: (vendor: Vendor) => void;
  onPreviewVendor: (vendor: Vendor) => void;
  onIssueTransfer: (vendor: Vendor, phone: string, passcode: string) => Promise<void>;
  onToast: (msg: string) => void;
}

export function AdminApprovalsTab({
  adminUser,
  allCloudVendors,
  currency,
  onEditVendor,
  onPreviewVendor,
  onIssueTransfer,
  onToast,
}: AdminApprovalsTabProps) {
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending_review' | 'active' | 'paused' | 'christmas'
  >(() => (allCloudVendors.some((v) => v.status === 'pending_review') ? 'pending_review' : 'all'));
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<Vendor | null>(null);
  const [transferPhone, setTransferPhone] = useState('');
  const [transferPass, setTransferPass] = useState('');

  const pendingCount = allCloudVendors.filter((v) => v.status === 'pending_review').length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCloudVendors.filter((v) => {
      if (statusFilter === 'pending_review' && v.status !== 'pending_review') return false;
      if (statusFilter === 'active' && v.status !== 'active') return false;
      if (statusFilter === 'paused' && v.status !== 'paused') return false;
      if (statusFilter === 'christmas' && !v.christmasSpecial) return false;
      if (q) {
        const hay = `${v.name} ${v.city} ${v.area} ${v.category} ${v.whatsappNumber}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allCloudVendors, statusFilter, search]);

  const handleUpdate = async (
    vendor: Vendor,
    patch: Parameters<typeof updateVendorInCloud>[1],
    toastMsg: string
  ) => {
    setBusyId(vendor.id);
    try {
      await updateVendorInCloud(vendor.id, patch);
      onToast(toastMsg);
    } catch {
      onToast('Could not update store status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    setBusyId(vendor.id);
    try {
      await deleteVendorInCloud(vendor.id);
      setConfirmDeleteId(null);
      onToast(`Deleted "${vendor.name}" permanently.`);
    } catch {
      onToast('Could not delete store.');
    } finally {
      setBusyId(null);
    }
  };

  const handleTransferSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!transferTarget) return;
    setBusyId(transferTarget.id);
    try {
      await onIssueTransfer(transferTarget, transferPhone, transferPass);
      setTransferTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Inline Transfer Banner */}
      {transferTarget && (
        <form
          onSubmit={(e) => void handleTransferSubmit(e)}
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold text-foreground">
              Transfer &quot;{transferTarget.name}&quot; to Vendor Phone
            </h4>
            <button
              type="button"
              onClick={() => setTransferTarget(null)}
              className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-bold">Phone (with country code)</label>
              <input
                type="tel"
                required
                value={transferPhone}
                onChange={(e) => setTransferPhone(e.target.value)}
                placeholder="919876543210"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs font-bold"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold">Passcode</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  value={transferPass}
                  onChange={(e) => setTransferPass(normalizePasscode(e.target.value))}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs font-black tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setTransferPass(generateTransferPasscode('CAKE'))}
                  className="cursor-pointer rounded-xl border border-border bg-background px-2.5 text-xs"
                >
                  <RefreshCw className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busyId === transferTarget.id}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
              >
                <KeyRound className="size-3.5" />
                Generate Handover Kit
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Pills + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'pending_review', label: `Pending Review (${pendingCount})` },
              { id: 'all', label: `All (${allCloudVendors.length})` },
              { id: 'active', label: 'Active' },
              { id: 'paused', label: 'Paused' },
              { id: 'christmas', label: 'Christmas' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                statusFilter === f.id
                  ? f.id === 'pending_review' && pendingCount > 0
                    ? 'bg-rose-600 text-white'
                    : 'bg-brand text-brand-foreground'
                  : 'border border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search store, city, phone..."
            className="w-full rounded-xl border border-border bg-card py-2 pl-8 pr-3 text-xs text-foreground focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {/* Store Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
          <h4 className="mt-2 text-sm font-extrabold text-foreground">
            {statusFilter === 'pending_review'
              ? 'No vendors waiting for approval!'
              : 'No stores match this filter.'}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {statusFilter === 'pending_review'
              ? 'When "Require Admin Approval" is ON in Site Controls, new self-registered stores land here for review.'
              : 'Try switching filters or clearing your search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const isBusy = busyId === v.id;
            const isPending = v.status === 'pending_review';
            const isPaused = v.status === 'paused';
            const isOwnedByAdmin = v.ownerId === adminUser.uid;
            const waUrl = `https://wa.me/${normalizePhoneDigits(v.whatsappNumber)}?text=${encodeURIComponent(
              `Hi ${v.name}! This is the FindMyBites team reviewing your storefront (${getSiteOrigin()}/v/${v.slug}).`
            )}`;

            return (
              <div
                key={v.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  isPending
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : isPaused
                      ? 'border-border bg-muted/40 opacity-85'
                      : 'border-border bg-card'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <img
                    src={v.image}
                    alt={v.name}
                    className="h-20 w-24 shrink-0 rounded-xl object-cover ring-1 ring-border"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="text-sm font-extrabold text-foreground">{v.name}</h4>
                      {v.verified && <BadgeCheck className="size-4 text-sky-500" />}
                      {isPending && (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                          Pending Approval
                        </span>
                      )}
                      {isPaused && (
                        <span className="rounded-full bg-neutral-500/20 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          Paused / Hidden
                        </span>
                      )}
                      {!isPending && !isPaused && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          Live
                        </span>
                      )}
                      {v.christmasSpecial && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white">
                          <Snowflake className="size-2.5" /> Xmas
                        </span>
                      )}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        {v.planTier}
                      </span>
                    </div>

                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" /> {v.area}, {v.city}, {v.country}
                      </span>
                      <span>{v.category}</span>
                      <span>
                        {v.products.length} products · From {formatMoney(v.startingPriceUsd, currency)}
                      </span>
                      <span className="font-mono">+{v.whatsappNumber}</span>
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-foreground/80">{v.tagline}</p>

                    {/* Action Row */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              void handleUpdate(
                                v,
                                { status: 'active' },
                                `${v.name} approved & published live!`
                              )
                            }
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Check className="size-3.5" />
                            Approve &amp; Go Live
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              void handleUpdate(
                                v,
                                { status: 'active', verified: true },
                                `${v.name} approved with Verified Badge!`
                              )
                            }
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-extrabold text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            <BadgeCheck className="size-3.5" />
                            Approve + Verify
                          </button>
                        </>
                      )}

                      {!isPending && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            void handleUpdate(
                              v,
                              { verified: !v.verified },
                              v.verified ? `Removed Verified badge from ${v.name}.` : `${v.name} is now Verified!`
                            )
                          }
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
                            v.verified
                              ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                              : 'border-border bg-background text-muted-foreground hover:border-sky-500'
                          }`}
                        >
                          <BadgeCheck className="size-3" />
                          {v.verified ? 'Verified' : 'Verify'}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleUpdate(
                            v,
                            { status: isPaused ? 'active' : 'paused' },
                            isPaused ? `${v.name} is live again!` : `${v.name} paused from directory.`
                          )
                        }
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold text-foreground hover:border-brand"
                      >
                        {isPaused ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                        {isPaused ? 'Restore Live' : 'Pause'}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          void handleUpdate(
                            v,
                            {
                              christmasSpecial: !v.christmasSpecial,
                              ...(!v.christmasSpecial && !v.christmasOffer
                                ? { christmasOffer: 'Christmas Plum Cakes & NYE Specials · Pre-orders Open' }
                                : {}),
                            },
                            !v.christmasSpecial
                              ? `${v.name} added to Christmas Spotlight!`
                              : `${v.name} removed from Christmas Spotlight.`
                          )
                        }
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
                          v.christmasSpecial
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-border bg-background text-muted-foreground hover:border-emerald-600'
                        }`}
                      >
                        <Snowflake className="size-3" />
                        {v.christmasSpecial ? 'In Xmas' : 'Xmas'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onPreviewVendor(v)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold hover:border-brand"
                      >
                        <ExternalLink className="size-3" />
                        Preview
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditVendor(v)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold hover:border-brand"
                      >
                        <Edit3 className="size-3" />
                        Edit
                      </button>

                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#1ebe5d]"
                      >
                        <MessageCircle className="size-3" />
                        WhatsApp
                      </a>

                      {isOwnedByAdmin && v.claimStatus !== 'claimed' && (
                        <button
                          type="button"
                          onClick={() => {
                            setTransferTarget(v);
                            setTransferPhone(v.whatsappNumber);
                            setTransferPass(generateTransferPasscode('CAKE'));
                          }}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-extrabold text-white hover:bg-amber-600"
                        >
                          <KeyRound className="size-3" />
                          Transfer
                        </button>
                      )}

                      {confirmDeleteId === v.id ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-rose-500 bg-rose-500/15 px-2 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                          Confirm?
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleDelete(v)}
                            className="cursor-pointer rounded bg-rose-600 px-1.5 py-0.5 text-white hover:bg-rose-700"
                          >
                            Yes, Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="cursor-pointer px-1 text-muted-foreground hover:text-foreground"
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(v.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/5 px-2 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-500/15"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * TAB 5: SEO & GOOGLE RANKING MANAGER
 * ========================================================================== */

interface AdminSeoManagerTabProps {
  adminUser: User;
  siteSettings: SiteSettings;
  allCloudVendors: Vendor[];
  allCatalogVendors: Vendor[];
  onNavigateSeoPath: (path: string) => void;
  onToast: (msg: string) => void;
}

export function AdminSeoManagerTab({
  adminUser,
  siteSettings,
  allCloudVendors,
  allCatalogVendors,
  onNavigateSeoPath,
  onToast,
}: AdminSeoManagerTabProps) {
  const [siteTitle, setSiteTitle] = useState(siteSettings.siteTitle);
  const [siteDescription, setSiteDescription] = useState(siteSettings.siteDescription);
  const [siteKeywords, setSiteKeywords] = useState(siteSettings.siteKeywords);
  const [savingGlobal, setSavingGlobal] = useState(false);

  const [selectedVendorId, setSelectedVendorId] = useState<string>(allCloudVendors[0]?.id || '');
  const selectedVendor = useMemo(
    () => allCloudVendors.find((v) => v.id === selectedVendorId) ?? allCloudVendors[0] ?? null,
    [allCloudVendors, selectedVendorId]
  );

  const [vSlug, setVSlug] = useState('');
  const [vSeoTitle, setVSeoTitle] = useState('');
  const [vSeoDesc, setVSeoDesc] = useState('');
  const [vSeoKeywords, setVSeoKeywords] = useState('');
  const [savingVendorSeo, setSavingVendorSeo] = useState(false);

  useEffect(() => {
    setSiteTitle(siteSettings.siteTitle);
    setSiteDescription(siteSettings.siteDescription);
    setSiteKeywords(siteSettings.siteKeywords);
  }, [siteSettings]);

  useEffect(() => {
    if (!selectedVendor) return;
    setVSlug(selectedVendor.slug);
    setVSeoTitle(selectedVendor.seoTitle || '');
    setVSeoDesc(selectedVendor.seoDescription || '');
    setVSeoKeywords(selectedVendor.seoKeywords || '');
  }, [selectedVendor]);

  const origin = getSiteOrigin();
  const liveSitemapUrl = `${origin}/sitemap.xml`;

  const handleSaveGlobalSeo = async (e: FormEvent) => {
    e.preventDefault();
    setSavingGlobal(true);
    try {
      await saveSiteSettingsInCloud(
        {
          ...siteSettings,
          siteTitle,
          siteDescription,
          siteKeywords,
        },
        adminUser.uid
      );
      onToast('Homepage Google SEO metadata saved live to Cloud!');
    } catch {
      onToast('Could not save global SEO settings.');
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleAutoGenerateVendorSeo = () => {
    if (!selectedVendor) return;
    const generated = generateAutoStoreSeo(selectedVendor);
    setVSeoTitle(generated.seoTitle);
    setVSeoDesc(generated.seoDescription);
    setVSeoKeywords(generated.seoKeywords);
    onToast(`Auto-generated local Google SEO for ${selectedVendor.name}! Click Save to apply.`);
  };

  const handleSaveVendorSeo = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    setSavingVendorSeo(true);
    try {
      await updateVendorInCloud(selectedVendor.id, {
        slug: vSlug,
        seoTitle: vSeoTitle,
        seoDescription: vSeoDesc,
        seoKeywords: vSeoKeywords,
      });
      onToast(`Saved Google SEO tags for ${selectedVendor.name}!`);
    } catch {
      onToast('Could not save store SEO metadata.');
    } finally {
      setSavingVendorSeo(false);
    }
  };

  const handleDownloadSitemap = () => {
    const xml = generateLiveSitemapXml(allCatalogVendors, 'https://www.findmybites.com');
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onToast('Downloaded live sitemap.xml ready for Google Search Console!');
  };

  const computeSeoScore = (v: Vendor): number => {
    let score = 20;
    if (v.seoTitle && v.seoTitle.length >= 25) score += 20;
    if (v.seoDescription && v.seoDescription.length >= 70) score += 20;
    if (v.seoKeywords && v.seoKeywords.length >= 15) score += 10;
    if (v.products.length >= 3) score += 15;
    if (v.image && !v.image.startsWith('/src/assets/')) score += 15;
    return Math.min(100, score);
  };

  const previewSamplePaths = [
    { label: 'Bakers in Mumbai', path: '/mumbai/bakers-and-cakes' },
    { label: 'Christmas Cakes in Kochi', path: '/kochi/christmas-cakes' },
    { label: 'Christmas Cakes in Bengaluru', path: '/bengaluru/christmas-cakes' },
    { label: 'Wedding Decor in Dubai', path: '/dubai/wedding-and-party-decor' },
    { label: 'Live Chaat in Delhi NCR', path: '/delhi-ncr/live-counters-and-food-stalls' },
    { label: 'Catering in Colombo', path: '/colombo/catering-services' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Live Sitemap & Programmatic Justdial-Style SEO Status */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              <Globe2 className="size-4" />
              Live Dynamic Sitemap &amp; Bot Pre-Rendering Active
            </p>
            <h3 className="mt-1 text-base font-extrabold text-foreground">
              {PRIORITY_SEO_CITY_SLUGS.length} Cities × {SEO_CATEGORIES.length} Categories + Every Active Storefront
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Submit <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">{liveSitemapUrl}</code> inside Google Search Console → Sitemaps. New approved stores auto-appear in your sitemap &amp; get LocalBusiness/Bakery Schema for Googlebot.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(liveSitemapUrl).catch(() => undefined);
                onToast('Sitemap URL copied for Google Search Console!');
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-600/40 bg-background px-3 py-2 text-xs font-bold text-foreground hover:border-emerald-600"
            >
              <Copy className="size-3.5" />
              Copy Sitemap URL
            </button>
            <button
              type="button"
              onClick={handleDownloadSitemap}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
            >
              <Download className="size-3.5" />
              Download sitemap.xml
            </button>
          </div>
        </div>

        {/* Sample Programmatic City × Category Pages */}
        <div className="mt-4 border-t border-emerald-500/20 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-900/80 dark:text-emerald-300/90">
            Test Live Programmatic City × Category Landing Pages ({SEO_CITIES.length} cities supported):
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {previewSamplePaths.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigateSeoPath(item.path)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-600/30 bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:border-emerald-600 hover:text-emerald-700"
              >
                <ExternalLink className="size-3" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Homepage Global SEO Editor + Live Google Preview */}
      <form
        onSubmit={(e) => void handleSaveGlobalSeo(e)}
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-foreground">
              Homepage Google Meta Title &amp; Description
            </h3>
            <p className="text-xs text-muted-foreground">
              Updates your live homepage title, meta description &amp; keywords in Cloud Firestore.
            </p>
          </div>
          <button
            type="submit"
            disabled={savingGlobal}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
          >
            {savingGlobal ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save Global SEO
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="mb-1 flex justify-between text-xs font-bold">
                <span>Meta Title</span>
                <span className="font-mono text-[10px] text-muted-foreground">{siteTitle.length}/110</span>
              </label>
              <input
                type="text"
                maxLength={110}
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 flex justify-between text-xs font-bold">
                <span>Meta Description</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {siteDescription.length}/240
                </span>
              </label>
              <textarea
                rows={3}
                maxLength={240}
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Target Keywords</label>
              <input
                type="text"
                maxLength={280}
                value={siteKeywords}
                onChange={(e) => setSiteKeywords(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {/* Live Google SERP Preview */}
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Google Search Snippet Preview
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                https://www.findmybites.com
              </p>
              <p className="line-clamp-2 text-base font-semibold leading-snug text-blue-700 dark:text-blue-400">
                {siteTitle || 'FindMyBites × PimpMyParty'}
              </p>
              <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                {siteDescription}
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* 3. Per-Store SEO Health Audit & Editor */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-foreground">
              Per-Store SEO Audit &amp; Custom Google Snippet Editor
            </h3>
            <p className="text-xs text-muted-foreground">
              Optimize any cloud store&apos;s URL slug, meta title &amp; local city keywords so it ranks on Google.
            </p>
          </div>
        </div>

        {allCloudVendors.length === 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Create or approve a cloud store first to customize its SEO tags.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            {/* Store Audit List */}
            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1 lg:col-span-5">
              {allCloudVendors.map((v) => {
                const score = computeSeoScore(v);
                const active = selectedVendor?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVendorId(v.id)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border p-2.5 text-left text-xs transition-colors ${
                      active
                        ? 'border-brand bg-brand-soft/60'
                        : 'border-border bg-background hover:border-brand/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-foreground">{v.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        /v/{v.slug} · {v.city}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                        score >= 80
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : score >= 50
                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {score}/100
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Store SEO Form */}
            {selectedVendor && (
              <form
                onSubmit={(e) => void handleSaveVendorSeo(e)}
                className="space-y-3 rounded-2xl border border-border bg-background p-4 lg:col-span-7"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-extrabold text-foreground">
                    Editing: {selectedVendor.name}
                  </p>
                  <button
                    type="button"
                    onClick={handleAutoGenerateVendorSeo}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand hover:opacity-90"
                  >
                    <Sparkles className="size-3" />
                    Auto-Generate Local SEO
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold">Storefront URL Slug (/v/...)</label>
                  <input
                    type="text"
                    value={vSlug}
                    onChange={(e) =>
                      setVSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                    }
                    className="w-full rounded-xl border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-[11px] font-bold">
                    <span>Custom Google Title</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {vSeoTitle.length}/100
                    </span>
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={vSeoTitle}
                    onChange={(e) => setVSeoTitle(e.target.value)}
                    placeholder={`${selectedVendor.name} – ${selectedVendor.category} in ${selectedVendor.city}`}
                    className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-[11px] font-bold">
                    <span>Custom Meta Description</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {vSeoDesc.length}/220
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    maxLength={220}
                    value={vSeoDesc}
                    onChange={(e) => setVSeoDesc(e.target.value)}
                    placeholder="Order custom cakes, plum cakes & party packages directly on WhatsApp..."
                    className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold">Local Keywords</label>
                  <input
                    type="text"
                    maxLength={240}
                    value={vSeoKeywords}
                    onChange={(e) => setVSeoKeywords(e.target.value)}
                    placeholder={`bakers in ${selectedVendor.city}, custom cakes ${selectedVendor.area}`}
                    className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                  />
                </div>

                {/* Mini Store Google Preview */}
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="truncate text-[11px] text-emerald-700 dark:text-emerald-400">
                    https://www.findmybites.com/v/{vSlug || selectedVendor.slug}
                  </p>
                  <p className="truncate text-sm font-semibold text-blue-700 dark:text-blue-400">
                    {vSeoTitle || `${selectedVendor.name} – ${selectedVendor.category} in ${selectedVendor.city}`}
                  </p>
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">
                    {vSeoDesc || selectedVendor.tagline}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={savingVendorSeo}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
                >
                  {savingVendorSeo ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save Store SEO
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * TAB 6: REVIEWS, BOOKINGS & EVENT LEADS MODERATION
 * ========================================================================== */

interface AdminModerationTabProps {
  reviews: AdminReviewRecord[];
  bookings: BookingEnquiry[];
  eventRequests: EventRequest[];
  allCatalogVendors: Vendor[];
  currency: CurrencyCode;
  onToast: (msg: string) => void;
}

export function AdminModerationTab({
  reviews,
  bookings,
  eventRequests,
  allCatalogVendors,
  currency,
  onToast,
}: AdminModerationTabProps) {
  const [subTab, setSubTab] = useState<'reviews' | 'bookings' | 'requests'>('reviews');
  const [busyId, setBusyId] = useState<string | null>(null);

  const vendorNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of allCatalogVendors) map.set(v.id, v.name);
    return map;
  }, [allCatalogVendors]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubTab('reviews')}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
            subTab === 'reviews'
              ? 'bg-brand text-brand-foreground'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <Star className="size-3.5" />
          Customer Reviews ({reviews.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('bookings')}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
            subTab === 'bookings'
              ? 'bg-brand text-brand-foreground'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="size-3.5" />
          Booking Enquiries ({bookings.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('requests')}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold ${
            subTab === 'requests'
              ? 'bg-brand text-brand-foreground'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <Megaphone className="size-3.5" />
          Event Requests ({eventRequests.length})
        </button>
      </div>

      {/* Reviews Moderation */}
      {subTab === 'reviews' && (
        <div className="space-y-2.5">
          {reviews.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              No cloud reviews submitted yet.
            </p>
          ) : (
            reviews.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-extrabold text-foreground">{r.authorName}</span>
                    <span className="font-mono font-bold text-amber-500">★ {r.rating}/5</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {vendorNameById.get(r.vendorId) || r.vendorId}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{r.createdAt}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-foreground/85">{r.comment}</p>
                </div>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={async () => {
                    setBusyId(r.id);
                    try {
                      await deleteReviewInCloud(r.id);
                      onToast('Review removed from platform.');
                    } catch {
                      onToast('Could not delete review.');
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 disabled:opacity-50"
                >
                  <Trash2 className="size-3" />
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bookings Moderation */}
      {subTab === 'bookings' && (
        <div className="space-y-2.5">
          {bookings.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              No cloud booking enquiries yet.
            </p>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-xs"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-brand">{b.reference}</span>
                    <span className="font-extrabold text-foreground">{b.vendorName}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
                      {b.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    Customer: <strong className="text-foreground">{b.customerName}</strong> ({b.customerEmail}) ·{' '}
                    {b.eventDate} · {b.guests} guests · Est. {formatMoney(b.estimatedUsd, currency)}
                  </p>
                  {b.notes && <p className="text-foreground/80">“{b.notes}”</p>}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    aria-label="Update booking status"
                    value={b.status}
                    disabled={busyId === b.id}
                    onChange={async (e) => {
                      setBusyId(b.id);
                      try {
                        await updateBookingStatusInCloud(
                          b.id,
                          e.target.value as 'Confirmed Enquiry' | 'Completed' | 'Cancelled'
                        );
                        onToast(`Booking ${b.reference} updated.`);
                      } catch {
                        onToast('Could not update booking.');
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-bold"
                  >
                    <option value="Confirmed Enquiry">Confirmed Enquiry</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    onClick={async () => {
                      setBusyId(b.id);
                      try {
                        await adminDeleteBookingInCloud(b.id);
                        onToast(`Deleted booking ${b.reference}.`);
                      } catch {
                        onToast('Could not delete booking.');
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-500/20"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Event Requests Moderation */}
      {subTab === 'requests' && (
        <div className="space-y-2.5">
          {eventRequests.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              No broadcast event requests posted yet.
            </p>
          ) : (
            eventRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-xs"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-foreground">{req.occasion}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        req.status === 'open'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {req.status}
                    </span>
                    <span className="text-muted-foreground">
                      {req.city}, {req.country} · {req.eventDate} · {req.guests} guests
                    </span>
                  </div>
                  <p className="text-foreground/85">{req.details}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={async () => {
                      setBusyId(req.id);
                      try {
                        const next = req.status === 'open' ? 'closed' : 'open';
                        await adminUpdateEventRequestStatus(req.id, next);
                        onToast(`Event request marked ${next}.`);
                      } catch {
                        onToast('Could not update event request.');
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="cursor-pointer rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold hover:border-brand"
                  >
                    {req.status === 'open' ? 'Close' : 'Reopen'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.id}
                    onClick={async () => {
                      setBusyId(req.id);
                      try {
                        await adminDeleteEventRequestInCloud(req.id);
                        onToast('Event request deleted.');
                      } catch {
                        onToast('Could not delete event request.');
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-500/20"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * TAB 7: CAMPAIGNS & GLOBAL SITE CONTROLS
 * ========================================================================== */

interface AdminCampaignsTabProps {
  adminUser: User;
  siteSettings: SiteSettings;
  onToast: (msg: string) => void;
}

export function AdminCampaignsTab({
  adminUser,
  siteSettings,
  onToast,
}: AdminCampaignsTabProps) {
  const [requireApproval, setRequireApproval] = useState(siteSettings.requireVendorApproval);
  const [snowfall, setSnowfall] = useState(siteSettings.snowfallEnabled);
  const [promoEnabled, setPromoEnabled] = useState(siteSettings.promoEnabled);
  const [promoText, setPromoText] = useState(siteSettings.promoText);
  const [promoCtaLabel, setPromoCtaLabel] = useState(siteSettings.promoCtaLabel);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRequireApproval(siteSettings.requireVendorApproval);
    setSnowfall(siteSettings.snowfallEnabled);
    setPromoEnabled(siteSettings.promoEnabled);
    setPromoText(siteSettings.promoText);
    setPromoCtaLabel(siteSettings.promoCtaLabel);
  }, [siteSettings]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSiteSettingsInCloud(
        {
          ...siteSettings,
          requireVendorApproval: requireApproval,
          snowfallEnabled: snowfall,
          promoEnabled,
          promoText,
          promoCtaLabel,
        },
        adminUser.uid
      );
      onToast('Site & Campaign controls saved live for all visitors!');
    } catch {
      onToast('Could not save site controls.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSave(e)} className="mx-auto max-w-3xl space-y-5">
      {/* Approval Gate */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
              {requireApproval ? <ShieldCheck className="size-5" /> : <ShieldAlert className="size-5" />}
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">
                Require Admin Approval for New Self-Signup Vendors
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                When ON, stores submitted via &quot;List Your Business&quot; enter your{' '}
                <strong>Pending Review</strong> queue so you can inspect photos &amp; menu before they appear publicly. Admin-created concierge stores still go live immediately.
              </p>
            </div>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-brand after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>
      </div>

      {/* Snowfall Effect */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300">
              <Snowflake className="size-5" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">
                Global Winter Snowfall Animation
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Controls the default snowfall decoration across www.findmybites.com for Christmas &amp; New Year. Turn OFF in January without deploying code!
              </p>
            </div>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={snowfall}
              onChange={(e) => setSnowfall(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-emerald-600 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>
      </div>

      {/* Top Seasonal Promo Banner */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">
                Top Seasonal Promotion Ribbon
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Customize the top festive announcement bar (switch from Christmas to Valentine&apos;s Day, Eid, Diwali, or Wedding Season anytime!).
              </p>
            </div>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={promoEnabled}
              onChange={(e) => setPromoEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-emerald-600 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold">Announcement Text</label>
            <input
              type="text"
              maxLength={200}
              value={promoText}
              onChange={(e) => setPromoText(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold">CTA Button Label</label>
            <input
              type="text"
              maxLength={60}
              value={promoCtaLabel}
              onChange={(e) => setPromoCtaLabel(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertCircle className="size-3.5" />
          Changes sync live via Firestore to all visitors immediately.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-xs font-extrabold text-brand-foreground shadow-sm hover:bg-brand-hover disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Site Controls
        </button>
      </div>
    </form>
  );
}
