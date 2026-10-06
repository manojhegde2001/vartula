import { extent, max } from "d3-array";
import { scaleSqrt } from "d3-scale";
import { axisBottom, axisLeft, continuousScale, continuousTicks, tickCount } from "../axes";
import { colorScaleFor } from "../colors";
import { asNumber, col } from "../data";
import { bool, num } from "../options";
import { el, label, text, title } from "../svg";
import type { ChartDef, ColumnType } from "../types";

const ANY: ColumnType[] = ["string", "number", "date"];

export const scatterChart: ChartDef = {
  id: "scatter",
  name: "Scatter plot",
  family: "Correlations",
  description: "Plot one dot per row to reveal relationships between two numbers; size and color add more.",
  dimensions: [
    { id: "x", name: "X axis", types: ["number", "date"], required: true },
    { id: "y", name: "Y axis", types: ["number", "date"], required: true },
    { id: "size", name: "Size", types: ["number"], required: false, hint: "Turns dots into bubbles" },
    { id: "color", name: "Color", types: ANY, required: false },
    { id: "label", name: "Label", types: ANY, required: false, hint: "Text next to each dot" },
  ],
  options: [
    { id: "radius", label: "Dot size", group: "Chart", type: "number", default: 5, min: 1, max: 40 },
    { id: "maxRadius", label: "Largest bubble", group: "Chart", type: "number", default: 24, min: 2, max: 200 },
    { id: "opacity", label: "Opacity", group: "Chart", type: "number", default: 0.8, min: 0.1, max: 1, step: 0.05 },
    { id: "outline", label: "Outline dots", group: "Chart", type: "boolean", default: true },
    { id: "showGrid", label: "Gridlines", group: "Chart", type: "boolean", default: true },
    { id: "zeroBased", label: "Axes start at zero", group: "Chart", type: "boolean", default: false },
    { id: "showLabels", label: "Show labels", group: "Labels", type: "boolean", default: true },
  ],
  // Room for labels of the right-most dots.
  defaults: { marginRight: 80 },
  hasLegend: (dims) => !!dims.color?.columns.length,

  draw({ rows, dims, options: o, width, height, theme }) {
    const xCol = col(dims.x)!;
    const yCol = col(dims.y)!;
    const sizeCol = col(dims.size);
    const colorCol = col(dims.color);
    const labelCol = col(dims.label);

    const points = rows
      .map((row) => ({ row, x: asNumber(row[xCol.name]), y: asNumber(row[yCol.name]), size: sizeCol ? asNumber(row[sizeCol.name]) : null }))
      .filter((p): p is typeof p & { x: number; y: number } => p.x !== null && p.y !== null);

    const zero = bool(o, "zeroBased");
    const domain = (values: number[], type: ColumnType): [number, number] => {
      const [lo = 0, hi = 1] = extent(values);
      // A little room so edge dots and bubbles are not cut in half.
      const pad = (hi - lo) * 0.04;
      return zero && type === "number" ? [Math.min(0, lo - pad), Math.max(0, hi + pad)] : [lo - pad, hi + pad];
    };
    const x = continuousScale(xCol, domain(points.map((p) => p.x), xCol.type), [0, width]);
    const y = continuousScale(yCol, domain(points.map((p) => p.y), yCol.type), [height, 0]);
    const rScale = scaleSqrt()
      .domain([0, max(points, (p) => Math.abs(p.size ?? 0)) || 1])
      .range([0, num(o, "maxRadius")]);
    const radius = (p: (typeof points)[number]) => (sizeCol ? rScale(Math.abs(p.size ?? 0)) : num(o, "radius"));

    const colors = colorCol ? colorScaleFor(rows.map((r) => r[colorCol.name]), colorCol.type === "number", theme, colorCol.name) : null;
    const fill = (p: (typeof points)[number]) => (colorCol ? colors!.color(p.row[colorCol.name]) : theme.palette[0]);

    // Big bubbles first so small ones stay visible on top.
    const ordered = sizeCol ? [...points].sort((a, b) => radius(b) - radius(a)) : points;
    const fs = theme.fontSize;
    const dots: string[] = [];
    const labels: string[] = [];
    for (const p of ordered) {
      const rr = radius(p);
      const cx = x(p.x);
      const cy = y(p.y);
      const tip = [
        labelCol ? label(p.row[labelCol.name]) : null,
        `${xCol.name}: ${label(p.row[xCol.name])}`,
        `${yCol.name}: ${label(p.row[yCol.name])}`,
        sizeCol ? `${sizeCol.name}: ${label(p.row[sizeCol.name])}` : null,
        colorCol ? `${colorCol.name}: ${label(p.row[colorCol.name])}` : null,
      ].filter(Boolean).join("\n");
      dots.push(
        el(
          "circle",
          { cx, cy, r: rr, fill: fill(p), "fill-opacity": num(o, "opacity"), stroke: bool(o, "outline") ? theme.separator : undefined, "stroke-width": bool(o, "outline") ? 1 : undefined },
          title(tip),
        ),
      );
      if (labelCol && bool(o, "showLabels")) {
        const s = label(p.row[labelCol.name]);
        labels.push(text({ x: cx + rr + 3, y: cy, dy: "0.35em", fill: theme.text, "font-size": fs * 0.9 }, s));
      }
    }

    const grid = bool(o, "showGrid");
    const axes =
      el(
        "g",
        { transform: `translate(0,${height})` },
        axisBottom({ ticks: continuousTicks(x, tickCount(width, 90)), length: width, theme, grid: grid ? height : 0, title: xCol.name }),
      ) + axisLeft({ ticks: continuousTicks(y, tickCount(height, 60)), length: height, theme, grid: grid ? width : 0, title: yCol.name });

    return {
      body: axes + el("g", { class: "dots" }, dots) + el("g", { class: "labels" }, labels),
      legend: colors?.legend,
    };
  },
};

