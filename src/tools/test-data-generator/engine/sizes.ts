/** File sizes as people type them ("25 MB", "1.5gb", "512k") and back. */

export const sizeUnits = ["B", "KB", "MB", "GB"] as const;
export type SizeUnit = (typeof sizeUnits)[number];

/** 1024 matches how servers and upload limits usually count (nginx `25m`, PHP `25M`); 1000 matches disk vendors and macOS. */
export type SizeBase = 1000 | 1024;

const power: Record<SizeUnit, number> = { B: 0, KB: 1, MB: 2, GB: 3 };

export function toBytes(value: number, unit: SizeUnit, base: SizeBase = 1024): number {
  return Math.round(value * base ** power[unit]);
}

/** Parse "25 MB", "25mb", "1.5 GiB", "512k" or "2048" (bytes). Returns null for anything else. */
export function parseSize(text: string, base: SizeBase = 1024): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*([kmg]?)(i?)(b?)\s*$/i.exec(text.replace(/,/g, ""));
  if (!m) return null;
  const unit = (m[2].toUpperCase() ? `${m[2].toUpperCase()}B` : "B") as SizeUnit;
  return toBytes(Number(m[1]), unit, m[3] ? 1024 : base);
}

/** "5 MB", "1.5 GB", "800 B": the largest unit that keeps the number at least 1. */
export function formatSize(bytes: number, base: SizeBase = 1024): string {
  let unit: SizeUnit = "B";
  for (const u of sizeUnits) if (bytes >= base ** power[u]) unit = u;
  const n = bytes / base ** power[unit];
  const digits = unit === "B" || Number.isInteger(n) ? 0 : n < 10 ? 2 : 1;
  return `${Number(n.toFixed(digits))} ${unit}`;
}

/** Short tag for file names: "5MB", "1.5GB", "100B". */
export const sizeTag = (bytes: number, base: SizeBase = 1024) => formatSize(bytes, base).replace(" ", "");
