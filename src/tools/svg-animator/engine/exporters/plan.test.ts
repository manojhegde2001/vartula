import { describe, expect, it } from "vitest";
import { DIRECTIONS } from "../config";
import { easingNames } from "../easing";
import { getFrameState, loopDuration } from "../timeline";
import type { AnimatorConfig, ChannelConfig, SvgModel } from "../types";
import { buildPlan, evaluateStops, evaluateTrack, trackStops } from "./plan";

/** Small deterministic PRNG (mulberry32) so failures are reproducible. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomChannel(r: () => number): ChannelConfig {
  return {
    enabled: r() > 0.15,
    duration: Math.round(r() * 2000) + 1,
    delay: Math.round(r() * 1000),
    stagger: Math.round(r() * 400),
    easing: easingNames[Math.floor(r() * easingNames.length)],
    direction: DIRECTIONS[Math.floor(r() * DIRECTIONS.length)],
  };
}

function randomModel(r: () => number): SvgModel {
  const n = 1 + Math.floor(r() * 5);
  return {
    viewBox: { x: 0, y: 0, width: 100, height: 100 },
    width: 100,
    height: 100,
    elements: Array.from({ length: n }, (_, index) => ({
      index,
      tag: "path" as const,
      length: r() < 0.15 ? 0 : Math.round(r() * 5000) / 10,
      fillOpacity: r() < 0.3 ? Math.round(r() * 100) / 100 : 1,
      id: null,
    })),
  };
}

describe("buildPlan", () => {
  it("matches getFrameState for randomized configs", () => {
    const r = rng(20260929);
    let checked = 0;
    for (let run = 0; run < 300; run++) {
      const config: AnimatorConfig = {
        type: r() < 0.5 ? "transition" : "animation",
        stroke: randomChannel(r),
        fill: randomChannel(r),
        background: "#fff",
      };
      const model = randomModel(r);
      const plan = buildPlan(config, model);
      const duration = loopDuration(config, model);
      expect(plan.duration).toBe(duration);

      for (let s = 0; s < 40; s++) {
        // Fractional times avoid ambiguous exact segment boundaries.
        const t = (s / 40) * duration + 0.37;
        if (t >= duration) continue;
        const frames = getFrameState(config, model, t);
        for (const track of plan.tracks) {
          const expected =
            track.property === "stroke-dashoffset"
              ? frames[track.element].strokeDashoffset
              : frames[track.element].fillOpacity;
          const actual = evaluateTrack(track, t);
          const fromStops = evaluateStops(trackStops(track, duration), t);
          const scale = Math.max(1, Math.abs(expected));
          expect(Math.abs(actual - expected) / scale, `run ${run} t=${t} ${track.property}#${track.element}`).toBeLessThan(1e-4);
          expect(Math.abs(fromStops - expected) / scale, `stops: run ${run} t=${t}`).toBeLessThan(1e-4);
          checked++;
        }
        // Untracked properties must be static in the engine too.
        frames.forEach((f, i) => {
          if (!plan.tracks.some((tr) => tr.element === i && tr.property === "fill-opacity")) {
            expect(f.fillOpacity).toBe(model.elements[i].fillOpacity);
          }
          if (!plan.tracks.some((tr) => tr.element === i && tr.property === "stroke-dashoffset")) {
            expect(f.strokeDasharray).toBe("none");
          }
        });
      }
    }
    expect(checked).toBeGreaterThan(10_000);
  });

  it("uses mirrored segments for reverse and alternate", () => {
    const channel = { enabled: true, duration: 1000, delay: 0, stagger: 0, easing: "easeInQuad" as const };
    const model: SvgModel = {
      viewBox: { x: 0, y: 0, width: 1, height: 1 },
      width: 1,
      height: 1,
      elements: [{ index: 0, tag: "path", length: 100, fillOpacity: 1, id: null }],
    };
    const plan = buildPlan(
      {
        type: "animation",
        stroke: { ...channel, direction: "alternate" },
        fill: { ...channel, enabled: false, direction: "normal" },
        background: "#fff",
      },
      model,
    );
    expect(plan.duration).toBe(2000);
    expect(plan.dasharray).toEqual(["101 101"]);
    expect(plan.tracks).toEqual([
      {
        element: 0,
        property: "stroke-dashoffset",
        initial: 101.505,
        segments: [
          { iterationStart: 0, iterationEnd: 1000, start: 0, end: 1000, from: 101.505, to: 0, easing: "easeInQuad", reversed: false },
          { iterationStart: 1000, iterationEnd: 2000, start: 1000, end: 2000, from: 0, to: 101.505, easing: "easeInQuad", reversed: true },
        ],
      },
    ]);
  });
});
