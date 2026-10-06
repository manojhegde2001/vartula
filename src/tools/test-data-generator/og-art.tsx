/**
 * Artwork for the Test Data Generator's Open Graph card: a schema panel beside a stack of generated
 * files with exact sizes. Plain colours only: Satori can't read CSS variables.
 */
export default function TestDataGeneratorOgArt({ accent }: { accent: string }) {
  const rows = [70, 96, 58, 84, 64, 90];
  const files = [
    { label: "JSON", size: "1M rows" },
    { label: "PNG", size: "5 MB" },
    { label: "PDF", size: "25 MB" },
  ];
  return (
    <svg width="360" height="300" viewBox="0 0 360 300">
      <rect x="6" y="30" width="160" height="240" rx="14" fill="#ffffff0d" stroke="#ffffff40" strokeWidth="3" />
      {rows.map((w, i) => (
        <g key={i}>
          <rect x="24" y={56 + i * 34} width="44" height="12" rx="6" fill="#ffffff40" />
          <rect x="76" y={56 + i * 34} width={w - 20} height="12" rx="6" fill={accent} opacity={0.6 + i * 0.06} />
        </g>
      ))}
      {files.map((f, i) => (
        <g key={f.label} transform={`translate(${190 + i * 6} ${40 + i * 78})`}>
          <rect width="150" height="62" rx="12" fill="#ffffff10" stroke={i === 1 ? accent : "#ffffff40"} strokeWidth={i === 1 ? 4 : 3} />
          <rect x="14" y="14" width="34" height="34" rx="8" fill={accent} opacity="0.85" />
          <rect x="60" y="18" width="58" height="10" rx="5" fill="#ffffffb0" />
          <rect x="60" y="36" width="40" height="8" rx="4" fill="#ffffff50" />
        </g>
      ))}
    </svg>
  );
}
