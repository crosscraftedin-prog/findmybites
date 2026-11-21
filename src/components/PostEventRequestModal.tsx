import { FormEvent, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Calendar,
  CheckCircle2,
  Cloud,
  LogIn,
  MapPin,
  Megaphone,
  MessageCircle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  COUNTRY_DEFAULT_CURRENCY,
  COUNTRY_REGION_LABEL,
  CURRENCIES,
  CurrencyCode,
  EventQuote,
  EventRequest,
  FOOD_CATEGORIES,
  LAUNCH_COUNTRIES,
  LaunchCountry,
  PARTY_CATEGORIES,
  STATES_BY_COUNTRY,
  formatMoney,
  localToUsd,
  usdToLocal,
} from '../data/vendors';
import {
  closeEventRequestInCloud,
  createEventRequestInCloud,
  subscribeRequestQuotesForCustomer,
} from '../services/firestoreService';

const OCCASIONS = [
  'Birthday Party',
  'Wedding / Reception',
  'Mehendi / Sangeet',
  'Corporate Event',
  'House Party',
  'Baby Shower',
  'Anniversary',
  'Festival / Pooja',
];

const ALL_CATEGORIES = [...FOOD_CATEGORIES, ...PARTY_CATEGORIES];

interface PostEventRequestModalProps {
  isOpen: boolean;
  user: User | null;
  currency: CurrencyCode;
  defaultCountry?: Exclude<LaunchCountry, 'All'>;
  myRequests: EventRequest[];
  onClose: () => void;
  onSignIn: () => Promise<void>;
  onNotify: (msg: string) => void;
}

function RequestQuotesPanel({
  request,
  customerUid,
  currency,
}: {
  request: EventRequest;
  customerUid: string;
  currency: CurrencyCode;
}) {
  const [quotes, setQuotes] = useState<EventQuote[]>([]);

  useEffect(() => {
    const unsub = subscribeRequestQuotesForCustomer(request.id, customerUid, setQuotes);
    return () => unsub();
  }, [request.id, customerUid]);

  if (quotes.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Waiting for local vendors in {request.city} to send quotes…
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
        {quotes.length} Vendor {quotes.length === 1 ? 'Quote' : 'Quotes'} Received
      </p>
      {quotes.map((q) => {
        const waText = encodeURIComponent(
          `Hi ${q.vendorName}, thanks for your quote of ${formatMoney(q.priceUsd, currency)} on FindMyBites for my ${request.occasion} in ${request.city} (${request.eventDate}). Let's finalize!`
        );
        return (
          <div
            key={q.id}
            className="flex flex-col justify-between gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-foreground">{q.vendorName}</p>
                <span className="rounded-full bg-brand-soft px-2 py-0.5 font-mono text-[11px] font-bold text-brand">
                  {formatMoney(q.priceUsd, currency)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{q.message}</p>
            </div>
            <a
              href={`https://wa.me/${q.vendorWhatsapp}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1ebe5d]"
            >
              <MessageCircle className="size-3.5" aria-hidden="true" />
              Chat on WhatsApp
            </a>
          </div>
        );
      })}
    </div>
  );
}

export function PostEventRequestModal({
  isOpen,
  user,
  currency,
  defaultCountry = 'India',
  myRequests,
  onClose,
  onSignIn,
  onNotify,
}: PostEventRequestModalProps) {
  const [tab, setTab] = useState<'post' | 'mine'>('post');
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Bakers & Cakes',
    'Balloon & Theme Birthday Decor',
  ]);
  const [country, setCountry] = useState<Exclude<LaunchCountry, 'All'>>(defaultCountry);
  const [formCurrency, setFormCurrency] = useState<CurrencyCode>(currency || 'INR');
  const [stateName, setStateName] = useState<string>(STATES_BY_COUNTRY[defaultCountry][0].name);
  const [city, setCity] = useState<string>(STATES_BY_COUNTRY[defaultCountry][0].cities[0]);
  const [eventDate, setEventDate] = useState('2026-12-20');
  const [guests, setGuests] = useState(60);
  const [budgetLocal, setBudgetLocal] = useState(usdToLocal(350, currency || 'INR'));
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const statesForCountry = STATES_BY_COUNTRY[country];
  const currencyMeta = CURRENCIES[formCurrency];

  const handleCountryChange = (nextCountry: Exclude<LaunchCountry, 'All'>) => {
    setCountry(nextCountry);
    const first = STATES_BY_COUNTRY[nextCountry][0];
    setStateName(first.name);
    setCity(first.cities[0]);
    const nextCurr = COUNTRY_DEFAULT_CURRENCY[nextCountry];
    if (nextCurr !== formCurrency) {
      setBudgetLocal(usdToLocal(localToUsd(budgetLocal, formCurrency), nextCurr));
      setFormCurrency(nextCurr);
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.length > 1 ? prev.filter((c) => c !== cat) : prev;
      }
      if (prev.length >= 4) return prev;
      return [...prev, cat];
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      await onSignIn();
      return;
    }
    if (!city.trim() || !details.trim()) return;

    setSubmitting(true);
    try {
      await createEventRequestInCloud(user, {
        occasion,
        categories: selectedCategories,
        country,
        state: stateName,
        city: city.trim(),
        eventDate,
        guests,
        budgetUsd: localToUsd(budgetLocal, formCurrency),
        details: details.trim(),
      });
      setDetails('');
      setTab('mine');
      onNotify(
        `Event request broadcast live to local vendors in ${city.trim()}! Quotes will appear here.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRequest = async (requestId: string) => {
    await closeEventRequestInCloud(requestId);
    onNotify('Event request marked as closed.');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Post an Event Request to Local Vendors"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-brand-foreground">
              <Megaphone className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-foreground sm:text-lg">
                Post Your Event Requirement — Get Vendor Quotes
              </h2>
              <p className="text-xs text-muted-foreground">
                Broadcast once to verified bakers, caterers &amp; decorators in your city (zero spam,
                your phone stays private)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="grid size-9 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-2.5">
          <div className="inline-flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setTab('post')}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-bold transition-colors ${
                tab === 'post'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Post New Request
            </button>
            <button
              type="button"
              onClick={() => setTab('mine')}
              className={`cursor-pointer rounded-md px-3.5 py-1.5 text-xs font-bold transition-colors ${
                tab === 'mine'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Requests &amp; Quotes ({myRequests.length})
            </button>
          </div>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            Vendors reply with custom quotes directly
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'post' ? (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
              {/* 1. Occasion */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  1. What are you celebrating?
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {OCCASIONS.map((occ) => (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => setOccasion(occ)}
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        occasion === occ
                          ? 'border-brand bg-brand text-brand-foreground'
                          : 'border-border bg-background text-foreground hover:border-brand'
                      }`}
                    >
                      {occ}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Categories (up to 4) */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    2. Services Needed (Pick up to 4)
                  </label>
                  <span className="text-[11px] font-semibold text-brand">
                    {selectedCategories.length}/4 selected
                  </span>
                </div>
                <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2.5">
                  {ALL_CATEGORIES.map((cat) => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          active
                            ? 'border-brand bg-brand-soft text-brand'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Location */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="req-country" className="block text-xs font-semibold text-foreground">
                    Country
                  </label>
                  <select
                    id="req-country"
                    value={country}
                    onChange={(e) =>
                      handleCountryChange(e.target.value as Exclude<LaunchCountry, 'All'>)
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                  >
                    {LAUNCH_COUNTRIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="req-state" className="block text-xs font-semibold text-foreground">
                    {COUNTRY_REGION_LABEL[country]}
                  </label>
                  <select
                    id="req-state"
                    value={stateName}
                    onChange={(e) => {
                      const next = e.target.value;
                      setStateName(next);
                      const found = statesForCountry.find((s) => s.name === next);
                      if (found) setCity(found.cities[0]);
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                  >
                    {statesForCountry.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="req-city" className="block text-xs font-semibold text-foreground">
                    City / Area
                  </label>
                  <input
                    id="req-city"
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Hyderabad / Mumbai / Dubai"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. Date, Guests & Local Budget */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="req-date" className="block text-xs font-semibold text-foreground">
                    Event Date
                  </label>
                  <input
                    id="req-date"
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="req-guests" className="block text-xs font-semibold text-foreground">
                    Guest Count
                  </label>
                  <input
                    id="req-guests"
                    type="number"
                    min={5}
                    max={50000}
                    required
                    value={guests}
                    onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 50))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="req-budget" className="text-xs font-semibold text-foreground">
                      Total Budget ({currencyMeta.code})
                    </label>
                    <select
                      aria-label="Budget currency"
                      value={formCurrency}
                      onChange={(e) => {
                        const next = e.target.value as CurrencyCode;
                        setBudgetLocal(usdToLocal(localToUsd(budgetLocal, formCurrency), next));
                        setFormCurrency(next);
                      }}
                      className="cursor-pointer rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-bold text-foreground"
                    >
                      {Object.values(CURRENCIES).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted-foreground">
                      {currencyMeta.symbol.trim()}
                    </span>
                    <input
                      id="req-budget"
                      type="number"
                      min={1}
                      max={50000000}
                      required
                      value={budgetLocal}
                      onChange={(e) => setBudgetLocal(Math.max(1, Number(e.target.value) || 0))}
                      className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 font-mono text-sm text-foreground focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Requirements */}
              <div>
                <label htmlFor="req-details" className="block text-xs font-semibold text-foreground">
                  Event Details (Flavors, Veg/Halal, Theme, Venue, Timings)
                </label>
                <textarea
                  id="req-details"
                  rows={3}
                  required
                  minLength={5}
                  maxLength={800}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="e.g. Need a 3kg eggless jungle theme birthday cake, 60 snack boxes, and a pastel balloon arch at our Kompally home at 5 PM..."
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              {!user ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-soft/40 p-4">
                  <div className="flex items-start gap-2 text-xs">
                    <Cloud className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-foreground">
                        Sign in with Google to broadcast your event brief
                      </p>
                      <p className="text-muted-foreground">
                        Receive real vendor quotes privately without exposing your phone number.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onSignIn()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
                  >
                    <LogIn className="size-3.5" aria-hidden="true" />
                    Sign in with Google
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Sparkles className="size-3.5 text-brand" aria-hidden="true" />
                    Posted live to vendors across {city}, {stateName}
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-brand-foreground shadow-sm hover:bg-brand-hover disabled:opacity-60"
                  >
                    <Megaphone className="size-4" aria-hidden="true" />
                    {submitting ? 'Broadcasting…' : 'Broadcast Event Request'}
                  </button>
                </div>
              )}
            </form>
          ) : !user ? (
            <div className="py-12 text-center">
              <p className="text-sm font-bold text-foreground">
                Sign in with Google to view your posted requests &amp; incoming vendor quotes.
              </p>
              <button
                type="button"
                onClick={() => void onSignIn()}
                className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
              >
                <LogIn className="size-4" aria-hidden="true" />
                Sign in with Google
              </button>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-sm font-bold text-foreground">No event requests posted yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Post your event date, city, and budget once to receive quotes from local vendors.
              </p>
              <button
                type="button"
                onClick={() => setTab('post')}
                className="mt-4 cursor-pointer rounded-xl bg-brand px-4 py-2 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
              >
                Post Your First Request
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-border bg-background p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-foreground">{req.occasion}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            req.status === 'open'
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {req.status === 'open' ? 'Open for Quotes' : 'Closed'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5 text-brand" aria-hidden="true" />
                          {req.city}, {req.state}, {req.country}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3.5" aria-hidden="true" />
                          {req.eventDate}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5" aria-hidden="true" />
                          {req.guests} guests
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          Budget: {formatMoney(req.budgetUsd, currency)}
                        </span>
                      </div>
                    </div>

                    {req.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => void handleCloseRequest(req.id)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                        Mark Booked / Close
                      </button>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">{req.details}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {req.categories.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>

                  <RequestQuotesPanel
                    request={req}
                    customerUid={user.uid}
                    currency={currency}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
