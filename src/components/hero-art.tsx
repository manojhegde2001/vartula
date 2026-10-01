import type { CSSProperties } from "react";
import { categoryInfo } from "@/tools/registry";

const d = (ms: number) => ({ "--d": ms }) as CSSProperties;

const chips = [
  { label: "CSS", className: "-left-6 top-10", delay: 0 },
  { label: "React", className: "-right-3 top-4", delay: 1500 },
  { label: "MP4", className: "-right-3 bottom-16", delay: 3000 },
  { label: "GIF", className: "-left-5 bottom-6", delay: 4500 },
];

/**
 * Home hero illustration: a mini editor window drawing a rocket on a loop, in pure SVG and CSS.
 * Decorative only (aria-hidden); with reduced motion it shows the finished drawing.
 */
export function HeroArt() {
  const track = 300;
  return (
    <div
      aria-hidden
      className="tone draw-loop relative isolate hidden w-80 shrink-0 select-none md:block"
      style={{ "--tone-h": categoryInfo.Animation.hue } as CSSProperties}
    >
      <div className="absolute -inset-10 -z-10 bg-[radial-gradient(closest-side,var(--tone-soft),transparent)]" />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-xl shadow-black/5">
        <div className="flex h-7 items-center gap-1.5 border-b px-3">
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">rocket.svg</span>
        </div>
        <div className="bg-(--tone-soft) p-3">
          <svg
            viewBox="0 0 200 200"
            className="mx-auto h-28 w-full"
            fill="none"
            stroke="var(--tone)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              className="draw draw-fill"
              pathLength={1}
              d="M100 20c28 22 40 58 32 104H68c-8-46 4-82 32-104z"
              fill="var(--card)"
            />
            <circle className="draw draw-fill" pathLength={1} cx="100" cy="78" r="16" fill="var(--tone-muted)" style={d(500)} />
            <path
              className="draw draw-fill"
              pathLength={1}
              d="M68 124l-24 30 30-6M132 124l24 30-30-6"
              fill="var(--tone-muted)"
              style={d(800)}
            />
            <path
              className="draw draw-fill"
              pathLength={1}
              d="M86 136c0 20 6 34 14 44 8-10 14-24 14-44"
              fill="oklch(0.88 0.13 85)"
              stroke="oklch(0.72 0.17 60)"
              style={d(1100)}
            />
            <g stroke="var(--muted-foreground)">
              <path className="draw" pathLength={1} d="M40 60h12" style={d(1400)} />
              <path className="draw" pathLength={1} d="M148 40h14" style={d(1500)} />
              <path className="draw" pathLength={1} d="M150 96h16" style={d(1600)} />
            </g>
          </svg>
        </div>
        <div className="border-t px-3 py-2">
          <svg viewBox={`0 0 ${track + 20} 44`} className="w-full">
            {[
              { y: 6, x: 10, w: 150, fill: "var(--tone)" },
              { y: 18, x: 60, w: 160, fill: "var(--tone-muted)" },
              { y: 30, x: 120, w: 170, fill: "oklch(0.8 0.12 75)" },
            ].map((bar) => (
              <rect key={bar.y} x={bar.x} y={bar.y} width={bar.w} height="7" rx="3.5" fill={bar.fill} />
            ))}
            <g className="playhead" style={{ "--track": `${track - 10}px` } as CSSProperties}>
              <line x1={track} y1="0" x2={track} y2="44" stroke="var(--foreground)" strokeWidth="2" />
            </g>
          </svg>
        </div>
      </div>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={`hero-float absolute rounded-md border bg-card px-2 py-0.5 font-mono text-[11px] font-medium shadow-md ${chip.className}`}
          style={d(chip.delay)}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
