import { sankey, sankeyCenter, sankeyJustify, sankeyLeft, sankeyLinkHorizontal, sankeyRight, type SankeyLink, type SankeyNode } from "d3-sankey";
import { categoricalScale } from "../colors";
import { measure } from "../data";
import { num, str, bool } from "../options";
import { el, formatValue, label, text, title } from "../svg";
import type { ChartDef, ColumnType, Row } from "../types";

const ANY: ColumnType[] = ["string", "number", "date"];

interface NodeDatum {
  id: string;
  name: string;
  step: number;
}
interface LinkDatum {
  source: string;
  target: string;
  value: number;
}
type N = SankeyNode<NodeDatum, LinkDatum>;
type L = SankeyLink<NodeDatum, LinkDatum>;
/** After layout, link ends are node objects (the input ids are replaced). */
const node = (end: unknown) => end as N;

const aligns = { justify: sankeyJustify, left: sankeyLeft, right: sankeyRight, center: sankeyCenter };

export const alluvialChart: ChartDef = {
  id: "alluvial",
  name: "Alluvial diagram",
  family: "Flows",
  description: "Flows between the categories of two or more columns, like a Sankey diagram. Band width shows the size of each flow.",
  dimensions: [
    { id: "steps", name: "Steps", types: ANY, required: true, multiple: true, minColumns: 2, hint: "Two or more columns, left to right" },
    { id: "size", name: "Size", types: ["number"], required: false, aggregate: true, hint: "Flow width; counts rows if empty" },
  ],
  options: [
    { id: "nodeWidth", label: "Node width", group: "Chart", type: "number", default: 12, min: 1, max: 100 },
    { id: "nodePadding", label: "Node spacing", group: "Chart", type: "number", default: 12, min: 0, max: 100 },
    {
      id: "align",
      label: "Node alignment",
      group: "Chart",
      type: "select",
      default: "justify",
      choices: [
        { value: "justify", label: "Justify" },
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
        { value: "center", label: "Center" },
      ],
    },
    {
      id: "nodeOrder",
      label: "Node order",
      group: "Chart",
      type: "select",
      default: "auto",
      choices: [
        { value: "auto", label: "Fewest crossings" },
        { value: "size", label: "Largest first" },
        { value: "data", label: "Data order" },
      ],
    },
    {
      id: "linkColor",
      label: "Flow color",
      group: "Colors",
      type: "select",
      default: "source",
      choices: [
        { value: "source", label: "From source" },
        { value: "target", label: "From target" },
        { value: "gray", label: "Gray" },
      ],
    },
    { id: "linkOpacity", label: "Flow opacity", group: "Colors", type: "number", default: 0.45, min: 0.05, max: 1, step: 0.05 },
    { id: "showValues", label: "Node values", group: "Labels", type: "boolean", default: true },
  ],
  defaults: { marginTop: 10, marginRight: 10, marginBottom: 10, marginLeft: 10, showLegend: false },
  hasLegend: () => true,

  draw({ rows, dims, options: o, width, height, theme }) {
    const steps = dims.steps?.columns ?? [];
    const nodes = new Map<string, NodeDatum & { order: number }>();
    const linkRows = new Map<string, { source: string; target: string; rows: Row[] }>();
    const nodeId = (step: number, row: Row) => {
      const name = label(row[steps[step].name]);
      const id = `${step}\u0000${name}`;
      if (!nodes.has(id)) nodes.set(id, { id, name, step, order: nodes.size });
      return id;
    };
    for (const row of rows) {
      for (let i = 0; i < steps.length - 1; i++) {
        const source = nodeId(i, row);
        const target = nodeId(i + 1, row);
        const key = `${source}\u0001${target}`;
        let entry = linkRows.get(key);
        if (!entry) linkRows.set(key, (entry = { source, target, rows: [] }));
        entry.rows.push(row);
      }
    }
    const links: LinkDatum[] = [...linkRows.values()]
      .map((l) => ({ source: l.source, target: l.target, value: measure(l.rows, dims.size) }))
      .filter((l) => l.value > 0);
    const used = new Set(links.flatMap((l) => [l.source, l.target]));
    const nodeList = [...nodes.values()].filter((n) => used.has(n.id));
    if (nodeList.length === 0) return { body: "" };

    const fs = theme.fontSize;
    const order = str(o, "nodeOrder");
    const layout = sankey<NodeDatum, LinkDatum>()
      .nodeId((d) => d.id)
      .nodeWidth(num(o, "nodeWidth"))
      .nodePadding(num(o, "nodePadding"))
      .nodeAlign(aligns[str(o, "align") as keyof typeof aligns] ?? sankeyJustify)
      .extent([
        [0, 0],
        [width, height],
      ]);
    if (order === "data") layout.nodeSort((a, b) => (a as N & { order: number }).order - (b as N & { order: number }).order);
    if (order === "size") layout.nodeSort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const graph = layout({ nodes: nodeList.map((n) => ({ ...n })), links: links.map((l) => ({ ...l })) });

    const colors = categoricalScale(
      graph.nodes.map((n) => n.name),
      theme,
      steps.map((s) => s.name).join(" → "),
    );
    const linkColor = str(o, "linkColor");
    const flowColor = (l: L) => {
      if (linkColor === "gray") return theme.muted;
      const n = node(linkColor === "target" ? l.target : l.source);
      return colors.color(n.name);
    };
    const linkPath = sankeyLinkHorizontal<NodeDatum, LinkDatum>();

    const flows = graph.links.map((l) =>
      el(
        "path",
        { d: linkPath(l) ?? "", fill: "none", stroke: flowColor(l), "stroke-opacity": num(o, "linkOpacity"), "stroke-width": Math.max(1, l.width ?? 1) },
        title(`${node(l.source).name} → ${node(l.target).name}: ${formatValue(l.value)}`),
      ),
    );
    const blocks: string[] = [];
    const labels: string[] = [];
    for (const n of graph.nodes) {
      const x0 = n.x0 ?? 0;
      const x1 = n.x1 ?? 0;
      const y0 = n.y0 ?? 0;
      const y1 = n.y1 ?? 0;
      blocks.push(el("rect", { x: x0, y: y0, width: x1 - x0, height: Math.max(1, y1 - y0), fill: colors.color(n.name) }, title(`${n.name}: ${formatValue(n.value ?? 0)}`)));
      const right = x0 < width / 2;
      const s = bool(o, "showValues") ? `${n.name} (${formatValue(n.value ?? 0)})` : n.name;
      if (y1 - y0 < fs * 0.6) continue;
      labels.push(
        text({ x: right ? x1 + 6 : x0 - 6, y: (y0 + y1) / 2, dy: "0.35em", "text-anchor": right ? "start" : "end", fill: theme.text, "paint-order": "stroke", stroke: theme.separator, "stroke-width": 3, "stroke-linejoin": "round" }, s),
      );
    }
    return {
      body: el("g", { class: "flows" }, flows) + el("g", { class: "nodes" }, blocks) + el("g", { class: "labels" }, labels),
      legend: colors.legend,
    };
  },
};
