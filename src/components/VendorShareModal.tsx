import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Check,
  Copy,
  Instagram,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { CurrencyCode, Vendor, formatMoney } from '../data/vendors';

interface VendorShareModalProps {
  vendor: Vendor | null;
  currency: CurrencyCode;
  onClose: () => void;
  onOpenInstagramStory: (vendor: Vendor) => void;
  onTrackShare?: (vendorId: string) => void;
  onSharedFeedback?: (vendor: Vendor, label: string) => void;
}

export function getVendorProfileShareUrl(vendor: Vendor): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin.replace(/\/$/, '')
      : 'https://www.findmybites.com';
  return `${origin}/v/${encodeURIComponent(vendor.slug)}`;
}

async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback
  }

  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.top = '-9999px';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function VendorShareModal({
  vendor,
  currency,
  onClose,
  onOpenInstagramStory,
  onTrackShare,
  onSharedFeedback,
}: VendorShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [nativeStatus, setNativeStatus] = useState<'idle' | 'shared' | 'copied'>('idle');

  useEffect(() => {
    if (!vendor) return;
    setCopiedLink(false);
    setCopiedCaption(false);
    setNativeStatus('idle');

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [vendor, onClose]);

  if (!vendor) return null;

  const profileUrl = getVendorProfileShareUrl(vendor);
  const priceLabel = formatMoney(vendor.startingPriceUsd, currency);
  const shareTitle = `${vendor.name} — ${vendor.category} in ${vendor.city}`;
  const shareText = `Check out ${vendor.name} (${vendor.category} in ${vendor.city}, ${vendor.country}) — starting from ${priceLabel}. ${vendor.tagline}`;
  const socialCaption = `${vendor.name} · ${vendor.category} in ${vendor.city}\n${vendor.tagline}\nStarting from ${priceLabel} · Order directly on WhatsApp:\n${profileUrl}\n#FindMyBites #${vendor.city.replace(/\s+/g, '')}Food #LocalVendors`;

  const canUseWebShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopyUrl = async () => {
    const ok = await copyTextSafe(profileUrl);
    onTrackShare?.(vendor.id);
    if (ok) {
      setCopiedLink(true);
      onSharedFeedback?.(vendor, `Copied ${vendor.name}'s profile link!`);
      window.setTimeout(() => setCopiedLink(false), 2400);
    }
  };

  const handleCopyCaption = async () => {
    const ok = await copyTextSafe(socialCaption);
    onTrackShare?.(vendor.id);
    if (ok) {
      setCopiedCaption(true);
      onSharedFeedback?.(vendor, `Copied caption & link for ${vendor.name}!`);
      window.setTimeout(() => setCopiedCaption(false), 2400);
    }
  };

  const handleNativeShare = async () => {
    onTrackShare?.(vendor.id);
    if (canUseWebShare) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: profileUrl,
        });
        setNativeStatus('shared');
        onSharedFeedback?.(vendor, `Shared ${vendor.name}!`);
        window.setTimeout(() => setNativeStatus('idle'), 2400);
        return;
      } catch (err) {
        // If user intentionally cancelled native share sheet, do not force clipboard copy
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
      }
    }

    const ok = await copyTextSafe(profileUrl);
    if (ok) {
      setNativeStatus('copied');
      setCopiedLink(true);
      onSharedFeedback?.(vendor, `Copied ${vendor.name}'s link to clipboard!`);
      window.setTimeout(() => {
        setNativeStatus('idle');
        setCopiedLink(false);
      }, 2400);
    }
  };

  const handleChannelClick = (channel: string) => {
    onTrackShare?.(vendor.id);
    onSharedFeedback?.(vendor, `Sharing ${vendor.name} on ${channel}...`);
  };

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    profileUrl
  )}&quote=${encodeURIComponent(shareText)}`;

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${profileUrl}`)}`;

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText
  )}&url=${encodeURIComponent(profileUrl)}`;

  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(
    profileUrl
  )}&text=${encodeURIComponent(shareText)}`;

  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    profileUrl
  )}`;

  const emailHref = `mailto:?subject=${encodeURIComponent(
    shareTitle
  )}&body=${encodeURIComponent(`${shareText}\n\nView storefront & menu:\n${profileUrl}`)}`;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Share ${vendor.name}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
              <Share2 className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-foreground">Share Storefront</h2>
              <p className="text-xs text-muted-foreground">
                Share on Instagram Stories, Facebook, WhatsApp &amp; more
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="grid size-8 cursor-pointer place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[82vh] space-y-4 overflow-y-auto p-5">
          {/* Compact Vendor Preview Strip */}
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3">
            <img
              src={vendor.image}
              alt={vendor.name}
              referrerPolicy="no-referrer"
              className="size-16 shrink-0 rounded-xl border border-border object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold text-foreground">{vendor.name}</p>
                {vendor.verified && (
                  <BadgeCheck className="size-4 shrink-0 text-brand" aria-hidden="true" />
                )}
              </div>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                {vendor.city}, {vendor.country} · {vendor.category}
              </p>
              <div className="mt-1 flex items-center gap-3 text-xs">
                <span className="font-mono font-bold text-brand">from {priceLabel}</span>
                <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                  <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                  <strong className="text-foreground">{vendor.rating.toFixed(1)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Primary Native Web Share + Copy Profile URL */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className={`inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold shadow-sm transition-all ${
                nativeStatus !== 'idle'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand text-brand-foreground hover:bg-brand-hover'
              }`}
            >
              {nativeStatus === 'shared' ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  Shared Successfully!
                </>
              ) : nativeStatus === 'copied' ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  Profile Link Copied to Clipboard!
                </>
              ) : canUseWebShare ? (
                <>
                  <Share2 className="size-4" aria-hidden="true" />
                  Share via Phone / Device Sheet
                </>
              ) : (
                <>
                  <Copy className="size-4" aria-hidden="true" />
                  Copy Storefront Profile Link
                </>
              )}
            </button>

            <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-1.5 pl-3">
              <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                {profileUrl}
              </span>
              <button
                type="button"
                onClick={() => void handleCopyUrl()}
                className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="size-3.5" aria-hidden="true" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" aria-hidden="true" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Instagram Stories Highlight (Opens 9:16 Downloadable Story Card + QR + Link Sticker) */}
          <button
            type="button"
            onClick={() => {
              onTrackShare?.(vendor.id);
              onClose();
              onOpenInstagramStory(vendor);
            }}
            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737] p-3.5 text-left text-white shadow-md transition-transform hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Instagram className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-extrabold">Share to Instagram Stories</p>
                <p className="text-[11px] text-white/90">
                  Generate 9:16 Story Card with QR code &amp; Link Sticker ready to post
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm">
              <Sparkles className="size-3" aria-hidden="true" />
              Story Card
            </span>
          </button>

          {/* Direct Social Channels Grid */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Share Directly On
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <a
                href={facebookHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleChannelClick('Facebook')}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-[#1877F2] hover:bg-[#1877F2]/10"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#1877F2] text-sm font-black text-white">
                  f
                </span>
                Facebook
              </a>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleChannelClick('WhatsApp')}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-[#25D366] hover:bg-[#25D366]/10"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#25D366] text-white">
                  <MessageCircle className="size-4" aria-hidden="true" />
                </span>
                WhatsApp
              </a>

              <a
                href={twitterHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleChannelClick('X')}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-neutral-900 hover:bg-neutral-900/10 dark:hover:border-white/50"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-neutral-900 text-xs font-black text-white dark:bg-white dark:text-neutral-950">
                  X
                </span>
                X / Twitter
              </a>

              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleChannelClick('Telegram')}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-[#229ED9] hover:bg-[#229ED9]/10"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#229ED9] text-white">
                  <Send className="size-3.5" aria-hidden="true" />
                </span>
                Telegram
              </a>

              <a
                href={linkedinHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleChannelClick('LinkedIn')}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-[#0A66C2] hover:bg-[#0A66C2]/10"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#0A66C2] text-xs font-black text-white">
                  in
                </span>
                LinkedIn
              </a>

              <a
                href={emailHref}
                onClick={() => handleChannelClick('Email')}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-brand hover:bg-brand-soft/60"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground">
                  <Mail className="size-3.5" aria-hidden="true" />
                </span>
                Email
              </a>
            </div>
          </div>

          {/* Ready-to-Paste Social Caption */}
          <div className="rounded-2xl border border-border bg-muted/35 p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Ready-to-Paste Caption (Instagram / FB / Status)
              </span>
              <button
                type="button"
                onClick={() => void handleCopyCaption()}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  copiedCaption
                    ? 'bg-emerald-600 text-white'
                    : 'bg-background text-foreground hover:bg-accent'
                }`}
              >
                {copiedCaption ? (
                  <>
                    <Check className="size-3" aria-hidden="true" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-3" aria-hidden="true" />
                    Copy Caption
                  </>
                )}
              </button>
            </div>
            <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
              {socialCaption}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
