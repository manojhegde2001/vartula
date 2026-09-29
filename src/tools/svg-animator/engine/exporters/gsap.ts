import { gsapEase, reversedEasingName, type EasingName } from "../easing";
import type { AnimatorConfig, SvgModel } from "../types";
import { ROOT_CLASS } from "./markup";
import { minifyJs } from "./minify";
import { buildPlan, fmt, type Segment } from "./plan";
import type { ExportOptions } from "./types";
import { camelProperty } from "./waapi";

const s = (ms: number) => fmt(ms / 1000, 4);

/** GSAP 3 timeline code equivalent to the engine's animation. */
export function toGsap(config: AnimatorConfig, model: SvgModel, _svgMarkup: string, options: ExportOptions = {}): string {
  const plan = buildPlan(config, model);
  let needsClamp = false;
  const bezierEases = new Set<"cssEase" | "cssEaseReversed">();

  /** GSAP ease expression for a segment; Back overshoot is clamped like the engine. */
  const easeFor = (seg: Segment): string => {
    const name: EasingName | null = seg.reversed ? reversedEasingName(seg.easing) : seg.easing;
    if (name === null || name === "ease") {
      const fn = name === null ? "cssEaseReversed" : "cssEase";
      bezierEases.add(fn);
      return fn;
    }
    const ease = JSON.stringify(gsapEase(name));
    if (name.includes("Back")) {
      needsClamp = true;
      return `clamp(gsap.parseEase(${ease}))`;
    }
    return ease;
  };

  const lines: string[] = [];
  model.elements.forEach((_, i) => {
    const tracks = plan.tracks.filter((t) => t.element === i);
    const initial: string[] = [];
    if (plan.dasharray[i]) initial.push(`strokeDasharray: ${JSON.stringify(plan.dasharray[i])}`);
    for (const t of tracks) initial.push(`${camelProperty[t.property]}: ${fmt(t.initial, 4)}`);
    if (initial.length) lines.push(`tl.set(el(${i}), { ${initial.join(", ")} }, 0);`);

    for (const track of tracks) {
      const prop = camelProperty[track.property];
      track.segments.forEach((seg, k) => {
        const prev = track.segments[k - 1];
        if (prev && prev.to !== seg.from) {
          lines.push(`tl.set(el(${i}), { ${prop}: ${fmt(seg.from, 4)} }, ${s(seg.iterationStart)});`);
        }
        lines.push(
          `tl.fromTo(el(${i}), { ${prop}: ${fmt(seg.from, 4)} }, { ${prop}: ${fmt(seg.to, 4)}, duration: ${s(seg.end - seg.start)}, ease: ${easeFor(seg)}, immediateRender: false }, ${s(seg.start)});`,
        );
      });
    }
  });

  const helpers: string[] = [];
  if (needsClamp) {
    helpers.push(`  const clamp = function (ease) { return function (p) { return Math.min(1, Math.max(0, ease(p))); }; };`);
  }
  if (bezierEases.size) {
    helpers.push(
      `  // CSS cubic-bezier timing function`,
      `  const bezier = function (x1, y1, x2, y2) {`,
      `    const f = function (t, a, b) { return 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t; };`,
      `    return function (x) {`,
      `      let lo = 0, hi = 1, t = x;`,
      `      for (let i = 0; i < 30; i++) { if (f(t, x1, x2) < x) lo = t; else hi = t; t = (lo + hi) / 2; }`,
      `      return f(t, y1, y2);`,
      `    };`,
      `  };`,
    );
    if (bezierEases.has("cssEase")) helpers.push(`  const cssEase = bezier(0.25, 0.1, 0.25, 1);`);
    if (bezierEases.has("cssEaseReversed")) helpers.push(`  const cssEaseReversed = bezier(0.75, 0, 0.75, 0.9);`);
  }

  const background = plan.background !== "transparent" ? `  gsap.set(svg, { background: ${JSON.stringify(plan.background)} });\n` : "";
  const code = `// Vartula SVG Animator (GSAP 3)
// Load GSAP first: <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
// Paste the SVG from the "SVG" tab into your page, then run this script.
(function () {
  const svg = document.querySelector(".${ROOT_CLASS}");
  if (!svg) return;
  const el = function (i) { return svg.querySelector(".vt-" + i); };
${helpers.length ? helpers.join("\n") + "\n" : ""}${background}  const tl = gsap.timeline(${plan.loop ? "{ repeat: -1 }" : ""});
${lines.map((l) => `  ${l}`).join("\n")}
  // Pad the timeline to the full loop length.
  tl.set({}, {}, ${s(plan.duration)});
  window.vartulaTimeline = tl;
})();
`;
  return options.minify ? minifyJs(code) : code;
}
