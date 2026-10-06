"use client";

import { useState } from "react";
import { ArrowRight, Download, FileDown, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadZip } from "@/lib/download";
import { baseName } from "../engine";
import { usePdfStore, type PdfFile } from "../store";
import { downloadPdf, ErrorText, formatBytes, Panel, Segmented, useJob } from "./parts";
import { cn } from "@/lib/utils";

type Level = "basic" | "strong";

interface Result {
  bytes: Uint8Array;
  /** False when the compressed file wasn't smaller, so the original is offered instead. */
  smaller: boolean;
}

const dpiOptions = [
  { value: "72", label: "72 dpi", title: "Smallest; fine for reading on screen" },
  { value: "110", label: "110 dpi", title: "Balanced" },
  { value: "150", label: "150 dpi", title: "Sharper; good for printing text" },
] as const;

async function compressFile(
  file: PdfFile,
  level: Level,
  dpi: number,
  quality: number,
  onPage: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const pdf = await import("../engine/pdf");
  if (level === "basic") return pdf.restructure(file.bytes);
  const { renderPage } = await import("../lib/render");
  const images = [];
  for (let i = 0; i < file.pageCount; i++) {
    onPage(i, file.pageCount);
    const r = await renderPage(file.id, i, { dpi }, "image/jpeg", quality);
    images.push({ jpeg: new Uint8Array(await r.blob.arrayBuffer()), width: r.width, height: r.height });
  }
  onPage(file.pageCount, file.pageCount);
  const src = await pdf.loadPdf(file.bytes);
  return pdf.fromImages(images, src.getTitle());
}

export function CompressView() {
  const files = usePdfStore((s) => s.files);
  const [level, setLevel] = useState<Level>("basic");
  const [dpi, setDpi] = useState<(typeof dpiOptions)[number]["value"]>("110");
  const [quality, setQuality] = useState(70);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [progress, setProgress] = useState<string | null>(null);
  const { busy, error, run } = useJob();

  const nameOf = (f: PdfFile) => `${baseName(f.name)}-compressed.pdf`;
  const done = files.filter((f) => results[f.id]);

  const compress = () =>
    run(async () => {
      setResults({});
      try {
        for (const [n, f] of files.entries()) {
          const bytes = await compressFile(f, level, Number(dpi), quality / 100, (page, total) =>
            setProgress(`${files.length > 1 ? `File ${n + 1} of ${files.length}, ` : ""}page ${Math.min(page + 1, total)} of ${total}`),
          );
          const smaller = bytes.length < f.size;
          setResults((r) => ({ ...r, [f.id]: { bytes: smaller ? bytes : f.bytes, smaller } }));
        }
      } finally {
        setProgress(null);
      }
    });

  const downloadAll = () =>
    run(async () => {
      if (done.length === 1) return downloadPdf(results[done[0].id].bytes, nameOf(done[0]));
      await downloadZip(
        done.map((f) => ({ name: nameOf(f), blob: new Blob([results[f.id].bytes as Uint8Array<ArrayBuffer>]) })),
        "compressed-pdfs.zip",
      );
    });

  const before = done.reduce((n, f) => n + f.size, 0);
  const after = done.reduce((n, f) => n + results[f.id].bytes.length, 0);

  return (
    <Panel
      title="Compress PDF"
      footer={
        <>
          <ErrorText error={error} />
          {progress && <span className="mr-auto text-sm text-muted-foreground tabular-nums">{progress}…</span>}
          {done.length > 0 && !busy && (
            <span className="text-sm text-muted-foreground tabular-nums" data-testid="compress-total">
              {formatBytes(before)} → {formatBytes(after)} (−{Math.max(0, Math.round((1 - after / before) * 100))}%)
            </span>
          )}
          {done.length > 0 && done.length === files.length && !busy ? (
            <Button onClick={() => void downloadAll()}>
              <Download /> {done.length > 1 ? `Download all (${done.length})` : "Download"}
            </Button>
          ) : (
            <Button onClick={() => void compress()} disabled={busy || files.length === 0}>
              {busy ? <LoaderCircle className="animate-spin" /> : <FileDown />} Compress {files.length > 1 ? `${files.length} PDFs` : "PDF"}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Compression level">
        {(
          [
            ["basic", "Basic", "Keeps text sharp and selectable. Removes unused data and packs the file structure. Best for documents made on a computer."],
            ["strong", "Strong", "Turns every page into a compressed image. Shrinks scans and photo-heavy PDFs the most, but text can no longer be selected or searched."],
          ] as const
        ).map(([value, label, description]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={level === value}
            onClick={() => {
              setLevel(value);
              setResults({});
            }}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              level === value ? "border-(--tone) bg-(--tone-soft) ring-1 ring-(--tone)" : "hover:border-(--tone-muted)",
            )}
          >
            <span className="block font-medium">{label}</span>
            <span className="block text-sm text-muted-foreground">{description}</span>
          </button>
        ))}
      </div>

      {level === "strong" && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <span className="text-sm font-medium">Resolution</span>
            <Segmented
              label="Resolution"
              value={dpi}
              onChange={(v) => {
                setDpi(v);
                setResults({});
              }}
              options={[...dpiOptions]}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="pdf-quality" className="flex justify-between text-sm font-medium">
              Image quality <span className="font-normal text-muted-foreground tabular-nums">{quality}%</span>
            </label>
            <input
              id="pdf-quality"
              type="range"
              min={20}
              max={95}
              value={quality}
              onChange={(e) => {
                setQuality(Number(e.target.value));
                setResults({});
              }}
              className="w-full accent-(--tone)"
            />
          </div>
        </div>
      )}

      <ul className="mt-4 divide-y rounded-lg border">
        {files.map((f) => {
          const r = results[f.id];
          return (
            <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium" title={f.name}>
                {f.name}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground tabular-nums">
                {formatBytes(f.size)}
                {r && (
                  <>
                    <ArrowRight className="size-3" aria-label="to" />
                    <span className="text-foreground">{formatBytes(r.bytes.length)}</span>
                    {r.smaller ? (
                      <span className="rounded-full bg-(--tone-soft) px-1.5 text-xs font-medium text-(--tone-fg)">
                        −{Math.round((1 - r.bytes.length / f.size) * 100)}%
                      </span>
                    ) : (
                      <span className="text-xs">already optimized, original kept</span>
                    )}
                  </>
                )}
              </span>
              {r && (
                <Button variant="outline" size="icon-sm" aria-label={`Download ${nameOf(f)}`} onClick={() => downloadPdf(r.bytes, nameOf(f))}>
                  <Download />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
