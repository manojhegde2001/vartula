import { cssEasing } from "../easing";
import type { AnimatorConfig, SvgModel } from "../types";
import { elementClass, ROOT_CLASS } from "./markup";
import { minifyCss } from "./minify";
import { buildPlan, fmt, pct, trackStops, type Stop, type Track } from "./plan";
import type { ExportOptions } from "./types";

const sel = (i: number) => `.${ROOT_CLASS} .${elementClass(i)}`;

/** @keyframes cannot hold two values at one offset, so separate jumps by a hair. */
function separateJumps(stops: Stop[], duration: number): Stop[] {
  const gap = duration * 1e-5; // 0.001% of the loop
  const out = stops.map((s) => ({ ...s }));
  for (let i = 1; i < out.length; i++) {
    if (out[i].time <= out[i - 1].time) out[i].time = out[i - 1].time + gap;
  }
  return out;
}

function keyframes(name: string, track: Track, duration: number): string {
  const lines = separateJumps(trackStops(track, duration), duration).map((stop) => {
    const easing = stop.segment ? ` animation-timing-function: ${cssEasing(stop.segment.easing, stop.segment.reversed)};` : "";
    return `  ${pct(Math.min(stop.time, duration), duration)} { ${track.property}: ${fmt(stop.value, 4)};${easing} }`;
  });
  return `@keyframes ${name} {\n${lines.join("\n")}\n}`;
}

/**
 * CSS for the annotated SVG (see the SVG tab / annotateSvg).
 * "animation" → @keyframes that loop; "transition" → CSS transitions that play
 * when the `active` class is added to the <svg>.
 */
export function toCss(config: AnimatorConfig, model: SvgModel, _svgMarkup: string, options: ExportOptions = {}): string {
  const plan = buildPlan(config, model);
  const out: string[] = [];
  const transition = plan.type === "transition";

  out.push(
    transition
      ? `/* Vartula SVG Animator (CSS transition, ${fmt(plan.duration / 1000, 2)}s)\n   Use with the SVG from the "SVG" tab, then add the "active" class to play:\n   document.querySelector(".${ROOT_CLASS}").classList.add("active"); */`
      : `/* Vartula SVG Animator (CSS animation, ${fmt(plan.duration / 1000, 2)}s loop)\n   Use with the SVG from the "SVG" tab. */`,
  );

  if (plan.background !== "transparent") out.push(`.${ROOT_CLASS} {\n  background: ${plan.background};\n}`);

  model.elements.forEach((_, i) => {
    const tracks = plan.tracks.filter((t) => t.element === i);
    const dash = plan.dasharray[i];
    if (!tracks.length && !dash) return;

    const decls: string[] = [];
    if (dash) decls.push(`stroke-dasharray: ${dash};`);
    for (const t of tracks) decls.push(`${t.property}: ${fmt(t.initial, 4)};`);

    if (transition) {
      const parts = tracks.map((t) => {
        const seg = t.segments[0];
        return `${t.property} ${fmt(seg.end - seg.start, 0)}ms ${cssEasing(seg.easing, seg.reversed)} ${fmt(seg.start, 0)}ms`;
      });
      if (parts.length) decls.push(`transition: ${parts.join(",\n    ")};`);
      out.push(`${sel(i)} {\n  ${decls.join("\n  ")}\n}`);
      if (tracks.length) {
        const active = tracks.map((t) => `${t.property}: ${fmt(t.segments[0].to, 4)};`);
        out.push(`.${ROOT_CLASS}.active .${elementClass(i)} {\n  ${active.join("\n  ")}\n}`);
      }
    } else {
      const names = tracks.map((t) => `${elementClass(i)}-${t.property === "stroke-dashoffset" ? "stroke" : "fill"}`);
      if (names.length) {
        decls.push(`animation: ${names.map((n) => `${n} ${fmt(plan.duration, 0)}ms linear infinite both`).join(",\n    ")};`);
      }
      out.push(`${sel(i)} {\n  ${decls.join("\n  ")}\n}`);
      tracks.forEach((t, k) => out.push(keyframes(names[k], t, plan.duration)));
    }
  });

  const css = out.join("\n\n") + "\n";
  return options.minify ? minifyCss(css) : css;
}
