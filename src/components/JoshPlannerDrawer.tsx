import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarCheck2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { CurrencyCode, Vendor, buildWhatsAppUrl, formatMoney } from '../data/vendors';

interface JoshPlannerDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: Vendor[];
  currency: CurrencyCode;
  userLocationLabel?: string;
  onSelectVendor: (vendor: Vendor) => void;
}

interface EventPlanData {
  title?: string;
  occasion?: string;
  location?: string;
  guestCount?: string;
  estimatedBudget?: string;
  budgetSplit?: Array<{ category: string; amount: string; notes: string }>;
  timelineChecklist?: string[];
  menuAndDecorIdeas?: string[];
  matchedVendorIds?: string[];
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  plan?: EventPlanData;
  quickReplies?: string[];
}

const INITIAL_QUICK_PROMPTS = [
  'Plan a 150-guest wedding in Mumbai with live counters, decor & cake',
  'Birthday party for 50 guests in Dubai with cake, decor & mocktail bar',
  'Corporate snack boxes & catering for 80 in Bengaluru',
  'Plan a Mehndi / Dholki night in Lahore with live BBQ',
];

export function JoshPlannerDrawer({
  isOpen,
  onOpenChange,
  vendors,
  currency,
  userLocationLabel,
  onSelectVendor,
}: JoshPlannerDrawerProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi, I'm Josh — your AI Event Planner! Tell me your occasion (wedding, birthday, mehendi, corporate), city (India, Dubai, Sri Lanka, Pakistan, Bangladesh, or Nepal), guest count, and budget. I'll collect your details and build a complete plan with matching vendors you can message on WhatsApp.",
      quickReplies: INITIAL_QUICK_PROMPTS,
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/event-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          userLocationLabel,
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          vendors: vendors.map((v) => ({
            id: v.id,
            name: v.name,
            marketplace: v.marketplace,
            category: v.category,
            city: v.city,
            country: v.country,
            planTier: v.planTier,
            startingPriceUsd: v.startingPriceUsd,
            rating: v.rating,
            tagline: v.tagline,
            specialties: v.specialties,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI planner request failed.');
      }

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'Here is your personalized event plan:',
        plan: data.hasPlan ? data.plan : undefined,
        quickReplies: Array.isArray(data.quickReplies) ? data.quickReplies : undefined,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to reach AI Event Planner.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const lastQuickReplies =
    [...messages].reverse().find((m) => m.role === 'assistant' && m.quickReplies?.length)
      ?.quickReplies ?? [];

  return (
    <>
      {/* Floating #FF6B35 AI Planner Trigger */}
      <div className="fixed bottom-20 right-4 z-40 lg:bottom-5">
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Open AI Event Planner Chatbot"
          className="relative grid size-14 cursor-pointer place-items-center rounded-full bg-[#FF6B35] text-white shadow-xl shadow-[#FF6B35]/35 transition-transform hover:scale-105 hover:shadow-2xl"
        >
          <Sparkles className="size-6" aria-hidden="true" />
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-foreground px-1 text-[9px] font-bold text-background">
            AI
          </span>
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="AI Event Planner Chatbot"
          onClick={() => onOpenChange(false)}
        >
          <div
            className="flex h-full w-full max-w-xl flex-col bg-card text-card-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-[#FF6B35] text-white shadow-sm">
                  <Sparkles className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Josh — AI Event Planner Chatbot
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Collects your details · Builds budget, checklist &amp; matches vendors
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close AI planner"
                onClick={() => onOpenChange(false)}
                className="grid size-9 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
              {messages.map((m) => {
                const matchedVendors = (m.plan?.matchedVendorIds ?? [])
                  .map((id) => vendors.find((v) => v.id === id))
                  .filter((v): v is Vendor => Boolean(v));

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-brand text-brand-foreground'
                          : 'border border-border bg-muted/70 text-foreground'
                      }`}
                    >
                      {m.text}
                    </div>

                    {m.plan && (
                      <div className="mt-3 w-full space-y-4 rounded-2xl border border-brand-border bg-background p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                          <div>
                            <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-brand">
                              <CalendarCheck2 className="size-3.5" aria-hidden="true" />
                              Custom AI Event Plan
                            </p>
                            <h3 className="mt-0.5 text-base font-extrabold text-foreground">
                              {m.plan.title || 'Your Celebration Blueprint'}
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {[m.plan.occasion, m.plan.location, m.plan.guestCount]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>
                          {m.plan.estimatedBudget && (
                            <div className="text-right shrink-0">
                              <p className="text-[10px] uppercase text-muted-foreground">Est. Budget</p>
                              <p className="font-mono text-sm font-bold text-brand">
                                {m.plan.estimatedBudget}
                              </p>
                            </div>
                          )}
                        </div>

                        {m.plan.budgetSplit && m.plan.budgetSplit.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-foreground">Budget Breakdown</p>
                            <div className="mt-2 space-y-1.5">
                              {m.plan.budgetSplit.map((row, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 text-xs"
                                >
                                  <div>
                                    <p className="font-semibold text-foreground">{row.category}</p>
                                    <p className="text-muted-foreground">{row.notes}</p>
                                  </div>
                                  <span className="font-mono font-bold text-foreground shrink-0">
                                    {row.amount}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {m.plan.menuAndDecorIdeas && m.plan.menuAndDecorIdeas.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              Recommended Menu, Live Counters &amp; Decor
                            </p>
                            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                              {m.plan.menuAndDecorIdeas.map((idea, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <Sparkles className="mt-0.5 size-3 shrink-0 text-brand" aria-hidden="true" />
                                  <span>{idea}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {m.plan.timelineChecklist && m.plan.timelineChecklist.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-foreground">Action Checklist</p>
                            <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                              {m.plan.timelineChecklist.map((step, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
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

                        {matchedVendors.length > 0 && (
                          <div className="border-t border-border pt-3">
                            <p className="text-xs font-bold text-foreground">
                              Matched Verified Vendors ({matchedVendors.length})
                            </p>
                            <div className="mt-2 space-y-2">
                              {matchedVendors.map((v) => (
                                <div
                                  key={v.id}
                                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5"
                                >
                                  <img
                                    src={v.image}
                                    alt={v.name}
                                    referrerPolicy="no-referrer"
                                    className="size-12 shrink-0 rounded-lg object-cover"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-foreground">
                                      {v.name}
                                    </p>
                                    <p className="truncate text-[11px] text-muted-foreground">
                                      {v.category} · {v.city}, {v.country}
                                    </p>
                                    <p className="font-mono text-[11px] font-semibold text-brand">
                                      From {formatMoney(v.startingPriceUsd, currency)} · {v.rating.toFixed(1)}★
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onOpenChange(false);
                                        onSelectVendor(v);
                                      }}
                                      aria-label={`Open ${v.name} website`}
                                      className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border text-foreground hover:border-brand hover:text-brand"
                                    >
                                      <ExternalLink className="size-3.5" aria-hidden="true" />
                                    </button>
                                    <a
                                      href={buildWhatsAppUrl(
                                        v,
                                        `Hi ${v.name}, Josh AI on FindMyBites matched you for my ${m.plan?.occasion || 'event'} (${m.plan?.guestCount || ''} in ${m.plan?.location || v.city}). Can you share availability & pricing?`
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label={`WhatsApp ${v.name}`}
                                      className="grid size-8 place-items-center rounded-lg bg-[#25D366] text-white hover:bg-[#1ebe5d]"
                                    >
                                      <MessageCircle className="size-3.5" aria-hidden="true" />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/60 px-4 py-3 text-xs text-muted-foreground w-fit">
                  <Loader2 className="size-4 animate-spin text-brand" aria-hidden="true" />
                  Josh AI is crafting your event plan &amp; matching local vendors…
                </div>
              )}

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {!loading && lastQuickReplies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {lastQuickReplies.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="cursor-pointer rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:border-brand hover:text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-border p-4">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-1.5">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  placeholder="e.g., 100-guest birthday in Dubai, budget AED 12,000, need cake & live counter…"
                  className="flex-1 bg-transparent px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Send message to AI planner"
                  className="grid size-10 cursor-pointer place-items-center rounded-lg bg-[#FF6B35] text-white transition-colors hover:bg-[#e55926] disabled:opacity-50"
                >
                  <Send className="size-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
