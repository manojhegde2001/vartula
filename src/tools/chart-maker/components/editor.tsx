"use client";

import { Fragment, useEffect, useRef, type CSSProperties } from "react";
import { Check, Database, LayoutGrid, Paintbrush, Workflow, type LucideIcon } from "lucide-react";
import { categoryInfo } from "@/tools/registry";
import { STEPS, useChartStore, type StepId } from "../store";
import { ChartStep } from "./chart-step";
import { CustomizeStep } from "./customize-step";
import { DataStep } from "./data-step";
import { MappingStep } from "./mapping-step";
import { cn } from "@/lib/utils";

const stepInfo: Record<StepId, { label: string; icon: LucideIcon }> = {
  data: { label: "Data", icon: Database },
  chart: { label: "Chart", icon: LayoutGrid },
  map: { label: "Map", icon: Workflow },
  style: { label: "Style", icon: Paintbrush },
};

function Stepper() {
  const step = useChartStore((s) => s.step);
  const goTo = useChartStore((s) => s.goTo);
  const hasData = useChartStore((s) => s.dataset !== null);
  const hasChart = useChartStore((s) => s.chartId !== null);
  const current = STEPS.indexOf(step);
  const reachable: Record<StepId, boolean> = { data: true, chart: hasData, map: hasData && hasChart, style: hasData && hasChart };

  return (
    <nav aria-label="Steps">
      <ol className="flex items-center">
        {STEPS.map((id, i) => {
          const { label, icon: Icon } = stepInfo[id];
          const active = i === current;
          const done = i < current && reachable[id];
          return (
            <Fragment key={id}>
              {i > 0 && <li aria-hidden className={cn("mx-1 h-0.5 flex-1 rounded-full sm:mx-2", i <= current ? "bg-(--tone)" : "bg-border")} />}
              <li>
                <button
                  type="button"
                  disabled={!reachable[id]}
                  aria-current={active ? "step" : undefined}
                  onClick={() => goTo(id)}
                  className="group flex flex-col items-center gap-1 rounded-lg px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
                >
                  <span
                    className={cn(
                      "relative flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                      active && "border-(--tone) bg-(--tone) text-white shadow-md shadow-(--tone-muted)",
                      done && "border-(--tone) bg-(--tone-soft) text-(--tone-fg) group-hover:bg-(--tone-muted)",
                      !active && !done && "border-border text-muted-foreground group-enabled:group-hover:border-(--tone-muted)",
                    )}
                  >
                    <Icon className="size-4.5" aria-hidden />
                    {done && (
                      <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-(--tone) text-white">
                        <Check className="size-2.5" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className={cn("text-xs", active ? "font-semibold" : "text-muted-foreground")}>{label}</span>
                </button>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/** RAWGraphs-style flow, one step at a time: data, chart, mapping, then style and export. */
export function ChartMakerEditor() {
  const step = useChartStore((s) => s.step);
  const hasData = useChartStore((s) => s.dataset !== null);
  const hasChart = useChartStore((s) => s.chartId !== null);
  const top = useRef<HTMLDivElement>(null);

  // Bring the stepper back into view when moving to another step from far down the page.
  useEffect(() => {
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  // Fall back to the first step that can be shown (e.g. after clearing the data).
  const shown: StepId = !hasData ? "data" : !hasChart && step !== "data" ? "chart" : step;

  return (
    // .tone gives the editor the Data category accent (see globals.css).
    <div ref={top} className="tone scroll-mt-20 space-y-4" style={{ "--tone-h": categoryInfo.Data.hue } as CSSProperties}>
      <div className="mx-auto max-w-xl">
        <Stepper />
      </div>
      {shown === "data" && <DataStep />}
      {shown === "chart" && <ChartStep />}
      {shown === "map" && <MappingStep />}
      {shown === "style" && <CustomizeStep />}
    </div>
  );
}
