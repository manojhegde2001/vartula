import { describe, expect, it } from "vitest";
import { ellipsePerimeter, parsePathData, pathLength, pointsLength, rectLength } from "./geometry";

describe("parsePathData", () => {
  it("handles compact number syntax and implicit linetos", () => {
    expect(parsePathData("M0,0L10-5.5.5")).toEqual([
      { cmd: "M", args: [0, 0] },
      { cmd: "L", args: [10, -5.5] },
      // ".5" alone is an incomplete pair, so parsing stops (like browsers)
    ]);
    expect(parsePathData("m1 2 3 4").map((s) => s.cmd)).toEqual(["m", "l"]);
    expect(parsePathData("M1e1 2E-1")).toEqual([{ cmd: "M", args: [10, 0.2] }]);
  });

  it("reads arc flags without separators", () => {
    const [, arc] = parsePathData("M0 0a5 5 0 105 5");
    expect(arc).toEqual({ cmd: "a", args: [5, 5, 0, 1, 0, 5, 5] });
  });

  it("stops at invalid data", () => {
    expect(parsePathData("M0 0 L 10 X 20 20")).toHaveLength(1);
  });
});

describe("pathLength", () => {
  it("measures straight segments, relative commands and closepath", () => {
    expect(pathLength("M0 0 L 3 4")).toBeCloseTo(5);
    expect(pathLength("M0 0 h10 v10 H0 z")).toBeCloseTo(40);
    expect(pathLength("M0 0 l 10 0 M 100 100 l 0 10")).toBeCloseTo(20);
  });

  it("measures a straight cubic as its chord", () => {
    expect(pathLength("M0 0 C 1 0 2 0 3 0")).toBeCloseTo(3, 6);
  });

  it("measures curves accurately", () => {
    // Quarter circle approximated by a cubic (k = 0.5523) ≈ π/2 * r
    const k = 0.5522847498;
    expect(pathLength(`M100 0 C 100 ${100 * k} ${100 * k} 100 0 100`)).toBeCloseTo((Math.PI / 2) * 100, 1);
    // Quadratic parabola y = x^2 from 0..1 has length ≈ 1.4789
    expect(pathLength("M0 0 Q 0.5 0 1 1")).toBeCloseTo(1.4789, 3);
  });

  it("reflects control points for S and T", () => {
    const explicit = pathLength("M0 0 C 0 10 10 10 10 0 C 10 -10 20 -10 20 0");
    expect(pathLength("M0 0 C 0 10 10 10 10 0 S 20 -10 20 0")).toBeCloseTo(explicit, 6);
    const q = pathLength("M0 0 Q 5 10 10 0 Q 15 -10 20 0");
    expect(pathLength("M0 0 Q 5 10 10 0 T 20 0")).toBeCloseTo(q, 6);
  });

  it("measures arcs", () => {
    // Full circle as two half arcs
    expect(pathLength("M0 50 A50 50 0 1 1 100 50 A50 50 0 1 1 0 50")).toBeCloseTo(2 * Math.PI * 50, 4);
    // Quarter circle, relative
    expect(pathLength("M0 0 a10 10 0 0 1 10 10")).toBeCloseTo(5 * Math.PI, 4);
    // Radii too small get scaled up: a half circle of diameter 20
    expect(pathLength("M0 0 A1 1 0 0 1 20 0")).toBeCloseTo(10 * Math.PI, 4);
    // Zero radius is a straight line
    expect(pathLength("M0 0 A0 5 0 0 1 3 4")).toBeCloseTo(5);
  });

  it("is zero for empty or degenerate paths", () => {
    expect(pathLength("")).toBe(0);
    expect(pathLength("M10 10")).toBe(0);
    expect(pathLength("M10 10 Z")).toBe(0);
    expect(pathLength("M10 10 L10 10")).toBe(0);
  });
});

describe("shape lengths", () => {
  it("measures polylines and polygons", () => {
    expect(pointsLength("0,0 3,4 3,0", false)).toBeCloseTo(9);
    expect(pointsLength("0,0 3,4 3,0", true)).toBeCloseTo(12);
    expect(pointsLength("5 5", true)).toBe(0);
  });

  it("measures ellipses against Ramanujan's approximation", () => {
    const a = 100;
    const b = 40;
    const h = ((a - b) / (a + b)) ** 2;
    const ramanujan = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    expect(ellipsePerimeter(a, b)).toBeCloseTo(ramanujan, 2);
    expect(ellipsePerimeter(10, 10)).toBeCloseTo(20 * Math.PI, 6);
    expect(ellipsePerimeter(0, 10)).toBe(0);
  });

  it("measures rects including rounded corners", () => {
    expect(rectLength(10, 20, null, null)).toBe(60);
    expect(rectLength(0, 20, null, null)).toBe(0);
    // rx only -> ry = rx; fully rounded 20x20 square is a circle
    expect(rectLength(20, 20, 10, null)).toBeCloseTo(20 * Math.PI, 5);
    // rx larger than half width is clamped
    expect(rectLength(20, 20, 50, 50)).toBeCloseTo(20 * Math.PI, 5);
  });
});
