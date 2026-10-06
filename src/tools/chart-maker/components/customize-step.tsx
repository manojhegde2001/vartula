"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { Check, Copy, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getChart, optionDefs, renderChart, resolveOptions, type OptionDef, type OptionGroup } from "../engine";
import type { ExportFormat } from "../lib/export";
import { useChartStore } from "../store";
import { selectClassName, Step } from "./parts";
import { cn } from "@/lib/utils";

const GROUPS: OptionGroup[] = ["Chart", "Labels", "Colors", "Artboard"];
const SCALES = [1, 2, 3];

function OptionField({ def }: { def: OptionDef }) {
  const chart = getChart(useChartStore((s) => s.chartId))!;
  const raw = useChartStore((s) => s.options);
  const setOption = useChartStore((s) => s.setOption);
  const value = resolveOptions(chart, raw)[def.id];
  const id = useId();

  if (def.type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm">
          {def.label}
        </label>
        <Switch id={id} checked={value === true} onCheckedChange={(checked) => setOption(def.id, checked)} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-3">
      <label htmlFor={id} className="text-sm">
        {def.label}
      </label>
      {def.type === "select" ? (
        <select id={id} value={String(value)} onChange={(e) => setOption(def.id, e.target.value)} className={selectClassName}>
          {def.choices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      ) : def.type === "color" ? (
        <div className="flex items-center gap-2">
          <input id={id} type="color" value={String(value)} onChange={(e) => setOption(def.id, e.target.value)} className="h-8 w-10 cursor-pointer rounded-md border bg-transparent p-0.5" />
          <span className="font-mono text-xs text-muted-foreground uppercase">{String(value)}</span>
        </div>
      ) : (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={def.min}
          max={def.max}
          step={def.step ?? 1}
          // Keyed by value so the field resets when the store clamps or changes it.
          key={String(value)}
          defaultValue={Number(value)}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n) && n >= def.min && n <= def.max) setOption(def.id, n);
          }}
          onBlur={(e) => {
            const n = e.target.valueAsNumber;
            setOption(def.id, Number.isFinite(n) ? Math.min(def.max, Math.max(def.min, n)) : def.default);
          }}
          className={cn(selectClassName, "px-2.5 tabular-nums")}
        />
      )}
    </div>
  );
}

function OptionsPanel() {
  const chart = getChart(useChartStore((s) => s.chartId))!;
  const resetOptions = useChartStore((s) => s.resetOptions);
  const defs = optionDefs(chart);
  return (
    <div className="divide-y rounded-lg border">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-medium">Options</h3>
        <Button variant="ghost" size="xs" onClick={resetOptions}>
          <RotateCcw /> Reset
        </Button>
      </div>
      {GROUPS.map((group) => {
        const items = defs.filter((d) => d.group === group);
        if (items.length === 0) return null;
        return (
          <details key={group} open className="group px-3 py-2 [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer list-none text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {group}
              <span className="ml-1 inline-block transition-transform group-open:rotate-90" aria-hidden>
                ›
              </span>
            </summary>
            <div className="mt-2 space-y-2.5">
              {items.map((d) => (
                <OptionField key={d.id} def={d} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function ExportBar({ svg, width, height }: { svg: string; width: number; height: number }) {
  const source = useChartStore((s) => s.source);
  const chart = getChart(useChartStore((s) => s.chartId))!;
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = `${source?.name ?? "data"} ${chart.name}`;

  const run = async (format: ExportFormat) => {
    setBusy(format);
    setError(null);
    try {
      const { exportChart } = await import("../lib/export");
      await exportChart(svg, { format, name, width, height, scale });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={() => run("svg")} disabled={busy !== null}>
        <Download /> SVG
      </Button>
      <Button size="sm" variant="outline" onClick={() => run("png")} disabled={busy !== null}>
        <Download /> PNG
      </Button>
      <Button size="sm" variant="outline" onClick={() => run("jpg")} disabled={busy !== null}>
        <Download /> JPG
      </Button>
      <select aria-label="Image scale" value={scale} onChange={(e) => setScale(Number(e.target.value))} className={cn(selectClassName, "h-7 w-auto text-xs")}>
        {SCALES.map((s) => (
          <option key={s} value={s}>
            {s}× · {width * s}×{height * s}px
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          await navigator.clipboard.writeText(svg);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy SVG code"}
      </Button>
      {error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function CustomizeStep() {
  const dataset = useChartStore((s) => s.dataset)!;
  const chart = getChart(useChartStore((s) => s.chartId))!;
  const mapping = useChartStore((s) => s.mapping);
  const options = useChartStore((s) => s.options);
  // Typing in a field stays responsive while large charts re-render.
  const deferred = useDeferredValue(options);
  const result = useMemo(() => renderChart(chart, dataset, mapping, deferred), [chart, dataset, mapping, deferred]);
  const transparent = resolveOptions(chart, deferred).transparent === true;

  return (
    <Step
      number={4}
      title="Customize and export"
      description="The preview is exactly what you download."
      aside={result.ok && <ExportBar svg={result.svg} width={result.width} height={result.height} />}
    >
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="lg:order-2">
          <div className={cn("rounded-lg border p-2 lg:sticky lg:top-20", transparent ? "bg-checkerboard" : "bg-muted/40")}>
            {result.ok ? (
              <div
                data-testid="chart-preview"
                role="img"
                aria-label={`${chart.name} preview`}
                className="mx-auto [&>svg]:mx-auto [&>svg]:block [&>svg]:h-auto [&>svg]:max-h-[75vh] [&>svg]:w-auto [&>svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: result.svg }}
              />
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-1 p-6 text-center text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Almost there</p>
                {result.issues.map((issue) => (
                  <p key={issue}>{issue}</p>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="lg:order-1">
          <OptionsPanel />
        </div>
      </div>
    </Step>
  );
}
