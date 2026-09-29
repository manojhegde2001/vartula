/**
 * Geometric lengths for SVG shapes, computed from attributes alone so the engine
 * works without a rendering DOM (tests, workers, SSR) and is deterministic.
 */

type Vec = { x: number; y: number };

// 8-point Gauss–Legendre nodes/weights on [-1, 1].
const GL_X = [
  -0.9602898564975363, -0.7966664774136267, -0.5255324099163290, -0.1834346424956498, 0.1834346424956498,
  0.525532409916329, 0.7966664774136267, 0.9602898564975363,
];
const GL_W = [
  0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.3626837833783620, 0.362683783378362,
  0.3137066458778873, 0.2223810344533745, 0.1012285362903763,
];

/** Integrate `speed` over [a, b] with composite Gauss–Legendre quadrature. */
function integrate(speed: (t: number) => number, a: number, b: number, pieces = 16): number {
  const h = (b - a) / pieces;
  let total = 0;
  for (let p = 0; p < pieces; p++) {
    const mid = a + h * (p + 0.5);
    const half = h / 2;
    for (let i = 0; i < GL_X.length; i++) total += GL_W[i] * speed(mid + half * GL_X[i]);
  }
  return Math.abs(total * (h / 2));
}

const dist = (a: Vec, b: Vec) => Math.hypot(b.x - a.x, b.y - a.y);

function cubicLength(p0: Vec, p1: Vec, p2: Vec, p3: Vec): number {
  const chord = dist(p0, p3);
  const poly = dist(p0, p1) + dist(p1, p2) + dist(p2, p3);
  if (poly - chord < 1e-9) return chord; // effectively straight
  return integrate((t) => {
    const mt = 1 - t;
    const dx = 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
    const dy = 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
    return Math.hypot(dx, dy);
  }, 0, 1);
}

function quadLength(p0: Vec, p1: Vec, p2: Vec): number {
  if (dist(p0, p1) + dist(p1, p2) - dist(p0, p2) < 1e-9) return dist(p0, p2);
  return integrate((t) => {
    const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    return Math.hypot(dx, dy);
  }, 0, 1);
}

/** Length of an elliptical arc of radii rx, ry swept from angle θ1 by Δθ. */
function ellipseArcLength(rx: number, ry: number, theta1: number, delta: number): number {
  if (delta === 0) return 0;
  if (Math.abs(rx - ry) < 1e-12) return Math.abs(rx * delta);
  const pieces = Math.max(4, Math.ceil((Math.abs(delta) / (Math.PI / 2)) * 8));
  return integrate((t) => Math.hypot(rx * Math.sin(t), ry * Math.cos(t)), theta1, theta1 + delta, pieces);
}

export function ellipsePerimeter(rx: number, ry: number): number {
  if (rx <= 0 || ry <= 0) return 0;
  return ellipseArcLength(rx, ry, 0, 2 * Math.PI);
}

/** SVG arc (endpoint parameterization) length, per SVG 1.1 implementation notes F.6. */
function arcLength(from: Vec, rxIn: number, ryIn: number, phiDeg: number, largeArc: boolean, sweep: boolean, to: Vec) {
  if (from.x === to.x && from.y === to.y) return 0;
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) return dist(from, to);

  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (from.x - to.x) / 2;
  const dy = (from.y - to.y) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rx *= s;
    ry *= s;
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let coef = Math.sqrt(Math.max(0, num / den));
  if (largeArc === sweep) coef = -coef;
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;

  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;
  const theta1 = angle(1, 0, ux, uy);
  let delta = angle(ux, uy, vx, vy);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  else if (sweep && delta < 0) delta += 2 * Math.PI;

  return ellipseArcLength(rx, ry, theta1, delta);
}

// ---------------------------------------------------------------------------
// Path data

const PARAM_COUNT: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

export interface PathSegment {
  cmd: string; // original command letter (case preserved)
  args: number[];
}

/** Tokenize SVG path data into commands with numeric arguments. Stops at the first error, as browsers do. */
export function parsePathData(d: string): PathSegment[] {
  const segments: PathSegment[] = [];
  let i = 0;
  const n = d.length;
  const isWs = (c: string) => c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f" || c === ",";

  const skipWs = () => {
    while (i < n && isWs(d[i])) i++;
  };

  const readNumber = (): number | null => {
    skipWs();
    const m = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(d.slice(i, i + 64));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };

  const readFlag = (): number | null => {
    skipWs();
    const c = d[i];
    if (c === "0" || c === "1") {
      i++;
      return c === "1" ? 1 : 0;
    }
    return null;
  };

  let current: string | null = null;
  while (true) {
    skipWs();
    if (i >= n) break;
    const c = d[i];
    if (/[a-zA-Z]/.test(c)) {
      if (!(c.toLowerCase() in PARAM_COUNT)) break;
      current = c;
      i++;
    } else if (current === null) {
      break;
    }
    const cmd: string = current!;
    const count = PARAM_COUNT[cmd.toLowerCase()];
    if (count === 0) {
      segments.push({ cmd, args: [] });
      current = null;
      continue;
    }
    const args: number[] = [];
    for (let k = 0; k < count; k++) {
      const v = cmd.toLowerCase() === "a" && (k === 3 || k === 4) ? readFlag() : readNumber();
      if (v === null) return segments;
      args.push(v);
    }
    segments.push({ cmd, args });
    // Implicit repeats after a moveto are linetos.
    if (cmd === "m") current = "l";
    else if (cmd === "M") current = "L";
  }
  return segments;
}

/** Total length of SVG path data, including closepath segments. */
export function pathLength(d: string): number {
  const segs = parsePathData(d);
  let total = 0;
  let cur: Vec = { x: 0, y: 0 };
  let start: Vec = { x: 0, y: 0 };
  let lastCtrl: Vec | null = null; // reflected control point source for S/T
  let lastCmd = "";

  for (const { cmd, args } of segs) {
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? cur.x : 0;
    const oy = rel ? cur.y : 0;
    let next: Vec = cur;

    switch (C) {
      case "M":
        next = { x: ox + args[0], y: oy + args[1] };
        start = next;
        lastCtrl = null;
        break;
      case "L":
        next = { x: ox + args[0], y: oy + args[1] };
        total += dist(cur, next);
        lastCtrl = null;
        break;
      case "H":
        next = { x: ox + args[0], y: cur.y };
        total += dist(cur, next);
        lastCtrl = null;
        break;
      case "V":
        next = { x: cur.x, y: oy + args[0] };
        total += dist(cur, next);
        lastCtrl = null;
        break;
      case "C": {
        const p1 = { x: ox + args[0], y: oy + args[1] };
        const p2 = { x: ox + args[2], y: oy + args[3] };
        next = { x: ox + args[4], y: oy + args[5] };
        total += cubicLength(cur, p1, p2, next);
        lastCtrl = p2;
        break;
      }
      case "S": {
        const p1: Vec = lastCtrl && /[CS]/.test(lastCmd) ? { x: 2 * cur.x - lastCtrl.x, y: 2 * cur.y - lastCtrl.y } : cur;
        const p2 = { x: ox + args[0], y: oy + args[1] };
        next = { x: ox + args[2], y: oy + args[3] };
        total += cubicLength(cur, p1, p2, next);
        lastCtrl = p2;
        break;
      }
      case "Q": {
        const p1 = { x: ox + args[0], y: oy + args[1] };
        next = { x: ox + args[2], y: oy + args[3] };
        total += quadLength(cur, p1, next);
        lastCtrl = p1;
        break;
      }
      case "T": {
        const p1: Vec = lastCtrl && /[QT]/.test(lastCmd) ? { x: 2 * cur.x - lastCtrl.x, y: 2 * cur.y - lastCtrl.y } : cur;
        next = { x: ox + args[0], y: oy + args[1] };
        total += quadLength(cur, p1, next);
        lastCtrl = p1;
        break;
      }
      case "A":
        next = { x: ox + args[5], y: oy + args[6] };
        total += arcLength(cur, args[0], args[1], args[2], args[3] === 1, args[4] === 1, next);
        lastCtrl = null;
        break;
      case "Z":
        total += dist(cur, start);
        next = start;
        lastCtrl = null;
        break;
    }
    cur = next;
    lastCmd = C;
  }
  return total;
}

export function pointsLength(points: string, closed: boolean): number {
  const nums = (points.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) ?? []).map(Number);
  const pts: Vec[] = [];
  for (let k = 0; k + 1 < nums.length; k += 2) pts.push({ x: nums[k], y: nums[k + 1] });
  let total = 0;
  for (let k = 1; k < pts.length; k++) total += dist(pts[k - 1], pts[k]);
  if (closed && pts.length > 1) total += dist(pts[pts.length - 1], pts[0]);
  return total;
}

export function rectLength(w: number, h: number, rxIn: number | null, ryIn: number | null): number {
  if (!(w > 0) || !(h > 0)) return 0;
  let rx = rxIn ?? ryIn ?? 0;
  let ry = ryIn ?? rxIn ?? 0;
  rx = Math.min(Math.max(rx, 0), w / 2);
  ry = Math.min(Math.max(ry, 0), h / 2);
  if (rx === 0 || ry === 0) return 2 * (w + h);
  return 2 * (w - 2 * rx) + 2 * (h - 2 * ry) + ellipsePerimeter(rx, ry);
}
