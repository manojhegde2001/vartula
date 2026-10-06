"use client";

import { create } from "zustand";
import { MAX_PDF_BYTES, type ViewBox } from "./engine";

export const MODES = ["merge", "split", "organize", "compress", "sign"] as const;
export type Mode = (typeof MODES)[number];

export interface PdfFile {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
  pageCount: number;
}

/** One page in the Organize view; `rotation` is added on top of the page's own. */
export interface PageItem {
  key: string;
  fileId: string;
  index: number;
  rotation: number;
}

export interface Signature {
  id: string;
  /** Object URL of the PNG, for display. */
  url: string;
  png: Uint8Array;
  /** Width / height. */
  aspect: number;
}

export interface Placement {
  id: string;
  sigId: string;
  pageIndex: number;
  box: ViewBox;
}

interface PdfState {
  mode: Mode;
  files: PdfFile[];
  pages: PageItem[];
  /** Number of files still being read. */
  loading: number;
  error: string | null;
  /** File used by Split and Sign. */
  targetId: string | null;
  signatures: Signature[];
  activeSigId: string | null;
  placements: Placement[];

  setMode: (mode: Mode) => void;
  addFiles: (files: Iterable<File>) => Promise<void>;
  removeFile: (id: string) => void;
  moveFile: (id: string, delta: number) => void;
  clear: () => void;
  setTarget: (id: string) => void;
  dismissError: () => void;

  movePage: (from: number, to: number) => void;
  rotatePage: (key: string, delta: number) => void;
  rotateAll: (delta: number) => void;
  deletePage: (key: string) => void;
  resetPages: () => void;

  addSignature: (sig: Omit<Signature, "id">) => void;
  removeSignature: (id: string) => void;
  setActiveSig: (id: string) => void;
  addPlacement: (p: Omit<Placement, "id">) => void;
  updatePlacement: (id: string, box: ViewBox) => void;
  removePlacement: (id: string) => void;
}

let nextId = 0;
const uid = (prefix: string) => `${prefix}-${++nextId}`;

const pagesOf = (f: PdfFile): PageItem[] =>
  Array.from({ length: f.pageCount }, (_, index) => ({ key: `${f.id}:${index}`, fileId: f.id, index, rotation: 0 }));

export const usePdfStore = create<PdfState>()((set, get) => ({
  mode: "merge",
  files: [],
  pages: [],
  loading: 0,
  error: null,
  targetId: null,
  signatures: [],
  activeSigId: null,
  placements: [],

  setMode: (mode) => set({ mode }),

  addFiles: async (input) => {
    const list = Array.from(input);
    if (list.length === 0) return;
    set((s) => ({ loading: s.loading + list.length, error: null }));
    const [{ countPages, PdfError }, { openDoc }] = await Promise.all([import("./engine/pdf"), import("./lib/render")]);
    const problems: string[] = [];
    for (const file of list) {
      try {
        if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") throw new Error("not a PDF file.");
        if (file.size > MAX_PDF_BYTES) throw new Error("larger than 200 MB.");
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pageCount = await countPages(bytes);
        const pdf: PdfFile = { id: uid("pdf"), name: file.name, size: file.size, bytes, pageCount };
        void openDoc(pdf.id, bytes);
        set((s) => ({
          files: [...s.files, pdf],
          pages: [...s.pages, ...pagesOf(pdf)],
          targetId: s.targetId ?? pdf.id,
        }));
      } catch (err) {
        const reason = err instanceof PdfError ? err.message : err instanceof Error ? err.message : "could not be read.";
        problems.push(`${file.name}: ${reason}`);
      } finally {
        set((s) => ({ loading: s.loading - 1 }));
      }
    }
    if (problems.length) set({ error: problems.join(" ") });
  },

  removeFile: (id) => {
    void import("./lib/render").then((m) => m.closeDoc(id));
    set((s) => {
      const files = s.files.filter((f) => f.id !== id);
      return {
        files,
        pages: s.pages.filter((p) => p.fileId !== id),
        targetId: s.targetId === id ? (files[0]?.id ?? null) : s.targetId,
        placements: s.targetId === id ? [] : s.placements,
      };
    });
  },

  moveFile: (id, delta) =>
    set((s) => {
      const from = s.files.findIndex((f) => f.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= s.files.length) return {};
      const files = [...s.files];
      const [f] = files.splice(from, 1);
      files.splice(to, 0, f);
      return { files };
    }),

  clear: () => {
    void import("./lib/render").then((m) => get().files.forEach((f) => m.closeDoc(f.id)));
    set({ files: [], pages: [], targetId: null, placements: [], error: null });
  },

  setTarget: (id) => set((s) => (s.targetId === id ? {} : { targetId: id, placements: [] })),
  dismissError: () => set({ error: null }),

  movePage: (from, to) =>
    set((s) => {
      if (from === to || to < 0 || to >= s.pages.length) return {};
      const pages = [...s.pages];
      const [p] = pages.splice(from, 1);
      pages.splice(to, 0, p);
      return { pages };
    }),
  rotatePage: (key, delta) => set((s) => ({ pages: s.pages.map((p) => (p.key === key ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p)) })),
  rotateAll: (delta) => set((s) => ({ pages: s.pages.map((p) => ({ ...p, rotation: (p.rotation + delta + 360) % 360 })) })),
  deletePage: (key) => set((s) => ({ pages: s.pages.filter((p) => p.key !== key) })),
  resetPages: () => set((s) => ({ pages: s.files.flatMap(pagesOf) })),

  addSignature: (sig) => {
    const id = uid("sig");
    set((s) => ({ signatures: [...s.signatures, { ...sig, id }], activeSigId: id }));
  },
  removeSignature: (id) =>
    set((s) => {
      const sig = s.signatures.find((x) => x.id === id);
      if (sig) URL.revokeObjectURL(sig.url);
      const signatures = s.signatures.filter((x) => x.id !== id);
      return {
        signatures,
        placements: s.placements.filter((p) => p.sigId !== id),
        activeSigId: s.activeSigId === id ? (signatures.at(-1)?.id ?? null) : s.activeSigId,
      };
    }),
  setActiveSig: (id) => set({ activeSigId: id }),
  addPlacement: (p) => set((s) => ({ placements: [...s.placements, { ...p, id: uid("place") }] })),
  updatePlacement: (id, box) => set((s) => ({ placements: s.placements.map((p) => (p.id === id ? { ...p, box } : p)) })),
  removePlacement: (id) => set((s) => ({ placements: s.placements.filter((p) => p.id !== id) })),
}));
