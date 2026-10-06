/** Browser-only page rendering with pdf.js, loaded on first use. Documents and thumbnails are cached per file id. */
import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfJs = typeof import("pdfjs-dist");

let lib: Promise<PdfJs> | null = null;

function pdfjs(): Promise<PdfJs> {
  lib ??= import("pdfjs-dist").then((m) => {
    // The parser runs in a worker so big documents don't freeze the page.
    m.GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
    return m;
  });
  return lib;
}

type LoadingTask = ReturnType<PdfJs["getDocument"]>;

const tasks = new Map<string, Promise<LoadingTask>>();
const docs = new Map<string, Promise<PDFDocumentProxy>>();
const thumbs = new Map<string, Promise<string>>();

export function openDoc(id: string, bytes: Uint8Array): Promise<PDFDocumentProxy> {
  let doc = docs.get(id);
  if (!doc) {
    // pdf.js transfers the buffer to its worker, so hand it a copy.
    const task = pdfjs().then((m) => m.getDocument({ data: bytes.slice() }));
    tasks.set(id, task);
    doc = task.then((t) => t.promise);
    docs.set(id, doc);
  }
  return doc;
}

export function closeDoc(id: string) {
  void tasks.get(id)?.then((t) => t.destroy());
  tasks.delete(id);
  docs.delete(id);
  for (const [key, url] of thumbs) {
    if (key.startsWith(`${id}:`)) {
      void url.then((u) => URL.revokeObjectURL(u), () => {});
      thumbs.delete(key);
    }
  }
}

// Render a few pages at a time; pdf.js queues the rest anyway, but this keeps memory flat for long documents.
let active = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 3) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

/** Largest canvas we render into (about 16 megapixels), below every browser's limit. */
const MAX_PIXELS = 16_000_000;

export interface Rendered {
  blob: Blob;
  /** Displayed page size in points (rotation applied). */
  width: number;
  height: number;
}

/**
 * Render one page (0-based) to an image on a white background, either `width` pixels wide or at `dpi`
 * (page units are points, 1/72 inch).
 */
export async function renderPage(
  id: string,
  index: number,
  size: { width: number } | { dpi: number },
  type = "image/jpeg",
  quality = 0.85,
): Promise<Rendered> {
  const doc = await docs.get(id);
  if (!doc) throw new Error("The document is no longer open.");
  return slot(async () => {
    const page = await doc.getPage(index + 1);
    const base = page.getViewport({ scale: 1 });
    let scale = "dpi" in size ? size.dpi / 72 : size.width / base.width;
    if (base.width * base.height * scale * scale > MAX_PIXELS) scale = Math.sqrt(MAX_PIXELS / (base.width * base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    try {
      await page.render({ canvas, viewport, background: "#ffffff" }).promise;
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not render the page."))), type, quality),
      );
      return { blob, width: base.width, height: base.height };
    } finally {
      page.cleanup();
      canvas.width = canvas.height = 0;
    }
  });
}

/** Cached object URL of a page preview. */
export function thumbnail(id: string, index: number, pixelWidth: number): Promise<string> {
  const key = `${id}:${index}:${pixelWidth}`;
  let url = thumbs.get(key);
  if (!url) {
    url = renderPage(id, index, { width: pixelWidth }).then((r) => URL.createObjectURL(r.blob));
    url.catch(() => thumbs.delete(key));
    thumbs.set(key, url);
  }
  return url;
}

/** Displayed page sizes in points, for laying out the signing view before pages render. */
export async function pageSizes(id: string): Promise<{ width: number; height: number }[]> {
  const doc = await docs.get(id);
  if (!doc) return [];
  const sizes = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const vp = (await doc.getPage(i)).getViewport({ scale: 1 });
    sizes.push({ width: vp.width, height: vp.height });
  }
  return sizes;
}
