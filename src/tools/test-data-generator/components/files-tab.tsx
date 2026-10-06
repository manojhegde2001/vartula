"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileWarning, LoaderCircle, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadBlob, downloadZip } from "@/lib/download";
import { formatSize, sizeTag, toBytes as sizeToBytes, sizeUnits, type SizeBase, type SizeUnit } from "../engine/sizes";
import { extOf, fileGroups, fileTypes, isImage, maxSize, type FileTypeId } from "../lib/file-types";
import type { FileOptions } from "../lib/files";
import { Card, Chip, Field, inputClassName, NumberInput, ProgressBar, Segmented, selectClassName } from "./parts";
import { cn } from "@/lib/utils";

const sizePresets: [number, SizeUnit][] = [
  [100, "KB"],
  [500, "KB"],
  [1, "MB"],
  [2, "MB"],
  [5, "MB"],
  [10, "MB"],
  [25, "MB"],
  [50, "MB"],
  [100, "MB"],
  [1, "GB"],
];

const dimensionPresets = [
  [640, 480],
  [1080, 1080],
  [1280, 720],
  [1920, 1080],
  [3840, 2160],
] as const;

const defaultOptions: FileOptions = {
  width: 1280,
  height: 720,
  pattern: "card",
  autoFit: true,
  pages: 3,
  pageSize: "a4",
  tone: "sine",
  seconds: 5,
  content: "random",
};

function TypePicker({ value, onChange }: { value: FileTypeId; onChange: (t: FileTypeId) => void }) {
  return (
    <div className="space-y-3" role="radiogroup" aria-label="File type">
      {fileGroups.map((g) => (
        <div key={g} className="space-y-1.5">
          <h3 className="text-xs font-medium text-muted-foreground">{g}</h3>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(fileTypes) as FileTypeId[])
              .filter((t) => fileTypes[t].group === g)
              .map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={value === t}
                  onClick={() => onChange(t)}
                  className={cn(
                    "h-8 min-w-14 rounded-lg border px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    value === t ? "border-(--tone) bg-(--tone) text-white shadow-sm" : "hover:border-(--tone-muted) hover:bg-(--tone-soft)",
                  )}
                >
                  {fileTypes[t].label}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EdgeFiles() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<typeof import("../engine/files/edge-files").edgeFiles | null>(null);

  useEffect(() => {
    void import("../engine/files/edge-files").then((m) => setList(m.edgeFiles));
  }, []);

  const one = async (id: string) => {
    const f = list?.find((x) => x.id === id);
    if (!f) return;
    setBusy(id);
    setError(null);
    try {
      downloadBlob(new Blob([(await f.build()) as Uint8Array<ArrayBuffer>]), f.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't build that file.");
    } finally {
      setBusy(null);
    }
  };

  const all = async () => {
    if (!list) return;
    setBusy("all");
    setError(null);
    try {
      const files = [];
      for (const f of list) files.push({ name: f.name, blob: new Blob([(await f.build()) as Uint8Array<ArrayBuffer>]) });
      await downloadZip(files, "problem-files.zip");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't build the ZIP.");
    } finally {
      setBusy(null);
    }
  };

  const groups = ["Broken", "Mismatched", "Names", "Security", "Encoding"] as const;
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <FileWarning className="size-4 text-(--tone-fg)" aria-hidden /> Problem files
        </span>
      }
      aside={
        <Button variant="outline" size="sm" disabled={!list || busy !== null} onClick={() => void all()}>
          {busy === "all" ? <LoaderCircle className="animate-spin" /> : <Download />} All as ZIP
        </Button>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">Files that upload forms, parsers and scanners often mishandle. All are harmless.</p>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g} className="space-y-1.5">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{g}</h3>
            <ul className="divide-y rounded-lg border">
              {list
                ?.filter((f) => f.group === g)
                .map((f) => (
                  <li key={f.id} className="flex items-start gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground" title={f.name}>
                        {f.name}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label={`Download ${f.label}`} disabled={busy !== null} onClick={() => void one(f.id)}>
                      {busy === f.id ? <LoaderCircle className="animate-spin" /> : <Download />}
                    </Button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function FilesTab() {
  const [type, setType] = useState<FileTypeId>("png");
  const [amount, setAmount] = useState(5);
  const [unit, setUnit] = useState<SizeUnit>("MB");
  const [base, setBase] = useState<SizeBase>(1024);
  const [offset, setOffset] = useState(0);
  const [o, setO] = useState<FileOptions>(defaultOptions);
  const [count, setCount] = useState(1);
  const [customName, setCustomName] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ value: number; label: string } | null>(null);
  const [result, setResult] = useState<{ text: string; note?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const target = Math.max(0, sizeToBytes(amount, unit, base) + offset);
  const ext = extOf(type);
  const autoName = `test-${sizeTag(sizeToBytes(amount, unit, base), base)}${offset ? (offset > 0 ? `+${offset}B` : `${offset}B`) : ""}.${ext}`;
  const name = customName ?? autoName;
  const tooBig = target > maxSize(type);
  const set = (patch: Partial<FileOptions>) => setO((prev) => ({ ...prev, ...patch }));

  const generate = async () => {
    setError(null);
    setResult(null);
    abort.current = new AbortController();
    const signal = abort.current.signal;
    try {
      const [{ generateFile }, { saveParts, partsToBlob, BLOB_LIMIT }] = await Promise.all([import("../lib/files"), import("../lib/save")]);
      const label = `${formatSize(target, base)} ${fileTypes[type].label}`;
      if (count === 1) {
        setProgress({ value: 0, label: "Building…" });
        const g = await generateFile(type, target, o, label, 1, (f) => setProgress({ value: f * 0.5, label: "Encoding video…" }));
        const saved = await saveParts(g.parts, name, fileTypes[type].mime, (done) => setProgress({ value: done / Math.max(1, target), label: `Writing ${formatSize(done, base)} of ${formatSize(target, base)}` }), signal);
        if (saved) setResult({ text: `Saved ${name}: ${target.toLocaleString()} bytes.`, note: g.note });
      } else {
        if (target * count > BLOB_LIMIT) throw new Error(`A batch is limited to ${BLOB_LIMIT / 1024 / 1024} MB in total; lower the count or size.`);
        const files: { name: string; blob: Blob }[] = [];
        const stem = name.replace(/\.[^.]+$/, "");
        let note: string | undefined;
        for (let i = 0; i < count; i++) {
          if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
          setProgress({ value: i / count, label: `File ${i + 1} of ${count}` });
          const g = await generateFile(type, target, o, `${label} #${i + 1}`, i + 1);
          note ??= g.note;
          files.push({ name: `${stem}-${String(i + 1).padStart(3, "0")}.${ext}`, blob: await partsToBlob(g.parts, fileTypes[type].mime) });
        }
        setProgress({ value: 1, label: "Zipping…" });
        await downloadZip(files, `${stem}-x${count}.zip`);
        setResult({ text: `Saved ${count} files of ${target.toLocaleString()} bytes each in a ZIP.`, note });
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) setError(err instanceof Error ? err.message : "Couldn't create the file.");
    } finally {
      setProgress(null);
      abort.current = null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="File type">
          <TypePicker
            value={type}
            onChange={(t) => {
              setType(t);
              setResult(null);
              setError(null);
            }}
          />

          <div className="mt-5 grid gap-4 border-t pt-4 sm:grid-cols-2">
            {(isImage(type) || type === "mp4") && (
              <>
                <Field label="Dimensions (pixels)">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <NumberInput aria-label="Width" value={o.width} onCommit={(width) => set({ width })} min={1} max={type === "mp4" ? 3840 : 16384} />
                    <span className="text-muted-foreground">×</span>
                    <NumberInput aria-label="Height" value={o.height} onCommit={(height) => set({ height })} min={1} max={type === "mp4" ? 2160 : 16384} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dimensionPresets.map(([w, h]) => (
                      <Chip key={`${w}x${h}`} active={o.width === w && o.height === h} onClick={() => set({ width: w, height: h })}>
                        {w}×{h}
                      </Chip>
                    ))}
                  </div>
                </Field>
                {isImage(type) && type !== "svg" && (
                  <Field label="Picture">
                    <Segmented
                      label="Picture"
                      value={o.pattern}
                      onChange={(pattern) => set({ pattern })}
                      options={[
                        { value: "card", label: "Test card" },
                        { value: "gradient", label: "Gradient" },
                        { value: "noise", label: "Noise", title: "Random pixels: barely compressible" },
                        { value: "solid", label: "Solid" },
                      ]}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={o.autoFit} onChange={(e) => set({ autoFit: e.target.checked })} className="accent-(--tone)" />
                      Shrink dimensions if the size is too small
                    </label>
                  </Field>
                )}
                {type === "mp4" && (
                  <Field label="Duration" htmlFor="tdg-seconds" hint="seconds, 30 fps">
                    <NumberInput id="tdg-seconds" value={o.seconds} onCommit={(seconds) => set({ seconds })} min={1} max={60} />
                  </Field>
                )}
              </>
            )}
            {type === "pdf" && (
              <>
                <Field label="Pages" htmlFor="tdg-pages">
                  <NumberInput id="tdg-pages" value={o.pages} onCommit={(pages) => set({ pages })} min={1} max={500} />
                </Field>
                <Field label="Page size">
                  <Segmented
                    label="Page size"
                    value={o.pageSize}
                    onChange={(pageSize) => set({ pageSize })}
                    options={[
                      { value: "a4", label: "A4" },
                      { value: "letter", label: "Letter" },
                    ]}
                  />
                </Field>
              </>
            )}
            {type === "wav" && (
              <Field label="Sound" hint={`≈ ${(Math.max(0, target - 44) / 44_100).toFixed(1)} s, 8-bit mono`}>
                <Segmented
                  label="Sound"
                  value={o.tone}
                  onChange={(tone) => set({ tone })}
                  options={[
                    { value: "sine", label: "Tone (441 Hz)" },
                    { value: "silence", label: "Silence" },
                    { value: "noise", label: "Noise" },
                  ]}
                />
              </Field>
            )}
            {(type === "zip" || type === "bin") && (
              <Field label="Content">
                <Segmented
                  label="Content"
                  value={o.content}
                  onChange={(content) => set({ content })}
                  options={[
                    { value: "random", label: "Random", title: "Incompressible bytes" },
                    { value: "zeros", label: "Zeros", title: "Compresses to almost nothing" },
                    { value: "text", label: "Text" },
                  ]}
                />
              </Field>
            )}
            {["docx", "xlsx", "txt", "csv", "json", "xml", "html", "md", "log"].includes(type) && (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Filled with realistic {type === "xlsx" ? "rows" : type === "docx" ? "paragraphs" : "content"} up to the exact size, and always a valid {fileTypes[type].label} file.
              </p>
            )}
          </div>
        </Card>

        <aside className="h-fit space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-20">
          <Field label="Exact size" hint={`${target.toLocaleString()} bytes`}>
            <div className="flex gap-2">
              <NumberInput
                aria-label="Size"
                value={amount}
                onCommit={(n) => {
                  setAmount(n);
                  setOffset(0);
                }}
                min={0}
              />
              <select
                aria-label="Unit"
                className={cn(selectClassName, "w-20")}
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value as SizeUnit);
                  setOffset(0);
                }}
              >
                {sizeUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sizePresets.map(([n, u]) => (
                <Chip
                  key={`${n}${u}`}
                  active={amount === n && unit === u && offset === 0}
                  onClick={() => {
                    setAmount(n);
                    setUnit(u);
                    setOffset(0);
                  }}
                >
                  {n} {u}
                </Chip>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setOffset(offset - 1)} title="One byte under the limit">
                <Minus /> 1 byte
              </Button>
              <Button variant="outline" size="sm" onClick={() => setOffset(offset + 1)} title="One byte over the limit">
                <Plus /> 1 byte
              </Button>
              {offset !== 0 && (
                <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setOffset(0)}>
                  reset
                </button>
              )}
            </div>
          </Field>
          <Field label="1 KB means">
            <Segmented
              label="1 KB means"
              value={String(base)}
              onChange={(v) => setBase(Number(v) as SizeBase)}
              options={[
                { value: "1024", label: "1,024 bytes", title: "Binary units, as servers count (nginx, PHP, most upload limits)" },
                { value: "1000", label: "1,000 bytes", title: "Decimal units, as macOS and disk makers count" },
              ]}
            />
          </Field>
          <div className="grid grid-cols-[1fr_5.5rem] gap-2">
            <Field label="File name" htmlFor="tdg-name">
              <input id="tdg-name" className={cn(inputClassName, "font-mono text-xs")} value={name} onChange={(e) => setCustomName(e.target.value || null)} />
            </Field>
            <Field label="How many" htmlFor="tdg-count">
              <NumberInput id="tdg-count" value={count} onCommit={setCount} min={1} max={100} />
            </Field>
          </div>

          <div className="space-y-2 border-t pt-4">
            {progress ? (
              <>
                <ProgressBar value={progress.value} label={progress.label} />
                <Button variant="outline" className="w-full" onClick={() => abort.current?.abort()}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button className="w-full" disabled={tooBig} onClick={() => void generate()}>
                <Download /> {count > 1 ? `Generate ${count} files (ZIP)` : `Generate ${fileTypes[type].label}`}
              </Button>
            )}
            {tooBig && <p className="text-sm text-destructive">{fileTypes[type].label} files can be at most {formatSize(maxSize(type), base)} here.</p>}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {result && (
              <div role="status" className="rounded-lg bg-(--tone-soft) px-3 py-2 text-sm text-(--tone-fg)">
                {result.text}
                {result.note && <span className="block text-xs">{result.note}</span>}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Every file is valid and opens normally; the extra size is padding the format ignores. Files over 200 MB stream straight to disk in Chrome and Edge.
            </p>
          </div>
        </aside>
      </div>

      <EdgeFiles />
    </div>
  );
}
