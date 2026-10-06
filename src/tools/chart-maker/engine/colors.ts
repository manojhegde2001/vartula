import { extent } from "d3-array";
import type { Legend, Theme, Value } from "./types";
import { label } from "./svg";

/** Categorical palettes for text-like color dimensions. */
export const palettes: Record<string, { name: string; colors: string[] }> = {
  vivid: {
    name: "Vivid",
    colors: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac"],
  },
  colorblind: {
    name: "Color-blind safe",
    colors: ["#0072b2", "#e69f00", "#009e73", "#cc79a7", "#56b4e9", "#d55e00", "#f0e442", "#000000"],
  },
  bold: {
    name: "Bold",
    colors: ["#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#ca8a04", "#4f46e5", "#dc2626", "#0d9488", "#9333ea"],
  },
  pastel: {
    name: "Pastel",
    colors: ["#8dd3c7", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#bc80bd", "#ccebc5", "#ffed6f"],
  },
  earth: {
    name: "Earth",
    colors: ["#6b4226", "#a0522d", "#c08552", "#7d8f69", "#4f6d4b", "#d9b26f", "#8c6a5d", "#b5838d", "#5e6472", "#a3a380"],
  },
};

/** Sequential ramps for numeric color dimensions (light to dark). */
export const ramps: Record<string, { name: string; stops: string[] }> = {
  viridis: { name: "Viridis", stops: ["#fde725", "#5ec962", "#21918c", "#3b528b", "#440154"] },
  blues: { name: "Blues", stops: ["#eff6ff", "#93c5fd", "#3b82f6", "#1d4ed8", "#172554"] },
  magma: { name: "Magma", stops: ["#fcfdbf", "#fc8961", "#b73779", "#51127c", "#000004"] },
  greens: { name: "Greens", stops: ["#f0fdf4", "#86efac", "#22c55e", "#15803d", "#052e16"] },
  redblue: { name: "Red–Blue", stops: ["#b2182b", "#ef8a62", "#f7f7f7", "#67a9cf", "#2166ac"] },
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (c: number) => Math.round(c).toString(16).padStart(2, "0");

/** Interpolate a color ramp at t in [0, 1]. */
export function interpolate(stops: string[], t: number): string {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1] ?? stops[i]);
  const f = x - i;
  return `#${a.map((c, k) => toHex(c + (b[k] - c) * f)).join("")}`;
}

/** Relative luminance (0 black to 1 white) of a #rrggbb color. */
export function luminance(hex: string): number {
  if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) return 1;
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function valueKey(v: Value): string {
  return v instanceof Date ? `d${v.getTime()}` : `${typeof v}:${v}`;
}

export interface ColorScale {
  color: (v: Value) => string;
  legend: Legend;
}

/** Ordinal colors in first-seen order. */
export function categoricalScale(values: Value[], theme: Theme, legendTitle: string): ColorScale {
  const index = new Map<string, number>();
  const items: { label: string; color: string }[] = [];
  for (const v of values) {
    const key = valueKey(v);
    if (index.has(key)) continue;
    const color = theme.palette[index.size % theme.palette.length];
    index.set(key, index.size);
    items.push({ label: label(v), color });
  }
  return {
    color: (v) => theme.palette[(index.get(valueKey(v)) ?? 0) % theme.palette.length],
    legend: { kind: "categorical", title: legendTitle, items },
  };
}

/** Linear ramp between the smallest and largest value. */
export function sequentialScale(values: number[], theme: Theme, legendTitle: string): ColorScale {
  const [lo, hi] = extent(values.filter(Number.isFinite));
  let min = lo ?? 0;
  let max = hi ?? 1;
  if (min === max) {
    min -= 1;
    max += 1;
  }
  return {
    color: (v) => (typeof v === "number" ? interpolate(theme.sequential, (v - min) / (max - min)) : theme.muted),
    legend: { kind: "sequential", title: legendTitle, domain: [min, max], stops: theme.sequential },
  };
}

/** Categorical or sequential, depending on whether the values are numbers. */
export function colorScaleFor(values: Value[], numeric: boolean, theme: Theme, legendTitle: string): ColorScale {
  return numeric
    ? sequentialScale(values.filter((v): v is number => typeof v === "number"), theme, legendTitle)
    : categoricalScale(values, theme, legendTitle);
}
