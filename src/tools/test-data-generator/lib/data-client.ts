/** Talks to worker.ts: one long-lived worker for previews, a fresh one per download so it can be cancelled. */
import type { Row } from "../engine/fields";
import type { FormatOptions } from "../engine/formats";
import type { LocaleId } from "../engine/locales";
import type { FieldSpec } from "../engine/records";

export interface DataSpec {
  fields: FieldSpec[];
  count: number;
  format: FormatOptions;
  locale: LocaleId;
  seed: number;
}

export interface DataRequest {
  id: number;
  kind: "preview" | "generate";
  spec: DataSpec;
}

export type DataResponse =
  | { id: number; type: "preview"; rows: Row[]; text: string }
  | { id: number; type: "progress"; done: number; total: number }
  | { id: number; type: "done"; blob: Blob }
  | { id: number; type: "error"; message: string };

const spawn = () => new Worker(new URL("../worker.ts", import.meta.url), { type: "module" });

let previewWorker: Worker | null = null;
let nextId = 0;

export function preview(spec: DataSpec): Promise<{ rows: Row[]; text: string }> {
  previewWorker ??= spawn();
  const worker = previewWorker;
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent<DataResponse>) => {
      const msg = e.data;
      if (msg.id !== id) return;
      worker.removeEventListener("message", onMessage);
      if (msg.type === "preview") resolve({ rows: msg.rows, text: msg.text });
      else if (msg.type === "error") reject(new Error(msg.message));
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, kind: "preview", spec } satisfies DataRequest);
  });
}

export function generate(spec: DataSpec, onProgress: (done: number, total: number) => void, signal: AbortSignal): Promise<Blob> {
  const worker = spawn();
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const stop = () => {
      worker.terminate();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    signal.addEventListener("abort", stop, { once: true });
    worker.onmessage = (e: MessageEvent<DataResponse>) => {
      const msg = e.data;
      if (msg.type === "progress") return onProgress(msg.done, msg.total);
      signal.removeEventListener("abort", stop);
      worker.terminate();
      if (msg.type === "done") resolve(msg.blob);
      else if (msg.type === "error") reject(new Error(msg.message));
    };
    worker.onerror = (e) => {
      signal.removeEventListener("abort", stop);
      worker.terminate();
      reject(new Error(e.message || "The generator stopped unexpectedly."));
    };
    worker.postMessage({ id, kind: "generate", spec } satisfies DataRequest);
  });
}
