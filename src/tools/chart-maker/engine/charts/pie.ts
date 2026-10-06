import { arc, pie, type PieArcDatum } from "d3-shape";
import { categoricalScale } from "../colors";
import { col, groupRows, measure } from "../data";
import { bool, num, str } from "../options";
import { el, formatValue, label, text, textWidth, title } from "../svg";
import type { ChartDef, ColumnType, Value } from "../types";

const ANY: ColumnType[] = ["string", "number", "date"];

export const pieChart: ChartDef = {
  id: "pie",
  name: "Pie / donut",
  family: "Proportions",
  description: "Show how a whole splits into parts. Best with a handful of categories.",
  dimensions: [
    { id: "category", name: "Slices", types: ANY, required: true, hint: "One slice per distinct value" },
    { id: "value", name: "Size", types: ["number"], required: false, aggregate: true, hint: "Slice size; counts rows if empty" },
  ],
  options: [
    { id: "innerRadius", label: "Donut hole", group: "Chart", type: "number", default: 0.5, min: 0, max: 0.95, step: 0.05 },
    { id: "padAngle", label: "Gap between slices", group: "Chart", type: "number", default: 1, min: 0, max: 10, step: 0.5 },
    { id: "cornerRadius", label: "Rounded corners", group: "Chart", type: "number", default: 0, min: 0, max: 30 },
    {
      id: "sort",
      label: "Slice order",
      group: "Chart",
      type: "select",
      default: "desc",
      choices: [
        { value: "desc", label: "Largest first" },
        { value: "original", label: "Data order" },
      ],
    },
    {
      id: "labels",
      label: "Slice labels",
      group: "Labels",
      type: "select",
      default: "percent",
      choices: [
        { value: "none", label: "None" },
        { value: "name", label: "Name" },
        { value: "value", label: "Value" },
        { value: "percent", label: "Percentage" },
        { value: "namePercent", label: "Name and percentage" },
      ],
    },
    { id: "showTotal", label: "Total in the middle", group: "Labels", type: "boolean", default: true },
  ],
  defaults: { marginTop: 20, marginRight: 20, marginBottom: 20, marginLeft: 20 },
  hasLegend: () => true,

  draw({ rows, dims, options: o, width, height, theme }) {
    const cCol = col(dims.category)!;
    const slices = groupRows(rows, [cCol])
      .map((g) => ({ key: g.values[0], value: measure(g.rows, dims.value) }))
      .filter((s) => s.value > 0);
    const totalValue = slices.reduce((t, s) => t + s.value, 0);
    const colors = categoricalScale(slices.map((s) => s.key), theme, cCol.name);

    const radius = Math.max(0, Math.min(width, height) / 2);
    const inner = radius * num(o, "innerRadius");
    const layout = pie<{ key: Value; value: number }>()
      .value((s) => s.value)
      .padAngle((num(o, "padAngle") * Math.PI) / 180);
    if (str(o, "sort") === "original") layout.sort(null);
    else layout.sort((a, b) => b.value - a.value);
    const arcs = layout(slices);
    const shape = arc<PieArcDatum<{ key: Value; value: number }>>()
      .innerRadius(inner)
      .outerRadius(radius)
      .cornerRadius(num(o, "cornerRadius"));
    const mid = (inner + radius) / 2;
    const labelArc = arc<PieArcDatum<{ key: Value; value: number }>>().innerRadius(mid).outerRadius(mid);

    const fs = theme.fontSize;
    const mode = str(o, "labels");
    const paths: string[] = [];
    const labels: string[] = [];
    for (const a of arcs) {
      const pct = totalValue ? a.value / totalValue : 0;
      const pctText = `${Math.round(pct * 1000) / 10}%`;
      paths.push(
        el("path", { d: shape(a) ?? "", fill: colors.color(a.data.key), stroke: theme.separator, "stroke-width": 1 }, title(`${label(a.data.key)}: ${formatValue(a.value)} (${pctText})`)),
      );
      if (mode === "none") continue;
      const s =
        mode === "name" ? label(a.data.key) : mode === "value" ? formatValue(a.value) : mode === "percent" ? pctText : `${label(a.data.key)} ${pctText}`;
      const arcLength = (a.endAngle - a.startAngle) * mid;
      const thickness = radius - inner || radius;
      if (fs > Math.min(arcLength, thickness) || textWidth(s, fs) > Math.max(arcLength, thickness) * 0.95) continue;
      const [lx, ly] = labelArc.centroid(a);
      labels.push(text({ x: lx, y: ly, dy: "0.35em", "text-anchor": "middle", fill: "#ffffff", "font-weight": 600 }, s));
    }

    const total =
      bool(o, "showTotal") && inner > fs * 3
        ? text({ y: 0, dy: "0.35em", "text-anchor": "middle", fill: theme.text, "font-size": Math.min(inner / 2.5, fs * 2.4), "font-weight": 700 }, formatValue(totalValue)) +
          text({ y: Math.min(inner / 2.5, fs * 2.4), "text-anchor": "middle", fill: theme.muted }, dims.value?.columns[0]?.name ?? "Total")
        : "";

    return {
      body: el("g", { transform: `translate(${width / 2},${height / 2})` }, [paths.join(""), labels.join(""), total]),
      legend: colors.legend,
    };
  },
};
