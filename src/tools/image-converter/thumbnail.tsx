import type { CSSProperties } from "react";

/**
 * Home-page card preview: a large HEIC photo shrinking into a small JPG, with file-size bars.
 * Pure SVG painted with the category tone; the arrow redraws on card hover.
 */
export default function ImageConverterThumbnail() {
  return (
    <svg viewBox="0 0 320 200" className="draw-hover size-full" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g transform="translate(24 30)">
        <rect width="120" height="100" rx="10" fill="var(--card)" stroke="var(--border)" />
        <circle cx="88" cy="28" r="10" fill="var(--tone-muted)" />
        <path d="M8 88l32-38 22 24 14-14 36 28z" fill="var(--tone)" opacity="0.75" />
        <rect y="112" width="120" height="10" rx="5" fill="var(--tone-muted)" />
        <rect x="0" y="136" width="44" height="14" rx="7" fill="var(--muted)" />
        <text x="22" y="146.5" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--muted-foreground)">HEIC</text>
      </g>
      <path
        className="draw"
        pathLength={1}
        d="M156 80h34M182 72l8 8-8 8"
        stroke="var(--foreground)"
        strokeWidth="3"
        style={{ "--d": 150 } as CSSProperties}
      />
      <g transform="translate(206 50)">
        <rect width="84" height="70" rx="8" fill="var(--card)" stroke="var(--tone)" strokeWidth="2" />
        <circle cx="62" cy="20" r="7" fill="var(--tone-muted)" />
        <path d="M6 62l22-27 16 17 10-10 24 20z" fill="var(--tone)" opacity="0.75" />
        <rect y="82" width="34" height="10" rx="5" fill="var(--tone)" />
        <rect x="0" y="106" width="36" height="14" rx="7" fill="var(--tone-soft)" />
        <text x="18" y="116.5" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--tone-fg)">JPG</text>
      </g>
    </svg>
  );
}
