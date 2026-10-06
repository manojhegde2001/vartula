/** Browser-only image pipeline: decode (with a HEIC fallback), draw onto a canvas, encode. */
import { fitToSize, formatInfo, isHeif, planResize, type ConvertSettings, type OutputFormat } from "../engine";

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

export interface Converted {
  blob: Blob;
  width: number;
  height: number;
  srcWidth: number;
  srcHeight: number;
  /** False when a target size was set but could not be reached. */
  met: boolean;
}

export class CancelledError extends Error {}

const fromBitmap = (bmp: ImageBitmap): Decoded => ({ source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() });

async function decode(file: File): Promise<Decoded> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (isHeif(head, file.name, file.type)) {
    // Safari decodes HEIC natively; elsewhere fall back to libheif compiled to WebAssembly (loaded on first use).
    try {
      return fromBitmap(await createImageBitmap(file));
    } catch {
      const { heicTo } = await import("heic-to/next");
      try {
        return fromBitmap(await heicTo({ blob: file, type: "bitmap" }));
      } catch {
        throw new Error("This HEIC file could not be decoded.");
      }
    }
  }
  try {
    // Applies the EXIF orientation, so phone photos come out upright.
    return fromBitmap(await createImageBitmap(file));
  } catch {
    // SVG (and anything else createImageBitmap rejects) decodes through an <img>.
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("This file isn't an image your browser can read.");
    }
    // SVGs without a width/height have no natural size; give them a sensible one.
    const width = img.naturalWidth || 1024;
    const height = img.naturalHeight || Math.round((width * (img.height || 1)) / (img.width || 1)) || 1024;
    return { source: img, width, height, close: () => URL.revokeObjectURL(url) };
  }
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("The image is too large for your browser to encode. Try resizing it."));
        // Browsers silently fall back to PNG for types they can't encode.
        else if (blob.type !== mime) reject(new Error(`Your browser can't save ${mime.replace("image/", "").toUpperCase()} images.`));
        else resolve(blob);
      },
      mime,
      quality,
    ),
  );
}

const support = new Map<OutputFormat, Promise<boolean>>();

/** Whether this browser's canvas can encode a format (Safari can't write WebP; few browsers write AVIF). */
export function canEncode(format: OutputFormat): Promise<boolean> {
  let p = support.get(format);
  if (!p) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    canvas.getContext("2d")?.fillRect(0, 0, 1, 1);
    p = toBlob(canvas, formatInfo[format].mime, 0.8).then(
      () => true,
      () => false,
    );
    support.set(format, p);
  }
  return p;
}

export async function convertImage(file: File, settings: ConvertSettings, isCancelled: () => boolean): Promise<Converted> {
  const decoded = await decode(file);
  const canvas = document.createElement("canvas");
  try {
    const info = formatInfo[settings.format];
    const plan = planResize(decoded.width, decoded.height, settings.resize);
    let drawnScale = -1;

    const encode = async (quality: number, scale: number) => {
      if (isCancelled()) throw new CancelledError();
      if (scale !== drawnScale) {
        canvas.width = Math.max(1, Math.round(plan.width * scale));
        canvas.height = Math.max(1, Math.round(plan.height * scale));
        const ctx = canvas.getContext("2d", { alpha: info.alpha });
        if (!ctx) throw new Error("Canvas is not available in this browser.");
        if (!info.alpha) {
          ctx.fillStyle = settings.background;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(decoded.source, plan.sx, plan.sy, plan.sw, plan.sh, 0, 0, canvas.width, canvas.height);
        drawnScale = scale;
      }
      const blob = await toBlob(canvas, info.mime, quality);
      return { blob, size: blob.size, width: canvas.width, height: canvas.height };
    };

    const maxQuality = settings.quality / 100;
    const base = { srcWidth: decoded.width, srcHeight: decoded.height };
    if (settings.targetKb && settings.targetKb > 0) {
      const fit = await fitToSize(encode, {
        target: settings.targetKb * 1000,
        maxQuality: info.lossy ? maxQuality : 1,
        lossy: info.lossy,
        width: plan.width,
        height: plan.height,
      });
      return { ...fit.result, ...base, met: fit.met };
    }
    return { ...(await encode(maxQuality, 1)), ...base, met: true };
  } finally {
    decoded.close();
    // Release the backing store now rather than at the next GC.
    canvas.width = canvas.height = 0;
  }
}
