import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Camera,
  Check,
  CheckSquare,
  Copy,
  Crown,
  Instagram,
  Link2,
  MapPin,
  MessageCircle,
  Sparkles,
  Square,
  Store,
  TrendingUp,
} from 'lucide-react';
import {
  CurrencyCode,
  PlanTier,
  SAAS_PLANS,
  Vendor,
  formatPlanPrice,
  getVendorBioHandle,
} from '../data/vendors';

const CANONICAL_ORIGIN = 'https://www.findmybites.com';
const CHECKLIST_STORAGE_KEY = 'fmb_vendor_growth_checklist_v1';

interface VendorGrowthHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  myVendors: Vendor[];
  onOpenListModal: (plan: PlanTier) => void;
  onOpenDashboard: () => void;
  onOpenBioLink?: (vendor: Vendor) => void;
  onNotify?: (msg: string) => void;
}

const LAUNCH_CHECKLIST: ReadonlyArray<{ id: string; label: string; detail: string }> = [
  {
    id: 'bio-handle',
    label: 'Claim your custom FindMyBites Bio-Link (/fmb/your-name)',
    detail: 'One memorable link for Instagram bio, WhatsApp Business, and cake box QR stickers.',
  },
  {
    id: 'multi-weight',
    label: 'Add at least 5 bestselling items with weights & clear prices',
    detail: 'Menus with 500g / 1 kg / 2 kg options convert 2x faster than "DM for price".',
  },
  {
    id: 'insta-bio',
    label: 'Upgrade your Instagram to a Business account & link /fmb/',
    detail: 'Set Category to Bakery / Caterer, add your city in your display name, and pin 3 Reels.',
  },
  {
    id: 'gbp-listing',
    label: 'Create your free Google Business Profile (Google Maps)',
    detail: 'Paste your FindMyBites Website & Menu URLs and connect your Google Review link.',
  },
  {
    id: 'wa-quick-replies',
    label: 'Set up WhatsApp Business Greeting & Quick Replies',
    detail: 'Automate your menu link, 50% advance booking policy, and delivery radius reply.',
  },
  {
    id: 'first-5-reviews',
    label: 'Collect your first 5 customer reviews (FindMyBites + Google)',
    detail: 'Use the 1-tap Review Booster inside Vendor Portal 2 hours after every delivery.',
  },
];

const CHAPTER_NAV = [
  { id: 'chapter-instagram', num: '01', label: 'Instagram Store' },
  { id: 'chapter-biolink', num: '02', label: 'Bio-Link Desk' },
  { id: 'chapter-gmb', num: '03', label: 'Google Maps' },
  { id: 'chapter-whatsapp', num: '04', label: 'WhatsApp & Reviews' },
  { id: 'chapter-menu', num: '05', label: 'Menus & Photos' },
  { id: 'chapter-plans', num: '06', label: 'Pro & Plus Plans' },
];

export function VendorGrowthHubModal({
  isOpen,
  onClose,
  currency,
  myVendors,
  onOpenListModal,
  onOpenDashboard,
  onOpenBioLink,
  onNotify,
}: VendorGrowthHubModalProps) {
  const [checkedIds, setCheckedIds] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checkedIds));
    } catch {
      // ignore storage errors
    }
  }, [checkedIds]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const primaryVendor = myVendors[0] ?? null;
  const brandName = primaryVendor?.name || 'Your Bakery Name';
  const brandCity = primaryVendor?.city || 'Your City';
  const brandArea = primaryVendor?.area || 'Your Area';
  const bioHandle = primaryVendor ? getVendorBioHandle(primaryVendor) : 'your-store-name';
  const bioLinkUrl = `${CANONICAL_ORIGIN}/fmb/${bioHandle}`;
  const storefrontUrl = primaryVendor
    ? `${CANONICAL_ORIGIN}/v/${primaryVendor.slug}`
    : `${CANONICAL_ORIGIN}/v/your-store-name`;

  const instaBioTemplate = [
    `${brandName} | Custom Cakes & Desserts · ${brandCity}`,
    `100% Freshly Baked to Order · Eggless & Custom Themes`,
    `Serving ${brandArea} & ${brandCity} · 24h Pre-Order`,
    `Menu, Prices & WhatsApp Orders ↓`,
    bioLinkUrl,
  ].join('\n');

  const instaDmReplyScript = [
    `Hi! Thank you for messaging ${brandName}.`,
    `You can browse our full menu with photos, weights & instant prices here:`,
    bioLinkUrl,
    ``,
    `Tap any item to send your flavour, weight & date directly on WhatsApp and we’ll confirm your slot right away!`,
  ].join('\n');

  const waReviewTemplate = [
    `Hi! Thank you for ordering from ${brandName}. We hope everyone loved it!`,
    `If you have 30 seconds, a quick review helps our small business reach more local families:`,
    `• FindMyBites Review: ${storefrontUrl}`,
    primaryVendor?.googleReviewUrl
      ? `• Google Review: ${primaryVendor.googleReviewUrl}`
      : `• Google Review: [Paste your Google Review link here]`,
    `Thank you so much for supporting us!`,
  ].join('\n');

  const toggleChecklist = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const copyScript = (key: string, text: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    onNotify?.(`Copied ${label}`);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2200);
  };

  const completedCount = checkedIds.length;
  const totalCount = LAUNCH_CHECKLIST.length;

  return (
    <div
      className="fixed inset-0 z-[75] overflow-y-auto bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-label="FindMyBites Vendor Growth Playbook"
    >
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </button>
            <span className="hidden text-xs font-semibold text-muted-foreground sm:inline">
              FindMyBites × PimpMyParty · Vendor Growth Playbook
            </span>
          </div>

          <div className="flex items-center gap-2">
            {primaryVendor && onOpenBioLink && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBioLink(primaryVendor);
                }}
                className="hidden cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:border-brand hover:text-brand sm:inline-flex"
              >
                <Link2 className="size-3.5 text-brand" aria-hidden="true" />
                My Bio Link
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                if (primaryVendor) {
                  onOpenDashboard();
                } else {
                  onOpenListModal('free');
                }
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-bold text-brand-foreground shadow-xs hover:bg-brand-hover"
            >
              <Store className="size-3.5" aria-hidden="true" />
              {primaryVendor ? 'Open Vendor Portal' : 'Create Free Storefront'}
            </button>
          </div>
        </div>

        {/* Chapter Jump Strip */}
        <div className="border-t border-border/70 bg-muted/30">
          <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            {CHAPTER_NAV.map((ch) => (
              <a
                key={ch.id}
                href={`#${ch.id}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <span className="font-mono text-[11px] text-brand">{ch.num}.</span>
                <span>{ch.label}</span>
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* Hero Editorial Opening */}
      <section className="border-b border-border bg-gradient-to-b from-brand-soft/45 via-background to-background">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:items-end lg:px-8 lg:py-16">
          <div className="lg:col-span-7">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
              <BookOpen className="size-3.5" aria-hidden="true" />
              Free Playbook for Bakers, Caterers &amp; Party Creators
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl lg:leading-[1.08]">
              Turn Instagram, Google Maps &amp; WhatsApp into Daily Orders
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              A practical, zero-fluff growth guide for home bakers, cloud kitchens, caterers, and
              event stylists. Every script below is ready to copy — and already personalized for{' '}
              <strong className="text-foreground">{brandName}</strong>.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#chapter-instagram"
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover"
              >
                Start Chapter 01
                <TrendingUp className="size-4" aria-hidden="true" />
              </a>
              <a
                href="#chapter-plans"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:border-brand hover:text-brand"
              >
                Compare Free, Pro &amp; Plus Plans
              </a>
            </div>
          </div>

          {/* Interactive Launch Checklist Card */}
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-5">
            <div className="flex items-baseline justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-foreground">
                  Your 6-Step Growth Checklist
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Progress saves automatically on this device
                </p>
              </div>
              <span className="font-mono text-xs font-bold tabular-nums text-brand">
                {completedCount}/{totalCount} done
              </span>
            </div>
            <ul className="mt-3 space-y-2.5">
              {LAUNCH_CHECKLIST.map((item) => {
                const done = checkedIds.includes(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggleChecklist(item.id)}
                      className="flex w-full cursor-pointer items-start gap-2.5 text-left"
                    >
                      {done ? (
                        <CheckSquare className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-xs leading-snug">
                        <span
                          className={`block font-semibold ${
                            done ? 'text-muted-foreground line-through' : 'text-foreground'
                          }`}
                        >
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {item.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* Main Chapters */}
      <main className="mx-auto max-w-6xl divide-y divide-border px-4 sm:px-6 lg:px-8">
        {/* 01. Instagram Store */}
        <section id="chapter-instagram" className="scroll-mt-32 py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="font-mono text-xs font-bold text-brand">01.</p>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
                <Instagram className="size-5 text-brand" aria-hidden="true" />
                Create a High-Converting Instagram Store
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Most home bakers lose 60% of interested buyers because customers have to DM and wait
                hours for prices. Turn your Instagram profile into a clean storefront funnel that
                answers every question in 5 seconds.
              </p>

              <dl className="mt-6 space-y-4 text-xs">
                <div className="border-t border-border pt-3">
                  <dt className="font-bold text-foreground">Switch to a Business Account &amp; Searchable Name</dt>
                  <dd className="mt-1 leading-relaxed text-muted-foreground">
                    Put your niche + city inside your bold Instagram Name field (for example:{' '}
                    <em>&ldquo;{brandName} · Cakes in {brandCity}&rdquo;</em>). Instagram indexes
                    that line when locals search &ldquo;custom cakes {brandCity}&rdquo;.
                  </dd>
                </div>
                <div className="border-t border-border pt-3">
                  <dt className="font-bold text-foreground">Set Up 4 Essential Story Highlights</dt>
                  <dd className="mt-1 leading-relaxed text-muted-foreground">
                    Create clean highlights titled <strong>Menu &amp; Prices</strong>,{' '}
                    <strong>Customer Reviews</strong>, <strong>How to Order</strong>, and{' '}
                    <strong>Custom Work</strong>. Add your FindMyBites link sticker inside the Menu
                    highlight.
                  </dd>
                </div>
                <div className="border-t border-border pt-3">
                  <dt className="font-bold text-foreground">3 Reel Formulas That Actually Bring Orders</dt>
                  <dd className="mt-1 leading-relaxed text-muted-foreground">
                    1) 7-second cake frosting or unboxing reveal with price overlay · 2) Packaging
                    an order while explaining flavours &amp; lead time · 3) Customer reaction or
                    event table setup before guests arrive. Always end with:{' '}
                    <em>&ldquo;Full menu &amp; prices in bio link.&rdquo;</em>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-4 lg:col-span-7">
              {/* Ready-to-copy Bio Card */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-foreground">
                    Copy-Ready Instagram Bio Formula
                  </p>
                  <button
                    type="button"
                    onClick={() => copyScript('ig-bio', instaBioTemplate, 'Instagram bio')}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
                  >
                    {copiedKey === 'ig-bio' ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" /> Copy Bio
                      </>
                    )}
                  </button>
                </div>
                <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background p-4 font-sans text-xs leading-relaxed text-foreground">
                  {instaBioTemplate}
                </pre>
              </div>

              {/* Ready-to-copy DM Script */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-foreground">
                    &ldquo;Price Please?&rdquo; DM Auto-Reply Script
                  </p>
                  <button
                    type="button"
                    onClick={() => copyScript('ig-dm', instaDmReplyScript, 'DM reply script')}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
                  >
                    {copiedKey === 'ig-dm' ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" /> Copy Script
                      </>
                    )}
                  </button>
                </div>
                <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background p-4 font-sans text-xs leading-relaxed text-foreground">
                  {instaDmReplyScript}
                </pre>
                <p className="mt-2.5 text-[11px] text-muted-foreground">
                  Save this in Instagram Settings → Business Tools → Saved Replies with shortcut{' '}
                  <code className="font-mono font-semibold text-foreground">/menu</code>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 02. FindMyBites Bio-Link */}
        <section id="chapter-biolink" className="scroll-mt-32 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="font-mono text-xs font-bold text-brand">02.</p>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
                <Link2 className="size-5 text-brand" aria-hidden="true" />
                Use Your FindMyBites Bio-Link as a 24/7 Order Desk
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Unlike generic link-in-bio tools that only show plain buttons, your{' '}
                <span className="font-mono font-semibold text-foreground">
                  findmybites.com/fmb/{bioHandle}
                </span>{' '}
                page displays your logo, promo offer, top dishes with prices, full menu, Google Maps
                directions, and 1-tap WhatsApp checkout — with 0% commission.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copyScript('bio-url', bioLinkUrl, 'Bio-Link URL')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
              >
                {copiedKey === 'bio-url' ? (
                  <>
                    <Check className="size-3.5 text-emerald-600" /> Copied URL
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" /> Copy /fmb/{bioHandle}
                  </>
                )}
              </button>
              {primaryVendor && onOpenBioLink ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBioLink(primaryVendor);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-xs font-bold text-background hover:opacity-90"
                >
                  Preview My Bio-Link
                  <ArrowUpRight className="size-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenListModal('free');
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-xs font-bold text-background hover:opacity-90"
                >
                  Claim Your Free /fmb/ Handle
                  <ArrowUpRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Instagram & Facebook Bio',
                body: 'Paste your /fmb/ link in the Website field so every profile visitor can browse weights, prices, and tap WhatsApp immediately.',
              },
              {
                title: 'WhatsApp Business Profile',
                body: 'Add your /fmb/ link under WhatsApp Business → Business Profile → Website so contacts see your live catalog anytime.',
              },
              {
                title: 'Cake Box & Hamper QR Stickers',
                body: 'Download your free QR Menu Poster inside the Vendor Portal and print small thank-you stickers for every box you deliver.',
              },
              {
                title: 'WhatsApp Status & Society Groups',
                body: 'Share your 9:16 Story Card + /fmb/ link on Friday evenings and festival weeks when families plan weekend orders.',
              },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-extrabold text-foreground">{card.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 03. Google Business Profile (GMB) */}
        <section id="chapter-gmb" className="scroll-mt-32 py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="font-mono text-xs font-bold text-brand">03.</p>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
                <MapPin className="size-5 text-brand" aria-hidden="true" />
                Rank on Google Maps with Google Business Profile
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                When someone searches <em>&ldquo;custom birthday cakes near me&rdquo;</em> or{' '}
                <em>&ldquo;home baker in {brandCity}&rdquo;</em>, Google shows the top 3 Google Maps
                listings before anything else. Listing on Google is 100% free — and linking your
                FindMyBites website gives Google a real, fast menu page to trust.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <a
                  href="https://business.google.com/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-xs font-bold text-background hover:opacity-90"
                >
                  Create Free Google Profile
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDashboard();
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
                >
                  Open Google Setup Kit in Portal
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <ol className="divide-y divide-border rounded-2xl border border-border bg-card">
                {[
                  {
                    step: 'Step 1 · Enter exact brand name & category',
                    body: 'Go to business.google.com/create, type your exact FindMyBites storefront name, and pick the closest primary category (Cake Shop, Bakery, Caterer, or Event Planner).',
                  },
                  {
                    step: 'Step 2 · Home baker? Choose Service-Area Business',
                    body: 'When Google asks if customers visit your address, choose "No" if you work from home. Add your delivery areas instead so your home street address stays completely private.',
                  },
                  {
                    step: 'Step 3 · Paste your FindMyBites Website & Menu URLs',
                    body: `Paste ${storefrontUrl} as your official Website and ${bioLinkUrl} as your Menu link. Now Google shoppers can browse your prices and order on WhatsApp in 2 taps.`,
                  },
                  {
                    step: 'Step 4 · Complete verification & upload 5 real photos',
                    body: 'Verify by phone, SMS, or quick video walkthrough of your kitchen/tools. Upload 5 bright daylight photos of your signature cakes, platters, or setups — listings with photos get 2x more clicks.',
                  },
                  {
                    step: 'Step 5 · Paste your Google links back into FindMyBites',
                    body: 'Open Vendor Portal → Google & Growth tab and paste your Google Maps Place Link + Google Review Link. Your FindMyBites page will automatically show Directions and Google Reviews buttons.',
                  },
                ].map((row) => (
                  <li key={row.step} className="p-4">
                    <p className="text-xs font-extrabold text-foreground">{row.step}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* 04. WhatsApp Business & Review Booster */}
        <section id="chapter-whatsapp" className="scroll-mt-32 py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="font-mono text-xs font-bold text-brand">04.</p>
              <h2 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
                <MessageCircle className="size-5 text-[#25D366]" aria-hidden="true" />
                WhatsApp Business Automation &amp; Review Loop
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Speed wins food orders. Customers usually message 2–3 vendors and book the first one
                who replies clearly with pricing and warmth.
              </p>

              <ul className="mt-5 space-y-3 text-xs text-muted-foreground">
                <li>
                  <strong className="text-foreground">Greeting Message:</strong> Automatically reply
                  to new numbers with your <code className="font-mono">/fmb/</code> menu link and ask
                  for event date, guest count, and flavour preference.
                </li>
                <li>
                  <strong className="text-foreground">Quick Replies:</strong> Create 3 shortcuts —{' '}
                  <code className="font-mono">/menu</code>, <code className="font-mono">/deposit</code>{' '}
                  (50% UPI/bank advance to lock date), and <code className="font-mono">/review</code>.
                </li>
                <li>
                  <strong className="text-foreground">Broadcast Lists (Not Groups):</strong> Save past
                  buyers with month labels (e.g., <em>&ldquo;Nov Birthday Mom&rdquo;</em>) and send
                  warm seasonal pre-order reminders for Christmas, Diwali, Eid, and Valentine’s.
                </li>
              </ul>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-foreground">
                    Post-Order Dual Review Script (Send 2 Hours After Delivery)
                  </p>
                  <button
                    type="button"
                    onClick={() => copyScript('wa-rev', waReviewTemplate, 'Review request script')}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand hover:text-brand"
                  >
                    {copiedKey === 'wa-rev' ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" /> Copy Script
                      </>
                    )}
                  </button>
                </div>
                <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-background p-4 font-sans text-xs leading-relaxed text-foreground">
                  {waReviewTemplate}
                </pre>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Tip: Inside <strong>Vendor Portal → Google &amp; Growth</strong>, you can launch
                  this exact message directly into WhatsApp in 1 tap.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 05. Menu Pricing, Multi-Weight Options & Photography */}
        <section id="chapter-menu" className="scroll-mt-32 py-12">
          <p className="font-mono text-xs font-bold text-brand">05.</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
            <Camera className="size-5 text-brand" aria-hidden="true" />
            Menus, Multi-Weight Pricing &amp; Phone Photography
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Great food sells with the eyes first. Four small upgrades to your FindMyBites product
            catalog immediately raise average order size.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              {
                num: 'A',
                title: 'Use Multi-Weight Variants (500g · 1 kg · 2 kg)',
                body: 'Instead of listing one flat price, turn on weight variants inside the Product Editor. Customers love seeing exact prices for 500g, 1 kg, and 2 kg side by side — and often upgrade from 500g to 1 kg.',
              },
              {
                num: 'B',
                title: 'Shoot Next to a Window (No Kitchen Overhead Flash)',
                body: 'Turn off yellow ceiling lights, place your cake or platter beside natural daylight from a window, use 2x portrait zoom on your phone, and shoot slightly from a 45-degree angle against a clean surface.',
              },
              {
                num: 'C',
                title: 'Tag Dietary Options Clearly (Veg / Eggless / Sugar-Free)',
                body: 'Many families filter specifically for Eggless, 100% Veg, Jaggery, or Sugar-Free treats. Always set the Veg/Non-Veg mark and dietary badges on every menu item so you appear in filtered searches.',
              },
              {
                num: 'D',
                title: 'Protect Your Time with a 50% Advance Deposit Policy',
                body: 'Confirm slots only after a 50% booking advance and state your minimum notice window (e.g., 24h for classic cakes, 72h for custom fondant/catering) right in your storefront description.',
              },
            ].map((tip) => (
              <div key={tip.num} className="rounded-2xl border border-border bg-card p-5">
                <p className="font-mono text-xs font-bold text-brand">{tip.num}.</p>
                <h3 className="mt-1 text-sm font-extrabold text-foreground">{tip.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{tip.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 06. Upgrading to Pro Partner & Business Plus */}
        <section id="chapter-plans" className="scroll-mt-32 py-12 pb-20">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-bold text-brand">06.</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
              <Crown className="size-5 text-brand" aria-hidden="true" />
              Grow Faster with Pro Partner &amp; Business Spotlight (Plus)
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Every vendor keeps 100% of every order with zero commission. Start free forever, and
              upgrade when you want priority placement above free listings, unlimited menu items,
              and multi-city reach.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {SAAS_PLANS.map((plan) => {
              const isPro = plan.id === 'pro';
              const isBusiness = plan.id === 'business';
              const priceLabel = formatPlanPrice(plan, currency);
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col justify-between rounded-2xl border p-6 ${
                    isPro
                      ? 'border-brand bg-brand-soft/25 ring-1 ring-brand/30'
                      : 'border-border bg-card'
                  }`}
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-lg font-extrabold text-foreground">{plan.name}</h3>
                      <span className="text-[11px] font-bold uppercase tracking-wide text-brand">
                        {isBusiness ? 'Plus / #1 Pinned' : isPro ? 'Most Popular' : 'Starter'}
                      </span>
                    </div>
                    <p className="mt-3 font-mono text-3xl font-black tabular-nums text-foreground">
                      {priceLabel}
                      <span className="text-xs font-medium text-muted-foreground">/mo</span>
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{plan.billingNote}</p>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      {plan.tagline}
                    </p>

                    <ul className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-foreground">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (primaryVendor && plan.id !== 'free') {
                        onOpenDashboard();
                      } else {
                        onOpenListModal(plan.id);
                      }
                    }}
                    className={`mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${
                      isPro
                        ? 'bg-brand text-brand-foreground hover:bg-brand-hover'
                        : isBusiness
                          ? 'bg-foreground text-background hover:opacity-90'
                          : 'border border-border bg-background text-foreground hover:border-brand hover:text-brand'
                    }`}
                  >
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    {plan.id === 'free'
                      ? primaryVendor
                        ? 'Manage Free Storefront'
                        : 'Start Free Listing'
                      : plan.id === 'pro'
                        ? primaryVendor
                          ? 'Upgrade to Pro Partner'
                          : 'Launch with Pro Partner'
                        : primaryVendor
                          ? 'Upgrade to Business Plus'
                          : 'Launch with Business Plus'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
