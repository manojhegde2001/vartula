"use client";

import { useState } from "react";
import { Check, FileDown, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadZip } from "@/lib/download";
import { baseName, formatPages, parseRanges, partName, splitEvery } from "../engine";
import { usePdfStore } from "../store";
import { downloadPdf, ErrorText, PageThumb, Panel, Segmented, TargetPicker, useJob } from "./parts";
import { cn } from "@/lib/utils";

type Method = "each" | "every" | "ranges" | "pick";

/** Repeating colours that show which output file each page goes to. */
const groupColors = ["bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-violet-500", "bg-teal-500"];

export function SplitView() {
  const file = usePdfStore((s) => s.files.find((f) => f.id === s.targetId) ?? null);
  const [method, setMethod] = useState<Method>("ranges");
  const [every, setEvery] = useState(2);
  const [ranges, setRanges] = useState("");
  const [picked, setPicked] = useState<{ fileId: string; pages: Set<number> }>({ fileId: "", pages: new Set() });
  const { busy, error, run } = useJob();
  const pageCount = file?.pageCount ?? 0;
  const pickedPages = file && picked.fileId === file.id ? picked.pages : new Set<number>();

  const plan = ((): { groups: number[][]; error: string | null } => {
    if (method === "each") return { groups: splitEvery(pageCount, 1), error: null };
    if (method === "every") return { groups: splitEvery(pageCount, every), error: null };
    if (method === "pick") {
      const pages = [...pickedPages].sort((a, b) => a - b);
      return { groups: pages.length ? [pages] : [], error: null };
    }
    if (!ranges.trim()) return { groups: [], error: null };
    return parseRanges(ranges, pageCount);
  })();

  // Which output part each page lands in (first match), for the colour badges.
  const groupOf = new Map<number, number>();
  plan.groups.forEach((g, gi) => g.forEach((p) => !groupOf.has(p) && groupOf.set(p, gi)));

  if (!file) return null;

  const toggle = (index: number) => {
    if (method !== "pick") return;
    const pages = new Set(pickedPages);
    if (pages.has(index)) pages.delete(index);
    else pages.add(index);
    setPicked({ fileId: file.id, pages });
  };

  const save = () =>
    run(async () => {
      const { split } = await import("../engine/pdf");
      const parts = await split(file.bytes, plan.groups);
      const base = baseName(file.name);
      if (parts.length === 1) return downloadPdf(parts[0], partName(base, plan.groups[0]));
      await downloadZip(
        parts.map((bytes, i) => ({ name: partName(base, plan.groups[i]), blob: new Blob([bytes as Uint8Array<ArrayBuffer>]) })),
        `${base}-split.zip`,
      );
    });

  const count = plan.groups.length;

  return (
    <Panel
      title="Split PDF"
      aside={<TargetPicker />}
      footer={
        <>
          <ErrorText error={error} />
          <span className="text-sm text-muted-foreground">
            {count === 0 ? "Nothing to save yet" : count === 1 ? "Creates 1 PDF" : `Creates ${count} PDFs in a ZIP`}
          </span>
          <Button onClick={() => void save()} disabled={busy || count === 0 || !!plan.error}>
            {busy ? <LoaderCircle className="animate-spin" /> : <FileDown />} {method === "pick" ? "Extract pages" : "Split and download"}
          </Button>
        </>
      }
    >
      <div className="mb-4 space-y-3">
        <Segmented
          label="How to split"
          value={method}
          onChange={setMethod}
          options={[
            { value: "ranges", label: "Custom ranges" },
            { value: "each", label: "Every page" },
            { value: "every", label: "Every N pages" },
            { value: "pick", label: "Pick pages" },
          ]}
          className="grid max-w-xl grid-cols-2 sm:flex"
        />
        {method === "ranges" && (
          <div className="max-w-xl space-y-1">
            <label htmlFor="split-ranges" className="text-sm font-medium">
              Page ranges, one PDF per range
            </label>
            <Input
              id="split-ranges"
              value={ranges}
              placeholder={`e.g. 1-3, 4, 5-${pageCount}`}
              onChange={(e) => setRanges(e.target.value)}
              aria-invalid={!!plan.error}
            />
            <p className={cn("text-xs", plan.error ? "text-destructive" : "text-muted-foreground")}>
              {plan.error ?? "Separate ranges with commas. “8-” runs to the last page."}
            </p>
          </div>
        )}
        {method === "every" && (
          <label className="flex items-center gap-2 text-sm">
            Split every
            <Input
              type="number"
              min={1}
              max={pageCount}
              value={every}
              onChange={(e) => setEvery(Math.max(1, Math.min(pageCount, Number(e.target.value) || 1)))}
              className="h-8 w-20"
            />
            pages
          </label>
        )}
        {method === "pick" && (
          <p className="text-sm text-muted-foreground">
            Click pages to select them. They are saved together as one PDF
            {pickedPages.size > 0 && <> (pages {formatPages([...pickedPages].sort((a, b) => a - b))})</>}.
          </p>
        )}
      </div>

      <ol className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3">
        {Array.from({ length: pageCount }, (_, i) => {
          const g = groupOf.get(i);
          const selected = pickedPages.has(i);
          const content = (
            <>
              <PageThumb fileId={file.id} index={i} />
              <span className="flex items-center gap-1.5 border-t px-2 py-1 text-xs tabular-nums">
                <span className="flex-1 text-left font-medium">{i + 1}</span>
                {method !== "pick" && g !== undefined && (
                  <span className={cn("rounded px-1 text-[10px] font-semibold text-white", groupColors[g % groupColors.length])}>#{g + 1}</span>
                )}
                {method === "pick" && selected && <Check className="size-3.5 text-(--tone-fg)" aria-hidden />}
              </span>
            </>
          );
          return (
            <li key={i}>
              {method === "pick" ? (
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Page ${i + 1}`}
                  onClick={() => toggle(i)}
                  className={cn(
                    "w-full rounded-lg border bg-muted/40 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected ? "border-(--tone) bg-(--tone-soft) ring-2 ring-(--tone)" : "hover:border-(--tone-muted)",
                  )}
                >
                  {content}
                </button>
              ) : (
                <div className={cn("rounded-lg border bg-muted/40", g === undefined && plan.groups.length > 0 && "opacity-40")}>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
