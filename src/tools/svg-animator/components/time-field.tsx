"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

function SecondsInput({ id, value, step, onChange }: { id: string; value: number; step: number; onChange: (ms: number) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step={step / 1000}
        value={Number((value / 1000).toFixed(3))}
        onChange={(e) => {
          const seconds = parseFloat(e.target.value);
          if (Number.isFinite(seconds)) onChange(Math.max(0, Math.round(seconds * 1000)));
        }}
        className="h-7 w-16 text-right tabular-nums"
      />
      <span className="text-xs text-muted-foreground">s</span>
    </div>
  );
}

/** A seconds value with a slider. `inline` puts label, slider and input on one row. */
export function TimeField({
  label,
  value,
  max,
  step = 50,
  inline,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step?: number;
  inline?: boolean;
  onChange: (ms: number) => void;
}) {
  const id = useId();
  const slider = (
    <Slider
      aria-label={label}
      className={inline ? "flex-1" : undefined}
      min={0}
      max={Math.max(max, value)}
      step={step}
      value={value}
      onValueChange={(v) => onChange(v as number)}
    />
  );
  const labelEl = (
    <Label htmlFor={id} className={cn("font-normal", inline && "w-20 shrink-0")}>
      {label}
    </Label>
  );
  if (inline) {
    return (
      <div className="flex items-center gap-3">
        {labelEl}
        {slider}
        <SecondsInput id={id} value={value} step={step} onChange={onChange} />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        {labelEl}
        <SecondsInput id={id} value={value} step={step} onChange={onChange} />
      </div>
      {slider}
    </div>
  );
}
