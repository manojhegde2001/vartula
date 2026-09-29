import { cssEasing } from "../easing";
import { fmt, trackStops, type ExportPlan, type TrackProperty } from "./plan";

export const camelProperty: Record<TrackProperty, "strokeDashoffset" | "fillOpacity"> = {
  "stroke-dashoffset": "strokeDashoffset",
  "fill-opacity": "fillOpacity",
};

/**
 * Keyframe data for element.animate(): one line per track,
 * `[elementIndex, property, [[offset, value, easing?], ...]]`.
 * Equal consecutive offsets encode instant jumps (allowed by WAAPI).
 */
export function waapiTrackLines(plan: ExportPlan): string[] {
  return plan.tracks.map((track) => {
    const stops = trackStops(track, plan.duration).map((stop) => {
      const offset = fmt(plan.duration > 0 ? Math.min(stop.time / plan.duration, 1) : 0, 6);
      const easing = stop.segment ? `, ${JSON.stringify(cssEasing(stop.segment.easing, stop.segment.reversed))}` : "";
      return `[${offset}, ${fmt(stop.value, 4)}${easing}]`;
    });
    return `[${track.element}, "${camelProperty[track.property]}", [${stops.join(", ")}]]`;
  });
}

export function dashLiteral(plan: ExportPlan): string {
  return `[${plan.dasharray.map((d) => (d ? JSON.stringify(d) : "null")).join(", ")}]`;
}
