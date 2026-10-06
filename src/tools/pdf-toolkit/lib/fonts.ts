import { Caveat, Dancing_Script, Great_Vibes } from "next/font/google";

// Handwriting fonts for typed signatures. next/font self-hosts them, so no request goes to Google,
// and preload is off so they download only when the signature dialog shows them.
const dancing = Dancing_Script({ subsets: ["latin"], weight: "600", preload: false });
const vibes = Great_Vibes({ subsets: ["latin"], weight: "400", preload: false });
const caveat = Caveat({ subsets: ["latin"], weight: "500", preload: false });

export const signatureFonts = [
  { id: "dancing", label: "Script", className: dancing.className, family: dancing.style.fontFamily, weight: 600 },
  { id: "vibes", label: "Elegant", className: vibes.className, family: vibes.style.fontFamily, weight: 400 },
  { id: "caveat", label: "Handwritten", className: caveat.className, family: caveat.style.fontFamily, weight: 500 },
  { id: "plain", label: "Plain", className: "font-sans", family: "ui-sans-serif, system-ui, sans-serif", weight: 400 },
] as const;

export type SignatureFontId = (typeof signatureFonts)[number]["id"];
