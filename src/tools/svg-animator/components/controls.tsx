"use client";

import { lazy, Suspense, useId, type ReactNode } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { easingLabel, isSafeColor, matchPreset, presets } from "../engine";
import type { AnimationType } from "../engine";
import { useAnimatorStore, type ChannelName } from "../store";
import { TimeField } from "./time-field";
import { cn } from "@/lib/utils";

const SPEEDS = [0.5, 1, 1.5, 2];

const formatSeconds = (ms: number) => `${Number((ms / 1000).toFixed(2))}s`;

// The timing popover (Popover + Select) is a separate chunk to keep the first load small.
const LazyChannelDetails = lazy(() => import("./channel-details"));

/** Summary button for a channel's advanced timing; it becomes the popover trigger once that loads. */
function ChannelDetails({ channel, title }: { channel: ChannelName; title: string }) {
  const cfg = useAnimatorStore((s) => s.config[channel]);
  const trigger = (
    <Button variant="ghost" size="xs" className="max-w-44 text-muted-foreground" aria-label={`More ${title.toLowerCase()} options`}>
      <SlidersHorizontal />
      <span className="truncate">
        {easingLabel(cfg.easing)}
        {cfg.delay > 0 && ` · ${formatSeconds(cfg.delay)}`}
      </span>
    </Button>
  );
  return (
    <Suspense fallback={trigger}>
      <LazyChannelDetails channel={channel} title={title} trigger={trigger} />
    </Suspense>
  );
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2.5 px-4 py-3">
      <div className="flex h-6 items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Pill-style radio group used for the small choices in the panel. */
function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T | null;
  options: { value: T; label: string; title?: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-1 rounded-lg bg-muted p-1", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-7 min-w-0 truncate rounded-md px-2 text-center text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            value === o.value ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PresetPicker() {
  const config = useAnimatorStore((s) => s.config);
  const apply = useAnimatorStore((s) => s.applyPreset);
  const resetConfig = useAnimatorStore((s) => s.resetConfig);
  const active = matchPreset(config);
  return (
    <Section
      title="Style"
      aside={
        <div className="flex items-center gap-1">
          {!active && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Custom</span>}
          <Button variant="ghost" size="xs" onClick={resetConfig} title="Reset all settings">
            <RotateCcw /> Reset
          </Button>
        </div>
      }
    >
      <Segmented
        label="Style preset"
        className="grid-cols-3"
        value={active?.id ?? null}
        onChange={(id) => {
          const preset = presets.find((p) => p.id === id);
          if (preset) apply(preset);
        }}
        options={presets.map((p) => ({ value: p.id, label: p.name, title: p.hint }))}
      />
    </Section>
  );
}

function PlaybackFields() {
  const type = useAnimatorStore((s) => s.config.type);
  const setType = useAnimatorStore((s) => s.setType);
  const speed = useAnimatorStore((s) => s.speed);
  const setSpeed = useAnimatorStore((s) => s.setSpeed);
  return (
    <Section title="Playback">
      <Segmented<AnimationType>
        label="Animation type"
        className="grid-cols-2"
        value={type}
        onChange={setType}
        options={[
          { value: "transition", label: "Once", title: "Plays once and holds the last frame" },
          { value: "animation", label: "Loop", title: "Repeats forever" },
        ]}
      />
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 text-sm" aria-hidden>
          Speed
        </span>
        <Segmented
          label="Speed"
          className="flex-1 grid-cols-4"
          value={speed}
          onChange={setSpeed}
          options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))}
        />
      </div>
    </Section>
  );
}

function ChannelSection({ channel }: { channel: ChannelName }) {
  const cfg = useAnimatorStore((s) => s.config[channel]);
  const update = useAnimatorStore((s) => s.updateChannel);
  const switchId = useId();
  const title = channel === "stroke" ? "Draw strokes" : "Fade in fills";

  return (
    <section className="space-y-2.5 px-4 py-3">
      <div className="flex h-6 items-center gap-2">
        <Switch id={switchId} checked={cfg.enabled} onCheckedChange={(enabled) => update(channel, { enabled })} />
        <Label htmlFor={switchId} className="flex-1 cursor-pointer">
          {title}
          {!cfg.enabled && <span className="font-normal text-muted-foreground"> · off</span>}
        </Label>
        {cfg.enabled && <ChannelDetails channel={channel} title={title} />}
      </div>
      {cfg.enabled && (
        <TimeField inline label="Duration" value={cfg.duration} max={10_000} onChange={(duration) => update(channel, { duration })} />
      )}
    </section>
  );
}

const swatches = [
  { value: "#ffffff", label: "White", className: "bg-white" },
  { value: "#0a0a0a", label: "Dark", className: "bg-neutral-950" },
  { value: "transparent", label: "Transparent", className: "bg-checkerboard" },
];

function BackgroundField() {
  const background = useAnimatorStore((s) => s.config.background);
  const setBackground = useAnimatorStore((s) => s.setBackground);
  const hex = /^#[0-9a-f]{6}$/i.test(background) ? background : "#ffffff";
  const isSwatch = swatches.some((s) => s.value === background.toLowerCase());
  const ring = "ring-2 ring-primary ring-offset-2 ring-offset-card";

  return (
    <section className="flex items-center gap-2 px-4 py-3">
      <h3 className="w-20 shrink-0 text-sm">Background</h3>
      <div role="radiogroup" aria-label="Background" className="flex gap-2">
        {swatches.map((s) => {
          const checked = background.toLowerCase() === s.value;
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={s.label}
              title={s.label}
              onClick={() => setBackground(s.value)}
              className={cn(
                "size-6 rounded-full border focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                s.className,
                checked && ring,
              )}
            />
          );
        })}
      </div>
      <label
        title="Custom color"
        className={cn("relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-full border", !isSwatch && ring)}
        style={{ background: isSwatch ? "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" : background }}
      >
        <input
          type="color"
          aria-label="Background color"
          value={hex}
          onChange={(e) => setBackground(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <Input
        aria-label="Background color value"
        defaultValue={background}
        key={background}
        onBlur={(e) => isSafeColor(e.target.value) && setBackground(e.target.value.trim())}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="h-7 min-w-0 flex-1 font-mono text-xs"
      />
    </section>
  );
}

export function Controls({ className }: { className?: string }) {
  return (
    // One column on phones and beside the preview (lg+); two columns on tablets, where the panel is full width.
    <aside aria-label="Animation settings" className={cn("grid content-start rounded-xl border bg-card md:max-lg:grid-cols-2", className)}>
      <div className="divide-y">
        <PresetPicker />
        <PlaybackFields />
      </div>
      <div className="divide-y border-t md:max-lg:border-t-0 md:max-lg:border-l">
        <ChannelSection channel="stroke" />
        <ChannelSection channel="fill" />
        <BackgroundField />
      </div>
    </aside>
  );
}
