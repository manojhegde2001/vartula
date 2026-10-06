"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Download, ImageIcon, ImagePlus, LoaderCircle, Trash2, TriangleAlert, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadBlob, downloadZip } from "@/lib/download";
import { categoryInfo } from "@/tools/registry";
import { ACCEPT, formatBytes, formatInfo, outputName, uniqueNames } from "../engine";
import { useConverterStore, type ImageItem } from "../store";
import { SettingsPanel } from "./settings-panel";
import { cn } from "@/lib/utils";

const addFiles = (files: FileList | File[] | null | undefined) => {
  if (files && files.length) useConverterStore.getState().addFiles(Array.from(files));
};

function sourceType(file: File) {
  const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1];
  return (ext ?? file.type.replace("image/", "")).toUpperCase().replace("JPEG", "JPG");
}

function Change({ from, to }: { from: number; to: number }) {
  const pct = Math.round(((to - from) / from) * 100);
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        pct <= 0 ? "bg-(--tone-soft) text-(--tone-fg)" : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      )}
    >
      {pct <= 0 ? "−" : "+"}
      {Math.abs(pct)}%
    </span>
  );
}

function Row({ item }: { item: ImageItem }) {
  const remove = useConverterStore((s) => s.remove);
  const format = useConverterStore((s) => s.settings.format);
  const targetKb = useConverterStore((s) => s.settings.targetKb);
  const { result } = item;
  const busy = item.status === "pending" || item.status === "working";

  return (
    <li className="flex items-center gap-3 px-3 py-2.5" data-testid="image-row">
      <a
        href={result?.url}
        target="_blank"
        rel="noreferrer"
        aria-label={result ? `Open ${item.file.name} in a new tab` : undefined}
        className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-[repeating-conic-gradient(var(--muted)_0_25%,transparent_0_50%)] bg-size-[12px_12px]"
      >
        {result ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob URL
          <img src={result.url} alt="" className="size-full object-contain" />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/60">
            <LoaderCircle className="size-5 animate-spin text-(--tone-fg)" aria-label="Converting" />
          </span>
        )}
      </a>

      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium" title={item.file.name}>
          {result && !busy ? outputName(item.file.name, format) : item.file.name}
        </p>
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
          <span>
            {sourceType(item.file)} · {formatBytes(item.file.size)}
            {result && ` · ${result.srcWidth}×${result.srcHeight}`}
          </span>
          {result && (
            <>
              <ArrowRight className="size-3" aria-label="to" />
              <span className="text-foreground">
                {formatInfo[format].label} · {formatBytes(result.blob.size)} · {result.width}×{result.height}
              </span>
              <Change from={item.file.size} to={result.blob.size} />
            </>
          )}
        </p>
        {item.status === "error" && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden /> {item.error}
          </p>
        )}
        {item.status === "done" && result && !result.met && targetKb && (
          <p className="text-xs text-amber-700 dark:text-amber-400">Couldn&apos;t get under {targetKb} KB; this is the smallest version.</p>
        )}
      </div>

      <Button
        variant="outline"
        size="icon-sm"
        disabled={!result || busy}
        aria-label={`Download ${outputName(item.file.name, format)}`}
        onClick={() => result && downloadBlob(result.blob, outputName(item.file.name, format))}
      >
        <Download />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${item.file.name}`} onClick={() => remove(item.id)}>
        <X />
      </Button>
    </li>
  );
}

function Results() {
  const items = useConverterStore((s) => s.items);
  const format = useConverterStore((s) => s.settings.format);
  const clear = useConverterStore((s) => s.clear);
  const [zipping, setZipping] = useState(false);
  const done = items.filter((i) => i.status === "done" && i.result);
  const busy = items.some((i) => i.status === "pending" || i.status === "working");
  const before = done.reduce((n, i) => n + i.file.size, 0);
  const after = done.reduce((n, i) => n + i.result!.blob.size, 0);

  const downloadAll = async () => {
    if (done.length === 1) return downloadBlob(done[0].result!.blob, outputName(done[0].file.name, format));
    setZipping(true);
    try {
      const names = uniqueNames(done.map((i) => outputName(i.file.name, format)));
      await downloadZip(
        done.map((i, n) => ({ name: names[n], blob: i.result!.blob })),
        `vartula-images-${formatInfo[format].ext}.zip`,
      );
    } finally {
      setZipping(false);
    }
  };

  return (
    <section aria-label="Converted images" className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
        <div className="min-w-0 flex-1 text-sm">
          <span className="font-medium">
            {items.length} {items.length === 1 ? "image" : "images"}
          </span>
          {done.length > 0 && (
            <span className="ml-2 text-muted-foreground tabular-nums" data-testid="total-size">
              {formatBytes(before)} → {formatBytes(after)} <Change from={before} to={after} />
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={clear}>
          <Trash2 /> Clear
        </Button>
        <Button size="sm" disabled={busy || done.length === 0 || zipping} onClick={() => void downloadAll()}>
          {busy || zipping ? <LoaderCircle className="animate-spin" /> : <Download />}
          {done.length > 1 ? `Download all (${done.length})` : "Download"}
        </Button>
      </div>
      <ul className="divide-y">
        {items.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function DropZone({ compact, inputRef }: { compact: boolean; inputRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed text-center transition-colors outline-none hover:border-(--tone) hover:bg-(--tone-soft) focus-visible:ring-3 focus-visible:ring-ring/50",
        compact ? "p-3" : "min-h-72 flex-col p-8",
      )}
    >
      <span className={cn("flex items-center justify-center rounded-full bg-(--tone-soft) text-(--tone-fg)", compact ? "size-8" : "size-14")}>
        {compact ? <ImagePlus className="size-4" aria-hidden /> : <Upload className="size-7" aria-hidden />}
      </span>
      {compact ? (
        <span className="text-sm font-medium">Add more images</span>
      ) : (
        <span className="space-y-1">
          <span className="block text-lg font-medium">Choose images or drop them here</span>
          <span className="block text-sm text-muted-foreground">HEIC · JPG · PNG · WebP · AVIF · GIF · BMP · SVG — or paste with Ctrl+V</span>
        </span>
      )}
    </button>
  );
}

export function ImageConverterEditor() {
  const hasItems = useConverterStore((s) => s.items.length > 0);
  const notice = useConverterStore((s) => s.notice);
  const dismissNotice = useConverterStore((s) => s.dismissNotice);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    // Files picked before hydration never fired React's onChange; add them now.
    const pending = inputRef.current?.files;
    if (pending?.length) {
      const files = Array.from(pending);
      inputRef.current!.value = "";
      queueMicrotask(() => addFiles(files));
    }
    // Paste screenshots or copied images straight into the page.
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    // .tone gives the editor the Image category accent (see globals.css).
    <div
      className="tone relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]"
      style={{ "--tone-h": categoryInfo.Image.hue } as CSSProperties}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        data-testid="image-file-input"
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="min-w-0 space-y-3">
        {notice && (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
            <span className="flex-1">{notice}</span>
            <button type="button" aria-label="Dismiss" onClick={dismissNotice}>
              <X className="size-4" />
            </button>
          </p>
        )}
        {hasItems && <Results />}
        <DropZone compact={hasItems} inputRef={inputRef} />
      </div>

      <aside aria-label="Conversion settings" className="h-fit rounded-xl border bg-card p-4 lg:sticky lg:top-20">
        <SettingsPanel />
      </aside>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-(--tone) bg-(--tone-soft)/90 text-lg font-medium text-(--tone-fg)">
          Drop images to convert
        </div>
      )}
    </div>
  );
}
