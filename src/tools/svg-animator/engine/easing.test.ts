import { describe, expect, it } from "vitest";
import { cssEasing, cubicBezier, ease, easingLabel, easingNames, easings, gsapEase, isEasingName } from "./easing";

describe("easing", () => {
  it("includes linear, ease and In/Out/InOut for all eight families", () => {
    expect(easingNames).toHaveLength(2 + 8 * 3);
    for (const fam of ["Quad", "Cubic", "Quart", "Quint", "Sine", "Expo", "Circ", "Back"]) {
      for (const kind of ["In", "Out", "InOut"]) expect(easingNames).toContain(`ease${kind}${fam}`);
    }
  });

  it.each(easingNames)("%s starts at 0 and ends at 1", (name) => {
    expect(ease(name, 0)).toBe(0);
    expect(ease(name, 1)).toBe(1);
    expect(easings[name](0)).toBeCloseTo(0, 6);
    expect(easings[name](1)).toBeCloseTo(1, 6);
  });

  it.each(easingNames.filter((n) => n.startsWith("easeInOut")))("%s is symmetric around the midpoint", (name) => {
    expect(ease(name, 0.5)).toBeCloseTo(0.5, 6);
    expect(ease(name, 0.25) + ease(name, 0.75)).toBeCloseTo(1, 6);
  });

  it.each(easingNames.filter((n) => !n.includes("Back")))("%s is monotonic", (name) => {
    let prev = 0;
    for (let i = 1; i <= 100; i++) {
      const v = ease(name, i / 100);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
  });

  it("Back overshoots", () => {
    expect(ease("easeInBack", 0.2)).toBeLessThan(0);
    expect(ease("easeOutBack", 0.8)).toBeGreaterThan(1);
  });

  it("matches known reference values", () => {
    expect(ease("easeInQuad", 0.5)).toBeCloseTo(0.25);
    expect(ease("easeOutCubic", 0.5)).toBeCloseTo(0.875);
    expect(ease("easeInExpo", 0.5)).toBeCloseTo(2 ** -5);
    expect(ease("easeInSine", 0.5)).toBeCloseTo(1 - Math.SQRT1_2);
    // CSS `ease` = cubic-bezier(0.25, 0.1, 0.25, 1); ~0.8024 at x = 0.5
    expect(ease("ease", 0.5)).toBeCloseTo(0.8024, 3);
  });

  it("cubicBezier(0,0,1,1) is linear", () => {
    const f = cubicBezier(0, 0, 1, 1);
    for (const t of [0.1, 0.33, 0.5, 0.9]) expect(f(t)).toBeCloseTo(t, 5);
  });

  it("produces CSS timing functions", () => {
    expect(cssEasing("linear")).toBe("linear");
    expect(cssEasing("ease")).toBe("ease");
    const lin = cssEasing("easeInQuad", 4);
    expect(lin).toBe("linear(0, 0.0625, 0.25, 0.5625, 1)");
    // Overshoot is clamped like the engine does.
    expect(cssEasing("easeInBack", 10)).not.toMatch(/-/);
  });

  it("maps to identical GSAP eases", () => {
    expect(gsapEase("linear")).toBe("none");
    expect(gsapEase("ease")).toBeNull();
    expect(gsapEase("easeInQuad")).toBe("power1.in");
    expect(gsapEase("easeInOutQuint")).toBe("power4.inOut");
    expect(gsapEase("easeOutBack")).toBe("back.out(1.70158)");
  });

  it("labels and validates names", () => {
    expect(easingLabel("easeInOutCubic")).toBe("Ease In Out Cubic");
    expect(isEasingName("easeOutCirc")).toBe(true);
    expect(isEasingName("bounce")).toBe(false);
  });
});
