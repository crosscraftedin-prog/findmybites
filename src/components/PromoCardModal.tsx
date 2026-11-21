import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  Instagram,
  MessageCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { CurrencyCode, Vendor, formatMoney } from '../data/vendors';

interface PromoCardModalProps {
  vendor: Vendor | null;
  currency: CurrencyCode;
  onClose: () => void;
  onTrackShare?: (vendorId: string) => void;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function PromoCardModal({
  vendor,
  currency,
  onClose,
  onTrackShare,
}: PromoCardModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const publicUrl = vendor ? `https://www.findmybites.com/v/${vendor.slug}` : '';

  useEffect(() => {
    if (!vendor) return;
    let active = true;
    QRCode.toDataURL(publicUrl, {
      width: 360,
      margin: 1,
      color: { dark: '#111111', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      active = false;
      window.removeEventListener('keydown', handleKey);
    };
  }, [vendor, publicUrl, onClose]);

  if (!vendor) return null;

  const isParty = vendor.marketplace === 'party';
  const primaryHex = isParty ? '#db2fb2' : '#ef6c22';
  const secondaryHex = isParty ? '#6d28d9' : '#be123c';
  const startPrice = formatMoney(vendor.startingPriceUsd, currency);

  const shareCaption = [
    `${vendor.promoBanner ? `🎉 ${vendor.promoBanner}\n` : ''}Order directly from ${vendor.name} (${vendor.category} in ${vendor.city})!`,
    `Starting from ${startPrice} · Direct WhatsApp ordering with zero commission.`,
    `Browse our full menu & book here: ${publicUrl}`,
  ].join('\n');

  const handleCopyCaption = () => {
    navigator.clipboard?.writeText(shareCaption).catch(() => {});
    setCopiedCaption(true);
    onTrackShare?.(vendor.id);
    window.setTimeout(() => setCopiedCaption(false), 2400);
  };

  const handleDownloadStory = async () => {
    if (!qrDataUrl) return;
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Full-bleed gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGrad.addColorStop(0, '#09090b');
      bgGrad.addColorStop(0.55, '#18181b');
      bgGrad.addColorStop(1, primaryHex);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Top cover photo hero (top 820px)
      const coverImg = await loadImage(vendor.image);
      if (coverImg) {
        const scale = Math.max(1080 / coverImg.width, 860 / coverImg.height);
        const w = coverImg.width * scale;
        const h = coverImg.height * scale;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, 1080, 860);
        ctx.clip();
        ctx.drawImage(coverImg, (1080 - w) / 2, (860 - h) / 2, w, h);
        ctx.restore();
      }

      // Dark vignette over cover image
      const heroOverlay = ctx.createLinearGradient(0, 0, 0, 880);
      heroOverlay.addColorStop(0, 'rgba(0,0,0,0.45)');
      heroOverlay.addColorStop(0.6, 'rgba(0,0,0,0.25)');
      heroOverlay.addColorStop(1, '#09090b');
      ctx.fillStyle = heroOverlay;
      ctx.fillRect(0, 0, 1080, 880);

      // Top Brand Pill
      drawRoundedRect(ctx, 290, 74, 500, 64, 32);
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 24px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FINDMYBITES × PIMPMYPARTY', 540, 114);

      // Optional Promo Offer Ribbon
      if (vendor.promoBanner) {
        drawRoundedRect(ctx, 140, 170, 800, 72, 20);
        const promoGrad = ctx.createLinearGradient(140, 170, 940, 242);
        promoGrad.addColorStop(0, primaryHex);
        promoGrad.addColorStop(1, secondaryHex);
        ctx.fillStyle = promoGrad;
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 28px "Plus Jakarta Sans", system-ui, sans-serif';
        const promoText =
          vendor.promoBanner.length > 42
            ? `${vendor.promoBanner.slice(0, 42)}…`
            : vendor.promoBanner;
        ctx.fillText(`★ ${promoText}`, 540, 215);
      }

      // Optional circular/rounded Logo
      let textStartY = 860;
      if (vendor.logo) {
        const logoImg = await loadImage(vendor.logo);
        if (logoImg) {
          ctx.save();
          drawRoundedRect(ctx, 455, 700, 170, 170, 36);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.clip();
          ctx.drawImage(logoImg, 455, 700, 170, 170);
          ctx.restore();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 6;
          drawRoundedRect(ctx, 455, 700, 170, 170, 36);
          ctx.stroke();
          textStartY = 935;
        }
      }

      // Business Name
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 62px "Plus Jakarta Sans", system-ui, sans-serif';
      const title = vendor.name.length > 22 ? `${vendor.name.slice(0, 22)}…` : vendor.name;
      ctx.fillText(title, 540, textStartY);

      // Category & City
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '600 30px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`${vendor.category}  ·  ${vendor.city}, ${vendor.state}`, 540, textStartY + 54);

      // Tagline
      ctx.fillStyle = '#fde68a';
      ctx.font = '700 28px "Plus Jakarta Sans", system-ui, sans-serif';
      const tag = vendor.tagline.length > 52 ? `${vendor.tagline.slice(0, 52)}…` : vendor.tagline;
      ctx.fillText(tag, 540, textStartY + 108);

      // Price & Rating Highlight Card
      const cardY = textStartY + 155;
      drawRoundedRect(ctx, 110, cardY, 860, 130, 28);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 36px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`Starting ${startPrice}   ·   ★ ${vendor.rating.toFixed(1)}`, 540, cardY + 58);

      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(
        `${vendor.products.length} Packages Available · Direct WhatsApp Booking`,
        540,
        cardY + 102
      );

      // Bottom White QR & CTA Card
      const qrCardY = 1360;
      drawRoundedRect(ctx, 110, qrCardY, 860, 400, 36);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      const qrImg = await loadImage(qrDataUrl);
      if (qrImg) {
        ctx.drawImage(qrImg, 155, qrCardY + 50, 300, 300);
      }

      ctx.textAlign = 'left';
      ctx.fillStyle = '#09090b';
      ctx.font = '800 38px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('Scan to Order', 495, qrCardY + 118);

      ctx.fillStyle = '#52525b';
      ctx.font = '500 26px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('View full menu, photos &', 495, qrCardY + 166);
      ctx.fillText('message us on WhatsApp', 495, qrCardY + 202);

      // Green WhatsApp badge
      drawRoundedRect(ctx, 495, qrCardY + 236, 430, 68, 18);
      ctx.fillStyle = '#25D366';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 28px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`WhatsApp +${vendor.whatsappNumber}`, 710, qrCardY + 280);

      // URL footer
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`findmybites.com/v/${vendor.slug}`, 540, 1835);

      const link = document.createElement('a');
      link.download = `${vendor.slug}-story-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      onTrackShare?.(vendor.id);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`WhatsApp Status & Instagram Story Promo Card for ${vendor.name}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
              <Instagram className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">
                WhatsApp Status &amp; Story Card
              </h3>
              <p className="text-[11px] text-muted-foreground">
                1080×1920 vertical promo PNG ready to post
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close promo card modal"
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5">
          {/* Vertical Story Preview */}
          <div
            className="relative mx-auto aspect-[9/14] w-64 overflow-hidden rounded-2xl border border-border bg-neutral-950 text-white shadow-xl"
          >
            <img
              src={vendor.image}
              alt={vendor.name}
              referrerPolicy="no-referrer"
              className="absolute inset-x-0 top-0 h-1/2 w-full object-cover opacity-80"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(9,9,11,0.92) 48%, ${primaryHex} 100%)`,
              }}
            />

            <div className="relative flex h-full flex-col justify-between p-4 text-center">
              <div>
                <span className="inline-block rounded-full border border-white/25 bg-black/50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest">
                  FindMyBites × PimpMyParty
                </span>
                {vendor.promoBanner && (
                  <p className="mt-2 rounded-lg bg-brand px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                    <Sparkles className="mr-1 inline size-3" aria-hidden="true" />
                    {vendor.promoBanner}
                  </p>
                )}
              </div>

              <div>
                {vendor.logo && (
                  <img
                    src={vendor.logo}
                    alt={`${vendor.name} logo`}
                    className="mx-auto mb-2 size-12 rounded-xl border-2 border-white bg-white object-cover shadow-md"
                  />
                )}
                <h4 className="truncate text-base font-extrabold">{vendor.name}</h4>
                <p className="text-[10px] text-white/85">
                  {vendor.category} · {vendor.city}
                </p>
                <p className="mt-1 font-mono text-xs font-bold text-amber-300">
                  From {startPrice} · ★ {vendor.rating.toFixed(1)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-2.5 text-neutral-900 shadow-md">
                <div className="flex items-center gap-2.5 text-left">
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="Storefront QR"
                      className="size-16 shrink-0 rounded-md border border-neutral-200"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold">Scan to Order</p>
                    <p className="text-[9px] text-neutral-600">
                      Full menu &amp; WhatsApp booking
                    </p>
                    <span className="mt-1 inline-block rounded-md bg-[#25D366] px-2 py-0.5 font-mono text-[9px] font-bold text-white">
                      +{vendor.whatsappNumber}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!qrDataUrl || downloading}
              onClick={() => void handleDownloadStory()}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand px-3.5 py-2.5 text-xs font-bold text-brand-foreground hover:bg-brand-hover disabled:opacity-50"
            >
              <Download className="size-4" aria-hidden="true" />
              {downloading ? 'Rendering…' : 'Download Story PNG'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareCaption)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onTrackShare?.(vendor.id)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#1ebe5d]"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Share on WhatsApp
            </a>
          </div>

          <button
            type="button"
            onClick={handleCopyCaption}
            className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent"
          >
            {copiedCaption ? (
              <Check className="size-3.5 text-[#25D366]" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
            {copiedCaption ? 'Promo caption + link copied!' : 'Copy Instagram / WhatsApp Caption'}
          </button>
        </div>
      </div>
    </div>
  );
}
