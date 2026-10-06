import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The first colors of the default "Vivid" palette, so thumbnails look like the charts they make. */
const BLUE = "#4e79a7";
const ORANGE = "#f28e2b";
const RED = "#e15759";
const A = { fill: BLUE };
const B = { fill: ORANGE };
const C = { fill: RED };

/** A ring segment drawn as a dashed circle stroke (pathLength 100 = full turn). */
function Ring({ r, width, from, size, color, opacity = 1 }: { r: number; width: number; from: number; size: number; color: string; opacity?: number }) {
  return (
    <circle
      cx="32"
      cy="22"
      r={r}
      fill="none"
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={width}
      pathLength={100}
      strokeDasharray={`${size - 1.5} ${100 - size + 1.5}`}
      strokeDashoffset={-from}
      transform="rotate(-90 32 22)"
    />
  );
}

const thumbs: Record<string, ReactNode> = {
  bar: (
    <>
      <rect x="8" y="22" width="9" height="18" rx="1.5" {...B} />
      <rect x="21" y="10" width="9" height="30" rx="1.5" {...A} />
      <rect x="34" y="17" width="9" height="23" rx="1.5" {...B} />
      <rect x="47" y="5" width="9" height="35" rx="1.5" {...A} />
    </>
  ),
  line: (
    <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 32 18 22l10 6 12-16 18-6" stroke={BLUE} />
      <path d="M6 38l12-6 10 2 12-8 18 2" stroke={ORANGE} />
    </g>
  ),
  area: (
    <>
      <path d="M4 14C16 6 24 18 34 12s18-6 26 0v10C50 18 44 26 34 22S16 16 4 24Z" {...A} />
      <path d="M4 24c12-8 20-2 30-2s16-4 26 0v8C48 36 40 32 32 34S14 36 4 32Z" {...B} />
    </>
  ),
  scatter: (
    <>
      <circle cx="12" cy="32" r="4" {...B} />
      <circle cx="22" cy="24" r="6" {...A} />
      <circle cx="35" cy="28" r="3" {...B} />
      <circle cx="42" cy="14" r="7" {...B} />
      <circle cx="54" cy="10" r="4" {...A} />
      <circle cx="28" cy="10" r="2.5" {...A} />
    </>
  ),
  pie: (
    <>
      <Ring r={13} width={10} from={0} size={45} color={BLUE} />
      <Ring r={13} width={10} from={45} size={30} color={ORANGE} />
      <Ring r={13} width={10} from={75} size={25} color={RED} />
    </>
  ),
  heatmap: (
    <>
      {[0, 1, 2, 3, 4, 5].map((x) =>
        [0, 1, 2].map((y) => (
          <rect key={`${x}-${y}`} x={6 + x * 9} y={6 + y * 11} width="8" height="10" rx="1" fill={BLUE} fillOpacity={[0.2, 0.5, 0.95, 0.35, 0.7, 0.15][(x + y * 2) % 6]} />
        )),
      )}
    </>
  ),
  treemap: (
    <>
      <rect x="6" y="4" width="28" height="36" rx="1.5" {...A} />
      <rect x="36" y="4" width="22" height="20" rx="1.5" {...B} />
      <rect x="36" y="26" width="12" height="14" rx="1.5" {...C} />
      <rect x="50" y="26" width="8" height="14" rx="1.5" {...B} />
    </>
  ),
  pack: (
    <>
      <circle cx="32" cy="22" r="19" fill="currentColor" fillOpacity="0.12" />
      <circle cx="25" cy="18" r="9" {...A} />
      <circle cx="40" cy="27" r="7" {...B} />
      <circle cx="38" cy="12" r="4" {...B} />
      <circle cx="26" cy="33" r="4" {...A} />
    </>
  ),
  sunburst: (
    <>
      <Ring r={8} width={6} from={0} size={60} color={BLUE} opacity={0.75} />
      <Ring r={8} width={6} from={60} size={40} color={ORANGE} opacity={0.75} />
      <Ring r={16} width={7} from={0} size={35} color={BLUE} />
      <Ring r={16} width={7} from={35} size={25} color={BLUE} opacity={0.6} />
      <Ring r={16} width={7} from={60} size={22} color={ORANGE} />
      <Ring r={16} width={7} from={82} size={18} color={ORANGE} opacity={0.6} />
    </>
  ),
  alluvial: (
    <>
      <path d="M10 4C32 4 32 16 54 16v10C32 26 32 14 10 14Z" fill={BLUE} fillOpacity="0.5" />
      <path d="M10 16C32 16 32 6 54 6v8C32 14 32 26 10 26Z" fill={ORANGE} fillOpacity="0.5" />
      <path d="M10 28c22 0 22 0 44 0v12c-22 0-22 0-44 0Z" fill={RED} fillOpacity="0.5" />
      <rect x="6" y="4" width="4" height="22" rx="1" {...A} />
      <rect x="6" y="28" width="4" height="12" rx="1" {...C} />
      <rect x="54" y="4" width="4" height="12" rx="1" {...B} />
      <rect x="54" y="16" width="4" height="24" rx="1" {...A} />
    </>
  ),
  boxplot: (
    <g stroke="currentColor" strokeWidth="1.5">
      <path d="M15 4v8m0 18v10M32 10v6m0 14v8M49 6v4m0 18v12" />
      <rect x="9" y="12" width="12" height="18" rx="1" {...B} />
      <rect x="26" y="16" width="12" height="14" rx="1" {...A} />
      <rect x="43" y="10" width="12" height="18" rx="1" {...B} />
      <path d="M9 21h12M26 22h12M43 18h12" strokeWidth="2" />
    </g>
  ),
};

export function ChartThumb({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 44" className={cn("h-11 w-16", className)} aria-hidden>
      {thumbs[id]}
    </svg>
  );
}
