/**
 * Save generated parts. Big files stream straight to disk with the File System Access API (Chromium);
 * elsewhere they are assembled into a Blob, which is capped so the tab doesn't run out of memory.
 */
import { downloadBlob } from "@/lib/download";
import { chunks, totalSize, type Part } from "../engine/files/parts";

/** Largest file assembled in memory when streaming to disk isn't available. */
export const BLOB_LIMIT = 500 * 1024 * 1024;
/** Above this, use the save dialog and stream even where Blobs would work, to keep memory flat. */
export const STREAM_THRESHOLD = 200 * 1024 * 1024;

type SavePicker = (options: { suggestedName: string }) => Promise<FileSystemFileHandle>;

export const canStream = () => typeof window !== "undefined" && "showSaveFilePicker" in window;

/** Yield to the event loop so progress can paint between chunks. */
const tick = () => new Promise((r) => setTimeout(r, 0));

export async function partsToBlob(parts: Part[], mime: string, onProgress?: (done: number) => void, signal?: AbortSignal): Promise<Blob> {
  const blobs: Blob[] = [];
  let done = 0;
  let n = 0;
  for (const c of chunks(parts)) {
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    blobs.push(new Blob([c as Uint8Array<ArrayBuffer>]));
    done += c.length;
    if (++n % 16 === 0) {
      onProgress?.(done);
      await tick();
    }
  }
  return new Blob(blobs, { type: mime });
}

/** Save parts as a file. Returns false if the user dismissed the save dialog. */
export async function saveParts(parts: Part[], name: string, mime: string, onProgress?: (done: number) => void, signal?: AbortSignal): Promise<boolean> {
  const size = totalSize(parts);
  if (size > STREAM_THRESHOLD && canStream()) {
    let handle: FileSystemFileHandle;
    try {
      handle = await (window as unknown as { showSaveFilePicker: SavePicker }).showSaveFilePicker({ suggestedName: name });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return false;
      throw err;
    }
    const stream = await handle.createWritable();
    let done = 0;
    try {
      for (const c of chunks(parts, 8 << 20)) {
        if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
        await stream.write(c as Uint8Array<ArrayBuffer>);
        done += c.length;
        onProgress?.(done);
      }
      await stream.close();
    } catch (err) {
      await stream.abort().catch(() => {});
      throw err;
    }
    return true;
  }
  if (size > BLOB_LIMIT) {
    throw new Error(`Files over ${BLOB_LIMIT / 1024 / 1024} MB need a browser that can save straight to disk (Chrome or Edge on a computer).`);
  }
  downloadBlob(await partsToBlob(parts, mime, onProgress, signal), name);
  return true;
}
