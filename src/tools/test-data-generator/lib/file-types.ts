/** File types offered on the Files tab. Kept apart from lib/files.ts so the UI doesn't load the encoders. */

export const fileTypes = {
  png: { label: "PNG", group: "Images", mime: "image/png", max: "stream" },
  jpg: { label: "JPG", group: "Images", mime: "image/jpeg", max: "stream" },
  webp: { label: "WebP", group: "Images", mime: "image/webp", max: 4 * 1024 ** 3 - 1 },
  gif: { label: "GIF", group: "Images", mime: "image/gif", max: "stream" },
  bmp: { label: "BMP", group: "Images", mime: "image/bmp", max: 4 * 1024 ** 3 - 1 },
  svg: { label: "SVG", group: "Images", mime: "image/svg+xml", max: "stream" },
  pdf: { label: "PDF", group: "Documents", mime: "application/pdf", max: 300 * 1024 ** 2 },
  docx: { label: "DOCX", group: "Documents", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", max: 300 * 1024 ** 2 },
  xlsx: { label: "XLSX", group: "Documents", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", max: 300 * 1024 ** 2 },
  txt: { label: "TXT", group: "Text & data", mime: "text/plain", max: "stream" },
  csv: { label: "CSV", group: "Text & data", mime: "text/csv", max: "stream" },
  json: { label: "JSON", group: "Text & data", mime: "application/json", max: "stream" },
  xml: { label: "XML", group: "Text & data", mime: "application/xml", max: "stream" },
  html: { label: "HTML", group: "Text & data", mime: "text/html", max: "stream" },
  md: { label: "Markdown", group: "Text & data", mime: "text/markdown", max: "stream" },
  log: { label: "LOG", group: "Text & data", mime: "text/plain", max: "stream" },
  wav: { label: "WAV", group: "Media & archives", mime: "audio/wav", max: 4 * 1024 ** 3 - 1 },
  mp4: { label: "MP4", group: "Media & archives", mime: "video/mp4", max: "stream" },
  zip: { label: "ZIP", group: "Media & archives", mime: "application/zip", max: 4 * 1024 ** 3 - 1 },
  bin: { label: "Binary", group: "Media & archives", mime: "application/octet-stream", max: "stream" },
} as const satisfies Record<string, { label: string; group: string; mime: string; max: number | "stream" }>;

export type FileTypeId = keyof typeof fileTypes;

export const fileGroups = ["Images", "Documents", "Text & data", "Media & archives"] as const;

export const isImage = (t: FileTypeId) => fileTypes[t].group === "Images";

/** File extension, which differs from the id only for binary files. */
export const extOf = (t: FileTypeId) => (t === "bin" ? "bin" : t);

/** Largest size we can produce for a type (streamed types are limited only by disk space; we cap at 10 GB). */
export function maxSize(t: FileTypeId): number {
  const m = fileTypes[t].max;
  return m === "stream" ? 10 * 1024 ** 3 : m;
}
