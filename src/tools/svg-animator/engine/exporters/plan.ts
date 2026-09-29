/**
 * Export plan: the engine's timeline flattened into explicit keyframe segments,
 * one track per animated property per element. Every code exporter renders this
 * plan, and plan.test.ts proves that evaluating it matches getFrameState, so
 * exported code animates exactly like the preview.
 */
import { evalEasing, type EasingName } from "../easing";
import { channelSpan, getFrameState, hiddenDashOffset, isMirrored, loopDuration, totalDuration, elementWindow } from "../timeline";
import type { AnimationType, AnimatorConfig, ChannelConfig, SvgModel } from "../types";

export type TrackProperty = "stroke-dashoffset" | "fill-opacity";

/**
 * One engine iteration of one property. The value is `from` from `iterationStart`
 * until `start`, eases to `to` by `end`, then holds `to` until `iterationEnd`.
 * Consecutive segments may jump at the iteration boundary (e.g. a normal-direction
 * stroke restarting while an alternating fill makes the loop two cycles long).
 */
export interface Segment {
  /** ms from the start of the loop. */
  iterationStart: number;
  iterationEnd: number;
  start: number;
  end: number;
  from: number;
  to: number;
  easing: EasingName;
  /** Play the easing curve backwards (a mirrored iteration). */
  reversed: boolean;
}

export interface Track {
  element: number;
  property: TrackProperty;
  /** Value before the first segment starts. */
  initial: number;
  segments: Segment[];
}

export interface ExportPlan {
  type: AnimationType;
  /** Length of one loop in ms (see loopDuration). */
  duration: number;
  /** Whether it repeats forever. */
  loop: boolean;
  /** stroke-dasharray per element, or null when the stroke is not animated. */
  dasharray: (string | null)[];
  tracks: Track[];
  background: string;
}

function channelSegments(
  config: AnimatorConfig,
  channel: ChannelConfig,
  index: number,
  cycle: number,
  iterations: number,
  hidden: number,
  shown: number,
): { initial: number; segments: Segment[] } {
  const { start, end } = elementWindow(channel, index);
  const segments: Segment[] = [];
  for (let k = 0; k < iterations; k++) {
    const offset = k * cycle;
    if (isMirrored(channel, config.type === "transition" ? 0 : k)) {
      segments.push({
        iterationStart: offset,
        iterationEnd: offset + cycle,
        start: offset + cycle - end,
        end: offset + cycle - start,
        from: shown,
        to: hidden,
        easing: channel.easing,
        reversed: true,
      });
    } else {
      segments.push({
        iterationStart: offset,
        iterationEnd: offset + cycle,
        start: offset + start,
        end: offset + end,
        from: hidden,
        to: shown,
        easing: channel.easing,
        reversed: false,
      });
    }
  }
  return { initial: segments[0].from, segments };
}

export function buildPlan(config: AnimatorConfig, model: SvgModel): ExportPlan {
  const cycle = totalDuration(config, model);
  const duration = loopDuration(config, model);
  const iterations = cycle > 0 ? Math.round(duration / cycle) : 0;
  const n = model.elements.length;
  const first = getFrameState(config, model, 0);
  const tracks: Track[] = [];

  model.elements.forEach((el, i) => {
    if (iterations === 0) return;
    if (config.stroke.enabled && el.length > 0 && channelSpan(config.stroke, n) > 0) {
      const { initial, segments } = channelSegments(config, config.stroke, i, cycle, iterations, hiddenDashOffset(el.length), 0);
      tracks.push({ element: i, property: "stroke-dashoffset", initial, segments });
    }
    if (config.fill.enabled && channelSpan(config.fill, n) > 0) {
      const { initial, segments } = channelSegments(config, config.fill, i, cycle, iterations, 0, el.fillOpacity);
      tracks.push({ element: i, property: "fill-opacity", initial, segments });
    }
  });

  return {
    type: config.type,
    duration,
    loop: config.type === "animation",
    dasharray: first.map((f) => (f.strokeDasharray === "none" ? null : f.strokeDasharray)),
    tracks,
    background: config.background,
  };
}

/** Value of a track at time t (ms within the loop). Mirrors how CSS/WAAPI/SMIL/GSAP interpolate. */
export function evaluateTrack(track: Track, t: number): number {
  const seg = track.segments.find((s) => t < s.iterationEnd) ?? track.segments[track.segments.length - 1];
  if (t < seg.start) return seg.from;
  if (t >= seg.end) return seg.to;
  const p = (t - seg.start) / (seg.end - seg.start);
  return seg.from + (seg.to - seg.from) * evalEasing(seg.easing, p, seg.reversed);
}

/** A keyframe: value at `time`; `segment` is set when the interval to the next stop is eased. */
export interface Stop {
  time: number;
  value: number;
  segment: Segment | null;
}

/**
 * Keyframe stops for a track, covering [0, duration]. Between stops values are
 * interpolated linearly, or with the segment's easing when `segment` is set.
 * An instant jump is two consecutive stops with the same time.
 */
export function trackStops(track: Track, duration: number): Stop[] {
  const stops: Stop[] = [];
  const push = (time: number, value: number, segment: Segment | null = null) => {
    const last = stops[stops.length - 1];
    if (last && last.time === time && last.value === value) {
      if (segment) last.segment = segment;
      return;
    }
    stops.push({ time, value, segment });
  };
  for (const seg of track.segments) {
    push(seg.iterationStart, seg.from);
    push(seg.start, seg.from, seg.end > seg.start ? seg : null);
    push(seg.end, seg.to);
    push(seg.iterationEnd, seg.to);
  }
  push(duration, track.segments[track.segments.length - 1].to);
  return stops;
}

/** Evaluate stops the way CSS/WAAPI/SMIL do. Used by tests to verify exporter input. */
export function evaluateStops(stops: Stop[], t: number): number {
  let i = 0;
  while (i + 1 < stops.length && stops[i + 1].time <= t) i++;
  const a = stops[i];
  const b = stops[i + 1];
  if (!b || b.time === a.time) return a.value;
  const p = (t - a.time) / (b.time - a.time);
  const eased = a.segment ? evalEasing(a.segment.easing, p, a.segment.reversed) : p;
  return a.value + (b.value - a.value) * eased;
}

/** Evenly spaced sample points of a segment's eased curve, as [time, value] pairs (inclusive). */
export function sampleSegment(seg: Segment, samples: number): [number, number][] {
  const points: [number, number][] = [];
  for (let s = 0; s <= samples; s++) {
    const p = s / samples;
    points.push([seg.start + (seg.end - seg.start) * p, seg.from + (seg.to - seg.from) * evalEasing(seg.easing, p, seg.reversed)]);
  }
  return points;
}

/** Format a number compactly for code output. */
export function fmt(n: number, places = 3): string {
  const r = Number(n.toFixed(places));
  return String(r === 0 ? 0 : r);
}

/** Format a percentage of the loop (for keyframes). */
export function pct(t: number, duration: number): string {
  return `${fmt(duration > 0 ? (t / duration) * 100 : 0, 4)}%`;
}
