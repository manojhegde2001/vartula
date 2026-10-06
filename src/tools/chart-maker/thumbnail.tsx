import type { CSSProperties } from "react";

/**
 * Home-page card preview: a small data table feeding a bar chart with a trend line.
 * Pure SVG painted with the category tone, so it adds no JavaScript; the line redraws on card hover.
 */
export default function ChartMakerThumbnail() {
  const bars = [46, 70, 58, 92, 80, 112];
  return (
    <svg viewBox="0 0 320 200" className="draw-hover size-full" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g transform="translate(28 34)">
        <rect width="78" height="132" rx="8" fill="var(--card)" stroke="var(--border)" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i} transform={`translate(10 ${14 + i * 19})`}>
            <rect width="26" height="7" rx="3.5" fill="var(--tone-muted)" />
            <rect x="34" width={14 + ((i * 7) % 18)} height="7" rx="3.5" fill="var(--tone)" opacity="0.7" />
          </g>
        ))}
      </g>
      <path d="M118 100h18" stroke="var(--border)" strokeWidth="3" />
      <path d="M131 94l6 6-6 6" stroke="var(--border)" strokeWidth="3" />
      <g transform="translate(152 34)">
        <path d="M0 0v132h140" stroke="var(--border)" strokeWidth="2" />
        {bars.map((h, i) => (
          <rect key={i} x={10 + i * 22} y={128 - h} width="14" height={h} rx="3" fill={i % 2 ? "var(--tone)" : "var(--tone-muted)"} />
        ))}
        <path
          className="draw"
          pathLength={1}
          d="M17 70L39 52L61 60L83 30L105 40L127 8"
          stroke="var(--foreground)"
          strokeWidth="3"
          style={{ "--d": 200 } as CSSProperties}
        />
      </g>
    </svg>
  );
}
