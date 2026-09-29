import { evalEasing } from "../easing";
import { SVG_NS } from "../parse";
import type { AnimatorConfig, SvgModel } from "../types";
import { annotateSvg, setStyleProperty } from "./markup";
import { minifyMarkup } from "./minify";
import { buildPlan, fmt, trackStops, type Track } from "./plan";
import type { ExportOptions } from "./types";

/** Points sampled per eased interval (SMIL keySplines cannot express most curves). */
export const SMIL_SAMPLES = 24;

function keyTimesAndValues(track: Track, duration: number): { keyTimes: string; values: string } {
  const times: number[] = [];
  const values: number[] = [];
  const stops = trackStops(track, duration);
  stops.forEach((stop, i) => {
    times.push(stop.time);
    values.push(stop.value);
    const next = stops[i + 1];
    const seg = stop.segment;
    if (!seg || !next || (seg.easing === "linear" && !seg.reversed)) return;
    for (let s = 1; s < SMIL_SAMPLES; s++) {
      const p = s / SMIL_SAMPLES;
      times.push(stop.time + (next.time - stop.time) * p);
      values.push(stop.value + (next.value - stop.value) * evalEasing(seg.easing, p, seg.reversed));
    }
  });
  return {
    keyTimes: times.map((t) => fmt(duration > 0 ? t / duration : 0, 5)).join(";"),
    values: values.map((v) => fmt(v, 4)).join(";"),
  };
}

/** A standalone SVG animated with SMIL <animate> elements (no CSS or JS needed). */
export function toSmil(config: AnimatorConfig, model: SvgModel, svgMarkup: string, options: ExportOptions = {}): string {
  const plan = buildPlan(config, model);

  const markup = annotateSvg(svgMarkup, {
    root: (root) => {
      if (plan.background !== "transparent") setStyleProperty(root, "background", plan.background);
    },
    element: (el, i, doc) => {
      const dash = plan.dasharray[i];
      if (dash) el.setAttribute("stroke-dasharray", dash);
      for (const track of plan.tracks.filter((t) => t.element === i)) {
        el.setAttribute(track.property, fmt(track.initial, 4));
        const { keyTimes, values } = keyTimesAndValues(track, plan.duration);
        const anim = doc.createElementNS(SVG_NS, "animate");
        anim.setAttribute("attributeName", track.property);
        anim.setAttribute("dur", `${fmt(plan.duration, 0)}ms`);
        anim.setAttribute("repeatCount", plan.loop ? "indefinite" : "1");
        anim.setAttribute("fill", "freeze");
        anim.setAttribute("calcMode", "linear");
        anim.setAttribute("keyTimes", keyTimes);
        anim.setAttribute("values", values);
        el.appendChild(anim);
      }
    },
  });

  const header = `<!-- Vartula SVG Animator (SMIL, ${fmt(plan.duration / 1000, 2)}s${plan.loop ? " loop" : ""}) -->\n`;
  return options.minify ? minifyMarkup(markup) : header + markup + "\n";
}
