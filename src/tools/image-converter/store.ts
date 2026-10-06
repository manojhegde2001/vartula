"use client";

import { create } from "zustand";
import { defaultSettings, MAX_IMAGE_BYTES, type ConvertSettings, type ResizeSettings } from "./engine";
import type { Converted } from "./lib/process";

export interface ImageItem {
  id: string;
  file: File;
  status: "pending" | "working" | "done" | "error";
  error?: string;
  /** Latest output; kept while a re-conversion runs so the row doesn't flicker. */
  result?: Converted & { url: string };
}

interface ConverterState {
  items: ImageItem[];
  settings: ConvertSettings;
  /** Message about files that were skipped when added. */
  notice: string | null;
  addFiles: (files: Iterable<File>) => void;
  remove: (id: string) => void;
  clear: () => void;
  update: (patch: Partial<ConvertSettings>) => void;
  updateResize: (patch: Partial<ResizeSettings>) => void;
  dismissNotice: () => void;
}

let nextId = 0;

export const useConverterStore = create<ConverterState>()((set, get) => ({
  items: [],
  settings: defaultSettings,
  notice: null,

  addFiles: (files) => {
    const added: ImageItem[] = [];
    const skipped: string[] = [];
    for (const file of files) {
      const imageLike = file.type.startsWith("image/") || /\.(hei[cf]|avif|webp|jpe?g|png|gif|bmp|svg|ico|tiff?)$/i.test(file.name);
      if (!imageLike || file.size > MAX_IMAGE_BYTES) skipped.push(file.name);
      else added.push({ id: `img-${++nextId}`, file, status: "pending" });
    }
    set((s) => ({
      items: [...s.items, ...added],
      notice: skipped.length ? `Skipped ${skipped.join(", ")}: not an image, or larger than 80 MB.` : null,
    }));
    schedule(0);
  },

  remove: (id) => {
    const item = get().items.find((i) => i.id === id);
    if (item?.result) URL.revokeObjectURL(item.result.url);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  clear: () => {
    for (const item of get().items) if (item.result) URL.revokeObjectURL(item.result.url);
    generation++;
    set({ items: [], notice: null });
  },

  update: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    reconvertAll();
  },

  updateResize: (patch) => {
    set((s) => ({ settings: { ...s.settings, resize: { ...s.settings.resize, ...patch } } }));
    reconvertAll();
  },

  dismissNotice: () => set({ notice: null }),
}));

/*
 * Conversion queue. One image at a time keeps memory bounded for big batches.
 * A settings change bumps `generation`, which cancels the image in progress and re-queues every image
 * after a short pause, so dragging a slider doesn't start dozens of conversions.
 */
let generation = 0;
let running = false;
let resumeAt = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

function schedule(delay: number) {
  clearTimeout(timer);
  timer = setTimeout(() => void pump(), delay);
}

function reconvertAll() {
  generation++;
  resumeAt = Date.now() + 350;
  useConverterStore.setState((s) => ({ items: s.items.map((i) => ({ ...i, status: "pending", error: undefined })) }));
  schedule(350);
}

function patchItem(id: string, patch: Partial<ImageItem>) {
  useConverterStore.setState((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
}

async function pump() {
  if (running) return;
  running = true;
  const { convertImage, CancelledError } = await import("./lib/process");
  try {
    for (;;) {
      if (Date.now() < resumeAt) {
        schedule(resumeAt - Date.now());
        break;
      }
      const { items, settings } = useConverterStore.getState();
      const item = items.find((i) => i.status === "pending");
      if (!item) break;
      const gen = generation;
      const stale = () => gen !== generation || !useConverterStore.getState().items.some((i) => i.id === item.id);
      patchItem(item.id, { status: "working" });
      try {
        const result = await convertImage(item.file, settings, stale);
        if (stale()) continue;
        const previous = useConverterStore.getState().items.find((i) => i.id === item.id)?.result;
        if (previous) URL.revokeObjectURL(previous.url);
        patchItem(item.id, { status: "done", result: { ...result, url: URL.createObjectURL(result.blob) } });
      } catch (err) {
        if (err instanceof CancelledError || stale()) continue;
        patchItem(item.id, { status: "error", error: err instanceof Error ? err.message : "Conversion failed." });
      }
    }
  } finally {
    running = false;
  }
}
