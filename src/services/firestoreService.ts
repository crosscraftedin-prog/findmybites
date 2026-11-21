import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AdminTransferRecord,
  BioTheme,
  BookingEnquiry,
  CloudVendorMetric,
  DEFAULT_SITE_SETTINGS,
  EventQuote,
  EventRequest,
  LaunchCountry,
  PlanTier,
  PriceTier,
  SiteSettings,
  StoreClaim,
  Vendor,
  VendorBioLink,
  VendorProduct,
  VendorReview,
  computeClaimId,
  normalizePasscode,
  normalizePhoneDigits,
  sanitizeSafeHttpUrl,
} from '../data/vendors';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

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

function sanitizeProducts(products: VendorProduct[], allowEmpty = false): VendorProduct[] {
  const validUnits = new Set(['kg', 'g', 'pcs', 'box', 'dozen', 'pax', 'custom']);
  const list = products.slice(0, 20).map((p, idx) => {
    const cleanDietary = Array.isArray(p.dietaryTags)
      ? p.dietaryTags
          .map((t) => (typeof t === 'string' ? t.trim().slice(0, 32) : ''))
          .filter(Boolean)
          .slice(0, 8)
      : [];
    const unitType =
      typeof p.unitType === 'string' && validUnits.has(p.unitType) ? p.unitType : undefined;
    const unitQuantity =
      typeof p.unitQuantity === 'string' && p.unitQuantity.trim()
        ? p.unitQuantity.trim().slice(0, 16)
        : undefined;
    const foodType =
      p.foodType === 'veg' || p.foodType === 'non-veg' ? p.foodType : undefined;

    return {
      id: sanitizeId(p.id || `prod-${idx + 1}`),
      name: clampStr(p.name, 2, 100, 'Signature Package'),
      serves: clampStr(p.serves || 'Custom', 1, 60, 'Custom'),
      ...(unitQuantity ? { unitQuantity } : {}),
      ...(unitType ? { unitType } : {}),
      ...(foodType ? { foodType } : {}),
      ...(cleanDietary.length > 0 ? { dietaryTags: cleanDietary } : {}),
      priceUsd: Math.max(0, Math.min(100000, Number(p.priceUsd) || 0)),
      description: clampStr(p.description || p.name, 2, 400, 'Custom package'),
      image: clampStr(
        p.image || '/src/assets/images/cat-bakers.png',
        1,
        110000,
        '/src/assets/images/cat-bakers.png'
      ),
      ...(p.tag ? { tag: p.tag.trim().slice(0, 40) } : {}),
    };
  });
  if (list.length > 0 || allowEmpty) return list;
  return [
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

function sanitizeBioHandle(raw: string): string | undefined {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return cleaned.length >= 2 ? cleaned : undefined;
}

function sanitizeCustomLinks(links: VendorBioLink[]): VendorBioLink[] {
  const result: VendorBioLink[] = [];
  for (const [idx, item] of links.slice(0, 8).entries()) {
    const safeUrl = sanitizeSafeHttpUrl(item.url || '');
    const title = (item.title || '').trim().slice(0, 60);
    if (!safeUrl || title.length < 1) continue;
    result.push({
      id: sanitizeId(item.id || `link-${idx + 1}`),
      title,
      url: safeUrl.slice(0, 300),
      ...(item.badge && item.badge.trim() ? { badge: item.badge.trim().slice(0, 24) } : {}),
    });
  }
  return result;
}

function docToVendor(id: string, data: Record<string, unknown>): Vendor {
  const products = Array.isArray(data.products) ? (data.products as VendorProduct[]) : [];
  const status: Vendor['status'] =
    data.status === 'paused'
      ? 'paused'
      : data.status === 'pending_review'
        ? 'pending_review'
        : 'active';
  return {
    id,
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
    status,
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
    promoBanner:
      typeof data.promoBanner === 'string' && data.promoBanner.trim().length > 0
        ? data.promoBanner
        : undefined,
    christmasSpecial: Boolean(data.christmasSpecial),
    christmasOffer:
      typeof data.christmasOffer === 'string' && data.christmasOffer.trim().length > 0
        ? data.christmasOffer
        : undefined,
    bioHandle:
      typeof data.bioHandle === 'string' && data.bioHandle.trim().length >= 2
        ? data.bioHandle
        : undefined,
    bioTheme:
      data.bioTheme === 'saffron' ||
      data.bioTheme === 'midnight' ||
      data.bioTheme === 'party' ||
      data.bioTheme === 'cream'
        ? data.bioTheme
        : undefined,
    instagramHandle:
      typeof data.instagramHandle === 'string' && data.instagramHandle.trim().length > 0
        ? data.instagramHandle
        : undefined,
    customLinks: Array.isArray(data.customLinks)
      ? (data.customLinks as VendorBioLink[])
          .filter((l) => l && typeof l.title === 'string' && typeof l.url === 'string')
          .slice(0, 8)
      : undefined,
    serviceAreas: Array.isArray(data.serviceAreas) ? (data.serviceAreas as string[]) : [],
    specialties: Array.isArray(data.specialties) ? (data.specialties as string[]) : [],
    image: typeof data.image === 'string' ? data.image : '/src/assets/images/cat-bakers.png',
    logo: typeof data.logo === 'string' && data.logo.length > 0 ? data.logo : undefined,
    gallery: Array.isArray(data.gallery)
      ? (data.gallery as string[]).filter((g) => typeof g === 'string' && g.length > 0).slice(0, 6)
      : undefined,
    products,
    reviews: [],
    claimStatus:
      data.claimStatus === 'pending' || data.claimStatus === 'claimed' || data.claimStatus === 'none'
        ? data.claimStatus
        : undefined,
    claimedByToken:
      typeof data.claimedByToken === 'string' && data.claimedByToken.length === 64
        ? data.claimedByToken
        : undefined,
    seoTitle:
      typeof data.seoTitle === 'string' && data.seoTitle.trim().length > 0
        ? data.seoTitle
        : undefined,
    seoDescription:
      typeof data.seoDescription === 'string' && data.seoDescription.trim().length > 0
        ? data.seoDescription
        : undefined,
    seoKeywords:
      typeof data.seoKeywords === 'string' && data.seoKeywords.trim().length > 0
        ? data.seoKeywords
        : undefined,
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
  isAdminUser = false,
  initialStatus: 'active' | 'pending_review' = 'active'
): Promise<Vendor> {
  const resolvedStatus: 'active' | 'pending_review' = isAdminUser ? 'active' : initialStatus;
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
    status: resolvedStatus,
    tagline: clampStr(vendor.tagline, 3, 180, 'Local event specialist'),
    description: clampStr(vendor.description || vendor.tagline, 5, 1200, 'Local event specialist.'),
    ...(vendor.promoBanner && vendor.promoBanner.trim().length > 0
      ? { promoBanner: vendor.promoBanner.trim().slice(0, 120) }
      : {}),
    ...(vendor.christmasSpecial !== undefined
      ? { christmasSpecial: Boolean(vendor.christmasSpecial) }
      : {}),
    ...(vendor.christmasOffer && vendor.christmasOffer.trim().length > 0
      ? { christmasOffer: vendor.christmasOffer.trim().slice(0, 140) }
      : {}),
    serviceAreas: serviceAreas.length > 0 ? serviceAreas : [vendor.city],
    specialties: specialties.length > 0 ? specialties : [vendor.category],
    image: clampStr(vendor.image, 1, 150000, '/src/assets/images/cat-bakers.png'),
    ...(vendor.logo && vendor.logo.trim().length > 0
      ? { logo: vendor.logo.trim().slice(0, 70000) }
      : {}),
    ...(Array.isArray(vendor.gallery) && vendor.gallery.length > 0
      ? {
          gallery: vendor.gallery
            .map((g) => g.trim().slice(0, 95000))
            .filter(Boolean)
            .slice(0, 6),
        }
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
      status: resolvedStatus,
      verified: payload.verified,
      reviewCount: 0,
      image: payload.image,
      logo: payload.logo,
      promoBanner: payload.promoBanner,
      gallery: payload.gallery,
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
    image: string;
    logo: string;
    gallery: string[];
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
  if (updates.slug !== undefined) clean.slug = sanitizeSlug(updates.slug);
  if (updates.tagline !== undefined) clean.tagline = clampStr(updates.tagline, 3, 180, 'Local vendor');
  if (updates.description !== undefined)
    clean.description = clampStr(updates.description, 5, 1200, 'Local vendor');
  if (updates.promoBanner !== undefined) clean.promoBanner = updates.promoBanner.trim().slice(0, 120);
  if (updates.christmasSpecial !== undefined)
    clean.christmasSpecial = Boolean(updates.christmasSpecial);
  if (updates.christmasOffer !== undefined)
    clean.christmasOffer = updates.christmasOffer.trim().slice(0, 140);
  if (updates.bioHandle !== undefined) {
    const cleanHandle = sanitizeBioHandle(updates.bioHandle);
    if (cleanHandle) clean.bioHandle = cleanHandle;
  }
  if (updates.bioTheme !== undefined) clean.bioTheme = updates.bioTheme;
  if (updates.instagramHandle !== undefined)
    clean.instagramHandle = updates.instagramHandle.trim().slice(0, 80);
  if (updates.customLinks !== undefined)
    clean.customLinks = sanitizeCustomLinks(updates.customLinks);
  if (updates.whatsappNumber !== undefined)
    clean.whatsappNumber = sanitizeDigits(updates.whatsappNumber);
  if (updates.planTier !== undefined) clean.planTier = updates.planTier;
  if (updates.monthlyAutoPay !== undefined) clean.monthlyAutoPay = Boolean(updates.monthlyAutoPay);
  if (updates.startingPriceUsd !== undefined)
    clean.startingPriceUsd = Math.max(0, Math.min(100000, Number(updates.startingPriceUsd) || 0));
  if (updates.status !== undefined) clean.status = updates.status;
  if (updates.verified !== undefined) clean.verified = Boolean(updates.verified);
  if (updates.seoTitle !== undefined) clean.seoTitle = updates.seoTitle.trim().slice(0, 100);
  if (updates.seoDescription !== undefined)
    clean.seoDescription = updates.seoDescription.trim().slice(0, 220);
  if (updates.seoKeywords !== undefined) clean.seoKeywords = updates.seoKeywords.trim().slice(0, 240);
  if (updates.image !== undefined)
    clean.image = clampStr(updates.image, 1, 150000, '/src/assets/images/cat-bakers.png');
  if (updates.logo !== undefined) clean.logo = updates.logo.trim().slice(0, 70000);
  if (updates.gallery !== undefined)
    clean.gallery = updates.gallery
      .map((g) => g.trim().slice(0, 95000))
      .filter(Boolean)
      .slice(0, 6);
  if (updates.lat !== undefined) clean.lat = Math.max(-90, Math.min(90, Number(updates.lat) || 0));
  if (updates.lng !== undefined) clean.lng = Math.max(-180, Math.min(180, Number(updates.lng) || 0));
  if (updates.products !== undefined) clean.products = sanitizeProducts(updates.products, true);

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

// ============================================================================
// CLOUD CUSTOMER REVIEWS (/reviews/{reviewId})
// ============================================================================

function docToReview(id: string, data: Record<string, unknown>): VendorReview {
  return {
    id,
    authorId: typeof data.authorId === 'string' ? data.authorId : undefined,
    author: typeof data.authorName === 'string' ? data.authorName : 'Verified Customer',
    role: typeof data.eventType === 'string' ? data.eventType : 'Verified Booking',
    date: formatTs(data.createdAt),
    rating: typeof data.rating === 'number' ? Math.min(5, Math.max(1, data.rating)) : 5,
    comment: typeof data.comment === 'string' ? data.comment : '',
    isCloud: true,
  };
}

export function subscribeVendorReviews(
  vendorId: string,
  onData: (reviews: VendorReview[]) => void
): () => void {
  const safeVendorId = sanitizeId(vendorId);
  const q = query(collection(db, 'reviews'), where('vendorId', '==', safeVendorId), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => docToReview(d.id, d.data()));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    }
  );
}

export async function createReviewInCloud(
  vendorId: string,
  user: User,
  input: { rating: number; eventType: string; comment: string }
): Promise<void> {
  const reviewId = sanitizeId(`rev-${vendorId.slice(0, 24)}-${Date.now()}`);
  const docPath = `reviews/${reviewId}`;
  const payload = {
    vendorId: sanitizeId(vendorId),
    authorId: user.uid,
    authorName: clampStr(user.displayName || user.email?.split('@')[0] || 'Customer', 1, 80, 'Customer'),
    eventType: clampStr(input.eventType, 2, 60, 'Event Booking'),
    rating: Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5))),
    comment: clampStr(input.comment, 5, 600, 'Wonderful experience and service.'),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'reviews', reviewId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function deleteReviewInCloud(reviewId: string): Promise<void> {
  const docPath = `reviews/${reviewId}`;
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// ============================================================================
// BROADCAST EVENT REQUESTS & VENDOR QUOTES (/eventRequests & /quotes)
// ============================================================================

function docToEventRequest(id: string, data: Record<string, unknown>): EventRequest {
  return {
    id,
    customerId: typeof data.customerId === 'string' ? data.customerId : '',
    customerName: typeof data.customerName === 'string' ? data.customerName : 'Host',
    occasion: typeof data.occasion === 'string' ? data.occasion : 'Celebration',
    categories: Array.isArray(data.categories) ? (data.categories as string[]) : [],
    country: (data.country as Exclude<LaunchCountry, 'All'>) || 'India',
    state: typeof data.state === 'string' ? data.state : '',
    city: typeof data.city === 'string' ? data.city : '',
    eventDate: typeof data.eventDate === 'string' ? data.eventDate : '',
    guests: typeof data.guests === 'number' ? data.guests : 50,
    budgetUsd: typeof data.budgetUsd === 'number' ? data.budgetUsd : 200,
    details: typeof data.details === 'string' ? data.details : '',
    status: data.status === 'closed' ? 'closed' : 'open',
    createdAt: formatTs(data.createdAt),
  };
}

function docToEventQuote(id: string, data: Record<string, unknown>): EventQuote {
  return {
    id,
    requestId: typeof data.requestId === 'string' ? data.requestId : '',
    requestCustomerId: typeof data.requestCustomerId === 'string' ? data.requestCustomerId : '',
    vendorOwnerId: typeof data.vendorOwnerId === 'string' ? data.vendorOwnerId : '',
    vendorId: typeof data.vendorId === 'string' ? data.vendorId : '',
    vendorName: typeof data.vendorName === 'string' ? data.vendorName : 'Vendor',
    vendorSlug: typeof data.vendorSlug === 'string' ? data.vendorSlug : '',
    vendorWhatsapp: typeof data.vendorWhatsapp === 'string' ? data.vendorWhatsapp : '',
    priceUsd: typeof data.priceUsd === 'number' ? data.priceUsd : 50,
    message: typeof data.message === 'string' ? data.message : '',
    createdAt: formatTs(data.createdAt),
  };
}

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
  const requestId = sanitizeId(`req-${Date.now()}`);
  const docPath = `eventRequests/${requestId}`;
  const cleanCategories = input.categories
    .map((c) => c.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 4);

  const payload = {
    customerId: user.uid,
    customerName: clampStr(
      (user.displayName || user.email?.split('@')[0] || 'Event Host').split(' ')[0],
      1,
      80,
      'Host'
    ),
    occasion: clampStr(input.occasion, 2, 60, 'Celebration'),
    categories: cleanCategories.length > 0 ? cleanCategories : ['Bakers & Cakes'],
    country: input.country,
    state: clampStr(input.state, 2, 80, 'Maharashtra'),
    city: clampStr(input.city, 2, 80, 'Mumbai'),
    eventDate: clampStr(input.eventDate, 6, 30, '2026-12-20'),
    guests: Math.max(1, Math.min(100000, Math.round(Number(input.guests) || 50))),
    budgetUsd: Math.max(0, Math.min(500000, Number(input.budgetUsd) || 0)),
    details: clampStr(input.details, 5, 800, 'Looking for quotes from local vendors.'),
    status: 'open' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'eventRequests', requestId), payload);
    return requestId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export function subscribeOpenEventRequests(
  onData: (requests: EventRequest[]) => void
): () => void {
  const q = query(collection(db, 'eventRequests'), where('status', '==', 'open'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => docToEventRequest(d.id, d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'eventRequests');
    }
  );
}

export function subscribeMyEventRequests(
  uid: string,
  onData: (requests: EventRequest[]) => void
): () => void {
  const q = query(collection(db, 'eventRequests'), where('customerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => docToEventRequest(d.id, d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'eventRequests');
    }
  );
}

export async function closeEventRequestInCloud(requestId: string): Promise<void> {
  const docPath = `eventRequests/${requestId}`;
  try {
    await updateDoc(doc(db, 'eventRequests', requestId), {
      status: 'closed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function submitEventQuoteInCloud(
  request: EventRequest,
  vendorOwnerId: string,
  vendor: Vendor,
  priceUsd: number,
  message: string
): Promise<void> {
  const quoteId = sanitizeId(`q-${vendor.id.slice(0, 24)}-${Date.now()}`);
  const docPath = `eventRequests/${request.id}/quotes/${quoteId}`;
  const payload = {
    requestId: sanitizeId(request.id),
    requestCustomerId: sanitizeId(request.customerId),
    vendorOwnerId,
    vendorId: sanitizeId(vendor.id),
    vendorName: clampStr(vendor.name, 2, 100, 'Vendor'),
    vendorSlug: sanitizeSlug(vendor.slug || vendor.name),
    vendorWhatsapp: sanitizeDigits(vendor.whatsappNumber),
    priceUsd: Math.max(1, Math.min(500000, Number(priceUsd) || 1)),
    message: clampStr(message, 5, 600, 'We would love to cater/decorate your event!'),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'eventRequests', request.id, 'quotes', quoteId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export function subscribeRequestQuotesForCustomer(
  requestId: string,
  customerUid: string,
  onData: (quotes: EventQuote[]) => void
): () => void {
  const q = query(
    collection(db, 'eventRequests', requestId, 'quotes'),
    where('requestCustomerId', '==', customerUid)
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => docToEventQuote(d.id, d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `eventRequests/${requestId}/quotes`);
    }
  );
}

// ============================================================================
// CLOUD VENDOR ENGAGEMENT METRICS (/vendorMetrics/{vendorId})
// ============================================================================

export async function incrementVendorMetricInCloud(
  vendorId: string,
  field: 'views' | 'whatsappClicks' | 'shares'
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const safeId = sanitizeId(vendorId);
  const ref = doc(db, 'vendorMetrics', safeId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        vendorId: safeId,
        views: field === 'views' ? 1 : 0,
        whatsappClicks: field === 'whatsappClicks' ? 1 : 0,
        shares: field === 'shares' ? 1 : 0,
        updatedAt: serverTimestamp(),
      });
    } else {
      const data = snap.data();
      const curViews = typeof data.views === 'number' ? data.views : 0;
      const curWa = typeof data.whatsappClicks === 'number' ? data.whatsappClicks : 0;
      const curShares = typeof data.shares === 'number' ? data.shares : 0;
      await updateDoc(ref, {
        views: field === 'views' ? curViews + 1 : curViews,
        whatsappClicks: field === 'whatsappClicks' ? curWa + 1 : curWa,
        shares: field === 'shares' ? curShares + 1 : curShares,
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Non-blocking analytics increment
  }
}

export function subscribeVendorMetric(
  vendorId: string,
  onData: (metric: CloudVendorMetric) => void
): () => void {
  const safeId = sanitizeId(vendorId);
  const ref = doc(db, 'vendorMetrics', safeId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData({ vendorId: safeId, views: 0, whatsappClicks: 0, shares: 0 });
        return;
      }
      const d = snap.data();
      onData({
        vendorId: safeId,
        views: typeof d.views === 'number' ? d.views : 0,
        whatsappClicks: typeof d.whatsappClicks === 'number' ? d.whatsappClicks : 0,
        shares: typeof d.shares === 'number' ? d.shares : 0,
      });
    },
    () => {
      // Non-blocking fallback
    }
  );
}

// ============================================================================
// ADMIN CONCIERGE STORE BUILDER & CRYPTOGRAPHIC PASSCODE TRANSFER
// ============================================================================

function docToStoreClaim(id: string, data: Record<string, unknown>): StoreClaim {
  return {
    id,
    vendorId: typeof data.vendorId === 'string' ? data.vendorId : '',
    vendorSlug: typeof data.vendorSlug === 'string' ? data.vendorSlug : '',
    vendorName: typeof data.vendorName === 'string' ? data.vendorName : 'Storefront',
    phoneLast4: typeof data.phoneLast4 === 'string' ? data.phoneLast4 : '0000',
    status:
      data.status === 'claimed' || data.status === 'revoked' ? data.status : 'pending',
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    claimedBy: typeof data.claimedBy === 'string' ? data.claimedBy : undefined,
    createdAt: formatTs(data.createdAt),
    updatedAt: formatTs(data.updatedAt),
  };
}

function docToAdminTransfer(id: string, data: Record<string, unknown>): AdminTransferRecord {
  return {
    vendorId: typeof data.vendorId === 'string' ? data.vendorId : id,
    vendorName: typeof data.vendorName === 'string' ? data.vendorName : 'Storefront',
    vendorSlug: typeof data.vendorSlug === 'string' ? data.vendorSlug : '',
    targetPhone: typeof data.targetPhone === 'string' ? data.targetPhone : '',
    passcode: typeof data.passcode === 'string' ? data.passcode : '',
    claimId: typeof data.claimId === 'string' ? data.claimId : '',
    status:
      data.status === 'claimed' || data.status === 'revoked' ? data.status : 'pending',
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    createdAt: formatTs(data.createdAt),
    updatedAt: formatTs(data.updatedAt),
  };
}

export interface AdminCreateStoreTransferResult {
  vendor: Vendor;
  transfer: AdminTransferRecord;
}

export async function adminCreateStoreWithTransfer(
  vendor: Vendor,
  adminUid: string,
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

  const vendorId = sanitizeId(vendor.id || `${vendor.slug}-${Date.now().toString().slice(-4)}`);
  const slug = sanitizeSlug(vendor.slug || vendor.name);
  const name = clampStr(vendor.name, 2, 100, 'My Bakery Studio');
  const cleanProducts = sanitizeProducts(vendor.products);
  const serviceAreas = vendor.serviceAreas
    .map((s) => s.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 10);
  const specialties = vendor.specialties
    .map((s) => s.trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 10);
  const cleanBioHandle = vendor.bioHandle ? sanitizeBioHandle(vendor.bioHandle) : undefined;

  const claimId = await computeClaimId(targetPhone, cleanPasscode);
  const phoneLast4 = targetPhone.slice(-4).padStart(4, '0');

  const vendorPayload = {
    ownerId: adminUid,
    slug,
    name,
    marketplace: vendor.marketplace === 'party' ? 'party' : 'food',
    category: clampStr(vendor.category, 2, 80, 'Bakers & Cakes'),
    country: vendor.country,
    state: clampStr(vendor.state, 2, 80, 'Maharashtra'),
    city: clampStr(vendor.city, 2, 80, 'Mumbai'),
    area: clampStr(vendor.area || vendor.city, 2, 100, vendor.city),
    lat: Math.max(-90, Math.min(90, Number(vendor.lat) || 19.076)),
    lng: Math.max(-180, Math.min(180, Number(vendor.lng) || 72.8777)),
    whatsappNumber: targetPhone,
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
    verified: Boolean(vendor.verified),
    status: 'active' as const,
    tagline: clampStr(vendor.tagline, 3, 180, 'Artisan cakes & custom local orders'),
    description: clampStr(
      vendor.description || vendor.tagline,
      5,
      1200,
      'Freshly handcrafted local cakes, desserts and custom event orders.'
    ),
    ...(vendor.promoBanner && vendor.promoBanner.trim().length > 0
      ? { promoBanner: vendor.promoBanner.trim().slice(0, 120) }
      : {}),
    ...(vendor.christmasSpecial !== undefined
      ? { christmasSpecial: Boolean(vendor.christmasSpecial) }
      : {}),
    ...(vendor.christmasOffer && vendor.christmasOffer.trim().length > 0
      ? { christmasOffer: vendor.christmasOffer.trim().slice(0, 140) }
      : {}),
    ...(cleanBioHandle ? { bioHandle: cleanBioHandle } : {}),
    serviceAreas: serviceAreas.length > 0 ? serviceAreas : [vendor.city],
    specialties: specialties.length > 0 ? specialties : [vendor.category],
    image: clampStr(vendor.image, 1, 150000, '/src/assets/images/cat-bakers.png'),
    ...(vendor.logo && vendor.logo.trim().length > 0
      ? { logo: vendor.logo.trim().slice(0, 70000) }
      : {}),
    products: cleanProducts,
    claimStatus: 'pending' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const claimPayload = {
    vendorId,
    vendorSlug: slug,
    vendorName: name,
    phoneLast4,
    status: 'pending' as const,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const transferPayload = {
    vendorId,
    vendorName: name,
    vendorSlug: slug,
    targetPhone,
    passcode: cleanPasscode,
    claimId,
    status: 'pending' as const,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'vendors', vendorId), vendorPayload);
    batch.set(doc(db, 'storeClaims', claimId), claimPayload);
    batch.set(doc(db, 'adminTransfers', vendorId), transferPayload);
    await batch.commit();

    const nowLabel = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      vendor: {
        ...vendor,
        id: vendorId,
        ownerId: adminUid,
        slug,
        name,
        whatsappNumber: targetPhone,
        status: 'active',
        verified: vendorPayload.verified,
        reviewCount: 0,
        products: cleanProducts,
        bioHandle: cleanBioHandle,
        claimStatus: 'pending',
      },
      transfer: {
        vendorId,
        vendorName: name,
        vendorSlug: slug,
        targetPhone,
        passcode: cleanPasscode,
        claimId,
        status: 'pending',
        createdBy: adminUid,
        createdAt: nowLabel,
        updatedAt: nowLabel,
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `vendors/${vendorId}`);
  }
}

export async function adminIssueTransferForExistingStore(
  vendor: Vendor,
  adminUid: string,
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

  const vendorId = sanitizeId(vendor.id);
  const claimId = await computeClaimId(targetPhone, cleanPasscode);
  const phoneLast4 = targetPhone.slice(-4).padStart(4, '0');
  const slug = sanitizeSlug(vendor.slug || vendor.name);
  const name = clampStr(vendor.name, 2, 100, 'Storefront');

  try {
    const batch = writeBatch(db);
    if (previousClaimId && previousClaimId !== claimId && previousClaimId.length === 64) {
      const prevSnap = await getDoc(doc(db, 'storeClaims', previousClaimId));
      if (prevSnap.exists() && prevSnap.data()?.status === 'pending') {
        batch.update(doc(db, 'storeClaims', previousClaimId), {
          status: 'revoked',
          updatedAt: serverTimestamp(),
        });
      }
    }

    batch.update(doc(db, 'vendors', vendorId), {
      whatsappNumber: targetPhone,
      claimStatus: 'pending',
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'storeClaims', claimId), {
      vendorId,
      vendorSlug: slug,
      vendorName: name,
      phoneLast4,
      status: 'pending',
      createdBy: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const existingTransfer = await getDoc(doc(db, 'adminTransfers', vendorId));
    if (existingTransfer.exists()) {
      batch.update(doc(db, 'adminTransfers', vendorId), {
        vendorName: name,
        vendorSlug: slug,
        targetPhone,
        passcode: cleanPasscode,
        claimId,
        status: 'pending',
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(doc(db, 'adminTransfers', vendorId), {
        vendorId,
        vendorName: name,
        vendorSlug: slug,
        targetPhone,
        passcode: cleanPasscode,
        claimId,
        status: 'pending',
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();

    const nowLabel = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      vendorId,
      vendorName: name,
      vendorSlug: slug,
      targetPhone,
      passcode: cleanPasscode,
      claimId,
      status: 'pending',
      createdBy: adminUid,
      createdAt: nowLabel,
      updatedAt: nowLabel,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `adminTransfers/${vendorId}`);
  }
}

export async function adminRevokeTransfer(
  vendorId: string,
  claimId: string
): Promise<void> {
  const safeVendorId = sanitizeId(vendorId);
  try {
    const batch = writeBatch(db);
    if (claimId && claimId.length === 64) {
      const snap = await getDoc(doc(db, 'storeClaims', claimId));
      if (snap.exists() && snap.data()?.status === 'pending') {
        batch.update(doc(db, 'storeClaims', claimId), {
          status: 'revoked',
          updatedAt: serverTimestamp(),
        });
      }
    }
    batch.update(doc(db, 'vendors', safeVendorId), {
      claimStatus: 'none',
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'adminTransfers', safeVendorId), {
      status: 'revoked',
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `adminTransfers/${safeVendorId}`);
  }
}

export function subscribeAdminTransfers(
  onData: (records: AdminTransferRecord[]) => void
): () => void {
  const q = query(collection(db, 'adminTransfers'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => docToAdminTransfer(d.id, d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'adminTransfers');
    }
  );
}

export function subscribeAdminStoreClaims(
  onData: (claims: StoreClaim[]) => void
): () => void {
  const q = query(collection(db, 'storeClaims'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => docToStoreClaim(d.id, d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'storeClaims');
    }
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
  try {
    const snap = await getDoc(doc(db, 'storeClaims', claimId));
    if (!snap.exists()) return null;
    return {
      claim: docToStoreClaim(snap.id, snap.data()),
      claimId,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `storeClaims/${claimId}`);
  }
}

export async function redeemStoreClaim(
  claimId: string,
  vendorId: string,
  bakerUid: string
): Promise<void> {
  const safeVendorId = sanitizeId(vendorId);
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'storeClaims', claimId), {
      status: 'claimed',
      claimedBy: bakerUid,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'vendors', safeVendorId), {
      ownerId: bakerUid,
      claimStatus: 'claimed',
      claimedByToken: claimId,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `storeClaims/${claimId}`);
  }
}

// ============================================================================
// GLOBAL SITE SETTINGS & SEO CONFIG (/siteSettings/global)
// ============================================================================

export function subscribeSiteSettings(
  onData: (settings: SiteSettings) => void
): () => void {
  const ref = doc(db, 'siteSettings', 'global');
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(DEFAULT_SITE_SETTINGS);
        return;
      }
      const d = snap.data();
      onData({
        requireVendorApproval:
          typeof d.requireVendorApproval === 'boolean'
            ? d.requireVendorApproval
            : DEFAULT_SITE_SETTINGS.requireVendorApproval,
        snowfallEnabled:
          typeof d.snowfallEnabled === 'boolean'
            ? d.snowfallEnabled
            : DEFAULT_SITE_SETTINGS.snowfallEnabled,
        promoEnabled:
          typeof d.promoEnabled === 'boolean'
            ? d.promoEnabled
            : DEFAULT_SITE_SETTINGS.promoEnabled,
        promoText:
          typeof d.promoText === 'string' && d.promoText.trim().length > 0
            ? d.promoText
            : DEFAULT_SITE_SETTINGS.promoText,
        promoCtaLabel:
          typeof d.promoCtaLabel === 'string' && d.promoCtaLabel.trim().length > 0
            ? d.promoCtaLabel
            : DEFAULT_SITE_SETTINGS.promoCtaLabel,
        siteTitle:
          typeof d.siteTitle === 'string' && d.siteTitle.trim().length > 0
            ? d.siteTitle
            : DEFAULT_SITE_SETTINGS.siteTitle,
        siteDescription:
          typeof d.siteDescription === 'string' && d.siteDescription.trim().length > 0
            ? d.siteDescription
            : DEFAULT_SITE_SETTINGS.siteDescription,
        siteKeywords:
          typeof d.siteKeywords === 'string' && d.siteKeywords.trim().length > 0
            ? d.siteKeywords
            : DEFAULT_SITE_SETTINGS.siteKeywords,
        updatedBy: typeof d.updatedBy === 'string' ? d.updatedBy : undefined,
      });
    },
    () => {
      onData(DEFAULT_SITE_SETTINGS);
    }
  );
}

export async function saveSiteSettingsInCloud(
  settings: SiteSettings,
  adminUid: string
): Promise<void> {
  const docPath = 'siteSettings/global';
  const payload = {
    requireVendorApproval: Boolean(settings.requireVendorApproval),
    snowfallEnabled: Boolean(settings.snowfallEnabled),
    promoEnabled: Boolean(settings.promoEnabled),
    promoText: clampStr(settings.promoText, 1, 200, DEFAULT_SITE_SETTINGS.promoText),
    promoCtaLabel: clampStr(settings.promoCtaLabel, 1, 60, DEFAULT_SITE_SETTINGS.promoCtaLabel),
    siteTitle: clampStr(settings.siteTitle, 5, 110, DEFAULT_SITE_SETTINGS.siteTitle),
    siteDescription: clampStr(
      settings.siteDescription,
      10,
      240,
      DEFAULT_SITE_SETTINGS.siteDescription
    ),
    siteKeywords: clampStr(settings.siteKeywords, 3, 280, DEFAULT_SITE_SETTINGS.siteKeywords),
    updatedBy: adminUid,
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(doc(db, 'siteSettings', 'global'), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

// ============================================================================
// FULL ADMIN MODERATION & ANALYTICS SUBSCRIPTIONS (ROOT ADMIN ONLY)
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

export function subscribeAllVendorsForAdmin(
  onData: (vendors: Vendor[]) => void
): () => void {
  const q = query(collection(db, 'vendors'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => docToVendor(d.id, d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
    }
  );
}

export function subscribeAllBookingsForAdmin(
  onData: (bookings: BookingEnquiry[]) => void
): () => void {
  const q = query(collection(db, 'bookings'));
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

export function subscribeAllReviewsForAdmin(
  onData: (reviews: AdminReviewRecord[]) => void
): () => void {
  const q = query(collection(db, 'reviews'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      const rows: AdminReviewRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          vendorId: typeof data.vendorId === 'string' ? data.vendorId : '',
          authorId: typeof data.authorId === 'string' ? data.authorId : '',
          authorName: typeof data.authorName === 'string' ? data.authorName : 'Customer',
          eventType: typeof data.eventType === 'string' ? data.eventType : 'Booking',
          rating: typeof data.rating === 'number' ? Math.min(5, Math.max(1, data.rating)) : 5,
          comment: typeof data.comment === 'string' ? data.comment : '',
          createdAt: formatTs(data.createdAt),
        };
      });
      onData(rows);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    }
  );
}

export function subscribeAllEventRequestsForAdmin(
  onData: (requests: EventRequest[]) => void
): () => void {
  const q = query(collection(db, 'eventRequests'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => docToEventRequest(d.id, d.data())));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'eventRequests');
    }
  );
}

export function subscribeAllVendorMetricsForAdmin(
  onData: (metrics: CloudVendorMetric[]) => void
): () => void {
  const q = query(collection(db, 'vendorMetrics'));
  return onSnapshot(
    q,
    (snap) => {
      const list: CloudVendorMetric[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          vendorId: typeof data.vendorId === 'string' ? data.vendorId : d.id,
          views: typeof data.views === 'number' ? data.views : 0,
          whatsappClicks: typeof data.whatsappClicks === 'number' ? data.whatsappClicks : 0,
          shares: typeof data.shares === 'number' ? data.shares : 0,
        };
      });
      onData(list);
    },
    () => {
      onData([]);
    }
  );
}

export async function adminUpdateEventRequestStatus(
  requestId: string,
  status: 'open' | 'closed'
): Promise<void> {
  const docPath = `eventRequests/${requestId}`;
  try {
    await updateDoc(doc(db, 'eventRequests', requestId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function adminDeleteEventRequestInCloud(requestId: string): Promise<void> {
  const docPath = `eventRequests/${requestId}`;
  try {
    await deleteDoc(doc(db, 'eventRequests', requestId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function adminDeleteBookingInCloud(bookingId: string): Promise<void> {
  const docPath = `bookings/${bookingId}`;
  try {
    await deleteDoc(doc(db, 'bookings', bookingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}


