import { palettes, ramps } from "./colors";
import type { ChartDef, OptionDef, Options } from "./types";

/** Options every chart shares: artboard, colors, legend. */
export const commonOptions: OptionDef[] = [
  { id: "width", label: "Width", group: "Artboard", type: "number", default: 800, min: 100, max: 4000, step: 10 },
  { id: "height", label: "Height", group: "Artboard", type: "number", default: 500, min: 100, max: 4000, step: 10 },
  { id: "marginTop", label: "Margin top", group: "Artboard", type: "number", default: 20, min: 0, max: 500 },
  { id: "marginRight", label: "Margin right", group: "Artboard", type: "number", default: 20, min: 0, max: 500 },
  { id: "marginBottom", label: "Margin bottom", group: "Artboard", type: "number", default: 40, min: 0, max: 500 },
  { id: "marginLeft", label: "Margin left", group: "Artboard", type: "number", default: 50, min: 0, max: 500 },
  { id: "background", label: "Background", group: "Artboard", type: "color", default: "#ffffff" },
  { id: "transparent", label: "Transparent background", group: "Artboard", type: "boolean", default: false },
  { id: "fontSize", label: "Font size", group: "Labels", type: "number", default: 12, min: 6, max: 40 },
  {
    id: "palette",
    label: "Palette",
    group: "Colors",
    type: "select",
    default: "vivid",
    choices: Object.entries(palettes).map(([value, p]) => ({ value, label: p.name })),
  },
  {
    id: "ramp",
    label: "Number ramp",
    group: "Colors",
    type: "select",
    default: "viridis",
    choices: Object.entries(ramps).map(([value, p]) => ({ value, label: p.name })),
  },
  { id: "showLegend", label: "Show legend", group: "Colors", type: "boolean", default: true },
  { id: "legendWidth", label: "Legend width", group: "Colors", type: "number", default: 150, min: 60, max: 600 },
];

/** Option ids kept when switching to another chart (margins depend on the chart, so they reset). */
export const sharedOptionIds = ["width", "height", "background", "transparent", "fontSize", "palette", "ramp", "legendWidth"];

export function optionDefs(chart: ChartDef): OptionDef[] {
  return [...commonOptions, ...chart.options];
}

export function defaultOptions(chart: ChartDef): Options {
  const out: Options = {};
  for (const o of optionDefs(chart)) out[o.id] = o.default;
  return { ...out, ...chart.defaults };
}

/** Defaults overlaid with valid user values (wrong types and out-of-range numbers are dropped or clamped). */
export function resolveOptions(chart: ChartDef, options: Options): Options {
  const out = defaultOptions(chart);
  for (const o of optionDefs(chart)) {
    const v = options[o.id];
    if (v === undefined) continue;
    if (o.type === "number" && typeof v === "number" && Number.isFinite(v)) out[o.id] = Math.min(o.max, Math.max(o.min, v));
    else if (o.type === "boolean" && typeof v === "boolean") out[o.id] = v;
    else if (o.type === "select" && o.choices.some((c) => c.value === v)) out[o.id] = v;
    else if (o.type === "color" && typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) out[o.id] = v;
  }
  return out;
}

/** Typed readers so charts don't cast. */
export const num = (o: Options, id: string) => Number(o[id]);
export const bool = (o: Options, id: string) => o[id] === true;
export const str = (o: Options, id: string) => String(o[id]);
