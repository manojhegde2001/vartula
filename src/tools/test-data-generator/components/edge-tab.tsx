"use client";

import { useState } from "react";
import { counterstring, edgeCategories, lengths, visible } from "../engine/edge-cases";
import { Card, Chip, CopyButton, Field, inputClassName, NumberInput, Segmented } from "./parts";
import { cn } from "@/lib/utils";

type FillKind = "counter" | "ascii" | "accent" | "emoji";

const fills: Record<FillKind, { label: string; make: (n: number, marker: string) => string; note: string }> = {
  counter: { label: "Counterstring", make: (n, m) => counterstring(n, m || "*"), note: "Each * sits at the position named by the number before it." },
  ascii: { label: "a a a…", make: (n) => "a".repeat(n), note: "Plain ASCII: 1 byte per character." },
  accent: { label: "é é é…", make: (n) => "é".repeat(n), note: "2 bytes per character in UTF-8." },
  emoji: { label: "🙂🙂🙂…", make: (n) => "🙂".repeat(n), note: "N emoji = 2N UTF-16 units and 4N UTF-8 bytes." },
};

function LengthTool() {
  const [length, setLength] = useState(256);
  const [marker, setMarker] = useState("*");
  const [kind, setKind] = useState<FillKind>("counter");
  const value = fills[kind].make(length, marker);
  const l = lengths(value);
  return (
    <Card title="Text of an exact length" aside={<CopyButton text={value} label="Copy text" size="sm" />}>
      <div className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)_6rem]">
        <Field label="Length" htmlFor="tdg-len">
          <NumberInput id="tdg-len" value={length} onCommit={setLength} min={0} max={1_000_000} />
        </Field>
        <Field label="Fill with">
          <Segmented label="Fill with" value={kind} onChange={setKind} options={(Object.keys(fills) as FillKind[]).map((k) => ({ value: k, label: fills[k].label }))} />
        </Field>
        {kind === "counter" && (
          <Field label="Marker" htmlFor="tdg-marker">
            <input id="tdg-marker" maxLength={1} className={cn(inputClassName, "font-mono")} value={marker} onChange={(e) => setMarker(e.target.value)} />
          </Field>
        )}
      </div>
      <pre className="mt-3 max-h-32 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs break-all whitespace-pre-wrap" data-testid="length-output">
        {value.length > 4000 ? `${value.slice(0, 4000)}…` : value}
      </pre>
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
        {fills[kind].note} {l.codePoints.toLocaleString()} characters · {l.utf16.toLocaleString()} UTF-16 units · {l.utf8.toLocaleString()} UTF-8 bytes
      </p>
    </Card>
  );
}

export function EdgeTab() {
  const [cat, setCat] = useState<string>("all");
  const shown = cat === "all" ? edgeCategories : edgeCategories.filter((c) => c.id === cat);

  return (
    <div className="space-y-4">
      <LengthTool />
      <Card
        title="Edge-case strings"
        aside={<CopyButton text={() => JSON.stringify(shown.flatMap((c) => c.cases.map((x) => x.value)), null, 2)} label="Copy as JSON" size="sm" />}
      >
        <div className="mb-4 flex flex-wrap gap-1.5">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>
            All
          </Chip>
          {edgeCategories.map((c) => (
            <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
              {c.label}
            </Chip>
          ))}
        </div>
        <div className="space-y-6">
          {shown.map((c) => (
            <section key={c.id} aria-labelledby={`edge-${c.id}`}>
              <h3 id={`edge-${c.id}`} className="font-medium">
                {c.label}
              </h3>
              <p className="mb-2 text-xs text-muted-foreground">{c.description}</p>
              <ul className="divide-y rounded-lg border">
                {c.cases.map((x, i) => {
                  const l = lengths(x.value);
                  return (
                    <li key={i} className="flex items-center gap-3 px-3 py-1.5">
                      <code className="min-w-0 flex-1 truncate font-mono text-sm" title={visible(x.value)}>
                        {visible(x.value)}
                      </code>
                      <span className="hidden w-64 shrink-0 truncate text-xs text-muted-foreground md:block" title={x.note}>
                        {x.note}
                      </span>
                      <span className="w-24 shrink-0 text-right text-xs text-muted-foreground tabular-nums" title="Characters (code points) · UTF-8 bytes">
                        {l.codePoints} ch · {l.utf8} B
                      </span>
                      <CopyButton text={x.value} label={`Copy: ${x.note}`} size="icon-xs" />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Card>
    </div>
  );
}
