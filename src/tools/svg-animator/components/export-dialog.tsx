"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleAlert, Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { downloadBlob } from "@/lib/download";
import { cn } from "@/lib/utils";
import { loopDuration } from "../engine";
import {
  exportFilename,
  FPS_OPTIONS,
  frameTimes,
  gifFrameStride,
  mediaFormats,
  normalizeSize,
  resolutionPresets,
  supportsTransparency,
  type Fps,
  type MediaFormat,
  type ResolutionPreset,
} from "../export/settings";
import { detectMediaSupport, ExportCancelledError, NO_VIDEO_MESSAGE, UNSUPPORTED_MESSAGE, type MediaSupport } from "../export/support";
import { useAnimatorStore } from "../store";

type Status =
  | { kind: "idle" }
  | { kind: "running"; done: number; total: number; phase: "rendering" | "finishing" }
  | { kind: "done"; blob: Blob; filename: string; notes: string[] }
  | { kind: "error"; message: string };

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled || o.disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-w-0 flex-1 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            value === o.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="block font-medium">{o.label}</span>
          {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`;

export default function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const source = useAnimatorStore((s) => s.source);
  const config = useAnimatorStore((s) => s.config);

  const [format, setFormat] = useState<MediaFormat>("mp4");
  const [preset, setPreset] = useState<ResolutionPreset>("1080p");
  const [custom, setCustom] = useState({ width: 1600, height: 900 });
  const [fps, setFps] = useState<Fps>(30);
  const [transparent, setTransparent] = useState(config.background === "transparent");
  const [background, setBackground] = useState(
    /^#[0-9a-f]{6}$/i.test(config.background) ? config.background : "#ffffff",
  );
  const [holdSeconds, setHoldSeconds] = useState(1);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [support] = useState<MediaSupport>(() => detectMediaSupport());
  const abortRef = useRef<AbortController | null>(null);
  const ids = { w: useId(), h: useId(), hold: useId(), bg: useId() };

  useEffect(() => () => abortRef.current?.abort(), []);

  const isVideo = format === "mp4" || format === "webm";
  const raw = preset === "custom" ? custom : resolutionPresets[preset];
  const size = normalizeSize(raw.width, raw.height, isVideo);
  const canTransparent = supportsTransparency(format);
  const useTransparent = transparent && canTransparent;
  const running = status.kind === "running";

  const effectiveConfig = { ...config, background: useTransparent ? "transparent" : background };
  const frameCount = source
    ? frameTimes(effectiveConfig, source.model, fps, config.type === "transition" ? holdSeconds * 1000 : 0).length
    : 0;
  const gifStride = format === "gif" ? gifFrameStride(fps) : 1;
  const shownFrames = Math.ceil(frameCount / gifStride);
  const seconds = source ? loopDuration(config, source.model) / 1000 + (config.type === "transition" ? holdSeconds : 0) : 0;

  const blocker = !support.offscreenCanvas
    ? UNSUPPORTED_MESSAGE
    : isVideo && !support.webCodecs && !support.mediaRecorderWebm
      ? NO_VIDEO_MESSAGE
      : null;
  const fallbackNote =
    isVideo && !support.webCodecs && support.mediaRecorderWebm
      ? "WebCodecs isn't available in this browser, so video will be recorded in real time as WebM."
      : null;

  const start = async () => {
    if (!source) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ kind: "running", done: 0, total: frameCount, phase: "rendering" });
    try {
      const { runMediaExport } = await import("../export/run-export");
      const result = await runMediaExport(
        source,
        config,
        { format, ...size, fps, transparent: useTransparent, background, holdMs: holdSeconds * 1000 },
        {
          signal: controller.signal,
          onProgress: (done, total, phase) => setStatus({ kind: "running", done, total, phase }),
        },
      );
      const filename = exportFilename(source.name, format).replace(/\.[a-z0-9]+$/, `.${result.extension}`);
      downloadBlob(result.blob, filename);
      setStatus({ kind: "done", blob: result.blob, filename, notes: result.notes });
    } catch (err) {
      if (err instanceof ExportCancelledError) setStatus({ kind: "idle" });
      else setStatus({ kind: "error", message: err instanceof Error ? err.message : "Export failed." });
    } finally {
      abortRef.current = null;
    }
  };

  const percent = status.kind === "running" && status.total > 0 ? Math.round((status.done / status.total) * 100) : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) abortRef.current?.abort();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Export video, GIF or PNG</DialogTitle>
          <DialogDescription>Frames are rendered and encoded on your device.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <Segmented
              label="Format"
              value={format}
              disabled={running}
              options={mediaFormats.map((f) => ({ value: f.id, label: f.label, hint: f.hint }))}
              onChange={setFormat}
            />
          </div>

          <div className="space-y-2">
            <Label>Resolution</Label>
            <Segmented
              label="Resolution"
              value={preset}
              disabled={running}
              options={[
                ...Object.entries(resolutionPresets).map(([value, p]) => ({
                  value: value as ResolutionPreset,
                  label: p.label,
                  hint: `${p.width}×${p.height}`,
                })),
                { value: "custom" as const, label: "Custom", hint: preset === "custom" ? `${size.width}×${size.height}` : "Any size" },
              ]}
              onChange={setPreset}
            />
            {preset === "custom" && (
              <div className="flex items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor={ids.w} className="text-xs">
                    Width
                  </Label>
                  <Input
                    id={ids.w}
                    type="number"
                    min={16}
                    max={3840}
                    value={custom.width}
                    disabled={running}
                    onChange={(e) => setCustom((c) => ({ ...c, width: Number(e.target.value) }))}
                    className="w-28"
                  />
                </div>
                <span className="pb-2 text-muted-foreground">×</span>
                <div className="space-y-1">
                  <Label htmlFor={ids.h} className="text-xs">
                    Height
                  </Label>
                  <Input
                    id={ids.h}
                    type="number"
                    min={16}
                    max={3840}
                    value={custom.height}
                    disabled={running}
                    onChange={(e) => setCustom((c) => ({ ...c, height: Number(e.target.value) }))}
                    className="w-28"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Frame rate</Label>
              <Segmented
                label="Frame rate"
                value={fps}
                disabled={running}
                options={FPS_OPTIONS.map((f) => ({ value: f, label: `${f} fps` }))}
                onChange={setFps}
              />
            </div>
            <div className="space-y-2">
              <Label>Background</Label>
              <div className="flex items-center gap-2">
                <Segmented
                  label="Background"
                  value={useTransparent ? "transparent" : "solid"}
                  disabled={running}
                  options={[
                    { value: "solid", label: "Solid" },
                    { value: "transparent", label: "Transparent", disabled: !canTransparent },
                  ]}
                  onChange={(v) => setTransparent(v === "transparent")}
                />
                <input
                  id={ids.bg}
                  type="color"
                  aria-label="Export background color"
                  value={background}
                  disabled={running || useTransparent}
                  onChange={(e) => setBackground(e.target.value)}
                  className="h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              {!canTransparent && <p className="text-xs text-muted-foreground">MP4 can&apos;t store transparency.</p>}
            </div>
          </div>

          {config.type === "transition" && (
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor={ids.hold}>Hold last frame</Label>
              <div className="flex items-center gap-1">
                <Input
                  id={ids.hold}
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={holdSeconds}
                  disabled={running}
                  onChange={(e) => setHoldSeconds(Math.min(10, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-20 text-right"
                />
                <span className="text-sm text-muted-foreground">s</span>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground" data-testid="export-summary">
            {size.width}×{size.height} · {seconds.toFixed(2)}s · {shownFrames} frames
            {format === "gif" && gifStride > 1 ? ` (GIF uses ${fps / gifStride} fps)` : ""}
          </p>

          {(blocker || fallbackNote) && (
            <div role="alert" className={cn("flex gap-2 rounded-lg border p-3 text-sm", blocker ? "border-destructive/40 bg-destructive/10 text-destructive" : "bg-muted/50")}>
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{blocker ?? fallbackNote}</p>
            </div>
          )}

          {status.kind === "running" && (
            <div className="space-y-2" aria-live="polite">
              <Progress value={percent} aria-label="Export progress" />
              <p className="text-sm text-muted-foreground">
                {status.phase === "finishing" ? "Finishing file…" : `Rendering frame ${status.done} of ${status.total}`} ({percent}%)
              </p>
            </div>
          )}
          {status.kind === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {status.message}
            </p>
          )}
          {status.kind === "done" && (
            <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-sm" data-testid="export-done">
              <p>
                Saved <span className="font-medium">{status.filename}</span> ({formatBytes(status.blob.size)}).
              </p>
              {status.notes.map((n) => (
                <p key={n} className="text-muted-foreground">
                  {n}
                </p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          {status.kind === "done" && (
            <Button variant="outline" onClick={() => downloadBlob(status.blob, status.filename)}>
              <Download /> Download again
            </Button>
          )}
          {running ? (
            <Button variant="destructive" onClick={() => abortRef.current?.abort()}>
              Cancel
            </Button>
          ) : (
            <Button onClick={start} disabled={!source || !!blocker}>
              {status.kind === "done" ? "Export again" : `Export ${mediaFormats.find((f) => f.id === format)!.label}`}
            </Button>
          )}
          {running && <LoaderCircle className="size-4 animate-spin self-center text-muted-foreground" aria-hidden />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
