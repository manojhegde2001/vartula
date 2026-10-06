import { stack, stackOffsetDiverging, stackOffsetExpand } from "d3-shape";
import { axisBottom, axisLeft, bandKey, bandScale, bandTicks, continuousTicks, tickCount } from "../axes";
import { scaleLinear } from "d3-scale";
import { categoricalScale, valueKey } from "../colors";
import { col, domainOf, groupRows, measure } from "../data";
import { bool, num, str } from "../options";
import { el, fit, formatValue, label, text, textWidth, title } from "../svg";
import type { ChartDef, ColumnType, Value } from "../types";

const ANY: ColumnType[] = ["string", "number", "date"];

export const barChart: ChartDef = {
  id: "bar",
  name: "Bar chart",
  family: "Comparisons",
  description: "Compare totals across categories, optionally split into stacked or grouped series.",
  dimensions: [
    { id: "x", name: "Categories", types: ANY, required: true, hint: "One bar per distinct value" },
    { id: "y", name: "Values", types: ["number"], required: false, aggregate: true, hint: "Bar length; counts rows if empty" },
    { id: "series", name: "Group by", types: ANY, required: false, hint: "Split bars into colored series" },
  ],
  options: [
    {
      id: "orientation",
      label: "Orientation",
      group: "Chart",
      type: "select",
      default: "vertical",
      choices: [
        { value: "vertical", label: "Vertical" },
        { value: "horizontal", label: "Horizontal" },
      ],
    },
    {
      id: "layout",
      label: "Series layout",
      group: "Chart",
      type: "select",
      default: "stacked",
      choices: [
        { value: "stacked", label: "Stacked" },
        { value: "grouped", label: "Side by side" },
        { value: "percent", label: "Stacked to 100%" },
      ],
    },
    {
      id: "sort",
      label: "Sort bars",
      group: "Chart",
      type: "select",
      default: "original",
      choices: [
        { value: "original", label: "Data order" },
        { value: "desc", label: "Largest first" },
        { value: "asc", label: "Smallest first" },
        { value: "label", label: "By name" },
      ],
    },
    { id: "padding", label: "Bar spacing", group: "Chart", type: "number", default: 0.2, min: 0, max: 0.9, step: 0.05 },
    { id: "showGrid", label: "Gridlines", group: "Chart", type: "boolean", default: true },
    { id: "showValues", label: "Value labels", group: "Labels", type: "boolean", default: false },
  ],
  hasLegend: (dims) => !!dims.series?.columns.length,

  draw({ rows, dims, options: o, width, height, theme }) {
    const xCol = col(dims.x)!;
    const sCol = col(dims.series);
    const horizontal = str(o, "orientation") === "horizontal";
    const layout = sCol ? str(o, "layout") : "stacked";
    const fs = theme.fontSize;

    let categories = domainOf(rows, xCol);
    const series: Value[] = sCol ? domainOf(rows, sCol) : [null];
    const cells = new Map<string, number>();
    for (const g of groupRows(rows, sCol ? [xCol, sCol] : [xCol])) {
      cells.set(g.values.map(valueKey).join("|"), measure(g.rows, dims.y));
    }
    const at = (c: Value, s: Value) => cells.get(sCol ? `${valueKey(c)}|${valueKey(s)}` : valueKey(c)) ?? 0;
    const total = (c: Value) => series.reduce<number>((t, s) => t + at(c, s), 0);

    const sort = str(o, "sort");
    if (sort === "desc" || sort === "asc") {
      const dir = sort === "desc" ? -1 : 1;
      categories = [...categories].sort((a, b) => dir * (total(a) - total(b)));
    } else if (sort === "label") {
      categories = [...categories].sort((a, b) => label(a).localeCompare(label(b), undefined, { numeric: true }));
    }

    // Segments in value space: [start, end] for every category × series.
    const keys = series.map((_, i) => String(i));
    const table = categories.map((c) => Object.fromEntries(series.map((s, i) => [String(i), at(c, s)])));
    const segments: { c: number; s: number; v0: number; v1: number; value: number }[] = [];
    if (layout === "grouped") {
      categories.forEach((c, ci) => series.forEach((s, si) => segments.push({ c: ci, s: si, v0: 0, v1: at(c, s), value: at(c, s) })));
    } else {
      const stacked = stack<Record<string, number>>()
        .keys(keys)
        .offset(layout === "percent" ? stackOffsetExpand : stackOffsetDiverging)(table);
      stacked.forEach((layer, si) =>
        layer.forEach(([v0, v1], ci) => segments.push({ c: ci, s: si, v0, v1, value: table[ci][String(si)] })),
      );
    }

    const catLen = horizontal ? height : width;
    const valLen = horizontal ? width : height;
    const band = bandScale(categories, [0, catLen], num(o, "padding"));
    const inner = bandScale(series, [0, band.bandwidth()], layout === "grouped" ? 0.05 : 0);
    let lo = 0;
    let hi = 0;
    for (const s of segments) {
      lo = Math.min(lo, s.v0, s.v1);
      hi = Math.max(hi, s.v0, s.v1);
    }
    if (lo === hi) hi = 1;
    const vs = scaleLinear().domain([lo, hi]).range(horizontal ? [0, valLen] : [valLen, 0]);
    if (layout !== "percent") vs.nice();

    const colors = sCol ? categoricalScale(series, theme, sCol.name) : null;
    const fill = (si: number) => colors?.color(series[si]) ?? theme.palette[0];
    const format = (v: number) => (layout === "percent" ? `${Math.round(v * 100)}%` : formatValue(v));

    const bars: string[] = [];
    const labels: string[] = [];
    for (const seg of segments) {
      const cat = categories[seg.c];
      const bw = layout === "grouped" ? inner.bandwidth() : band.bandwidth();
      const offset = (band(bandKey(cat)) ?? 0) + (layout === "grouped" ? inner(bandKey(series[seg.s])) ?? 0 : 0);
      const a = vs(Math.min(seg.v0, seg.v1));
      const b = vs(Math.max(seg.v0, seg.v1));
      const len = Math.abs(b - a);
      const tip = `${label(cat)}${sCol ? ` · ${label(series[seg.s])}` : ""}: ${formatValue(seg.value)}`;
      const rect = horizontal
        ? { x: Math.min(a, b), y: offset, width: len, height: bw }
        : { x: offset, y: Math.min(a, b), width: bw, height: len };
      bars.push(el("rect", { ...rect, fill: fill(seg.s) }, title(tip)));

      if (!bool(o, "showValues") || seg.value === 0) continue;
      const shown = layout === "percent" ? format(seg.v1 - seg.v0) : formatValue(seg.value);
      const inside = layout !== "grouped" && sCol;
      if (inside) {
        // Centered in its segment, only when it fits.
        const fitsAlong = horizontal ? textWidth(shown, fs) + 4 <= len : fs + 2 <= len;
        const fitsAcross = horizontal ? fs + 2 <= bw : textWidth(shown, fs) + 4 <= bw;
        if (!fitsAlong || !fitsAcross) continue;
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        labels.push(text({ x: cx, y: cy, dy: "0.35em", "text-anchor": "middle", fill: "#ffffff" }, shown));
      } else {
        const negative = seg.v1 < seg.v0 || seg.value < 0;
        if (horizontal) {
          const x = negative ? rect.x - 4 : rect.x + rect.width + 4;
          labels.push(text({ x, y: rect.y + bw / 2, dy: "0.35em", "text-anchor": negative ? "end" : "start", fill: theme.text }, shown));
        } else {
          const y = negative ? rect.y + rect.height + fs : rect.y - 4;
          const s = fit(shown, bw + 8, fs);
          if (s) labels.push(text({ x: rect.x + bw / 2, y, "text-anchor": "middle", fill: theme.text }, s));
        }
      }
    }

    const valueTicks = continuousTicks(vs, tickCount(valLen, horizontal ? 90 : 60)).map((t) => ({
      pos: t.pos,
      label: layout === "percent" ? format(vs.invert(t.pos)) : t.label,
    }));
    const valueTitle = dims.y?.columns[0]?.name ?? "Count";
    const grid = bool(o, "showGrid");
    const axes = horizontal
      ? [
          el("g", { transform: `translate(0,${height})` }, axisBottom({ ticks: valueTicks, length: width, theme, grid: grid ? height : 0, title: valueTitle })),
          axisLeft({ ticks: bandTicks(band), length: height, theme, space: num(o, "marginLeft"), title: undefined }),
        ]
      : [
          el("g", { transform: `translate(0,${height})` }, axisBottom({ ticks: bandTicks(band), length: width, theme, space: num(o, "marginBottom") })),
          axisLeft({ ticks: valueTicks, length: height, theme, grid: grid ? width : 0, title: valueTitle }),
        ];
    // Baseline at zero when the value axis has negatives.
    const zero = lo < 0 ? (horizontal ? el("line", { x1: vs(0), x2: vs(0), y2: height, stroke: theme.muted }) : el("line", { y1: vs(0), y2: vs(0), x2: width, stroke: theme.muted })) : "";

    return {
      body: [axes.join(""), el("g", { class: "bars" }, bars), zero, el("g", { class: "labels" }, labels)].join(""),
      legend: colors?.legend,
    };
  },
};
