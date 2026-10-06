import { quantileSorted } from "d3-array";
import { scaleLinear } from "d3-scale";
import { axisBottom, axisLeft, bandKey, bandScale, bandTicks, continuousTicks, tickCount } from "../axes";
import { categoricalScale, valueKey } from "../colors";
import { col, domainOf } from "../data";
import { bool, num } from "../options";
import { el, formatValue, label, title } from "../svg";
import type { ChartDef, ColumnType, Value } from "../types";

const ANY: ColumnType[] = ["string", "number", "date"];

export interface BoxStats {
  q1: number;
  median: number;
  q3: number;
  /** Whisker ends: the furthest values within 1.5 × IQR of the box. */
  low: number;
  high: number;
  outliers: number[];
}

export function boxStats(values: number[]): BoxStats | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const q1 = quantileSorted(sorted, 0.25)!;
  const median = quantileSorted(sorted, 0.5)!;
  const q3 = quantileSorted(sorted, 0.75)!;
  const fence = 1.5 * (q3 - q1);
  const inside = sorted.filter((v) => v >= q1 - fence && v <= q3 + fence);
  return {
    q1,
    median,
    q3,
    low: inside[0] ?? q1,
    high: inside[inside.length - 1] ?? q3,
    outliers: sorted.filter((v) => v < q1 - fence || v > q3 + fence),
  };
}

/** Deterministic pseudo-random jitter in [-0.5, 0.5) so exports are stable. */
const jitter = (i: number) => (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1 - 0.5;

export const boxPlotChart: ChartDef = {
  id: "boxplot",
  name: "Box plot",
  family: "Distributions",
  description: "Summarize the spread of values per group: median, quartiles, whiskers and outliers.",
  dimensions: [
    { id: "value", name: "Values", types: ["number"], required: true },
    { id: "group", name: "Groups", types: ANY, required: false, hint: "One box per distinct value" },
  ],
  options: [
    { id: "padding", label: "Box spacing", group: "Chart", type: "number", default: 0.4, min: 0, max: 0.9, step: 0.05 },
    { id: "showPoints", label: "All data points", group: "Chart", type: "boolean", default: false },
    { id: "showOutliers", label: "Outliers", group: "Chart", type: "boolean", default: true },
    { id: "showGrid", label: "Gridlines", group: "Chart", type: "boolean", default: true },
  ],
  hasLegend: () => false,

  draw({ rows, dims, options: o, width, height, theme }) {
    const vCol = col(dims.value)!;
    const gCol = col(dims.group);
    const groups: Value[] = gCol ? domainOf(rows, gCol) : [vCol.name];
    const valuesOf = new Map<string, number[]>(groups.map((g) => [valueKey(g), []]));
    for (const row of rows) {
      const v = row[vCol.name];
      if (typeof v !== "number") continue;
      valuesOf.get(valueKey(gCol ? row[gCol.name] : vCol.name))?.push(v);
    }
    let lo = Infinity;
    let hi = -Infinity;
    for (const vs of valuesOf.values()) {
      for (const v of vs) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    if (!Number.isFinite(lo)) [lo, hi] = [0, 1];
    if (lo === hi) [lo, hi] = [lo - 1, hi + 1];
    const x = bandScale(groups, [0, width], num(o, "padding"));
    const y = scaleLinear().domain([lo, hi]).range([height, 0]).nice();
    const colors = categoricalScale(groups, theme, gCol?.name ?? "");
    const bw = x.bandwidth();

    const marks: string[] = [];
    let index = 0;
    for (const g of groups) {
      const values = valuesOf.get(valueKey(g)) ?? [];
      const s = boxStats(values);
      if (!s) continue;
      const left = x(bandKey(g)) ?? 0;
      const cx = left + bw / 2;
      const color = colors.color(g);
      const tip = title(
        `${label(g)}\nMedian: ${formatValue(s.median)}\nQuartiles: ${formatValue(s.q1)} – ${formatValue(s.q3)}\nRange: ${formatValue(s.low)} – ${formatValue(s.high)}\n${values.length} values`,
      );
      const parts = [
        el("line", { x1: cx, x2: cx, y1: y(s.low), y2: y(s.q1), stroke: theme.text }),
        el("line", { x1: cx, x2: cx, y1: y(s.q3), y2: y(s.high), stroke: theme.text }),
        el("line", { x1: cx - bw / 4, x2: cx + bw / 4, y1: y(s.low), y2: y(s.low), stroke: theme.text }),
        el("line", { x1: cx - bw / 4, x2: cx + bw / 4, y1: y(s.high), y2: y(s.high), stroke: theme.text }),
        el("rect", { x: left, y: y(s.q3), width: bw, height: Math.max(1, y(s.q1) - y(s.q3)), fill: color, "fill-opacity": 0.75, stroke: theme.text }, tip),
        el("line", { x1: left, x2: left + bw, y1: y(s.median), y2: y(s.median), stroke: theme.text, "stroke-width": 2 }),
      ];
      if (bool(o, "showPoints")) {
        for (const v of values) parts.push(el("circle", { cx: cx + jitter(index++) * bw * 0.8, cy: y(v), r: 2, fill: theme.text, "fill-opacity": 0.45 }));
      } else if (bool(o, "showOutliers")) {
        for (const v of s.outliers) parts.push(el("circle", { cx, cy: y(v), r: 3, fill: "none", stroke: color, "stroke-width": 1.5 }, title(formatValue(v))));
      }
      marks.push(el("g", {}, parts));
    }
    const grid = bool(o, "showGrid");
    const axes =
      el("g", { transform: `translate(0,${height})` }, axisBottom({ ticks: bandTicks(x), length: width, theme, space: num(o, "marginBottom") })) +
      axisLeft({ ticks: continuousTicks(y, tickCount(height, 60)), length: height, theme, grid: grid ? width : 0, title: vCol.name });
    return { body: axes + el("g", { class: "boxes" }, marks) };
  },
};
