"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { downloadBlob } from "@/lib/download";
import { usePdfStore } from "../store";
import { cn } from "@/lib/utils";

/** Native <select> styled like components/ui/select. */
export const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

/** Pixel width pages are rendered at for grid thumbnails (shown at about half that, for sharp HiDPI). */
export const THUMB_PX = 280;

export function downloadPdf(bytes: Uint8Array, name: string) {
  downloadBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), name);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(bytes < 10_000 ? 1 : 0)} KB`;
  return `${(bytes / 1_000_000).toFixed(bytes < 10_000_000 ? 2 : 1)} MB`;
}

/** Pill-style radio group for short choices. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex gap-1 rounded-lg bg-muted p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 truncate rounded-md px-2 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&_svg]:size-3.5 [&_svg]:shrink-0",
            value === o.value ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A page preview that renders when it scrolls into view. Extra rotation is applied with CSS. */
export function PageThumb({
  fileId,
  index,
  rotation = 0,
  pixelWidth = THUMB_PX,
  className,
}: {
  fileId: string;
  index: number;
  rotation?: number;
  pixelWidth?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);
  const key = `${fileId}:${index}:${pixelWidth}`;
  const url = loaded?.key === key ? loaded.url : null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let live = true;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        void import("../lib/render")
          .then((m) => m.thumbnail(fileId, index, pixelWidth))
          .then((u) => live && setLoaded({ key, url: u }))
          .catch(() => {});
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [fileId, index, pixelWidth, key]);

  return (
    <div ref={ref} className={cn("flex aspect-square items-center justify-center overflow-hidden p-2", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- local blob URL
        <img
          src={url}
          alt={`Page ${index + 1}`}
          draggable={false}
          style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
          className="max-h-full max-w-full bg-white object-contain shadow-sm ring-1 ring-black/10 transition-transform"
        />
      ) : (
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-label="Loading page" />
      )}
    </div>
  );
}

/** Picks the document used by Split and Sign when several are loaded. */
export function TargetPicker() {
  const files = usePdfStore((s) => s.files);
  const targetId = usePdfStore((s) => s.targetId);
  const setTarget = usePdfStore((s) => s.setTarget);
  if (files.length < 2) return null;
  return (
    <label className="flex w-full min-w-0 items-center gap-2 text-sm sm:w-auto">
      <span className="shrink-0 text-muted-foreground">Document</span>
      <select className={selectClassName} value={targetId ?? ""} onChange={(e) => setTarget(e.target.value)}>
        {files.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} ({f.pageCount} {f.pageCount === 1 ? "page" : "pages"})
          </option>
        ))}
      </select>
    </label>
  );
}

/** Card wrapping one mode: title row, body and an action bar at the bottom. */
export function Panel({ title, aside, children, footer }: { title: string; aside?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <h2 className="min-w-0 flex-1 text-lg font-semibold tracking-tight">{title}</h2>
        {aside}
      </div>
      <div className="p-4">{children}</div>
      {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3">{footer}</div>}
    </section>
  );
}

/** Run an async job with busy state and a readable error. */
export function useJob() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await job();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="mr-auto text-sm text-destructive">
      {error}
    </p>
  );
}

export function sourcesOf(files: { id: string; bytes: Uint8Array }[]): Record<string, Uint8Array> {
  return Object.fromEntries(files.map((f) => [f.id, f.bytes]));
}
