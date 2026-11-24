import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  MapPin,
  MessageCircle,
  Navigation,
  ShieldCheck,
  Star,
} from 'lucide-react';
import {
  Vendor,
  getVendorBioHandle,
  normalizePhoneDigits,
  sanitizeSafeHttpUrl,
} from '../data/vendors';
import { updateVendorInCloud } from '../services/firestoreService';

const CANONICAL_ORIGIN = 'https://www.findmybites.com';

interface VendorGoogleToolkitProps {
  vendors: Vendor[];
  onNotify: (msg: string) => void;
  onOpenGrowthHub?: () => void;
  onOpenVendorWebsite?: (vendor: Vendor) => void;
}

const CATEGORY_TO_GOOGLE_CATEGORY: Record<string, string> = {
  'Bakers & Cakes': 'Bakery / Cake Shop',
  'Home Bakers & Cloud Kitchens': 'Cake Shop / Bakery',
  'Catering Services': 'Caterer',
  'Private Chefs': 'Personal Chef Service',
  'Artisan Desserts & Sweets': 'Dessert Shop',
  'Live Food Counters': 'Mobile Caterer',
  'Mocktail & Beverage Bars': 'Mobile Caterer / Bartending Service',
  'Corporate Snack Boxes & Gifting': 'Gift Basket Store / Caterer',
  'Event Decor & Styling': 'Event Planner / Party Planner',
  'Balloon Art & Backdrops': 'Balloon Artist / Party Equipment Rental',
  'Photography & Videography': 'Photographer',
  'DJ, Sound & Lighting': 'DJ Service',
  'Kids Party Entertainment': 'Children’s Party Service',
  'Return Gifts & Favors': 'Gift Shop',
};

function buildDefaultReviewMessage(vendor: Vendor, reviewUrl: string | null): string {
  const storefrontUrl = `${CANONICAL_ORIGIN}/v/${vendor.slug}`;
  const lines = [
    `Hi! Thank you so much for ordering from ${vendor.name}. We hope everyone loved it!`,
    ``,
    `If you have 30 seconds, a quick review really helps our small business grow:`,
    ``,
    `1. FindMyBites Storefront Review: ${storefrontUrl}`,
  ];
  if (reviewUrl) {
    lines.push(`2. Google Review: ${reviewUrl}`);
  }
  lines.push(``, `Thank you for supporting local makers — we look forward to serving you again!`);
  return lines.join('\n');
}

export function VendorGoogleToolkit({
  vendors,
  onNotify,
  onOpenGrowthHub,
  onOpenVendorWebsite,
}: VendorGoogleToolkitProps) {
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?.id ?? '');
  const selectedVendor =
    vendors.find((v) => v.id === selectedVendorId) ?? vendors[0] ?? null;

  const [mapsInput, setMapsInput] = useState('');
  const [reviewInput, setReviewInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Post-order Review Booster state
  const [customerPhone, setCustomerPhone] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');

  useEffect(() => {
    if (vendors.length > 0 && !vendors.some((v) => v.id === selectedVendorId)) {
      setSelectedVendorId(vendors[0].id);
    }
  }, [vendors, selectedVendorId]);

  useEffect(() => {
    if (!selectedVendor) return;
    setMapsInput(selectedVendor.googleMapsUrl || '');
    setReviewInput(selectedVendor.googleReviewUrl || '');
    const safeRev = selectedVendor.googleReviewUrl
      ? sanitizeSafeHttpUrl(selectedVendor.googleReviewUrl)
      : null;
    setReviewMessage(buildDefaultReviewMessage(selectedVendor, safeRev));
  }, [selectedVendor]);

  if (!selectedVendor) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <MapPin className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-base font-bold text-foreground">
          Publish or claim a storefront first
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Once your storefront is live, your ready-to-copy Google Business Profile setup kit and
          1-tap WhatsApp Review Booster will appear here automatically.
        </p>
        {onOpenGrowthHub && (
          <button
            type="button"
            onClick={onOpenGrowthHub}
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-brand-foreground hover:bg-brand-hover"
          >
            <BookOpen className="size-3.5" aria-hidden="true" />
            Read the Vendor Growth Playbook
          </button>
        )}
      </div>
    );
  }

  const bioHandle = getVendorBioHandle(selectedVendor);
  const websiteUrl = `${CANONICAL_ORIGIN}/v/${selectedVendor.slug}`;
  const bioLinkUrl = `${CANONICAL_ORIGIN}/fmb/${bioHandle}`;
  const suggestedGoogleCat =
    CATEGORY_TO_GOOGLE_CATEGORY[selectedVendor.category] || selectedVendor.category;
  const serviceAreaSummary = [
    ...selectedVendor.serviceAreas,
    selectedVendor.city,
    selectedVendor.state,
  ]
    .filter((item, idx, arr) => Boolean(item) && arr.indexOf(item) === idx)
    .join(', ');

  const savedMapsHref = selectedVendor.googleMapsUrl
    ? sanitizeSafeHttpUrl(selectedVendor.googleMapsUrl)
    : null;
  const savedReviewHref = selectedVendor.googleReviewUrl
    ? sanitizeSafeHttpUrl(selectedVendor.googleReviewUrl)
    : null;

  const copyField = (key: string, value: string, label: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    onNotify(`Copied ${label}`);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2200);
  };

  const handleSaveGoogleLinks = async (e: FormEvent) => {
    e.preventDefault();
    const rawMaps = mapsInput.trim();
    const rawReview = reviewInput.trim();

    if (rawMaps && !sanitizeSafeHttpUrl(rawMaps)) {
      onNotify('Please enter a valid https:// Google Maps link.');
      return;
    }
    if (rawReview && !sanitizeSafeHttpUrl(rawReview)) {
      onNotify('Please enter a valid https:// Google Review link.');
      return;
    }

    setSaving(true);
    try {
      const cleanMaps = rawMaps ? sanitizeSafeHttpUrl(rawMaps) || '' : '';
      const cleanReview = rawReview ? sanitizeSafeHttpUrl(rawReview) || '' : '';
      await updateVendorInCloud(selectedVendor.id, {
        googleMapsUrl: cleanMaps,
        googleReviewUrl: cleanReview,
      });
      setReviewMessage(
        buildDefaultReviewMessage(selectedVendor, cleanReview || null)
      );
      onNotify(`Saved Google Business Profile links for ${selectedVendor.name}.`);
    } catch {
      onNotify('Could not save Google links right now. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const buildBoosterWhatsAppHref = () => {
    const digits = normalizePhoneDigits(customerPhone);
    const encoded = encodeURIComponent(reviewMessage.trim());
    if (digits.length >= 8) {
      return `https://wa.me/${digits}?text=${encoded}`;
    }
    return `https://wa.me/?text=${encoded}`;
  };

  const readyToCopyRows = [
    { key: 'name', label: 'Business Name', value: selectedVendor.name, mono: false },
    { key: 'category', label: 'Primary Google Category', value: suggestedGoogleCat, mono: false },
    { key: 'website', label: 'Website URL (Paste in GBP Website)', value: websiteUrl, mono: true },
    { key: 'menu', label: 'Menu / Bio-Link URL (Paste in GBP Menu)', value: bioLinkUrl, mono: true },
    { key: 'areas', label: 'Service Areas', value: serviceAreaSummary, mono: false },
    { key: 'desc', label: 'Business Description', value: selectedVendor.description, mono: false },
  ];

  return (
    <div className="space-y-8">
      {/* Header + Store Switcher */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand">
            Google Maps &amp; Review Growth Kit
          </p>
          <h3 className="mt-1 text-xl font-extrabold tracking-tight text-foreground">
            Get Discovered on Google Search &amp; Maps
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            List your business for free on Google Business Profile using your FindMyBites page as
            your official website, then paste your Google links below so customers see Directions
            and Google Reviews right on your storefront.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {vendors.length > 1 && (
            <select
              aria-label="Select storefront"
              value={selectedVendor.id}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.city})
                </option>
              ))}
            </select>
          )}
          {onOpenGrowthHub && (
            <button
              type="button"
              onClick={onOpenGrowthHub}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft px-3.5 py-2 text-xs font-bold text-brand hover:bg-brand hover:text-brand-foreground"
            >
              <BookOpen className="size-3.5" aria-hidden="true" />
              Full Vendor Growth Tips
            </button>
          )}
        </div>
      </div>

      {/* 01. Connect Google Business Profile Links */}
      <section className="rounded-2xl border border-border bg-background p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="font-mono text-xs font-bold text-brand">01.</p>
            <h4 className="mt-0.5 text-base font-extrabold text-foreground">
              Connect Your Google Maps &amp; Review Links
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Once connected, customers viewing your FindMyBites storefront and Bio-Link get direct
              Google Maps Directions and 1-tap Google Review buttons — plus search-engine markup.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className={savedMapsHref ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}>
              Maps: {savedMapsHref ? 'Connected' : 'Not set'}
            </span>
            <span aria-hidden="true">·</span>
            <span className={savedReviewHref ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}>
              Reviews: {savedReviewHref ? 'Connected' : 'Not set'}
            </span>
          </div>
        </div>

        <form onSubmit={(e) => void handleSaveGoogleLinks(e)} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="gbp-maps-url"
                className="block text-xs font-semibold text-foreground"
              >
                Google Maps Place Link
              </label>
              <input
                id="gbp-maps-url"
                type="url"
                value={mapsInput}
                onChange={(e) => setMapsInput(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Open your business on Google Maps → tap Share → Copy Link.
              </p>
            </div>

            <div>
              <label
                htmlFor="gbp-review-url"
                className="block text-xs font-semibold text-foreground"
              >
                Direct Google Review Link
              </label>
              <input
                id="gbp-review-url"
                type="url"
                value={reviewInput}
                onChange={(e) => setReviewInput(e.target.value)}
                placeholder="https://g.page/r/.../review"
                className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                In Google Business Profile → tap &ldquo;Ask for reviews&rdquo; → copy the short link.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {savedMapsHref && (
                <a
                  href={savedMapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-brand hover:underline"
                >
                  <Navigation className="size-3.5 text-brand" aria-hidden="true" />
                  Test Maps Link
                </a>
              )}
              {savedReviewHref && (
                <a
                  href={savedReviewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-brand hover:underline"
                >
                  <Star className="size-3.5 text-amber-500" aria-hidden="true" />
                  Test Review Link
                </a>
              )}
              {onOpenVendorWebsite && (
                <button
                  type="button"
                  onClick={() => onOpenVendorWebsite(selectedVendor)}
                  className="inline-flex cursor-pointer items-center gap-1 font-semibold text-muted-foreground hover:text-foreground hover:underline"
                >
                  <Globe2 className="size-3.5" aria-hidden="true" />
                  Preview Storefront
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-xs font-bold text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Google Links'}
            </button>
          </div>
        </form>
      </section>

      {/* 02. 2-Minute Guided Setup Kit for Google Business Profile */}
      <section className="rounded-2xl border border-border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-bold text-brand">02.</p>
            <h4 className="mt-0.5 text-base font-extrabold text-foreground">
              2-Minute &ldquo;Get Listed on Google Maps&rdquo; Setup Kit
            </h4>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              Google Business Profile is 100% free and does not require a paid website. Copy the
              pre-filled details below and paste them directly into Google’s setup form.
            </p>
          </div>

          <a
            href="https://business.google.com/create"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-xs font-bold text-background transition-opacity hover:opacity-90"
          >
            Open Google Business Profile (Free)
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {readyToCopyRows.map((row) => (
            <div
              key={row.key}
              className="flex flex-col justify-between gap-2 px-3.5 py-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-muted-foreground">{row.label}</p>
                <p
                  className={`mt-0.5 break-all text-xs text-foreground ${
                    row.mono ? 'font-mono font-semibold text-brand' : 'font-medium'
                  }`}
                >
                  {row.value}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyField(row.key, row.value, row.label)}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand sm:self-center"
              >
                {copiedKey === row.key ? (
                  <>
                    <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" aria-hidden="true" />
                    Copy
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Home-Baker Privacy Note */}
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3.5 text-xs">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <div className="space-y-1 text-muted-foreground">
            <p className="font-bold text-foreground">
              Home Baker Privacy Tip: Hide Your Personal Street Address
            </p>
            <p className="leading-relaxed">
              When Google asks <em>&ldquo;Do you want to add a location customers can visit?&rdquo;</em>,
              choose <strong>No</strong> if you bake from home and only deliver or meet at a pickup
              point. Select <strong>Service-Area Business</strong> instead and enter your delivery
              neighbourhoods ({selectedVendor.city} / {selectedVendor.area}) so your home address
              stays private while you still appear in local Google Maps searches.
            </p>
          </div>
        </div>
      </section>

      {/* 03. Post-Order Review Booster (1-Tap WhatsApp) */}
      <section className="rounded-2xl border border-border bg-background p-5">
        <p className="font-mono text-xs font-bold text-brand">03.</p>
        <h4 className="mt-0.5 text-base font-extrabold text-foreground">
          Post-Order Review Booster (1-Tap WhatsApp)
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Send this 2 hours after delivering an order. Collecting reviews on both FindMyBites and
          Google pushes your store higher in local &ldquo;near me&rdquo; results.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label
              htmlFor="booster-customer-phone"
              className="block text-xs font-semibold text-foreground"
            >
              Customer WhatsApp Number (Optional)
            </label>
            <input
              id="booster-customer-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="e.g. 919876543210 (leave blank to pick chat)"
              className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs text-foreground placeholder:font-sans placeholder:text-muted-foreground focus:border-brand focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Leave empty to choose the customer inside WhatsApp directly.
            </p>
            {!savedReviewHref && (
              <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                Save your Google Review Link in Step 01 above to automatically include it in this
                message.
              </p>
            )}
          </div>

          <div className="sm:col-span-7">
            <label
              htmlFor="booster-message"
              className="block text-xs font-semibold text-foreground"
            >
              Message Preview (Editable)
            </label>
            <textarea
              id="booster-message"
              rows={5}
              value={reviewMessage}
              onChange={(e) => setReviewMessage(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => copyField('booster', reviewMessage, 'Review request message')}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
          >
            {copiedKey === 'booster' ? (
              <>
                <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                Copied Message
              </>
            ) : (
              <>
                <Copy className="size-3.5" aria-hidden="true" />
                Copy Text
              </>
            )}
          </button>
          <a
            href={buildBoosterWhatsAppHref()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1ebe5d]"
          >
            <MessageCircle className="size-3.5" aria-hidden="true" />
            Send Review Ask on WhatsApp
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}
