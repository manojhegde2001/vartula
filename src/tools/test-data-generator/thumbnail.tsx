import type { CSSProperties } from "react";

/**
 * Home-page card preview: a schema of typed fields feeding a stack of generated files with size tags.
 * Pure SVG painted with the category tone; the connector redraws on card hover.
 */
export default function TestDataGeneratorThumbnail() {
  const fields = [
    { w: 30, t: 44 },
    { w: 40, t: 30 },
    { w: 24, t: 50 },
    { w: 36, t: 38 },
    { w: 28, t: 46 },
  ];
  return (
    <svg viewBox="0 0 320 200" className="draw-hover size-full" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g transform="translate(26 36)">
        <rect width="124" height="128" rx="8" fill="var(--card)" stroke="var(--border)" />
        <text x="12" y="20" fontSize="10" fontFamily="ui-monospace, monospace" fill="var(--muted-foreground)">{"{ }"}</text>
        {fields.map((f, i) => (
          <g key={i} transform={`translate(12 ${32 + i * 18})`}>
            <rect width={f.w} height="8" rx="4" fill="var(--tone-muted)" />
            <rect x={f.w + 8} width={f.t} height="8" rx="4" fill="var(--tone)" opacity={0.55 + i * 0.08} />
          </g>
        ))}
      </g>
      <path className="draw" pathLength={1} d="M158 100h22M174 94l6 6-6 6" stroke="var(--foreground)" strokeWidth="3" style={{ "--d": 150 } as CSSProperties} />
      {[
        { y: 30, label: "JSON", size: "1k rows" },
        { y: 82, label: "PNG", size: "5 MB" },
        { y: 134, label: "PDF", size: "25 MB" },
      ].map((f, i) => (
        <g key={f.label} transform={`translate(${192 + i * 4} ${f.y})`}>
          <rect width="98" height="40" rx="7" fill="var(--card)" stroke={i === 1 ? "var(--tone)" : "var(--border)"} strokeWidth={i === 1 ? 2 : 1} />
          <rect x="10" y="10" width="20" height="20" rx="4" fill="var(--tone-soft)" />
          <text x="20" y="23.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="var(--tone-fg)">
            {f.label.slice(0, 3)}
          </text>
          <text x="38" y="18" fontSize="9" fontWeight="600" fill="var(--foreground)">
            {f.label}
          </text>
          <text x="38" y="30" fontSize="8" fill="var(--muted-foreground)">
            {f.size}
          </text>
        </g>
      ))}
    </svg>
  );
}
