/**
 * Artwork for the PDF Toolkit's Open Graph card: two pages fanned behind a signed page.
 * Plain colours only: Satori can't read CSS variables.
 */
export default function PdfToolkitOgArt({ accent }: { accent: string }) {
  const lines = (x: number, y: number, n: number, w: number) =>
    Array.from({ length: n }, (_, i) => <rect key={i} x={x} y={y + i * 18} width={i === n - 1 ? w * 0.6 : w} height="8" rx="4" fill="#ffffff30" />);

  return (
    <svg width="360" height="300" viewBox="0 0 360 300">
      <g transform="translate(20 50) rotate(-8)">
        <rect width="150" height="200" rx="10" fill="#ffffff10" stroke="#ffffff40" strokeWidth="3" />
        {lines(20, 30, 6, 110)}
      </g>
      <g transform="translate(190 30)">
        <rect width="160" height="220" rx="12" fill="#ffffff14" stroke={accent} strokeWidth="4" />
        <rect x="20" y="26" width="90" height="14" rx="7" fill={accent} />
        {lines(20, 60, 5, 120)}
        <path d="M20 190h120" stroke="#ffffff50" strokeWidth="2" strokeDasharray="5 5" />
        <path
          d="M26 180c9-22 18-28 22-15s-6 22 3 15 12-25 18-15 3 18 12 12 15-15 21-9 6 9 18 3"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <rect x="60" y="250" width="70" height="26" rx="13" fill={accent} />
    </svg>
  );
}
