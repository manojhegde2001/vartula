"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Combine, FilePlus, LayoutGrid, LoaderCircle, Minimize2, Scissors, Signature, Trash2, TriangleAlert, Upload, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryInfo } from "@/tools/registry";
import { MODES, usePdfStore, type Mode } from "../store";
import { CompressView } from "./compress-view";
import { MergeView } from "./merge-view";
import { OrganizeView } from "./organize-view";
import { SignView } from "./sign-view";
import { SplitView } from "./split-view";
import { cn } from "@/lib/utils";

const modeInfo: Record<Mode, { label: string; icon: LucideIcon; blurb: string }> = {
  merge: { label: "Merge", icon: Combine, blurb: "Combine several PDFs into one, in the order you choose." },
  split: { label: "Split", icon: Scissors, blurb: "Split a PDF into parts or extract the pages you need." },
  organize: { label: "Organize", icon: LayoutGrid, blurb: "Reorder, rotate and delete pages." },
  compress: { label: "Compress", icon: Minimize2, blurb: "Make PDFs smaller for email and upload limits." },
  sign: { label: "Sign", icon: Signature, blurb: "Draw, type or upload a signature and place it on the pages." },
};

const addFiles = (files: FileList | File[] | null | undefined) => {
  if (files && files.length) void usePdfStore.getState().addFiles(Array.from(files));
};

function ModeTabs() {
  const mode = usePdfStore((s) => s.mode);
  const setMode = usePdfStore((s) => s.setMode);
  return (
    <div role="tablist" aria-label="PDF tools" className="grid grid-cols-5 gap-1 rounded-xl border bg-card p-1">
      {MODES.map((m) => {
        const { label, icon: Icon } = modeInfo[m];
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              setMode(m);
              history.replaceState(null, "", `#${m}`);
            }}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-row sm:justify-center sm:gap-2 sm:text-sm",
              active ? "bg-(--tone) text-white shadow-sm" : "text-muted-foreground hover:bg-(--tone-soft) hover:text-foreground",
            )}
          >
            <Icon className="size-4.5 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function PdfToolkitEditor() {
  const mode = usePdfStore((s) => s.mode);
  const hasFiles = usePdfStore((s) => s.files.length > 0);
  const loading = usePdfStore((s) => s.loading);
  const error = usePdfStore((s) => s.error);
  const dismissError = usePdfStore((s) => s.dismissError);
  const clear = usePdfStore((s) => s.clear);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    // Deep links such as /tools/pdf-toolkit#sign open that tool.
    const fromHash = location.hash.slice(1) as Mode;
    if (MODES.includes(fromHash)) usePdfStore.getState().setMode(fromHash);
    // Files picked before hydration never fired React's onChange; add them now.
    const pending = inputRef.current?.files;
    if (pending?.length) {
      const files = Array.from(pending);
      inputRef.current!.value = "";
      queueMicrotask(() => addFiles(files));
    }
  }, []);

  const { label, blurb } = modeInfo[mode];
  const multiple = mode !== "sign" && mode !== "split";

  return (
    // .tone gives the editor the Document category accent (see globals.css).
    <div
      className="tone relative space-y-4"
      style={{ "--tone-h": categoryInfo.Document.hue } as CSSProperties}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        data-testid="pdf-file-input"
        type="file"
        multiple
        accept=".pdf,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <ModeTabs />

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <span className="flex-1">{error}</span>
          <button type="button" aria-label="Dismiss" onClick={dismissError}>
            <X className="size-4" />
          </button>
        </p>
      )}

      {hasFiles ? (
        <>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {loading > 0 && (
              <span className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" aria-hidden /> Reading {loading} {loading === 1 ? "file" : "files"}…
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <FilePlus /> Add PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={clear}>
              <Trash2 /> Clear all
            </Button>
          </div>
          {mode === "merge" && <MergeView />}
          {mode === "split" && <SplitView />}
          {mode === "organize" && <OrganizeView />}
          {mode === "compress" && <CompressView />}
          {mode === "sign" && <SignView />}
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-72 w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 text-center transition-colors outline-none hover:border-(--tone) hover:bg-(--tone-soft) focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-(--tone-soft) text-(--tone-fg)">
            {loading > 0 ? <LoaderCircle className="size-7 animate-spin" aria-hidden /> : <Upload className="size-7" aria-hidden />}
          </span>
          <span className="space-y-1">
            <span className="block text-lg font-medium">
              {label}: choose {multiple ? "PDF files" : "a PDF"} or drop {multiple ? "them" : "it"} here
            </span>
            <span className="block text-sm text-muted-foreground">{blurb} Files stay on your device.</span>
          </span>
        </button>
      )}

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-(--tone) bg-(--tone-soft)/90 text-lg font-medium text-(--tone-fg)">
          Drop PDFs to add them
        </div>
      )}
    </div>
  );
}
