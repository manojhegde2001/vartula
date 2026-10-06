/**
 * Artwork for the Image Converter's Open Graph card: a big photo shrinking into a small one,
 * with before/after size bars. Plain colours only: Satori can't read CSS variables.
 */
export default function ImageConverterOgArt({ accent }: { accent: string }) {
  return (
    <svg width="360" height="300" viewBox="0 0 360 300">
      <rect x="10" y="40" width="190" height="160" rx="14" fill="#ffffff10" stroke="#ffffff40" strokeWidth="3" />
      <circle cx="150" cy="84" r="16" fill="#f2c14e" />
      <path d="M24 186l52-62 36 38 22-22 54 46z" fill={accent} opacity="0.85" />
      <rect x="10" y="222" width="190" height="16" rx="8" fill="#ffffff30" />

      <path d="M214 120h44M246 108l12 12-12 12" fill="none" stroke="#ffffffb0" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="270" y="78" width="84" height="72" rx="10" fill="#ffffff10" stroke={accent} strokeWidth="4" />
      <circle cx="330" cy="98" r="7" fill="#f2c14e" />
      <path d="M278 142l22-27 16 17 10-10 24 20z" fill={accent} opacity="0.85" />
      <rect x="270" y="222" width="38" height="16" rx="8" fill={accent} />
    </svg>
  );
}
