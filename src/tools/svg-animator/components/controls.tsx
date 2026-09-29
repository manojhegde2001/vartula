"use client";

import { useId } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIRECTIONS, easingLabel, easingNames, isSafeColor } from "../engine";
import type { AnimationType, Direction, EasingName } from "../engine";
import { useAnimatorStore, type ChannelName } from "../store";
import { cn } from "@/lib/utils";

const directionLabels: Record<Direction, string> = {
  normal: "Normal",
  reverse: "Reverse",
  alternate: "Alternate",
  "alternate-reverse": "Alternate reverse",
};
const directionItems = DIRECTIONS.map((value) => ({ value, label: directionLabels[value] }));
const easingItems = easingNames.map((value) => ({ value, label: easingLabel(value) }));
const easingGroups: { label: string; names: EasingName[] }[] = [
  { label: "Basic", names: ["linear", "ease"] },
  ...["Quad", "Cubic", "Quart", "Quint", "Sine", "Expo", "Circ", "Back"].map((fam) => ({
    label: fam,
    names: easingNames.filter((n) => n.endsWith(fam)),
  })),
];

function TimeField({
  label,
  value,
  max,
  step = 50,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  max: number;
  step?: number;
  onChange: (ms: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-1">
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            min={0}
            step={step / 1000}
            value={Number((value / 1000).toFixed(3))}
            disabled={disabled}
            onChange={(e) => {
              const seconds = parseFloat(e.target.value);
              if (Number.isFinite(seconds)) onChange(Math.max(0, Math.round(seconds * 1000)));
            }}
            className="h-7 w-20 text-right tabular-nums"
          />
          <span className="text-xs text-muted-foreground">s</span>
        </div>
      </div>
      <Slider
        aria-label={label}
        min={0}
        max={Math.max(max, value)}
        step={step}
        value={value}
        disabled={disabled}
        onValueChange={(v) => onChange(v as number)}
      />
    </div>
  );
}

function ChannelControls({ channel }: { channel: ChannelName }) {
  const cfg = useAnimatorStore((s) => s.config[channel]);
  const update = useAnimatorStore((s) => s.updateChannel);
  const set = (patch: Parameters<typeof update>[1]) => update(channel, patch);
  const off = !cfg.enabled;
  const switchId = useId();
  const title = channel === "stroke" ? "Draw strokes" : "Fade in fills";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Label htmlFor={switchId}>{title}</Label>
        <Switch id={switchId} checked={cfg.enabled} onCheckedChange={(enabled) => set({ enabled })} />
      </div>
      <TimeField label="Duration" value={cfg.duration} max={10_000} disabled={off} onChange={(duration) => set({ duration })} />
      <TimeField label="Delay" value={cfg.delay} max={10_000} disabled={off} onChange={(delay) => set({ delay })} />
      <TimeField
        label="Stagger step"
        value={cfg.stagger}
        max={2_000}
        step={10}
        disabled={off}
        onChange={(stagger) => set({ stagger })}
      />
      <div className="space-y-2">
        <Label>Easing</Label>
        <Select
          items={easingItems}
          value={cfg.easing}
          disabled={off}
          onValueChange={(v) => v && set({ easing: v as EasingName })}
        >
          <SelectTrigger className="w-full" aria-label={`${channel} easing`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="max-h-80">
            {easingGroups.map((g) => (
              <SelectGroup key={g.label}>
                <SelectLabel>{g.label}</SelectLabel>
                {g.names.map((n) => (
                  <SelectItem key={n} value={n}>
                    {easingLabel(n)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Direction</Label>
        <Select
          items={directionItems}
          value={cfg.direction}
          disabled={off}
          onValueChange={(v) => v && set({ direction: v as Direction })}
        >
          <SelectTrigger className="w-full" aria-label={`${channel} direction`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {directionItems.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function TypeToggle() {
  const type = useAnimatorStore((s) => s.config.type);
  const setType = useAnimatorStore((s) => s.setType);
  const options: { value: AnimationType; label: string; hint: string }[] = [
    { value: "transition", label: "Transition", hint: "Plays once" },
    { value: "animation", label: "Animation", hint: "Loops forever" },
  ];
  return (
    <div role="radiogroup" aria-label="Animation type" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={type === o.value}
          onClick={() => setType(o.value)}
          className={cn(
            "rounded-md px-2 py-1.5 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            type === o.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="block font-medium">{o.label}</span>
          <span className="block text-xs text-muted-foreground">{o.hint}</span>
        </button>
      ))}
    </div>
  );
}

function BackgroundField() {
  const background = useAnimatorStore((s) => s.config.background);
  const setBackground = useAnimatorStore((s) => s.setBackground);
  const transparent = background === "transparent";
  const hex = /^#[0-9a-f]{6}$/i.test(background) ? background : "#ffffff";
  const id = useId();

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Background</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          aria-label="Background color"
          value={hex}
          disabled={transparent}
          onChange={(e) => setBackground(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded-md border bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Input
          aria-label="Background color value"
          defaultValue={background}
          key={background}
          disabled={transparent}
          onBlur={(e) => isSafeColor(e.target.value) && setBackground(e.target.value.trim())}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="h-8 flex-1 font-mono"
        />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={transparent} onCheckedChange={(on) => setBackground(on ? "transparent" : "#ffffff")} />
          Transparent
        </label>
      </div>
    </div>
  );
}

export function Controls() {
  const resetConfig = useAnimatorStore((s) => s.resetConfig);
  return (
    <div className="space-y-6 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Settings</h2>
        <Button variant="ghost" size="sm" onClick={resetConfig}>
          <RotateCcw /> Reset
        </Button>
      </div>
      <TypeToggle />
      <Tabs defaultValue="stroke">
        <TabsList className="w-full">
          <TabsTrigger value="stroke">Stroke</TabsTrigger>
          <TabsTrigger value="fill">Fill</TabsTrigger>
        </TabsList>
        <TabsContent value="stroke" className="pt-3">
          <ChannelControls channel="stroke" />
        </TabsContent>
        <TabsContent value="fill" className="pt-3">
          <ChannelControls channel="fill" />
        </TabsContent>
      </Tabs>
      <BackgroundField />
    </div>
  );
}
