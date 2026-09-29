import type { EasingName } from "./easing";

export type DrawableTag = "path" | "line" | "polyline" | "polygon" | "circle" | "ellipse" | "rect";

/**
 * CSS animation-direction semantics, applied to the whole timeline:
 * `reverse` plays the sequence backwards (the last element un-draws first).
 * With type "transition" there is a single iteration, so `alternate` behaves
 * like `normal` and `alternate-reverse` like `reverse`.
 */
export type Direction = "normal" | "reverse" | "alternate" | "alternate-reverse";

/** "transition" plays once and holds the end state; "animation" loops forever. */
export type AnimationType = "transition" | "animation";

export interface ChannelConfig {
  enabled: boolean;
  /** Per-element duration in ms. */
  duration: number;
  /** Delay before the first element starts, in ms. */
  delay: number;
  /** Extra delay added per element index (stagger step), in ms. */
  stagger: number;
  easing: EasingName;
  direction: Direction;
}

export interface AnimatorConfig {
  type: AnimationType;
  stroke: ChannelConfig;
  fill: ChannelConfig;
  /** Any CSS color, or "transparent". */
  background: string;
}

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawableElement {
  /** Position in document order among drawable elements. */
  index: number;
  tag: DrawableTag;
  /** Geometric length in user units (or the `pathLength` attribute when present). */
  length: number;
  /** Effective fill-opacity from the element and its ancestors (0–1). */
  fillOpacity: number;
  id: string | null;
}

export interface SvgModel {
  viewBox: ViewBox;
  /** Intrinsic size in CSS px (from width/height, falling back to the viewBox). */
  width: number;
  height: number;
  elements: DrawableElement[];
}

export interface ElementFrame {
  /** "none" when the stroke is not animated (disabled channel or zero-length element). */
  strokeDasharray: string;
  strokeDashoffset: number;
  fillOpacity: number;
}
