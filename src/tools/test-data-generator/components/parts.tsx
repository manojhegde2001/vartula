"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Native <select> styled like components/ui/select. */
export const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

export const inputClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30";

export function Card({ title, aside, children, className }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <h2 className="min-w-0 flex-1 text-base font-semibold tracking-tight">{title}</h2>
        {aside}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Pill-style radio group for short choices. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-1 rounded-lg bg-muted p-1", className)}>
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
            "flex h-7 min-w-0 flex-1 items-center justify-center gap-1.5 truncate rounded-md px-2 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-40 [&_svg]:size-3.5 [&_svg]:shrink-0",
            value === o.value ? "bg-background font-medium shadow-sm" : "text-muted-foreground enabled:hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Round chip that acts as a toggle or preset button. */
export function Chip({ active, children, ...props }: { active?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={cn(
        "h-7 rounded-full border px-2.5 text-xs whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "border-(--tone) bg-(--tone-soft) font-medium text-(--tone-fg)" : "text-muted-foreground hover:border-(--tone-muted) hover:text-foreground",
        props.className,
      )}
    >
      {children}
    </button>
  );
}

export function CopyButton({ text, label = "Copy", size = "icon-sm" }: { text: string | (() => string); label?: string; size?: "icon-sm" | "icon-xs" | "sm" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(typeof text === "function" ? text() : text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <Button variant="ghost" size={size} aria-label={size === "sm" ? undefined : label} title={label} onClick={() => void copy()}>
      {copied ? <Check className="text-(--tone-fg)" /> : <Copy />}
      {size === "sm" && (copied ? "Copied" : label)}
    </Button>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="space-y-1.5">
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

/** Number box that commits on blur or Enter, so typing "1000" doesn't regenerate at 1, 10 and 100 first. */
export function NumberInput({
  value,
  onCommit,
  min,
  max,
  className,
  ...props
}: { value: number; onCommit: (n: number) => void; min?: number; max?: number } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "min" | "max">) {
  const [draft, setDraft] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setDraft(String(value));
  }
  const commit = () => {
    let n = Number(draft.replace(/[,_\s]/g, ""));
    if (!Number.isFinite(n)) n = value;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    setDraft(String(n));
    if (n !== value) onCommit(n);
  };
  return (
    <input
      inputMode="decimal"
      {...props}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className={cn(inputClassName, "tabular-nums", className)}
    />
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1" role="progressbar" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-(--tone) transition-[width]" style={{ width: `${Math.max(2, value * 100)}%` }} />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">{label}</p>
    </div>
  );
}
