"use client";

import { useId, useState } from "react";
import { ChartColumn, Check, Copy, Download, Frame, Palette, RotateCcw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { palettes, ramps } from "../engine/colors";
import { getChart, optionDefs, resolveOptions, type OptionDef, type OptionGroup } from "../engine";
import type { ExportFormat } from "../lib/export";
import { useChartStore } from "../store";
import { Panel, Segmented, selectClassName } from "./parts";
import { ChartPreview, useRenderedChart } from "./preview";
import { cn } from "@/lib/utils";

const GROUPS: { id: OptionGroup; label: string; icon: typeof ChartColumn }[] = [
  { id: "Chart", label: "Chart", icon: ChartColumn },
  { id: "Colors", label: "Colors", icon: Palette },
  { id: "Labels", label: "Text", icon: Type },
  { id: "Artboard", label: "Size", icon: Frame },
];
const SCALES = ["1", "2", "3"];

/** Picture-based pickers for the two color options. */
function SwatchPicker({ id, value, onChange }: { id: "palette" | "ramp"; value: string; onChange: (v: string) => void }) {
  const entries =
    id === "palette"
      ? Object.entries(palettes).map(([k, p]) => [k, p.name, p.colors.slice(0, 6)] as const)
      : Object.entries(ramps).map(([k, p]) => [k, p.name, p.stops] as const);
  return (
    <div role="radiogroup" aria-label={id === "palette" ? "Palette" : "Number ramp"} className="grid grid-cols-5 gap-1.5">
      {entries.map(([key, name, colors]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          aria-label={name}
          title={name}
          onClick={() => onChange(key)}
          className={cn(
            "h-7 overflow-hidden rounded-md border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            value === key ? "border-(--tone)" : "border-transparent hover:border-muted-foreground/40",
          )}
          style={{
            // Ramps blend; palettes show hard-edged stripes of their first colors.
            background:
              id === "ramp"
                ? `linear-gradient(90deg, ${colors.join(",")})`
                : `linear-gradient(90deg, ${colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(",")})`,
          }}
        />
      ))}
    </div>
  );
}

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
  if (def.id === "palette" || def.id === "ramp") {
    return (
      <div className="space-y-1.5">
        <span className="text-sm">{def.label}</span>
        <SwatchPicker id={def.id} value={String(value)} onChange={(v) => setOption(def.id, v)} />
      </div>
    );
  }
  if (def.type === "select" && def.choices.length <= 4) {
    return (
      <div className="space-y-1.5">
        <span className="text-sm">{def.label}</span>
        <Segmented label={def.label} value={String(value)} onChange={(v) => setOption(def.id, v)} options={def.choices} />
      </div>
    );
  }
  if (def.type === "number" && def.group !== "Artboard") {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <label htmlFor={id}>{def.label}</label>
          <span className="text-xs text-muted-foreground tabular-nums">{Number(value)}</span>
        </div>
        <input
          id={id}
          type="range"
          min={def.min}
          max={def.max}
          step={def.step ?? 1}
          value={Number(value)}
          onChange={(e) => setOption(def.id, e.target.valueAsNumber)}
          className="w-full accent-(--tone)"
        />
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
  const [tab, setTab] = useState<OptionGroup>("Chart");
  const defs = optionDefs(chart);
  const groups = GROUPS.filter((g) => defs.some((d) => d.group === g.id));

  return (
    <div className="rounded-xl border">
      <div className="flex items-center gap-1 border-b p-1.5">
        <div role="tablist" aria-label="Option groups" className="flex flex-1 gap-1">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={tab === g.id}
              onClick={() => setTab(g.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                tab === g.id ? "bg-(--tone-soft) font-medium text-(--tone-fg)" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <g.icon className="size-4" aria-hidden />
              {g.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={resetOptions} aria-label="Reset options" title="Reset options">
          <RotateCcw />
        </Button>
      </div>
      <div role="tabpanel" className="space-y-4 p-3">
        {defs
          .filter((d) => d.group === tab)
          .map((d) => (
            <OptionField key={d.id} def={d} />
          ))}
      </div>
    </div>
  );
}

function ExportPanel({ svg, width, height }: { svg: string; width: number; height: number }) {
  const source = useChartStore((s) => s.source);
  const chart = getChart(useChartStore((s) => s.chartId))!;
  const [scale, setScale] = useState("2");
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = `${source?.name ?? "data"} ${chart.name}`;

  const run = async (format: ExportFormat) => {
    setBusy(format);
    setError(null);
    try {
      const { exportChart } = await import("../lib/export");
      await exportChart(svg, { format, name, width, height, scale: Number(scale) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <h3 className="flex items-center gap-1.5 text-sm font-medium">
        <Download className="size-4" aria-hidden /> Download
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {(["svg", "png", "jpg"] as const).map((f) => (
          <Button key={f} variant={f === "svg" ? "default" : "outline"} onClick={() => run(f)} disabled={busy !== null}>
            {f.toUpperCase()}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">Image scale</span>
        <Segmented
          label="Image scale"
          className="flex-1"
          value={scale}
          onChange={setScale}
          options={SCALES.map((s) => ({ value: s, label: `${s}×`, title: `${width * Number(s)} × ${height * Number(s)} px` }))}
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={async () => {
          await navigator.clipboard.writeText(svg);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy SVG code"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function CustomizeStep() {
  const chart = getChart(useChartStore((s) => s.chartId))!;
  const result = useRenderedChart();

  return (
    <Panel title={`Style & export · ${chart.name}`}>
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
        <ChartPreview result={result} className="lg:sticky lg:top-20 lg:order-2 lg:self-start" />
        <div className="space-y-4 lg:order-1">
          {result?.ok && <ExportPanel svg={result.svg} width={result.width} height={result.height} />}
          <OptionsPanel />
        </div>
      </div>
    </Panel>
  );
}
