import { FormEvent, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Check, Cloud, Crown, LogIn, MessageCircle, RefreshCw, X } from 'lucide-react';
import {
  COUNTRY_REGION_LABEL,
  CurrencyCode,
  FOOD_CATEGORIES,
  IMG_BALLOON,
  IMG_BAR,
  IMG_CAKE,
  IMG_CATERING,
  IMG_CHEF,
  IMG_DECOR,
  IMG_DESSERTS,
  IMG_DJ,
  IMG_GIFTING,
  IMG_LIVE_COUNTER,
  IMG_MITHAI,
  IMG_PHOTO,
  IMG_VENUE,
  LAUNCH_CITY_PRESETS,
  LAUNCH_COUNTRIES,
  LaunchCountry,
  PARTY_CATEGORIES,
  PlanTier,
  PriceTier,
  SAAS_PLANS,
  STATES_BY_COUNTRY,
  Vendor,
  formatPlanPrice,
} from '../data/vendors';

interface ListBusinessModalProps {
  isOpen: boolean;
  initialPlanTier?: PlanTier;
  currency: CurrencyCode;
  user: User | null;
  onSignIn: () => Promise<void>;
  onClose: () => void;
  onAddVendor: (vendor: Vendor) => Promise<void> | void;
}

const COUNTRY_DEFAULT_COORDS: Record<
  Exclude<LaunchCountry, 'All'>,
  { city: string; lat: number; lng: number; phonePrefix: string }
> = {
  India: { city: 'Mumbai', lat: 19.076, lng: 72.8777, phonePrefix: '91' },
  'Dubai / UAE': { city: 'Dubai', lat: 25.2048, lng: 55.2708, phonePrefix: '971' },
  'Sri Lanka': { city: 'Colombo', lat: 6.9271, lng: 79.8612, phonePrefix: '94' },
  Pakistan: { city: 'Lahore', lat: 31.5204, lng: 74.3587, phonePrefix: '92' },
  Bangladesh: { city: 'Dhaka', lat: 23.8103, lng: 90.4125, phonePrefix: '880' },
  Nepal: { city: 'Kathmandu', lat: 27.7172, lng: 85.324, phonePrefix: '977' },
};

const DEFAULT_IMAGE_BY_CATEGORY: Record<string, string> = {
  // FindMyBites (12)
  'Bakers & Cakes': IMG_CAKE,
  'Home Bakers & Cloud Kitchens': IMG_DESSERTS,
  'Live Counters & Food Stalls': IMG_LIVE_COUNTER,
  'Catering Services': IMG_CATERING,
  'Private Chefs & Home Dining': IMG_CHEF,
  'Bar, Mocktails & Beverage Carts': IMG_BAR,
  'Snack Boxes & Party Platters': IMG_GIFTING,
  'Dessert Tables & Sweet Stations': IMG_DESSERTS,
  'Gifting, Hampers & Return Favors': IMG_GIFTING,
  'Mithai, Chocolatiers & Dates': IMG_MITHAI,
  'Food Trucks & Pop-Up Carts': IMG_LIVE_COUNTER,
  'Healthy, Vegan & Diet Catering': IMG_CHEF,
  // PimpMyParty (12)
  'Wedding & Party Decor': IMG_DECOR,
  'Balloon & Theme Birthday Decor': IMG_BALLOON,
  'Event & Wedding Planners': IMG_VENUE,
  'DJs, Sound & Live Bands': IMG_DJ,
  'Photographers & Videographers': IMG_PHOTO,
  'Venues, Farmhouses & Villas': IMG_VENUE,
  'Photo Booths & 360 Spinners': IMG_PHOTO,
  'Kids Entertainment & Mascots': IMG_BALLOON,
  'Anchors, Emcees & Performers': IMG_DJ,
  'Makeup, Hair & Mehendi Artists': IMG_PHOTO,
  'Event Rentals, Furniture & Tents': IMG_VENUE,
  'Lighting, AV & Cold Fireworks': IMG_DECOR,
};

export function ListBusinessModal({
  isOpen,
  initialPlanTier = 'free',
  currency,
  user,
  onSignIn,
  onClose,
  onAddVendor,
}: ListBusinessModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [marketplace, setMarketplace] = useState<'food' | 'party'>('food');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(FOOD_CATEGORIES[0]);
  const [country, setCountry] = useState<Exclude<LaunchCountry, 'All'>>('India');
  const [stateName, setStateName] = useState<string>(STATES_BY_COUNTRY.India[0].name);
  const [city, setCity] = useState(STATES_BY_COUNTRY.India[0].cities[0]);
  const [area, setArea] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('919820001122');
  const [productName, setProductName] = useState('');
  const [startingPriceUsd, setStartingPriceUsd] = useState(120);
  const [tagline, setTagline] = useState('');
  const [planTier, setPlanTier] = useState<PlanTier>(initialPlanTier);
  const [autoPayAccepted, setAutoPayAccepted] = useState(true);

  useEffect(() => {
    setPlanTier(initialPlanTier);
  }, [initialPlanTier, isOpen]);

  useEffect(() => {
    setCategory(marketplace === 'food' ? FOOD_CATEGORIES[0] : PARTY_CATEGORIES[0]);
  }, [marketplace]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = marketplace === 'food' ? FOOD_CATEGORIES : PARTY_CATEGORIES;
  const isPaidPlan = planTier === 'pro' || planTier === 'business';
  const selectedPlanMeta = SAAS_PLANS.find((p) => p.id === planTier) ?? SAAS_PLANS[0];
  const statesForCountry = STATES_BY_COUNTRY[country];

  const handleCountryChange = (nextCountry: Exclude<LaunchCountry, 'All'>) => {
    setCountry(nextCountry);
    const meta = COUNTRY_DEFAULT_COORDS[nextCountry];
    const firstState = STATES_BY_COUNTRY[nextCountry][0];
    setStateName(firstState.name);
    setCity(firstState.cities[0]);
    setWhatsappNumber(`${meta.phonePrefix}9800001122`);
  };

  const handleStateChange = (nextState: string) => {
    setStateName(nextState);
    const found = statesForCountry.find((s) => s.name === nextState);
    if (found) {
      setCity(found.cities[0]);
    }
  };

  const computeTier = (price: number): PriceTier => {
    if (price < 120) return '$';
    if (price < 450) return '$$';
    if (price < 1000) return '$$$';
    return '$$$$';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim() || !tagline.trim()) return;
    if (isPaidPlan && !autoPayAccepted) return;
    if (!user) {
      await onSignIn();
      return;
    }

    setSubmitting(true);

    const matchedCity = LAUNCH_CITY_PRESETS.find(
      (p) => p.city.toLowerCase() === city.trim().toLowerCase()
    );
    const matchedState = statesForCountry.find((s) => s.name === stateName);
    const fallback = COUNTRY_DEFAULT_COORDS[country];
    const lat = matchedCity?.lat ?? matchedState?.lat ?? fallback.lat;
    const lng = matchedCity?.lng ?? matchedState?.lng ?? fallback.lng;

    const cleanSlug =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      city
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');

    const img = DEFAULT_IMAGE_BY_CATEGORY[category] ?? IMG_CAKE;
    const cleanDigits = whatsappNumber.replace(/[^\d]/g, '') || `${fallback.phonePrefix}9800001122`;
    const primaryProductTitle = productName.trim() || `Signature ${category} Package`;

    const newVendor: Vendor = {
      id: `vendor-${Date.now()}`,
      slug: cleanSlug,
      name: name.trim(),
      marketplace,
      category,
      city: city.trim(),
      area: area.trim() || `${city.trim()} Central`,
      state: stateName,
      country,
      lat,
      lng,
      whatsappNumber: cleanDigits,
      planTier,
      monthlyAutoPay: isPaidPlan && autoPayAccepted,
      priceTier: computeTier(startingPriceUsd),
      startingPriceUsd,
      rating: 5.0,
      reviewCount: 1,
      responseTime: 'Under 15 mins on WhatsApp',
      verified: true,
      tagline: tagline.trim(),
      description: `${tagline.trim()} Serving ${area.trim() || city.trim()} and nearby neighbourhoods in ${city.trim()}, ${country}. Message us directly on WhatsApp for custom menus, dates, and zero-commission quotes.`,
      serviceAreas: [area.trim() || `${city.trim()} Central`, city.trim(), `Greater ${city.trim()}`],
      specialties: [category, 'Direct WhatsApp Booking', 'Custom Orders'],
      image: img,
      products: [
        {
          id: `prod-${Date.now()}-1`,
          name: primaryProductTitle,
          serves: 'Up to 50 guests',
          priceUsd: startingPriceUsd,
          description: tagline.trim(),
          image: img,
          tag: isPaidPlan ? 'Featured' : 'Popular',
        },
        {
          id: `prod-${Date.now()}-2`,
          name: `Grand ${category} Celebration Package`,
          serves: '100–150 guests',
          priceUsd: Math.round(startingPriceUsd * 2.1),
          description:
            'Expanded full-event setup with on-site team, customisation, and priority delivery.',
          image: img,
        },
      ],
      reviews: [
        {
          id: `rev-${Date.now()}`,
          author: 'FindMyBites Verification Team',
          role: 'Launch Partner Verification',
          date: 'November 2026',
          rating: 5.0,
          comment: 'Storefront, WhatsApp contact, and local service area verified.',
        },
      ],
    };

    try {
      await onAddVendor(newVendor);
      setName('');
      setArea('');
      setProductName('');
      setTagline('');
      setStartingPriceUsd(120);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="List your business and create vendor page"
      onClick={onClose}
    >
      <div
        data-ecosystem={marketplace === 'party' ? 'PIMPMYPARTY' : 'FINDMYBITES'}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
              Launch Your One-Page Vendor Website
            </h2>
            <p className="text-xs text-muted-foreground">
              Get listed across India, Dubai, Sri Lanka, Pakistan, Bangladesh &amp; Nepal with direct WhatsApp leads
            </p>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* SaaS Plan Selector (Free vs Paid Monthly Auto-Pay) */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                1. Choose SaaS Listing Plan
              </span>
              <span className="text-[11px] font-medium text-brand">
                Paid listings always rank on top
              </span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {SAAS_PLANS.map((plan) => {
                const selected = planTier === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanTier(plan.id)}
                    className={`flex cursor-pointer flex-col rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? 'border-brand bg-brand-soft/60 ring-2 ring-brand/25'
                        : 'border-border bg-background hover:border-brand/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-foreground">{plan.name}</span>
                      {plan.id !== 'free' && (
                        <Crown className="size-3.5 shrink-0 text-brand" aria-hidden="true" />
                      )}
                    </div>
                    <p className="mt-1 font-mono text-base font-extrabold text-foreground">
                      {plan.priceUsdMonthly === 0
                        ? 'Free'
                        : `${formatPlanPrice(plan, currency)}/mo`}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {plan.id === 'business'
                        ? '#1 pinned top slot + AI priority'
                        : plan.id === 'pro'
                          ? 'Ranks above all Free listings'
                          : 'Basic listing + WhatsApp button'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ecosystem Switch */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              2. Marketplace &amp; Business Details
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setMarketplace('food')}
                className={`cursor-pointer rounded-lg py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  marketplace === 'food'
                    ? 'bg-[#ef6c22] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                FindMyBites · Food &amp; Catering
              </button>
              <button
                type="button"
                onClick={() => setMarketplace('party')}
                className={`cursor-pointer rounded-lg py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                  marketplace === 'party'
                    ? 'bg-[#db2fb2] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                PimpMyParty · Decor &amp; Events
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="biz-name" className="block text-xs font-semibold text-foreground">
                Business Name
              </label>
              <input
                id="biz-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Chaat & Bakery Studio"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="biz-category" className="block text-xs font-semibold text-foreground">
                Category
              </label>
              <select
                id="biz-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="biz-country" className="block text-xs font-semibold text-foreground">
                Country
              </label>
              <select
                id="biz-country"
                value={country}
                onChange={(e) =>
                  handleCountryChange(e.target.value as Exclude<LaunchCountry, 'All'>)
                }
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
              >
                {LAUNCH_COUNTRIES.filter((c): c is Exclude<LaunchCountry, 'All'> => c !== 'All').map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label htmlFor="biz-state" className="block text-xs font-semibold text-foreground">
                {COUNTRY_REGION_LABEL[country]}
              </label>
              <select
                id="biz-state"
                value={stateName}
                onChange={(e) => handleStateChange(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
              >
                {statesForCountry.map((st) => (
                  <option key={st.name} value={st.name}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="biz-city" className="block text-xs font-semibold text-foreground">
                City
              </label>
              <input
                id="biz-city"
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="biz-area" className="block text-xs font-semibold text-foreground">
                Area / Locality
              </label>
              <input
                id="biz-area"
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Bandra West / Marina"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="biz-whatsapp"
                className="flex items-center gap-1 text-xs font-semibold text-foreground"
              >
                <MessageCircle className="size-3.5 text-[#25D366]" aria-hidden="true" />
                WhatsApp Number
              </label>
              <input
                id="biz-whatsapp"
                type="tel"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="919820112233"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="biz-product" className="block text-xs font-semibold text-foreground">
                Featured Product / Package
              </label>
              <input
                id="biz-product"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Live Chaat Counter (100 pax)"
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="biz-price" className="block text-xs font-semibold text-foreground">
                Starting Price (USD eq.)
              </label>
              <input
                id="biz-price"
                type="number"
                min={15}
                max={50000}
                required
                value={startingPriceUsd}
                onChange={(e) => setStartingPriceUsd(Number(e.target.value) || 100)}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm tabular-nums text-foreground focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="biz-tagline" className="block text-xs font-semibold text-foreground">
              Short Storefront Headline &amp; Specialties
            </label>
            <textarea
              id="biz-tagline"
              rows={2}
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Custom eggless wedding cakes, live dessert counters, and birthday snack boxes with same-week delivery."
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none"
            />
          </div>

          {isPaidPlan && (
            <div className="rounded-xl border border-brand-border bg-brand-soft/40 p-4">
              <div className="flex items-start gap-2.5">
                <RefreshCw className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <div className="flex-1 text-xs">
                  <p className="font-bold text-foreground">
                    {selectedPlanMeta.name} —{' '}
                    {formatPlanPrice(selectedPlanMeta, currency)}/month auto-pay
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    Your listing immediately ranks above Free listings in {city} &amp; Near Me results.
                    Auto-renews monthly; cancel anytime in one click with zero booking commission.
                  </p>
                  <label className="mt-2.5 inline-flex cursor-pointer items-center gap-2 font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={autoPayAccepted}
                      onChange={(e) => setAutoPayAccepted(e.target.checked)}
                      className="size-4 accent-[#ef6c22]"
                    />
                    <span>Enable monthly SaaS auto-pay for top search placement</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {!user ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-soft/40 p-4">
              <div className="flex items-start gap-2.5 text-xs">
                <Cloud className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <p className="font-bold text-foreground">
                    Sign in with Google to save your storefront to the live cloud
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    So customers on any device can find you and you can edit products anytime.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void onSignIn()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-brand-foreground hover:bg-brand-hover whitespace-nowrap"
              >
                <LogIn className="size-3.5" aria-hidden="true" />
                Sign in with Google
              </button>
            </div>
          ) : (
            <p className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <Cloud className="size-3.5" aria-hidden="true" />
              Publishing live to Cloud Firestore as <strong>{user.displayName || user.email}</strong>
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="size-3.5 text-emerald-500" aria-hidden="true" />
              Creates live one-page website + QR poster + WhatsApp link instantly
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (isPaidPlan && !autoPayAccepted)}
                className="cursor-pointer rounded-lg bg-brand px-5 py-2 text-sm font-bold text-brand-foreground hover:bg-brand-hover disabled:opacity-50 whitespace-nowrap"
              >
                {submitting
                  ? 'Publishing to Cloud…'
                  : !user
                    ? 'Sign in with Google & Publish'
                    : isPaidPlan
                      ? `Activate ${selectedPlanMeta.name} & Publish`
                      : 'Publish Free Listing'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
