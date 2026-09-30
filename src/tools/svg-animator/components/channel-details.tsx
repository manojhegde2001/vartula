"use client";

import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIRECTIONS, easingLabel, easingNames } from "../engine";
import type { Direction, EasingName } from "../engine";
import { useAnimatorStore, type ChannelName } from "../store";
import { TimeField } from "./time-field";

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

/**
 * Delay, stagger, easing and direction in a popover, so the settings panel never changes height.
 * Lazy-loaded by controls.tsx: `trigger` is the button it already renders.
 */
export default function ChannelDetails({
  channel,
  title,
  trigger,
}: {
  channel: ChannelName;
  title: string;
  trigger: React.ReactElement;
}) {
  const cfg = useAnimatorStore((s) => s.config[channel]);
  const update = useAnimatorStore((s) => s.updateChannel);
  const set = (patch: Parameters<typeof update>[1]) => update(channel, patch);

  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent side="left" align="start" sideOffset={12} className="w-80 space-y-4">
        <PopoverTitle className="text-sm">{title}: timing</PopoverTitle>
        <TimeField label="Delay" value={cfg.delay} max={10_000} onChange={(delay) => set({ delay })} />
        <TimeField label="Stagger step" value={cfg.stagger} max={2_000} step={10} onChange={(stagger) => set({ stagger })} />
        <div className="space-y-2">
          <Label className="font-normal">Easing</Label>
          <Select items={easingItems} value={cfg.easing} onValueChange={(v) => v && set({ easing: v as EasingName })}>
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
          <Label className="font-normal">Direction</Label>
          <Select items={directionItems} value={cfg.direction} onValueChange={(v) => v && set({ direction: v as Direction })}>
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
      </PopoverContent>
    </Popover>
  );
}
