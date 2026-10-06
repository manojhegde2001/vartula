/// <reference lib="webworker" />
/**
 * Generates records off the main thread, so a million rows don't freeze the page.
 * Output is built as a Blob from ~1 MB string pieces, which browsers can keep out of the JS heap.
 */
import { createWriter, formatInfo, writeAll } from "./engine/formats";
import { createRowGenerator } from "./engine/records";
import type { DataRequest, DataResponse } from "./lib/data-client";
import { loadFaker } from "./lib/faker";

const post = (msg: DataResponse) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg);

self.onmessage = async (e: MessageEvent<DataRequest>) => {
  const { id, kind, spec } = e.data;
  try {
    const f = await loadFaker(spec.locale);
    const next = createRowGenerator(f, spec.fields, spec.seed);

    if (kind === "preview") {
      const rows = Array.from({ length: Math.min(spec.count, 20) }, next);
      post({ id, type: "preview", rows, text: writeAll(spec.fields, spec.format, rows) });
      return;
    }

    const writer = createWriter(spec.fields, spec.format, spec.count);
    const pieces: Blob[] = [];
    let buffer = writer.start();
    let lastReport = 0;
    for (let i = 0; i < spec.count; i++) {
      buffer += writer.row(next(), i);
      if (buffer.length > 1 << 20) {
        pieces.push(new Blob([buffer]));
        buffer = "";
      }
      if (i - lastReport >= 2000) {
        lastReport = i;
        post({ id, type: "progress", done: i, total: spec.count });
      }
    }
    pieces.push(new Blob([buffer + writer.end()]));
    post({ id, type: "done", blob: new Blob(pieces, { type: `${formatInfo(spec.format.format).mime};charset=utf-8` }) });
  } catch (err) {
    post({ id, type: "error", message: err instanceof Error ? err.message : "Generation failed." });
  }
};
