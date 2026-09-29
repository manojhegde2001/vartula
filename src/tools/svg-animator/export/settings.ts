import { loopDuration } from "../engine";
import type { AnimatorConfig, SvgModel } from "../engine";

export type MediaFormat = "mp4" | "webm" | "gif" | "png";
export type ResolutionPreset = "720p" | "1080p" | "square" | "custom";
export type Fps = 24 | 30 | 60;

export const mediaFormats: { id: MediaFormat; label: string; hint: string; transparency: boolean; ext: string }[] = [
  { id: "mp4", label: "MP4", hint: "Best compatibility", transparency: false, ext: "mp4" },
  { id: "webm", label: "WebM", hint: "Smaller, supports alpha", transparency: true, ext: "webm" },
  { id: "gif", label: "GIF", hint: "Plays everywhere, 256 colors", transparency: true, ext: "gif" },
  { id: "png", label: "PNG sequence", hint: "Lossless frames in a .zip", transparency: true, ext: "zip" },
];

export const resolutionPresets: Record<Exclude<ResolutionPreset, "custom">, { label: string; width: number; height: number }> = {
  "720p": { label: "720p", width: 1280, height: 720 },
  "1080p": { label: "1080p", width: 1920, height: 1080 },
  square: { label: "Square", width: 1080, height: 1080 },
};

export const FPS_OPTIONS: Fps[] = [24, 30, 60];
export const MIN_SIZE = 16;
export const MAX_SIZE = 3840;

export interface MediaSettings {
  format: MediaFormat;
  width: number;
  height: number;
  fps: Fps;
  transparent: boolean;
  /** Solid background used when not transparent. */
  background: string;
  /** Extra time to hold the final frame (transitions only), in ms. */
  holdMs: number;
}

/** Clamp a custom size; video encoders need even dimensions. */
export function normalizeSize(width: number, height: number, even: boolean): { width: number; height: number } {
  const fix = (n: number) => {
    let v = Math.round(Math.min(Math.max(Number.isFinite(n) ? n : MIN_SIZE, MIN_SIZE), MAX_SIZE));
    if (even && v % 2) v -= 1;
    return v;
  };
  return { width: fix(width), height: fix(height) };
}

export function supportsTransparency(format: MediaFormat) {
  return mediaFormats.find((f) => f.id === format)!.transparency;
}

/**
 * Timestamps (ms) of every frame to render. Loops cover [0, loop) so the file
 * loops seamlessly; transitions include the final frame plus any hold.
 */
export function frameTimes(config: AnimatorConfig, model: SvgModel, fps: number, holdMs = 0): number[] {
  const duration = loopDuration(config, model);
  const step = 1000 / fps;
  const times: number[] = [];
  if (config.type === "animation" && duration > 0) {
    const count = Math.max(1, Math.round(duration / step));
    for (let i = 0; i < count; i++) times.push(i * step);
    return times;
  }
  const total = duration + Math.max(0, holdMs);
  const count = Math.floor(total / step + 1e-9) + 1;
  for (let i = 0; i < count; i++) times.push(Math.min(i * step, total));
  return times;
}

/**
 * Per-frame GIF delays in ms. GIF stores centiseconds and browsers slow down
 * delays under 20ms, so rates above 50fps drop frames (see gifFrameStride) and
 * rounding error is carried forward so the total length stays right.
 */
export function gifDelays(frameCount: number, fps: number): number[] {
  const frameMs = 1000 / fps;
  const delays: number[] = [];
  for (let i = 0; i < frameCount; i++) {
    const start = Math.round((i * frameMs) / 10) * 10;
    const end = Math.round(((i + 1) * frameMs) / 10) * 10;
    delays.push(Math.max(20, end - start));
  }
  return delays;
}

/** Use every Nth frame for GIFs so the frame rate stays at or below 50fps. */
export function gifFrameStride(fps: number) {
  return Math.ceil(fps / 50);
}

export function exportFilename(name: string, format: MediaFormat) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "animation";
  return `${base}.${mediaFormats.find((f) => f.id === format)!.ext}`;
}
