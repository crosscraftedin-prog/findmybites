export interface CompressImageOptions {
  maxWidth: number;
  maxHeight: number;
  quality?: number;
  maxChars: number;
}

/**
 * Compresses an existing image data URL to a lightweight JPEG data URL
 * sized safely for Cloud Firestore documents (1MB document cap & low read/write units).
 */
export async function compressDataUrlImage(
  rawDataUrl: string,
  { maxWidth, maxHeight, quality = 0.72, maxChars }: CompressImageOptions
): Promise<string> {
  if (!rawDataUrl.startsWith('data:image/')) {
    return rawDataUrl;
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Invalid image data.'));
    el.src = rawDataUrl;
  });

  let { width, height } = img;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.max(1, Math.round(width * ratio));
  height = Math.max(1, Math.round(height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let q = quality;
  let output = canvas.toDataURL('image/jpeg', q);
  while (output.length > maxChars && q > 0.35) {
    q = Number((q - 0.1).toFixed(2));
    output = canvas.toDataURL('image/jpeg', q);
  }

  if (output.length > maxChars) {
    const scale = Math.sqrt(maxChars / output.length) * 0.88;
    canvas.width = Math.max(80, Math.round(width * scale));
    canvas.height = Math.max(80, Math.round(height * scale));
    const ctx2 = canvas.getContext('2d');
    if (ctx2) {
      ctx2.fillStyle = '#ffffff';
      ctx2.fillRect(0, 0, canvas.width, canvas.height);
      ctx2.drawImage(img, 0, 0, canvas.width, canvas.height);
      output = canvas.toDataURL('image/jpeg', 0.58);
    }
  }

  return output;
}

/**
 * Compresses an uploaded image file to a lightweight JPEG data URL
 * sized safely for Cloud Firestore documents (1MB document cap).
 */
export async function compressImageFile(
  file: File,
  options: CompressImageOptions
): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  return compressDataUrlImage(rawDataUrl, options);
}

/**
 * Extracts latitude & longitude from a Google Maps link or plain "lat, lng" paste.
 */
export function parseCoordsFromMapsLink(
  input: string
): { lat: number; lng: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match @lat,lng (Google Maps URLs) or q=lat,lng or !3dlat!4dlng
  const patterns = [
    /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /[?&](?:q|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/,
  ];

  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
      }
    }
  }
  return null;
}
