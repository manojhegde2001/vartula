import type { CSSProperties } from "react";

/**
 * Home-page card preview: a heart sketched on a tiny canvas above a timeline.
 * Pure SVG painted with the category tone, so it adds no JavaScript; it redraws itself on card hover.
 */
export default function SvgAnimatorThumbnail() {
  const track = 248;
  return (
    <svg
      viewBox="0 0 320 200"
      className="draw-hover size-full"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <g transform="translate(100 22)" stroke="var(--tone)" strokeWidth="4">
        <path
          className="draw draw-fill"
          pathLength={1}
          d="M60 100S10 68 10 36A24 24 0 0 1 60 26a24 24 0 0 1 50 10c0 32-50 64-50 64z"
          fill="var(--tone-muted)"
        />
        <ellipse
          className="draw"
          pathLength={1}
          cx="40"
          cy="38"
          rx="8"
          ry="5"
          strokeWidth="3"
          transform="rotate(-30 40 38)"
          style={{ "--d": 400 } as CSSProperties}
        />
      </g>
      <g stroke="var(--tone)" strokeWidth="3" opacity="0.6">
        <path className="draw" pathLength={1} d="M70 40l-12-8M64 64h-14M250 40l12-8M256 64h14" style={{ "--d": 600 } as CSSProperties} />
      </g>
      <g transform="translate(36 150)">
        <rect width={track} height="36" rx="8" fill="var(--card)" stroke="var(--border)" />
        <rect x="10" y="9" width="150" height="7" rx="3.5" fill="var(--tone)" />
        <rect x="60" y="21" width="170" height="7" rx="3.5" fill="var(--tone-muted)" />
        <g className="playhead" style={{ "--track": `${track - 20}px` } as CSSProperties}>
          <line x1={track - 10} y1="-4" x2={track - 10} y2="40" stroke="var(--foreground)" strokeWidth="2" />
          <circle cx={track - 10} cy="-4" r="4" fill="var(--foreground)" />
        </g>
      </g>
    </svg>
  );
}
