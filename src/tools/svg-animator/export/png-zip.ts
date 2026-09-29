import type { FrameRenderer } from "./render-frame";
import { throwIfAborted } from "./support";

export interface PngZipJob {
  renderer: FrameRenderer;
  times: number[];
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

/** Stream every frame as a PNG into a .zip with fflate (stored, since PNG is already compressed). */
export async function encodePngZip(job: PngZipJob): Promise<Blob> {
  const { Zip, ZipPassThrough } = await import("fflate");
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let failed: Error | null = null;
  let finished!: () => void;
  const done = new Promise<void>((resolve) => (finished = resolve));
  const zip = new Zip((err, chunk, final) => {
    if (err) failed = err;
    else parts.push(chunk as Uint8Array<ArrayBuffer>);
    if (final || err) finished();
  });

  const digits = String(job.times.length).length;
  try {
    for (let i = 0; i < job.times.length; i++) {
      throwIfAborted(job.signal);
      const canvas = await job.renderer.render(job.times[i]);
      const png = new Uint8Array(await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer());
      const file = new ZipPassThrough(`frame-${String(i + 1).padStart(Math.max(4, digits), "0")}.png`);
      zip.add(file);
      file.push(png, true);
      job.onProgress?.(i + 1, job.times.length);
    }
    zip.end();
  } catch (err) {
    zip.terminate();
    throw err;
  }
  await done;
  if (failed) throw failed;
  return new Blob(parts, { type: "application/zip" });
}
