/**
 * The Vartula mark from the logo kit: four overlapping petals around a white core ("one circle").
 * Shared by the header, footer and OG cards. The favicon and app icons (app/icon.svg,
 * app/apple-icon.png, public/icon-*.png) are the kit's tile version with a "V".
 */
export const petals = [
  { cx: 48, cy: 30, fill: "#ff5d73" },
  { cx: 66, cy: 48, fill: "#ffc145" },
  { cx: 48, cy: 66, fill: "#2de2a6" },
  { cx: 30, cy: 48, fill: "#7b61ff" },
] as const;

/** Plain SVG (no hooks, no client code) so it renders in server components and ImageResponse. */
export function LogoMark({ size, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} className={className} fill="none" aria-hidden>
      <g className="logo-flower">
        {petals.map((p) => (
          <circle key={p.fill} className="logo-petal" cx={p.cx} cy={p.cy} r="24" fill={p.fill} fillOpacity="0.88" />
        ))}
      </g>
      <circle className="logo-core" cx="48" cy="48" r="5" fill="#ffffff" />
    </svg>
  );
}
