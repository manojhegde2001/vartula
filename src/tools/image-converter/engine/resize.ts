export type ResizeMode = "none" | "percent" | "fit" | "exact";

export interface ResizeSettings {
  mode: ResizeMode;
  /** Scale for "percent" mode, 1–400. */
  percent: number;
  /** Box for "fit" (either side may be empty) or target size for "exact" (one side may be empty to keep the aspect ratio). */
  width: number | null;
  height: number | null;
}

/** Where to read from the source image and how big the output canvas is. */
export interface ResizePlan {
  width: number;
  height: number;
  /** Source crop rectangle (the whole image unless "exact" has to crop to fill). */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/** Hard cap per side, below every browser's canvas limit. */
export const MAX_SIDE = 16384;

const clampSide = (n: number) => Math.min(MAX_SIDE, Math.max(1, Math.round(n)));
const positive = (n: number | null): n is number => n !== null && Number.isFinite(n) && n > 0;

export function planResize(srcW: number, srcH: number, r: ResizeSettings): ResizePlan {
  const full = { sx: 0, sy: 0, sw: srcW, sh: srcH };
  const scaled = (s: number) => ({ ...full, width: clampSide(srcW * s), height: clampSide(srcH * s) });

  switch (r.mode) {
    case "none":
      return scaled(1);
    case "percent":
      return scaled(Math.max(0.01, r.percent / 100));
    case "fit": {
      // Shrink to fit inside the box; never enlarge.
      const sw = positive(r.width) ? r.width / srcW : Infinity;
      const sh = positive(r.height) ? r.height / srcH : Infinity;
      return scaled(Math.min(1, sw, sh));
    }
    case "exact": {
      const w = positive(r.width) ? r.width : null;
      const h = positive(r.height) ? r.height : null;
      if (w === null && h === null) return scaled(1);
      if (w === null || h === null) return scaled(w !== null ? w / srcW : h! / srcH);
      // Both sides given: scale to cover the box, then crop the overflow evenly (centre crop).
      const target = w / h;
      const source = srcW / srcH;
      let cw = srcW;
      let ch = srcH;
      if (source > target) cw = srcH * target;
      else ch = srcW / target;
      return {
        width: clampSide(w),
        height: clampSide(h),
        sx: (srcW - cw) / 2,
        sy: (srcH - ch) / 2,
        sw: cw,
        sh: ch,
      };
    }
  }
}
