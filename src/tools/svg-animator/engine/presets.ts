import { defaultConfig, MAX_MS } from "./config";
import type { AnimatorConfig, ChannelConfig } from "./types";

/** A one-click starting point. Presets set timing only; the background is left alone. */
export interface Preset {
  id: string;
  name: string;
  hint: string;
  config: Omit<AnimatorConfig, "background">;
}

const off = (channel: ChannelConfig): ChannelConfig => ({ ...channel, enabled: false });

export const presets: Preset[] = [
  {
    id: "draw-fill",
    name: "Draw + fill",
    hint: "Outline, then color",
    config: { type: defaultConfig.type, stroke: defaultConfig.stroke, fill: defaultConfig.fill },
  },
  {
    id: "draw-only",
    name: "Draw only",
    hint: "Just the lines",
    config: {
      type: "transition",
      stroke: { enabled: true, duration: 2000, delay: 0, stagger: 80, easing: "easeInOutCubic", direction: "normal" },
      fill: off(defaultConfig.fill),
    },
  },
  {
    id: "quick",
    name: "Quick",
    hint: "Under a second",
    config: {
      type: "transition",
      stroke: { enabled: true, duration: 600, delay: 0, stagger: 20, easing: "easeOutCubic", direction: "normal" },
      fill: { enabled: true, duration: 300, delay: 500, stagger: 20, easing: "easeOutQuad", direction: "normal" },
    },
  },
  {
    id: "handwritten",
    name: "Handwritten",
    hint: "One shape at a time",
    config: {
      type: "transition",
      stroke: { enabled: true, duration: 900, delay: 0, stagger: 350, easing: "easeInOutSine", direction: "normal" },
      fill: { enabled: true, duration: 500, delay: 800, stagger: 350, easing: "easeOutQuad", direction: "normal" },
    },
  },
  {
    id: "slow",
    name: "Smooth",
    hint: "Slow, calm and elegant",
    config: {
      type: "transition",
      stroke: { enabled: true, duration: 3500, delay: 0, stagger: 150, easing: "easeInOutQuart", direction: "normal" },
      fill: { enabled: true, duration: 1500, delay: 3000, stagger: 150, easing: "easeInOutSine", direction: "normal" },
    },
  },
  {
    id: "pulse",
    name: "Pulse loop",
    hint: "Draws in and out",
    config: {
      type: "animation",
      stroke: { enabled: true, duration: 1600, delay: 0, stagger: 60, easing: "easeInOutSine", direction: "alternate" },
      fill: off(defaultConfig.fill),
    },
  },
];

export function applyPreset(config: AnimatorConfig, preset: Preset): AnimatorConfig {
  return { ...preset.config, background: config.background };
}

const sameChannel = (a: ChannelConfig, b: ChannelConfig) =>
  a.enabled === b.enabled &&
  // A disabled channel's timing has no effect, so it doesn't stop a match.
  (!a.enabled ||
    (a.duration === b.duration &&
      a.delay === b.delay &&
      a.stagger === b.stagger &&
      a.easing === b.easing &&
      a.direction === b.direction));

/** The preset this config was made from, or null once it has been customised. */
export function matchPreset(config: AnimatorConfig): Preset | null {
  return (
    presets.find(
      (p) => p.config.type === config.type && sameChannel(config.stroke, p.config.stroke) && sameChannel(config.fill, p.config.fill),
    ) ?? null
  );
}

const scaleMs = (ms: number, factor: number) => Math.min(Math.max(Math.round(ms * factor), 0), MAX_MS);

const scaleChannel = (c: ChannelConfig, factor: number): ChannelConfig => ({
  ...c,
  duration: Math.max(scaleMs(c.duration, factor), 1),
  delay: scaleMs(c.delay, factor),
  stagger: scaleMs(c.stagger, factor),
});

/** Multiply every duration, delay and stagger by `factor` (2 = twice as long). */
export function scaleTiming(config: AnimatorConfig, factor: number): AnimatorConfig {
  if (!Number.isFinite(factor) || factor <= 0) return config;
  return { ...config, stroke: scaleChannel(config.stroke, factor), fill: scaleChannel(config.fill, factor) };
}
