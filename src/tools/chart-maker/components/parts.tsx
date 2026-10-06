import type { ReactNode } from "react";
import {
  Calendar,
  ChartArea,
  ChartColumnBig,
  ChartPie,
  ChartScatter,
  ChartSpline,
  Grid3x3,
  Hash,
  LayoutDashboard,
  Orbit,
  Sun,
  Type,
  Waypoints,
  ChartCandlestick,
  type LucideIcon,
} from "lucide-react";
import type { ColumnType } from "../engine";
import { cn } from "@/lib/utils";

/** Native <select> styled like components/ui/select, so this tool needs no popover code for its many pickers. */
export const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

export const chartIcons: Record<string, LucideIcon> = {
  bar: ChartColumnBig,
  line: ChartSpline,
  area: ChartArea,
  scatter: ChartScatter,
  pie: ChartPie,
  heatmap: Grid3x3,
  treemap: LayoutDashboard,
  pack: Orbit,
  sunburst: Sun,
  alluvial: Waypoints,
  boxplot: ChartCandlestick,
};

const typeIcons: Record<ColumnType, LucideIcon> = { number: Hash, date: Calendar, string: Type };
export const typeNames: Record<ColumnType, string> = { number: "Number", date: "Date", string: "Text" };

export function TypeIcon({ type, className }: { type: ColumnType; className?: string }) {
  const Icon = typeIcons[type];
  return <Icon aria-label={typeNames[type]} className={cn("size-3.5 shrink-0", className)} />;
}

/** One numbered step of the editor. */
export function Step({
  number,
  title,
  description,
  aside,
  children,
  id,
}: {
  number: number;
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  const headingId = `step-${number}`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-20 rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden>
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="font-semibold">
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
