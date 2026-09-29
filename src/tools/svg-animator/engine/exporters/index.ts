import type { AnimatorConfig, SvgModel } from "../types";
import { toCss } from "./css";
import { toGsap } from "./gsap";
import { annotateSvg } from "./markup";
import { minifyMarkup } from "./minify";
import { toReact } from "./react";
import { toSmil } from "./smil";
import type { Exporter, ExportOptions } from "./types";
import { toVanillaJs } from "./vanilla";

export { toCss, toSmil, toReact, toVanillaJs, toGsap, annotateSvg };
export { buildPlan, evaluateTrack, trackStops, evaluateStops } from "./plan";
export type { ExportPlan, Track, Segment, Stop } from "./plan";
export type { Exporter, ExportOptions };

/** The SVG with vt-* classes, needed by the CSS, JavaScript and GSAP exports. */
export function toAnnotatedSvg(_config: AnimatorConfig, _model: SvgModel, svgMarkup: string, options: ExportOptions = {}) {
  const markup = annotateSvg(svgMarkup);
  return options.minify ? minifyMarkup(markup) : markup + "\n";
}

export interface CodeFormat {
  id: "svg" | "css" | "smil" | "react" | "js" | "gsap";
  label: string;
  /** Shiki language id. */
  lang: "xml" | "css" | "tsx" | "javascript";
  filename: string;
  mime: string;
  description: string;
  run: Exporter;
}

export const codeFormats: CodeFormat[] = [
  {
    id: "css",
    label: "CSS",
    lang: "css",
    filename: "animation.css",
    mime: "text/css",
    description: "Pure CSS. Pair it with the SVG tab's markup, which adds the vt-* classes it targets.",
    run: toCss,
  },
  {
    id: "svg",
    label: "SVG",
    lang: "xml",
    filename: "animated.svg",
    mime: "image/svg+xml",
    description: "Your SVG with the classes used by the CSS, JavaScript and GSAP exports.",
    run: toAnnotatedSvg,
  },
  {
    id: "smil",
    label: "SMIL",
    lang: "xml",
    filename: "animated-smil.svg",
    mime: "image/svg+xml",
    description: "A single self-contained SVG file that animates anywhere SVG is shown, even in <img>.",
    run: toSmil,
  },
  {
    id: "react",
    label: "React",
    lang: "tsx",
    filename: "AnimatedSvg.tsx",
    mime: "text/plain",
    description: "A drop-in React component (TypeScript) with the SVG inlined.",
    run: toReact,
  },
  {
    id: "js",
    label: "JavaScript",
    lang: "javascript",
    filename: "animation.js",
    mime: "text/javascript",
    description: "Vanilla JavaScript using the Web Animations API. Pair it with the SVG tab's markup.",
    run: toVanillaJs,
  },
  {
    id: "gsap",
    label: "GSAP",
    lang: "javascript",
    filename: "animation.gsap.js",
    mime: "text/javascript",
    description: "A GSAP 3 timeline. Pair it with the SVG tab's markup.",
    run: toGsap,
  },
];
