import type { ElementFrame } from "./types";

/**
 * Write frame state onto drawable elements (as returned by collectDrawables).
 * Used by the live preview and by frame rendering for video export.
 */
export function applyFrame(elements: Element[], frames: ElementFrame[]): void {
  const count = Math.min(elements.length, frames.length);
  for (let i = 0; i < count; i++) {
    const style = (elements[i] as SVGElement).style;
    if (!style) continue;
    const f = frames[i];
    if (f.strokeDasharray === "none") {
      style.removeProperty("stroke-dasharray");
      style.removeProperty("stroke-dashoffset");
    } else {
      style.setProperty("stroke-dasharray", f.strokeDasharray);
      style.setProperty("stroke-dashoffset", String(f.strokeDashoffset));
    }
    style.setProperty("fill-opacity", String(f.fillOpacity));
  }
}
