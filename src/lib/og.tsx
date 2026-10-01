import { ImageResponse } from "next/og";
import { LogoMark } from "@/lib/logo";
import { siteConfig } from "@/lib/site";

export const ogSize = { width: 1200, height: 630 };

/** Accent colours for the motif line under the card. */
const accents = ["#ff5d73", "#ffc145", "#2de2a6", "#7b61ff"];

/** Shared Open Graph card: brand mark, title, subtitle and a line-drawing motif. */
export function ogImage({ title, subtitle, eyebrow }: { title: string; subtitle: string; eyebrow?: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(circle at 30% 20%, #1a1b2b 0%, #0c0d12 70%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 700 }}>
          <LogoMark size={64} color="#fafafa" />
          {siteConfig.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
          {eyebrow && <div style={{ fontSize: 28, color: "#ffc145", textTransform: "uppercase", letterSpacing: 4 }}>{eyebrow}</div>}
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 32, color: "#d4d4d8", lineHeight: 1.35 }}>{subtitle}</div>
        </div>
        <svg width="1056" height="40" viewBox="0 0 1056 40" style={{ display: "flex" }}>
          <defs>
            <linearGradient id="og-line" x1="0" y1="0" x2="1" y2="0">
              {accents.map((color, i) => (
                <stop key={color} offset={i / (accents.length - 1)} stopColor={color} />
              ))}
            </linearGradient>
          </defs>
          <path
            d="M0 20 C 120 -10, 240 50, 360 20 S 600 -10, 720 20 S 960 50, 1056 20"
            fill="none"
            stroke="url(#og-line)"
            strokeWidth="4"
            strokeDasharray="700 1200"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    ogSize,
  );
}
