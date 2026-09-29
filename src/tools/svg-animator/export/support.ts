/** Browser feature detection for media export. */

export interface MediaSupport {
  /** Frame rendering (required for every format). */
  offscreenCanvas: boolean;
  /** WebCodecs VideoEncoder (MP4/WebM via mediabunny). */
  webCodecs: boolean;
  /** MediaRecorder WebM from a canvas stream (real-time fallback). */
  mediaRecorderWebm: boolean;
}

export function detectMediaSupport(): MediaSupport {
  if (typeof window === "undefined") return { offscreenCanvas: false, webCodecs: false, mediaRecorderWebm: false };
  const offscreenCanvas =
    typeof OffscreenCanvas !== "undefined" && typeof OffscreenCanvas.prototype.getContext === "function";
  const webCodecs = typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined";
  const mediaRecorderWebm =
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].some((t) => MediaRecorder.isTypeSupported(t));
  return { offscreenCanvas, webCodecs, mediaRecorderWebm };
}

export const UNSUPPORTED_MESSAGE =
  "Your browser can't render animation frames (OffscreenCanvas is missing). Please use a current version of Chrome, Edge, Firefox or Safari.";

export const NO_VIDEO_MESSAGE =
  "Your browser can't encode video (no WebCodecs or MediaRecorder). Export a GIF or PNG sequence instead, or use a current version of Chrome, Edge, Firefox or Safari.";

export class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled.");
    this.name = "ExportCancelledError";
  }
}

export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new ExportCancelledError();
}

/** Let the browser paint progress between heavy synchronous steps. */
export const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
