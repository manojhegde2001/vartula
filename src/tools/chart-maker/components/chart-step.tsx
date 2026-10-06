"use client";

import { charts } from "../engine";
import { useChartStore } from "../store";
import { chartIcons, Step } from "./parts";
import { cn } from "@/lib/utils";

export function ChartStep() {
  const chartId = useChartStore((s) => s.chartId);
  const selectChart = useChartStore((s) => s.selectChart);

  return (
    <Step number={2} title="Choose a chart" description="Each chart asks for different columns in the next step.">
      <div role="radiogroup" aria-label="Chart type" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {charts.map((c) => {
          const Icon = chartIcons[c.id];
          const checked = c.id === chartId;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={checked}
              title={c.description}
              onClick={() => selectChart(c.id)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                checked ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
              )}
            >
              <Icon className={cn("size-6", checked ? "text-primary" : "text-muted-foreground")} aria-hidden />
              <span>
                <span className="block text-sm font-medium">{c.name}</span>
                <span className="block text-xs text-muted-foreground">{c.family}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Step>
  );
}
