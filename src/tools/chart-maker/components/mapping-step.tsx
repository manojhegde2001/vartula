"use client";

import { useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";
import { aggregations, getChart, resolveDims, type Aggregation, type Column, type DimensionDef } from "../engine";
import { useChartStore } from "../store";
import { selectClassName, Step, TypeIcon, typeNames } from "./parts";
import { cn } from "@/lib/utils";

const DRAG_TYPE = "application/x-vartula-column";

const draggedColumn = (e: DragEvent) => e.dataTransfer.getData(DRAG_TYPE) || null;

function ColumnChip({ column, onRemove, extra }: { column: Column; onRemove?: () => void; extra?: React.ReactNode }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, column.name);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="flex h-8 min-w-0 cursor-grab items-center gap-1.5 rounded-md border bg-background px-2 text-sm shadow-xs active:cursor-grabbing"
    >
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <TypeIcon type={column.type} className="text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate" title={column.name}>
        {column.name}
      </span>
      {extra}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${column.name}`} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-3.5" />
        </button>
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
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => drop(e)}
      className={cn("flex flex-col gap-2 rounded-lg border p-3 transition-colors", over && "border-primary bg-primary/5")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium">
            {dim.name}
            {dim.required && (
              <span className="text-destructive" title="Required">
                {" "}
                *
              </span>
            )}
          </h3>
          {dim.hint && <p className="text-xs text-muted-foreground">{dim.hint}</p>}
        </div>
        <div className="flex shrink-0 gap-1 pt-0.5 text-muted-foreground" title={`Accepts ${dim.types.map((t) => typeNames[t].toLowerCase()).join(", ")}`}>
          {dim.types.map((t) => (
            <TypeIcon key={t} type={t} />
          ))}
        </div>
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

      {showAdd && (
        <select
          aria-label={`Add a column to ${dim.name}`}
          value=""
          disabled={available.length === 0}
          onChange={(e) => e.target.value && mapColumn(dim.id, e.target.value)}
          className={cn(selectClassName, "border-dashed text-muted-foreground")}
        >
          <option value="">{available.length ? (mapped.length ? "Add another column…" : "Drop or choose a column…") : "No matching columns"}</option>
          {available.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {dim.aggregate && mapped.length > 0 && mapped[0].type === "number" && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">Combine rows by</span>
          <select
            value={mapping?.aggregation ?? "sum"}
            onChange={(e) => setAggregation(dim.id, e.target.value as Aggregation)}
            className={cn(selectClassName, "h-7 text-xs")}
          >
            {aggregations.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export function MappingStep() {
  const dataset = useChartStore((s) => s.dataset)!;
  const chart = getChart(useChartStore((s) => s.chartId))!;
  const mapping = useChartStore((s) => s.mapping);
  const { issues } = resolveDims(chart, dataset, mapping);

  return (
    <Step number={3} title="Map your columns" description={`Drag columns onto the ${chart.name.toLowerCase()}'s dimensions, or pick them from the lists.`}>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Columns</h3>
          <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
            {dataset.columns.map((c) => (
              <li key={c.name}>
                <ColumnChip column={c} />
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {chart.dimensions.map((d) => (
              <DimensionSlot key={`${chart.id}-${d.id}`} dim={d} columns={dataset.columns} />
            ))}
          </div>
          {issues.length > 0 && (
            <ul role="status" className="space-y-1 text-sm text-muted-foreground">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Step>
  );
}
