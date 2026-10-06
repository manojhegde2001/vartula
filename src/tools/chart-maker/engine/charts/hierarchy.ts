import {
  hierarchy,
  pack,
  partition,
  treemap,
  treemapBinary,
  treemapDice,
  treemapSlice,
  treemapSliceDice,
  treemapSquarify,
  type HierarchyNode,
} from "d3-hierarchy";
import { arc } from "d3-shape";
import { colorScaleFor, type ColorScale } from "../colors";
import { aggregate, col, measure } from "../data";
import { bool, num, str } from "../options";
import { el, fit, formatValue, label, text, textWidth, title } from "../svg";
import type { ChartDef, ColumnType, DimensionDef, DrawContext, Row, Value } from "../types";

const ANY: ColumnType[] = ["string", "number", "date"];

interface TreeDatum {
  name: string;
  value: number;
  rows: Row[];
  children?: TreeDatum[];
}

const dimensions: DimensionDef[] = [
  { id: "levels", name: "Hierarchy", types: ANY, required: true, multiple: true, hint: "Outer level first; add as many as you like" },
  { id: "size", name: "Size", types: ["number"], required: false, aggregate: true, hint: "Area of each item; counts rows if empty" },
  { id: "color", name: "Color", types: ANY, required: false, aggregate: true, hint: "Defaults to the outer level" },
];

/** Nest rows by each hierarchy level; leaves hold their rows and aggregated size. */
export function buildTree({ rows, dims }: Pick<DrawContext, "rows" | "dims">): HierarchyNode<TreeDatum> {
  const levels = dims.levels?.columns ?? [];
  const root: TreeDatum = { name: "", value: 0, rows: [], children: [] };
  const index = new Map<TreeDatum, Map<string, TreeDatum>>();
  for (const row of rows) {
    let node = root;
    for (const level of levels) {
      const name = label(row[level.name]);
      let kids = index.get(node);
      if (!kids) index.set(node, (kids = new Map()));
      let child = kids.get(name);
      if (!child) {
        child = { name, value: 0, rows: [] };
        (node.children ??= []).push(child);
        kids.set(name, child);
      }
      node = child;
    }
    node.rows.push(row);
  }
  const fill = (d: TreeDatum) => {
    if (d.children) d.children.forEach(fill);
    else d.value = Math.max(0, measure(d.rows, dims.size));
  };
  fill(root);
  return hierarchy(root, (d) => d.children)
    .sum((d) => (d.children ? 0 : d.value))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
}

const subtreeRows = (node: HierarchyNode<TreeDatum>) => node.leaves().flatMap((l) => l.data.rows);
const path = (node: HierarchyNode<TreeDatum>) => node.ancestors().reverse().slice(1).map((n) => n.data.name).join(" › ");

/** Color by the Color dimension when mapped, otherwise by the outermost level. */
function treeColors(ctx: DrawContext, root: HierarchyNode<TreeDatum>): { scale: ColorScale; of: (n: HierarchyNode<TreeDatum>) => string } {
  const colorDim = ctx.dims.color;
  const colorCol = col(colorDim);
  if (!colorCol) {
    const top = root.children ?? [];
    const scale = colorScaleFor(top.map((n) => n.data.name), false, ctx.theme, ctx.dims.levels?.columns[0]?.name ?? "");
    const of = (n: HierarchyNode<TreeDatum>) => {
      const anc = n.ancestors().find((a) => a.depth === 1);
      return scale.color(anc?.data.name ?? n.data.name);
    };
    return { scale, of };
  }
  const numeric = colorCol.type === "number";
  const colorValue = (n: HierarchyNode<TreeDatum>): Value => {
    const rows = subtreeRows(n);
    if (!numeric) return rows[0]?.[colorCol.name] ?? null;
    return aggregate(rows.map((r) => r[colorCol.name]).filter((v): v is number => typeof v === "number"), colorDim!.aggregation);
  };
  const nodes = numeric ? root.leaves() : root.descendants().slice(1);
  const scale = colorScaleFor(nodes.map(colorValue), numeric, ctx.theme, colorCol.name);
  return { scale, of: (n) => scale.color(colorValue(n)) };
}

const labelOptions = [
  { id: "showLabels", label: "Item names", group: "Labels" as const, type: "boolean" as const, default: true },
  { id: "showValues", label: "Item values", group: "Labels" as const, type: "boolean" as const, default: true },
];

const tiles = { squarify: treemapSquarify, binary: treemapBinary, sliceDice: treemapSliceDice, slice: treemapSlice, dice: treemapDice };

export const treemapChart: ChartDef = {
  id: "treemap",
  name: "Treemap",
  family: "Hierarchies",
  description: "Nested rectangles sized by value, for part-to-whole comparisons across several levels.",
  dimensions,
  options: [
    {
      id: "tile",
      label: "Tiling",
      group: "Chart",
      type: "select",
      default: "squarify",
      choices: [
        { value: "squarify", label: "Squarified" },
        { value: "binary", label: "Binary" },
        { value: "sliceDice", label: "Slice and dice" },
        { value: "slice", label: "Rows" },
        { value: "dice", label: "Columns" },
      ],
    },
    { id: "padding", label: "Spacing", group: "Chart", type: "number", default: 2, min: 0, max: 30 },
    { id: "groupLabels", label: "Group names", group: "Labels", type: "boolean", default: true },
    ...labelOptions,
  ],
  defaults: { marginTop: 10, marginRight: 10, marginBottom: 10, marginLeft: 10 },
  hasLegend: () => true,

  draw(ctx) {
    const { width, height, options: o, theme } = ctx;
    const fs = theme.fontSize;
    const root = buildTree(ctx);
    const pad = num(o, "padding");
    const groupLabels = bool(o, "groupLabels");
    treemap<TreeDatum>()
      .size([width, height])
      .tile(tiles[str(o, "tile") as keyof typeof tiles] ?? treemapSquarify)
      .paddingInner(pad)
      .paddingOuter(pad)
      .paddingTop((d) => (groupLabels && d.depth > 0 && d.children ? fs + 6 : pad))
      .round(true)(root);
    const { scale, of } = treeColors(ctx, root);

    const groups: string[] = [];
    const leaves: string[] = [];
    for (const n of root.descendants()) {
      const { x0, y0, x1, y1 } = n as typeof n & { x0: number; y0: number; x1: number; y1: number };
      const w = x1 - x0;
      const h = y1 - y0;
      if (n.depth === 0 || w <= 0 || h <= 0) continue;
      if (n.children) {
        const name = groupLabels ? fit(n.data.name, w - 6, fs) : "";
        groups.push(
          el("rect", { x: x0, y: y0, width: w, height: h, fill: "none", stroke: theme.grid }, title(`${path(n)}: ${formatValue(n.value ?? 0)}`)) +
            (name ? text({ x: x0 + 4, y: y0 + fs + 1, fill: theme.text, "font-weight": 600 }, name) : ""),
        );
        continue;
      }
      const parts = [el("rect", { x: x0, y: y0, width: w, height: h, fill: of(n) }, title(`${path(n)}: ${formatValue(n.value ?? 0)}`))];
      let ty = y0 + fs + 3;
      if (bool(o, "showLabels") && h > fs + 4) {
        const s = fit(n.data.name, w - 8, fs);
        if (s) parts.push(text({ x: x0 + 4, y: ty, fill: "#ffffff", "font-weight": 600 }, s));
        ty += fs + 2;
      }
      if (bool(o, "showValues") && h > ty - y0 + 2) {
        const s = formatValue(n.value ?? 0);
        if (textWidth(s, fs) < w - 8) parts.push(text({ x: x0 + 4, y: ty, fill: "#ffffff", "fill-opacity": 0.85 }, s));
      }
      leaves.push(el("g", {}, parts));
    }
    return { body: el("g", { class: "leaves" }, leaves) + el("g", { class: "groups" }, groups), legend: scale.legend };
  },
};

export const packChart: ChartDef = {
  id: "pack",
  name: "Circle packing",
  family: "Hierarchies",
  description: "Circles nested inside circles, sized by value — a softer take on the treemap.",
  dimensions,
  options: [{ id: "padding", label: "Spacing", group: "Chart", type: "number", default: 3, min: 0, max: 30 }, ...labelOptions],
  defaults: { marginTop: 10, marginRight: 10, marginBottom: 10, marginLeft: 10 },
  hasLegend: () => true,

  draw(ctx) {
    const { width, height, options: o, theme } = ctx;
    const fs = theme.fontSize;
    const root = buildTree(ctx);
    const size = Math.min(width, height);
    pack<TreeDatum>().size([size, size]).padding(num(o, "padding"))(root);
    const { scale, of } = treeColors(ctx, root);

    const circles: string[] = [];
    const labels: string[] = [];
    for (const n of root.descendants()) {
      const { x, y, r } = n as typeof n & { x: number; y: number; r: number };
      if (n.depth === 0 || r <= 0) continue;
      const tip = title(`${path(n)}: ${formatValue(n.value ?? 0)}`);
      if (n.children) {
        circles.push(el("circle", { cx: x, cy: y, r, fill: theme.grid, "fill-opacity": 0.35, stroke: theme.muted, "stroke-opacity": 0.5 }, tip));
        continue;
      }
      circles.push(el("circle", { cx: x, cy: y, r, fill: of(n) }, tip));
      const name = bool(o, "showLabels") ? fit(n.data.name, r * 1.8, fs) : "";
      const value = bool(o, "showValues") ? formatValue(n.value ?? 0) : "";
      const showValue = value && textWidth(value, fs) < r * 1.8 && r > fs * (name ? 1.6 : 0.7);
      if (name && r > fs * 0.8) labels.push(text({ x, y: showValue ? y - fs * 0.15 : y, dy: showValue ? 0 : "0.35em", "text-anchor": "middle", fill: "#ffffff", "font-weight": 600 }, name));
      if (showValue) labels.push(text({ x, y: name ? y + fs : y, dy: name ? 0 : "0.35em", "text-anchor": "middle", fill: "#ffffff", "fill-opacity": 0.85 }, value));
    }
    const offset = `translate(${(width - size) / 2},${(height - size) / 2})`;
    return { body: el("g", { transform: offset }, [circles.join(""), labels.join("")]), legend: scale.legend };
  },
};

export const sunburstChart: ChartDef = {
  id: "sunburst",
  name: "Sunburst",
  family: "Hierarchies",
  description: "Rings of a hierarchy radiating from the center, each slice sized by value.",
  dimensions,
  options: [
    { id: "hole", label: "Center hole", group: "Chart", type: "number", default: 0.25, min: 0, max: 0.8, step: 0.05 },
    { id: "padAngle", label: "Gap between slices", group: "Chart", type: "number", default: 0.5, min: 0, max: 5, step: 0.25 },
    { id: "showLabels", label: "Item names", group: "Labels", type: "boolean", default: true },
  ],
  defaults: { marginTop: 10, marginRight: 10, marginBottom: 10, marginLeft: 10 },
  hasLegend: () => true,

  draw(ctx) {
    const { width, height, options: o, theme } = ctx;
    const fs = theme.fontSize;
    const root = buildTree(ctx);
    const radius = Math.min(width, height) / 2;
    const hole = radius * num(o, "hole");
    partition<TreeDatum>().size([2 * Math.PI, 1])(root);
    const depth = Math.max(1, root.height);
    const ring = (y: number) => hole + ((radius - hole) * (y * (depth + 1) - 1)) / depth;
    const { scale, of } = treeColors(ctx, root);
    type P = HierarchyNode<TreeDatum> & { x0: number; x1: number; y0: number; y1: number };
    const shape = arc<P>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => ring(d.y0))
      .outerRadius((d) => ring(d.y1) - 1)
      .padAngle((num(o, "padAngle") * Math.PI) / 180);

    const arcs: string[] = [];
    const labels: string[] = [];
    for (const n of root.descendants() as P[]) {
      if (n.depth === 0 || n.x1 - n.x0 <= 0) continue;
      const fade = n.children ? 0.75 + 0.25 * (n.depth / (depth + 1)) : 1;
      arcs.push(el("path", { d: shape(n) ?? "", fill: of(n), "fill-opacity": fade, stroke: theme.separator, "stroke-width": 0.5 }, title(`${path(n)}: ${formatValue(n.value ?? 0)}`)));
      if (!bool(o, "showLabels")) continue;
      const r0 = ring(n.y0);
      const r1 = ring(n.y1);
      const mid = (r0 + r1) / 2;
      if ((n.x1 - n.x0) * mid < fs + 2) continue;
      const s = fit(n.data.name, r1 - r0 - 6, fs);
      if (!s) continue;
      const angle = (((n.x0 + n.x1) / 2) * 180) / Math.PI;
      const flip = angle > 180;
      labels.push(
        text({ transform: `rotate(${angle - 90}) translate(${mid},0) rotate(${flip ? 180 : 0})`, dy: "0.35em", "text-anchor": "middle", fill: "#ffffff", "font-weight": 600 }, s),
      );
    }
    return {
      body: el("g", { transform: `translate(${width / 2},${height / 2})` }, [arcs.join(""), labels.join("")]),
      legend: scale.legend,
    };
  },
};
