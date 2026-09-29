import ts from "typescript";
import { describe, expect, it } from "vitest";
import { cssEasing, evalEasing, gsapEase, reversedEasingName } from "../easing";
import { collectDrawables, parseSvg, parseSvgDocument } from "../parse";
import { getFrameState } from "../timeline";
import type { AnimatorConfig } from "../types";
import { buildPlan, codeFormats, toAnnotatedSvg, toCss, toGsap, toReact, toSmil, toVanillaJs, trackStops } from "./index";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" fill="none" stroke="#333">
  <path d="M10 10 H90" style="fill-opacity: 0.5; stroke-width: 2"/>
  <g fill-opacity="0.6"><circle cx="30" cy="35" r="15" fill="#fc0"/></g>
  <path d="M50 50"/>
  <line x1="60" y1="20" x2="90" y2="50"/>
</svg>`;
const model = parseSvg(SVG);

const transition: AnimatorConfig = {
  type: "transition",
  stroke: { enabled: true, duration: 1200, delay: 100, stagger: 150, easing: "easeInOutCubic", direction: "normal" },
  fill: { enabled: true, duration: 500, delay: 900, stagger: 100, easing: "ease", direction: "reverse" },
  background: "#ffffff",
};
const looping: AnimatorConfig = {
  type: "animation",
  stroke: { enabled: true, duration: 800, delay: 0, stagger: 200, easing: "easeOutBack", direction: "alternate" },
  fill: { enabled: true, duration: 400, delay: 600, stagger: 0, easing: "linear", direction: "normal" },
  background: "transparent",
};
const configs = { transition, looping };

function syntaxErrors(code: string, fileName: string): string[] {
  const out = ts.transpileModule(code, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return (out.diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
}

describe.each(Object.entries(configs))("exporters (%s)", (name, config) => {
  for (const minify of [false, true]) {
    const label = minify ? "minified" : "pretty";
    it(`toCss ${label}`, () => expect(toCss(config, model, SVG, { minify })).toMatchSnapshot());
    it(`toSmil ${label}`, () => expect(toSmil(config, model, SVG, { minify })).toMatchSnapshot());
    it(`toReact ${label}`, () => expect(toReact(config, model, SVG, { minify })).toMatchSnapshot());
    it(`toVanillaJs ${label}`, () => expect(toVanillaJs(config, model, SVG, { minify })).toMatchSnapshot());
    it(`toGsap ${label}`, () => expect(toGsap(config, model, SVG, { minify })).toMatchSnapshot());
  }

  it("emits syntactically valid JavaScript and TSX", () => {
    for (const minify of [false, true]) {
      expect(syntaxErrors(toReact(config, model, SVG, { minify }), "AnimatedSvg.tsx")).toEqual([]);
      for (const code of [toVanillaJs(config, model, SVG, { minify }), toGsap(config, model, SVG, { minify })]) {
        expect(syntaxErrors(code, "animation.js")).toEqual([]);
        expect(() => new Function(code)).not.toThrow();
      }
    }
  });

  it("emits well-formed SVG with matching keyTimes/values", () => {
    for (const minify of [false, true]) {
      const { root } = parseSvgDocument(toSmil(config, model, SVG, { minify }));
      const animates = Array.from(root.getElementsByTagName("animate"));
      expect(animates.length).toBe(buildPlan(config, model).tracks.length);
      for (const a of animates) {
        const times = a.getAttribute("keyTimes")!.split(";").map(Number);
        const values = a.getAttribute("values")!.split(";").map(Number);
        expect(times.length).toBe(values.length);
        expect(times[0]).toBe(0);
        expect(times[times.length - 1]).toBe(1);
        for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
      }
    }
  });

  it("SMIL key values equal the engine at their key times", () => {
    const { root } = parseSvgDocument(toSmil(config, model, SVG));
    const plan = buildPlan(config, model);
    collectDrawables(root).forEach((el, i) => {
      for (const a of Array.from(el.getElementsByTagName("animate"))) {
        const prop = a.getAttribute("attributeName");
        const times = a.getAttribute("keyTimes")!.split(";").map(Number);
        const values = a.getAttribute("values")!.split(";").map(Number);
        times.forEach((kt, k) => {
          // Skip the instant of a jump (two values at one key time).
          if (times[k - 1] === kt || times[k + 1] === kt) return;
          const t = kt * plan.duration;
          if (t >= plan.duration) return;
          const f = getFrameState(config, model, t)[i];
          const expected = prop === "stroke-dashoffset" ? f.strokeDashoffset : f.fillOpacity;
          expect(values[k]).toBeCloseTo(expected, 1);
        });
      }
    });
  });

  it("vanilla JS passes the plan's keyframes to element.animate", () => {
    const plan = buildPlan(config, model);
    document.body.innerHTML = toAnnotatedSvg(config, model, SVG);
    const calls: { el: Element; keyframes: Record<string, unknown>[]; opts: KeyframeAnimationOptions }[] = [];
    const proto = Element.prototype as unknown as { animate?: unknown };
    const original = proto.animate;
    proto.animate = function (this: Element, keyframes: Record<string, unknown>[], opts: KeyframeAnimationOptions) {
      calls.push({ el: this, keyframes, opts });
      return { play() {}, pause() {}, cancel() {} };
    };
    try {
      new Function(toVanillaJs(config, model, SVG, { minify: true }))();
    } finally {
      proto.animate = original;
    }

    expect(calls).toHaveLength(plan.tracks.length);
    calls.forEach((call, k) => {
      const track = plan.tracks[k];
      expect(call.el.getAttribute("class")).toContain(`vt-${track.element}`);
      expect(call.opts).toMatchObject({ duration: plan.duration, iterations: plan.loop ? Infinity : 1, fill: "both" });
      const stops = trackStops(track, plan.duration);
      expect(call.keyframes).toHaveLength(stops.length);
      call.keyframes.forEach((kf, j) => {
        expect(kf.offset as number).toBeCloseTo(stops[j].time / plan.duration, 5);
        const prop = track.property === "stroke-dashoffset" ? "strokeDashoffset" : "fillOpacity";
        expect(Number(kf[prop])).toBeCloseTo(stops[j].value, 3);
        const seg = stops[j].segment;
        expect(kf.easing).toBe(seg ? cssEasing(seg.easing, seg.reversed) : "linear");
      });
    });
    plan.dasharray.forEach((dash, i) => {
      const el = document.querySelector(`.vt-${i}`) as SVGElement;
      expect(el.style.strokeDasharray.replace(/px/g, "") || null).toBe(dash);
    });
  });

  it("GSAP timeline tweens reproduce the engine", () => {
    const plan = buildPlan(config, model);
    document.body.innerHTML = toAnnotatedSvg(config, model, SVG);
    type Call = { kind: "set" | "fromTo"; el: Element; from?: Record<string, number>; vars: Record<string, unknown>; at: number };
    const calls: Call[] = [];
    let timelineVars: unknown;
    const gsap = {
      parseEase: (name: string) => (p: number) => {
        const m = /^back\.(in|out|inOut)/.exec(name);
        const easing = m ? (({ in: "easeInBack", out: "easeOutBack", inOut: "easeInOutBack" }) as const)[m[1] as "in"] : null;
        return easing ? evalEasing(easing, p) : p;
      },
      set: () => {},
      timeline: (vars: unknown) => {
        timelineVars = vars;
        return {
          set: (el: Element, vars: Record<string, unknown>, at: number) => calls.push({ kind: "set", el, vars, at }),
          fromTo: (el: Element, from: Record<string, number>, vars: Record<string, unknown>, at: number) =>
            calls.push({ kind: "fromTo", el, from, vars, at }),
        };
      },
    };
    new Function("gsap", toGsap(config, model, SVG, { minify: true }))(gsap);
    expect(timelineVars).toEqual(plan.loop ? { repeat: -1 } : undefined);

    // Replay the recorded tweens and compare against the engine.
    const valueAt = (i: number, prop: "strokeDashoffset" | "fillOpacity", t: number) => {
      let value: number | undefined;
      for (const c of calls) {
        if (!c.el?.getAttribute?.("class")?.split(" ").includes(`vt-${i}`) || !(prop in c.vars)) continue;
        const at = c.at * 1000;
        if (c.kind === "set") {
          if (t >= at) value = c.vars[prop] as number;
          continue;
        }
        const dur = (c.vars.duration as number) * 1000;
        if (t < at) continue;
        const to = c.vars[prop] as number;
        const from = c.from![prop];
        if (t >= at + dur) value = to;
        else {
          const ease = c.vars.ease;
          const p = (t - at) / dur;
          const eased = typeof ease === "function" ? ease(p) : gsapEaseEval(ease as string, p);
          value = from + (to - from) * eased;
        }
      }
      return value;
    };
    const gsapEaseEval = (name: string, p: number) => {
      const match = [...Object.keys(easingByGsap)].find((k) => k === name);
      if (!match) throw new Error(`unknown ease ${name}`);
      return evalEasing(easingByGsap[match], p);
    };

    for (let s = 0; s < 60; s++) {
      const t = (s / 60) * plan.duration + 0.5;
      const frames = getFrameState(config, model, t);
      for (const track of plan.tracks) {
        const prop = track.property === "stroke-dashoffset" ? "strokeDashoffset" : "fillOpacity";
        const expected = prop === "strokeDashoffset" ? frames[track.element].strokeDashoffset : frames[track.element].fillOpacity;
        expect(valueAt(track.element, prop, t), `${name} t=${t} ${prop}#${track.element}`).toBeCloseTo(expected, 2);
      }
    }
  });
});

// Map GSAP ease strings back to engine easings (for replaying tweens).
const easingByGsap = Object.fromEntries(
  (["linear", ...["Quad", "Cubic", "Quart", "Quint", "Sine", "Expo", "Circ"].flatMap((f) => [`easeIn${f}`, `easeOut${f}`, `easeInOut${f}`])] as const).map(
    (n) => [gsapEase(n as never)!, n],
  ),
) as Record<string, Parameters<typeof evalEasing>[0]>;

describe("exporter details", () => {
  it("strips inline animated properties and adds classes", () => {
    const svg = toAnnotatedSvg(transition, model, SVG);
    expect(svg).toContain('class="vartula-svg"');
    expect(svg).toContain('style="stroke-width: 2"');
    expect(svg).not.toContain("fill-opacity: 0.5");
    for (let i = 0; i < model.elements.length; i++) expect(svg).toContain(`vt-${i}`);
  });

  it("keeps the model's effective fill-opacity as the end value", () => {
    const plan = buildPlan(transition, model);
    const fills = plan.tracks.filter((t) => t.property === "fill-opacity");
    // reverse direction: fills start visible at their own opacity and fade out
    expect(fills.map((t) => t.initial)).toEqual([0.5, 0.6, 1, 1]);
  });

  it("uses CSS transitions with an active class for transition type", () => {
    const css = toCss(transition, model, SVG);
    expect(css).toContain(".vartula-svg.active .vt-0");
    expect(css).toContain("transition: stroke-dashoffset 1200ms");
    expect(css).not.toContain("@keyframes");
    // reverse fill: mirrored delay (total - end) and reversed ease
    expect(css).toContain(reversedEasingName("ease") ?? "cubic-bezier(0.75, 0, 0.75, 0.9)");
  });

  it("uses looping keyframes for animation type", () => {
    const css = toCss(looping, model, SVG);
    expect(css).toMatch(/@keyframes vt-0-stroke/);
    expect(css).toContain("linear infinite both");
    expect(css).not.toContain("background");
  });

  it("skips zero-length elements for stroke animation", () => {
    const plan = buildPlan(transition, model);
    expect(plan.dasharray[2]).toBeNull();
    expect(plan.tracks.some((t) => t.element === 2 && t.property === "stroke-dashoffset")).toBe(false);
  });

  it("lists every format with a runner", () => {
    expect(codeFormats.map((f) => f.id)).toEqual(["css", "svg", "smil", "react", "js", "gsap"]);
    for (const f of codeFormats) expect(f.run(transition, model, SVG).length).toBeGreaterThan(50);
  });
});
