/**
 * Map a box drawn on the page as the reader sees it (rotation applied, origin top-left, 0–1 units)
 * to PDF user space (origin bottom-left, points), so a stamped image lands exactly where it was placed
 * and appears upright even on pages with a /Rotate entry.
 */

export type Rotation = 0 | 90 | 180 | 270;

/** Normalised box on the displayed page: left, top, width, height, each 0–1. */
export interface ViewBox {
  u: number;
  v: number;
  w: number;
  h: number;
}

/** The page's visible area (crop box) in user space. */
export interface PageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfPlacement {
  /** Image anchor (its bottom-left corner before rotation). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Counter-clockwise rotation in degrees for pdf-lib's drawImage. */
  rotate: Rotation;
}

export function normalizeRotation(angle: number): Rotation {
  return ((((Math.round(angle / 90) * 90) % 360) + 360) % 360) as Rotation;
}

/** Size of the page as displayed (width and height swap at 90° and 270°). */
export function displaySize(box: PageBox, rotation: Rotation) {
  return rotation % 180 === 0 ? { width: box.width, height: box.height } : { width: box.height, height: box.width };
}

/** Displayed point (0–1, top-left origin) to user-space coordinates. */
export function toUserSpace(u: number, v: number, box: PageBox, rotation: Rotation) {
  const { x: bx, y: by, width: W, height: H } = box;
  switch (rotation) {
    case 0:
      return { x: bx + u * W, y: by + (1 - v) * H };
    case 90:
      return { x: bx + v * W, y: by + u * H };
    case 180:
      return { x: bx + (1 - u) * W, y: by + v * H };
    case 270:
      return { x: bx + (1 - v) * W, y: by + (1 - u) * H };
  }
}

export function toPdfPlacement(view: ViewBox, box: PageBox, rotation: Rotation): PdfPlacement {
  const shown = displaySize(box, rotation);
  // The image's own bottom-left corner is the displayed box's bottom-left.
  const anchor = toUserSpace(view.u, view.v + view.h, box, rotation);
  return { ...anchor, width: view.w * shown.width, height: view.h * shown.height, rotate: rotation };
}
