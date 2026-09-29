/**
 * Easing functions. Each maps progress in [0, 1] to eased progress
 * (Back overshoots outside [0, 1]). InOut variants are built symmetrically
 * from the In variant, which matches GSAP's definitions exactly.
 */

export type EasingFn = (t: number) => number;

const families = ["Quad", "Cubic", "Quart", "Quint", "Sine", "Expo", "Circ", "Back"] as const;
export type EasingFamily = (typeof families)[number];

export const easingNames = [
  "linear",
  "ease",
  ...families.flatMap((f) => [`easeIn${f}`, `easeOut${f}`, `easeInOut${f}`] as const),
] as const;
export type EasingName = (typeof easingNames)[number];

const BACK_OVERSHOOT = 1.70158;

const easeIn: Record<EasingFamily, EasingFn> = {
  Quad: (t) => t * t,
  Cubic: (t) => t ** 3,
  Quart: (t) => t ** 4,
  Quint: (t) => t ** 5,
  Sine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  Expo: (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  Circ: (t) => 1 - Math.sqrt(1 - t * t),
  Back: (t) => t * t * ((BACK_OVERSHOOT + 1) * t - BACK_OVERSHOOT),
};

/** CSS-style cubic-bezier timing function (x1, x2 must be in [0, 1]). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s;
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;

  const solveS = (x: number) => {
    let s = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(s) - x;
      if (Math.abs(err) < 1e-7) return s;
      const d = slopeX(s);
      if (Math.abs(d) < 1e-6) break;
      s -= err / d;
    }
    let lo = 0;
    let hi = 1;
    s = x;
    while (hi - lo > 1e-7) {
      if (sampleX(s) < x) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return s;
  };

  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : sampleY(solveS(t)));
}

function build(): Record<EasingName, EasingFn> {
  const table: Record<string, EasingFn> = {
    linear: (t) => t,
    ease: cubicBezier(0.25, 0.1, 0.25, 1),
  };
  for (const f of families) {
    const fin = easeIn[f];
    table[`easeIn${f}`] = fin;
    table[`easeOut${f}`] = (t) => 1 - fin(1 - t);
    table[`easeInOut${f}`] = (t) => (t < 0.5 ? fin(t * 2) / 2 : 1 - fin((1 - t) * 2) / 2);
  }
  return table as Record<EasingName, EasingFn>;
}

export const easings: Record<EasingName, EasingFn> = build();

export function isEasingName(name: unknown): name is EasingName {
  return typeof name === "string" && (easingNames as readonly string[]).includes(name);
}

/** Evaluate an easing with exact endpoints (0 -> 0, 1 -> 1). */
export function ease(name: EasingName, t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return easings[name](t);
}

/** Human-readable label, e.g. "easeInOutCubic" -> "Ease In Out Cubic". */
export function easingLabel(name: EasingName): string {
  if (name === "linear") return "Linear";
  if (name === "ease") return "Ease";
  return name.replace(/([A-Z])/g, " $1").replace(/^ease/, "Ease");
}

const round = (n: number, p = 4) => Number(n.toFixed(p)).toString();

/**
 * CSS timing-function string for an easing. `linear` and `ease` map to the keywords;
 * everything else is sampled into a CSS `linear()` function so exported CSS follows
 * the engine's curve rather than a cubic-bezier approximation. Values are clamped
 * to [0, 1] like the engine clamps overshoot.
 */
export function cssEasing(name: EasingName, samples = 24): string {
  if (name === "linear" || name === "ease") return name;
  const points: string[] = [];
  for (let i = 0; i <= samples; i++) points.push(round(Math.min(1, Math.max(0, ease(name, i / samples)))));
  return `linear(${points.join(", ")})`;
}

/**
 * GSAP ease string with identical math, or null for `ease` (GSAP has no CSS `ease`
 * built in, so exporters inline a function for it).
 */
export function gsapEase(name: EasingName): string | null {
  if (name === "linear") return "none";
  if (name === "ease") return null;
  const m = /^ease(InOut|In|Out)(\w+)$/.exec(name)!;
  const kind = m[1].toLowerCase() as "in" | "out" | "inout";
  const gsapFamily: Record<EasingFamily, string> = {
    Quad: "power1",
    Cubic: "power2",
    Quart: "power3",
    Quint: "power4",
    Sine: "sine",
    Expo: "expo",
    Circ: "circ",
    Back: "back",
  };
  const fam = gsapFamily[m[2] as EasingFamily];
  const suffix = kind === "inout" ? "inOut" : kind;
  return m[2] === "Back" ? `${fam}.${suffix}(${BACK_OVERSHOOT})` : `${fam}.${suffix}`;
}
