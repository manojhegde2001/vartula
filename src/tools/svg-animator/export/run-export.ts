/**
 * Entry point for media export, loaded on demand. Renders frames with the
 * engine (via renderFrame) and hands them to the chosen encoder.
 */
import type { AnimatorConfig, SvgModel } from "../engine";
import { encodeGif } from "./gif";
import { encodePngZip } from "./png-zip";
import { createFrameRenderer } from "./render-frame";
import { frameTimes, supportsTransparency, type MediaSettings } from "./settings";
import { detectMediaSupport, NO_VIDEO_MESSAGE, UNSUPPORTED_MESSAGE } from "./support";
import { encodeWithWebCodecs, recordWithMediaRecorder } from "./video";

export interface MediaExportResult {
  blob: Blob;
  extension: string;
  /** Anything the user should know about how the file was produced. */
  notes: string[];
}

export interface MediaExportCallbacks {
  signal?: AbortSignal;
  onProgress?: (done: number, total: number, phase: "rendering" | "finishing") => void;
}

export async function runMediaExport(
  source: { markup: string; model: SvgModel },
  baseConfig: AnimatorConfig,
  settings: MediaSettings,
  { signal, onProgress }: MediaExportCallbacks = {},
): Promise<MediaExportResult> {
  const support = detectMediaSupport();
  if (!support.offscreenCanvas) throw new Error(UNSUPPORTED_MESSAGE);

  const transparent = settings.transparent && supportsTransparency(settings.format);
  const config: AnimatorConfig = { ...baseConfig, background: transparent ? "transparent" : settings.background };
  const { width, height, fps } = settings;
  const times = frameTimes(config, source.model, fps, config.type === "transition" ? settings.holdMs : 0);
  const renderer = createFrameRenderer(source.markup, config, source.model, width, height, {
    willReadFrequently: settings.format === "gif",
  });
  const progress = (done: number, total: number) => onProgress?.(done, total, done === total ? "finishing" : "rendering");
  const notes: string[] = [];

  switch (settings.format) {
    case "gif":
      return { blob: await encodeGif({ renderer, times, fps, width, height, transparent, signal, onProgress: progress }), extension: "gif", notes };
    case "png":
      return { blob: await encodePngZip({ renderer, times, signal, onProgress: progress }), extension: "zip", notes };
    case "mp4":
    case "webm": {
      const job = { renderer, times, fps, width, height, signal, onProgress: progress };
      let result = support.webCodecs ? await encodeWithWebCodecs(job, settings.format, transparent) : null;
      if (!result) {
        if (!support.mediaRecorderWebm) throw new Error(NO_VIDEO_MESSAGE);
        result = await recordWithMediaRecorder(job, transparent);
        notes.push("WebCodecs isn't available here, so the video was recorded in real time as WebM.");
      }
      if (result.container !== settings.format) notes.push(`Saved as ${result.container.toUpperCase()} because this browser can't encode ${settings.format.toUpperCase()}.`);
      if (result.droppedAlpha) notes.push("This browser couldn't keep transparency, so the background is opaque.");
      return { blob: result.blob, extension: result.container, notes };
    }
  }
}
