"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Dices, Download, Link2, LoaderCircle, Plus, Settings2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadBlob } from "@/lib/download";
import { fieldGroups, fieldTypes, type FieldType, type FieldTypeId, type OptionDef, type Row, type Value } from "../engine/fields";
import { dataFormats, formatInfo, type DataFormat } from "../engine/formats";
import { locales, type LocaleId } from "../engine/locales";
import { presets, type FieldSpec } from "../engine/records";
import { formatSize } from "../engine/sizes";
import type { DataSpec } from "../lib/data-client";
import { encodeShare, MAX_ROWS, useDataStore } from "../store";
import { Card, Chip, CopyButton, Field, inputClassName, NumberInput, ProgressBar, Segmented, selectClassName } from "./parts";
import { cn } from "@/lib/utils";

const rowPresets = [10, 100, 1000, 10_000, 100_000, 1_000_000];
const compact = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : n >= 1000 ? `${n / 1000}k` : String(n));

const typesByGroup = fieldGroups.map((g) => ({
  group: g,
  types: (Object.entries(fieldTypes) as [FieldTypeId, FieldType][]).filter(([, t]) => t.group === g),
}));

function OptionInput({ def, value, onChange, id }: { def: OptionDef; value: string | number; onChange: (v: string | number) => void; id: string }) {
  if (def.kind === "select") {
    return (
      <select id={id} className={selectClassName} value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {def.choices.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
    );
  }
  if (def.kind === "number") return <NumberInput id={id} value={Number(value)} onCommit={onChange} min={def.min} max={def.max} />;
  return (
    <input
      id={id}
      type={def.kind === "date" ? "date" : "text"}
      className={cn(inputClassName, def.kind === "text" && "font-mono text-xs")}
      value={String(value)}
      placeholder={def.kind === "text" ? def.placeholder : undefined}
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function FieldRow({ f, index, total, duplicate }: { f: FieldSpec; index: number; total: number; duplicate: boolean }) {
  const updateField = useDataStore((s) => s.updateField);
  const setFieldType = useDataStore((s) => s.setFieldType);
  const removeField = useDataStore((s) => s.removeField);
  const moveField = useDataStore((s) => s.moveField);
  const [open, setOpen] = useState(false);
  const type = fieldTypes[f.type] as FieldType;
  const defs = type.options ?? [];

  return (
    <li className="rounded-lg border bg-background" data-testid="field-row">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto_auto]">
        <input
          aria-label={`Name of field ${index + 1}`}
          value={f.name}
          spellCheck={false}
          onChange={(e) => updateField(f.id, { name: e.target.value })}
          className={cn(inputClassName, "font-mono text-xs", (duplicate || !f.name.trim()) && "border-destructive")}
        />
        <select aria-label={`Type of ${f.name}`} className={selectClassName} value={f.type} onChange={(e) => setFieldType(f.id, e.target.value as FieldTypeId)}>
          {typesByGroup.map(({ group, types }) => (
            <optgroup key={group} label={group}>
              {types.map(([id, t]) => (
                <option key={id} value={id}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <label className="hidden items-center gap-1 text-xs whitespace-nowrap text-muted-foreground sm:flex" title="Percent of rows left empty (null)">
          <NumberInput aria-label={`Percent blank for ${f.name}`} value={f.blank} onCommit={(blank) => updateField(f.id, { blank })} min={0} max={100} className="h-7 w-12 px-1.5 text-xs" />
          % blank
        </label>
        <div className="flex items-center">
          <Button
            variant={open ? "secondary" : "ghost"}
            size="icon-sm"
            aria-expanded={open}
            aria-label={`Options for ${f.name}`}
            title="Options"
            onClick={() => setOpen(!open)}
            className={cn((defs.length > 0 || f.unique || f.list > 0 || f.blank > 0) && !open && "text-(--tone-fg)")}
          >
            <Settings2 />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Remove ${f.name}`} onClick={() => removeField(f.id)}>
            <X />
          </Button>
        </div>
      </div>
      {open && (
        <div className="grid gap-3 border-t bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {defs.map((d) => (
            <Field key={d.key} label={d.label} htmlFor={`${f.id}-${d.key}`}>
              <OptionInput id={`${f.id}-${d.key}`} def={d} value={f.options[d.key] ?? d.default} onChange={(v) => updateField(f.id, { options: { ...f.options, [d.key]: v } })} />
            </Field>
          ))}
          <Field label="Blank (null) rows" htmlFor={`${f.id}-blank`} hint="%">
            <NumberInput id={`${f.id}-blank`} value={f.blank} onCommit={(blank) => updateField(f.id, { blank })} min={0} max={100} />
          </Field>
          <Field label="List of up to" htmlFor={`${f.id}-list`} hint="0 = single value">
            <NumberInput id={`${f.id}-list`} value={f.list} onCommit={(list) => updateField(f.id, { list })} min={0} max={20} />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex h-8 items-center gap-2 text-sm">
              <input type="checkbox" checked={f.unique} onChange={(e) => updateField(f.id, { unique: e.target.checked })} className="accent-(--tone)" />
              Unique values
            </label>
            <span className="ml-auto flex">
              <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => moveField(f.id, -1)}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={index === total - 1} onClick={() => moveField(f.id, 1)}>
                <ArrowDown />
              </Button>
            </span>
          </div>
        </div>
      )}
    </li>
  );
}

function cellText(v: Value): string {
  if (v === null) return "null";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function Preview({ spec }: { spec: DataSpec }) {
  const [view, setView] = useState<"table" | "output">("table");
  const [result, setResult] = useState<{ rows: Row[]; text: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const key = JSON.stringify(spec);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      setBusy(true);
      void import("../lib/data-client")
        .then((m) => m.preview(JSON.parse(key) as DataSpec))
        .then((r) => live && setResult(r))
        .catch((err: Error) => live && setResult({ rows: [], text: "", error: err.message }))
        .finally(() => live && setBusy(false));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [key]);

  const names = spec.fields.map((f) => f.name);
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          Preview {busy && <LoaderCircle className="size-4 animate-spin text-muted-foreground" aria-label="Updating" />}
        </span>
      }
      aside={
        <Segmented
          label="Preview as"
          value={view}
          onChange={setView}
          options={[
            { value: "table", label: "Table" },
            { value: "output", label: formatInfo(spec.format.format).label },
          ]}
          className="w-48"
        />
      }
    >
      {result?.error ? (
        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <TriangleAlert className="size-4" /> {result.error}
        </p>
      ) : view === "table" ? (
        <div className="max-h-[28rem] overflow-auto rounded-lg border">
          <table className="w-full text-left text-xs" data-testid="preview-table">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {names.map((n, i) => (
                  <th key={i} scope="col" className="px-2 py-1.5 font-mono font-medium whitespace-nowrap">
                    {n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {result?.rows.map((r, i) => (
                <tr key={i}>
                  {names.map((n, j) => (
                    <td key={j} className={cn("max-w-56 truncate px-2 py-1 whitespace-nowrap", r[n] === null && "text-muted-foreground italic")} title={cellText(r[n] ?? null)}>
                      {cellText(r[n] ?? null)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <pre className="max-h-[28rem] overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed" data-testid="preview-output">
            {result?.text}
          </pre>
          {result && (
            <div className="absolute top-2 right-2">
              <CopyButton text={result.text} label="Copy preview" />
            </div>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">First {Math.min(20, spec.count)} rows. Downloads use the same seed, so they start with exactly these rows.</p>
    </Card>
  );
}

export function DataTab() {
  const s = useDataStore();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const spec: DataSpec = { fields: s.fields.filter((f) => f.name.trim()), count: s.count, format: s.format, locale: s.locale, seed: s.seed };
  const names = s.fields.map((f) => f.name.trim());
  const dupes = new Set(names.filter((n, i) => n && names.indexOf(n) !== i));
  const fmt = s.format.format;
  const ext = formatInfo(fmt).ext;
  const filename = `${(s.format.table || "data").replace(/[^\w.-]+/g, "-")}.${ext}`;

  const run = async (then: (blob: Blob) => Promise<void> | void) => {
    setError(null);
    setNotice(null);
    abort.current = new AbortController();
    setProgress(0);
    try {
      const { generate } = await import("../lib/data-client");
      const blob = await generate(spec, (done, total) => setProgress(done / total), abort.current.signal);
      await then(blob);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setProgress(null);
      abort.current = null;
    }
  };

  const share = async () => {
    const url = `${location.origin}${location.pathname}#data=${encodeShare(s)}`;
    history.replaceState(null, "", url);
    await navigator.clipboard.writeText(url);
    setNotice("Link copied. It contains the schema and settings, not the data.");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <Card
          title={`Fields (${s.fields.length})`}
          aside={
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Template</span>
              <select aria-label="Start from a template" className={cn(selectClassName, "w-40")} value={s.presetId} onChange={(e) => s.loadPreset(e.target.value)}>
                {s.presetId === "" && <option value="">Custom</option>}
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          <ol className="space-y-2">
            {s.fields.map((f, i) => (
              <FieldRow key={f.id} f={f} index={i} total={s.fields.length} duplicate={dupes.has(f.name.trim())} />
            ))}
          </ol>
          {dupes.size > 0 && <p className="mt-2 text-xs text-destructive">Field names must be unique: {[...dupes].join(", ")}.</p>}
          <Button variant="outline" className="mt-3 w-full border-dashed" onClick={s.addField}>
            <Plus /> Add field
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Use dots to nest values in JSON, YAML and XML, e.g. <code className="font-mono">address.city</code>. Templates can reuse earlier fields with{" "}
            <code className="font-mono">{"{{first_name}}"}</code>.
          </p>
        </Card>
        <Preview spec={spec} />
      </div>

      <aside className="h-fit space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-20">
        <Field label="Rows" htmlFor="tdg-rows" hint={`max ${compact(MAX_ROWS)}`}>
          <NumberInput id="tdg-rows" value={s.count} onCommit={s.setCount} min={1} max={MAX_ROWS} />
          <div className="flex flex-wrap gap-1.5">
            {rowPresets.map((n) => (
              <Chip key={n} active={s.count === n} onClick={() => s.setCount(n)}>
                {compact(n)}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Format">
          <Segmented
            label="Format"
            value={fmt}
            onChange={(format: DataFormat) => s.setFormat({ format })}
            options={dataFormats.map((d) => ({ value: d.id, label: d.label }))}
            className="grid grid-cols-4"
          />
        </Field>

        {(fmt === "sql" || fmt === "xml" || fmt === "ts") && (
          <Field label={fmt === "sql" ? "Table name" : fmt === "xml" ? "Root element" : "Variable name"} htmlFor="tdg-table">
            <input id="tdg-table" className={cn(inputClassName, "font-mono text-xs")} value={s.format.table} onChange={(e) => s.setFormat({ table: e.target.value })} />
          </Field>
        )}
        {fmt === "sql" && (
          <>
            <Segmented
              label="SQL dialect"
              value={s.format.dialect}
              onChange={(dialect) => s.setFormat({ dialect })}
              options={[
                { value: "postgres", label: "PostgreSQL" },
                { value: "mysql", label: "MySQL" },
                { value: "sqlite", label: "SQLite" },
              ]}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={s.format.createTable} onChange={(e) => s.setFormat({ createTable: e.target.checked })} className="accent-(--tone)" />
              Include CREATE TABLE
            </label>
          </>
        )}
        {(fmt === "csv" || fmt === "tsv") && (
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={s.format.header} onChange={(e) => s.setFormat({ header: e.target.checked })} className="accent-(--tone)" />
              Header row
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={s.format.bom} onChange={(e) => s.setFormat({ bom: e.target.checked })} className="accent-(--tone)" />
              Add BOM (for Excel)
            </label>
          </div>
        )}
        {(fmt === "json" || fmt === "ts") && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.format.pretty} onChange={(e) => s.setFormat({ pretty: e.target.checked })} className="accent-(--tone)" />
            Pretty-print
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Locale" htmlFor="tdg-locale">
            <select id="tdg-locale" className={selectClassName} value={s.locale} onChange={(e) => s.setLocale(e.target.value as LocaleId)}>
              {locales.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Seed" htmlFor="tdg-seed">
            <div className="flex gap-1">
              <NumberInput id="tdg-seed" value={s.seed} onCommit={s.setSeed} min={0} />
              <Button variant="outline" size="icon" aria-label="New random seed" title="New random seed" onClick={s.reseed}>
                <Dices />
              </Button>
            </div>
          </Field>
        </div>

        <div className="space-y-2 border-t pt-4">
          {progress !== null ? (
            <>
              <ProgressBar value={progress} label={`Generating… ${Math.round(progress * s.count).toLocaleString()} of ${s.count.toLocaleString()} rows`} />
              <Button variant="outline" className="w-full" onClick={() => abort.current?.abort()}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full" disabled={spec.fields.length === 0 || dupes.size > 0} onClick={() => void run((blob) => downloadBlob(blob, filename))}>
                <Download /> Download {s.count.toLocaleString()} rows as {formatInfo(fmt).label}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  disabled={spec.fields.length === 0 || dupes.size > 0 || s.count > 10_000}
                  title={s.count > 10_000 ? "Copying is limited to 10,000 rows; download larger sets." : undefined}
                  onClick={() =>
                    void run(async (blob) => {
                      await navigator.clipboard.writeText(await blob.text());
                      setNotice(`Copied ${s.count.toLocaleString()} rows (${formatSize(blob.size)}).`);
                    })
                  }
                >
                  Copy
                </Button>
                <Button variant="outline" onClick={() => void share()}>
                  <Link2 /> Share link
                </Button>
              </div>
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
          <p className="text-xs text-muted-foreground">
            Generated on your device. Card numbers, IBANs and IDs pass format checks but belong to no one.
            {s.fields.some((f) => f.type === "email" && f.options.domain === "") && " Emails use real providers' domains; prefer example.com so test mail can't reach real people."}
          </p>
        </div>
      </aside>
    </div>
  );
}

