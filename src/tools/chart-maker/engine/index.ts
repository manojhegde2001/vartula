import { barChart } from "./charts/bar";
import { boxPlotChart } from "./charts/boxplot";
import { heatmapChart } from "./charts/heatmap";
import { packChart, sunburstChart, treemapChart } from "./charts/hierarchy";
import { areaChart, lineChart } from "./charts/line";
import { pieChart } from "./charts/pie";
import { alluvialChart } from "./charts/sankey";
import { scatterChart } from "./charts/scatter";
import type { ChartDef } from "./types";

/** Every chart, in the order the picker shows them. */
export const charts: ChartDef[] = [
  barChart,
  lineChart,
  areaChart,
  scatterChart,
  pieChart,
  heatmapChart,
  treemapChart,
  packChart,
  sunburstChart,
  alluvialChart,
  boxPlotChart,
];

export function getChart(id: string | null | undefined): ChartDef | undefined {
  return charts.find((c) => c.id === id);
}

export * from "./types";
export { aggregations } from "./data";
export { DataParseError, MAX_DATA_BYTES, parseTable, typeTable } from "./parse";
export { defaultOptions, optionDefs, resolveOptions, sharedOptionIds } from "./options";
export { compatibleColumns, renderChart, resolveDims, suggestMapping, type RenderResult } from "./render";
