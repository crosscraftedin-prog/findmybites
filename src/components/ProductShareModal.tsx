import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Instagram,
  Link2,
  Loader2,
  MessageCircle,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CurrencyCode,
  Vendor,
  VendorProduct,
  VendorProductVariant,
  formatMoney,
} from '../data/vendors';

interface ProductShareModalProps {
  vendor: Vendor | null;
  product: VendorProduct | null;
  selectedVariant?: VendorProductVariant | null;
  currency: CurrencyCode;
  onClose: () => void;
  onTrackShare?: (vendorId: string) => void;
}

type CardFormat = 'story' | 'post';

function getProductShareUrl(vendor: Vendor, product: VendorProduct): string {
  const origin =
    typeof window !== 'undefined' &&
    window.location.origin.startsWith('http') &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1') &&
    window.location.hostname.includes('findmybites.com')
      ? window.location.origin
      : 'https://www.findmybites.com';
  return `${origin}/v/${encodeURIComponent(vendor.slug)}?item=${encodeURIComponent(product.id)}`;
}

async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function loadCanvasImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    const timeout = window.setTimeout(() => resolve(null), 6000);
    img.onload = () => {
      window.clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timeout);
      resolve(null);
    };
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
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length > 3 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trim();
    }
    if (words.join(' ').length > lines.join(' ').length) {
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const dx = x + (w - drawW) / 2;
  const dy = y + (h - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

async function generateProductCardBlob(params: {
  vendor: Vendor;
  product: VendorProduct;
  priceText: string;
  servesText: string;
  productUrl: string;
  format: CardFormat;
}): Promise<Blob | null> {
  const { vendor, product, priceText, servesText, productUrl, format } = params;
  const isStory = format === 'story';
  const width = 1080;
  const height = isStory ? 1920 : 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Rich warm editorial background
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#16110e');
  bg.addColorStop(0.5, '#1f1510');
  bg.addColorStop(1, '#0f0c0a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle ambient warm glow
  const glow = ctx.createRadialGradient(width * 0.5, height * 0.28, 60, width * 0.5, height * 0.28, 680);
  glow.addColorStop(0, 'rgba(249, 115, 22, 0.26)');
  glow.addColorStop(0.55, 'rgba(234, 88, 12, 0.08)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const [photo, qrDataUrl] = await Promise.all([
    loadCanvasImage(product.image || vendor.image),
    QRCode.toDataURL(productUrl, {
      width: 240,
      margin: 1,
      color: { dark: '#111111', light: '#ffffff' },
    }).catch(() => ''),
  ]);
  const qrImg = qrDataUrl ? await loadCanvasImage(qrDataUrl) : null;

  if (isStory) {
    // ── 9:16 INSTAGRAM STORY LAYOUT (1080 × 1920) ──
    // Top Brand Pill
    drawRoundedRect(ctx, 290, 72, 500, 56, 28);
    ctx.fillStyle = 'rgba(249, 115, 22, 0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fdba74';
    ctx.font = '700 24px Inter, system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ORDER NOW ON FINDMYBITES.COM', width / 2, 108);

    // Vendor Name & City
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 44px Inter, system-ui, -apple-system, sans-serif';
    const vendorNameClipped =
      vendor.name.length > 28 ? `${vendor.name.slice(0, 27)}…` : vendor.name;
    ctx.fillText(vendorNameClipped, width / 2, 186);

    ctx.fillStyle = '#d6d3d1';
    ctx.font = '600 26px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillText(`${vendor.area}, ${vendor.city} · ★ ${vendor.rating.toFixed(1)}`, width / 2, 228);

    // Hero Product Card Container
    const cardX = 64;
    const cardY = 276;
    const cardW = width - 128;
    const cardH = 1090;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 44);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Product Photo Area (top 720px of card)
    const imgH = 720;
    ctx.save();
    drawRoundedRect(ctx, cardX + 20, cardY + 20, cardW - 40, imgH, 32);
    ctx.clip();
    ctx.fillStyle = '#f5f5f4';
    ctx.fillRect(cardX + 20, cardY + 20, cardW - 40, imgH);
    if (photo) {
      drawCoverImage(ctx, photo, cardX + 20, cardY + 20, cardW - 40, imgH);
    } else {
      ctx.fillStyle = '#fff7ed';
      ctx.fillRect(cardX + 20, cardY + 20, cardW - 40, imgH);
      ctx.fillStyle = '#ea580c';
      ctx.font = '800 56px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(vendor.name.slice(0, 18), width / 2, cardY + 380);
    }
    ctx.restore();

    // Veg / Non-Veg Badge on photo top-left
    if (product.foodType === 'veg' || product.foodType === 'non-veg') {
      const isVeg = product.foodType === 'veg';
      drawRoundedRect(ctx, cardX + 46, cardY + 46, isVeg ? 132 : 176, 52, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();
      ctx.strokeStyle = isVeg ? '#15803d' : '#dc2626';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cardX + 74, cardY + 72, 10, 0, Math.PI * 2);
      ctx.fillStyle = isVeg ? '#16a34a' : '#dc2626';
      ctx.fill();

      ctx.fillStyle = isVeg ? '#15803d' : '#b91c1c';
      ctx.font = '800 24px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(isVeg ? 'VEG' : 'NON-VEG', cardX + 94, cardY + 80);
    }

    // Price Badge on photo bottom-right
    ctx.font = '800 42px Inter, system-ui, sans-serif';
    const priceW = Math.max(190, ctx.measureText(priceText).width + 68);
    drawRoundedRect(ctx, cardX + cardW - 46 - priceW, cardY + imgH - 68, priceW, 74, 37);
    ctx.fillStyle = '#ea580c';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(priceText, cardX + cardW - 46 - priceW / 2, cardY + imgH - 18);

    // Product Title + Serves + Description inside white card
    ctx.textAlign = 'left';
    ctx.fillStyle = '#78716c';
    ctx.font = '700 26px Inter, system-ui, sans-serif';
    ctx.fillText(servesText || product.serves || 'Freshly Made to Order', cardX + 44, cardY + imgH + 74);

    ctx.fillStyle = '#111827';
    ctx.font = '800 48px Inter, system-ui, sans-serif';
    const titleLines = wrapCanvasText(ctx, product.name, cardW - 88, 2);
    titleLines.forEach((line, idx) => {
      ctx.fillText(line, cardX + 44, cardY + imgH + 136 + idx * 58);
    });

    const descStartY = cardY + imgH + 136 + titleLines.length * 58 + 16;
    ctx.fillStyle = '#57534e';
    ctx.font = '500 26px Inter, system-ui, sans-serif';
    const descLines = wrapCanvasText(
      ctx,
      product.description || `Freshly prepared by ${vendor.name} in ${vendor.city}.`,
      cardW - 88,
      2
    );
    descLines.forEach((line, idx) => {
      ctx.fillText(line, cardX + 44, descStartY + idx * 36);
    });

    // Instagram Link Sticker Callout Box (encourages tapping the IG Link Sticker!)
    const ctaY = 1412;
    drawRoundedRect(ctx, 92, ctaY, width - 184, 128, 32);
    const ctaGrad = ctx.createLinearGradient(92, ctaY, width - 92, ctaY + 128);
    ctaGrad.addColorStop(0, '#f97316');
    ctaGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = ctaGrad;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '800 34px Inter, system-ui, sans-serif';
    ctx.fillText('TAP LINK STICKER TO ORDER', width / 2, ctaY + 56);
    ctx.fillStyle = '#ffedd5';
    ctx.font = '700 25px Inter, system-ui, sans-serif';
    ctx.fillText(`findmybites.com/v/${vendor.slug}`, width / 2, ctaY + 98);

    // Bottom QR + Direct FindMyBites Bar
    const footerY = 1588;
    drawRoundedRect(ctx, 64, footerY, width - 128, 246, 36);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (qrImg) {
      drawRoundedRect(ctx, 98, footerY + 28, 190, 190, 22);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.drawImage(qrImg, 108, footerY + 38, 170, 170);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fdba74';
    ctx.font = '800 24px Inter, system-ui, sans-serif';
    ctx.fillText('SCAN OR TAP TO ORDER DIRECT', 322, footerY + 84);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px Inter, system-ui, sans-serif';
    ctx.fillText('FindMyBites × PimpMyParty', 322, footerY + 136);

    ctx.fillStyle = '#d6d3d1';
    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillText('0% Commission · Direct WhatsApp Ordering', 322, footerY + 184);
  } else {
    // ── 1:1 INSTAGRAM FEED POST LAYOUT (1080 × 1080) ──
    // Full-bleed top hero product image (680px)
    ctx.save();
    drawRoundedRect(ctx, 40, 40, width - 80, 640, 36);
    ctx.clip();
    ctx.fillStyle = '#f5f5f4';
    ctx.fillRect(40, 40, width - 80, 640);
    if (photo) {
      drawCoverImage(ctx, photo, 40, 40, width - 80, 640);
    } else {
      ctx.fillStyle = '#fff7ed';
      ctx.fillRect(40, 40, width - 80, 640);
    }
    // Bottom vignette on photo
    const vig = ctx.createLinearGradient(0, 460, 0, 680);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.68)');
    ctx.fillStyle = vig;
    ctx.fillRect(40, 460, width - 80, 220);
    ctx.restore();

    // Brand Badge top-left
    drawRoundedRect(ctx, 68, 68, 300, 52, 26);
    ctx.fillStyle = 'rgba(17, 17, 17, 0.82)';
    ctx.fill();
    ctx.fillStyle = '#fdba74';
    ctx.font = '800 22px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FINDMYBITES.COM', 218, 102);

    // Price pill bottom-right of image
    ctx.font = '800 40px Inter, system-ui, sans-serif';
    const priceW = Math.max(180, ctx.measureText(priceText).width + 64);
    drawRoundedRect(ctx, width - 68 - priceW, 586, priceW, 70, 35);
    ctx.fillStyle = '#ea580c';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(priceText, width - 68 - priceW / 2, 634);

    // Bottom info card
    drawRoundedRect(ctx, 40, 708, width - 80, 332, 36);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Product title & vendor details on left
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ea580c';
    ctx.font = '800 24px Inter, system-ui, sans-serif';
    const vendorSub = `${vendor.name} · ${vendor.city}`.slice(0, 42);
    ctx.fillText(vendorSub, 78, 766);

    ctx.fillStyle = '#111827';
    ctx.font = '800 42px Inter, system-ui, sans-serif';
    const postTitleLines = wrapCanvasText(ctx, product.name, 650, 2);
    postTitleLines.forEach((line, idx) => {
      ctx.fillText(line, 78, 822 + idx * 50);
    });

    ctx.fillStyle = '#57534e';
    ctx.font = '600 25px Inter, system-ui, sans-serif';
    ctx.fillText(
      servesText || product.serves || 'Freshly prepared to order',
      78,
      822 + postTitleLines.length * 50 + 22
    );

    ctx.fillStyle = '#111827';
    ctx.font = '700 24px Inter, system-ui, sans-serif';
    ctx.fillText(`Order online: findmybites.com/v/${vendor.slug}`, 78, 998);

    // QR Code on right
    if (qrImg) {
      drawRoundedRect(ctx, width - 278, 744, 206, 206, 22);
      ctx.fillStyle = '#f5f5f4';
      ctx.fill();
      ctx.drawImage(qrImg, width - 266, 756, 182, 182);

      ctx.fillStyle = '#57534e';
      ctx.font = '700 18px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN TO ORDER', width - 175, 984);
    }
  }

  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.96);
    } catch {
      resolve(null);
    }
  });
}

export function ProductShareModal({
  vendor,
  product,
  selectedVariant,
  currency,
  onClose,
  onTrackShare,
}: ProductShareModalProps) {
  const [cardFormat, setCardFormat] = useState<CardFormat>('story');
  const [busyMode, setBusyMode] = useState<'story' | 'post' | 'download' | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!vendor || !product) return;
    setFeedback(null);
    setCopiedLink(false);
    setCopiedCaption(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [vendor, product, onClose]);

  const shareData = useMemo(() => {
    if (!vendor || !product) return null;
    const productUrl = getProductShareUrl(vendor, product);
    const priceUsd = selectedVariant ? selectedVariant.priceUsd : product.priceUsd;
    const priceText = formatMoney(priceUsd, currency);
    const servesText = selectedVariant
      ? selectedVariant.serves
        ? `${selectedVariant.label} · ${selectedVariant.serves}`
        : selectedVariant.label
      : product.serves;
    const itemLabel = selectedVariant
      ? `${product.name} (${selectedVariant.label})`
      : product.name;

    const shortCaption = `${itemLabel} (${priceText}) by ${vendor.name} in ${vendor.city} — Order directly on FindMyBites!`;
    const igPostCaption = `${itemLabel} — ${priceText}\nFreshly crafted by ${vendor.name} (${vendor.area}, ${vendor.city}).\n\nOrder directly on FindMyBites (0% commission):\n${productUrl}\n\n#FindMyBites #${vendor.city.replace(/[^a-zA-Z0-9]/g, '')}Food #HomeBakers #CakesNearMe #OrderOnline`;

    return {
      productUrl,
      priceText,
      servesText,
      itemLabel,
      shortCaption,
      igPostCaption,
      facebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}&quote=${encodeURIComponent(shortCaption)}`,
      xUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortCaption)}&url=${encodeURIComponent(productUrl)}`,
      linkedinUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(`${shortCaption}\n${productUrl}`)}`,
    };
  }, [vendor, product, selectedVariant, currency]);

  if (!vendor || !product || !shareData) return null;

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleInstagramShare = async (format: CardFormat) => {
    setCardFormat(format);
    setBusyMode(format);
    setFeedback(null);
    onTrackShare?.(vendor.id);

    // Always copy the clickable FindMyBites link (for Story Link Sticker) or caption (for Post)
    const textToCopy = format === 'story' ? shareData.productUrl : shareData.igPostCaption;
    await copyTextSafe(textToCopy);

    const blob = await generateProductCardBlob({
      vendor,
      product,
      priceText: shareData.priceText,
      servesText: shareData.servesText,
      productUrl: shareData.productUrl,
      format,
    });

    if (!blob) {
      setBusyMode(null);
      setFeedback(
        format === 'story'
          ? 'FindMyBites product link copied! Paste it into your Instagram Story Link Sticker.'
          : 'Caption & FindMyBites link copied! Paste it into your Instagram Post.'
      );
      return;
    }

    const safeSlug = product.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const fileName = `findmybites-${safeSlug || 'product'}-${format === 'story' ? 'story-9x16' : 'post-1x1'}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });

    let sharedViaNative = false;
    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: shareData.itemLabel,
          text:
            format === 'story'
              ? `Tap link to order on FindMyBites: ${shareData.productUrl}`
              : shareData.igPostCaption,
          url: shareData.productUrl,
        });
        sharedViaNative = true;
      }
    } catch {
      // User cancelled native share or browser blocked files — fall back to direct PNG download
    }

    if (!sharedViaNative) {
      triggerDownload(blob, fileName);
    }

    setBusyMode(null);
    if (format === 'story') {
      setFeedback(
        sharedViaNative
          ? 'Shared to Instagram! Product link is copied — tap Sticker → Link → Paste in Story so customers click straight to FindMyBites.'
          : '9:16 Story card downloaded & FindMyBites link copied! Upload to Instagram Story, then tap Sticker → Link → Paste so customers click straight to this product.'
      );
    } else {
      setFeedback(
        sharedViaNative
          ? '1:1 Post card shared & caption with FindMyBites link copied to clipboard!'
          : '1:1 Instagram Post card downloaded & caption with FindMyBites link copied — paste directly into your post!'
      );
    }
  };

  const handleDownloadOnly = async () => {
    setBusyMode('download');
    setFeedback(null);
    onTrackShare?.(vendor.id);

    const blob = await generateProductCardBlob({
      vendor,
      product,
      priceText: shareData.priceText,
      servesText: shareData.servesText,
      productUrl: shareData.productUrl,
      format: cardFormat,
    });
    if (blob) {
      const safeSlug = product.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
      triggerDownload(
        blob,
        `findmybites-${safeSlug || 'product'}-${cardFormat === 'story' ? 'story-9x16' : 'post-1x1'}.png`
      );
      setFeedback(
        cardFormat === 'story'
          ? '9:16 Instagram Story PNG downloaded with scannable QR code!'
          : '1:1 Instagram Post PNG downloaded with scannable QR code!'
      );
    }
    setBusyMode(null);
  };

  const handleCopyProductLink = async () => {
    const ok = await copyTextSafe(shareData.productUrl);
    if (ok) {
      setCopiedLink(true);
      onTrackShare?.(vendor.id);
      window.setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const handleCopyCaption = async () => {
    const ok = await copyTextSafe(shareData.igPostCaption);
    if (ok) {
      setCopiedCaption(true);
      window.setTimeout(() => setCopiedCaption(false), 2200);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-share-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border bg-background/80 px-5 py-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-brand">
              <Share2 className="size-3" aria-hidden="true" />
              Share Product to Socials
            </div>
            <h2
              id="product-share-title"
              className="mt-1 truncate text-lg font-extrabold text-foreground"
            >
              {shareData.itemLabel}
            </h2>
            <p className="text-xs text-muted-foreground">
              {vendor.name} · {shareData.priceText} · Links straight to FindMyBites
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product share modal"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-accent"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="grid grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-12">
          {/* Left: Live Story / Post Card Preview */}
          <div className="flex flex-col items-center md:col-span-5">
            <div className="mb-3 inline-flex rounded-xl border border-border bg-muted/60 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCardFormat('story')}
                className={`cursor-pointer rounded-lg px-3 py-1.5 transition-colors ${
                  cardFormat === 'story'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Story (9:16)
              </button>
              <button
                type="button"
                onClick={() => setCardFormat('post')}
                className={`cursor-pointer rounded-lg px-3 py-1.5 transition-colors ${
                  cardFormat === 'post'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Post (1:1)
              </button>
            </div>

            {/* Preview Frame */}
            <div
              className={`relative w-full overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-b from-[#1a130f] via-[#221712] to-[#0f0c0a] p-3 text-white shadow-xl transition-all ${
                cardFormat === 'story' ? 'max-w-[230px] aspect-[9/16]' : 'max-w-[250px] aspect-square'
              } flex flex-col justify-between`}
            >
              {cardFormat === 'story' ? (
                <>
                  <div className="text-center">
                    <span className="inline-block rounded-full border border-orange-400/40 bg-orange-500/20 px-2 py-0.5 text-[8px] font-bold tracking-wider text-orange-200">
                      FINDMYBITES.COM
                    </span>
                    <p className="mt-1 truncate text-[11px] font-extrabold">{vendor.name}</p>
                    <p className="truncate text-[9px] text-stone-300">
                      {vendor.area}, {vendor.city}
                    </p>
                  </div>

                  <div className="my-2 overflow-hidden rounded-xl bg-white p-1.5 text-stone-900 shadow-md">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-stone-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-1.5 right-1.5 rounded-full bg-orange-600 px-2 py-0.5 font-mono text-[10px] font-extrabold text-white">
                        {shareData.priceText}
                      </span>
                    </div>
                    <div className="px-1 pb-1 pt-1.5">
                      <p className="truncate text-[9px] font-semibold text-stone-500">
                        {shareData.servesText}
                      </p>
                      <p className="line-clamp-2 text-[11px] font-extrabold leading-tight text-stone-900">
                        {product.name}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-2 py-1.5 text-center shadow-sm">
                      <p className="text-[9px] font-extrabold tracking-wide text-white">
                        🔗 TAP LINK TO ORDER
                      </p>
                      <p className="truncate text-[8px] font-semibold text-orange-100">
                        findmybites.com/v/{vendor.slug}
                      </p>
                    </div>
                    <p className="text-center text-[8px] text-stone-400">
                      Includes scannable QR code on PNG
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative flex-1 overflow-hidden rounded-xl bg-stone-100">
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-[8px] font-extrabold text-orange-200">
                      FINDMYBITES.COM
                    </span>
                    <span className="absolute bottom-2 right-2 rounded-full bg-orange-600 px-2 py-0.5 font-mono text-[10px] font-extrabold text-white">
                      {shareData.priceText}
                    </span>
                  </div>
                  <div className="mt-2 rounded-xl bg-white px-2.5 py-2 text-stone-900">
                    <p className="truncate text-[8px] font-extrabold text-orange-600">
                      {vendor.name} · {vendor.city}
                    </p>
                    <p className="truncate text-[11px] font-extrabold">{product.name}</p>
                    <p className="truncate text-[8px] font-medium text-stone-500">
                      findmybites.com/v/{vendor.slug}
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              disabled={busyMode !== null}
              onClick={() => void handleDownloadOnly()}
              className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
            >
              {busyMode === 'download' ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-3.5" aria-hidden="true" />
              )}
              Download {cardFormat === 'story' ? '9:16 Story' : '1:1 Post'} PNG
            </button>
          </div>

          {/* Right: 5 Social Share Actions + Link Sticker Guide */}
          <div className="flex flex-col justify-between gap-4 md:col-span-7">
            <div className="space-y-3">
              {/* Instagram Section */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Instagram (Auto-generates card + copies FindMyBites link)
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={busyMode !== null}
                    onClick={() => void handleInstagramShare('story')}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] px-4 py-3 text-xs font-extrabold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
                  >
                    {busyMode === 'story' ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Instagram className="size-4" aria-hidden="true" />
                    )}
                    Instagram Stories
                  </button>

                  <button
                    type="button"
                    disabled={busyMode !== null}
                    onClick={() => void handleInstagramShare('post')}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-4 py-3 text-xs font-extrabold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
                  >
                    {busyMode === 'post' ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles className="size-4" aria-hidden="true" />
                    )}
                    Instagram Post
                  </button>
                </div>

                {/* Clear 2-Step Instagram Story Clickable Link Tip */}
                <div className="mt-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-foreground">
                  <p className="font-bold text-amber-800 dark:text-amber-300">
                    Make your Instagram Story clickable to FindMyBites:
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    1. Tap <strong>Instagram Stories</strong> above (saves 9:16 card &amp; auto-copies your direct product link).{' '}
                    2. In Instagram Story, tap <strong>Sticker → Link → Paste</strong> so customers tap straight to this product on FindMyBites.
                  </p>
                </div>
              </div>

              {/* Facebook, X, LinkedIn, WhatsApp Direct Share Buttons */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Direct Social Share (Opens with product link &amp; preview)
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {/* Facebook */}
                  <a
                    href={shareData.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onTrackShare?.(vendor.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-3.5 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-95"
                  >
                    <svg className="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                    Facebook
                    <ExternalLink className="size-3 opacity-80" aria-hidden="true" />
                  </a>

                  {/* X (Twitter) */}
                  <a
                    href={shareData.xUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onTrackShare?.(vendor.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-3.5 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-neutral-950"
                  >
                    <svg className="size-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share on X
                    <ExternalLink className="size-3 opacity-80" aria-hidden="true" />
                  </a>

                  {/* LinkedIn */}
                  <a
                    href={shareData.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onTrackShare?.(vendor.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A66C2] px-3.5 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-95"
                  >
                    <svg className="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                    </svg>
                    LinkedIn
                    <ExternalLink className="size-3 opacity-80" aria-hidden="true" />
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={shareData.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onTrackShare?.(vendor.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3.5 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-95"
                  >
                    <MessageCircle className="size-4" aria-hidden="true" />
                    WhatsApp
                    <ExternalLink className="size-3 opacity-80" aria-hidden="true" />
                  </a>
                </div>
              </div>

              {feedback && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {feedback}
                </div>
              )}
            </div>

            {/* Direct FindMyBites Product Deep-Link Box */}
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-[11px] font-bold text-muted-foreground">
                Direct FindMyBites Product Link (for Instagram Link Sticker or Bio)
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-1.5">
                <Link2 className="ml-2 size-4 shrink-0 text-brand" aria-hidden="true" />
                <input
                  type="text"
                  readOnly
                  aria-label="Direct product link"
                  value={shareData.productUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleCopyProductLink()}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-brand-foreground transition-colors hover:bg-brand-hover"
                >
                  {copiedLink ? (
                    <>
                      <Check className="size-3.5" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" aria-hidden="true" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyCaption()}
                className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-brand"
              >
                {copiedCaption ? (
                  <>
                    <Check className="size-3 text-emerald-500" aria-hidden="true" />
                    Caption &amp; hashtags copied!
                  </>
                ) : (
                  <>
                    <Copy className="size-3" aria-hidden="true" />
                    Copy ready-made Instagram Post caption &amp; hashtags
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
