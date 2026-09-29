import { describe, expect, it } from "vitest";
import { defaultConfig, normalizeConfig } from "./config";
import { parseSvg } from "./parse";
import { dashLength, getFrameState, totalDuration } from "./timeline";
import type { AnimatorConfig, ChannelConfig, SvgModel } from "./types";

const channel = (over: Partial<ChannelConfig> = {}): ChannelConfig => ({
  enabled: true,
  duration: 1000,
  delay: 0,
  stagger: 0,
  easing: "linear",
  direction: "normal",
  ...over,
});

const config = (over: Partial<AnimatorConfig> = {}): AnimatorConfig => ({
  type: "transition",
  stroke: channel(),
  fill: channel({ enabled: false }),
  background: "#fff",
  ...over,
});

const model = (lengths: number[]): SvgModel => ({
  viewBox: { x: 0, y: 0, width: 100, height: 100 },
  width: 100,
  height: 100,
  elements: lengths.map((length, index) => ({ index, tag: "path", length, fillOpacity: 1, id: null })),
});

/** Fraction of each element's stroke that is drawn. */
const drawn = (cfg: AnimatorConfig, m: SvgModel, t: number) =>
  getFrameState(cfg, m, t).map((f, i) => {
    const dash = dashLength(m.elements[i].length);
    return f.strokeDasharray === "none" ? 1 : Number((1 - f.strokeDashoffset / dash).toFixed(3));
  });

describe("totalDuration", () => {
  it("is delay + (n - 1) * stagger + duration of the longest channel", () => {
    const cfg = config({
      stroke: channel({ duration: 1000, delay: 200, stagger: 100 }),
      fill: channel({ duration: 500, delay: 1500, stagger: 50 }),
    });
    // stroke: 200 + 2*100 + 1000 = 1400; fill: 1500 + 2*50 + 500 = 2100
    expect(totalDuration(cfg, model([10, 10, 10]))).toBe(2100);
  });

  it("ignores disabled channels and is 0 for empty models", () => {
    const cfg = config({ fill: channel({ enabled: false, duration: 99999 }) });
    expect(totalDuration(cfg, model([10]))).toBe(1000);
    expect(totalDuration(cfg, model([]))).toBe(0);
    expect(getFrameState(cfg, model([]), 500)).toEqual([]);
  });
});

describe("getFrameState", () => {
  it("draws the stroke with a padded dash pattern", () => {
    const m = model([100]);
    const [start] = getFrameState(config(), m, 0);
    const dash = dashLength(100);
    expect(dash).toBe(101);
    expect(start).toEqual({ strokeDasharray: "101 101", strokeDashoffset: 101, fillOpacity: 1 });
    expect(getFrameState(config(), m, 500)[0].strokeDashoffset).toBe(50.5);
    expect(getFrameState(config(), m, 1000)[0].strokeDashoffset).toBe(0);
  });

  it("applies easing", () => {
    const cfg = config({ stroke: channel({ easing: "easeInQuad" }) });
    expect(drawn(cfg, model([100]), 500)).toEqual([0.25]);
  });

  it("leaves zero-length elements un-dashed and never produces NaN", () => {
    const m = model([0, 50, 0]);
    for (const t of [0, 250, 1000, 5000]) {
      const frames = getFrameState(config({ fill: channel() }), m, t);
      for (const f of frames) {
        expect(Number.isFinite(f.strokeDashoffset)).toBe(true);
        expect(Number.isFinite(f.fillOpacity)).toBe(true);
        expect(f.strokeDasharray).not.toMatch(/NaN|Infinity/);
      }
      expect(frames[0]).toMatchObject({ strokeDasharray: "none", strokeDashoffset: 0 });
      expect(frames[2]).toMatchObject({ strokeDasharray: "none", strokeDashoffset: 0 });
    }
  });

  it("handles zero-length paths parsed from real markup", () => {
    const m = parseSvg('<svg viewBox="0 0 10 10"><path d="M5 5"/><path d="M0 0H10"/></svg>');
    const frames = getFrameState(defaultConfig, m, 300);
    expect(frames[0].strokeDasharray).toBe("none");
    expect(frames[1].strokeDasharray).toBe("10.1 10.1");
  });

  it("staggers elements by index", () => {
    const cfg = config({ stroke: channel({ duration: 1000, stagger: 250 }) });
    const m = model([100, 100, 100]);
    expect(totalDuration(cfg, m)).toBe(1500);
    expect(drawn(cfg, m, 0)).toEqual([0, 0, 0]);
    expect(drawn(cfg, m, 250)).toEqual([0.25, 0, 0]);
    expect(drawn(cfg, m, 500)).toEqual([0.5, 0.25, 0]);
    expect(drawn(cfg, m, 1250)).toEqual([1, 1, 0.75]);
    expect(drawn(cfg, m, 1500)).toEqual([1, 1, 1]);
  });

  it("respects the initial delay", () => {
    const cfg = config({ stroke: channel({ delay: 400, stagger: 100 }) });
    const m = model([10, 10]);
    expect(drawn(cfg, m, 400)).toEqual([0, 0]);
    expect(drawn(cfg, m, 900)).toEqual([0.5, 0.4]);
  });

  it("plays the whole sequence backwards when reversed", () => {
    const m = model([100, 100, 100]);
    const forward = config({ stroke: channel({ stagger: 250 }) });
    const reverse = config({ stroke: channel({ stagger: 250, direction: "reverse" }) });
    const total = totalDuration(reverse, m);
    expect(drawn(reverse, m, 0)).toEqual([1, 1, 1]);
    expect(drawn(reverse, m, total)).toEqual([0, 0, 0]);
    // The last element un-draws first.
    expect(drawn(reverse, m, 250)).toEqual([1, 1, 0.75]);
    for (const t of [0, 100, 333, 700, 1234, 1500]) {
      expect(drawn(reverse, m, t)).toEqual(drawn(forward, m, total - t));
    }
  });

  it("reverses easing along with time", () => {
    const m = model([100]);
    const cfg = config({ stroke: channel({ easing: "easeInQuad", direction: "reverse" }) });
    // At t=250, mirrored time is 750 -> 0.75^2
    expect(drawn(cfg, m, 250)[0]).toBeCloseTo(0.5625, 2);
  });

  it("holds the end state after a transition", () => {
    const m = model([100]);
    expect(drawn(config(), m, 10_000)).toEqual([1]);
    expect(drawn(config({ stroke: channel({ direction: "reverse" }) }), m, 10_000)).toEqual([0]);
    // Single iteration: alternate == normal, alternate-reverse == reverse
    expect(drawn(config({ stroke: channel({ direction: "alternate" }) }), m, 250)).toEqual([0.25]);
    expect(drawn(config({ stroke: channel({ direction: "alternate-reverse" }) }), m, 250)).toEqual([0.75]);
  });

  it("loops in animation mode", () => {
    const m = model([100]);
    const cfg = config({ type: "animation" });
    expect(drawn(cfg, m, 250)).toEqual([0.25]);
    expect(drawn(cfg, m, 1250)).toEqual([0.25]);
    expect(drawn(cfg, m, 3750)).toEqual([0.75]);
  });

  it("alternates direction each iteration in animation mode", () => {
    const m = model([100]);
    const alt = config({ type: "animation", stroke: channel({ direction: "alternate" }) });
    expect(drawn(alt, m, 250)).toEqual([0.25]);
    expect(drawn(alt, m, 1250)).toEqual([0.75]);
    expect(drawn(alt, m, 2250)).toEqual([0.25]);
    const altRev = config({ type: "animation", stroke: channel({ direction: "alternate-reverse" }) });
    expect(drawn(altRev, m, 250)).toEqual([0.75]);
    expect(drawn(altRev, m, 1250)).toEqual([0.25]);
  });

  it("animates fill opacity relative to the element's own fill-opacity", () => {
    const m = model([10, 10]);
    m.elements[1].fillOpacity = 0.5;
    const cfg = config({ stroke: channel({ enabled: false }), fill: channel({ duration: 1000 }) });
    const frames = getFrameState(cfg, m, 500);
    expect(frames.map((f) => f.fillOpacity)).toEqual([0.5, 0.25]);
    expect(frames[0].strokeDasharray).toBe("none");
  });

  it("keeps the original fill when the fill channel is disabled", () => {
    const m = model([10]);
    m.elements[0].fillOpacity = 0.3;
    expect(getFrameState(config(), m, 0)[0].fillOpacity).toBe(0.3);
  });

  it("clamps overshooting easings", () => {
    const m = model([100]);
    const cfg = config({ stroke: channel({ easing: "easeInBack" }), fill: channel({ easing: "easeOutBack" }) });
    for (let t = 0; t <= 1000; t += 50) {
      const [f] = getFrameState(cfg, m, t);
      expect(f.strokeDashoffset).toBeGreaterThanOrEqual(0);
      expect(f.strokeDashoffset).toBeLessThanOrEqual(dashLength(100));
      expect(f.fillOpacity).toBeLessThanOrEqual(1);
      expect(f.fillOpacity).toBeGreaterThanOrEqual(0);
    }
  });

  it("treats zero duration as an instant step", () => {
    const cfg = config({ stroke: channel({ duration: 0, stagger: 100 }) });
    const m = model([10, 10]);
    expect(drawn(cfg, m, 50)).toEqual([1, 0]);
    expect(drawn(cfg, m, 100)).toEqual([1, 1]);
  });
});

describe("normalizeConfig", () => {
  it("fills in defaults and rejects bad values", () => {
    expect(normalizeConfig(null)).toEqual(defaultConfig);
    const cfg = normalizeConfig({
      type: "animation",
      stroke: { duration: -5, delay: "300", easing: "nope", direction: "sideways", stagger: 1e12 },
      background: "red; } body { display:none",
    });
    expect(cfg.type).toBe("animation");
    expect(cfg.stroke.duration).toBe(0);
    expect(cfg.stroke.delay).toBe(300);
    expect(cfg.stroke.stagger).toBe(600_000);
    expect(cfg.stroke.easing).toBe(defaultConfig.stroke.easing);
    expect(cfg.stroke.direction).toBe("normal");
    expect(cfg.background).toBe(defaultConfig.background);
    expect(normalizeConfig({ background: "rgba(0, 0, 0, 0.5)" }).background).toBe("rgba(0, 0, 0, 0.5)");
  });
});
