import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { LogoMark } from "@/lib/logo";
import { infoPage, type InfoPath } from "@/lib/pages";
import { siteConfig } from "@/lib/site";

export const ogSize = { width: 1200, height: 630 };

/** Accent colours for the motif line under the card. */
const accents = ["#ff5d73", "#ffc145", "#2de2a6", "#7b61ff"];

/**
 * OKLCH to #rrggbb, so cards can use a category's hue (Satori does not parse oklch()).
 * Same lightness and chroma as the dark-mode `--tone` in globals.css by default.
 */
export function oklchHex(hue: number, lightness = 0.72, chroma = 0.16): string {
  const h = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(h);
  const b = chroma * Math.sin(h);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${linear
    .map((c) => {
      const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
      return Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

interface OgCard {
  title: string;
  subtitle: string;
  eyebrow?: string;
  /** Eyebrow and art panel colour; defaults to the brand yellow. */
  accent?: string;
  /** Picture shown on the right (about 420 × 420). Without it the text spans the card. */
  art?: ReactNode;
}

/** Shared Open Graph card: brand mark, title, subtitle, optional artwork and a line-drawing motif. */
export function ogImage({ title, subtitle, eyebrow, accent = "#ffc145", art }: OgCard) {
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: art ? 600 : 900 }}>
            {eyebrow && <div style={{ fontSize: 28, color: accent, textTransform: "uppercase", letterSpacing: 4 }}>{eyebrow}</div>}
            <div style={{ fontSize: art ? 72 : 76, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
            <div style={{ fontSize: 32, color: "#d4d4d8", lineHeight: 1.35 }}>{subtitle}</div>
          </div>
          {art && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 400,
                height: 340,
                flexShrink: 0,
                borderRadius: 32,
                border: `2px solid ${accent}55`,
                background: "#ffffff0d",
              }}
            >
              {art}
            </div>
          )}
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

/** Share card for an info page (About, Contact, Privacy, Terms). */
export function infoOgImage(path: InfoPath) {
  const { name, description } = infoPage(path);
  return ogImage({ eyebrow: siteConfig.name, title: name, subtitle: description });
}
