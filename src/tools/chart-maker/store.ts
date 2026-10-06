import { create } from "zustand";
import {
  DataParseError,
  defaultOptions,
  getChart,
  parseTable,
  sharedOptionIds,
  suggestMapping,
  typeTable,
  type Aggregation,
  type ColumnType,
  type Dataset,
  type Mapping,
  type Options,
  type OptionValue,
  type RawTable,
} from "./engine";
import { samples } from "./samples";

export interface DataSource {
  name: string;
  /** The text as pasted or uploaded, so it can be edited again. */
  text: string;
  sampleId: string | null;
}

/** Editor steps, in order. */
export const STEPS = ["data", "chart", "map", "style"] as const;
export type StepId = (typeof STEPS)[number];

interface ChartMakerState {
  step: StepId;
  source: DataSource | null;
  raw: RawTable | null;
  dataset: Dataset | null;
  error: string | null;
  chartId: string | null;
  mapping: Mapping;
  options: Options;

  goTo: (step: StepId) => void;
  /** Parse pasted or uploaded text. Returns false and sets `error` on failure. */
  loadText: (text: string, name: string) => boolean;
  loadSample: (id: string) => void;
  clearData: () => void;
  setColumnType: (column: string, type: ColumnType) => void;
  selectChart: (id: string) => void;
  /** Put `column` into a dimension (replacing a single-column dimension, appending to a multiple one). */
  mapColumn: (dimension: string, column: string, index?: number) => void;
  unmapColumn: (dimension: string, column: string) => void;
  setAggregation: (dimension: string, aggregation: Aggregation) => void;
  setOption: (id: string, value: OptionValue) => void;
  resetOptions: () => void;
  setError: (message: string | null) => void;
}

function withChart(chartId: string | null, dataset: Dataset | null, previous: Mapping) {
  const chart = getChart(chartId);
  return chart && dataset ? suggestMapping(chart, dataset, previous) : {};
}

export const useChartStore = create<ChartMakerState>()((set, get) => ({
  step: "data",
  source: null,
  raw: null,
  dataset: null,
  error: null,
  chartId: null,
  mapping: {},
  options: {},

  goTo: (step) => set({ step }),

  loadText: (text, name) => {
    try {
      const raw = parseTable(text);
      const dataset = typeTable(raw);
      set((s) => ({
        source: { name, text, sampleId: null },
        raw,
        dataset,
        error: null,
        mapping: withChart(s.chartId, dataset, s.mapping),
        step: "chart",
      }));
      return true;
    } catch (err) {
      set({ error: err instanceof DataParseError ? err.message : "Could not read that data. Use CSV, TSV or JSON." });
      return false;
    }
  },

  loadSample: (id) => {
    const sample = samples.find((s) => s.id === id);
    if (!sample) return;
    const raw = parseTable(sample.data);
    const chart = getChart(sample.chart)!;
    set((s) => ({
      source: { name: sample.name, text: sample.data, sampleId: sample.id },
      raw,
      dataset: typeTable(raw),
      error: null,
      chartId: chart.id,
      mapping: sample.mapping,
      options: carryOptions(s.options, defaultOptions(chart)),
      step: "map",
    }));
  },

  clearData: () => set({ source: null, raw: null, dataset: null, error: null, mapping: {}, step: "data" }),

  setColumnType: (column, type) => {
    const { raw, dataset, chartId, mapping } = get();
    if (!raw || !dataset) return;
    const types = Object.fromEntries(dataset.columns.map((c) => [c.name, c.name === column ? type : c.type]));
    const next = typeTable(raw, types);
    set({ dataset: next, mapping: withChart(chartId, next, mapping) });
  },

  selectChart: (id) => {
    const chart = getChart(id);
    if (!chart) return;
    set((s) => ({
      chartId: id,
      mapping: s.dataset ? suggestMapping(chart, s.dataset, s.mapping) : {},
      options: carryOptions(s.options, defaultOptions(chart)),
      step: "map",
    }));
  },

  mapColumn: (dimension, column, index) =>
    set((s) => {
      const dim = getChart(s.chartId)?.dimensions.find((d) => d.id === dimension);
      if (!dim) return {};
      // A column lives in one dimension at a time, like dragging it there.
      const mapping: Mapping = {};
      for (const [id, m] of Object.entries(s.mapping)) {
        mapping[id] = id === dimension ? m : { ...m, columns: m.columns.filter((c) => c !== column) };
      }
      const current = (mapping[dimension]?.columns ?? []).filter((c) => c !== column);
      const columns = dim.multiple ? [...current.slice(0, index ?? current.length), column, ...current.slice(index ?? current.length)] : [column];
      mapping[dimension] = { columns, aggregation: mapping[dimension]?.aggregation ?? "sum" };
      return { mapping };
    }),

  unmapColumn: (dimension, column) =>
    set((s) => {
      const m = s.mapping[dimension];
      if (!m) return {};
      return { mapping: { ...s.mapping, [dimension]: { ...m, columns: m.columns.filter((c) => c !== column) } } };
    }),

  setAggregation: (dimension, aggregation) =>
    set((s) => ({ mapping: { ...s.mapping, [dimension]: { columns: s.mapping[dimension]?.columns ?? [], aggregation } } })),

  setOption: (id, value) => set((s) => ({ options: { ...s.options, [id]: value } })),

  resetOptions: () => {
    const chart = getChart(get().chartId);
    if (chart) set({ options: defaultOptions(chart) });
  },

  setError: (message) => set({ error: message }),
}));

/** Keep artboard, palette and legend choices when switching chart; take the new chart's defaults for the rest. */
function carryOptions(previous: Options, defaults: Options): Options {
  const out = { ...defaults };
  for (const id of sharedOptionIds) if (previous[id] !== undefined) out[id] = previous[id];
  return out;
}
