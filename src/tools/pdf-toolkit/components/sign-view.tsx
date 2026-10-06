"use client";

import { useEffect, useRef, useState } from "react";
import { FileDown, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { baseName, type ViewBox } from "../engine";
import { usePdfStore, type Placement, type Signature } from "../store";
import { downloadPdf, ErrorText, PageThumb, TargetPicker, useJob } from "./parts";
import { SignatureDialog } from "./signature-dialog";
import { cn } from "@/lib/utils";

type Size = { width: number; height: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Height (0–1 of page height) that keeps the signature's proportions at width `w` (0–1 of page width). */
const heightFor = (w: number, aspect: number, page: Size) => (w * page.width) / aspect / page.height;

function PlacedSignature({ placement, sig, page, selected, onSelect }: { placement: Placement; sig: Signature; page: Size; selected: boolean; onSelect: () => void }) {
  const update = usePdfStore((s) => s.updatePlacement);
  const remove = usePdfStore((s) => s.removePlacement);
  const drag = useRef<{ kind: "move" | "resize"; x: number; y: number; box: ViewBox; rect: DOMRect } | null>(null);
  const { box } = placement;

  const start = (e: React.PointerEvent, kind: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.closest("[data-page]")!.getBoundingClientRect();
    drag.current = { kind, x: e.clientX, y: e.clientY, box, rect };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / d.rect.width;
    const dy = (e.clientY - d.y) / d.rect.height;
    if (d.kind === "move") {
      update(placement.id, { ...d.box, u: clamp(d.box.u + dx, 0, 1 - d.box.w), v: clamp(d.box.v + dy, 0, 1 - d.box.h) });
    } else {
      const w = clamp(d.box.w + dx, 0.03, 1 - d.box.u);
      const h = heightFor(w, sig.aspect, page);
      if (d.box.v + h <= 1) update(placement.id, { ...d.box, w, h });
    }
  };
  const end = () => {
    drag.current = null;
  };

  const nudge = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.02 : 0.004;
    const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(placement.id);
    } else if (delta[e.key]) {
      e.preventDefault();
      const [dx, dy] = delta[e.key];
      update(placement.id, { ...box, u: clamp(box.u + dx, 0, 1 - box.w), v: clamp(box.v + dy, 0, 1 - box.h) });
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Placed signature. Drag or use the arrow keys to move it; press Delete to remove it."
      onPointerDown={(e) => start(e, "move")}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={nudge}
      onFocus={onSelect}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "group absolute cursor-move touch-none outline-none",
        selected ? "ring-2 ring-(--tone)" : "hover:ring-1 hover:ring-(--tone-muted)",
      )}
      style={{ left: `${box.u * 100}%`, top: `${box.v * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
      data-testid="placed-signature"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
      <img src={sig.url} alt="" draggable={false} className="size-full select-none" />
      {selected && (
        <>
          <button
            type="button"
            aria-label="Remove signature"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              remove(placement.id);
            }}
            className="absolute -top-3 -right-3 flex size-6 items-center justify-center rounded-full bg-destructive text-white shadow"
          >
            <X className="size-3.5" />
          </button>
          <span
            aria-hidden
            onPointerDown={(e) => start(e, "resize")}
            onPointerMove={move}
            onPointerUp={end}
            className="absolute -right-2 -bottom-2 size-4 cursor-nwse-resize rounded-full border-2 border-white bg-(--tone) shadow"
          />
        </>
      )}
    </div>
  );
}

function SignPage({ fileId, index, size, selected, setSelected }: { fileId: string; index: number; size: Size; selected: string | null; setSelected: (id: string | null) => void }) {
  const placements = usePdfStore((s) => s.placements);
  const signatures = usePdfStore((s) => s.signatures);
  const activeSig = usePdfStore((s) => s.signatures.find((x) => x.id === s.activeSigId) ?? null);
  const addPlacement = usePdfStore((s) => s.addPlacement);
  const here = placements.filter((p) => p.pageIndex === index);

  const place = (u: number, v: number) => {
    if (!activeSig) return;
    let w = 0.28;
    let h = heightFor(w, activeSig.aspect, size);
    if (h > 0.14) {
      h = 0.14;
      w = (h * size.height * activeSig.aspect) / size.width;
    }
    addPlacement({ sigId: activeSig.id, pageIndex: index, box: { u: clamp(u - w / 2, 0, 1 - w), v: clamp(v - h / 2, 0, 1 - h), w, h } });
  };

  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Page {index + 1}
          {here.length > 0 && ` · ${here.length} signature${here.length > 1 ? "s" : ""}`}
        </span>
        <Button variant="ghost" size="xs" disabled={!activeSig} onClick={() => place(0.5, 0.8)}>
          <Plus /> Add here
        </Button>
      </div>
      <div
        data-page={index}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          if (selected) setSelected(null);
          else place((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
        }}
        className={cn("relative bg-white shadow-sm ring-1 ring-black/10", activeSig && "cursor-crosshair")}
        style={{ aspectRatio: `${size.width} / ${size.height}` }}
      >
        <PageThumb fileId={fileId} index={index} pixelWidth={1100} className="absolute inset-0 aspect-auto size-full p-0 [&_img]:shadow-none [&_img]:ring-0" />
        {here.map((p) => {
          const sig = signatures.find((s) => s.id === p.sigId);
          return sig ? (
            <PlacedSignature key={p.id} placement={p} sig={sig} page={size} selected={selected === p.id} onSelect={() => setSelected(p.id)} />
          ) : null;
        })}
      </div>
    </li>
  );
}

export function SignView() {
  const file = usePdfStore((s) => s.files.find((f) => f.id === s.targetId) ?? null);
  const signatures = usePdfStore((s) => s.signatures);
  const activeSigId = usePdfStore((s) => s.activeSigId);
  const setActiveSig = usePdfStore((s) => s.setActiveSig);
  const removeSignature = usePdfStore((s) => s.removeSignature);
  const placements = usePdfStore((s) => s.placements);
  const [sizes, setSizes] = useState<{ fileId: string; sizes: Size[] } | null>(null);
  const [dialog, setDialog] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const { busy, error, run } = useJob();
  const fileId = file?.id;

  useEffect(() => {
    if (!fileId) return;
    let live = true;
    void import("../lib/render").then(async (m) => {
      const s = await m.pageSizes(fileId);
      if (live) setSizes({ fileId, sizes: s });
    });
    return () => {
      live = false;
    };
  }, [fileId]);

  if (!file) return null;
  const pageSizes = sizes?.fileId === file.id ? sizes.sizes : null;

  const save = () =>
    run(async () => {
      const { stamp } = await import("../engine/pdf");
      const stamps = placements.map((p) => ({ pageIndex: p.pageIndex, png: signatures.find((s) => s.id === p.sigId)!.png, box: p.box }));
      downloadPdf(await stamp(file.bytes, stamps), `${baseName(file.name)}-signed.pdf`);
    });

  return (
    <section aria-label="Sign PDF" className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="h-fit space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-20">
        <h2 className="text-lg font-semibold tracking-tight">Sign PDF</h2>
        <TargetPicker />
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Your signatures</h3>
          {signatures.length > 0 && (
            <ul className="space-y-2" role="radiogroup" aria-label="Signature to place">
              {signatures.map((s) => (
                <li key={s.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeSigId === s.id}
                    aria-label="Use this signature"
                    onClick={() => setActiveSig(s.id)}
                    className={cn(
                      "flex h-14 min-w-0 flex-1 items-center justify-center rounded-lg border bg-white p-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      activeSigId === s.id ? "border-(--tone) ring-2 ring-(--tone)" : "hover:border-(--tone-muted)",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
                    <img src={s.url} alt="" className="max-h-full max-w-full object-contain" />
                  </button>
                  <Button variant="ghost" size="icon-sm" aria-label="Delete this signature" onClick={() => removeSignature(s.id)}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button variant={signatures.length ? "outline" : "default"} className="w-full" onClick={() => setDialog(true)}>
            <Plus /> {signatures.length ? "New signature" : "Create signature"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {signatures.length
            ? "Click anywhere on a page to place the selected signature. Drag it to move, pull the corner dot to resize, and press Delete to remove it."
            : "Draw, type or upload your signature, then click on the pages where it should go."}
        </p>
        <div className="space-y-2 border-t pt-4">
          <ErrorText error={error} />
          <Button className="w-full" onClick={() => void save()} disabled={busy || placements.length === 0}>
            {busy ? <LoaderCircle className="animate-spin" /> : <FileDown />} Download signed PDF
          </Button>
          <p className="text-center text-xs text-muted-foreground tabular-nums">
            {placements.length} {placements.length === 1 ? "signature" : "signatures"} placed
          </p>
        </div>
      </aside>

      <div className="min-w-0 rounded-xl border bg-muted/40 p-3 sm:p-6">
        {pageSizes ? (
          <ol className="mx-auto max-w-3xl space-y-6">
            {pageSizes.map((size, i) => (
              <SignPage key={`${file.id}:${i}`} fileId={file.id} index={i} size={size} selected={selected} setSelected={setSelected} />
            ))}
          </ol>
        ) : (
          <div className="flex h-60 items-center justify-center">
            <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-label="Loading pages" />
          </div>
        )}
      </div>

      <SignatureDialog open={dialog} onOpenChange={setDialog} />
    </section>
  );
}
