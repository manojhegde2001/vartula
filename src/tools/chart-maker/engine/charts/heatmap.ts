import { axisBottom, axisLeft, bandKey, bandScale, bandTicks } from "../axes";
import { luminance, sequentialScale } from "../colors";
import { col, domainOf, groupRows, measure } from "../data";
import { bool, num, str } from "../options";
import { el, fit, formatValue, label, text, title } from "../svg";
import type { ChartDef, ColumnType } from "../types";

const ANY: ColumnType[] = ["string", "number", "date"];

export const heatmapChart: ChartDef = {
  id: "heatmap",
  name: "Heatmap",
  family: "Correlations",
  description: "A grid of colored cells that reveals patterns across two categorical axes.",
  dimensions: [
    { id: "x", name: "Columns", types: ANY, required: true },
    { id: "y", name: "Rows", types: ANY, required: true },
    { id: "color", name: "Color", types: ["number"], required: false, aggregate: true, hint: "Cell color; counts rows if empty" },
  ],
  options: [
    { id: "padding", label: "Cell spacing", group: "Chart", type: "number", default: 0.05, min: 0, max: 0.5, step: 0.01 },
    {
      id: "sort",
      label: "Order text values",
      group: "Chart",
      type: "select",
      default: "original",
      choices: [
        { value: "original", label: "Data order" },
        { value: "label", label: "By name" },
      ],
    },
    { id: "showValues", label: "Values in cells", group: "Labels", type: "boolean", default: false },
  ],
  defaults: { marginLeft: 90, marginBottom: 50 },
  hasLegend: () => true,

  draw({ rows, dims, options: o, width, height, theme }) {
    const xCol = col(dims.x)!;
    const yCol = col(dims.y)!;
    const byName = str(o, "sort") === "label";
    const xs = domainOf(rows, xCol, byName);
    const ys = domainOf(rows, yCol, byName);
    const pad = num(o, "padding");
    const x = bandScale(xs, [0, width], pad);
    const y = bandScale(ys, [0, height], pad);
    const cells = groupRows(rows, [xCol, yCol]).map((g) => ({ x: g.values[0], y: g.values[1], value: measure(g.rows, dims.color) }));
    const colors = sequentialScale(
      cells.map((c) => c.value),
      theme,
      dims.color?.columns[0]?.name ?? "Count",
    );
    const fs = theme.fontSize;
    const marks: string[] = [];
    const labels: string[] = [];
    for (const c of cells) {
      const cx = x(bandKey(c.x)) ?? 0;
      const cy = y(bandKey(c.y)) ?? 0;
      const fill = colors.color(c.value);
      marks.push(el("rect", { x: cx, y: cy, width: x.bandwidth(), height: y.bandwidth(), fill }, title(`${label(c.x)} · ${label(c.y)}: ${formatValue(c.value)}`)));
      if (bool(o, "showValues") && y.bandwidth() > fs) {
        const s = fit(formatValue(c.value), x.bandwidth() - 4, fs);
        const ink = luminance(fill) > 0.35 ? "#1a1a1a" : "#ffffff";
        if (s) labels.push(text({ x: cx + x.bandwidth() / 2, y: cy + y.bandwidth() / 2, dy: "0.35em", "text-anchor": "middle", fill: ink }, s));
      }
    }
    const axes =
      el("g", { transform: `translate(0,${height})` }, axisBottom({ ticks: bandTicks(x), length: width, theme, space: num(o, "marginBottom") })) +
      axisLeft({ ticks: bandTicks(y), length: height, theme, space: num(o, "marginLeft") });
    return { body: axes + el("g", { class: "cells" }, marks) + el("g", { class: "labels" }, labels), legend: colors.legend };
  },
};

