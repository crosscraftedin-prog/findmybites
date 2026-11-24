import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  RotateCcw,
  Send,
  Snowflake,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import type { CorporateBoxProduct } from '../data/boxAndBiteCatalog';
import type { CustomMenuDish } from '../data/christmasMenu';
import {
  CurrencyCode,
  LaunchCountry,
  Vendor,
  buildWhatsAppUrl,
  formatMoney,
  getVendorBioHandle,
} from '../data/vendors';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recommendedVendorIds?: string[];
  estimatedBudget?: string;
  checklist?: string[];
  suggestedAction?: 'none' | 'box_and_bite' | 'list_business' | 'christmas_menu';
  isError?: boolean;
}

interface JoshPlannerDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: Vendor[];
  currency: CurrencyCode;
  selectedCountry?: LaunchCountry;
  selectedState?: string;
  userLocationLabel?: string;
  christmasDishes?: CustomMenuDish[];
  boxBiteProducts?: CorporateBoxProduct[];
  onSelectVendor: (vendor: Vendor) => void;
  onOpenBoxAndBite?: () => void;
  onOpenListBusiness?: () => void;
  onJumpToChristmas?: () => void;
  onTrackWhatsAppClick?: (vendorId: string) => void;
}

function buildQuickPrompts(country?: LaunchCountry, locationLabel?: string): string[] {
  const cityHint = locationLabel?.split(',')[0]?.trim();
  if (country === 'Pakistan') {
    const place = cityHint || 'Lahore';
    return [
      `Eggless birthday cake & fudgy brownies in ${place} for 20 guests`,
      `Home bakers & custom cupcakes in ${place}`,
      `Birthday decor + catering plan in ${place}`,
      'How do I list my home bakery on FindMyBites?',
    ];
  }
  if (country === 'Nepal') {
    const place = cityHint || 'Kathmandu';
    return [
      `Custom birthday cake & brownies in ${place}`,
      `Eggless cake & dessert box near ${place}`,
      `Party decor + catering for 40 guests in ${place}`,
      'How do I list my bakery on FindMyBites?',
    ];
  }
  if (country === 'Dubai / UAE') {
    const place = cityHint || 'Dubai';
    return [
      `Custom birthday cake & cupcakes in ${place}`,
      `Luxury party decor + mocktail bar in ${place} for 50 guests`,
      `Eggless & sugar-free cake bakers in ${place}`,
      'How do I list my food or event business?',
    ];
  }
  if (country === 'Sri Lanka') {
    const place = cityHint || 'Colombo';
    return [
      `Birthday cakes & brownies in ${place}`,
      `Wedding & party catering in ${place}`,
      `Eggless dessert boxes in ${place}`,
      'How do I list my bakery on FindMyBites?',
    ];
  }
  if (country === 'Bangladesh') {
    const place = cityHint || 'Dhaka';
    return [
      `Custom birthday cake & brownies in ${place}`,
      `Home bakers & cupcakes in ${place}`,
      `Event catering & decor in ${place}`,
      'How do I list my business on FindMyBites?',
    ];
  }
  const place = cityHint || 'Hyderabad';
  return [
    `Eggless birthday cake & brownies in ${place} for 25 guests`,
    `Birthday party plan in ${place}: cake + decor + catering`,
    'BOX & BITE corporate gifting boxes for 50 employees',
    'Christmas plum cakes & custom festive dinner menu',
  ];
}

function createInitialMessages(country?: LaunchCountry, locationLabel?: string): ChatMessage[] {
  const locText =
    locationLabel || (country && country !== 'All' ? country : 'your city');
  return [
    {
      id: 'welcome-josh',
      role: 'assistant',
      text: `Hi! I'm **Josh**, your FindMyBites × PimpMyParty AI Concierge. I know every live baker, menu item, eggless/sugar-free option, party vendor, BOX & BITE corporate box, and Christmas special in **${locText}**! Tell me what you're craving or planning (occasion, area, guests & budget) and I'll match you with real local stores + a full checklist.`,
    },
  ];
}

function renderFormattedReply(text: string) {
  // Lightweight safe bold renderer (**bold**) without dangerouslySetInnerHTML
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function JoshPlannerDrawer({
  isOpen,
  onOpenChange,
  vendors,
  currency,
  selectedCountry,
  selectedState,
  userLocationLabel,
  christmasDishes = [],
  boxBiteProducts = [],
  onSelectVendor,
  onOpenBoxAndBite,
  onOpenListBusiness,
  onJumpToChristmas,
  onTrackWhatsAppClick,
}: JoshPlannerDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    createInitialMessages(selectedCountry, userLocationLabel)
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickPrompts = useMemo(
    () => buildQuickPrompts(selectedCountry, userLocationLabel),
    [selectedCountry, userLocationLabel]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onOpenChange]);

  const handleResetChat = () => {
    setMessages(createInitialMessages(selectedCountry, userLocationLabel));
    setInput('');
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      // Feed ALL active vendors with full menus, dietary tags, coverage & Christmas offers
      const vendorPayload = vendors
        .filter((v) => v.status !== 'paused' && v.status !== 'pending_review')
        .map((v) => ({
          id: v.id,
          name: v.name,
          slug: v.slug,
          bioHandle: getVendorBioHandle(v),
          marketplace: v.marketplace,
          category: v.category,
          area: v.area,
          city: v.city,
          state: v.state,
          country: v.country,
          allStatesCoverage: v.allStatesCoverage,
          serviceStates: v.serviceStates,
          serviceAreas: v.serviceAreas,
          planTier: v.planTier,
          startingPriceUsd: v.startingPriceUsd,
          rating: v.rating,
          reviewCount: v.reviewCount,
          tagline: v.tagline,
          specialties: v.specialties,
          christmasSpecial: v.christmasSpecial,
          christmasOffer: v.christmasOffer,
          products: (v.products || []).slice(0, 8).map((p) => ({
            name: p.name,
            priceUsd: p.priceUsd,
            unit: p.serves,
            foodType: p.foodType,
            dietaryTags: p.dietaryTags,
            variants: (p.variants || []).slice(0, 3).map((vr) => `${vr.label}`),
          })),
        }));

      const christmasPayload = christmasDishes.slice(0, 35).map((d) => ({
        name: d.name,
        category: d.category,
        foodType: d.foodType,
        priceInr: d.priceInrPerGuest,
        serves: d.portion,
      }));

      const boxBitePayload = boxBiteProducts.slice(0, 20).map((b) => ({
        name: b.name,
        category: b.categoryName,
        priceInr: b.bulkStartingPriceInr,
        moq: b.moqBulk,
        tagline: b.subtitle,
      }));

      const res = await fetch('/api/ai/event-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: nextHistory.slice(-8).map((m) => ({ role: m.role, text: m.text })),
          currency,
          userLocation: userLocationLabel || '',
          userCountry: selectedCountry || 'All',
          userState: selectedState || 'All',
          vendors: vendorPayload,
          christmasDishes: christmasPayload,
          boxBiteProducts: boxBitePayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not reach Josh AI right now.');
      }

      const aiMsg: ChatMessage = {
        id: `josh-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'Here is your personalized plan!',
        recommendedVendorIds: Array.isArray(data.recommendedVendorIds)
          ? data.recommendedVendorIds
          : [],
        estimatedBudget: data.estimatedBudget,
        checklist: Array.isArray(data.checklist) ? data.checklist : [],
        suggestedAction: data.suggestedAction || 'none',
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          isError: true,
          text:
            err instanceof Error
              ? `${err.message} Please try again in a moment.`
              : 'Something went wrong connecting to Josh AI. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <>
      {/* Floating launcher pill matching FindMyBites × PimpMyParty branding */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Open Josh AI Event Planner"
          className="fixed bottom-20 right-3 z-40 inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#EC4899] px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105 sm:px-4 sm:py-3 sm:text-sm lg:bottom-6 lg:right-6"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Ask Josh AI</span>
          <span className="sm:hidden">Josh AI</span>
        </button>
      )}

      {/* Drawer overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]"
          onClick={() => onOpenChange(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Josh AI Event Planner"
            onClick={(e) => e.stopPropagation()}
            className="flex h-[100dvh] w-full max-w-full flex-col border-l border-border bg-card text-card-foreground shadow-2xl sm:max-w-lg md:max-w-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-[#FF6B35]/10 to-[#EC4899]/10 px-4 py-3.5 sm:px-5 sm:py-4">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#EC4899] text-white shadow-sm">
                  <Sparkles className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-bold text-foreground sm:text-base">
                      Josh · AI Food &amp; Event Planner
                    </h2>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Live
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {userLocationLabel
                      ? `Local catalog · ${userLocationLabel}`
                      : selectedCountry && selectedCountry !== 'All'
                        ? `Local catalog · ${selectedCountry}`
                        : 'Cakes, brownies, catering, decor & corporate boxes'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleResetChat}
                  aria-label="Reset conversation"
                  title="New chat"
                  className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close Josh AI Planner"
                  className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {messages.map((msg) => {
                const matchedVendors = (msg.recommendedVendorIds ?? [])
                  .map((id) => vendors.find((v) => v.id === id))
                  .filter((v): v is Vendor => Boolean(v));

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === 'user'
                          ? 'rounded-br-sm bg-brand text-brand-foreground'
                          : msg.isError
                            ? 'rounded-bl-sm border border-destructive/30 bg-destructive/10 text-destructive'
                            : 'rounded-bl-sm border border-border bg-muted/60 text-foreground'
                      }`}
                    >
                      {msg.role === 'assistant' ? renderFormattedReply(msg.text) : msg.text}
                    </div>

                    {/* Budget badge */}
                    {msg.estimatedBudget && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-soft-foreground">
                        <span>Estimated Budget:</span>
                        <span className="font-mono font-bold">{msg.estimatedBudget}</span>
                      </div>
                    )}

                    {/* Recommended clickable vendor cards */}
                    {matchedVendors.length > 0 && (
                      <div className="mt-3 w-full space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Verified Local Matches
                        </p>
                        {matchedVendors.map((v) => (
                          <div
                            key={v.id}
                            className="flex flex-col gap-2 rounded-xl border border-border bg-background p-2.5 transition-all hover:border-brand hover:shadow-sm"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                onSelectVendor(v);
                                onOpenChange(false);
                              }}
                              className="flex w-full cursor-pointer items-center gap-3 text-left"
                            >
                              <img
                                src={v.image}
                                alt={v.name}
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                className="size-13 shrink-0 rounded-lg object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-foreground">
                                  {v.name}
                                </p>
                                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                  <MapPin className="size-3 shrink-0 text-brand" aria-hidden="true" />
                                  {v.area ? `${v.area}, ` : ''}
                                  {v.city}, {v.country}
                                </p>
                                <p className="mt-0.5 truncate text-xs font-semibold text-brand">
                                  {v.category} · From {formatMoney(v.startingPriceUsd, currency)}
                                </p>
                              </div>
                              <ExternalLink
                                className="size-4 shrink-0 text-muted-foreground"
                                aria-hidden="true"
                              />
                            </button>

                            <div className="grid grid-cols-2 gap-1.5 border-t border-border/60 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectVendor(v);
                                  onOpenChange(false);
                                }}
                                className="inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] font-bold text-foreground hover:border-brand hover:text-brand"
                              >
                                <Store className="size-3" aria-hidden="true" />
                                View Menu
                              </button>
                              <a
                                href={buildWhatsAppUrl(
                                  v,
                                  `Hi ${v.name}! Josh AI on FindMyBites recommended you for my celebration. Could you share availability & pricing?`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => onTrackWhatsAppClick?.(v.id)}
                                className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-[#25D366] px-2.5 text-[11px] font-bold text-white hover:bg-[#1ebe5d]"
                              >
                                <MessageCircle className="size-3" aria-hidden="true" />
                                WhatsApp
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Platform Quick Action CTA when relevant */}
                    {msg.suggestedAction === 'box_and_bite' && onOpenBoxAndBite && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChange(false);
                          onOpenBoxAndBite();
                        }}
                        className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#38231E] px-3.5 py-2 text-xs font-bold text-[#FFF8EF] shadow-xs hover:bg-[#2A1915]"
                      >
                        <Briefcase className="size-3.5 text-[#C58B55]" aria-hidden="true" />
                        Open BOX &amp; BITE Corporate Gifting
                      </button>
                    )}

                    {msg.suggestedAction === 'list_business' && onOpenListBusiness && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChange(false);
                          onOpenListBusiness();
                        }}
                        className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-brand-foreground shadow-xs hover:bg-brand-hover"
                      >
                        <Store className="size-3.5" aria-hidden="true" />
                        List Your Business Free (2 Mins)
                      </button>
                    )}

                    {msg.suggestedAction === 'christmas_menu' && onJumpToChristmas && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChange(false);
                          onJumpToChristmas();
                        }}
                        className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
                      >
                        <Snowflake className="size-3.5 text-amber-200" aria-hidden="true" />
                        Explore Christmas Specials &amp; Menu
                      </button>
                    )}

                    {/* Actionable checklist */}
                    {msg.checklist && msg.checklist.length > 0 && (
                      <div className="mt-3 w-full rounded-xl border border-border bg-background/80 p-3">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Your Action Checklist
                        </p>
                        <ul className="space-y-1.5">
                          {msg.checklist.map((step, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs text-foreground"
                            >
                              <CheckCircle2
                                className="mt-0.5 size-3.5 shrink-0 text-emerald-500"
                                aria-hidden="true"
                              />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-brand" aria-hidden="true" />
                  <span>Josh is checking live menus, local bakers &amp; event packages…</span>
                </div>
              )}

              {/* Quick suggestion chips on initial view */}
              {messages.length <= 1 && !loading && (
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Try asking Josh
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        className="cursor-pointer rounded-xl border border-border bg-background px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:border-brand hover:bg-brand-soft/60"
                      >
                        “{prompt}”
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input bar */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask for eggless cakes, brownies, catering, decor…"
                  disabled={loading}
                  className="h-11 flex-1 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Send message to Josh AI"
                  className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl bg-brand text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="size-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
