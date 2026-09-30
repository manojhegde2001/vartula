import { isEasingName } from "./easing";
import type { AnimationType, AnimatorConfig, ChannelConfig, Direction } from "./types";

export const DIRECTIONS: readonly Direction[] = ["normal", "reverse", "alternate", "alternate-reverse"];
export const ANIMATION_TYPES: readonly AnimationType[] = ["transition", "animation"];

export const defaultConfig: AnimatorConfig = {
  type: "transition",
  stroke: { enabled: true, duration: 1500, delay: 0, stagger: 50, easing: "easeInOutCubic", direction: "normal" },
  fill: { enabled: true, duration: 700, delay: 1200, stagger: 50, easing: "easeOutQuad", direction: "normal" },
  background: "#ffffff",
};

/** Upper bound for any single timing value (10 minutes), to keep exports sane. */
export const MAX_MS = 600_000;

function clampMs(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 0), MAX_MS) : fallback;
}

function normalizeChannel(input: unknown, fallback: ChannelConfig): ChannelConfig {
  const c = (input && typeof input === "object" ? input : {}) as Partial<Record<keyof ChannelConfig, unknown>>;
  return {
    enabled: typeof c.enabled === "boolean" ? c.enabled : fallback.enabled,
    duration: clampMs(c.duration, fallback.duration),
    delay: clampMs(c.delay, fallback.delay),
    stagger: clampMs(c.stagger, fallback.stagger),
    easing: isEasingName(c.easing) ? c.easing : fallback.easing,
    direction: DIRECTIONS.includes(c.direction as Direction) ? (c.direction as Direction) : fallback.direction,
  };
}

/** Colors we accept from untrusted input; they end up in exported CSS. */
const SAFE_COLOR = /^(transparent|#[0-9a-f]{3,8}|[a-z]{3,20}|(rgb|hsl)a?\([\d\s.,%/+-]+\))$/i;

export function isSafeColor(value: string) {
  return SAFE_COLOR.test(value.trim());
}

/** Coerce untrusted input (URL hash, storage) into a valid config. */
export function normalizeConfig(input: unknown, fallback: AnimatorConfig = defaultConfig): AnimatorConfig {
  const c = (input && typeof input === "object" ? input : {}) as Partial<Record<keyof AnimatorConfig, unknown>>;
  return {
    type: ANIMATION_TYPES.includes(c.type as AnimationType) ? (c.type as AnimationType) : fallback.type,
    stroke: normalizeChannel(c.stroke, fallback.stroke),
    fill: normalizeChannel(c.fill, fallback.fill),
    background: typeof c.background === "string" && isSafeColor(c.background) ? c.background.trim() : fallback.background,
  };
}
