import type { User } from 'firebase/auth';
import { auth } from '../firebase';
import type {
  MysteryBoxAssignedItem,
  MysteryBoxDeliveryStatus,
  MysteryBoxFinanceSummary,
  MysteryBoxMarketingConfig,
  MysteryBoxOrder,
  MysteryBoxPackage,
  MysteryBoxVendorFulfillment,
  MysteryBoxVendorSubmission,
} from '../data/mysteryBoxes';

async function mbFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    requireAuth?: boolean;
    authUser?: User | null;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.requireAuth) {
    const user = options.authUser ?? auth.currentUser;
    if (!user) {
      throw new Error('Please sign in first to continue.');
    }
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api/db/mystery-boxes${path}`, {
    method: options.method || 'GET',
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { error: text };
    }
  }
  if (!res.ok) {
    throw new Error(
      typeof parsed.error === 'string' && parsed.error.trim()
        ? parsed.error
        : `Request failed (${res.status})`
    );
  }
  return parsed as T;
}

export async function fetchMysteryBoxCatalog(): Promise<{
  packages: MysteryBoxPackage[];
  marketing: MysteryBoxMarketingConfig;
  razorpayKeyId: string | null;
}> {
  return mbFetch('/catalog');
}

export async function validateMysteryBoxCoupon(
  code: string,
  packageId: string
): Promise<{ valid: boolean; code: string; description: string; discountInr: number }> {
  return mbFetch('/coupons/validate', {
    method: 'POST',
    body: { code, packageId },
  });
}

export interface InitiateMysteryBoxOrderPayload {
  packageId: string;
  idempotencyKey: string;
  customerName: string;
  customerPhone: string;
  isGift: boolean;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryDate: string;
  deliverySlot: string;
  giftMessage?: string;
  dietaryPreference: 'any' | 'eggless_only';
  couponCode?: string;
  paymentMethod: 'razorpay' | 'upi' | 'card' | 'netbanking';
}

export interface InitiateMysteryBoxOrderResponse {
  order: MysteryBoxOrder;
  paymentSessionToken: string;
  upiUri: string;
  upiHandle: string;
  upiMerchantName: string;
  razorpayKeyId: string | null;
  razorpayOrder: { id: string; amount: number; currency: string } | null;
}

export async function initiateMysteryBoxOrder(
  payload: InitiateMysteryBoxOrderPayload,
  authUser?: User | null
): Promise<InitiateMysteryBoxOrderResponse> {
  return mbFetch('/orders/initiate', {
    method: 'POST',
    body: payload,
    requireAuth: true,
    authUser,
  });
}

export async function verifyMysteryBoxPayment(
  orderId: string,
  payload: {
    paymentSessionToken: string;
    paymentProviderRef?: string;
    paymentMethod?: 'razorpay' | 'upi' | 'card' | 'netbanking';
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  },
  authUser?: User | null
): Promise<{ order: MysteryBoxOrder }> {
  return mbFetch(`/orders/${encodeURIComponent(orderId)}/verify-payment`, {
    method: 'POST',
    body: payload,
    requireAuth: true,
    authUser,
  });
}

export async function markMysteryBoxPaymentFailed(
  orderId: string,
  authUser?: User | null
): Promise<void> {
  await mbFetch(`/orders/${encodeURIComponent(orderId)}/mark-failed`, {
    method: 'POST',
    requireAuth: true,
    authUser,
  });
}

export async function fetchMyMysteryBoxOrders(
  authUser?: User | null
): Promise<{ orders: MysteryBoxOrder[] }> {
  return mbFetch('/orders/mine', { requireAuth: true, authUser });
}

export async function fetchMysteryBoxOrderById(
  orderId: string,
  authUser?: User | null
): Promise<{ order: MysteryBoxOrder }> {
  return mbFetch(`/orders/${encodeURIComponent(orderId)}`, {
    requireAuth: true,
    authUser,
  });
}

export async function unboxMysteryBoxOrder(
  orderId: string,
  authUser?: User | null
): Promise<{ order: MysteryBoxOrder }> {
  return mbFetch(`/orders/${encodeURIComponent(orderId)}/unbox`, {
    method: 'POST',
    requireAuth: true,
    authUser,
  });
}

export interface VendorMysteryBoxDashboardData {
  submissions: MysteryBoxVendorSubmission[];
  assignedFulfillments: Array<{
    orderId: string;
    orderRef: string;
    packageName: string;
    deliveryDate: string;
    deliverySlot: string;
    deliveryCity: string;
    deliveryStatus: MysteryBoxDeliveryStatus;
    fulfillment: MysteryBoxVendorFulfillment;
  }>;
  totalEarnedInr: number;
}

export async function fetchVendorMysteryBoxData(
  authUser?: User | null
): Promise<VendorMysteryBoxDashboardData> {
  return mbFetch('/vendor/mine', { requireAuth: true, authUser });
}

export async function submitVendorMysteryBoxProduct(
  payload: {
    vendorId: string;
    vendorName: string;
    city: string;
    deliveryAreas: string[];
    productName: string;
    category: string;
    shortDescription: string;
    quantityAvailable: number;
    unitLabel: string;
    contributionPriceInr: number;
    retailValueInr: number;
    image?: string;
    prepTimeHours: number;
    bestBefore: string;
    dietary: 'eggless' | 'veg' | 'non-veg' | 'mixed';
    allergens: string[];
  },
  authUser?: User | null
): Promise<{ submission: MysteryBoxVendorSubmission }> {
  return mbFetch('/vendor/submissions', {
    method: 'POST',
    body: payload,
    requireAuth: true,
    authUser,
  });
}

export async function updateVendorFulfillmentStatus(
  orderId: string,
  vendorId: string,
  status: 'accepted' | 'preparing' | 'ready_for_pickup' | 'completed',
  authUser?: User | null
): Promise<void> {
  await mbFetch(`/vendor/fulfillment/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body: { vendorId, status },
    requireAuth: true,
    authUser,
  });
}

export interface AdminMysteryBoxState {
  packages: MysteryBoxPackage[];
  orders: MysteryBoxOrder[];
  submissions: MysteryBoxVendorSubmission[];
  marketing: MysteryBoxMarketingConfig;
  finance: MysteryBoxFinanceSummary;
}

export async function fetchAdminMysteryBoxState(
  authUser?: User | null
): Promise<AdminMysteryBoxState> {
  return mbFetch('/admin/state', { requireAuth: true, authUser });
}

export async function saveAdminMysteryBoxPackage(
  pkg: MysteryBoxPackage,
  authUser?: User | null
): Promise<{ package: MysteryBoxPackage }> {
  return mbFetch(`/admin/packages/${encodeURIComponent(pkg.id)}`, {
    method: 'PUT',
    body: pkg,
    requireAuth: true,
    authUser,
  });
}

export async function deleteAdminMysteryBoxPackage(
  packageId: string,
  authUser?: User | null
): Promise<void> {
  await mbFetch(`/admin/packages/${encodeURIComponent(packageId)}`, {
    method: 'DELETE',
    requireAuth: true,
    authUser,
  });
}

export async function updateAdminMysteryBoxOrder(
  orderId: string,
  patch: {
    deliveryStatus?: MysteryBoxDeliveryStatus;
    refundReason?: string;
    payoutVendorId?: string;
    payoutStatus?: 'pending' | 'scheduled' | 'paid';
    overrideAssignedItems?: MysteryBoxAssignedItem[];
    overrideReason?: string;
  },
  authUser?: User | null
): Promise<{ order: MysteryBoxOrder }> {
  return mbFetch(`/admin/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body: patch,
    requireAuth: true,
    authUser,
  });
}

export async function updateAdminVendorSubmission(
  submissionId: string,
  patch: {
    status?: 'pending' | 'approved' | 'rejected';
    contributionPriceInr?: number;
    adminNote?: string;
  },
  authUser?: User | null
): Promise<{ submission: MysteryBoxVendorSubmission }> {
  return mbFetch(`/admin/submissions/${encodeURIComponent(submissionId)}`, {
    method: 'PATCH',
    body: patch,
    requireAuth: true,
    authUser,
  });
}

export async function saveAdminMysteryBoxMarketing(
  marketing: MysteryBoxMarketingConfig,
  authUser?: User | null
): Promise<{ marketing: MysteryBoxMarketingConfig }> {
  return mbFetch('/admin/marketing', {
    method: 'PUT',
    body: marketing,
    requireAuth: true,
    authUser,
  });
}
