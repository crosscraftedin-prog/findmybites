import type { User } from 'firebase/auth';
import {
  AdminTransferRecord,
  BioTheme,
  BookingEnquiry,
  CloudVendorMetric,
  CustomBuilderMode,
  DEFAULT_SITE_SETTINGS,
  EventQuote,
  EventRequest,
  LaunchCountry,
  PlanTier,
  SiteSettings,
  StoreClaim,
  Vendor,
  VendorBioLink,
  VendorProduct,
  VendorReview,
  computeClaimId,
  normalizePasscode,
  normalizePhoneDigits,
} from '../data/vendors';
import { CustomMenuDish } from '../data/christmasMenu';
import type { BoxBuilderItem, CorporateBoxProduct } from '../data/boxAndBiteCatalog';
import { ADMIN_EMAIL, auth } from '../firebase';

type TopicName =
  | 'vendors'
  | 'bookings'
  | 'reviews'
  | 'eventRequests'
  | 'quotes'
  | 'metrics'
  | 'concierge'
  | 'siteSettings'
  | 'christmasDishes'
  | 'boxBiteCatalog';

const topicListeners = new Map<TopicName, Set<() => void>>();

function onTopic(topic: TopicName, fn: () => void): () => void {
  let set = topicListeners.get(topic);
  if (!set) {
    set = new Set();
    topicListeners.set(topic, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
  };
}

function emitTopics(...topics: TopicName[]) {
  for (const topic of topics) {
    const set = topicListeners.get(topic);
    if (!set) continue;
    for (const fn of set) {
      fn();
    }
  }
}

async function getAuthHeader(
  userOverride?: User | null,
  forceRefresh = false
): Promise<Record<string, string>> {
  const user = userOverride ?? auth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken(forceRefresh);
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

async function apiFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    requireAuth?: boolean;
    authUser?: User | null;
    forceRefreshToken?: boolean;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.requireAuth) {
    const authHdr = await getAuthHeader(options.authUser, Boolean(options.forceRefreshToken));
    Object.assign(headers, authHdr);
  }

  const response = await fetch(`/api/db${path}`, {
    method: options.method || 'GET',
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  const text = await response.text();
  let parsed: Record<string, unknown> = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { error: text };
    }
  }

  if (!response.ok) {
    const msg =
      typeof parsed.error === 'string' && parsed.error.trim()
        ? parsed.error
        : `Request failed (${response.status})`;
    throw new Error(msg);
  }

  return parsed as T;
}

function createPollingSubscription<T>(
  topic: TopicName,
  fetcher: () => Promise<T>,
  onData: (value: T) => void,
  fallbackValue?: T
): () => void {
  let cancelled = false;
  let inFlight = false;

  const load = async () => {
    if (cancelled || inFlight) return;
    inFlight = true;
    try {
      const result = await fetcher();
      if (!cancelled) {
        onData(result);
      }
    } catch (err) {
      if (!cancelled && fallbackValue !== undefined) {
        onData(fallbackValue);
      }
      console.warn(`[Supabase sync:${topic}]`, err instanceof Error ? err.message : err);
    } finally {
      inFlight = false;
    }
  };

  void load();
  const offTopic = onTopic(topic, () => {
    void load();
  });

  return () => {
    cancelled = true;
    offTopic();
  };
}

let biteBloomAutoMigrationAttempted = false;

async function maybeAutoMigrateBiteBloom(loadedVendors: Vendor[]) {
  if (biteBloomAutoMigrationAttempted || loadedVendors.length > 0) return;
  const user = auth.currentUser;
  if (
    !user?.emailVerified ||
    !user.email ||
    user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
  ) {
    return;
  }
  biteBloomAutoMigrationAttempted = true;
  try {
    await apiFetch('/admin/migrate-bitebloom', {
      method: 'POST',
      requireAuth: true,
    });
    emitTopics('vendors');
  } catch {
    // Non-blocking: admin can retry on reload once secrets are configured
    biteBloomAutoMigrationAttempted = false;
  }
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned.length >= 2 ? cleaned : `id-${Date.now()}`;
}

// ============================================================================
// VENDORS (/api/db/vendors)
// ============================================================================

export function subscribeActiveVendors(onData: (vendors: Vendor[]) => void): () => void {
  return createPollingSubscription(
    'vendors',
    async () => {
      const res = await apiFetch<{ vendors: Vendor[] }>('/vendors');
      const list = Array.isArray(res.vendors) ? res.vendors : [];
      if (list.length === 0) {
        void maybeAutoMigrateBiteBloom(list);
      }
      return list;
    },
    onData
  );
}

export function subscribeMyVendors(
  _uid: string,
  onData: (vendors: Vendor[]) => void
): () => void {
  return createPollingSubscription(
    'vendors',
    async () => {
      const res = await apiFetch<{ vendors: Vendor[] }>('/vendors/mine', { requireAuth: true });
      const list = Array.isArray(res.vendors) ? res.vendors : [];
      if (list.length === 0) {
        void maybeAutoMigrateBiteBloom(list);
      }
      return list;
    },
    onData
  );
}

export async function createVendorInCloud(
  vendor: Vendor,
  _ownerId: string,
  _isAdminUser = false,
  initialStatus: 'active' | 'pending_review' = 'active'
): Promise<Vendor> {
  const res = await apiFetch<{ vendor: Vendor }>('/vendors', {
    method: 'POST',
    requireAuth: true,
    body: { vendor, initialStatus },
  });
  emitTopics('vendors');
  return res.vendor;
}

export async function updateVendorInCloud(
  vendorId: string,
  updates: Partial<{
    name: string;
    slug: string;
    tagline: string;
    description: string;
    promoBanner: string;
    christmasSpecial: boolean;
    christmasOffer: string;
    bioHandle: string;
    bioTheme: BioTheme;
    instagramHandle: string;
    customLinks: VendorBioLink[];
    whatsappNumber: string;
    planTier: PlanTier;
    monthlyAutoPay: boolean;
    startingPriceUsd: number;
    status: 'active' | 'pending_review' | 'paused';
    verified: boolean;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    allStatesCoverage: boolean;
    serviceStates: string[];
    image: string;
    logo: string;
    gallery: string[];
    lat: number;
    lng: number;
    products: VendorProduct[];
    customBuilderEnabled: boolean;
    customBuilderMode: CustomBuilderMode;
    customBuilderMinQty: number;
    customBuilderPackagingUsd: number;
  }>
): Promise<void> {
  await apiFetch(`/vendors/${encodeURIComponent(sanitizeId(vendorId))}`, {
    method: 'PATCH',
    requireAuth: true,
    body: updates,
  });
  emitTopics('vendors');
}

export async function deleteVendorInCloud(vendorId: string): Promise<void> {
  await apiFetch(`/vendors/${encodeURIComponent(sanitizeId(vendorId))}`, {
    method: 'DELETE',
    requireAuth: true,
  });
  emitTopics('vendors', 'concierge');
}

// ============================================================================
// USER PROFILES & SAVED SHORTLIST (/api/db/users)
// ============================================================================

export async function ensureUserProfile(
  user: User,
  fallbackSavedIds: string[]
): Promise<string[]> {
  const res = await apiFetch<{ savedVendorIds: string[] }>('/users/ensure', {
    method: 'POST',
    requireAuth: true,
    authUser: user,
    forceRefreshToken: true,
    body: {
      displayName: user.displayName || user.email?.split('@')[0] || 'Member',
      fallbackSavedIds,
    },
  });
  return Array.isArray(res.savedVendorIds) ? res.savedVendorIds : fallbackSavedIds;
}

export async function syncSavedVendorsToCloud(
  _uid: string,
  savedVendorIds: string[]
): Promise<void> {
  await apiFetch('/users/saved', {
    method: 'PUT',
    requireAuth: true,
    body: { savedVendorIds },
  });
}

// ============================================================================
// BOOKINGS & ENQUIRIES (/api/db/bookings)
// ============================================================================

export async function createBookingInCloud(
  booking: BookingEnquiry,
  _customerId: string,
  vendorOwnerId: string
): Promise<BookingEnquiry> {
  const res = await apiFetch<{ booking: BookingEnquiry }>('/bookings', {
    method: 'POST',
    requireAuth: true,
    body: { booking, vendorOwnerId },
  });
  emitTopics('bookings');
  return res.booking;
}

export function subscribeMyBookings(
  _uid: string,
  onData: (bookings: BookingEnquiry[]) => void
): () => void {
  return createPollingSubscription(
    'bookings',
    async () => {
      const res = await apiFetch<{ bookings: BookingEnquiry[] }>('/bookings/mine', {
        requireAuth: true,
      });
      return Array.isArray(res.bookings) ? res.bookings : [];
    },
    onData
  );
}

export function subscribeVendorLeads(
  _uid: string,
  onData: (bookings: BookingEnquiry[]) => void
): () => void {
  return createPollingSubscription(
    'bookings',
    async () => {
      const res = await apiFetch<{ bookings: BookingEnquiry[] }>('/bookings/leads', {
        requireAuth: true,
      });
      return Array.isArray(res.bookings) ? res.bookings : [];
    },
    onData
  );
}

export async function updateBookingStatusInCloud(
  bookingId: string,
  status: 'Confirmed Enquiry' | 'Completed' | 'Cancelled'
): Promise<void> {
  await apiFetch(`/bookings/${encodeURIComponent(sanitizeId(bookingId))}`, {
    method: 'PATCH',
    requireAuth: true,
    body: { status },
  });
  emitTopics('bookings');
}

// ============================================================================
// CUSTOMER REVIEWS (/api/db/reviews)
// ============================================================================

export function subscribeVendorReviews(
  vendorId: string,
  onData: (reviews: VendorReview[]) => void
): () => void {
  const safeId = sanitizeId(vendorId);
  return createPollingSubscription(
    'reviews',
    async () => {
      const res = await apiFetch<{ reviews: VendorReview[] }>(
        `/reviews?vendorId=${encodeURIComponent(safeId)}`
      );
      return Array.isArray(res.reviews) ? res.reviews : [];
    },
    onData
  );
}

export async function createReviewInCloud(
  vendorId: string,
  user: User,
  input: { rating: number; eventType: string; comment: string }
): Promise<void> {
  await apiFetch('/reviews', {
    method: 'POST',
    requireAuth: true,
    body: {
      vendorId: sanitizeId(vendorId),
      authorName: user.displayName || user.email?.split('@')[0] || 'Customer',
      eventType: input.eventType,
      rating: input.rating,
      comment: input.comment,
    },
  });
  emitTopics('reviews');
}

export async function deleteReviewInCloud(reviewId: string): Promise<void> {
  await apiFetch(`/reviews/${encodeURIComponent(sanitizeId(reviewId))}`, {
    method: 'DELETE',
    requireAuth: true,
  });
  emitTopics('reviews');
}

// ============================================================================
// EVENT REQUESTS & VENDOR QUOTES (/api/db/event-requests)
// ============================================================================

export async function createEventRequestInCloud(
  user: User,
  input: {
    occasion: string;
    categories: string[];
    country: Exclude<LaunchCountry, 'All'>;
    state: string;
    city: string;
    eventDate: string;
    guests: number;
    budgetUsd: number;
    details: string;
  }
): Promise<string> {
  const res = await apiFetch<{ id: string }>('/event-requests', {
    method: 'POST',
    requireAuth: true,
    body: {
      ...input,
      customerName: user.displayName || user.email?.split('@')[0] || 'Event Host',
    },
  });
  emitTopics('eventRequests');
  return res.id;
}

export function subscribeOpenEventRequests(
  onData: (requests: EventRequest[]) => void
): () => void {
  return createPollingSubscription(
    'eventRequests',
    async () => {
      const res = await apiFetch<{ requests: EventRequest[] }>('/event-requests/open', {
        requireAuth: true,
      });
      return Array.isArray(res.requests) ? res.requests : [];
    },
    onData
  );
}

export function subscribeMyEventRequests(
  _uid: string,
  onData: (requests: EventRequest[]) => void
): () => void {
  return createPollingSubscription(
    'eventRequests',
    async () => {
      const res = await apiFetch<{ requests: EventRequest[] }>('/event-requests/mine', {
        requireAuth: true,
      });
      return Array.isArray(res.requests) ? res.requests : [];
    },
    onData
  );
}

export async function closeEventRequestInCloud(requestId: string): Promise<void> {
  await apiFetch(`/event-requests/${encodeURIComponent(sanitizeId(requestId))}`, {
    method: 'PATCH',
    requireAuth: true,
    body: { status: 'closed' },
  });
  emitTopics('eventRequests');
}

export async function submitEventQuoteInCloud(
  request: EventRequest,
  _vendorOwnerId: string,
  vendor: Vendor,
  priceUsd: number,
  message: string
): Promise<void> {
  await apiFetch(`/event-requests/${encodeURIComponent(sanitizeId(request.id))}/quotes`, {
    method: 'POST',
    requireAuth: true,
    body: { vendor, priceUsd, message },
  });
  emitTopics('quotes');
}

export function subscribeRequestQuotesForCustomer(
  requestId: string,
  _customerUid: string,
  onData: (quotes: EventQuote[]) => void
): () => void {
  const safeId = sanitizeId(requestId);
  return createPollingSubscription(
    'quotes',
    async () => {
      const res = await apiFetch<{ quotes: EventQuote[] }>(
        `/event-requests/${encodeURIComponent(safeId)}/quotes`,
        { requireAuth: true }
      );
      return Array.isArray(res.quotes) ? res.quotes : [];
    },
    onData
  );
}

// ============================================================================
// VENDOR METRICS (/api/db/metrics)
// ============================================================================

export async function incrementVendorMetricInCloud(
  vendorId: string,
  field: 'views' | 'whatsappClicks' | 'shares'
): Promise<void> {
  try {
    await apiFetch(`/metrics/${encodeURIComponent(sanitizeId(vendorId))}/increment`, {
      method: 'POST',
      body: { field },
    });
  } catch {
    // Non-blocking analytics increment
  }
}

export function subscribeVendorMetric(
  vendorId: string,
  onData: (metric: CloudVendorMetric) => void
): () => void {
  const safeId = sanitizeId(vendorId);
  return createPollingSubscription(
    'metrics',
    async () => {
      const res = await apiFetch<{ metric: CloudVendorMetric }>(
        `/metrics/${encodeURIComponent(safeId)}`
      );
      return res.metric || { vendorId: safeId, views: 0, whatsappClicks: 0, shares: 0 };
    },
    onData,
    { vendorId: safeId, views: 0, whatsappClicks: 0, shares: 0 }
  );
}

// ============================================================================
// ADMIN CONCIERGE STORE BUILDER & PASSCODE TRANSFER (/api/db/concierge)
// ============================================================================

export interface AdminCreateStoreTransferResult {
  vendor: Vendor;
  transfer: AdminTransferRecord;
}

export async function adminCreateStoreWithTransfer(
  vendor: Vendor,
  _adminUid: string,
  targetPhoneRaw: string,
  passcodeRaw: string
): Promise<AdminCreateStoreTransferResult> {
  const targetPhone = normalizePhoneDigits(targetPhoneRaw);
  if (targetPhone.length < 7) {
    throw new Error('Please enter a valid baker phone number with country code (at least 7 digits).');
  }
  const cleanPasscode = normalizePasscode(passcodeRaw);
  if (cleanPasscode.length < 6) {
    throw new Error('Passcode must be at least 6 characters (letters/numbers).');
  }
  const claimId = await computeClaimId(targetPhone, cleanPasscode);
  const res = await apiFetch<AdminCreateStoreTransferResult>('/concierge/create-store', {
    method: 'POST',
    requireAuth: true,
    body: { vendor, targetPhone, passcode: cleanPasscode, claimId },
  });
  emitTopics('vendors', 'concierge');
  return res;
}

export async function adminIssueTransferForExistingStore(
  vendor: Vendor,
  _adminUid: string,
  targetPhoneRaw: string,
  passcodeRaw: string,
  previousClaimId?: string
): Promise<AdminTransferRecord> {
  const targetPhone = normalizePhoneDigits(targetPhoneRaw);
  if (targetPhone.length < 7) {
    throw new Error('Please enter a valid baker phone number with country code (at least 7 digits).');
  }
  const cleanPasscode = normalizePasscode(passcodeRaw);
  if (cleanPasscode.length < 6) {
    throw new Error('Passcode must be at least 6 characters.');
  }
  const claimId = await computeClaimId(targetPhone, cleanPasscode);
  const res = await apiFetch<{ transfer: AdminTransferRecord }>('/concierge/issue-transfer', {
    method: 'POST',
    requireAuth: true,
    body: {
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorSlug: vendor.slug,
      targetPhone,
      passcode: cleanPasscode,
      claimId,
      previousClaimId,
    },
  });
  emitTopics('vendors', 'concierge');
  return res.transfer;
}

export async function adminRevokeTransfer(vendorId: string, claimId: string): Promise<void> {
  await apiFetch('/concierge/revoke', {
    method: 'POST',
    requireAuth: true,
    body: { vendorId, claimId },
  });
  emitTopics('vendors', 'concierge');
}

export function subscribeAdminTransfers(
  onData: (records: AdminTransferRecord[]) => void
): () => void {
  return createPollingSubscription(
    'concierge',
    async () => {
      const res = await apiFetch<{ transfers: AdminTransferRecord[] }>('/concierge/admin', {
        requireAuth: true,
      });
      return Array.isArray(res.transfers) ? res.transfers : [];
    },
    onData
  );
}

export function subscribeAdminStoreClaims(onData: (claims: StoreClaim[]) => void): () => void {
  return createPollingSubscription(
    'concierge',
    async () => {
      const res = await apiFetch<{ claims: StoreClaim[] }>('/concierge/admin', {
        requireAuth: true,
      });
      return Array.isArray(res.claims) ? res.claims : [];
    },
    onData
  );
}

export async function lookupStoreClaim(
  phoneRaw: string,
  passcodeRaw: string
): Promise<{ claim: StoreClaim; claimId: string } | null> {
  const phone = normalizePhoneDigits(phoneRaw);
  const passcode = normalizePasscode(passcodeRaw);
  if (phone.length < 7 || passcode.length < 6) {
    return null;
  }
  const claimId = await computeClaimId(phone, passcode);
  const res = await apiFetch<{ claim: StoreClaim | null; claimId?: string }>(
    '/concierge/claim-lookup',
    {
      method: 'POST',
      body: { claimId },
    }
  );
  if (!res.claim) return null;
  return { claim: res.claim, claimId };
}

export async function redeemStoreClaim(
  claimId: string,
  vendorId: string,
  _bakerUid: string,
  authUser?: User | null
): Promise<Vendor | undefined> {
  const res = await apiFetch<{ ok: boolean; vendor?: Vendor }>('/concierge/redeem', {
    method: 'POST',
    requireAuth: true,
    authUser,
    forceRefreshToken: true,
    body: { claimId, vendorId },
  });
  emitTopics('vendors', 'concierge');
  return res.vendor;
}

// ============================================================================
// SITE SETTINGS (/api/db/site-settings)
// ============================================================================

export function subscribeSiteSettings(onData: (settings: SiteSettings) => void): () => void {
  return createPollingSubscription(
    'siteSettings',
    async () => {
      const res = await apiFetch<{ settings: SiteSettings | null }>('/site-settings');
      if (!res.settings) return DEFAULT_SITE_SETTINGS;
      return {
        ...DEFAULT_SITE_SETTINGS,
        ...res.settings,
      };
    },
    onData,
    DEFAULT_SITE_SETTINGS
  );
}

export async function saveSiteSettingsInCloud(
  settings: SiteSettings,
  _adminUid: string
): Promise<void> {
  await apiFetch('/site-settings', {
    method: 'PUT',
    requireAuth: true,
    body: settings,
  });
  emitTopics('siteSettings');
}

// ============================================================================
// FULL ADMIN MODERATION & ANALYTICS SUBSCRIPTIONS
// ============================================================================

export interface AdminReviewRecord {
  id: string;
  vendorId: string;
  authorId: string;
  authorName: string;
  eventType: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export function subscribeAllVendorsForAdmin(onData: (vendors: Vendor[]) => void): () => void {
  return createPollingSubscription(
    'vendors',
    async () => {
      const res = await apiFetch<{ vendors: Vendor[] }>('/vendors/admin', { requireAuth: true });
      const list = Array.isArray(res.vendors) ? res.vendors : [];
      if (list.length === 0) {
        void maybeAutoMigrateBiteBloom(list);
      }
      return list;
    },
    onData
  );
}

export function subscribeAllBookingsForAdmin(
  onData: (bookings: BookingEnquiry[]) => void
): () => void {
  return createPollingSubscription(
    'bookings',
    async () => {
      const res = await apiFetch<{ bookings: BookingEnquiry[] }>('/bookings/admin', {
        requireAuth: true,
      });
      return Array.isArray(res.bookings) ? res.bookings : [];
    },
    onData
  );
}

export function subscribeAllReviewsForAdmin(
  onData: (reviews: AdminReviewRecord[]) => void
): () => void {
  return createPollingSubscription(
    'reviews',
    async () => {
      const res = await apiFetch<{ reviews: AdminReviewRecord[] }>('/reviews/admin', {
        requireAuth: true,
      });
      return Array.isArray(res.reviews) ? res.reviews : [];
    },
    onData
  );
}

export function subscribeAllEventRequestsForAdmin(
  onData: (requests: EventRequest[]) => void
): () => void {
  return createPollingSubscription(
    'eventRequests',
    async () => {
      const res = await apiFetch<{ requests: EventRequest[] }>('/event-requests/admin', {
        requireAuth: true,
      });
      return Array.isArray(res.requests) ? res.requests : [];
    },
    onData
  );
}

export function subscribeAllVendorMetricsForAdmin(
  onData: (metrics: CloudVendorMetric[]) => void
): () => void {
  return createPollingSubscription(
    'metrics',
    async () => {
      const res = await apiFetch<{ metrics: CloudVendorMetric[] }>('/metrics/admin', {
        requireAuth: true,
      });
      return Array.isArray(res.metrics) ? res.metrics : [];
    },
    onData,
    []
  );
}

export async function adminUpdateEventRequestStatus(
  requestId: string,
  status: 'open' | 'closed'
): Promise<void> {
  await apiFetch(`/event-requests/${encodeURIComponent(sanitizeId(requestId))}`, {
    method: 'PATCH',
    requireAuth: true,
    body: { status },
  });
  emitTopics('eventRequests');
}

export async function adminDeleteEventRequestInCloud(requestId: string): Promise<void> {
  await apiFetch(`/event-requests/${encodeURIComponent(sanitizeId(requestId))}`, {
    method: 'DELETE',
    requireAuth: true,
  });
  emitTopics('eventRequests');
}

export async function adminDeleteBookingInCloud(bookingId: string): Promise<void> {
  await apiFetch(`/bookings/${encodeURIComponent(sanitizeId(bookingId))}`, {
    method: 'DELETE',
    requireAuth: true,
  });
  emitTopics('bookings');
}

// ============================================================================
// CHRISTMAS LUNCH & DINNER CUSTOM MENU (HYDERABAD)
// ============================================================================

export function subscribeChristmasDishes(
  onData: (dishes: CustomMenuDish[]) => void
): () => void {
  return createPollingSubscription(
    'christmasDishes',
    async () => {
      const res = await apiFetch<{ dishes: CustomMenuDish[] }>('/christmas-dishes');
      return Array.isArray(res.dishes) ? res.dishes : [];
    },
    onData
  );
}

export async function adminSaveChristmasDish(
  dish: Omit<CustomMenuDish, 'id'> & { id?: string },
  _adminUid: string
): Promise<CustomMenuDish> {
  const dishId = dish.id
    ? sanitizeId(dish.id)
    : sanitizeId(`xmas-dish-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  const res = await apiFetch<{ dish: CustomMenuDish }>(
    `/christmas-dishes/${encodeURIComponent(dishId)}`,
    {
      method: 'PUT',
      requireAuth: true,
      body: dish,
    }
  );
  emitTopics('christmasDishes');
  return res.dish;
}

export async function adminDeleteChristmasDish(
  dish: CustomMenuDish,
  adminUid: string,
  isBuiltIn: boolean
): Promise<void> {
  const dishId = sanitizeId(dish.id);
  if (isBuiltIn) {
    await adminSaveChristmasDish({ ...dish, id: dishId, active: false }, adminUid);
  } else {
    await apiFetch(`/christmas-dishes/${encodeURIComponent(dishId)}`, {
      method: 'DELETE',
      requireAuth: true,
    });
    emitTopics('christmasDishes');
  }
}

export async function adminRestoreChristmasDish(dishId: string): Promise<void> {
  await apiFetch(`/christmas-dishes/${encodeURIComponent(sanitizeId(dishId))}`, {
    method: 'DELETE',
    requireAuth: true,
  });
  emitTopics('christmasDishes');
}

// ============================================================================
// BOX & BITE SELF-OWNED CORPORATE GIFTING CATALOG (ADMIN-MANAGED)
// ============================================================================

export interface BoxBiteCloudCatalog {
  products: CorporateBoxProduct[];
  builderItems: BoxBuilderItem[];
}

export function subscribeBoxBiteCatalog(
  onData: (catalog: BoxBiteCloudCatalog) => void
): () => void {
  return createPollingSubscription(
    'boxBiteCatalog',
    async () => {
      const res = await apiFetch<{
        products?: CorporateBoxProduct[];
        builderItems?: BoxBuilderItem[];
      }>('/box-bite-catalog');
      return {
        products: Array.isArray(res.products) ? res.products : [],
        builderItems: Array.isArray(res.builderItems) ? res.builderItems : [],
      };
    },
    onData,
    { products: [], builderItems: [] }
  );
}

export async function adminSaveBoxBiteProduct(
  product: Omit<CorporateBoxProduct, 'id'> & { id?: string }
): Promise<CorporateBoxProduct> {
  const productId = product.id
    ? sanitizeId(product.id)
    : sanitizeId(`bb-prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  const res = await apiFetch<{ product: CorporateBoxProduct }>(
    `/box-bite-products/${encodeURIComponent(productId)}`,
    {
      method: 'PUT',
      requireAuth: true,
      body: { ...product, id: productId },
    }
  );
  emitTopics('boxBiteCatalog');
  return res.product;
}

export async function adminDeleteBoxBiteProduct(
  product: CorporateBoxProduct,
  isBuiltIn: boolean
): Promise<void> {
  const productId = sanitizeId(product.id);
  if (isBuiltIn) {
    await adminSaveBoxBiteProduct({ ...product, id: productId, active: false });
  } else {
    await apiFetch(`/box-bite-products/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
      requireAuth: true,
    });
    emitTopics('boxBiteCatalog');
  }
}

export async function adminRestoreBoxBiteProduct(productId: string): Promise<void> {
  await apiFetch(`/box-bite-products/${encodeURIComponent(sanitizeId(productId))}`, {
    method: 'DELETE',
    requireAuth: true,
  });
  emitTopics('boxBiteCatalog');
}

export async function adminSaveBoxBiteBuilderItem(
  item: Omit<BoxBuilderItem, 'id'> & { id?: string }
): Promise<BoxBuilderItem> {
  const itemId = item.id
    ? sanitizeId(item.id)
    : sanitizeId(`bb-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

  const res = await apiFetch<{ item: BoxBuilderItem }>(
    `/box-bite-builder-items/${encodeURIComponent(itemId)}`,
    {
      method: 'PUT',
      requireAuth: true,
      body: { ...item, id: itemId },
    }
  );
  emitTopics('boxBiteCatalog');
  return res.item;
}

export async function adminDeleteBoxBiteBuilderItem(
  item: BoxBuilderItem,
  isBuiltIn: boolean
): Promise<void> {
  const itemId = sanitizeId(item.id);
  if (isBuiltIn) {
    await adminSaveBoxBiteBuilderItem({ ...item, id: itemId, active: false });
  } else {
    await apiFetch(`/box-bite-builder-items/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      requireAuth: true,
    });
    emitTopics('boxBiteCatalog');
  }
}

