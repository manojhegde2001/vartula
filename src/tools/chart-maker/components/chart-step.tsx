"use client";

import { Check } from "lucide-react";
import { charts } from "../engine";
import { useChartStore } from "../store";
import { ChartThumb } from "./chart-thumbs";
import { Panel } from "./parts";
import { cn } from "@/lib/utils";

export function ChartStep() {
  const chartId = useChartStore((s) => s.chartId);
  const selectChart = useChartStore((s) => s.selectChart);

  return (
    <Panel title="Pick a chart" next={{ label: "Map columns", disabled: !chartId }}>
      <div role="radiogroup" aria-label="Chart type" className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {charts.map((c) => {
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
                "group relative flex flex-col items-center gap-2 rounded-xl border p-3 pt-4 text-center transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                checked ? "border-(--tone) bg-(--tone-soft) ring-1 ring-(--tone)" : "hover:-translate-y-0.5 hover:border-(--tone-muted) hover:shadow-sm",
              )}
            >
              {checked && (
                <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-(--tone) text-white">
                  <Check className="size-3" aria-hidden />
                </span>
              )}
              <ChartThumb id={c.id} className={cn("h-14 w-20 transition-colors", checked ? "text-(--tone-fg)" : "text-muted-foreground group-hover:text-(--tone-fg)")} />
              <span className="text-sm font-medium">{c.name}</span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
