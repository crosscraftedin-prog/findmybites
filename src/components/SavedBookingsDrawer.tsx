import { useEffect, useState } from 'react';
import { Calendar, Check, Heart, MessageCircle, Send, Trash2, X } from 'lucide-react';
import {
  BookingEnquiry,
  CurrencyCode,
  Vendor,
  buildWhatsAppUrl,
  formatMoney,
} from '../data/vendors';

interface SavedBookingsDrawerProps {
  activeTab: 'saved' | 'bookings' | null;
  onChangeTab: (tab: 'saved' | 'bookings') => void;
  onClose: () => void;
  savedVendors: Vendor[];
  bookings: BookingEnquiry[];
  currency: CurrencyCode;
  onSelectVendor: (vendor: Vendor) => void;
  onToggleSave: (vendorId: string) => void;
  onCancelBooking: (bookingId: string) => void;
  onTrackWhatsAppClick?: (vendorId: string) => void;
}

export function SavedBookingsDrawer({
  activeTab,
  onChangeTab,
  onClose,
  savedVendors,
  bookings,
  currency,
  onSelectVendor,
  onToggleSave,
  onCancelBooking,
  onTrackWhatsAppClick,
}: SavedBookingsDrawerProps) {
  const [occasion, setOccasion] = useState('Birthday / Celebration');
  const [eventDate, setEventDate] = useState('2026-12-20');
  const [guests, setGuests] = useState(80);
  const [sentIds, setSentIds] = useState<string[]>([]);

  useEffect(() => {
    if (!activeTab) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeTab, onClose]);

  if (!activeTab) return null;

  const markSent = (vendorId: string) => {
    setSentIds((prev) => (prev.includes(vendorId) ? prev : [...prev, vendorId]));
    onTrackWhatsAppClick?.(vendorId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Saved vendors and bookings"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-lg flex-col bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => onChangeTab('saved')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'saved'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Saved ({savedVendors.length})
            </button>
            <button
              type="button"
              onClick={() => onChangeTab('bookings')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Bookings ({bookings.length})
            </button>
          </div>

          <button
            type="button"
            aria-label="Close drawer"
            onClick={onClose}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'saved' ? (
            savedVendors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Heart className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-bold text-foreground">No saved vendors yet</h3>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Shortlist bakers, live counters, and event stylists as you browse to compare them
                  and request quotes on WhatsApp together.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Multi-Vendor WhatsApp Quote Brief */}
                <div className="rounded-2xl border border-brand-border bg-brand-soft/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Send className="size-3.5 text-brand" aria-hidden="true" />
                    Quick Quote Brief for Shortlisted Vendors
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Set your event details once, then tap WhatsApp Quote on each saved vendor below.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      placeholder="Occasion"
                      aria-label="Event occasion"
                      className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none"
                    />
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      aria-label="Event date"
                      className="rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-brand focus:outline-none"
                    />
                    <input
                      type="number"
                      min={5}
                      max={5000}
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value) || 50)}
                      aria-label="Guest count"
                      placeholder="Guests"
                      className="rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {savedVendors.map((vendor) => {
                    const isSent = sentIds.includes(vendor.id);
                    const briefMessage = `Hi ${vendor.name}, I shortlisted you on FindMyBites × PimpMyParty for my ${occasion} on ${eventDate} (${guests} guests) in ${vendor.city}. Could you share your availability & quote for ${vendor.category}?`;
                    return (
                      <div key={vendor.id} className="flex gap-4 py-4 first:pt-0">
                        <img
                          src={vendor.image}
                          alt={vendor.name}
                          referrerPolicy="no-referrer"
                          className="h-20 w-24 shrink-0 rounded-lg bg-muted object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">
                            {vendor.category} · {vendor.city}, {vendor.country}
                          </p>
                          <h4 className="truncate text-sm font-semibold text-foreground">
                            {vendor.name}
                          </h4>
                          <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                            From {formatMoney(vendor.startingPriceUsd, currency)} ·{' '}
                            {vendor.rating.toFixed(2)}★
                          </p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                            <a
                              href={buildWhatsAppUrl(vendor, briefMessage)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => markSent(vendor.id)}
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold text-white transition-colors whitespace-nowrap ${
                                isSent
                                  ? 'bg-emerald-600 hover:bg-emerald-700'
                                  : 'bg-[#25D366] hover:bg-[#1ebe5d]'
                              }`}
                            >
                              {isSent ? (
                                <>
                                  <Check className="size-3" aria-hidden="true" />
                                  Quote Sent
                                </>
                              ) : (
                                <>
                                  <MessageCircle className="size-3" aria-hidden="true" />
                                  WhatsApp Quote
                                </>
                              )}
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onSelectVendor(vendor);
                              }}
                              className="cursor-pointer text-xs font-semibold text-brand hover:underline whitespace-nowrap"
                            >
                              Open Website
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleSave(vendor.id)}
                              className="cursor-pointer text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-foreground">No enquiries sent yet</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Open any vendor mini-website to build a WhatsApp order or send a direct booking
                request.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {b.reference} · {b.status}
                      </p>
                      <h4 className="mt-0.5 text-sm font-semibold text-foreground">{b.vendorName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {b.vendorCategory} · {b.vendorCity}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Cancel enquiry ${b.reference}`}
                      onClick={() => onCancelBooking(b.id)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    <p>
                      <span className="font-semibold text-foreground">Package:</span> {b.packageName}
                    </p>
                    <p className="font-mono tabular-nums">
                      <span className="font-sans font-semibold text-foreground">Event:</span>{' '}
                      {b.eventDate} · {b.guests} guests · {formatMoney(b.estimatedUsd, currency)}
                    </p>
                    {b.notes && <p className="text-muted-foreground">“{b.notes}”</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
