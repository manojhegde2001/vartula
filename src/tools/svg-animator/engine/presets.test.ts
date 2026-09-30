import { describe, expect, it } from "vitest";
import { defaultConfig, MAX_MS, normalizeConfig } from "./config";
import { applyPreset, matchPreset, presets, scaleTiming } from "./presets";

describe("presets", () => {
  it("have unique ids and survive normalizeConfig unchanged", () => {
    expect(new Set(presets.map((p) => p.id)).size).toBe(presets.length);
    for (const p of presets) {
      const cfg = applyPreset(defaultConfig, p);
      expect(normalizeConfig(cfg)).toEqual(cfg);
    }
  });

  it("keep the current background", () => {
    const cfg = applyPreset({ ...defaultConfig, background: "transparent" }, presets[1]);
    expect(cfg.background).toBe("transparent");
  });

  it("the default config matches the first preset", () => {
    expect(matchPreset(defaultConfig)?.id).toBe("draw-fill");
  });

  it("each preset matches itself", () => {
    for (const p of presets) expect(matchPreset(applyPreset(defaultConfig, p))?.id).toBe(p.id);
  });

  it("stops matching once a value is edited", () => {
    const cfg = { ...defaultConfig, stroke: { ...defaultConfig.stroke, duration: 1234 } };
    expect(matchPreset(cfg)).toBeNull();
  });

  it("ignores timing on a disabled channel", () => {
    const draw = presets.find((p) => p.id === "draw-only")!;
    const cfg = applyPreset(defaultConfig, draw);
    expect(matchPreset({ ...cfg, fill: { ...cfg.fill, duration: 9999 } })?.id).toBe("draw-only");
  });
});

describe("scaleTiming", () => {
  it("scales duration, delay and stagger on both channels", () => {
    const cfg = scaleTiming(defaultConfig, 2);
    expect(cfg.stroke).toMatchObject({ duration: 3000, delay: 0, stagger: 100 });
    expect(cfg.fill).toMatchObject({ duration: 1400, delay: 2400, stagger: 100 });
    expect(cfg.stroke.easing).toBe(defaultConfig.stroke.easing);
  });

  it("round-trips for simple factors", () => {
    expect(scaleTiming(scaleTiming(defaultConfig, 0.5), 2)).toEqual(defaultConfig);
  });

  it("clamps to the allowed range and keeps durations positive", () => {
    const big = scaleTiming(defaultConfig, 1e6);
    expect(big.stroke.duration).toBe(MAX_MS);
    expect(scaleTiming(defaultConfig, 1e-9).stroke.duration).toBe(1);
  });

  it("ignores invalid factors", () => {
    expect(scaleTiming(defaultConfig, 0)).toBe(defaultConfig);
    expect(scaleTiming(defaultConfig, Number.NaN)).toBe(defaultConfig);
  });
});
