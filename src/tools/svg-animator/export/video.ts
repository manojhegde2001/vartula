import type { FrameRenderer } from "./render-frame";
import { ExportCancelledError, throwIfAborted } from "./support";

export interface EncodeJob {
  renderer: FrameRenderer;
  times: number[];
  fps: number;
  width: number;
  height: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export interface VideoResult {
  blob: Blob;
  /** Container actually produced (MediaRecorder fallback is always WebM). */
  container: "mp4" | "webm";
  method: "webcodecs" | "mediarecorder";
  codec: string;
  /** Transparency could not be kept. */
  droppedAlpha: boolean;
}

/**
 * Encode with WebCodecs through mediabunny. Returns null when no suitable codec
 * is available so the caller can fall back to MediaRecorder.
 */
export async function encodeWithWebCodecs(
  job: EncodeJob,
  container: "mp4" | "webm",
  transparent: boolean,
): Promise<VideoResult | null> {
  if (typeof VideoEncoder === "undefined") return null;
  const mb = await import("mediabunny");
  const format = container === "mp4" ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat();
  const preferred: import("mediabunny").VideoCodec[] = container === "mp4" ? ["avc", "vp9", "av1"] : ["vp9", "vp8", "av1"];
  const candidates = preferred.filter((c) => format.getSupportedVideoCodecs().includes(c));
  const codec = await mb.getFirstEncodableVideoCodec(candidates, { width: job.width, height: job.height });
  if (!codec) return null;

  const keepAlpha = transparent && container === "webm";
  const output = new mb.Output({ format, target: new mb.BufferTarget() });
  const source = new mb.CanvasSource(job.renderer.canvas, {
    codec,
    quality: mb.QUALITY_HIGH,
    alpha: keepAlpha ? "keep" : "discard",
  });
  output.addVideoTrack(source, { frameRate: job.fps });
  await output.start();

  try {
    const frameDuration = 1 / job.fps;
    for (let i = 0; i < job.times.length; i++) {
      throwIfAborted(job.signal);
      await job.renderer.render(job.times[i]);
      // Awaiting add() applies encoder backpressure, so frames are freed as they encode.
      await source.add(i * frameDuration, frameDuration);
      job.onProgress?.(i + 1, job.times.length);
    }
    source.close();
    await output.finalize();
  } catch (err) {
    await output.cancel().catch(() => {});
    throw err;
  }

  const buffer = (output.target as InstanceType<typeof mb.BufferTarget>).buffer;
  if (!buffer) throw new Error("The encoder produced no data.");
  return {
    blob: new Blob([buffer], { type: format.mimeType }),
    container,
    method: "webcodecs",
    codec,
    droppedAlpha: transparent && !keepAlpha,
  };
}

/**
 * Fallback: record WebM in real time from a canvas stream. Timing follows the
 * wall clock, so each frame is paced at 1/fps.
 */
export async function recordWithMediaRecorder(job: EncodeJob, transparent: boolean): Promise<VideoResult> {
  const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
  if (!mimeType) throw new Error("MediaRecorder cannot record WebM in this browser.");

  const canvas = document.createElement("canvas");
  canvas.width = job.width;
  canvas.height = job.height;
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

  const draw = async (t: number) => {
    await job.renderer.render(t);
    ctx.clearRect(0, 0, job.width, job.height);
    ctx.drawImage(job.renderer.canvas, 0, 0);
    track.requestFrame();
  };

  const frameMs = 1000 / job.fps;
  await draw(job.times[0]);
  recorder.start();
  let next = performance.now();
  try {
    for (let i = 0; i < job.times.length; i++) {
      throwIfAborted(job.signal);
      if (i > 0) await draw(job.times[i]);
      job.onProgress?.(i + 1, job.times.length);
      next += frameMs;
      await new Promise((r) => setTimeout(r, Math.max(0, next - performance.now())));
    }
  } finally {
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
  }
  if (job.signal?.aborted) throw new ExportCancelledError();

  return {
    blob: new Blob(chunks, { type: "video/webm" }),
    container: "webm",
    method: "mediarecorder",
    codec: mimeType.split("codecs=")[1] ?? "vp8",
    droppedAlpha: transparent,
  };
}
