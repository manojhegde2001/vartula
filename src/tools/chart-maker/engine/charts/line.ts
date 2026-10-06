import { extent } from "d3-array";
import {
  area,
  curveBasis,
  curveLinear,
  curveMonotoneX,
  curveNatural,
  curveStepAfter,
  line,
  stack,
  stackOffsetExpand,
  stackOffsetNone,
  stackOffsetSilhouette,
  stackOffsetWiggle,
  stackOrderInsideOut,
  stackOrderNone,
  type CurveFactory,
  type SeriesPoint,
} from "d3-shape";
import { scaleLinear, type ScaleLinear } from "d3-scale";
import { axisBottom, axisLeft, continuousScale, continuousTicks, tickCount, type ContinuousScale } from "../axes";
import { categoricalScale, valueKey } from "../colors";
import { asNumber, col, domainOf, groupRows, measure } from "../data";
import { bool, num, str } from "../options";
import { el, formatValue, label, text, title } from "../svg";
import type { ChartDef, ColumnType, DimensionDef, OptionDef, Options, ResolvedDimension, Row, Theme, Value } from "../types";

const ANY: ColumnType[] = ["string", "number", "date"];

const curves: Record<string, CurveFactory> = {
  linear: curveLinear,
  monotone: curveMonotoneX,
  natural: curveNatural,
  basis: curveBasis,
  step: curveStepAfter,
};

const curveOption: OptionDef = {
  id: "curve",
  label: "Curve",
  group: "Chart",
  type: "select",
  default: "monotone",
  choices: [
    { value: "linear", label: "Straight" },
    { value: "monotone", label: "Smooth" },
    { value: "natural", label: "Natural" },
    { value: "basis", label: "Rounded" },
    { value: "step", label: "Step" },
  ],
};

const xDim: DimensionDef = { id: "x", name: "X axis", types: ["date", "number"], required: true, hint: "Dates or numbers" };
const yDim: DimensionDef = { id: "y", name: "Y axis", types: ["number"], required: true, aggregate: true };

/** Aggregate rows into one value per series and x, sorted along x. */
function seriesPoints(rows: Row[], dims: Record<string, ResolvedDimension | undefined>) {
  const xCol = col(dims.x)!;
  const sCol = col(dims.series);
  const series: Value[] = sCol ? domainOf(rows, sCol) : [null];
  const bySeries = new Map<string, { x: number; y: number }[]>(series.map((s) => [valueKey(s), []]));
  for (const g of groupRows(rows, sCol ? [sCol, xCol] : [xCol])) {
    const xv = asNumber(g.values[g.values.length - 1]);
    if (xv === null) continue;
    bySeries.get(sCol ? valueKey(g.values[0]) : valueKey(null))!.push({ x: xv, y: measure(g.rows, dims.y) });
  }
  for (const pts of bySeries.values()) pts.sort((a, b) => a.x - b.x);
  return { series, points: series.map((s) => bySeries.get(valueKey(s))!) };
}

function xLabel(x: number, type: ColumnType): string {
  return type === "date" ? label(new Date(x)) : formatValue(x);
}

/** Bottom x axis and left y axis. `yFormat: null` hides the y axis (its values mean nothing in a streamgraph). */
function frameAxes(
  o: Options,
  size: { width: number; height: number },
  x: ContinuousScale,
  y: ScaleLinear<number, number>,
  theme: Theme,
  titles: { x: string; y?: string },
  yFormat: ((v: number) => string) | null = formatValue,
) {
  const { width, height } = size;
  const grid = bool(o, "showGrid");
  const yTicks = y.ticks(tickCount(height, 60)).map((v) => ({ pos: y(v), label: yFormat ? yFormat(v) : "" }));
  return [
    el(
      "g",
      { transform: `translate(0,${height})` },
      axisBottom({ ticks: continuousTicks(x, tickCount(width, 90)), length: width, theme, grid: grid ? height : 0, title: titles.x, space: num(o, "marginBottom") }),
    ),
    yFormat ? axisLeft({ ticks: yTicks, length: height, theme, grid: grid ? width : 0, title: titles.y }) : "",
  ].join("");
}

export const lineChart: ChartDef = {
  id: "line",
  name: "Line chart",
  family: "Time series",
  description: "Show how values change over time or along a numeric axis, one line per series.",
  dimensions: [xDim, yDim, { id: "series", name: "Lines", types: ANY, required: false, hint: "One line per distinct value" }],
  options: [
    curveOption,
    { id: "strokeWidth", label: "Line width", group: "Chart", type: "number", default: 2, min: 0.5, max: 12, step: 0.5 },
    { id: "showPoints", label: "Dots", group: "Chart", type: "boolean", default: false },
    { id: "showArea", label: "Fill under lines", group: "Chart", type: "boolean", default: false },
    { id: "yZero", label: "Y axis starts at zero", group: "Chart", type: "boolean", default: true },
    { id: "showGrid", label: "Gridlines", group: "Chart", type: "boolean", default: true },
    { id: "endLabels", label: "Series names at line ends", group: "Labels", type: "boolean", default: true },
  ],
  // End labels name the lines, so the legend starts off.
  defaults: { marginRight: 90, showLegend: false },
  hasLegend: (dims) => !!dims.series?.columns.length,

  draw({ rows, dims, options: o, width, height, theme }) {
    const xCol = col(dims.x)!;
    const sCol = col(dims.series);
    const { series, points } = seriesPoints(rows, dims);
    const all = points.flat();
    const [x0, x1] = extent(all, (p) => p.x);
    const [y0, y1] = extent(all, (p) => p.y);
    const yZero = bool(o, "yZero") || bool(o, "showArea");
    const x = continuousScale(xCol, [x0 ?? 0, x1 ?? 1], [0, width], false);
    const y = continuousScale(
      { name: "", type: "number" },
      [yZero ? Math.min(0, y0 ?? 0) : (y0 ?? 0), yZero ? Math.max(0, y1 ?? 1) : (y1 ?? 1)],
      [height, 0],
    ) as ScaleLinear<number, number>;
    const curve = curves[str(o, "curve")] ?? curveLinear;
    const colors = sCol ? categoricalScale(series, theme, sCol.name) : null;
    const colorOf = (i: number) => colors?.color(series[i]) ?? theme.palette[0];
    const sw = num(o, "strokeWidth");
    const path = line<{ x: number; y: number }>()
      .x((p) => x(p.x))
      .y((p) => y(p.y))
      .curve(curve);
    const fillPath = area<{ x: number; y: number }>()
      .x((p) => x(p.x))
      .y0(y(Math.max(y.domain()[0], 0)))
      .y1((p) => y(p.y))
      .curve(curve);

    const marks: string[] = [];
    points.forEach((pts, i) => {
      if (pts.length === 0) return;
      const color = colorOf(i);
      const name = sCol ? label(series[i]) : (dims.y?.columns[0]?.name ?? "");
      const parts: string[] = [];
      if (bool(o, "showArea")) parts.push(el("path", { d: fillPath(pts) ?? "", fill: color, "fill-opacity": 0.15 }));
      parts.push(el("path", { d: path(pts) ?? "", fill: "none", stroke: color, "stroke-width": sw, "stroke-linejoin": "round", "stroke-linecap": "round" }, title(name)));
      if (bool(o, "showPoints") || pts.length === 1) {
        for (const p of pts) {
          parts.push(
            el("circle", { cx: x(p.x), cy: y(p.y), r: sw + 1.5, fill: color, stroke: theme.separator, "stroke-width": 1 }, title(`${name ? `${name} · ` : ""}${xLabel(p.x, xCol.type)}: ${formatValue(p.y)}`)),
          );
        }
      }
      if (sCol && bool(o, "endLabels")) {
        const last = pts[pts.length - 1];
        parts.push(text({ x: x(last.x) + 6, y: y(last.y), dy: "0.35em", fill: color, "font-weight": 600 }, name));
      }
      marks.push(el("g", { class: "series" }, parts));
    });

    return {
      body: frameAxes(o, { width, height }, x, y, theme, { x: xCol.name, y: dims.y?.columns[0]?.name }) + marks.join(""),
      legend: colors?.legend,
    };
  },
};

export const areaChart: ChartDef = {
  id: "area",
  name: "Streamgraph",
  family: "Time series",
  description: "Stacked areas that show how a total and its parts change over time; switch to a flowing streamgraph.",
  dimensions: [xDim, yDim, { id: "series", name: "Streams", types: ANY, required: true, hint: "One band per distinct value" }],
  options: [
    {
      id: "offset",
      label: "Layout",
      group: "Chart",
      type: "select",
      default: "stream",
      choices: [
        { value: "stream", label: "Streamgraph" },
        { value: "silhouette", label: "Centered" },
        { value: "stacked", label: "Stacked area" },
        { value: "percent", label: "Stacked to 100%" },
      ],
    },
    curveOption,
    { id: "showGrid", label: "Gridlines", group: "Chart", type: "boolean", default: false },
    { id: "showLabels", label: "Stream names", group: "Labels", type: "boolean", default: true },
  ],
  hasLegend: () => true,

  draw({ rows, dims, options: o, width, height, theme }) {
    const xCol = col(dims.x)!;
    const sCol = col(dims.series)!;
    const { series, points } = seriesPoints(rows, dims);
    const xs = [...new Set(points.flat().map((p) => p.x))].sort((a, b) => a - b);
    const table = xs.map((xv) => {
      const row: Record<string, number> = { x: xv };
      points.forEach((pts, i) => (row[i] = pts.find((p) => p.x === xv)?.y ?? 0));
      return row;
    });
    const offsetName = str(o, "offset");
    const offset = { stream: stackOffsetWiggle, silhouette: stackOffsetSilhouette, stacked: stackOffsetNone, percent: stackOffsetExpand }[offsetName] ?? stackOffsetNone;
    const layers = stack<Record<string, number>>()
      .keys(series.map((_, i) => String(i)))
      .offset(offset)
      .order(offsetName === "stream" ? stackOrderInsideOut : stackOrderNone)(table);

    let lo = Infinity;
    let hi = -Infinity;
    for (const layer of layers) {
      for (const [a, b] of layer) {
        lo = Math.min(lo, a, b);
        hi = Math.max(hi, a, b);
      }
    }
    if (!Number.isFinite(lo)) [lo, hi] = [0, 1];
    const x = continuousScale(xCol, [xs[0] ?? 0, xs[xs.length - 1] ?? 1], [0, width], false);
    const y = scaleLinear().domain([lo, hi === lo ? lo + 1 : hi]).range([height, 0]);
    if (offsetName === "stacked") y.nice();
    const curve = curves[str(o, "curve")] ?? curveLinear;
    const colors = categoricalScale(series, theme, sCol.name);
    const shape = area<SeriesPoint<Record<string, number>>>()
      .x((d) => x(d.data.x))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(curve);

    const fs = theme.fontSize;
    const bands: string[] = [];
    const labels: string[] = [];
    layers.forEach((layer) => {
      const i = layer.index;
      const color = colors.color(series[i]);
      bands.push(el("path", { d: shape(layer) ?? "", fill: color, stroke: theme.separator, "stroke-width": 0.5 }, title(label(series[i]))));
      if (!bool(o, "showLabels")) return;
      let best = -1;
      let thickness = 0;
      layer.forEach(([a, b], k) => {
        const t = Math.abs(y(a) - y(b));
        if (t > thickness) [best, thickness] = [k, t];
      });
      if (best < 0 || thickness < fs + 4) return;
      const [a, b] = layer[best];
      const px = x(xs[best]);
      const anchor = best === 0 ? "start" : best === xs.length - 1 ? "end" : "middle";
      labels.push(text({ x: px + (anchor === "start" ? 4 : anchor === "end" ? -4 : 0), y: y((a + b) / 2), dy: "0.35em", "text-anchor": anchor, fill: "#ffffff", "font-weight": 600 }, label(series[i])));
    });

    const yFormat = offsetName === "percent" ? (v: number) => `${Math.round(v * 100)}%` : offsetName === "stacked" ? formatValue : null;
    const axes = frameAxes(o, { width, height }, x, y, theme, { x: xCol.name, y: yFormat ? dims.y?.columns[0]?.name : undefined }, yFormat);

    return {
      body: axes + el("g", { class: "streams" }, bands) + el("g", { class: "labels" }, labels),
      legend: colors.legend,
    };
  },
};
