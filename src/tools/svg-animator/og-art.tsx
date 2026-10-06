/**
 * Artwork for the SVG Animator's Open Graph card: a heart half-way through drawing itself,
 * above a timeline. Plain colours only: Satori can't read CSS variables.
 */
export default function SvgAnimatorOgArt({ accent }: { accent: string }) {
  return (
    <svg width="360" height="300" viewBox="0 0 360 300">
      <g transform="translate(70 10) scale(1.9)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Full outline faintly, then the drawn part on top. */}
        <path d="M60 100S10 68 10 36A24 24 0 0 1 60 26a24 24 0 0 1 50 10c0 32-50 64-50 64z" stroke="#ffffff26" strokeWidth="4" />
        <path
          d="M60 100S10 68 10 36A24 24 0 0 1 60 26a24 24 0 0 1 50 10c0 32-50 64-50 64z"
          stroke={accent}
          strokeWidth="4.5"
          strokeDasharray="240 400"
        />
        <ellipse cx="40" cy="38" rx="8" ry="5" stroke={accent} strokeWidth="3" transform="rotate(-30 40 38)" />
      </g>
      <g transform="translate(30 230)">
        <rect width="300" height="54" rx="12" fill="#ffffff0d" stroke="#ffffff26" strokeWidth="2" />
        <rect x="16" y="14" width="170" height="10" rx="5" fill={accent} />
        <rect x="70" y="31" width="200" height="10" rx="5" fill={accent} fillOpacity="0.4" />
        <path d="M200 -8v70" stroke="#fafafa" strokeWidth="3" />
        <circle cx="200" cy="-8" r="6" fill="#fafafa" />
      </g>
    </svg>
  );
}
