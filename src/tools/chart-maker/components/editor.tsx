"use client";

import { useChartStore } from "../store";
import { ChartStep } from "./chart-step";
import { CustomizeStep } from "./customize-step";
import { DataStep } from "./data-step";
import { MappingStep } from "./mapping-step";

/** The four RAWGraphs-style steps: data, chart, mapping, then customize and export. */
export function ChartMakerEditor() {
  const hasData = useChartStore((s) => s.dataset !== null);
  const hasChart = useChartStore((s) => s.chartId !== null);

  return (
    <div className="space-y-4 lg:space-y-6">
      <DataStep />
      {hasData && <ChartStep />}
      {hasData && hasChart && (
        <>
          <MappingStep />
          <CustomizeStep />
        </>
      )}
    </div>
  );
}
