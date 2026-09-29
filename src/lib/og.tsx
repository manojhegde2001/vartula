import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const ogSize = { width: 1200, height: 630 };

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
          background: "linear-gradient(135deg, #0a0a0a 0%, #1e1b4b 100%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 700 }}>
          <svg width="52" height="52" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="#fafafa" strokeWidth="2" />
            <path d="M7 8l5 9 5-9" fill="none" stroke="#fafafa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {siteConfig.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
          {eyebrow && <div style={{ fontSize: 28, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: 4 }}>{eyebrow}</div>}
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 32, color: "#d4d4d8", lineHeight: 1.35 }}>{subtitle}</div>
        </div>
        <svg width="1056" height="40" viewBox="0 0 1056 40" style={{ display: "flex" }}>
          <path
            d="M0 20 C 120 -10, 240 50, 360 20 S 600 -10, 720 20 S 960 50, 1056 20"
            fill="none"
            stroke="#818cf8"
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
