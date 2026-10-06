import { format } from "d3-format";
import type { Value } from "./types";

/** Escape text and attribute values for SVG markup. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Round coordinates to 2 decimals to keep the markup small. */
export function r(n: number): number {
  return Math.round(n * 100) / 100;
}

type Attr = string | number | undefined | null | false;

/** Build an element: `el("rect", { x: 1 })`, `el("g", {}, children)`. Text content is escaped by `text()`. */
export function el(tag: string, attrs: Record<string, Attr>, children?: string | string[]): string {
  let out = `<${tag}`;
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    out += ` ${key}="${esc(String(typeof value === "number" ? r(value) : value))}"`;
  }
  const inner = Array.isArray(children) ? children.join("") : children;
  return inner ? `${out}>${inner}</${tag}>` : `${out}/>`;
}

export function text(attrs: Record<string, Attr>, content: string): string {
  return el("text", attrs, esc(content));
}

/** A `<title>` child, which browsers and most viewers show as a tooltip. */
export function title(content: string): string {
  return `<title>${esc(content)}</title>`;
}

const formatNumber = format(",.4~g");
const formatLarge = format(",.2~f");
const formatBig = format(",.3~s");

/** Compact numbers for labels: 0.25 / 1,234.5 / 1.2M. */
export function formatValue(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return formatBig(n).replace("G", "B");
  return abs >= 1000 ? formatLarge(n) : formatNumber(n);
}

export function isoDate(d: Date): string {
  const iso = d.toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso.slice(0, 16).replace("T", " ");
}

/** Human-readable label for any cell value. */
export function label(v: Value): string {
  if (v === null) return "(empty)";
  if (v instanceof Date) return isoDate(v);
  if (typeof v === "number") return String(v);
  return v;
}

/** Rough rendered width of a label, for deciding whether it fits. */
export function textWidth(s: string, fontSize: number): number {
  return s.length * fontSize * 0.58;
}

/** Shorten a label to fit `width`, with an ellipsis. Returns "" when not even one character fits. */
export function fit(s: string, width: number, fontSize: number): string {
  if (textWidth(s, fontSize) <= width) return s;
  const chars = Math.floor(width / (fontSize * 0.58)) - 1;
  return chars < 2 ? "" : `${s.slice(0, chars)}…`;
}
