import { Caveat, Dancing_Script, Great_Vibes } from "next/font/google";

// Handwriting fonts for typed signatures. next/font self-hosts them, so no request goes to Google,
// and preload is off so they download only when the signature dialog shows them.
const dancing = Dancing_Script({ subsets: ["latin"], weight: "600", preload: false });
const vibes = Great_Vibes({ subsets: ["latin"], weight: "400", preload: false });
const caveat = Caveat({ subsets: ["latin"], weight: "500", preload: false });

/**
 * next/font's family list also names a metric-matched fallback face whose source is `local("Arial")`.
 * `document.fonts.load()` rejects when any matching face fails, and Linux has no Arial, so load only the
 * web font itself (`primary`) and draw with the full list plus a generic family.
 */
const font = (f: { style: { fontFamily: string } }, generic: string) => ({
  family: `${f.style.fontFamily}, ${generic}`,
  primary: f.style.fontFamily.split(",")[0].trim(),
});

export const signatureFonts = [
  { id: "dancing", label: "Script", className: dancing.className, weight: 600, ...font(dancing, "cursive") },
  { id: "vibes", label: "Elegant", className: vibes.className, weight: 400, ...font(vibes, "cursive") },
  { id: "caveat", label: "Handwritten", className: caveat.className, weight: 500, ...font(caveat, "cursive") },
  { id: "plain", label: "Plain", className: "font-sans", weight: 400, family: "ui-sans-serif, system-ui, sans-serif", primary: null },
] as const;

export type SignatureFontId = (typeof signatureFonts)[number]["id"];
