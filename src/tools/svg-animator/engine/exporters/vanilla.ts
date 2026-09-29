import type { AnimatorConfig, SvgModel } from "../types";
import { ROOT_CLASS } from "./markup";
import { minifyJs } from "./minify";
import { buildPlan, fmt } from "./plan";
import type { ExportOptions } from "./types";
import { dashLiteral, waapiTrackLines } from "./waapi";

/** Plain JavaScript using the Web Animations API (element.animate). */
export function toVanillaJs(config: AnimatorConfig, model: SvgModel, _svgMarkup: string, options: ExportOptions = {}): string {
  const plan = buildPlan(config, model);
  const background = plan.background !== "transparent" ? `  svg.style.background = ${JSON.stringify(plan.background)};\n` : "";

  const code = `// Vartula SVG Animator (vanilla JavaScript, Web Animations API)
// 1. Paste the SVG from the "SVG" tab into your page.
// 2. Run this script after it. Control playback with window.vartulaAnimation.
(function () {
  const svg = document.querySelector(".${ROOT_CLASS}");
  if (!svg) return;
  const duration = ${fmt(plan.duration, 0)};
  const loop = ${plan.loop};
  const dash = ${dashLiteral(plan)};
  // [element index, property, [[offset, value, easing], ...]]
  const tracks = [
${waapiTrackLines(plan).map((l) => `    ${l}`).join(",\n")}
  ];
${background}  dash.forEach(function (value, index) {
    if (value) svg.querySelector(".vt-" + index).style.strokeDasharray = value;
  });
  const animations = duration > 0 ? tracks.map(function (track) {
    const el = svg.querySelector(".vt-" + track[0]);
    const keyframes = track[2].map(function (stop) {
      const frame = { offset: stop[0], easing: stop[2] || "linear" };
      frame[track[1]] = String(stop[1]);
      return frame;
    });
    return el.animate(keyframes, { duration: duration, iterations: loop ? Infinity : 1, fill: "both" });
  }) : [];
  window.vartulaAnimation = {
    play: function () { animations.forEach(function (a) { a.play(); }); },
    pause: function () { animations.forEach(function (a) { a.pause(); }); },
    restart: function () { animations.forEach(function (a) { a.currentTime = 0; a.play(); }); }
  };
})();
`;
  return options.minify ? minifyJs(code) : code;
}
