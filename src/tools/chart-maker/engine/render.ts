import { luminance, palettes, ramps } from "./colors";
import { bool, num, resolveOptions, str } from "./options";
import { el, esc, fit, formatValue, text } from "./svg";
import type { ChartDef, Column, Dataset, DrawContext, Legend, Mapping, Options, Theme } from "./types";

/** Columns of `dataset` this dimension can take. */
export function compatibleColumns(chart: ChartDef, dimId: string, columns: Column[]): Column[] {
  const dim = chart.dimensions.find((d) => d.id === dimId);
  return dim ? columns.filter((c) => dim.types.includes(c.type)) : [];
}

/** Turn a mapping into full columns, listing what is still missing. */
export function resolveDims(chart: ChartDef, dataset: Dataset, mapping: Mapping): { dims: DrawContext["dims"]; issues: string[] } {
  const dims: DrawContext["dims"] = {};
  const issues: string[] = [];
  for (const dim of chart.dimensions) {
    const m = mapping[dim.id];
    const columns = (m?.columns ?? [])
      .map((name) => dataset.columns.find((c) => c.name === name))
      .filter((c): c is Column => !!c && dim.types.includes(c.type))
      .slice(0, dim.multiple ? undefined : 1);
    const needed = dim.required ? (dim.minColumns ?? 1) : 0;
    if (columns.length < needed) {
      issues.push(needed > 1 ? `“${dim.name}” needs at least ${needed} columns.` : `Add a column to “${dim.name}”.`);
    }
    if (columns.length > 0) dims[dim.id] = { columns, aggregation: m?.aggregation ?? "sum" };
  }
  return { dims, issues };
}

/**
 * Fill the required dimensions with the first fitting columns, preferring each dimension's
 * first accepted type, and keep whatever still fits from `previous`.
 */
export function suggestMapping(chart: ChartDef, dataset: Dataset, previous: Mapping = {}): Mapping {
  const mapping: Mapping = {};
  const used = new Set<string>();
  for (const dim of chart.dimensions) {
    const kept = (previous[dim.id]?.columns ?? []).filter((name) => {
      const c = dataset.columns.find((col) => col.name === name);
      return c && dim.types.includes(c.type) && !used.has(name);
    });
    if (kept.length > 0) {
      const columns = dim.multiple ? kept : kept.slice(0, 1);
      columns.forEach((c) => used.add(c));
      mapping[dim.id] = { columns, aggregation: previous[dim.id]?.aggregation ?? "sum" };
    }
  }
  for (const dim of chart.dimensions) {
    if (!dim.required) continue;
    const want = dim.minColumns ?? 1;
    const columns = mapping[dim.id]?.columns ?? [];
    for (const type of dim.types) {
      for (const c of dataset.columns) {
        if (columns.length >= want) break;
        if (c.type === type && !used.has(c.name)) {
          columns.push(c.name);
          used.add(c.name);
        }
      }
    }
    if (columns.length > 0) mapping[dim.id] = { columns, aggregation: mapping[dim.id]?.aggregation ?? "sum" };
  }
  // A size-like optional number dimension is almost always wanted: fill it with a spare number column.
  for (const dim of chart.dimensions) {
    if (dim.required || mapping[dim.id] || !dim.aggregate || dim.types.length !== 1) continue;
    const spare = dataset.columns.find((c) => c.type === "number" && !used.has(c.name));
    if (spare && ["y", "value", "size"].includes(dim.id)) {
      mapping[dim.id] = { columns: [spare.name], aggregation: "sum" };
      used.add(spare.name);
    }
  }
  return mapping;
}

export function makeTheme(o: Options): { theme: Theme; background: string | null } {
  const background = bool(o, "transparent") ? null : str(o, "background");
  const dark = background !== null && luminance(background) < 0.35;
  return {
    background,
    theme: {
      text: dark ? "#ececec" : "#262626",
      muted: dark ? "#a3a3a3" : "#737373",
      grid: dark ? "#3a3a3a" : "#e5e5e5",
      separator: background ?? "#ffffff",
      fontSize: num(o, "fontSize"),
      palette: (palettes[str(o, "palette")] ?? palettes.vivid).colors,
      sequential: (ramps[str(o, "ramp")] ?? ramps.viridis).stops,
    },
  };
}

function drawLegend(legend: Legend, width: number, maxHeight: number, theme: Theme): string {
  const fs = theme.fontSize;
  const parts = [text({ y: fs, fill: theme.text, "font-weight": 600 }, fit(legend.title, width, fs) || legend.title.slice(0, 1))];
  if (legend.kind === "sequential") {
    const id = "vartula-ramp";
    const stops = legend.stops.map((c, i) => el("stop", { offset: `${(i / (legend.stops.length - 1)) * 100}%`, "stop-color": c }));
    parts.push(
      el("defs", {}, el("linearGradient", { id }, stops)),
      el("rect", { y: fs + 8, width, height: 12, fill: `url(#${id})` }),
      text({ y: fs * 2 + 22, fill: theme.text }, formatValue(legend.domain[0])),
      text({ x: width, y: fs * 2 + 22, "text-anchor": "end", fill: theme.text }, formatValue(legend.domain[1])),
    );
    return parts.join("");
  }
  const row = Math.round(fs * 1.7);
  const capacity = Math.max(1, Math.floor((maxHeight - fs - 8) / row));
  const items = legend.items.length > capacity ? legend.items.slice(0, capacity - 1) : legend.items;
  items.forEach((item, i) => {
    const y = fs + 8 + i * row;
    parts.push(
      el("rect", { y, width: fs, height: fs, rx: 2, fill: item.color }),
      text({ x: fs + 6, y: y + fs / 2, dy: "0.35em", fill: theme.text }, fit(item.label, width - fs - 6, fs) || "…"),
    );
  });
  if (items.length < legend.items.length) {
    parts.push(text({ y: fs + 8 + items.length * row + fs / 2, dy: "0.35em", fill: theme.muted }, `+${legend.items.length - items.length} more`));
  }
  return parts.join("");
}

export type RenderResult = { ok: true; svg: string; width: number; height: number } | { ok: false; issues: string[] };

/** Render a chart to standalone SVG markup. The preview and every export use this. */
export function renderChart(chart: ChartDef, dataset: Dataset, mapping: Mapping, options: Options): RenderResult {
  const { dims, issues } = resolveDims(chart, dataset, mapping);
  if (issues.length > 0) return { ok: false, issues };
  const o = resolveOptions(chart, options);
  const { theme, background } = makeTheme(o);
  const W = num(o, "width");
  const H = num(o, "height");
  const [mt, mr, mb, ml] = [num(o, "marginTop"), num(o, "marginRight"), num(o, "marginBottom"), num(o, "marginLeft")];
  const legendWidth = bool(o, "showLegend") && chart.hasLegend(dims) ? num(o, "legendWidth") : 0;
  // The legend sits at the right edge; the right margin separates it from the plot.
  const width = Math.max(10, W - ml - mr - legendWidth);
  const height = Math.max(10, H - mt - mb);

  const result = chart.draw({ rows: dataset.rows, dims, options: o, width, height, theme });
  const legend = legendWidth && result.legend ? el("g", { class: "legend", transform: `translate(${W - legendWidth},${mt})` }, drawLegend(result.legend, legendWidth - 12, height, theme)) : "";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ` +
    `font-family="${esc("system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif")}" font-size="${theme.fontSize}">` +
    `<title>${esc(chart.name)}</title>` +
    (background ? el("rect", { width: W, height: H, fill: background }) : "") +
    el("g", { class: "chart", transform: `translate(${ml},${mt})` }, result.body) +
    legend +
    "</svg>";
  return { ok: true, svg, width: W, height: H };
}
