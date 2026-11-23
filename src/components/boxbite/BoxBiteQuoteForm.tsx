import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Copy, MessageCircle } from 'lucide-react';
import { BOX_AND_BITE_CONFIG } from '../../data/boxAndBiteConfig';
import {
  CORPORATE_BUDGET_RANGES,
  CORPORATE_CATEGORIES,
  CorporateQuoteEnquiry,
} from '../../data/boxAndBiteCatalog';

interface BoxBiteQuoteFormProps {
  prefillGiftingType?: string;
  prefillNotes?: string;
  builderSnapshot?: string;
  submittedQuotes: CorporateQuoteEnquiry[];
  onSubmitQuote: (quote: CorporateQuoteEnquiry) => void;
}

const CUSTOMISATION_REQUIREMENTS = [
  'Custom Logo Belly Sleeve',
  'Brand-Matched Satin Ribbon',
  'Printed Leadership / Welcome Card',
  'Multi-City Pan-India Employee Dispatch',
  '100% Vegetarian / Eggless Mandate',
  'Foil Stamping on Rigid Box',
] as const;

export function BoxBiteQuoteForm({
  prefillGiftingType,
  prefillNotes,
  builderSnapshot,
  submittedQuotes,
  onSubmitQuote,
}: BoxBiteQuoteFormProps) {
  const { colors, contact } = BOX_AND_BITE_CONFIG;

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');
  const [giftingType, setGiftingType] = useState(
    prefillGiftingType || CORPORATE_CATEGORIES[0].name
  );
  const [approximateQty, setApproximateQty] = useState('25');
  const [budgetRangeInr, setBudgetRangeInr] = useState<string>(CORPORATE_BUDGET_RANGES[1]);
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState('');
  const [selectedCustomisations, setSelectedCustomisations] = useState<string[]>([
    'Custom Logo Belly Sleeve',
    'Printed Leadership / Welcome Card',
  ]);
  const [notes, setNotes] = useState(prefillNotes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [latestConfirmation, setLatestConfirmation] = useState<CorporateQuoteEnquiry | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    if (prefillGiftingType) setGiftingType(prefillGiftingType);
  }, [prefillGiftingType]);

  useEffect(() => {
    if (prefillNotes) setNotes(prefillNotes);
  }, [prefillNotes]);

  const toggleCustomisation = (item: string) => {
    setSelectedCustomisations((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const minDateStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (companyName.trim().length < 2) {
      nextErrors.companyName = 'Please enter your company or organisation name.';
    }
    if (contactPerson.trim().length < 2) {
      nextErrors.contactPerson = 'Please enter the contact person name.';
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail.trim());
    if (!emailOk) {
      nextErrors.workEmail = 'Please enter a valid work email address.';
    }
    const digits = phoneWhatsapp.replace(/\D/g, '');
    if (digits.length < 10) {
      nextErrors.phoneWhatsapp = 'Enter a valid 10+ digit Phone / WhatsApp number.';
    }
    const qtyNum = Math.round(Number(approximateQty));
    if (!Number.isFinite(qtyNum) || qtyNum < 10) {
      nextErrors.approximateQty = 'Minimum corporate batch quantity is 10 boxes (order single samples via Bag).';
    }
    if (!requiredDeliveryDate) {
      nextErrors.requiredDeliveryDate = 'Please select your target delivery date.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const referenceId = `BB-${new Date().getFullYear()}-${randomCode}`;

    const enquiry: CorporateQuoteEnquiry = {
      id: `quote-${Date.now()}`,
      referenceId,
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      workEmail: workEmail.trim(),
      phoneWhatsapp: phoneWhatsapp.trim(),
      giftingType,
      approximateQty: qtyNum,
      budgetRangeInr,
      requiredDeliveryDate,
      customisations: selectedCustomisations,
      notes: notes.trim(),
      builderSnapshot: builderSnapshot || undefined,
      createdAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'Submitted (Awaiting Review)',
    };

    onSubmitQuote(enquiry);
    setLatestConfirmation(enquiry);
    setCompanyName('');
    setContactPerson('');
    setWorkEmail('');
    setPhoneWhatsapp('');
    setApproximateQty('25');
    setRequiredDeliveryDate('');
    setNotes('');
  };

  const buildWhatsAppLink = (q: CorporateQuoteEnquiry) => {
    const text = [
      `Hello BOX & BITE Corporate Desk (${contact.phoneDisplay})`,
      `Quote Ref: ${q.referenceId}`,
      `Company: ${q.companyName}`,
      `Contact: ${q.contactPerson} (${q.workEmail})`,
      `Format: ${q.giftingType}`,
      `Qty: ${q.approximateQty} boxes | Budget: ${q.budgetRangeInr}`,
      `Target Delivery: ${q.requiredDeliveryDate}`,
      q.customisations.length > 0 ? `Customisations: ${q.customisations.join(', ')}` : '',
      q.builderSnapshot ? `Custom Box Config: ${q.builderSnapshot}` : '',
      q.notes ? `Notes: ${q.notes}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    return `https://wa.me/${contact.whatsappDigits}?text=${encodeURIComponent(text)}`;
  };

  const handleCopyRef = (refId: string) => {
    navigator.clipboard?.writeText(refId).catch(() => undefined);
    setCopiedRef(true);
    window.setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <section
      id="boxbite-quote"
      className="border-t py-16 sm:py-20"
      style={{
        backgroundColor: colors.cream,
        borderColor: colors.hairline,
        color: colors.chocolate,
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left Intro & Direct Desk Details */}
          <div className="space-y-6 lg:col-span-5">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: colors.olive }}
              >
                Corporate Gifting Desk
              </p>
              <h2
                className="mt-2 text-3xl font-semibold leading-tight sm:text-5xl"
                style={{ fontFamily: 'var(--font-editorial)' }}
              >
                Request a Corporate Quote
              </h2>
              <p className="mt-3 text-sm leading-relaxed opacity-85">
                Share your batch size, occasion, and branding preferences. Our team confirms artwork
                mockups, tasting samples, and single-office or pan-India multi-address dispatch
                timelines.
              </p>
            </div>

            {builderSnapshot && (
              <div
                className="rounded-xl border p-4 text-xs"
                style={{ borderColor: colors.caramel, backgroundColor: colors.beige }}
              >
                <p className="font-semibold">Attached Custom Box Configuration</p>
                <p className="mt-1 leading-relaxed opacity-85">{builderSnapshot}</p>
              </div>
            )}

            <div
              className="space-y-3 rounded-xl border p-5 text-xs"
              style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
            >
              <p className="font-semibold uppercase tracking-wider opacity-70">
                Direct Concierge Contact
              </p>
              <p>
                <strong>Email:</strong> {contact.email}
              </p>
              <p>
                <strong>WhatsApp / Phone:</strong> {contact.phoneDisplay}
              </p>
              <p>
                <strong>Hours:</strong> {contact.conciergeHours}
              </p>
              <p>
                <strong>Dispatch:</strong> {contact.serviceCoverage}
              </p>
            </div>

            {submittedQuotes.length > 0 && (
              <div
                className="rounded-xl border p-5"
                style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
                  Recent Saved Enquiries ({submittedQuotes.length})
                </p>
                <div className="mt-3 space-y-2.5">
                  {submittedQuotes.slice(0, 3).map((q) => (
                    <div
                      key={q.id}
                      className="border-t pt-2.5 text-xs first:border-t-0 first:pt-0"
                      style={{ borderColor: colors.hairline }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold">{q.referenceId}</span>
                        <span style={{ color: colors.olive }}>{q.status}</span>
                      </div>
                      <p className="mt-0.5 font-medium">
                        {q.companyName} · {q.approximateQty} boxes
                      </p>
                      <p className="opacity-70">{q.giftingType}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Validated Quote Form / Instant Reference Confirmation */}
          <div
            className="rounded-2xl border p-6 sm:p-8 lg:col-span-7"
            style={{ borderColor: colors.hairline, backgroundColor: '#FFFFFF' }}
          >
            {latestConfirmation ? (
              <div className="space-y-5">
                <div
                  className="rounded-xl border p-5"
                  style={{ borderColor: colors.olive, backgroundColor: colors.oliveSoft }}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-0.5 size-6 shrink-0"
                      style={{ color: colors.olive }}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.olive }}>
                        Quote Request Registered
                      </p>
                      <h3
                        className="mt-1 text-2xl font-semibold"
                        style={{ fontFamily: 'var(--font-editorial)' }}
                      >
                        Reference ID: {latestConfirmation.referenceId}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed opacity-85">
                        Saved for <strong>{latestConfirmation.companyName}</strong> ({latestConfirmation.approximateQty} boxes · {latestConfirmation.budgetRangeInr}).
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="grid grid-cols-1 gap-3 rounded-xl border p-4 text-xs sm:grid-cols-2"
                  style={{ borderColor: colors.hairline, backgroundColor: colors.cream }}
                >
                  <p>
                    <strong>Contact:</strong> {latestConfirmation.contactPerson}
                  </p>
                  <p>
                    <strong>Work Email:</strong> {latestConfirmation.workEmail}
                  </p>
                  <p>
                    <strong>Format:</strong> {latestConfirmation.giftingType}
                  </p>
                  <p>
                    <strong>Target Delivery:</strong> {latestConfirmation.requiredDeliveryDate}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href={buildWhatsAppLink(latestConfirmation)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold transition-colors"
                    style={{ backgroundColor: colors.chocolate, color: colors.cream }}
                  >
                    <MessageCircle className="size-4" aria-hidden="true" />
                    Send Reference on WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyRef(latestConfirmation.referenceId)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-4 py-2.5 text-xs font-semibold"
                    style={{ borderColor: colors.hairline, color: colors.chocolate }}
                  >
                    <Copy className="size-3.5" aria-hidden="true" />
                    {copiedRef ? 'Reference Copied' : 'Copy Reference ID'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLatestConfirmation(null)}
                    className="cursor-pointer rounded-lg px-3 py-2.5 text-xs font-semibold underline opacity-80 hover:opacity-100"
                  >
                    Submit Another Enquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="quote-company" className="block text-xs font-semibold">
                      Company Name *
                    </label>
                    <input
                      id="quote-company"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Meridian Labs Pvt. Ltd."
                      className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
                      style={{
                        borderColor: errors.companyName ? '#9B3B2B' : colors.hairline,
                        backgroundColor: colors.cream,
                        color: colors.chocolate,
                      }}
                    />
                    {errors.companyName && (
                      <p className="mt-1 text-[11px] font-medium text-[#9B3B2B]">
                        {errors.companyName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="quote-person" className="block text-xs font-semibold">
                      Contact Person *
                    </label>
                    <input
                      id="quote-person"
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Full name"
                      className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
                      style={{
                        borderColor: errors.contactPerson ? '#9B3B2B' : colors.hairline,
                        backgroundColor: colors.cream,
                        color: colors.chocolate,
                      }}
                    />
                    {errors.contactPerson && (
                      <p className="mt-1 text-[11px] font-medium text-[#9B3B2B]">
                        {errors.contactPerson}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="quote-email" className="block text-xs font-semibold">
                      Work Email *
                    </label>
                    <input
                      id="quote-email"
                      type="email"
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
                      style={{
                        borderColor: errors.workEmail ? '#9B3B2B' : colors.hairline,
                        backgroundColor: colors.cream,
                        color: colors.chocolate,
                      }}
                    />
                    {errors.workEmail && (
                      <p className="mt-1 text-[11px] font-medium text-[#9B3B2B]">
                        {errors.workEmail}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="quote-phone" className="block text-xs font-semibold">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      id="quote-phone"
                      type="tel"
                      value={phoneWhatsapp}
                      onChange={(e) => setPhoneWhatsapp(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-mono text-sm focus:outline-none"
                      style={{
                        borderColor: errors.phoneWhatsapp ? '#9B3B2B' : colors.hairline,
                        backgroundColor: colors.cream,
                        color: colors.chocolate,
                      }}
                    />
                    {errors.phoneWhatsapp && (
                      <p className="mt-1 text-[11px] font-medium text-[#9B3B2B]">
                        {errors.phoneWhatsapp}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="quote-format" className="block text-xs font-semibold">
                      Type of Gifting *
                    </label>
                    <select
                      id="quote-format"
                      value={giftingType}
                      onChange={(e) => setGiftingType(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
                      style={{
                        borderColor: colors.hairline,
                        backgroundColor: colors.cream,
                        color: colors.chocolate,
                      }}
                    >
                      {CORPORATE_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quote-qty" className="block text-xs font-semibold">
                      Approximate Quantity (Min. 10 Boxes) *
                    </label>
                    <input
                      id="quote-qty"
                      type="number"
                      min={10}
                      max={25000}
                      value={approximateQty}
                      onChange={(e) => setApproximateQty(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-mono text-sm tabular-nums focus:outline-none"
                      style={{
                        borderColor: errors.approximateQty ? '#9B3B2B' : colors.hairline,
                        backgroundColor: colors.cream,
                        color: colors.chocolate,
                      }}
                    />
                    {errors.approximateQty && (
                      <p className="mt-1 text-[11px] font-medium text-[#9B3B2B]">
                        {errors.approximateQty}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="quote-budget" className="block text-xs font-semibold">
                      Budget per Box (INR) *
                    </label>
                    <select
                      id="quote-budget"
                      value={budgetRangeInr}
                      onChange={(e) => setBudgetRangeInr(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
                      style={{
                        borderColor: colors.hairline,
                        backgroundColor: colors.cream,
                        color: colors.chocolate,
                      }}
                    >
                      {CORPORATE_BUDGET_RANGES.map((range) => (
                        <option key={range} value={range}>
                          {range}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quote-date" className="block text-xs font-semibold">
                      Required Delivery Date *
                    </label>
                    <input
                      id="quote-date"
                      type="date"
                      min={minDateStr}
                      value={requiredDeliveryDate}
                      onChange={(e) => setRequiredDeliveryDate(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border px-3 py-2.5 font-mono text-sm focus:outline-none"
                      style={{
                        borderColor: errors.requiredDeliveryDate ? '#9B3B2B' : colors.hairline,
                        backgroundColor: colors.cream,
                        color: colors.chocolate,
                      }}
                    />
                    {errors.requiredDeliveryDate && (
                      <p className="mt-1 text-[11px] font-medium text-[#9B3B2B]">
                        {errors.requiredDeliveryDate}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold">Customisation Requirements</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {CUSTOMISATION_REQUIREMENTS.map((reqItem) => {
                      const checked = selectedCustomisations.includes(reqItem);
                      return (
                        <label
                          key={reqItem}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium"
                          style={{
                            borderColor: checked ? colors.chocolate : colors.hairline,
                            backgroundColor: checked ? colors.beige : colors.cream,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCustomisation(reqItem)}
                            className="size-4"
                            style={{ accentColor: colors.chocolate }}
                          />
                          <span>{reqItem}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="quote-notes" className="block text-xs font-semibold">
                    Custom Branding, Ribbon Colours, Multi-City Split &amp; Dietary Notes
                  </label>
                  <textarea
                    id="quote-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Share ribbon colours, multi-city delivery split, Vegetarian/Non-Vegetarian ratio, or eggless requirements..."
                    className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
                    style={{
                      borderColor: colors.hairline,
                      backgroundColor: colors.cream,
                      color: colors.chocolate,
                    }}
                  />
                </div>

                <div className="flex flex-col items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center" style={{ borderColor: colors.hairline }}>
                  <p className="text-[11px] opacity-70">
                    Generates an instant enquiry reference ID with WhatsApp follow-up.
                  </p>
                  <button
                    type="submit"
                    className="w-full cursor-pointer rounded-lg px-6 py-3 text-xs font-semibold tracking-wider transition-colors sm:w-auto"
                    style={{
                      backgroundColor: colors.chocolate,
                      color: colors.cream,
                    }}
                  >
                    SUBMIT CORPORATE ENQUIRY
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
