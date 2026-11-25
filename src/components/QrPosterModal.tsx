import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, MessageCircle, Printer, QrCode, X } from 'lucide-react';
import { Vendor } from '../data/vendors';

interface QrPosterModalProps {
  vendor: Vendor | null;
  onClose: () => void;
}

export function QrPosterModal({ vendor, onClose }: QrPosterModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [targetMode, setTargetMode] = useState<'menu' | 'storefront'>('menu');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const displayShortUrl = vendor
    ? targetMode === 'menu'
      ? `findmybites.com/v/${vendor.slug}?menu=1`
      : `findmybites.com/v/${vendor.slug}`
    : '';
  const publicUrl = displayShortUrl ? `https://www.${displayShortUrl}` : '';

  useEffect(() => {
    if (!vendor) return;
    let active = true;
    QRCode.toDataURL(publicUrl, {
      width: 520,
      margin: 2,
      color: {
        dark: '#111111',
        light: '#FFFFFF',
      },
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
  const accentHex = isParty ? '#db2fb2' : '#ef6c22';

  const handleCopy = () => {
    navigator.clipboard?.writeText(publicUrl).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadPoster = async () => {
    if (!qrDataUrl) return;
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 1220;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // White poster background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top branded banner
      ctx.fillStyle = accentHex;
      ctx.fillRect(0, 0, canvas.width, 220);

      // Brand header text
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 26px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FINDMYBITES × PIMPMYPARTY', canvas.width / 2, 74);

      ctx.font = '800 44px "Plus Jakarta Sans", system-ui, sans-serif';
      const titleText =
        vendor.name.length > 26 ? `${vendor.name.slice(0, 26)}…` : vendor.name;
      ctx.fillText(titleText, canvas.width / 2, 138);

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(
        `${vendor.category} · ${vendor.city}, ${vendor.country}`,
        canvas.width / 2,
        184
      );

      // Scan instruction
      ctx.fillStyle = '#111111';
      ctx.font = '800 32px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText('Scan to View Full Menu & Order', canvas.width / 2, 294);

      ctx.fillStyle = '#52525b';
      ctx.font = '500 22px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(
        'Browse products, prices & chat directly on WhatsApp',
        canvas.width / 2,
        334
      );

      // QR frame
      const qrSize = 480;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 380;
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 4;
      ctx.strokeRect(qrX - 18, qrY - 18, qrSize + 36, qrSize + 36);

      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error('QR image failed to load'));
      });
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // WhatsApp pill
      ctx.fillStyle = '#25D366';
      ctx.fillRect(190, 926, 520, 68);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 26px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(`WhatsApp: +${vendor.whatsappNumber}`, canvas.width / 2, 970);

      // URL & footer
      ctx.fillStyle = '#18181b';
      ctx.font = '600 22px monospace';
      ctx.fillText(displayShortUrl, canvas.width / 2, 1054);

      ctx.fillStyle = '#71717a';
      ctx.font = '500 20px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(
        'Place on cake boxes, catering stalls, event booths & Instagram bio',
        canvas.width / 2,
        1120
      );

      const link = document.createElement('a');
      link.download = `${vendor.slug}-${targetMode === 'menu' ? 'qr-menu' : 'qr-poster'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`QR Menu Poster for ${vendor.name}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
              <QrCode className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">Printable QR Menu Poster</h3>
              <p className="text-[11px] text-muted-foreground">
                For cake boxes, live counters, stalls &amp; Instagram bio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR poster modal"
            className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Printable Poster Card Preview */}
        <div className="p-5">
          {/* QR Target Mode Switcher */}
          <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setTargetMode('menu')}
              className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                targetMode === 'menu'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Clean QR Menu
            </button>
            <button
              type="button"
              onClick={() => setTargetMode('storefront')}
              className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                targetMode === 'storefront'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Full Storefront
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-white text-neutral-950 shadow-sm">
            <div
              className={`px-5 py-4 text-center text-white ${
                isParty
                  ? 'bg-gradient-to-r from-[#db2fb2] to-purple-600'
                  : 'bg-gradient-to-r from-[#ef6c22] to-orange-600'
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">
                FindMyBites × PimpMyParty
              </p>
              <h4 className="mt-1 truncate text-lg font-extrabold">{vendor.name}</h4>
              <p className="text-[11px] text-white/90">
                {vendor.category} · {vendor.city}
              </p>
            </div>

            <div className="flex flex-col items-center px-5 py-5 text-center">
              <p className="text-xs font-bold text-neutral-900">
                {targetMode === 'menu'
                  ? 'Scan for Instant Digital Menu & Direct Online Order'
                  : 'Scan to see full menu & order on WhatsApp'}
              </p>

              <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xs">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR code for ${vendor.name}`}
                    className="size-44 object-contain"
                  />
                ) : (
                  <div className="grid size-44 place-items-center text-xs text-neutral-500">
                    Generating QR…
                  </div>
                )}
              </div>

              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#25D366]/15 px-3 py-1 text-xs font-bold text-[#15803d]">
                <MessageCircle className="size-3.5" aria-hidden="true" />
                +{vendor.whatsappNumber}
              </div>

              <p className="mt-2 font-mono text-[11px] text-neutral-600">
                {displayShortUrl}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!qrDataUrl || downloading}
              onClick={handleDownloadPoster}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-brand-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              <Download className="size-4" aria-hidden="true" />
              {downloading ? 'Preparing…' : 'Download PNG'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-accent"
            >
              <Printer className="size-4" aria-hidden="true" />
              Print Card
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/50 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
          >
            {copied ? <Check className="size-3.5 text-[#25D366]" /> : <Copy className="size-3.5" />}
            {copied ? 'Link copied!' : `Copy: ${displayShortUrl}`}
          </button>
        </div>
      </div>
    </div>
  );
}
