import type { CSSProperties } from "react";

/**
 * Home-page card preview: two PDF pages merging into one, which gets a signature.
 * Pure SVG painted with the category tone; the signature redraws on card hover.
 */
export default function PdfToolkitThumbnail() {
  const lines = (x: number, y: number, n: number, w: number) =>
    Array.from({ length: n }, (_, i) => <rect key={i} x={x} y={y + i * 10} width={i === n - 1 ? w * 0.6 : w} height="4" rx="2" fill="var(--tone-muted)" />);

  return (
    <svg viewBox="0 0 320 200" className="draw-hover size-full" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g transform="translate(30 42) rotate(-6)">
        <rect width="70" height="92" rx="6" fill="var(--card)" stroke="var(--border)" />
        {lines(10, 14, 5, 50)}
      </g>
      <g transform="translate(66 52) rotate(5)">
        <rect width="70" height="92" rx="6" fill="var(--card)" stroke="var(--border)" />
        <rect x="10" y="12" width="50" height="30" rx="3" fill="var(--tone)" opacity="0.6" />
        {lines(10, 52, 3, 50)}
      </g>
      <path d="M152 100h22M168 94l6 6-6 6" stroke="var(--border)" strokeWidth="3" />
      <g transform="translate(190 24)">
        <rect width="104" height="140" rx="8" fill="var(--card)" stroke="var(--tone)" strokeWidth="2" />
        <path d="M78 0v18a6 6 0 0 0 6 6h20" stroke="var(--tone)" strokeWidth="2" />
        <rect x="12" y="34" width="58" height="8" rx="4" fill="var(--tone)" />
        {lines(12, 54, 4, 80)}
        <path d="M12 122h80" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="3 3" />
        <path
          className="draw"
          pathLength={1}
          d="M16 116c6-14 12-18 14-10s-4 14 2 10 8-16 12-10 2 12 8 8 10-10 14-6 4 6 12 2"
          stroke="var(--foreground)"
          strokeWidth="2.4"
          style={{ "--d": 250 } as CSSProperties}
        />
      </g>
    </svg>
  );
}
