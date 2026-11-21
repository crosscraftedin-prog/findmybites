import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  BookingEnquiry,
  LaunchCountry,
  PlanTier,
  PriceTier,
  Vendor,
  VendorProduct,
} from '../data/vendors';
import { db, handleFirestoreError, OperationType } from '../firebase';

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned.length >= 2 ? cleaned : `id-${Date.now()}`;
}

function sanitizeSlug(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return cleaned.length >= 2 ? cleaned : `vendor-${Date.now()}`;
}

function clampStr(val: string, min: number, max: number, fallback: string): string {
  const trimmed = val.trim().slice(0, max);
  return trimmed.length >= min ? trimmed : fallback;
}

function sanitizeDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 18);
  return digits.length >= 7 ? digits : '919820001122';
}

function sanitizeProducts(products: VendorProduct[]): VendorProduct[] {
  const list = products.slice(0, 20).map((p, idx) => ({
    id: sanitizeId(p.id || `prod-${idx + 1}`),
    name: clampStr(p.name, 2, 100, 'Signature Package'),
    serves: clampStr(p.serves || 'Custom', 1, 60, 'Custom'),
    priceUsd: Math.max(0, Math.min(100000, Number(p.priceUsd) || 0)),
    description: clampStr(p.description || p.name, 2, 400, 'Custom package'),
    image: clampStr(
      p.image || '/src/assets/images/cat-bakers.png',
      1,
      110000,
      '/src/assets/images/cat-bakers.png'
    ),
    ...(p.tag ? { tag: p.tag.trim().slice(0, 40) } : {}),
  }));
  return list.length > 0
    ? list
    : [
        {
          id: `prod-${Date.now()}`,
          name: 'Signature Event Package',
          serves: 'Custom',
          priceUsd: 99,
          description: 'Customizable local package.',
          image: '/src/assets/images/cat-bakers.png',
        },
      ];
}

function docToVendor(id: string, data: Record<string, unknown>): Vendor {
  const products = Array.isArray(data.products) ? (data.products as VendorProduct[]) : [];
  return {
    id,
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
    status: data.status === 'paused' ? 'paused' : 'active',
    slug: typeof data.slug === 'string' ? data.slug : sanitizeSlug(id),
    name: typeof data.name === 'string' ? data.name : 'Vendor',
    marketplace: data.marketplace === 'party' ? 'party' : 'food',
    category: typeof data.category === 'string' ? data.category : 'Bakers & Cakes',
    country: (data.country as Exclude<LaunchCountry, 'All'>) || 'India',
    state: typeof data.state === 'string' ? data.state : 'Maharashtra',
    city: typeof data.city === 'string' ? data.city : 'Mumbai',
    area: typeof data.area === 'string' ? data.area : 'City Center',
    lat: typeof data.lat === 'number' ? data.lat : 19.076,
    lng: typeof data.lng === 'number' ? data.lng : 72.8777,
    whatsappNumber: typeof data.whatsappNumber === 'string' ? data.whatsappNumber : '919820001122',
    planTier: (data.planTier as PlanTier) || 'free',
    monthlyAutoPay: Boolean(data.monthlyAutoPay),
    priceTier: (data.priceTier as PriceTier) || '$$',
    startingPriceUsd: typeof data.startingPriceUsd === 'number' ? data.startingPriceUsd : 50,
    rating: typeof data.rating === 'number' ? data.rating : 5.0,
    reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 0,
    responseTime:
      typeof data.responseTime === 'string' ? data.responseTime : 'Replies within 15 mins on WhatsApp',
    verified: Boolean(data.verified),
    tagline: typeof data.tagline === 'string' ? data.tagline : '',
    description: typeof data.description === 'string' ? data.description : '',
    serviceAreas: Array.isArray(data.serviceAreas) ? (data.serviceAreas as string[]) : [],
    specialties: Array.isArray(data.specialties) ? (data.specialties as string[]) : [],
    image: typeof data.image === 'string' ? data.image : '/src/assets/images/cat-bakers.png',
    logo: typeof data.logo === 'string' && data.logo.length > 0 ? data.logo : undefined,
    products,
    reviews: [],
  };
}

function formatTs(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function docToBooking(id: string, data: Record<string, unknown>): BookingEnquiry {
  return {
    id,
    reference: typeof data.reference === 'string' ? data.reference : id,
    customerId: typeof data.customerId === 'string' ? data.customerId : undefined,
    vendorOwnerId: typeof data.vendorOwnerId === 'string' ? data.vendorOwnerId : undefined,
    vendorId: typeof data.vendorId === 'string' ? data.vendorId : '',
    vendorName: typeof data.vendorName === 'string' ? data.vendorName : '',
    vendorCity: typeof data.vendorCity === 'string' ? data.vendorCity : '',
    vendorCategory: typeof data.vendorCategory === 'string' ? data.vendorCategory : '',
    packageName: typeof data.packageName === 'string' ? data.packageName : '',
    estimatedUsd: typeof data.estimatedUsd === 'number' ? data.estimatedUsd : 0,
    eventDate: typeof data.eventDate === 'string' ? data.eventDate : '',
    guests: typeof data.guests === 'number' ? data.guests : 50,
    customerName: typeof data.customerName === 'string' ? data.customerName : '',
    customerEmail: typeof data.customerEmail === 'string' ? data.customerEmail : '',
    notes: typeof data.notes === 'string' ? data.notes : '',
    createdAt: formatTs(data.createdAt),
    status: (data.status as BookingEnquiry['status']) || 'Confirmed Enquiry',
  };
}

export function subscribeActiveVendors(onData: (vendors: Vendor[]) => void): () => void {
  const q = query(collection(db, 'vendors'), where('status', '==', 'active'));
  return onSnapshot(
    q,
    (snap) => {
      const vendors = snap.docs.map((d) => docToVendor(d.id, d.data()));
      onData(vendors);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
    }
  );
}

export function subscribeMyVendors(
  uid: string,
  onData: (vendors: Vendor[]) => void
): () => void {
  const q = query(collection(db, 'vendors'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const vendors = snap.docs.map((d) => docToVendor(d.id, d.data()));
      onData(vendors);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
    }
  );
}

export async function createVendorInCloud(
  vendor: Vendor,
  ownerId: string,
  isAdminUser = false
): Promise<Vendor> {
  const vendorId = sanitizeId(vendor.id || `${vendor.slug}-${Date.now().toString().slice(-4)}`);
  const docPath = `vendors/${vendorId}`;
  const cleanProducts = sanitizeProducts(vendor.products);
  const serviceAreas = vendor.serviceAreas
    .map((s) => s.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 10);
  const specialties = vendor.specialties
    .map((s) => s.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 10);

  const payload = {
    ownerId,
    slug: sanitizeSlug(vendor.slug || vendor.name),
    name: clampStr(vendor.name, 2, 100, 'My Vendor Studio'),
    marketplace: vendor.marketplace === 'party' ? 'party' : 'food',
    category: clampStr(vendor.category, 2, 80, 'Bakers & Cakes'),
    country: vendor.country,
    state: clampStr(vendor.state, 2, 80, 'Maharashtra'),
    city: clampStr(vendor.city, 2, 80, 'Mumbai'),
    area: clampStr(vendor.area || vendor.city, 2, 100, vendor.city),
    lat: Math.max(-90, Math.min(90, Number(vendor.lat) || 19.076)),
    lng: Math.max(-180, Math.min(180, Number(vendor.lng) || 72.8777)),
    whatsappNumber: sanitizeDigits(vendor.whatsappNumber),
    planTier: vendor.planTier,
    monthlyAutoPay: Boolean(vendor.monthlyAutoPay),
    priceTier: vendor.priceTier,
    startingPriceUsd: Math.max(0, Math.min(100000, Number(vendor.startingPriceUsd) || 0)),
    rating: 5.0,
    reviewCount: 0,
    responseTime: clampStr(
      vendor.responseTime || 'Replies within 15 mins on WhatsApp',
      2,
      60,
      'Replies within 15 mins on WhatsApp'
    ),
    verified: isAdminUser ? Boolean(vendor.verified) : false,
    status: 'active' as const,
    tagline: clampStr(vendor.tagline, 3, 180, 'Local event specialist'),
    description: clampStr(vendor.description || vendor.tagline, 5, 1200, 'Local event specialist.'),
    serviceAreas: serviceAreas.length > 0 ? serviceAreas : [vendor.city],
    specialties: specialties.length > 0 ? specialties : [vendor.category],
    image: clampStr(vendor.image, 1, 150000, '/src/assets/images/cat-bakers.png'),
    ...(vendor.logo && vendor.logo.trim().length > 0
      ? { logo: vendor.logo.trim().slice(0, 70000) }
      : {}),
    products: cleanProducts,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'vendors', vendorId), payload);
    return {
      ...vendor,
      id: vendorId,
      ownerId,
      slug: payload.slug,
      status: 'active',
      verified: payload.verified,
      reviewCount: 0,
      image: payload.image,
      logo: payload.logo,
      products: cleanProducts,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateVendorInCloud(
  vendorId: string,
  updates: Partial<{
    name: string;
    tagline: string;
    description: string;
    whatsappNumber: string;
    planTier: PlanTier;
    monthlyAutoPay: boolean;
    startingPriceUsd: number;
    status: 'active' | 'paused';
    image: string;
    logo: string;
    lat: number;
    lng: number;
    products: VendorProduct[];
  }>
): Promise<void> {
  const docPath = `vendors/${vendorId}`;
  const clean: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (updates.name !== undefined) clean.name = clampStr(updates.name, 2, 100, 'Vendor');
  if (updates.tagline !== undefined) clean.tagline = clampStr(updates.tagline, 3, 180, 'Local vendor');
  if (updates.description !== undefined)
    clean.description = clampStr(updates.description, 5, 1200, 'Local vendor');
  if (updates.whatsappNumber !== undefined)
    clean.whatsappNumber = sanitizeDigits(updates.whatsappNumber);
  if (updates.planTier !== undefined) clean.planTier = updates.planTier;
  if (updates.monthlyAutoPay !== undefined) clean.monthlyAutoPay = Boolean(updates.monthlyAutoPay);
  if (updates.startingPriceUsd !== undefined)
    clean.startingPriceUsd = Math.max(0, Math.min(100000, Number(updates.startingPriceUsd) || 0));
  if (updates.status !== undefined) clean.status = updates.status;
  if (updates.image !== undefined)
    clean.image = clampStr(updates.image, 1, 150000, '/src/assets/images/cat-bakers.png');
  if (updates.logo !== undefined) clean.logo = updates.logo.trim().slice(0, 70000);
  if (updates.lat !== undefined) clean.lat = Math.max(-90, Math.min(90, Number(updates.lat) || 0));
  if (updates.lng !== undefined) clean.lng = Math.max(-180, Math.min(180, Number(updates.lng) || 0));
  if (updates.products !== undefined) clean.products = sanitizeProducts(updates.products);

  try {
    await updateDoc(doc(db, 'vendors', vendorId), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteVendorInCloud(vendorId: string): Promise<void> {
  const docPath = `vendors/${vendorId}`;
  try {
    await deleteDoc(doc(db, 'vendors', vendorId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function ensureUserProfile(user: User, fallbackSavedIds: string[]): Promise<string[]> {
  const docPath = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data.savedVendorIds) ? (data.savedVendorIds as string[]) : fallbackSavedIds;
    }

    const boundedSaved = fallbackSavedIds.slice(0, 50).map((s) => s.slice(0, 100));
    await setDoc(ref, {
      uid: user.uid,
      displayName: clampStr(user.displayName || user.email?.split('@')[0] || 'Member', 1, 100, 'Member'),
      email: clampStr(user.email || 'user@example.com', 3, 160, 'user@example.com'),
      savedVendorIds: boundedSaved,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return boundedSaved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function syncSavedVendorsToCloud(uid: string, savedVendorIds: string[]): Promise<void> {
  const docPath = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      savedVendorIds: savedVendorIds.slice(0, 50).map((s) => s.slice(0, 100)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function createBookingInCloud(
  booking: BookingEnquiry,
  customerId: string,
  vendorOwnerId: string
): Promise<BookingEnquiry> {
  const bookingId = sanitizeId(booking.id || `bk-${Date.now()}`);
  const docPath = `bookings/${bookingId}`;
  const payload = {
    reference: sanitizeId(booking.reference),
    customerId,
    vendorId: sanitizeId(booking.vendorId),
    vendorOwnerId: sanitizeId(vendorOwnerId || 'platform'),
    vendorName: clampStr(booking.vendorName, 1, 120, 'Vendor'),
    vendorCity: clampStr(booking.vendorCity, 1, 120, 'City'),
    vendorCategory: clampStr(booking.vendorCategory, 1, 80, 'Events'),
    packageName: clampStr(booking.packageName, 1, 240, 'Event Package'),
    estimatedUsd: Math.max(0, Math.min(500000, Number(booking.estimatedUsd) || 0)),
    eventDate: clampStr(booking.eventDate, 6, 30, '2026-12-20'),
    guests: Math.max(1, Math.min(100000, Number(booking.guests) || 50)),
    customerName: clampStr(booking.customerName, 1, 100, 'Customer'),
    customerEmail: clampStr(booking.customerEmail, 3, 160, 'customer@example.com'),
    notes: (booking.notes || '').trim().slice(0, 1000),
    status: 'Confirmed Enquiry' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'bookings', bookingId), payload);
    return {
      ...booking,
      id: bookingId,
      customerId,
      vendorOwnerId: payload.vendorOwnerId,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export function subscribeMyBookings(
  uid: string,
  onData: (bookings: BookingEnquiry[]) => void
): () => void {
  const q = query(collection(db, 'bookings'), where('customerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => docToBooking(d.id, d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    }
  );
}

export function subscribeVendorLeads(
  uid: string,
  onData: (bookings: BookingEnquiry[]) => void
): () => void {
  const q = query(collection(db, 'bookings'), where('vendorOwnerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => docToBooking(d.id, d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    }
  );
}

export async function updateBookingStatusInCloud(
  bookingId: string,
  status: 'Confirmed Enquiry' | 'Completed' | 'Cancelled'
): Promise<void> {
  const docPath = `bookings/${bookingId}`;
  try {
    await updateDoc(doc(db, 'bookings', bookingId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}
