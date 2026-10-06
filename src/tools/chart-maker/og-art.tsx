/**
 * Artwork for the Chart Maker's Open Graph card: a bar chart with a trend line beside a donut and
 * its legend, in the default "Vivid" chart palette. Plain colours only: Satori can't read CSS variables.
 */
export default function ChartMakerOgArt({ accent }: { accent: string }) {
  const bars = [
    { h: 90, c: "#4e79a7" },
    { h: 150, c: "#f28e2b" },
    { h: 120, c: "#4e79a7" },
    { h: 196, c: "#e15759" },
  ];
  const points = bars.map((_, i) => [57 + i * 48, [150, 96, 118, 48][i]] as const);
  // Donut slices as dashes on one circle.
  const circumference = 2 * Math.PI * 38;
  const slices = [
    { share: 0.45, start: 0, c: "#4e79a7" },
    { share: 0.3, start: 0.45, c: "#f28e2b" },
    { share: 0.25, start: 0.75, c: "#e15759" },
  ];

  return (
    <svg width="360" height="300" viewBox="0 0 360 300">
      {[90, 160, 230].map((y) => (
        <path key={y} d={`M24 ${y}h206`} stroke="#ffffff14" strokeWidth="2" />
      ))}
      <path d="M24 20v250h206" fill="none" stroke="#ffffff40" strokeWidth="3" />
      {bars.map((b, i) => (
        <rect key={i} x={40 + i * 48} y={270 - b.h} width="34" height={b.h} rx="6" fill={b.c} />
      ))}
      <path d={`M${points.map(([x, y]) => `${x} ${y}`).join(" L")}`} fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="8" fill="#0c0d12" stroke={accent} strokeWidth="5" />
      ))}

      <g transform="translate(298 84) rotate(-90)">
        {slices.map((s) => {
          const dash = s.share * circumference - 4;
          return (
            <circle
              key={s.c}
              r="38"
              fill="none"
              stroke={s.c}
              strokeWidth="20"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-s.start * circumference}
            />
          );
        })}
      </g>
      {slices.map((s, i) => (
        <g key={s.c} transform={`translate(262 ${168 + i * 32})`}>
          <rect width="16" height="16" rx="4" fill={s.c} />
          <rect x="26" y="4" width={[54, 40, 46][i]} height="8" rx="4" fill="#ffffff40" />
        </g>
      ))}
    </svg>
  );
}
