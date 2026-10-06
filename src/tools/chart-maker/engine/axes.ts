import { scaleBand, scaleLinear, scaleUtc, type ScaleBand, type ScaleLinear, type ScaleTime } from "d3-scale";
import { el, fit, formatValue, isoDate, label, text, textWidth } from "./svg";
import type { Column, Theme, Value } from "./types";

export interface Tick {
  pos: number;
  label: string;
}

export type ContinuousScale = ScaleLinear<number, number> | ScaleTime<number, number>;

/** Linear or UTC time scale for a numeric or date column. */
export function continuousScale(column: Column, domain: [number, number], range: [number, number], nice = true): ContinuousScale {
  let [lo, hi] = domain;
  if (lo === hi) {
    lo -= column.type === "date" ? 86_400_000 : 1;
    hi += column.type === "date" ? 86_400_000 : 1;
  }
  const scale = column.type === "date" ? scaleUtc().domain([lo, hi]) : scaleLinear().domain([lo, hi]);
  scale.range(range);
  return nice ? scale.nice() : scale;
}

export function continuousTicks(scale: ContinuousScale, count: number): Tick[] {
  const isTime = "ticks" in scale && scale.domain()[0] instanceof Date;
  if (isTime) {
    const s = scale as ScaleTime<number, number>;
    const fmt = s.tickFormat(count);
    return s.ticks(count).map((d) => ({ pos: s(d), label: fmt(d) }));
  }
  const s = scale as ScaleLinear<number, number>;
  return s.ticks(count).map((d) => ({ pos: s(d), label: formatValue(d) }));
}

export function bandScale(domain: Value[], range: [number, number], padding: number): ScaleBand<string> {
  return scaleBand<string>()
    .domain(domain.map(bandKey))
    .range(range)
    .paddingInner(padding)
    .paddingOuter(padding / 2);
}

/** Key used in band scales; labels come from `label()`. */
export function bandKey(v: Value): string {
  return v instanceof Date ? isoDate(v) : label(v);
}

export function bandTicks(scale: ScaleBand<string>): Tick[] {
  return scale.domain().map((d) => ({ pos: (scale(d) ?? 0) + scale.bandwidth() / 2, label: d }));
}

interface AxisOptions {
  ticks: Tick[];
  /** Plot width (bottom axis) or height (left axis). */
  length: number;
  theme: Theme;
  /** Gridlines across the plot, this long. 0 for none. */
  grid?: number;
  title?: string;
  /** Room for tick labels, used to shorten and rotate them. */
  space?: number;
}

/** Axis along the bottom of the plot, drawn at y = 0 of its group. */
export function axisBottom({ ticks, length, theme, grid = 0, title, space }: AxisOptions): string {
  const fs = theme.fontSize;
  const slot = length / Math.max(1, ticks.length);
  const widest = Math.max(0, ...ticks.map((t) => textWidth(t.label, fs)));
  const rotate = widest > slot * 0.9;
  const maxLabel = rotate ? Math.max(fs * 3, (space ?? 60) - 10) * 1.3 : slot;
  const parts = [el("line", { x1: 0, x2: length, stroke: theme.muted })];
  for (const t of ticks) {
    if (grid) parts.push(el("line", { x1: t.pos, x2: t.pos, y1: 0, y2: -grid, stroke: theme.grid }));
    parts.push(el("line", { x1: t.pos, x2: t.pos, y2: 5, stroke: theme.muted }));
    const s = fit(t.label, maxLabel, fs);
    parts.push(
      rotate
        ? text({ transform: `translate(${t.pos},${fs + 2}) rotate(-40)`, "text-anchor": "end", fill: theme.text }, s)
        : text({ x: t.pos, y: fs + 6, "text-anchor": "middle", fill: theme.text }, s),
    );
  }
  if (title) {
    parts.push(text({ x: length, y: -6, "text-anchor": "end", fill: theme.text, "font-weight": 600 }, title));
  }
  return el("g", { class: "axis axis-x" }, parts);
}

/** Axis along the left of the plot, drawn at x = 0 of its group. */
export function axisLeft({ ticks, length, theme, grid = 0, title, space }: AxisOptions): string {
  const fs = theme.fontSize;
  const parts = [el("line", { y1: 0, y2: length, stroke: theme.muted })];
  for (const t of ticks) {
    if (grid) parts.push(el("line", { x1: 0, x2: grid, y1: t.pos, y2: t.pos, stroke: theme.grid }));
    parts.push(el("line", { x1: -5, y1: t.pos, y2: t.pos, stroke: theme.muted }));
    const s = fit(t.label, (space ?? 60) - 10, fs);
    parts.push(text({ x: -8, y: t.pos, dy: "0.32em", "text-anchor": "end", fill: theme.text }, s));
  }
  if (title) {
    parts.push(text({ x: 6, y: 0, dy: "0.9em", fill: theme.text, "font-weight": 600 }, title));
  }
  return el("g", { class: "axis axis-y" }, parts);
}

/** Pick roughly one tick per `pixels` of axis length. */
export function tickCount(length: number, pixels = 80): number {
  return Math.max(2, Math.round(length / pixels));
}
