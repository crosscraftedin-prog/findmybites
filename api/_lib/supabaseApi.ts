import crypto from 'crypto';
import fs from 'fs';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

const ADMIN_EMAIL = 'crosscraftedin@gmail.com';
const MEDIA_BUCKET = 'marketplace-media';
const DEFAULT_FALLBACK_IMAGE = '/src/assets/images/vendor_wedding_cake_1795190931172.jpg';

function loadFirebaseConfig(): { projectId: string; firestoreDatabaseId: string } {
  const fallback = {
    projectId: (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0613198330').trim(),
    firestoreDatabaseId: 'ai-studio-findmybitespimpm-e62e8cda-3b00-4f15-9a37-e7c06c6009f7',
  };
  try {
    const raw = fs.readFileSync(new URL('../../firebase-applet-config.json', import.meta.url), 'utf8');
    const parsed = JSON.parse(raw) as { projectId?: string; firestoreDatabaseId?: string };
    return {
      projectId: parsed.projectId || fallback.projectId,
      firestoreDatabaseId: parsed.firestoreDatabaseId || fallback.firestoreDatabaseId,
    };
  } catch {
    return fallback;
  }
}

const firebaseConfig = loadFirebaseConfig();

const claimLookupAttempts = new Map<string, { count: number; resetAt: number }>();
function checkClaimLookupRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 25;
  const entry = claimLookupAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    claimLookupAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count += 1;
  return true;
}

let cachedAdminAuth: ReturnType<typeof getAuth> | null = null;
function getAdminAuth(): ReturnType<typeof getAuth> {
  if (!cachedAdminAuth) {
    if (!getApps().length) {
      initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    cachedAdminAuth = getAuth();
  }
  return cachedAdminAuth;
}

let cachedSupabase: SupabaseClient | null = null;
let cachedSupabaseKeySignature = '';

function getSupabase(): SupabaseClient {
  const url = (process.env.SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase is not configured on the server yet. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Settings -> Secrets.'
    );
  }
  const sig = `${url}:${serviceKey.length}`;
  if (!cachedSupabase || cachedSupabaseKeySignature !== sig) {
    cachedSupabase = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedSupabaseKeySignature = sig;
  }
  return cachedSupabase;
}

interface AuthedRequest extends Request {
  user?: DecodedIdToken;
}

function isRootAdmin(user: DecodedIdToken | undefined): boolean {
  return Boolean(
    user?.email_verified === true &&
      typeof user.email === 'string' &&
      user.email.toLowerCase() === ADMIN_EMAIL
  );
}

function isAuthenticatedAccount(user: DecodedIdToken): boolean {
  const provider =
    typeof user.firebase?.sign_in_provider === 'string'
      ? user.firebase.sign_in_provider
      : '';
  return user.email_verified === true || provider === 'password';
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token.' });
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (!isAuthenticatedAccount(decoded)) {
      return res.status(403).json({ error: 'Verified account required.' });
    }
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('[Auth verifyIdToken failed]:', err instanceof Error ? err.message : err);
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}

async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    if (!isRootAdmin(req.user)) {
      return res.status(403).json({ error: 'Admin privileges required.' });
    }
    return next();
  });
}

function sanitizeId(raw: unknown, fallbackPrefix = 'id'): string {
  const str = typeof raw === 'string' ? raw : '';
  const cleaned = str.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned.length >= 2 ? cleaned : `${fallbackPrefix}-${Date.now()}`;
}

function sanitizeSlug(raw: unknown): string {
  const str = typeof raw === 'string' ? raw : '';
  const cleaned = str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return cleaned.length >= 2 ? cleaned : `vendor-${Date.now()}`;
}

function sanitizeBioHandle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return cleaned.length >= 2 ? cleaned : null;
}

async function ensureUniqueVendorSlug(
  supabase: SupabaseClient,
  desiredRaw: unknown,
  excludeVendorId?: string
): Promise<string> {
  const base = sanitizeSlug(desiredRaw).slice(0, 84);
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate =
      attempt === 0
        ? base
        : attempt < 6
          ? `${base}-${attempt + 1}`
          : `${base}-${crypto.randomBytes(2).toString('hex')}`;
    const { data } = await supabase
      .from('vendors')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data || (excludeVendorId && data.id === excludeVendorId)) {
      return candidate;
    }
  }
  return `${base}-${Date.now().toString().slice(-6)}`;
}

function clampStr(raw: unknown, min: number, max: number, fallback: string): string {
  const trimmed = typeof raw === 'string' ? raw.trim().slice(0, max) : '';
  return trimmed.length >= min ? trimmed : fallback;
}

function sanitizeDigits(raw: unknown): string {
  const digits = typeof raw === 'string' ? raw.replace(/\D/g, '').slice(0, 18) : '';
  return digits.length >= 7 ? digits : '919820001122';
}

function sanitizeSafeHttpUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      return u.toString();
    }
  } catch {
    // ignore invalid URLs
  }
  return undefined;
}

function formatDateLabel(ts: unknown): string {
  if (typeof ts !== 'string' || !ts) {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Automatically uploads inline base64 data:image/* payloads to Supabase Storage
 * (`marketplace-media`) and returns a fast public CDN URL so PostgreSQL rows stay tiny.
 */
async function uploadDataUrlIfNeeded(
  supabase: SupabaseClient,
  value: unknown,
  folder: string
): Promise<string> {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('data:image/')) {
    return trimmed.slice(0, 2000);
  }

  const match = trimmed.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return trimmed.slice(0, 150000);
  }

  const mime = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.byteLength > 2 * 1024 * 1024) {
    return trimmed.slice(0, 150000);
  }

  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 24);
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').slice(0, 60) || 'uploads';
  const objectPath = `${safeFolder}/${hash}.${ext}`;

  try {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(objectPath, buffer, {
      contentType: mime,
      cacheControl: '31536000',
      upsert: true,
    });
    if (error) {
      return trimmed.slice(0, 150000);
    }
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(objectPath);
    return data?.publicUrl || trimmed.slice(0, 150000);
  } catch {
    return trimmed.slice(0, 150000);
  }
}

async function normalizeProductsForStorage(
  supabase: SupabaseClient,
  vendorId: string,
  rawProducts: unknown
): Promise<Record<string, unknown>[]> {
  if (!Array.isArray(rawProducts)) return [];
  const validUnits = new Set(['kg', 'g', 'pcs', 'box', 'dozen', 'pax', 'custom']);
  const validPresets = new Set(['veg', 'non-veg', 'party']);

  const bounded = rawProducts.slice(0, 60);
  return Promise.all(
    bounded.map(async (item, idx) => {
      const p = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const imageUrl = await uploadDataUrlIfNeeded(
        supabase,
        p.image || DEFAULT_FALLBACK_IMAGE,
        `vendors/${sanitizeId(vendorId)}/products`
      );
      const dietaryTags = Array.isArray(p.dietaryTags)
        ? p.dietaryTags
            .map((t) => (typeof t === 'string' ? t.trim().slice(0, 32) : ''))
            .filter(Boolean)
            .slice(0, 8)
        : [];
      const builderPresets = Array.isArray(p.builderPresets)
        ? Array.from(
            new Set(
              p.builderPresets.filter(
                (pr): pr is string => typeof pr === 'string' && validPresets.has(pr)
              )
            )
          ).slice(0, 3)
        : [];

      const out: Record<string, unknown> = {
        id: sanitizeId(p.id || `prod-${idx + 1}`, 'prod'),
        name: clampStr(p.name, 1, 100, 'Signature Package'),
        serves: clampStr(p.serves || 'Custom', 1, 60, 'Custom'),
        priceUsd: Math.max(0, Math.min(100000, Number(p.priceUsd) || 0)),
        description: clampStr(p.description || p.name, 1, 400, 'Custom package'),
        image:
          imageUrl && imageUrl !== '/src/assets/images/cat-bakers.png'
            ? imageUrl
            : DEFAULT_FALLBACK_IMAGE,
      };
      if (typeof p.unitQuantity === 'string' && p.unitQuantity.trim()) {
        out.unitQuantity = p.unitQuantity.trim().slice(0, 16);
      }
      if (typeof p.unitType === 'string' && validUnits.has(p.unitType)) {
        out.unitType = p.unitType;
      }
      if (p.foodType === 'veg' || p.foodType === 'non-veg') {
        out.foodType = p.foodType;
      }
      if (dietaryTags.length > 0) {
        out.dietaryTags = dietaryTags;
      }
      if (typeof p.builderSection === 'string' && p.builderSection.trim()) {
        out.builderSection = p.builderSection.trim().slice(0, 60);
      }
      if (builderPresets.length > 0) {
        out.builderPresets = builderPresets;
      }
      if (typeof p.tag === 'string' && p.tag.trim()) {
        out.tag = p.tag.trim().slice(0, 40);
      }
      return out;
    })
  );
}

function rowToVendor(row: Record<string, unknown>) {
  return {
    id: String(row.id || ''),
    ownerId: typeof row.owner_id === 'string' ? row.owner_id : undefined,
    status:
      row.status === 'paused' || row.status === 'pending_review' ? row.status : 'active',
    slug: typeof row.slug === 'string' ? row.slug : sanitizeSlug(row.id),
    name: typeof row.name === 'string' ? row.name : 'Vendor',
    marketplace: row.marketplace === 'party' ? 'party' : 'food',
    category: typeof row.category === 'string' ? row.category : 'Bakers & Cakes',
    country: typeof row.country === 'string' ? row.country : 'India',
    state: typeof row.state === 'string' ? row.state : 'Maharashtra',
    city: typeof row.city === 'string' ? row.city : 'Mumbai',
    area: typeof row.area === 'string' ? row.area : 'City Center',
    lat: typeof row.lat === 'number' ? row.lat : 19.076,
    lng: typeof row.lng === 'number' ? row.lng : 72.8777,
    whatsappNumber:
      typeof row.whatsapp_number === 'string' ? row.whatsapp_number : '919820001122',
    planTier:
      row.plan_tier === 'pro' || row.plan_tier === 'business' ? row.plan_tier : 'free',
    monthlyAutoPay: Boolean(row.monthly_auto_pay),
    priceTier: typeof row.price_tier === 'string' ? row.price_tier : '$$',
    startingPriceUsd:
      typeof row.starting_price_usd === 'number' ? row.starting_price_usd : 50,
    rating: typeof row.rating === 'number' ? row.rating : 5.0,
    reviewCount: typeof row.review_count === 'number' ? row.review_count : 0,
    responseTime:
      typeof row.response_time === 'string'
        ? row.response_time
        : 'Replies within 15 mins on WhatsApp',
    verified: Boolean(row.verified),
    tagline: typeof row.tagline === 'string' ? row.tagline : '',
    description: typeof row.description === 'string' ? row.description : '',
    promoBanner:
      typeof row.promo_banner === 'string' && row.promo_banner.trim()
        ? row.promo_banner
        : undefined,
    christmasSpecial: Boolean(row.christmas_special),
    christmasOffer:
      typeof row.christmas_offer === 'string' && row.christmas_offer.trim()
        ? row.christmas_offer
        : undefined,
    bioHandle:
      typeof row.bio_handle === 'string' && row.bio_handle.trim().length >= 2
        ? row.bio_handle
        : undefined,
    bioTheme:
      row.bio_theme === 'saffron' ||
      row.bio_theme === 'midnight' ||
      row.bio_theme === 'party' ||
      row.bio_theme === 'cream'
        ? row.bio_theme
        : undefined,
    instagramHandle:
      typeof row.instagram_handle === 'string' && row.instagram_handle.trim()
        ? row.instagram_handle
        : undefined,
    customLinks: Array.isArray(row.custom_links) ? row.custom_links : undefined,
    serviceAreas: Array.isArray(row.service_areas) ? row.service_areas : [],
    allStatesCoverage: Boolean(row.all_states_coverage),
    serviceStates: Array.isArray(row.service_states) ? row.service_states : undefined,
    specialties: Array.isArray(row.specialties) ? row.specialties : [],
    image:
      typeof row.image === 'string' &&
      row.image.trim() &&
      row.image.trim() !== '/src/assets/images/cat-bakers.png'
        ? row.image
        : DEFAULT_FALLBACK_IMAGE,
    logo: typeof row.logo === 'string' && row.logo.trim() ? row.logo : undefined,
    gallery: Array.isArray(row.gallery) ? row.gallery : undefined,
    products: Array.isArray(row.products) ? row.products : [],
    customBuilderEnabled: Boolean(row.custom_builder_enabled),
    customBuilderMode:
      row.custom_builder_mode === 'snackbox' ||
      row.custom_builder_mode === 'mealbox' ||
      row.custom_builder_mode === 'catering'
        ? row.custom_builder_mode
        : undefined,
    customBuilderMinQty:
      typeof row.custom_builder_min_qty === 'number' && row.custom_builder_min_qty >= 1
        ? row.custom_builder_min_qty
        : undefined,
    customBuilderPackagingUsd:
      typeof row.custom_builder_packaging_usd === 'number' &&
      row.custom_builder_packaging_usd >= 0
        ? row.custom_builder_packaging_usd
        : undefined,
    claimStatus:
      row.claim_status === 'pending' || row.claim_status === 'claimed'
        ? row.claim_status
        : 'none',
    claimedByToken:
      typeof row.claimed_by_token === 'string' && row.claimed_by_token.trim()
        ? row.claimed_by_token
        : undefined,
    seoTitle:
      typeof row.seo_title === 'string' && row.seo_title.trim() ? row.seo_title : undefined,
    seoDescription:
      typeof row.seo_description === 'string' && row.seo_description.trim()
        ? row.seo_description
        : undefined,
    seoKeywords:
      typeof row.seo_keywords === 'string' && row.seo_keywords.trim()
        ? row.seo_keywords
        : undefined,
    reviews: [],
    isCloud: true,
  };
}

function rowToBooking(row: Record<string, unknown>) {
  return {
    id: String(row.id || ''),
    reference: String(row.reference || row.id || ''),
    customerId: typeof row.customer_id === 'string' ? row.customer_id : undefined,
    vendorOwnerId: typeof row.vendor_owner_id === 'string' ? row.vendor_owner_id : undefined,
    vendorId: String(row.vendor_id || ''),
    vendorName: String(row.vendor_name || ''),
    vendorCity: String(row.vendor_city || ''),
    vendorCategory: String(row.vendor_category || ''),
    packageName: String(row.package_name || ''),
    estimatedUsd: typeof row.estimated_usd === 'number' ? row.estimated_usd : 0,
    eventDate: String(row.event_date || ''),
    guests: typeof row.guests === 'number' ? row.guests : 10,
    customerName: String(row.customer_name || ''),
    customerEmail: String(row.customer_email || ''),
    notes: String(row.notes || ''),
    createdAt: formatDateLabel(row.created_at),
    status: String(row.status || 'Confirmed Enquiry'),
  };
}

function rowToReview(row: Record<string, unknown>) {
  return {
    id: String(row.id || ''),
    authorId: typeof row.author_id === 'string' ? row.author_id : undefined,
    author: String(row.author_name || 'Verified Customer'),
    role: String(row.event_type || 'Verified Booking'),
    date: formatDateLabel(row.created_at),
    rating: typeof row.rating === 'number' ? Math.min(5, Math.max(1, row.rating)) : 5,
    comment: String(row.comment || ''),
    isCloud: true,
  };
}

function rowToAdminReview(row: Record<string, unknown>) {
  return {
    id: String(row.id || ''),
    vendorId: String(row.vendor_id || ''),
    authorId: String(row.author_id || ''),
    authorName: String(row.author_name || 'Customer'),
    eventType: String(row.event_type || 'Booking'),
    rating: typeof row.rating === 'number' ? Math.min(5, Math.max(1, row.rating)) : 5,
    comment: String(row.comment || ''),
    createdAt: formatDateLabel(row.created_at),
  };
}

function rowToEventRequest(row: Record<string, unknown>) {
  return {
    id: String(row.id || ''),
    customerId: String(row.customer_id || ''),
    customerName: String(row.customer_name || 'Host'),
    occasion: String(row.occasion || 'Celebration'),
    categories: Array.isArray(row.categories) ? row.categories : [],
    country: String(row.country || 'India'),
    state: String(row.state || ''),
    city: String(row.city || ''),
    eventDate: String(row.event_date || ''),
    guests: typeof row.guests === 'number' ? row.guests : 50,
    budgetUsd: typeof row.budget_usd === 'number' ? row.budget_usd : 200,
    details: String(row.details || ''),
    status: row.status === 'closed' ? 'closed' : 'open',
    createdAt: formatDateLabel(row.created_at),
  };
}

function rowToEventQuote(row: Record<string, unknown>) {
  return {
    id: String(row.id || ''),
    requestId: String(row.request_id || ''),
    requestCustomerId: String(row.request_customer_id || ''),
    vendorOwnerId: String(row.vendor_owner_id || ''),
    vendorId: String(row.vendor_id || ''),
    vendorName: String(row.vendor_name || 'Vendor'),
    vendorSlug: String(row.vendor_slug || ''),
    vendorWhatsapp: String(row.vendor_whatsapp || ''),
    priceUsd: typeof row.price_usd === 'number' ? row.price_usd : 50,
    message: String(row.message || ''),
    createdAt: formatDateLabel(row.created_at),
  };
}

function rowToChristmasDish(row: Record<string, unknown>) {
  return {
    id: String(row.id || ''),
    name: String(row.name || 'Untitled Dish'),
    category: String(row.category || 'christmas-specials'),
    foodType: row.food_type === 'non-veg' ? 'non-veg' : 'veg',
    priceInrPerGuest:
      typeof row.price_inr_per_guest === 'number' ? row.price_inr_per_guest : 99,
    portion: String(row.portion || '1 serving'),
    description: String(row.description || ''),
    image: typeof row.image === 'string' && row.image.trim() ? row.image.trim() : undefined,
    popular: Boolean(row.popular),
    presets: Array.isArray(row.presets) ? row.presets : undefined,
    active: row.active !== false,
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : undefined,
    isCloudSaved: true,
  };
}

function rowToStoreClaim(row: Record<string, unknown>) {
  return {
    id: String(row.claim_id || ''),
    vendorId: String(row.vendor_id || ''),
    vendorSlug: String(row.vendor_slug || ''),
    vendorName: String(row.vendor_name || 'Storefront'),
    phoneLast4: String(row.phone_last4 || '0000'),
    status:
      row.status === 'claimed' || row.status === 'revoked' ? row.status : 'pending',
    createdBy: String(row.created_by || ''),
    claimedBy: typeof row.claimed_by === 'string' ? row.claimed_by : undefined,
    createdAt: formatDateLabel(row.created_at),
    updatedAt: formatDateLabel(row.updated_at),
  };
}

function rowToAdminTransfer(row: Record<string, unknown>) {
  return {
    vendorId: String(row.vendor_id || ''),
    vendorName: String(row.vendor_name || 'Storefront'),
    vendorSlug: String(row.vendor_slug || ''),
    targetPhone: String(row.target_phone || ''),
    passcode: String(row.passcode || ''),
    claimId: String(row.claim_id || ''),
    status:
      row.status === 'claimed' || row.status === 'revoked' ? row.status : 'pending',
    createdBy: String(row.created_by || ''),
    createdAt: formatDateLabel(row.created_at),
    updatedAt: formatDateLabel(row.updated_at),
  };
}

function handleApiError(res: Response, err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  const status = message.includes('not configured on the server') ? 503 : 500;
  console.error('[Supabase API Error]:', err);
  return res.status(status).json({ error: message || fallback });
}

export function createSupabaseApiRouter(): express.Router {
  const router = express.Router();

  // --- Health / config check ---
  router.get('/health', (_req, res) => {
    const configured = Boolean(
      process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    );
    res.json({ ok: configured });
  });

  // --- VENDORS ---
  router.get('/vendors', async (_req, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(250);
      if (error) throw new Error(error.message);
      res.json({ vendors: (data || []).map((r) => rowToVendor(r as Record<string, unknown>)) });
    } catch (err) {
      handleApiError(res, err, 'Failed to load vendors.');
    }
  });

  router.get('/vendors/mine', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const query = supabase.from('vendors').select('*');
      const scoped = isRootAdmin(req.user)
        ? query.order('updated_at', { ascending: false }).limit(500)
        : query.eq('owner_id', req.user!.uid).order('updated_at', { ascending: false });
      const { data, error } = await scoped;
      if (error) throw new Error(error.message);
      res.json({ vendors: (data || []).map((r) => rowToVendor(r as Record<string, unknown>)) });
    } catch (err) {
      handleApiError(res, err, 'Failed to load your storefronts.');
    }
  });

  router.get('/vendors/admin', requireAdmin, async (_req, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      res.json({ vendors: (data || []).map((r) => rowToVendor(r as Record<string, unknown>)) });
    } catch (err) {
      handleApiError(res, err, 'Failed to load all storefronts.');
    }
  });

  router.post('/vendors', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const admin = isRootAdmin(user);
      const body = (req.body || {}) as Record<string, unknown>;
      const vendor = (body.vendor && typeof body.vendor === 'object'
        ? body.vendor
        : body) as Record<string, unknown>;
      const requestedStatus =
        body.initialStatus === 'pending_review' ? 'pending_review' : 'active';
      const resolvedStatus = admin ? 'active' : requestedStatus;
      let vendorId = sanitizeId(
        vendor.id || `${sanitizeSlug(vendor.slug || vendor.name)}-${Date.now().toString().slice(-4)}`,
        'vendor'
      );
      // Prevent overwriting an existing storefront (ownership protection)
      const { data: existingIdRow } = await supabase
        .from('vendors')
        .select('id')
        .eq('id', vendorId)
        .maybeSingle();
      if (existingIdRow) {
        vendorId = sanitizeId(`${vendorId.slice(0, 96)}-${crypto.randomBytes(3).toString('hex')}`, 'vendor');
      }

      const slug = await ensureUniqueVendorSlug(supabase, vendor.slug || vendor.name);

      const rawImage =
        typeof vendor.image === 'string' && vendor.image.trim() !== '/src/assets/images/cat-bakers.png'
          ? vendor.image
          : DEFAULT_FALLBACK_IMAGE;
      const image =
        (await uploadDataUrlIfNeeded(supabase, rawImage, `vendors/${vendorId}/cover`)) ||
        DEFAULT_FALLBACK_IMAGE;
      const logo = vendor.logo
        ? await uploadDataUrlIfNeeded(supabase, vendor.logo, `vendors/${vendorId}/logo`)
        : null;
      const gallery = Array.isArray(vendor.gallery)
        ? (
            await Promise.all(
              vendor.gallery
                .slice(0, 6)
                .map((g) => uploadDataUrlIfNeeded(supabase, g, `vendors/${vendorId}/gallery`))
            )
          ).filter(Boolean)
        : [];
      const products = await normalizeProductsForStorage(supabase, vendorId, vendor.products);

      const nowIso = new Date().toISOString();
      const row = {
        id: vendorId,
        owner_id: user.uid,
        slug,
        name: clampStr(vendor.name, 2, 100, 'My Vendor Studio'),
        marketplace: vendor.marketplace === 'party' ? 'party' : 'food',
        category: clampStr(vendor.category, 2, 80, 'Bakers & Cakes'),
        country: clampStr(vendor.country, 2, 60, 'India'),
        state: clampStr(vendor.state, 1, 80, 'Telangana'),
        city: clampStr(vendor.city, 2, 80, 'Hyderabad'),
        area: clampStr(vendor.area || vendor.city, 1, 100, String(vendor.city || 'City Center')),
        lat: Math.max(-90, Math.min(90, Number(vendor.lat) || 17.385)),
        lng: Math.max(-180, Math.min(180, Number(vendor.lng) || 78.4867)),
        whatsapp_number: sanitizeDigits(vendor.whatsappNumber),
        plan_tier:
          vendor.planTier === 'pro' || vendor.planTier === 'business' ? vendor.planTier : 'free',
        monthly_auto_pay: Boolean(vendor.monthlyAutoPay),
        price_tier:
          vendor.priceTier === '$' ||
          vendor.priceTier === '$$' ||
          vendor.priceTier === '$$$' ||
          vendor.priceTier === '$$$$'
            ? vendor.priceTier
            : '$$',
        starting_price_usd: Math.max(0, Math.min(100000, Number(vendor.startingPriceUsd) || 0)),
        rating: 5.0,
        review_count: 0,
        response_time: clampStr(
          vendor.responseTime || 'Replies within 15 mins on WhatsApp',
          2,
          80,
          'Replies within 15 mins on WhatsApp'
        ),
        verified: admin ? Boolean(vendor.verified) : false,
        status: resolvedStatus,
        tagline: clampStr(vendor.tagline, 1, 200, 'Local event specialist'),
        description: clampStr(
          vendor.description || vendor.tagline,
          1,
          1500,
          'Local event specialist.'
        ),
        promo_banner:
          typeof vendor.promoBanner === 'string' && vendor.promoBanner.trim()
            ? vendor.promoBanner.trim().slice(0, 140)
            : null,
        christmas_special: Boolean(vendor.christmasSpecial),
        christmas_offer:
          typeof vendor.christmasOffer === 'string' && vendor.christmasOffer.trim()
            ? vendor.christmasOffer.trim().slice(0, 160)
            : null,
        service_areas: Array.isArray(vendor.serviceAreas)
          ? vendor.serviceAreas.map((s) => String(s).trim().slice(0, 100)).filter(Boolean).slice(0, 10)
          : [String(vendor.city || 'Hyderabad')],
        all_states_coverage: admin ? Boolean(vendor.allStatesCoverage) : false,
        service_states:
          admin && Array.isArray(vendor.serviceStates)
            ? vendor.serviceStates.map((s) => String(s).trim().slice(0, 80)).filter(Boolean).slice(0, 40)
            : [],
        specialties: Array.isArray(vendor.specialties)
          ? vendor.specialties.map((s) => String(s).trim().slice(0, 100)).filter(Boolean).slice(0, 10)
          : [String(vendor.category || 'Bakers & Cakes')],
        image,
        logo,
        gallery,
        products,
        custom_builder_enabled: Boolean(vendor.customBuilderEnabled),
        custom_builder_mode:
          vendor.customBuilderMode === 'snackbox' ||
          vendor.customBuilderMode === 'mealbox' ||
          vendor.customBuilderMode === 'catering'
            ? vendor.customBuilderMode
            : null,
        custom_builder_min_qty:
          vendor.customBuilderMinQty !== undefined
            ? Math.max(1, Math.min(5000, Math.round(Number(vendor.customBuilderMinQty) || 10)))
            : null,
        custom_builder_packaging_usd:
          vendor.customBuilderPackagingUsd !== undefined
            ? Math.max(0, Math.min(500, Number(vendor.customBuilderPackagingUsd) || 0))
            : null,
        bio_handle: sanitizeBioHandle(vendor.bioHandle),
        bio_theme:
          vendor.bioTheme === 'saffron' ||
          vendor.bioTheme === 'midnight' ||
          vendor.bioTheme === 'party' ||
          vendor.bioTheme === 'cream'
            ? vendor.bioTheme
            : null,
        instagram_handle:
          typeof vendor.instagramHandle === 'string' && vendor.instagramHandle.trim()
            ? vendor.instagramHandle.trim().slice(0, 80)
            : null,
        claim_status: 'none',
        created_at: nowIso,
        updated_at: nowIso,
      };

      const { data, error } = await supabase.from('vendors').insert(row).select('*').single();
      if (error) throw new Error(error.message);
      res.status(201).json({ vendor: rowToVendor(data as Record<string, unknown>) });
    } catch (err) {
      handleApiError(res, err, 'Failed to create storefront.');
    }
  });

  router.patch('/vendors/:vendorId', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const admin = isRootAdmin(user);
      const vendorId = sanitizeId(req.params.vendorId);

      const { data: existing, error: fetchErr } = await supabase
        .from('vendors')
        .select('id, owner_id, status')
        .eq('id', vendorId)
        .maybeSingle();

      if (fetchErr) throw new Error(fetchErr.message);
      if (!existing) {
        return res.status(404).json({ error: 'Storefront not found.' });
      }
      if (!admin && existing.owner_id !== user.uid) {
        return res.status(403).json({ error: 'You do not have permission to edit this storefront.' });
      }

      const updates = (req.body || {}) as Record<string, unknown>;
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) patch.name = clampStr(updates.name, 2, 100, 'Vendor');
      if (updates.slug !== undefined) {
        patch.slug = await ensureUniqueVendorSlug(supabase, updates.slug, vendorId);
      }
      if (updates.tagline !== undefined) patch.tagline = clampStr(updates.tagline, 1, 200, 'Local vendor');
      if (updates.description !== undefined)
        patch.description = clampStr(updates.description, 1, 1500, 'Local vendor');
      if (updates.promoBanner !== undefined)
        patch.promo_banner = String(updates.promoBanner || '').trim().slice(0, 140) || null;
      if (updates.christmasSpecial !== undefined)
        patch.christmas_special = Boolean(updates.christmasSpecial);
      if (updates.christmasOffer !== undefined)
        patch.christmas_offer = String(updates.christmasOffer || '').trim().slice(0, 160) || null;
      if (updates.bioHandle !== undefined) {
        const cleanHandle = String(updates.bioHandle || '')
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 50);
        patch.bio_handle = cleanHandle.length >= 2 ? cleanHandle : null;
      }
      if (
        updates.bioTheme === 'saffron' ||
        updates.bioTheme === 'midnight' ||
        updates.bioTheme === 'party' ||
        updates.bioTheme === 'cream'
      ) {
        patch.bio_theme = updates.bioTheme;
      }
      if (updates.instagramHandle !== undefined)
        patch.instagram_handle = String(updates.instagramHandle || '').trim().slice(0, 80) || null;
      if (Array.isArray(updates.customLinks)) {
        patch.custom_links = updates.customLinks
          .slice(0, 8)
          .map((item, idx) => {
            const l = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
            const safeUrl = sanitizeSafeHttpUrl(l.url);
            const title = typeof l.title === 'string' ? l.title.trim().slice(0, 60) : '';
            if (!safeUrl || !title) return null;
            return {
              id: sanitizeId(l.id || `link-${idx + 1}`, 'link'),
              title,
              url: safeUrl.slice(0, 300),
              ...(typeof l.badge === 'string' && l.badge.trim()
                ? { badge: l.badge.trim().slice(0, 24) }
                : {}),
            };
          })
          .filter(Boolean);
      }
      if (updates.whatsappNumber !== undefined)
        patch.whatsapp_number = sanitizeDigits(updates.whatsappNumber);
      if (updates.planTier === 'free' || updates.planTier === 'pro' || updates.planTier === 'business') {
        patch.plan_tier = updates.planTier;
      }
      if (updates.monthlyAutoPay !== undefined)
        patch.monthly_auto_pay = Boolean(updates.monthlyAutoPay);
      if (updates.startingPriceUsd !== undefined) {
        patch.starting_price_usd = Math.max(
          0,
          Math.min(100000, Number(updates.startingPriceUsd) || 0)
        );
      }
      if (updates.status === 'active' || updates.status === 'paused' || updates.status === 'pending_review') {
        // Non-admin owners cannot self-approve pending_review storefronts
        if (admin || (existing.status !== 'pending_review' && updates.status !== 'pending_review')) {
          patch.status = updates.status;
        }
      }
      if (updates.lat !== undefined)
        patch.lat = Math.max(-90, Math.min(90, Number(updates.lat) || 0));
      if (updates.lng !== undefined)
        patch.lng = Math.max(-180, Math.min(180, Number(updates.lng) || 0));

      if (updates.image !== undefined) {
        const rawPatchImage =
          typeof updates.image === 'string' &&
          updates.image.trim() !== '/src/assets/images/cat-bakers.png'
            ? updates.image
            : DEFAULT_FALLBACK_IMAGE;
        patch.image =
          (await uploadDataUrlIfNeeded(supabase, rawPatchImage, `vendors/${vendorId}/cover`)) ||
          DEFAULT_FALLBACK_IMAGE;
      }
      if (updates.logo !== undefined) {
        patch.logo = updates.logo
          ? await uploadDataUrlIfNeeded(supabase, updates.logo, `vendors/${vendorId}/logo`)
          : null;
      }
      if (Array.isArray(updates.gallery)) {
        patch.gallery = (
          await Promise.all(
            updates.gallery
              .slice(0, 6)
              .map((g) => uploadDataUrlIfNeeded(supabase, g, `vendors/${vendorId}/gallery`))
          )
        ).filter(Boolean);
      }
      if (Array.isArray(updates.products)) {
        patch.products = await normalizeProductsForStorage(supabase, vendorId, updates.products);
      }
      if (updates.customBuilderEnabled !== undefined) {
        patch.custom_builder_enabled = Boolean(updates.customBuilderEnabled);
      }
      if (
        updates.customBuilderMode === 'snackbox' ||
        updates.customBuilderMode === 'mealbox' ||
        updates.customBuilderMode === 'catering'
      ) {
        patch.custom_builder_mode = updates.customBuilderMode;
      }
      if (updates.customBuilderMinQty !== undefined) {
        patch.custom_builder_min_qty = Math.max(
          1,
          Math.min(5000, Math.round(Number(updates.customBuilderMinQty) || 10))
        );
      }
      if (updates.customBuilderPackagingUsd !== undefined) {
        patch.custom_builder_packaging_usd = Math.max(
          0,
          Math.min(500, Number(updates.customBuilderPackagingUsd) || 0)
        );
      }

      // Admin-only fields
      if (admin) {
        if (updates.verified !== undefined) patch.verified = Boolean(updates.verified);
        if (updates.seoTitle !== undefined)
          patch.seo_title = String(updates.seoTitle || '').trim().slice(0, 120) || null;
        if (updates.seoDescription !== undefined)
          patch.seo_description = String(updates.seoDescription || '').trim().slice(0, 240) || null;
        if (updates.seoKeywords !== undefined)
          patch.seo_keywords = String(updates.seoKeywords || '').trim().slice(0, 300) || null;
        if (updates.allStatesCoverage !== undefined)
          patch.all_states_coverage = Boolean(updates.allStatesCoverage);
        if (Array.isArray(updates.serviceStates)) {
          patch.service_states = updates.serviceStates
            .map((s) => String(s).trim().slice(0, 80))
            .filter(Boolean)
            .slice(0, 40);
        }
      }

      const { data, error } = await supabase
        .from('vendors')
        .update(patch)
        .eq('id', vendorId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      res.json({ vendor: rowToVendor(data as Record<string, unknown>) });
    } catch (err) {
      handleApiError(res, err, 'Failed to update storefront.');
    }
  });

  router.delete('/vendors/:vendorId', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const admin = isRootAdmin(user);
      const vendorId = sanitizeId(req.params.vendorId);

      const { data: existing } = await supabase
        .from('vendors')
        .select('owner_id')
        .eq('id', vendorId)
        .maybeSingle();

      if (!existing) {
        return res.status(404).json({ error: 'Storefront not found.' });
      }
      if (!admin && existing.owner_id !== user.uid) {
        return res.status(403).json({ error: 'Not allowed to delete this storefront.' });
      }
      const { error } = await supabase.from('vendors').delete().eq('id', vendorId);
      if (error) throw new Error(error.message);
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to delete storefront.');
    }
  });

  // --- USER PROFILES & SAVED VENDORS ---
  router.post('/users/ensure', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const fallbackSaved = Array.isArray(req.body?.fallbackSavedIds)
        ? req.body.fallbackSavedIds.slice(0, 50).map((s: unknown) => String(s).slice(0, 100))
        : [];

      const { data: existing, error: getErr } = await supabase
        .from('user_profiles')
        .select('saved_vendor_ids')
        .eq('uid', user.uid)
        .maybeSingle();
      if (getErr) throw new Error(getErr.message);

      if (existing) {
        return res.json({
          savedVendorIds: Array.isArray(existing.saved_vendor_ids)
            ? existing.saved_vendor_ids
            : fallbackSaved,
        });
      }

      const nowIso = new Date().toISOString();
      const { error: insErr } = await supabase.from('user_profiles').insert({
        uid: user.uid,
        display_name: clampStr(
          req.body?.displayName || user.name || user.email?.split('@')[0] || 'Member',
          1,
          100,
          'Member'
        ),
        email: clampStr(user.email || 'user@example.com', 3, 160, 'user@example.com'),
        saved_vendor_ids: fallbackSaved,
        created_at: nowIso,
        updated_at: nowIso,
      });
      if (insErr) throw new Error(insErr.message);
      res.json({ savedVendorIds: fallbackSaved });
    } catch (err) {
      handleApiError(res, err, 'Failed to sync user profile.');
    }
  });

  router.put('/users/saved', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const saved = Array.isArray(req.body?.savedVendorIds)
        ? req.body.savedVendorIds.slice(0, 50).map((s: unknown) => String(s).slice(0, 100))
        : [];
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            uid: user.uid,
            display_name: clampStr(user.name || user.email?.split('@')[0] || 'Member', 1, 100, 'Member'),
            email: clampStr(user.email || 'user@example.com', 3, 160, 'user@example.com'),
            saved_vendor_ids: saved,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'uid' }
        );
      if (error) throw new Error(error.message);
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to save shortlist.');
    }
  });

  // --- BOOKINGS ---
  router.get('/bookings/mine', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', req.user!.uid)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      res.json({ bookings: (data || []).map((r) => rowToBooking(r as Record<string, unknown>)) });
    } catch (err) {
      handleApiError(res, err, 'Failed to load your bookings.');
    }
  });

  router.get('/bookings/leads', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('vendor_owner_id', req.user!.uid)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      res.json({ bookings: (data || []).map((r) => rowToBooking(r as Record<string, unknown>)) });
    } catch (err) {
      handleApiError(res, err, 'Failed to load vendor leads.');
    }
  });

  router.get('/bookings/admin', requireAdmin, async (_req, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);
      res.json({ bookings: (data || []).map((r) => rowToBooking(r as Record<string, unknown>)) });
    } catch (err) {
      handleApiError(res, err, 'Failed to load all bookings.');
    }
  });

  router.post('/bookings', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const b = (req.body?.booking || req.body || {}) as Record<string, unknown>;
      const bookingId = sanitizeId(b.id || `bk-${Date.now()}`, 'bk');
      const nowIso = new Date().toISOString();
      const row = {
        id: bookingId,
        reference: sanitizeId(b.reference || bookingId, 'ref'),
        customer_id: user.uid,
        vendor_id: sanitizeId(b.vendorId || 'vendor'),
        vendor_owner_id: sanitizeId(req.body?.vendorOwnerId || b.vendorOwnerId || 'platform'),
        vendor_name: clampStr(b.vendorName, 1, 120, 'Vendor'),
        vendor_city: clampStr(b.vendorCity, 1, 120, 'City'),
        vendor_category: clampStr(b.vendorCategory, 1, 80, 'Events'),
        package_name: clampStr(b.packageName, 1, 240, 'Event Package'),
        estimated_usd: Math.max(0, Math.min(500000, Number(b.estimatedUsd) || 0)),
        event_date: clampStr(b.eventDate, 6, 30, '2026-12-20'),
        guests: Math.max(1, Math.min(100000, Math.round(Number(b.guests) || 50))),
        customer_name: clampStr(b.customerName, 1, 100, 'Customer'),
        customer_email: clampStr(b.customerEmail, 3, 160, user.email || 'customer@example.com'),
        notes: typeof b.notes === 'string' ? b.notes.trim().slice(0, 1000) : '',
        status: 'Confirmed Enquiry',
        created_at: nowIso,
        updated_at: nowIso,
      };
      const { data, error } = await supabase.from('bookings').insert(row).select('*').single();
      if (error) throw new Error(error.message);
      res.status(201).json({ booking: rowToBooking(data as Record<string, unknown>) });
    } catch (err) {
      handleApiError(res, err, 'Failed to create booking enquiry.');
    }
  });

  router.patch('/bookings/:bookingId', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const admin = isRootAdmin(user);
      const bookingId = sanitizeId(req.params.bookingId);
      const nextStatus = req.body?.status;
      if (
        nextStatus !== 'Confirmed Enquiry' &&
        nextStatus !== 'Completed' &&
        nextStatus !== 'Cancelled'
      ) {
        return res.status(400).json({ error: 'Invalid booking status.' });
      }

      const { data: existing } = await supabase
        .from('bookings')
        .select('customer_id, vendor_owner_id, status')
        .eq('id', bookingId)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Booking not found.' });

      const isCustomer = existing.customer_id === user.uid;
      const isVendorOwner = existing.vendor_owner_id === user.uid;
      if (!admin && !isCustomer && !isVendorOwner) {
        return res.status(403).json({ error: 'Permission denied.' });
      }
      if (!admin && (existing.status === 'Completed' || existing.status === 'Cancelled')) {
        return res.status(400).json({ error: 'Booking is already finalized.' });
      }
      if (!admin && isCustomer && !isVendorOwner && nextStatus !== 'Cancelled') {
        return res.status(403).json({ error: 'Customers can only cancel an enquiry.' });
      }

      const { error } = await supabase
        .from('bookings')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', bookingId);
      if (error) throw new Error(error.message);
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to update booking status.');
    }
  });

  router.delete('/bookings/:bookingId', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const admin = isRootAdmin(user);
      const bookingId = sanitizeId(req.params.bookingId);

      const { data: existing } = await supabase
        .from('bookings')
        .select('customer_id')
        .eq('id', bookingId)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Booking not found.' });
      if (!admin && existing.customer_id !== user.uid) {
        return res.status(403).json({ error: 'Permission denied.' });
      }
      const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
      if (error) throw new Error(error.message);
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to delete booking.');
    }
  });

  // --- REVIEWS ---
  router.get('/reviews', async (req, res) => {
    try {
      const supabase = getSupabase();
      const vendorId = sanitizeId(req.query.vendorId);
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      res.json({ reviews: (data || []).map((r) => rowToReview(r as Record<string, unknown>)) });
    } catch (err) {
      handleApiError(res, err, 'Failed to load reviews.');
    }
  });

  router.get('/reviews/admin', requireAdmin, async (_req, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(150);
      if (error) throw new Error(error.message);
      res.json({
        reviews: (data || []).map((r) => rowToAdminReview(r as Record<string, unknown>)),
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to load all reviews.');
    }
  });

  router.post('/reviews', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const vendorId = sanitizeId(req.body?.vendorId);
      const reviewId = sanitizeId(`rev-${vendorId.slice(0, 24)}-${Date.now()}`, 'rev');
      const row = {
        id: reviewId,
        vendor_id: vendorId,
        author_id: user.uid,
        author_name: clampStr(
          req.body?.authorName || user.name || user.email?.split('@')[0] || 'Customer',
          1,
          80,
          'Customer'
        ),
        event_type: clampStr(req.body?.eventType, 2, 60, 'Event Booking'),
        rating: Math.min(5, Math.max(1, Math.round(Number(req.body?.rating) || 5))),
        comment: clampStr(req.body?.comment, 5, 600, 'Wonderful experience and service.'),
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('reviews').insert(row);
      if (error) throw new Error(error.message);
      res.status(201).json({ ok: true, id: reviewId });
    } catch (err) {
      handleApiError(res, err, 'Failed to submit review.');
    }
  });

  router.delete('/reviews/:reviewId', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const admin = isRootAdmin(user);
      const reviewId = sanitizeId(req.params.reviewId);
      const { data: existing } = await supabase
        .from('reviews')
        .select('author_id')
        .eq('id', reviewId)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Review not found.' });
      if (!admin && existing.author_id !== user.uid) {
        return res.status(403).json({ error: 'Permission denied.' });
      }
      const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
      if (error) throw new Error(error.message);
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to delete review.');
    }
  });

  // --- EVENT REQUESTS & QUOTES ---
  router.get('/event-requests/open', requireAuth, async (_req, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('event_requests')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      res.json({
        requests: (data || []).map((r) => rowToEventRequest(r as Record<string, unknown>)),
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to load open event requests.');
    }
  });

  router.get('/event-requests/mine', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('event_requests')
        .select('*')
        .eq('customer_id', req.user!.uid)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      res.json({
        requests: (data || []).map((r) => rowToEventRequest(r as Record<string, unknown>)),
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to load your event requests.');
    }
  });

  router.get('/event-requests/admin', requireAdmin, async (_req, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('event_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      res.json({
        requests: (data || []).map((r) => rowToEventRequest(r as Record<string, unknown>)),
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to load all event requests.');
    }
  });

  router.post('/event-requests', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const input = (req.body || {}) as Record<string, unknown>;
      const requestId = sanitizeId(`req-${Date.now()}`, 'req');
      const categories = Array.isArray(input.categories)
        ? input.categories.map((c) => String(c).trim().slice(0, 80)).filter(Boolean).slice(0, 4)
        : ['Bakers & Cakes'];
      const nowIso = new Date().toISOString();
      const row = {
        id: requestId,
        customer_id: user.uid,
        customer_name: clampStr(
          (String(input.customerName || user.name || user.email?.split('@')[0] || 'Host')).split(' ')[0],
          1,
          80,
          'Host'
        ),
        occasion: clampStr(input.occasion, 2, 60, 'Celebration'),
        categories: categories.length > 0 ? categories : ['Bakers & Cakes'],
        country: clampStr(input.country, 2, 60, 'India'),
        state: clampStr(input.state, 2, 80, 'Telangana'),
        city: clampStr(input.city, 2, 80, 'Hyderabad'),
        event_date: clampStr(input.eventDate, 6, 30, '2026-12-20'),
        guests: Math.max(1, Math.min(100000, Math.round(Number(input.guests) || 50))),
        budget_usd: Math.max(0, Math.min(500000, Number(input.budgetUsd) || 0)),
        details: clampStr(input.details, 5, 800, 'Looking for quotes from local vendors.'),
        status: 'open',
        created_at: nowIso,
        updated_at: nowIso,
      };
      const { error } = await supabase.from('event_requests').insert(row);
      if (error) throw new Error(error.message);
      res.status(201).json({ id: requestId });
    } catch (err) {
      handleApiError(res, err, 'Failed to post event request.');
    }
  });

  router.patch('/event-requests/:requestId', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const admin = isRootAdmin(user);
      const requestId = sanitizeId(req.params.requestId);
      const status = req.body?.status === 'open' ? 'open' : 'closed';

      const { data: existing } = await supabase
        .from('event_requests')
        .select('customer_id, status')
        .eq('id', requestId)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Event request not found.' });
      if (!admin && existing.customer_id !== user.uid) {
        return res.status(403).json({ error: 'Permission denied.' });
      }
      if (!admin && status !== 'closed') {
        return res.status(403).json({ error: 'Only admins can reopen closed requests.' });
      }
      const { error } = await supabase
        .from('event_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw new Error(error.message);
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to update event request.');
    }
  });

  router.delete('/event-requests/:requestId', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const admin = isRootAdmin(user);
      const requestId = sanitizeId(req.params.requestId);

      const { data: existing } = await supabase
        .from('event_requests')
        .select('customer_id')
        .eq('id', requestId)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Event request not found.' });
      if (!admin && existing.customer_id !== user.uid) {
        return res.status(403).json({ error: 'Permission denied.' });
      }
      const { error } = await supabase.from('event_requests').delete().eq('id', requestId);
      if (error) throw new Error(error.message);
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to delete event request.');
    }
  });

  router.get('/event-requests/:requestId/quotes', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const admin = isRootAdmin(user);
      const requestId = sanitizeId(req.params.requestId);

      let query = supabase
        .from('event_quotes')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (!admin) {
        query = query.or(`request_customer_id.eq.${user.uid},vendor_owner_id.eq.${user.uid}`);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      res.json({ quotes: (data || []).map((r) => rowToEventQuote(r as Record<string, unknown>)) });
    } catch (err) {
      handleApiError(res, err, 'Failed to load quotes.');
    }
  });

  router.post('/event-requests/:requestId/quotes', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const requestId = sanitizeId(req.params.requestId);

      const { data: parentReq } = await supabase
        .from('event_requests')
        .select('id, customer_id, status')
        .eq('id', requestId)
        .maybeSingle();
      if (!parentReq || parentReq.status !== 'open') {
        return res.status(400).json({ error: 'This event request is no longer open.' });
      }

      const vendor = (req.body?.vendor || {}) as Record<string, unknown>;
      const vendorId = sanitizeId(vendor.id || 'vendor');
      const quoteId = sanitizeId(`q-${vendorId.slice(0, 24)}-${Date.now()}`, 'q');
      const row = {
        id: quoteId,
        request_id: requestId,
        request_customer_id: String(parentReq.customer_id),
        vendor_owner_id: user.uid,
        vendor_id: vendorId,
        vendor_name: clampStr(vendor.name, 2, 100, 'Vendor'),
        vendor_slug: sanitizeSlug(vendor.slug || vendor.name),
        vendor_whatsapp: sanitizeDigits(vendor.whatsappNumber),
        price_usd: Math.max(1, Math.min(500000, Number(req.body?.priceUsd) || 1)),
        message: clampStr(req.body?.message, 5, 600, 'We would love to cater/decorate your event!'),
        created_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('event_quotes').insert(row);
      if (error) throw new Error(error.message);
      res.status(201).json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to send quote.');
    }
  });

  // --- VENDOR METRICS ---
  router.get('/metrics/admin', requireAdmin, async (_req, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('vendor_metrics').select('*').limit(500);
      if (error) throw new Error(error.message);
      res.json({
        metrics: (data || []).map((d) => ({
          vendorId: String(d.vendor_id),
          views: Number(d.views) || 0,
          whatsappClicks: Number(d.whatsapp_clicks) || 0,
          shares: Number(d.shares) || 0,
        })),
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to load metrics.');
    }
  });

  router.get('/metrics/:vendorId', async (req, res) => {
    try {
      const supabase = getSupabase();
      const vendorId = sanitizeId(req.params.vendorId);
      const { data } = await supabase
        .from('vendor_metrics')
        .select('*')
        .eq('vendor_id', vendorId)
        .maybeSingle();
      res.json({
        metric: {
          vendorId,
          views: Number(data?.views) || 0,
          whatsappClicks: Number(data?.whatsapp_clicks) || 0,
          shares: Number(data?.shares) || 0,
        },
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to load vendor metric.');
    }
  });

  router.post('/metrics/:vendorId/increment', async (req, res) => {
    try {
      const supabase = getSupabase();
      const vendorId = sanitizeId(req.params.vendorId);
      const field = req.body?.field;
      if (field !== 'views' && field !== 'whatsappClicks' && field !== 'shares') {
        return res.status(400).json({ error: 'Invalid metric field.' });
      }
      const { data: existing } = await supabase
        .from('vendor_metrics')
        .select('views, whatsapp_clicks, shares')
        .eq('vendor_id', vendorId)
        .maybeSingle();

      const nextViews = (Number(existing?.views) || 0) + (field === 'views' ? 1 : 0);
      const nextWa =
        (Number(existing?.whatsapp_clicks) || 0) + (field === 'whatsappClicks' ? 1 : 0);
      const nextShares = (Number(existing?.shares) || 0) + (field === 'shares' ? 1 : 0);

      await supabase.from('vendor_metrics').upsert(
        {
          vendor_id: vendorId,
          views: nextViews,
          whatsapp_clicks: nextWa,
          shares: nextShares,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'vendor_id' }
      );
      res.json({ ok: true });
    } catch {
      res.json({ ok: false });
    }
  });

  // --- SITE SETTINGS ---
  router.get('/site-settings', async (_req, res) => {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();
      if (!data) return res.json({ settings: null });
      res.json({
        settings: {
          requireVendorApproval: Boolean(data.require_vendor_approval),
          snowfallEnabled: Boolean(data.snowfall_enabled),
          promoEnabled: Boolean(data.promo_enabled),
          promoText: String(data.promo_text || ''),
          promoCtaLabel: String(data.promo_cta_label || ''),
          siteTitle: String(data.site_title || ''),
          siteDescription: String(data.site_description || ''),
          siteKeywords: String(data.site_keywords || ''),
          updatedBy: typeof data.updated_by === 'string' ? data.updated_by : undefined,
        },
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to load site settings.');
    }
  });

  router.put('/site-settings', requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const s = (req.body || {}) as Record<string, unknown>;
      const row = {
        id: 'global',
        require_vendor_approval: Boolean(s.requireVendorApproval),
        snowfall_enabled: Boolean(s.snowfallEnabled),
        promo_enabled: Boolean(s.promoEnabled),
        promo_text: clampStr(s.promoText, 0, 200, ''),
        promo_cta_label: clampStr(s.promoCtaLabel, 0, 60, ''),
        site_title: clampStr(s.siteTitle, 5, 120, 'FindMyBites x PimpMyParty'),
        site_description: clampStr(s.siteDescription, 10, 240, 'Local food and event marketplace'),
        site_keywords: clampStr(s.siteKeywords, 0, 400, ''),
        updated_by: req.user!.uid,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('site_settings')
        .upsert(row, { onConflict: 'id' });
      if (error) throw new Error(error.message);
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to save site settings.');
    }
  });

  // --- CHRISTMAS DISHES ---
  router.get('/christmas-dishes', async (_req, res) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('christmas_dishes')
        .select('*')
        .order('sort_order', { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message);
      res.json({
        dishes: (data || []).map((r) => rowToChristmasDish(r as Record<string, unknown>)),
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to load Christmas menu dishes.');
    }
  });

  router.put('/christmas-dishes/:dishId', requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const dishId = sanitizeId(req.params.dishId, 'xmas-dish');
      const d = (req.body || {}) as Record<string, unknown>;
      const imageUrl = d.image
        ? await uploadDataUrlIfNeeded(supabase, d.image, `christmas/${dishId}`)
        : null;
      const validPresets = new Set(['christmas-veg', 'christmas-non-veg', 'cocktail-snacks']);
      const presets = Array.isArray(d.presets)
        ? Array.from(
            new Set(
              d.presets.filter(
                (p): p is string => typeof p === 'string' && validPresets.has(p)
              )
            )
          ).slice(0, 3)
        : [];
      const nowIso = new Date().toISOString();
      const row = {
        id: dishId,
        name: clampStr(d.name, 2, 120, 'Christmas Special Dish'),
        category: clampStr(d.category, 2, 40, 'christmas-specials'),
        food_type: d.foodType === 'non-veg' ? 'non-veg' : 'veg',
        price_inr_per_guest: Math.max(1, Math.min(50000, Math.round(Number(d.priceInrPerGuest) || 99))),
        portion: clampStr(d.portion, 1, 60, '1 serving'),
        description: typeof d.description === 'string' ? d.description.trim().slice(0, 400) : '',
        image: imageUrl || null,
        popular: Boolean(d.popular),
        presets,
        active: d.active !== false,
        sort_order:
          typeof d.sortOrder === 'number' && Number.isFinite(d.sortOrder)
            ? Math.max(0, Math.min(10000, Math.round(d.sortOrder)))
            : 50,
        updated_by: req.user!.uid,
        updated_at: nowIso,
      };
      const { data, error } = await supabase
        .from('christmas_dishes')
        .upsert(row, { onConflict: 'id' })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      res.json({ dish: rowToChristmasDish(data as Record<string, unknown>) });
    } catch (err) {
      handleApiError(res, err, 'Failed to save Christmas dish.');
    }
  });

  router.delete('/christmas-dishes/:dishId', requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const dishId = sanitizeId(req.params.dishId);
      const { error } = await supabase.from('christmas_dishes').delete().eq('id', dishId);
      if (error) throw new Error(error.message);
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to delete Christmas dish.');
    }
  });

  // --- CONCIERGE STORE CLAIMS & TRANSFERS ---
  router.get('/concierge/admin', requireAdmin, async (_req, res) => {
    try {
      const supabase = getSupabase();
      const [transfersRes, claimsRes] = await Promise.all([
        supabase.from('admin_transfers').select('*').order('created_at', { ascending: false }),
        supabase.from('store_claims').select('*').order('created_at', { ascending: false }),
      ]);
      if (transfersRes.error) throw new Error(transfersRes.error.message);
      if (claimsRes.error) throw new Error(claimsRes.error.message);
      res.json({
        transfers: (transfersRes.data || []).map((r) =>
          rowToAdminTransfer(r as Record<string, unknown>)
        ),
        claims: (claimsRes.data || []).map((r) => rowToStoreClaim(r as Record<string, unknown>)),
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to load store transfers.');
    }
  });

  router.post('/concierge/create-store', requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const { vendor, targetPhone, passcode, claimId } = req.body as {
        vendor: Record<string, unknown>;
        targetPhone: string;
        passcode: string;
        claimId: string;
      };
      const cleanPhone = sanitizeDigits(targetPhone);
      const cleanPasscode = String(passcode || '')
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '')
        .slice(0, 24);
      const safeClaimId = String(claimId || '').toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(safeClaimId)) {
        return res.status(400).json({ error: 'Invalid claim token.' });
      }

      let vendorId = sanitizeId(
        vendor.id || `${sanitizeSlug(vendor.slug || vendor.name)}-${Date.now().toString().slice(-4)}`,
        'vendor'
      );
      const { data: existingConciergeId } = await supabase
        .from('vendors')
        .select('id')
        .eq('id', vendorId)
        .maybeSingle();
      if (existingConciergeId) {
        vendorId = sanitizeId(`${vendorId.slice(0, 96)}-${crypto.randomBytes(3).toString('hex')}`, 'vendor');
      }

      const slug = await ensureUniqueVendorSlug(supabase, vendor.slug || vendor.name);
      const name = clampStr(vendor.name, 2, 100, 'Partner Storefront');
      const phoneLast4 = cleanPhone.slice(-4).padStart(4, '0');
      const nowIso = new Date().toISOString();

      const rawConciergeImg =
        typeof vendor.image === 'string' && vendor.image.trim() !== '/src/assets/images/cat-bakers.png'
          ? vendor.image
          : DEFAULT_FALLBACK_IMAGE;
      const image =
        (await uploadDataUrlIfNeeded(supabase, rawConciergeImg, `vendors/${vendorId}/cover`)) ||
        DEFAULT_FALLBACK_IMAGE;
      const logo = vendor.logo
        ? await uploadDataUrlIfNeeded(supabase, vendor.logo, `vendors/${vendorId}/logo`)
        : null;
      const products = await normalizeProductsForStorage(supabase, vendorId, vendor.products);

      const vendorRow = {
        id: vendorId,
        owner_id: user.uid,
        slug,
        name,
        marketplace: vendor.marketplace === 'party' ? 'party' : 'food',
        category: clampStr(vendor.category, 2, 80, 'Bakers & Cakes'),
        country: clampStr(vendor.country, 2, 60, 'India'),
        state: clampStr(vendor.state, 1, 80, 'Telangana'),
        city: clampStr(vendor.city, 2, 80, 'Hyderabad'),
        area: clampStr(vendor.area || vendor.city, 1, 100, String(vendor.city || 'Hyderabad')),
        lat: Math.max(-90, Math.min(90, Number(vendor.lat) || 17.385)),
        lng: Math.max(-180, Math.min(180, Number(vendor.lng) || 78.4867)),
        whatsapp_number: cleanPhone,
        plan_tier:
          vendor.planTier === 'pro' || vendor.planTier === 'business' ? vendor.planTier : 'free',
        monthly_auto_pay: Boolean(vendor.monthlyAutoPay),
        price_tier: typeof vendor.priceTier === 'string' ? vendor.priceTier : '$$',
        starting_price_usd: Math.max(0, Math.min(100000, Number(vendor.startingPriceUsd) || 0)),
        rating: 5.0,
        review_count: 0,
        response_time: clampStr(
          vendor.responseTime || 'Replies within 15 mins on WhatsApp',
          2,
          80,
          'Replies within 15 mins on WhatsApp'
        ),
        verified: Boolean(vendor.verified),
        status: 'active',
        tagline: clampStr(vendor.tagline, 1, 200, 'Artisan cakes & custom local orders'),
        description: clampStr(
          vendor.description || vendor.tagline,
          1,
          1500,
          'Freshly handcrafted local cakes, desserts and custom event orders.'
        ),
        promo_banner:
          typeof vendor.promoBanner === 'string' && vendor.promoBanner.trim()
            ? vendor.promoBanner.trim().slice(0, 140)
            : null,
        christmas_special: Boolean(vendor.christmasSpecial),
        christmas_offer:
          typeof vendor.christmasOffer === 'string' && vendor.christmasOffer.trim()
            ? vendor.christmasOffer.trim().slice(0, 160)
            : null,
        service_areas: Array.isArray(vendor.serviceAreas)
          ? vendor.serviceAreas.map((s) => String(s).trim().slice(0, 100)).filter(Boolean).slice(0, 10)
          : [String(vendor.city || 'Hyderabad')],
        all_states_coverage: Boolean(vendor.allStatesCoverage),
        service_states: Array.isArray(vendor.serviceStates)
          ? vendor.serviceStates.map((s) => String(s).trim().slice(0, 80)).filter(Boolean).slice(0, 40)
          : [],
        specialties: Array.isArray(vendor.specialties)
          ? vendor.specialties.map((s) => String(s).trim().slice(0, 100)).filter(Boolean).slice(0, 10)
          : [String(vendor.category || 'Bakers & Cakes')],
        image,
        logo,
        products,
        custom_builder_enabled: Boolean(vendor.customBuilderEnabled),
        custom_builder_mode:
          vendor.customBuilderMode === 'snackbox' ||
          vendor.customBuilderMode === 'mealbox' ||
          vendor.customBuilderMode === 'catering'
            ? vendor.customBuilderMode
            : null,
        custom_builder_min_qty:
          vendor.customBuilderMinQty !== undefined
            ? Math.max(1, Math.min(5000, Math.round(Number(vendor.customBuilderMinQty) || 10)))
            : null,
        custom_builder_packaging_usd:
          vendor.customBuilderPackagingUsd !== undefined
            ? Math.max(0, Math.min(500, Number(vendor.customBuilderPackagingUsd) || 0))
            : null,
        bio_handle: sanitizeBioHandle(vendor.bioHandle),
        bio_theme:
          vendor.bioTheme === 'saffron' ||
          vendor.bioTheme === 'midnight' ||
          vendor.bioTheme === 'party' ||
          vendor.bioTheme === 'cream'
            ? vendor.bioTheme
            : null,
        instagram_handle:
          typeof vendor.instagramHandle === 'string' && vendor.instagramHandle.trim()
            ? vendor.instagramHandle.trim().slice(0, 80)
            : null,
        claim_status: 'pending',
        created_at: nowIso,
        updated_at: nowIso,
      };

      const { data: savedVendor, error: vErr } = await supabase
        .from('vendors')
        .insert(vendorRow)
        .select('*')
        .single();
      if (vErr) throw new Error(vErr.message);

      const { error: cErr } = await supabase.from('store_claims').upsert(
        {
          claim_id: safeClaimId,
          vendor_id: vendorId,
          vendor_slug: slug,
          vendor_name: name,
          phone_last4: phoneLast4,
          status: 'pending',
          created_by: user.uid,
          created_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'claim_id' }
      );
      if (cErr) throw new Error(cErr.message);

      const transferRow = {
        vendor_id: vendorId,
        vendor_name: name,
        vendor_slug: slug,
        target_phone: cleanPhone,
        passcode: cleanPasscode,
        claim_id: safeClaimId,
        status: 'pending',
        created_by: user.uid,
        created_at: nowIso,
        updated_at: nowIso,
      };
      const { data: savedTransfer, error: tErr } = await supabase
        .from('admin_transfers')
        .upsert(transferRow, { onConflict: 'vendor_id' })
        .select('*')
        .single();
      if (tErr) throw new Error(tErr.message);

      res.status(201).json({
        vendor: rowToVendor(savedVendor as Record<string, unknown>),
        transfer: rowToAdminTransfer(savedTransfer as Record<string, unknown>),
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to create concierge store transfer.');
    }
  });

  router.post('/concierge/issue-transfer', requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const { vendorId, vendorName, vendorSlug, targetPhone, passcode, claimId, previousClaimId } =
        req.body as Record<string, string>;
      const safeVendorId = sanitizeId(vendorId);
      const cleanPhone = sanitizeDigits(targetPhone);
      const cleanPasscode = String(passcode || '')
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '')
        .slice(0, 24);
      const safeClaimId = String(claimId || '').toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(safeClaimId)) {
        return res.status(400).json({ error: 'Invalid claim token.' });
      }
      const nowIso = new Date().toISOString();

      if (previousClaimId && previousClaimId !== safeClaimId && /^[a-f0-9]{64}$/.test(previousClaimId)) {
        await supabase
          .from('store_claims')
          .update({ status: 'revoked', updated_at: nowIso })
          .eq('claim_id', previousClaimId)
          .eq('status', 'pending');
      }

      await supabase
        .from('vendors')
        .update({ whatsapp_number: cleanPhone, claim_status: 'pending', updated_at: nowIso })
        .eq('id', safeVendorId);

      const slug = sanitizeSlug(vendorSlug || vendorName);
      const name = clampStr(vendorName, 2, 100, 'Storefront');
      const phoneLast4 = cleanPhone.slice(-4).padStart(4, '0');

      const { error: cErr } = await supabase.from('store_claims').upsert(
        {
          claim_id: safeClaimId,
          vendor_id: safeVendorId,
          vendor_slug: slug,
          vendor_name: name,
          phone_last4: phoneLast4,
          status: 'pending',
          created_by: user.uid,
          created_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'claim_id' }
      );
      if (cErr) throw new Error(cErr.message);

      const { data: savedTransfer, error: tErr } = await supabase
        .from('admin_transfers')
        .upsert(
          {
            vendor_id: safeVendorId,
            vendor_name: name,
            vendor_slug: slug,
            target_phone: cleanPhone,
            passcode: cleanPasscode,
            claim_id: safeClaimId,
            status: 'pending',
            created_by: user.uid,
            updated_at: nowIso,
          },
          { onConflict: 'vendor_id' }
        )
        .select('*')
        .single();
      if (tErr) throw new Error(tErr.message);

      res.json({ transfer: rowToAdminTransfer(savedTransfer as Record<string, unknown>) });
    } catch (err) {
      handleApiError(res, err, 'Failed to issue transfer.');
    }
  });

  router.post('/concierge/revoke', requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const safeVendorId = sanitizeId(req.body?.vendorId);
      const claimId = String(req.body?.claimId || '').toLowerCase();
      const nowIso = new Date().toISOString();

      if (/^[a-f0-9]{64}$/.test(claimId)) {
        await supabase
          .from('store_claims')
          .update({ status: 'revoked', updated_at: nowIso })
          .eq('claim_id', claimId)
          .eq('status', 'pending');
      }
      await supabase
        .from('vendors')
        .update({ claim_status: 'none', updated_at: nowIso })
        .eq('id', safeVendorId);
      await supabase
        .from('admin_transfers')
        .update({ status: 'revoked', updated_at: nowIso })
        .eq('vendor_id', safeVendorId);
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to revoke transfer.');
    }
  });

  router.post('/concierge/claim-lookup', async (req, res) => {
    try {
      const clientIp =
        (typeof req.headers['x-forwarded-for'] === 'string'
          ? req.headers['x-forwarded-for'].split(',')[0].trim()
          : req.ip) || 'unknown';
      if (!checkClaimLookupRateLimit(clientIp)) {
        return res
          .status(429)
          .json({ error: 'Too many passcode attempts. Please wait a few minutes and try again.' });
      }
      const supabase = getSupabase();
      const claimId = String(req.body?.claimId || '').toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(claimId)) {
        return res.json({ claim: null });
      }
      const { data } = await supabase
        .from('store_claims')
        .select('*')
        .eq('claim_id', claimId)
        .maybeSingle();
      if (!data) return res.json({ claim: null });
      res.json({ claim: rowToStoreClaim(data as Record<string, unknown>), claimId });
    } catch (err) {
      handleApiError(res, err, 'Failed to look up store claim.');
    }
  });

  router.post('/concierge/redeem', requireAuth, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const user = req.user!;
      const claimId = String(req.body?.claimId || '').toLowerCase();
      const vendorId = sanitizeId(req.body?.vendorId);
      if (!/^[a-f0-9]{64}$/.test(claimId)) {
        return res.status(400).json({ error: 'Invalid claim token.' });
      }

      const { data: claim } = await supabase
        .from('store_claims')
        .select('*')
        .eq('claim_id', claimId)
        .maybeSingle();
      if (!claim || claim.status !== 'pending' || claim.vendor_id !== vendorId) {
        return res.status(400).json({ error: 'Claim ticket is invalid or already redeemed.' });
      }

      const nowIso = new Date().toISOString();
      const { data: claimedRow, error: cErr } = await supabase
        .from('store_claims')
        .update({ status: 'claimed', claimed_by: user.uid, updated_at: nowIso })
        .eq('claim_id', claimId)
        .eq('status', 'pending')
        .select('claim_id')
        .maybeSingle();
      if (cErr) throw new Error(cErr.message);
      if (!claimedRow) {
        return res.status(409).json({ error: 'This store claim ticket was already redeemed.' });
      }

      const { error: vErr } = await supabase
        .from('vendors')
        .update({
          owner_id: user.uid,
          claim_status: 'claimed',
          claimed_by_token: claimId,
          updated_at: nowIso,
        })
        .eq('id', vendorId);
      if (vErr) throw new Error(vErr.message);

      await supabase
        .from('admin_transfers')
        .update({ status: 'claimed', updated_at: nowIso })
        .eq('vendor_id', vendorId);

      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to claim storefront.');
    }
  });

  // --- ONE-TIME ADMIN MIGRATION: Import Bite Bloom (+21 products) from Firestore into Supabase + Storage ---
  router.post('/admin/migrate-bitebloom', requireAdmin, async (_req, res) => {
    try {
      const supabase = getSupabase();
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/vendors/custom-1795253095228`;
      const resp = await fetch(firestoreUrl);
      if (!resp.ok) {
        return res.status(502).json({ error: `Could not fetch Bite Bloom from Firestore (${resp.status}).` });
      }
      const doc = (await resp.json()) as { fields?: Record<string, unknown> };
      const f = doc.fields || {};
      const str = (k: string, fb = '') => {
        const entry = f[k] as { stringValue?: string } | undefined;
        return typeof entry?.stringValue === 'string' ? entry.stringValue : fb;
      };
      const num = (k: string, fb = 0) => {
        const entry = f[k] as { doubleValue?: number; integerValue?: string } | undefined;
        if (typeof entry?.doubleValue === 'number') return entry.doubleValue;
        if (typeof entry?.integerValue === 'string') return Number(entry.integerValue) || fb;
        return fb;
      };
      const bool = (k: string, fb = false) => {
        const entry = f[k] as { booleanValue?: boolean } | undefined;
        return typeof entry?.booleanValue === 'boolean' ? entry.booleanValue : fb;
      };
      const strArr = (k: string) => {
        const entry = f[k] as { arrayValue?: { values?: Array<{ stringValue?: string }> } } | undefined;
        return (entry?.arrayValue?.values || [])
          .map((v) => v.stringValue || '')
          .filter(Boolean);
      };

      const rawProdValues =
        ((f.products as { arrayValue?: { values?: Array<{ mapValue?: { fields?: Record<string, unknown> } }> } })
          ?.arrayValue?.values || []);

      const parsedProducts = rawProdValues.map((pv, idx) => {
        const pf = pv.mapValue?.fields || {};
        const pStr = (k: string, fb = '') => {
          const e = pf[k] as { stringValue?: string } | undefined;
          return typeof e?.stringValue === 'string' ? e.stringValue : fb;
        };
        const pNum = (k: string, fb = 0) => {
          const e = pf[k] as { doubleValue?: number; integerValue?: string } | undefined;
          if (typeof e?.doubleValue === 'number') return e.doubleValue;
          if (typeof e?.integerValue === 'string') return Number(e.integerValue) || fb;
          return fb;
        };
        const pStrArr = (k: string) => {
          const e = pf[k] as { arrayValue?: { values?: Array<{ stringValue?: string }> } } | undefined;
          return (e?.arrayValue?.values || []).map((v) => v.stringValue || '').filter(Boolean);
        };
        return {
          id: pStr('id', `prod-${idx + 1}`),
          name: pStr('name', `Product ${idx + 1}`),
          serves: pStr('serves', '1 pc'),
          unitQuantity: pStr('unitQuantity') || undefined,
          unitType: pStr('unitType') || undefined,
          foodType: pStr('foodType') || undefined,
          dietaryTags: pStrArr('dietaryTags'),
          builderSection: pStr('builderSection') || undefined,
          builderPresets: pStrArr('builderPresets'),
          priceUsd: pNum('priceUsd', 1),
          description: pStr('description', ''),
          image: pStr('image', '/src/assets/images/cat-bakers.png'),
          tag: pStr('tag') || undefined,
        };
      });

      const vendorId = 'custom-1795253095228';
      const coverUrl = await uploadDataUrlIfNeeded(supabase, str('image'), `vendors/${vendorId}/cover`);
      const logoUrl = str('logo')
        ? await uploadDataUrlIfNeeded(supabase, str('logo'), `vendors/${vendorId}/logo`)
        : null;
      const products = await normalizeProductsForStorage(supabase, vendorId, parsedProducts);

      const nowIso = new Date().toISOString();
      const row = {
        id: vendorId,
        owner_id: str('ownerId'),
        slug: str('slug', 'bite-bloom'),
        name: str('name', 'Bite Bloom'),
        marketplace: str('marketplace', 'food'),
        category: str('category', 'Snack Boxes & Party Platters'),
        country: str('country', 'India'),
        state: str('state', 'Telangana'),
        city: str('city', 'Hyderabad'),
        area: str('area', 'Hyderabad'),
        lat: num('lat', 17.526227),
        lng: num('lng', 78.496478),
        whatsapp_number: str('whatsappNumber', '919052681374'),
        plan_tier: str('planTier', 'business'),
        monthly_auto_pay: bool('monthlyAutoPay', true),
        price_tier: str('priceTier', '$$'),
        starting_price_usd: num('startingPriceUsd', 1.12),
        rating: num('rating', 5),
        review_count: Math.round(num('reviewCount', 0)),
        response_time: str('responseTime', 'Replies within 30 mins on WhatsApp'),
        verified: bool('verified', true),
        status: str('status', 'active'),
        tagline: str('tagline', 'Curated Snack Boxes for Every Occasion'),
        description: str('description', 'Curated Snack Boxes for Every Occasion.'),
        christmas_special: bool('christmasSpecial', false),
        service_areas: strArr('serviceAreas'),
        specialties: strArr('specialties'),
        image: coverUrl || '/src/assets/images/cat-bakers.png',
        logo: logoUrl,
        products,
        custom_builder_enabled: bool('customBuilderEnabled', true),
        custom_builder_mode: str('customBuilderMode', 'snackbox') || 'snackbox',
        custom_builder_min_qty: Math.round(num('customBuilderMinQty', 10)) || 10,
        claim_status: 'none',
        created_at: nowIso,
        updated_at: nowIso,
      };

      const { data, error } = await supabase
        .from('vendors')
        .upsert(row, { onConflict: 'id' })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      res.json({
        ok: true,
        productCount: products.length,
        vendor: rowToVendor(data as Record<string, unknown>),
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to migrate Bite Bloom.');
    }
  });

  // =========================================================================
  // BOX & BITE SELF-OWNED CORPORATE CATALOG (Admin Upload + Supabase Storage)
  // =========================================================================
  const BOXBITE_CATALOG_OBJECT = 'box-and-bite/catalog.json';
  const BOXBITE_FALLBACK_IMAGE = '/src/assets/images/boxbite_hero_editorial_1795424832776.jpg';

  interface StoredBoxBiteCatalog {
    products: Array<Record<string, unknown>>;
    builderItems: Array<Record<string, unknown>>;
    updatedAt?: string;
  }

  async function readBoxBiteCatalog(supabase: SupabaseClient): Promise<StoredBoxBiteCatalog> {
    try {
      const { data, error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .download(BOXBITE_CATALOG_OBJECT);
      if (error || !data) {
        return { products: [], builderItems: [] };
      }
      const text = await data.text();
      if (!text.trim()) {
        return { products: [], builderItems: [] };
      }
      const parsed = JSON.parse(text) as Partial<StoredBoxBiteCatalog>;
      return {
        products: Array.isArray(parsed.products) ? parsed.products : [],
        builderItems: Array.isArray(parsed.builderItems) ? parsed.builderItems : [],
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
      };
    } catch {
      return { products: [], builderItems: [] };
    }
  }

  async function writeBoxBiteCatalog(
    supabase: SupabaseClient,
    catalog: StoredBoxBiteCatalog
  ): Promise<void> {
    const payload: StoredBoxBiteCatalog = {
      products: catalog.products,
      builderItems: catalog.builderItems,
      updatedAt: new Date().toISOString(),
    };
    const buffer = Buffer.from(JSON.stringify(payload), 'utf8');
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(BOXBITE_CATALOG_OBJECT, buffer, {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      });
    if (error) {
      throw new Error(error.message);
    }
  }

  router.get('/box-bite-catalog', async (_req, res) => {
    try {
      const supabase = getSupabase();
      const catalog = await readBoxBiteCatalog(supabase);
      res.json({
        products: catalog.products,
        builderItems: catalog.builderItems,
      });
    } catch (err) {
      handleApiError(res, err, 'Failed to load BOX & BITE catalog.');
    }
  });

  router.put('/box-bite-products/:productId', requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const productId = sanitizeId(req.params.productId, 'bb-prod');
      const p = (req.body || {}) as Record<string, unknown>;

      const validCategoryIds = new Set([
        'welcome-onboarding',
        'employee-appreciation',
        'executive-client',
        'conference-townhall',
        'boardroom-meals',
        'festive-hampers',
        'bulk-chocolates-cookies',
      ]);
      const categoryId =
        typeof p.categoryId === 'string' && validCategoryIds.has(p.categoryId)
          ? p.categoryId
          : 'welcome-onboarding';

      const dietary =
        p.dietary === 'non-veg' || p.dietary === 'mixed' ? p.dietary : 'veg';

      const samplePriceInr = Math.max(
        50,
        Math.min(250000, Math.round(Number(p.samplePriceInr) || 990))
      );
      const bulkStartingPriceInr = Math.max(
        50,
        Math.min(250000, Math.round(Number(p.bulkStartingPriceInr) || samplePriceInr))
      );
      const moqBulk = Math.max(2, Math.min(5000, Math.round(Number(p.moqBulk) || 10)));

      const mainImage = p.image
        ? await uploadDataUrlIfNeeded(supabase, p.image, `box-and-bite/products/${productId}`)
        : BOXBITE_FALLBACK_IMAGE;

      const rawGallery = Array.isArray(p.gallery) ? p.gallery.slice(0, 4) : [];
      const resolvedGallery: string[] = [];
      for (let i = 0; i < rawGallery.length; i++) {
        const g = rawGallery[i];
        if (typeof g !== 'string' || !g.trim()) continue;
        const uploaded = await uploadDataUrlIfNeeded(
          supabase,
          g,
          `box-and-bite/products/${productId}-g${i + 1}`
        );
        if (uploaded) resolvedGallery.push(uploaded);
      }
      const finalImage = mainImage || resolvedGallery[0] || BOXBITE_FALLBACK_IMAGE;
      const gallery = resolvedGallery.length > 0 ? resolvedGallery : [finalImage];

      const contents = Array.isArray(p.contents)
        ? p.contents
            .map((c) => (typeof c === 'string' ? c.trim().slice(0, 180) : ''))
            .filter(Boolean)
            .slice(0, 15)
        : [];

      const rawTiers = Array.isArray(p.tiers) ? p.tiers.slice(0, 5) : [];
      const tiers = rawTiers
        .map((t, idx) => {
          const obj = (t || {}) as Record<string, unknown>;
          const minQty = Math.max(1, Math.min(5000, Math.round(Number(obj.minQty) || 1)));
          const unitPriceInr = Math.max(
            50,
            Math.min(250000, Math.round(Number(obj.unitPriceInr) || samplePriceInr))
          );
          const maxQtyRaw = Number(obj.maxQty);
          return {
            id: sanitizeId(obj.id || `tier-${idx + 1}`, 'tier'),
            label: clampStr(obj.label, 2, 80, `Tier ${idx + 1}`),
            minQty,
            ...(Number.isFinite(maxQtyRaw) && maxQtyRaw >= minQty
              ? { maxQty: Math.round(maxQtyRaw) }
              : {}),
            unitPriceInr,
            note: clampStr(obj.note, 0, 120, ''),
          };
        })
        .filter((t) => Boolean(t.label));

      const rawVariants = Array.isArray(p.variants) ? p.variants.slice(0, 6) : [];
      const variants = rawVariants.map((v, idx) => {
        const obj = (v || {}) as Record<string, unknown>;
        return {
          id: sanitizeId(obj.id || `var-${idx + 1}`, 'var'),
          label: clampStr(obj.label, 2, 100, `Variant ${idx + 1}`),
          dietary: obj.dietary === 'non-veg' ? 'non-veg' : 'veg',
          priceDeltaInr: Math.max(-5000, Math.min(50000, Math.round(Number(obj.priceDeltaInr) || 0))),
          contentsNote: clampStr(obj.contentsNote, 0, 200, ''),
        };
      });

      const cust = (p.customisationSupported || {}) as Record<string, unknown>;
      const disc = (p.disclosures || {}) as Record<string, unknown>;
      const name = clampStr(p.name, 2, 120, 'BOX & BITE Corporate Box');

      const sanitizedProduct: Record<string, unknown> = {
        id: productId,
        slug: sanitizeSlug(p.slug || name),
        sku: clampStr(p.sku, 2, 32, 'BB-CUS-01').toUpperCase(),
        name,
        categoryId,
        categoryName: clampStr(p.categoryName, 2, 90, 'Employee Welcome / Onboarding Boxes'),
        subtitle: clampStr(p.subtitle, 2, 220, 'Curated corporate gifting box'),
        description: clampStr(p.description, 2, 1000, 'Custom curated Indian corporate gift box.'),
        dietary,
        dietaryBadgeText: clampStr(
          p.dietaryBadgeText,
          2,
          50,
          dietary === 'veg'
            ? '100% Vegetarian'
            : dietary === 'non-veg'
              ? 'Non-Vegetarian'
              : 'Veg & Non-Veg Options'
        ),
        servingsInfo: clampStr(p.servingsInfo, 2, 100, 'Curated for 1 recipient'),
        netWeightOrCount: clampStr(p.netWeightOrCount, 2, 100, '400g net'),
        moqSingleSample: p.moqSingleSample !== false,
        moqBulk,
        samplePriceInr,
        bulkStartingPriceInr,
        isDemoPrice: Boolean(p.isDemoPrice),
        featured: Boolean(p.featured),
        image: finalImage,
        gallery,
        contents:
          contents.length > 0
            ? contents
            : ['Assorted BOX & BITE artisanal assortment'],
        tiers:
          tiers.length > 0
            ? tiers
            : [
                {
                  id: 'sample',
                  label: 'Single Sample Box',
                  minQty: 1,
                  maxQty: 1,
                  unitPriceInr: samplePriceInr,
                  note: 'Sample dispatch rate',
                },
                {
                  id: 'bulk-moq',
                  label: `Corporate Pack (${moqBulk}+ boxes)`,
                  minQty: moqBulk,
                  unitPriceInr: bulkStartingPriceInr,
                  note: 'Includes custom logo sleeve option',
                },
              ],
        variants:
          variants.length > 0
            ? variants
            : [
                {
                  id: 'standard-veg',
                  label:
                    dietary === 'non-veg'
                      ? 'Non-Vegetarian Standard Edition'
                      : '100% Vegetarian Standard Edition',
                  dietary: dietary === 'non-veg' ? 'non-veg' : 'veg',
                  priceDeltaInr: 0,
                  contentsNote: 'Prepared fresh in BOX & BITE partner kitchen.',
                },
              ],
        customisationSupported: {
          logoBellySleeve: cust.logoBellySleeve !== false,
          ribbonChoice: cust.ribbonChoice !== false,
          printedWelcomeCard: cust.printedWelcomeCard !== false,
          foilStampingMinQty: Math.max(
            10,
            Math.min(1000, Math.round(Number(cust.foilStampingMinQty) || 25))
          ),
        },
        disclosures: {
          ingredientsPlaceholder: clampStr(
            disc.ingredientsPlaceholder,
            2,
            600,
            'Placeholder ingredient list — final kitchen ingredient sheet provided with confirmed corporate batch.'
          ),
          allergensPlaceholder: clampStr(
            disc.allergensPlaceholder,
            2,
            600,
            'Prepared in a kitchen handling dairy, wheat/gluten, soy, peanuts, and tree nuts. Request batch-specific allergen sheet before dispatch.'
          ),
          shelfLifeAndStorage: clampStr(
            disc.shelfLifeAndStorage,
            2,
            300,
            'Store in a cool, dry place below 24°C away from direct sunlight.'
          ),
          deliveryTimeline: clampStr(
            disc.deliveryTimeline,
            2,
            300,
            'Samples dispatch in 2–4 business days; bulk branded batches ship in 5–8 business days.'
          ),
        },
        active: p.active !== false,
        isCloudSaved: true,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user!.uid,
      };

      const catalog = await readBoxBiteCatalog(supabase);
      const nextProducts = catalog.products.filter((item) => item.id !== productId);
      nextProducts.unshift(sanitizedProduct);
      await writeBoxBiteCatalog(supabase, {
        ...catalog,
        products: nextProducts,
      });

      res.json({ product: sanitizedProduct });
    } catch (err) {
      handleApiError(res, err, 'Failed to save BOX & BITE product.');
    }
  });

  router.delete('/box-bite-products/:productId', requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const productId = sanitizeId(req.params.productId);
      const catalog = await readBoxBiteCatalog(supabase);
      const nextProducts = catalog.products.filter((item) => item.id !== productId);
      await writeBoxBiteCatalog(supabase, {
        ...catalog,
        products: nextProducts,
      });
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to delete BOX & BITE product.');
    }
  });

  router.put('/box-bite-builder-items/:itemId', requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const itemId = sanitizeId(req.params.itemId, 'bb-item');
      const b = (req.body || {}) as Record<string, unknown>;
      const validGroups = new Set([
        'Snacks & Savouries',
        'Roasted Nuts',
        'Artisanal Chocolates',
        'Cookies & Brownies',
        'Beverages',
      ]);
      const group =
        typeof b.group === 'string' && validGroups.has(b.group)
          ? b.group
          : 'Snacks & Savouries';

      const sanitizedItem: Record<string, unknown> = {
        id: itemId,
        name: clampStr(b.name, 2, 110, 'Custom Builder Item'),
        group,
        portion: clampStr(b.portion, 1, 60, '80g pack'),
        dietary: b.dietary === 'non-veg' ? 'non-veg' : 'veg',
        priceInr: Math.max(20, Math.min(25000, Math.round(Number(b.priceInr) || 150))),
        available: b.available !== false,
        ...(typeof b.unavailableReason === 'string' && b.unavailableReason.trim()
          ? { unavailableReason: b.unavailableReason.trim().slice(0, 80) }
          : {}),
        note: clampStr(b.note, 0, 160, ''),
        active: b.active !== false,
        isCloudSaved: true,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user!.uid,
      };

      const catalog = await readBoxBiteCatalog(supabase);
      const nextItems = catalog.builderItems.filter((i) => i.id !== itemId);
      nextItems.unshift(sanitizedItem);
      await writeBoxBiteCatalog(supabase, {
        ...catalog,
        builderItems: nextItems,
      });

      res.json({ item: sanitizedItem });
    } catch (err) {
      handleApiError(res, err, 'Failed to save builder item.');
    }
  });

  router.delete('/box-bite-builder-items/:itemId', requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const supabase = getSupabase();
      const itemId = sanitizeId(req.params.itemId);
      const catalog = await readBoxBiteCatalog(supabase);
      const nextItems = catalog.builderItems.filter((i) => i.id !== itemId);
      await writeBoxBiteCatalog(supabase, {
        ...catalog,
        builderItems: nextItems,
      });
      res.json({ ok: true });
    } catch (err) {
      handleApiError(res, err, 'Failed to delete builder item.');
    }
  });

  return router;
}
