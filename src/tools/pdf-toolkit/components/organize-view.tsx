"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, FileDown, LoaderCircle, RotateCcw, RotateCw, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { baseName } from "../engine";
import { usePdfStore } from "../store";
import { downloadPdf, ErrorText, PageThumb, Panel, sourcesOf, useJob } from "./parts";
import { cn } from "@/lib/utils";

/** Distinguishes pages from different files when several are loaded. */
const fileColors = ["bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-violet-500", "bg-lime-500"];

export function OrganizeView() {
  const files = usePdfStore((s) => s.files);
  const pages = usePdfStore((s) => s.pages);
  const movePage = usePdfStore((s) => s.movePage);
  const rotatePage = usePdfStore((s) => s.rotatePage);
  const rotateAll = usePdfStore((s) => s.rotateAll);
  const deletePage = usePdfStore((s) => s.deletePage);
  const resetPages = usePdfStore((s) => s.resetPages);
  const { busy, error, run } = useJob();
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const many = files.length > 1;
  const fileIndex = new Map(files.map((f, i) => [f.id, i]));

  const save = () =>
    run(async () => {
      const { assemble } = await import("../engine/pdf");
      const bytes = await assemble(
        sourcesOf(files),
        pages.map((p) => ({ fileId: p.fileId, index: p.index, rotation: p.rotation })),
      );
      downloadPdf(bytes, `${baseName(files[0].name)}-${many ? "combined" : "edited"}.pdf`);
    });

  return (
    <Panel
      title="Reorder, rotate and delete pages"
      aside={
        <div className="flex flex-wrap gap-1">
          <Button variant="outline" size="sm" onClick={() => rotateAll(-90)}>
            <RotateCcw /> All
          </Button>
          <Button variant="outline" size="sm" onClick={() => rotateAll(90)}>
            <RotateCw /> All
          </Button>
          <Button variant="ghost" size="sm" onClick={resetPages}>
            <Undo2 /> Reset
          </Button>
        </div>
      }
      footer={
        <>
          <ErrorText error={error} />
          <span className="text-sm text-muted-foreground tabular-nums">{pages.length} pages</span>
          <Button onClick={() => void save()} disabled={busy || pages.length === 0}>
            {busy ? <LoaderCircle className="animate-spin" /> : <FileDown />} Download PDF
          </Button>
        </>
      }
    >
      {many && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {files.map((f, i) => (
            <li key={f.id} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full", fileColors[i % fileColors.length])} aria-hidden /> {f.name}
            </li>
          ))}
        </ul>
      )}
      {pages.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">All pages were deleted. Press Reset to bring them back.</p>
      ) : (
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3" data-testid="page-grid">
          {pages.map((p, i) => (
            <li
              key={p.key}
              draggable
              onDragStart={(e) => {
                setDragFrom(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                setOver(i);
              }}
              onDrop={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                e.stopPropagation();
                movePage(dragFrom, i);
                setDragFrom(null);
                setOver(null);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setOver(null);
              }}
              className={cn(
                "group relative cursor-grab rounded-lg border bg-muted/40 transition-colors active:cursor-grabbing",
                dragFrom === i && "opacity-40",
                over === i && dragFrom !== i && "border-(--tone) bg-(--tone-soft) ring-2 ring-(--tone)",
              )}
            >
              <PageThumb fileId={p.fileId} index={p.index} rotation={p.rotation} />
              <div className="flex items-center gap-1 border-t px-1.5 py-1">
                {many && <span className={cn("size-2 shrink-0 rounded-full", fileColors[fileIndex.get(p.fileId)! % fileColors.length])} aria-hidden />}
                <span className="flex-1 text-xs font-medium tabular-nums">{i + 1}</span>
                <Button variant="ghost" size="icon-xs" aria-label={`Move page ${i + 1} earlier`} disabled={i === 0} onClick={() => movePage(i, i - 1)}>
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Move page ${i + 1} later`}
                  disabled={i === pages.length - 1}
                  onClick={() => movePage(i, i + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <Button variant="secondary" size="icon-xs" aria-label={`Rotate page ${i + 1} left`} onClick={() => rotatePage(p.key, -90)}>
                  <RotateCcw />
                </Button>
                <Button variant="secondary" size="icon-xs" aria-label={`Rotate page ${i + 1} right`} onClick={() => rotatePage(p.key, 90)}>
                  <RotateCw />
                </Button>
                <Button variant="secondary" size="icon-xs" aria-label={`Delete page ${i + 1}`} onClick={() => deletePage(p.key)}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
