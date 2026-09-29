import { describe, expect, it } from "vitest";
import { defaultConfig } from "../engine";
import type { AnimatorConfig, SvgModel } from "../engine";
import { exportFilename, frameTimes, gifDelays, gifFrameStride, normalizeSize } from "./settings";

const model: SvgModel = {
  viewBox: { x: 0, y: 0, width: 10, height: 10 },
  width: 10,
  height: 10,
  elements: [{ index: 0, tag: "path", length: 10, fillOpacity: 1, id: null }],
};
const oneSecond: AnimatorConfig = {
  ...defaultConfig,
  stroke: { ...defaultConfig.stroke, duration: 1000, delay: 0, stagger: 0 },
  fill: { ...defaultConfig.fill, enabled: false },
};

describe("frameTimes", () => {
  it("includes the final frame of a transition", () => {
    const times = frameTimes(oneSecond, model, 30);
    expect(times).toHaveLength(31);
    expect(times[0]).toBe(0);
    expect(times[30]).toBeCloseTo(1000);
  });

  it("adds hold frames after a transition", () => {
    expect(frameTimes(oneSecond, model, 24, 500)).toHaveLength(37);
  });

  it("covers exactly one loop for animations (no duplicate end frame)", () => {
    const loop = { ...oneSecond, type: "animation" as const };
    const times = frameTimes(loop, model, 60);
    expect(times).toHaveLength(60);
    expect(times[59]).toBeLessThan(1000);
    // Alternating loops span two cycles.
    const alt = { ...loop, stroke: { ...loop.stroke, direction: "alternate" as const } };
    expect(frameTimes(alt, model, 24)).toHaveLength(48);
  });

  it("returns a single frame for empty timelines", () => {
    expect(frameTimes(oneSecond, { ...model, elements: [] }, 30)).toEqual([0]);
  });
});

describe("gif timing", () => {
  it("keeps the total length right despite centisecond rounding", () => {
    const delays = gifDelays(30, 30);
    expect(delays.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(new Set(delays)).toEqual(new Set([30, 40]));
  });

  it("never uses delays under 20ms", () => {
    expect(Math.min(...gifDelays(50, 50))).toBe(20);
    expect(gifFrameStride(60)).toBe(2);
    expect(gifFrameStride(30)).toBe(1);
  });
});

describe("normalizeSize", () => {
  it("clamps and evens out sizes for video", () => {
    expect(normalizeSize(1921, 1081, true)).toEqual({ width: 1920, height: 1080 });
    expect(normalizeSize(1, 99999, false)).toEqual({ width: 16, height: 3840 });
    expect(normalizeSize(Number.NaN, 101, false)).toEqual({ width: 16, height: 101 });
  });
});

it("builds safe filenames", () => {
  expect(exportFilename("My Logo (final)", "mp4")).toBe("my-logo-final.mp4");
  expect(exportFilename("  ", "png")).toBe("animation.zip");
});
