/** Page-range parsing and split plans. Pages are 1-based in text and 0-based in arrays. */

export interface ParsedRanges {
  /** One array of 0-based page indices per comma-separated part. */
  groups: number[][];
  error: string | null;
}

/**
 * Parse "1-3, 5, 8-" style input. Supported parts: `n`, `a-b` (descending allowed), `a-` (to the end),
 * `-b` (from the start) and `last` / `end` as a page number.
 */
export function parseRanges(input: string, pageCount: number): ParsedRanges {
  const parts = input
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { groups: [], error: "Enter pages such as 1-3, 5, 8-" };

  const page = (s: string): number | null => {
    const t = s.trim().toLowerCase();
    if (t === "last" || t === "end") return pageCount;
    if (!/^\d+$/.test(t)) return null;
    return Number(t);
  };

  const groups: number[][] = [];
  for (const part of parts) {
    const m = /^(.*?)\s*[-–]\s*(.*)$/.exec(part);
    let from: number | null;
    let to: number | null;
    if (m) {
      from = m[1] === "" ? 1 : page(m[1]);
      to = m[2] === "" ? pageCount : page(m[2]);
    } else {
      from = to = page(part);
    }
    if (from === null || to === null) return { groups: [], error: `“${part}” isn't a page or range` };
    for (const n of [from, to]) {
      if (n < 1 || n > pageCount) return { groups: [], error: `Page ${n} doesn't exist (the document has ${pageCount})` };
    }
    const step = from <= to ? 1 : -1;
    const group: number[] = [];
    for (let n = from; n !== to + step; n += step) group.push(n - 1);
    groups.push(group);
  }
  return { groups, error: null };
}

/** Chunks of `size` pages: every page alone when size is 1. */
export function splitEvery(pageCount: number, size: number): number[][] {
  const n = Math.max(1, Math.floor(size));
  const groups: number[][] = [];
  for (let start = 0; start < pageCount; start += n) {
    groups.push(Array.from({ length: Math.min(n, pageCount - start) }, (_, i) => start + i));
  }
  return groups;
}

/** Compact 1-based label for a list of 0-based indices: [0,1,2,4] → "1-3, 5". */
export function formatPages(indices: number[]): string {
  const out: string[] = [];
  let i = 0;
  while (i < indices.length) {
    let j = i;
    while (j + 1 < indices.length && indices[j + 1] === indices[j] + 1) j++;
    out.push(j > i ? `${indices[i] + 1}-${indices[j] + 1}` : `${indices[i] + 1}`);
    i = j + 1;
  }
  return out.join(", ");
}

/** File name for a part of a split: "report-pages-1-3.pdf". */
export function partName(base: string, indices: number[]): string {
  const label = formatPages(indices).replace(/, /g, "_");
  return `${base}-${indices.length === 1 ? "page" : "pages"}-${label}.pdf`;
}

/** Strip the extension and anything unsafe for a download name. */
export function baseName(name: string): string {
  return name.replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "-").trim() || "document";
}
