/** Output formats the browser can encode with canvas.toBlob (WebP and AVIF are detected at runtime). */
export const outputFormats = ["jpeg", "png", "webp", "avif"] as const;
export type OutputFormat = (typeof outputFormats)[number];

export interface FormatInfo {
  label: string;
  mime: string;
  ext: string;
  /** Has a quality setting (and so can be squeezed to a target size without resizing). */
  lossy: boolean;
  /** Keeps transparency; formats without it get a solid background. */
  alpha: boolean;
}

export const formatInfo: Record<OutputFormat, FormatInfo> = {
  jpeg: { label: "JPG", mime: "image/jpeg", ext: "jpg", lossy: true, alpha: false },
  png: { label: "PNG", mime: "image/png", ext: "png", lossy: false, alpha: true },
  webp: { label: "WebP", mime: "image/webp", ext: "webp", lossy: true, alpha: true },
  avif: { label: "AVIF", mime: "image/avif", ext: "avif", lossy: true, alpha: true },
};

/** Extensions offered in the file picker. HEIC/HEIF are decoded with a WebAssembly fallback. */
export const ACCEPT = "image/*,.heic,.heif,.avif,.webp,.svg";

/** Largest file accepted, to keep a single decode within browser memory limits. */
export const MAX_IMAGE_BYTES = 80 * 1024 * 1024;

/** True when the bytes start an ISO-BMFF HEIF container (HEIC photos from iPhones and many Android phones). */
export function isHeif(bytes: Uint8Array, name = "", mime = ""): boolean {
  if (/^image\/hei[cf]/i.test(mime) || /\.hei[cf]$/i.test(name)) return true;
  if (bytes.length < 12) return false;
  const box = String.fromCharCode(...bytes.subarray(4, 8));
  if (box !== "ftyp") return false;
  const brand = String.fromCharCode(...bytes.subarray(8, 12));
  return ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand);
}

/** "1.4 MB", "86 KB", "512 B". Uses 1000-based units so a "100 KB" limit is never exceeded on any OS. */
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1000 * 1000) return `${(bytes / 1000).toFixed(bytes < 10_000 ? 1 : 0)} KB`;
  return `${(bytes / 1000 / 1000).toFixed(bytes < 10_000_000 ? 2 : 1)} MB`;
}

/** Name for a converted file: same base name, new extension. */
export function outputName(name: string, format: OutputFormat): string {
  const base = name.replace(/\.[^./\\]+$/, "") || "image";
  return `${base}.${formatInfo[format].ext}`;
}

/** Make file names unique for a ZIP: photo.jpg, photo (2).jpg, photo (3).jpg… */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1) return name;
    const dot = name.lastIndexOf(".");
    const unique = dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
    seen.set(unique.toLowerCase(), 1);
    return unique;
  });
}
