"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, FileDown, GripVertical, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { baseName } from "../engine";
import { usePdfStore } from "../store";
import { downloadPdf, ErrorText, formatBytes, PageThumb, Panel, sourcesOf, useJob } from "./parts";
import { cn } from "@/lib/utils";

export function MergeView() {
  const files = usePdfStore((s) => s.files);
  const moveFile = usePdfStore((s) => s.moveFile);
  const removeFile = usePdfStore((s) => s.removeFile);
  const { busy, error, run } = useJob();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const totalPages = files.reduce((n, f) => n + f.pageCount, 0);

  const merge = () =>
    run(async () => {
      const { assemble } = await import("../engine/pdf");
      const pages = files.flatMap((f) => Array.from({ length: f.pageCount }, (_, index) => ({ fileId: f.id, index })));
      downloadPdf(await assemble(sourcesOf(files), pages), `${baseName(files[0].name)}-merged.pdf`);
    });

  return (
    <Panel
      title="Merge PDFs"
      aside={<span className="text-sm text-muted-foreground">Drag files to change the order</span>}
      footer={
        <>
          <ErrorText error={error} />
          {files.length < 2 && <span className="mr-auto text-sm text-muted-foreground">Add at least two PDFs to merge.</span>}
          <span className="text-sm text-muted-foreground tabular-nums">
            {files.length} files · {totalPages} pages
          </span>
          <Button onClick={() => void merge()} disabled={busy || files.length < 2}>
            {busy ? <LoaderCircle className="animate-spin" /> : <FileDown />} Merge and download
          </Button>
        </>
      }
    >
      <ol className="space-y-2">
        {files.map((f, i) => (
          <li
            key={f.id}
            draggable
            onDragStart={(e) => {
              setDragId(f.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              setOverId(f.id);
            }}
            onDrop={(e) => {
              if (!dragId) return;
              e.preventDefault();
              e.stopPropagation();
              const from = files.findIndex((x) => x.id === dragId);
              moveFile(dragId, i - from);
              setDragId(null);
              setOverId(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-background p-2 transition-colors",
              dragId === f.id && "opacity-50",
              overId === f.id && dragId !== f.id && "border-(--tone) bg-(--tone-soft)",
            )}
          >
            <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
            <span className="w-5 shrink-0 text-center text-sm font-medium text-muted-foreground tabular-nums">{i + 1}</span>
            <PageThumb fileId={f.id} index={0} pixelWidth={120} className="size-14 shrink-0 rounded-md bg-muted p-1" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={f.name}>
                {f.name}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {f.pageCount} {f.pageCount === 1 ? "page" : "pages"} · {formatBytes(f.size)}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label={`Move ${f.name} up`} disabled={i === 0} onClick={() => moveFile(f.id, -1)}>
              <ArrowUp />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Move ${f.name} down`} disabled={i === files.length - 1} onClick={() => moveFile(f.id, 1)}>
              <ArrowDown />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Remove ${f.name}`} onClick={() => removeFile(f.id)}>
              <X />
            </Button>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
