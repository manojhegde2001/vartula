import type { FrameRenderer } from "./render-frame";
import { gifDelays, gifFrameStride } from "./settings";
import { throwIfAborted, yieldToBrowser } from "./support";

export interface GifJob {
  renderer: FrameRenderer;
  times: number[];
  fps: number;
  width: number;
  height: number;
  transparent: boolean;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

/** Encode frames as a looping GIF with gifenc (per-frame 256-color palettes). */
export async function encodeGif(job: GifJob): Promise<Blob> {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const stride = gifFrameStride(job.fps);
  const times = job.times.filter((_, i) => i % stride === 0);
  const delays = gifDelays(times.length, job.fps / stride);
  const format = job.transparent ? "rgba4444" : "rgb565";
  const gif = GIFEncoder();

  for (let i = 0; i < times.length; i++) {
    throwIfAborted(job.signal);
    await job.renderer.render(times[i]);
    const { data } = job.renderer.context.getImageData(0, 0, job.width, job.height);
    const palette = quantize(data, 256, { format, oneBitAlpha: job.transparent, clearAlpha: job.transparent });
    const index = applyPalette(data, palette, format);
    const transparentIndex = job.transparent ? palette.findIndex((c) => c[3] === 0) : -1;
    gif.writeFrame(index, job.width, job.height, {
      palette,
      delay: delays[i],
      repeat: 0,
      transparent: transparentIndex >= 0,
      transparentIndex: Math.max(0, transparentIndex),
      // Clear each frame so transparent pixels don't show the previous frame.
      dispose: job.transparent ? 2 : -1,
    });
    job.onProgress?.(i + 1, times.length);
    await yieldToBrowser();
  }
  gif.finish();
  return new Blob([gif.bytesView() as Uint8Array<ArrayBuffer>], { type: "image/gif" });
}
