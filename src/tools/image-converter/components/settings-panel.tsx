"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { formatInfo, outputFormats, targetPresets, type OutputFormat, type ResizeMode } from "../engine";
import { useConverterStore } from "../store";
import { cn } from "@/lib/utils";

/** Pill-style radio group for short choices. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-7 min-w-0 flex-1 items-center justify-center truncate rounded-md px-2 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
            value === o.value ? "bg-background font-medium shadow-sm" : "text-muted-foreground enabled:hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium">
            {label}
          </label>
        ) : (
          <span className="text-sm font-medium">{label}</span>
        )}
        {hint && <span className="text-xs text-muted-foreground tabular-nums">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** Number box that commits on blur or Enter, so typing "1920" doesn't convert at 1, 19 and 192 first. */
function NumberInput({
  id,
  value,
  onCommit,
  placeholder,
  min = 1,
  max,
  label,
}: {
  id: string;
  value: number | null;
  onCommit: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  label: string;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  // Follow outside changes (e.g. a preset chip) without an effect.
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setDraft(value === null ? "" : String(value));
  }
  const commit = () => {
    const n = Number.parseFloat(draft);
    const next = draft.trim() === "" || !Number.isFinite(n) ? null : Math.min(max ?? Infinity, Math.max(min, Math.round(n)));
    setDraft(next === null ? "" : String(next));
    if (next !== value) onCommit(next);
  };
  return (
    <Input
      id={id}
      aria-label={label}
      inputMode="numeric"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className="h-8 tabular-nums"
    />
  );
}

const resizeModes: { value: ResizeMode; label: string; title: string }[] = [
  { value: "none", label: "Original", title: "Keep the original dimensions" },
  { value: "percent", label: "Percent", title: "Scale by a percentage" },
  { value: "fit", label: "Fit", title: "Shrink to fit inside a maximum width and height" },
  { value: "exact", label: "Exact", title: "Exact width and height, cropping to fill" },
];

export function SettingsPanel() {
  const settings = useConverterStore((s) => s.settings);
  const update = useConverterStore((s) => s.update);
  const updateResize = useConverterStore((s) => s.updateResize);
  const [supported, setSupported] = useState<Partial<Record<OutputFormat, boolean>>>({});
  const info = formatInfo[settings.format];
  const { resize } = settings;

  useEffect(() => {
    let live = true;
    void import("../lib/process").then(async ({ canEncode }) => {
      const entries = await Promise.all(outputFormats.map(async (f) => [f, await canEncode(f)] as const));
      if (live) setSupported(Object.fromEntries(entries));
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <Field label="Convert to">
        <Segmented
          label="Output format"
          value={settings.format}
          onChange={(format) => update({ format })}
          options={outputFormats.map((f) => ({
            value: f,
            label: formatInfo[f].label,
            disabled: supported[f] === false,
            title: supported[f] === false ? `Your browser can't save ${formatInfo[f].label} images` : undefined,
          }))}
        />
      </Field>

      {info.lossy && (
        <Field label={settings.targetKb ? "Maximum quality" : "Quality"} htmlFor="ic-quality" hint={`${settings.quality}%`}>
          <input
            id="ic-quality"
            type="range"
            min={10}
            max={100}
            value={settings.quality}
            onChange={(e) => update({ quality: Number(e.target.value) })}
            className="w-full accent-(--tone)"
          />
        </Field>
      )}

      {!info.alpha && (
        <Field label="Background" htmlFor="ic-bg" hint="Fills transparent areas">
          <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
            <input
              id="ic-bg"
              type="color"
              value={settings.background}
              onChange={(e) => update({ background: e.target.value })}
              className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <span className="font-mono text-xs text-muted-foreground uppercase">{settings.background}</span>
          </div>
        </Field>
      )}

      <Field label="Target file size" hint={settings.targetKb ? "Lowers quality, then size" : "Off"}>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Target size presets">
          <button
            type="button"
            aria-pressed={settings.targetKb === null}
            onClick={() => update({ targetKb: null })}
            className={chip(settings.targetKb === null)}
          >
            No limit
          </button>
          {targetPresets.map((kb) => (
            <button key={kb} type="button" aria-pressed={settings.targetKb === kb} onClick={() => update({ targetKb: kb })} className={chip(settings.targetKb === kb)}>
              {kb >= 1000 ? `${kb / 1000} MB` : `${kb} KB`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <NumberInput id="ic-target" label="Maximum size in KB" value={settings.targetKb} onCommit={(targetKb) => update({ targetKb })} placeholder="Custom" max={100_000} />
          <span className="text-sm text-muted-foreground">KB</span>
        </div>
      </Field>

      <Field label="Resize">
        <Segmented label="Resize mode" value={resize.mode} onChange={(mode) => updateResize({ mode })} options={resizeModes} />
        {resize.mode === "percent" && (
          <div className="flex items-center gap-3">
            <input
              aria-label="Scale percentage"
              type="range"
              min={5}
              max={200}
              step={5}
              value={resize.percent}
              onChange={(e) => updateResize({ percent: Number(e.target.value) })}
              className="w-full accent-(--tone)"
            />
            <span className="w-12 text-right text-sm tabular-nums">{resize.percent}%</span>
          </div>
        )}
        {(resize.mode === "fit" || resize.mode === "exact") && (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <NumberInput id="ic-w" label="Width in pixels" value={resize.width} onCommit={(width) => updateResize({ width })} placeholder="Width" max={16384} />
              <span className="text-muted-foreground">×</span>
              <NumberInput id="ic-h" label="Height in pixels" value={resize.height} onCommit={(height) => updateResize({ height })} placeholder="Height" max={16384} />
            </div>
            <p className="text-xs text-muted-foreground">
              {resize.mode === "fit"
                ? "Shrinks to fit inside this box, keeping proportions. Leave a side empty for no limit. Small images are never enlarged."
                : "Leave a side empty to keep proportions. With both sides set, the image is scaled to fill and the overflow is cropped from the centre."}
            </p>
          </>
        )}
      </Field>

      <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
        Converted images contain no EXIF metadata, so camera details and GPS location are removed.
      </p>
    </div>
  );
}

function chip(active: boolean) {
  return cn(
    "h-7 rounded-full border px-2.5 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
    active ? "border-(--tone) bg-(--tone-soft) font-medium text-(--tone-fg)" : "text-muted-foreground hover:border-(--tone-muted) hover:text-foreground",
  );
}
