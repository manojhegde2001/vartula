"use client";

import { useDeferredValue, useMemo } from "react";
import { getChart, renderChart, resolveOptions, type RenderResult } from "../engine";
import { useChartStore } from "../store";
import { ChartThumb } from "./chart-thumbs";
import { cn } from "@/lib/utils";

/** Render the current chart. Deferred so typing in a field stays responsive on large data. */
export function useRenderedChart(): RenderResult | null {
  const dataset = useChartStore((s) => s.dataset);
  const chart = getChart(useChartStore((s) => s.chartId));
  const mapping = useDeferredValue(useChartStore((s) => s.mapping));
  const options = useDeferredValue(useChartStore((s) => s.options));
  return useMemo(() => (chart && dataset ? renderChart(chart, dataset, mapping, options) : null), [chart, dataset, mapping, options]);
}

export function ChartPreview({ result, className }: { result: RenderResult | null; className?: string }) {
  const chart = getChart(useChartStore((s) => s.chartId));
  const options = useChartStore((s) => s.options);
  const transparent = chart ? resolveOptions(chart, options).transparent === true : false;
  if (!chart || !result) return null;

  return (
    <div className={cn("rounded-lg border p-2", transparent ? "bg-checkerboard" : "bg-muted/40", className)}>
      {result.ok ? (
        <div
          data-testid="chart-preview"
          role="img"
          aria-label={`${chart.name} preview`}
          className="[&>svg]:mx-auto [&>svg]:block [&>svg]:h-auto [&>svg]:max-h-[70vh] [&>svg]:w-auto [&>svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: result.svg }}
        />
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
          <ChartThumb id={chart.id} className="h-16 w-24 text-muted-foreground/40" />
          <ul className="space-y-1 text-sm text-muted-foreground">
            {result.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

