import type { AnimatorConfig, SvgModel } from "../types";
import { annotateSvg } from "./markup";
import { minifyJs, minifyMarkup } from "./minify";
import { buildPlan, fmt } from "./plan";
import type { ExportOptions } from "./types";
import { dashLiteral, waapiTrackLines } from "./waapi";

/** A self-contained React (TSX) component using the Web Animations API. */
export function toReact(config: AnimatorConfig, model: SvgModel, svgMarkup: string, options: ExportOptions = {}): string {
  const plan = buildPlan(config, model);
  const annotated = annotateSvg(svgMarkup);
  const markup = options.minify ? minifyMarkup(annotated) : annotated;
  const style = plan.background !== "transparent" ? ` style={{ background: ${JSON.stringify(plan.background)} }}` : "";

  const code = `// Vartula SVG Animator (React component, Web Animations API)
"use client";

import { useEffect, useRef } from "react";

const SVG_MARKUP = ${JSON.stringify(markup)};
const DURATION = ${fmt(plan.duration, 0)};
const LOOP = ${plan.loop};
const DASH: (string | null)[] = ${dashLiteral(plan)};
// [element index, property, [[offset, value, easing], ...]]
const TRACKS: [number, "strokeDashoffset" | "fillOpacity", [number, number, string?][]][] = [
${waapiTrackLines(plan).map((l) => `  ${l}`).join(",\n")}
];

export default function AnimatedSvg({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    DASH.forEach((value, index) => {
      const el = svg.querySelector<SVGElement>(\`.vt-\${index}\`);
      if (value && el) el.style.strokeDasharray = value;
    });
    if (DURATION <= 0) return;
    const animations = TRACKS.map(([index, property, stops]) => {
      const el = svg.querySelector<SVGElement>(\`.vt-\${index}\`)!;
      const keyframes = stops.map(([offset, value, easing]) => ({ offset, easing: easing ?? "linear", [property]: String(value) }));
      return el.animate(keyframes, { duration: DURATION, iterations: LOOP ? Infinity : 1, fill: "both" });
    });
    return () => animations.forEach((a) => a.cancel());
  }, []);

  return <div ref={ref} className={className}${style} dangerouslySetInnerHTML={{ __html: SVG_MARKUP }} />;
}
`;
  return options.minify ? minifyJs(code) : code;
}
