"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, GripVertical, Hand, Plus, X } from "lucide-react";
import { aggregations, getChart, resolveDims, type Aggregation, type Column, type DimensionDef } from "../engine";
import { useChartStore } from "../store";
import { dimensionIcons, Panel, selectClassName, TypeIcon, typeNames } from "./parts";
import { ChartPreview, useRenderedChart } from "./preview";
import { cn } from "@/lib/utils";

const DRAG_TYPE = "application/x-vartula-column";

const draggedColumn = (e: DragEvent) => e.dataTransfer.getData(DRAG_TYPE) || null;

function ColumnChip({ column, onRemove, extra, dimmed }: { column: Column; onRemove?: () => void; extra?: ReactNode; dimmed?: boolean }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, column.name);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "flex h-8 min-w-0 cursor-grab items-center gap-1.5 rounded-full border bg-background pr-1.5 pl-2.5 text-sm shadow-xs transition-opacity active:cursor-grabbing",
        dimmed && "opacity-45",
      )}
    >
      <TypeIcon type={column.type} />
      <span className="min-w-0 flex-1 truncate" title={column.name}>
        {column.name}
      </span>
      {extra}
      {onRemove ? (
        <button type="button" onClick={onRemove} aria-label={`Remove ${column.name}`} className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-3.5" />
        </button>
      ) : (
        <GripVertical className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
      )}
    </div>
  );
}

function DimensionSlot({ dim, columns }: { dim: DimensionDef; columns: Column[] }) {
  const mapping = useChartStore((s) => s.mapping[dim.id]);
  const mapColumn = useChartStore((s) => s.mapColumn);
  const unmapColumn = useChartStore((s) => s.unmapColumn);
  const setAggregation = useChartStore((s) => s.setAggregation);
  const [over, setOver] = useState(false);

  const mapped = (mapping?.columns ?? []).map((name) => columns.find((c) => c.name === name)).filter((c): c is Column => !!c);
  const compatible = columns.filter((c) => dim.types.includes(c.type));
  const available = compatible.filter((c) => !mapped.includes(c));
  const showAdd = dim.multiple || mapped.length === 0;
  const accepts = (name: string | null) => !!name && compatible.some((c) => c.name === name);
  const Icon = dimensionIcons[dim.id] ?? Plus;
  const missing = dim.required && mapped.length < (dim.minColumns ?? 1);

  const drop = (e: DragEvent, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    const name = draggedColumn(e);
    if (accepts(name)) mapColumn(dim.id, name!, index);
  };

  return (
    <div
      data-testid={`dimension-${dim.id}`}
      title={dim.hint}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => drop(e)}
      className={cn(
        "flex flex-col gap-2 rounded-xl border-2 p-3 transition-colors",
        over ? "border-(--tone) bg-(--tone-soft)" : missing ? "border-dashed border-(--tone-muted)" : "border-transparent bg-muted/50",
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", mapped.length ? "bg-(--tone) text-white" : "bg-(--tone-soft) text-(--tone-fg)")}>
          <Icon className="size-4" aria-hidden />
        </span>
        <h3 className="min-w-0 flex-1 text-sm font-medium">
          {dim.name}
          {dim.required && <span className="sr-only"> (required)</span>}
        </h3>
        <span className="flex shrink-0 gap-0.5" title={`Accepts ${dim.types.map((t) => typeNames[t].toLowerCase()).join(", ")}`}>
          {dim.types.map((t) => (
            <TypeIcon key={t} type={t} className="size-3" />
          ))}
        </span>
      </div>

      {mapped.length > 0 && (
        <ul className="space-y-1.5">
          {mapped.map((c, i) => (
            <li key={c.name} onDrop={(e) => drop(e, i)}>
              <ColumnChip
                column={c}
                onRemove={() => unmapColumn(dim.id, c.name)}
                extra={
                  dim.multiple &&
                  mapped.length > 1 && (
                    <span className="flex">
                      <button type="button" disabled={i === 0} onClick={() => mapColumn(dim.id, c.name, i - 1)} aria-label={`Move ${c.name} up`} className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30">
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={i === mapped.length - 1}
                        onClick={() => mapColumn(dim.id, c.name, i + 1)}
                        aria-label={`Move ${c.name} down`}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </span>
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}

      {showAdd && available.length > 0 && (
        <select
          aria-label={`Add a column to ${dim.name}`}
          value=""
          onChange={(e) => e.target.value && mapColumn(dim.id, e.target.value)}
          className={cn(selectClassName, "h-8 rounded-full border-dashed bg-transparent text-muted-foreground dark:bg-transparent")}
        >
          <option value="">+ {mapped.length ? "Add another" : "Add column"}</option>
          {available.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {dim.aggregate && mapped.length > 0 && mapped[0].type === "number" && (
        <select
          aria-label={`Combine rows for ${dim.name}`}
          title="How rows with the same category are combined"
          value={mapping?.aggregation ?? "sum"}
          onChange={(e) => setAggregation(dim.id, e.target.value as Aggregation)}
          className={cn(selectClassName, "h-7 text-xs")}
        >
          {aggregations.map((a) => (
            <option key={a.value} value={a.value}>
              Σ {a.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function MappingStep() {
  const dataset = useChartStore((s) => s.dataset)!;
  const chart = getChart(useChartStore((s) => s.chartId))!;
  const mapping = useChartStore((s) => s.mapping);
  const { issues } = resolveDims(chart, dataset, mapping);
  const used = new Set(Object.values(mapping).flatMap((m) => m.columns));
  const result = useRenderedChart();

  return (
    <Panel title={`Map columns · ${chart.name}`} next={{ label: "Style & export", disabled: issues.length > 0 }}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hand className="size-3.5" aria-hidden /> Drag a column into a box
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {dataset.columns.map((c) => (
                <li key={c.name} className="max-w-48">
                  <ColumnChip column={c} dimmed={used.has(c.name)} />
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {chart.dimensions.map((d) => (
              <DimensionSlot key={`${chart.id}-${d.id}`} dim={d} columns={dataset.columns} />
            ))}
          </div>
        </div>
        <ChartPreview result={result} className="lg:sticky lg:top-20 lg:self-start" />
      </div>
    </Panel>
  );
}
