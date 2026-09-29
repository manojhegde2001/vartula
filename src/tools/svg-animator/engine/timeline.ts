/**
 * The animation model. Preview, code exporters and video export all derive
 * their values from these functions — nothing else decides what a frame looks like.
 *
 * Timeline for a channel (stroke or fill) with n elements:
 *   element i runs from  start_i = delay + i * stagger  to  start_i + duration.
 * The cycle is the longest enabled channel span. Direction mirrors time within
 * the cycle, exactly like CSS animation-direction does for a keyframe animation
 * whose duration is the whole cycle.
 */
import { ease } from "./easing";
import type { AnimatorConfig, ChannelConfig, ElementFrame, SvgModel } from "./types";

/**
 * Dash pattern length relative to the element length. A 1% pad keeps the
 * repeating dash pattern from showing a sliver at the end of the path when a
 * browser measures the path slightly longer than we do.
 */
export const DASH_PAD_RATIO = 0.01;

const round = (n: number, places: number) => {
  const r = Math.round(n * 10 ** places) / 10 ** places;
  return r === 0 ? 0 : r; // normalize -0
};
const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Length of one dash (and one gap) for an element of the given length. */
export function dashLength(length: number): number {
  return length > 0 ? round(length * (1 + DASH_PAD_RATIO), 3) : 0;
}

/** Duration of one channel's sequence, or 0 when disabled / empty. */
export function channelSpan(channel: ChannelConfig, count: number): number {
  if (!channel.enabled || count === 0) return 0;
  return channel.delay + (count - 1) * channel.stagger + channel.duration;
}

/**
 * Length of one pass through the timeline in ms. For "transition" this is the
 * whole animation; for "animation" it is one loop iteration.
 */
export function totalDuration(config: AnimatorConfig, model: SvgModel): number {
  const n = model.elements.length;
  return Math.max(channelSpan(config.stroke, n), channelSpan(config.fill, n));
}

/** Start/end of element `index` within the (un-mirrored) cycle. */
export function elementWindow(channel: ChannelConfig, index: number): { start: number; end: number } {
  const start = channel.delay + index * channel.stagger;
  return { start, end: start + channel.duration };
}

export function isMirrored(channel: ChannelConfig, iteration: number): boolean {
  switch (channel.direction) {
    case "reverse":
      return true;
    case "alternate":
      return iteration % 2 === 1;
    case "alternate-reverse":
      return iteration % 2 === 0;
    default:
      return false;
  }
}

/** Map wall-clock time to a channel's time within the cycle, applying looping and direction. */
export function channelTime(config: AnimatorConfig, channel: ChannelConfig, timeMs: number, cycle: number): number {
  if (cycle <= 0) return 0;
  let iteration = 0;
  let t: number;
  if (config.type === "transition" || timeMs <= 0) {
    t = Math.min(Math.max(timeMs, 0), cycle);
  } else {
    iteration = Math.floor(timeMs / cycle);
    t = timeMs - iteration * cycle;
  }
  return isMirrored(channel, iteration) ? cycle - t : t;
}

/**
 * Eased progress (0 → 1) of element `index` at channel-local time `t`.
 * Overshooting easings (Back) are clamped so strokes never wrap the dash pattern.
 */
export function elementProgress(channel: ChannelConfig, index: number, t: number): number {
  if (!channel.enabled) return 1;
  const { start } = elementWindow(channel, index);
  const raw = channel.duration <= 0 ? (t >= start ? 1 : 0) : clamp01((t - start) / channel.duration);
  return clamp01(ease(channel.easing, raw));
}

/** Per-element render state at `timeMs`, aligned with `model.elements`. */
export function getFrameState(config: AnimatorConfig, model: SvgModel, timeMs: number): ElementFrame[] {
  const cycle = totalDuration(config, model);
  const ts = channelTime(config, config.stroke, timeMs, cycle);
  const tf = channelTime(config, config.fill, timeMs, cycle);

  return model.elements.map((el, i) => {
    let strokeDasharray = "none";
    let strokeDashoffset = 0;
    if (config.stroke.enabled && el.length > 0) {
      const dash = dashLength(el.length);
      strokeDasharray = `${dash} ${dash}`;
      strokeDashoffset = round(dash * (1 - elementProgress(config.stroke, i, ts)), 3);
    }
    const fillOpacity = config.fill.enabled
      ? round(el.fillOpacity * elementProgress(config.fill, i, tf), 4)
      : el.fillOpacity;
    return { strokeDasharray, strokeDashoffset, fillOpacity };
  });
}
