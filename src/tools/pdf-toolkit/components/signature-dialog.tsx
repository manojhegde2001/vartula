"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Eraser, ImageUp, PenLine, Type } from "lucide-react";
import { categoryInfo } from "@/tools/registry";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { signatureFonts, type SignatureFontId } from "../lib/fonts";
import { usePdfStore } from "../store";
import { Segmented } from "./parts";
import { cn } from "@/lib/utils";

type Tab = "draw" | "type" | "upload";
type Point = { x: number; y: number };

const inks = [
  { value: "#111827", label: "Black" },
  { value: "#1d4ed8", label: "Blue" },
  { value: "#b91c1c", label: "Red" },
];

/** Crop a canvas to its non-transparent pixels plus a small margin. Returns null when it is empty. */
function trim(source: HTMLCanvasElement, pad = 6): HTMLCanvasElement | null {
  const ctx = source.getContext("2d")!;
  const { width, height } = source;
  const data = ctx.getImageData(0, 0, width, height).data;
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(width - 1, x1 + pad);
  y1 = Math.min(height - 1, y1 + pad);
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext("2d")!.drawImage(source, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Point[][], scale: number, color: string) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.6 * scale;
  for (const s of strokes) {
    if (s.length === 1) {
      ctx.beginPath();
      ctx.arc(s[0].x * scale, s[0].y * scale, 1.3 * scale, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    // Quadratic curves through the midpoints smooth out the pointer's jitter.
    ctx.beginPath();
    ctx.moveTo(s[0].x * scale, s[0].y * scale);
    for (let i = 1; i < s.length - 1; i++) {
      const mx = (s[i].x + s[i + 1].x) / 2;
      const my = (s[i].y + s[i + 1].y) / 2;
      ctx.quadraticCurveTo(s[i].x * scale, s[i].y * scale, mx * scale, my * scale);
    }
    const last = s[s.length - 1];
    ctx.lineTo(last.x * scale, last.y * scale);
    ctx.stroke();
  }
}

function DrawPad({ strokes, setStrokes, ink }: { strokes: Point[][]; setStrokes: (s: Point[][]) => void; ink: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef<Point[] | null>(null);

  // Redraw at device resolution whenever the strokes or the size change.
  useEffect(() => {
    const el = canvas.current!;
    const paint = () => {
      const dpr = window.devicePixelRatio || 1;
      el.width = el.clientWidth * dpr;
      el.height = el.clientHeight * dpr;
      const ctx = el.getContext("2d")!;
      ctx.clearRect(0, 0, el.width, el.height);
      drawStrokes(ctx, current.current ? [...strokes, current.current] : strokes, dpr, ink);
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(el);
    return () => ro.disconnect();
  }, [strokes, ink]);

  const point = (e: React.PointerEvent): Point => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div className="relative">
      <canvas
        ref={canvas}
        aria-label="Signature drawing area"
        className="h-48 w-full touch-none rounded-lg border bg-white"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          current.current = [point(e)];
        }}
        onPointerMove={(e) => {
          if (!current.current) return;
          current.current.push(point(e));
          const el = canvas.current!;
          const ctx = el.getContext("2d")!;
          const dpr = window.devicePixelRatio || 1;
          ctx.clearRect(0, 0, el.width, el.height);
          drawStrokes(ctx, [...strokes, current.current], dpr, ink);
        }}
        onPointerUp={() => {
          if (current.current) setStrokes([...strokes, current.current]);
          current.current = null;
        }}
        onPointerCancel={() => {
          current.current = null;
        }}
      />
      <span className="pointer-events-none absolute inset-x-6 bottom-10 border-b border-dashed border-gray-300" aria-hidden />
      {strokes.length === 0 && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">Sign here with your mouse, finger or stylus</span>
      )}
    </div>
  );
}

async function canvasToSignature(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the image."))), "image/png"));
  return { png: new Uint8Array(await blob.arrayBuffer()), url: URL.createObjectURL(blob), aspect: canvas.width / canvas.height };
}

export function SignatureDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const addSignature = usePdfStore((s) => s.addSignature);
  const [tab, setTab] = useState<Tab>("draw");
  const [ink, setInk] = useState(inks[0].value);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [text, setText] = useState("");
  const [font, setFont] = useState<SignatureFontId>("dancing");
  const [upload, setUpload] = useState<ImageBitmap | null>(null);
  const [removeWhite, setRemoveWhite] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ready = tab === "draw" ? strokes.length > 0 : tab === "type" ? text.trim().length > 0 : upload !== null;

  const create = async () => {
    setError(null);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    if (tab === "draw") {
      const pad = document.querySelector<HTMLCanvasElement>("[aria-label='Signature drawing area']");
      canvas.width = (pad?.clientWidth ?? 600) * 3;
      canvas.height = (pad?.clientHeight ?? 192) * 3;
      drawStrokes(ctx, strokes, 3, ink);
    } else if (tab === "type") {
      const f = signatureFonts.find((x) => x.id === font)!;
      const css = `${f.weight} 120px ${f.family}`;
      // Wait for the web font so the canvas doesn't draw a fallback. If it can't load, draw anyway.
      if (f.primary) await document.fonts.load(`${f.weight} 120px ${f.primary}`, text).catch(() => {});
      ctx.font = css;
      canvas.width = Math.ceil(ctx.measureText(text).width + 80);
      canvas.height = 220;
      ctx.font = css; // Resizing the canvas resets its state.
      ctx.fillStyle = ink;
      ctx.textBaseline = "middle";
      ctx.fillText(text, 40, 110);
    } else if (upload) {
      const scale = Math.min(1, 1600 / upload.width);
      canvas.width = Math.round(upload.width * scale);
      canvas.height = Math.round(upload.height * scale);
      ctx.drawImage(upload, 0, 0, canvas.width, canvas.height);
      if (removeWhite) {
        // Fade near-white paper to transparent so a photographed signature sits on the page cleanly.
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (lum > 210) d[i + 3] = 0;
          else if (lum > 150) d[i + 3] = Math.round(d[i + 3] * ((210 - lum) / 60));
        }
        ctx.putImageData(img, 0, 0);
      }
    }
    const trimmed = trim(canvas);
    if (!trimmed) return setError("The signature is empty.");
    addSignature(await canvasToSignature(trimmed));
    setStrokes([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Portalled outside the editor, so it needs its own .tone accent. */}
      <DialogContent className="tone sm:max-w-xl" style={{ "--tone-h": categoryInfo.Document.hue } as CSSProperties}>
        <DialogHeader>
          <DialogTitle>Create a signature</DialogTitle>
          <DialogDescription>It stays on your device and is only added to the pages you place it on.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Segmented
            label="Signature type"
            value={tab}
            onChange={setTab}
            options={[
              { value: "draw", label: <><PenLine /> Draw</> },
              { value: "type", label: <><Type /> Type</> },
              { value: "upload", label: <><ImageUp /> Upload</> },
            ]}
          />

          {tab !== "upload" && (
            <div className="flex items-center gap-2" role="radiogroup" aria-label="Ink colour">
              <span className="text-sm text-muted-foreground">Ink</span>
              {inks.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={ink === c.value}
                  aria-label={c.label}
                  onClick={() => setInk(c.value)}
                  className={cn("size-6 rounded-full border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50", ink === c.value ? "border-foreground" : "border-transparent")}
                  style={{ background: c.value }}
                />
              ))}
              {tab === "draw" && (
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setStrokes([])} disabled={strokes.length === 0}>
                  <Eraser /> Clear
                </Button>
              )}
            </div>
          )}

          {tab === "draw" && <DrawPad strokes={strokes} setStrokes={setStrokes} ink={ink} />}

          {tab === "type" && (
            <div className="space-y-3">
              <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Your name, initials or today's date" aria-label="Signature text" maxLength={60} />
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Font">
                {signatureFonts.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={font === f.id}
                    onClick={() => setFont(f.id)}
                    className={cn(
                      "flex h-16 items-center justify-center truncate rounded-lg border bg-white px-3 text-3xl transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      f.className,
                      font === f.id ? "border-(--tone) ring-2 ring-(--tone)" : "hover:border-(--tone-muted)",
                    )}
                    style={{ color: ink }}
                  >
                    {text.trim() || f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-3">
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-sm text-muted-foreground hover:border-(--tone)">
                {upload ? "Choose a different image" : "Choose a photo or scan of your signature"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setUpload(await createImageBitmap(file));
                      setError(null);
                    } catch {
                      setError("That image couldn't be opened.");
                    }
                  }}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={removeWhite} onChange={(e) => setRemoveWhite(e.target.checked)} className="accent-(--tone)" />
                Remove the white paper background
              </label>
              {upload && <p className="text-xs text-muted-foreground">Image loaded ({upload.width}×{upload.height}).</p>}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void create().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not create the signature."))}
            disabled={!ready}
          >
            Add signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
