import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChartPie,
  Group,
  Hash,
  ListTree,
  MoveHorizontal,
  MoveVertical,
  Palette,
  Ruler,
  Scaling,
  Tag,
  Type,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ColumnType } from "../engine";
import { STEPS, useChartStore } from "../store";
import { cn } from "@/lib/utils";

/** Native <select> styled like components/ui/select, so this tool needs no popover code for its many pickers. */
export const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

const typeIcons: Record<ColumnType, LucideIcon> = { number: Hash, date: Calendar, string: Type };
export const typeNames: Record<ColumnType, string> = { number: "Number", date: "Date", string: "Text" };
/** Each column type gets its own color so chips and slots can be matched at a glance. */
export const typeColors: Record<ColumnType, string> = {
  number: "text-sky-600 dark:text-sky-400",
  date: "text-amber-600 dark:text-amber-400",
  string: "text-emerald-600 dark:text-emerald-400",
};

export function TypeIcon({ type, className }: { type: ColumnType; className?: string }) {
  const Icon = typeIcons[type];
  return <Icon aria-label={typeNames[type]} className={cn("size-3.5 shrink-0", typeColors[type], className)} />;
}

/** Pictogram for each dimension id, so the mapping step reads like the chart it builds. */
export const dimensionIcons: Record<string, LucideIcon> = {
  x: MoveHorizontal,
  y: MoveVertical,
  series: Palette,
  color: Palette,
  size: Scaling,
  label: Tag,
  levels: ListTree,
  steps: Waypoints,
  category: ChartPie,
  value: Ruler,
  group: Group,
};

/** One step of the editor, with Back / Next at the bottom. */
export function Panel({
  title,
  aside,
  children,
  next,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  /** Next button: label and whether it can be pressed. Omit on the last step. */
  next?: { label: string; disabled?: boolean };
}) {
  const step = useChartStore((s) => s.step);
  const goTo = useChartStore((s) => s.goTo);
  const index = STEPS.indexOf(step);

  return (
    <section aria-label={title} className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <h2 className="min-w-0 flex-1 text-lg font-semibold tracking-tight">{title}</h2>
        {aside}
      </div>
      <div className="p-4">{children}</div>
      {(index > 0 || next) && (
        <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
          {index > 0 ? (
            <Button variant="ghost" onClick={() => goTo(STEPS[index - 1])}>
              <ArrowLeft /> Back
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button onClick={() => goTo(STEPS[index + 1])} disabled={next.disabled}>
              {next.label} <ArrowRight />
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/** Pill-style radio group for short choices. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex gap-1 rounded-lg bg-muted p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 truncate rounded-md px-2 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&_svg]:size-3.5 [&_svg]:shrink-0",
            value === o.value ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
