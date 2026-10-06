"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardPaste, RefreshCw, TriangleAlert, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_DATA_BYTES, type ColumnType } from "../engine";
import { samples } from "../samples";
import { useChartStore } from "../store";
import { ChartThumb } from "./chart-thumbs";
import { Panel, selectClassName, TypeIcon, typeNames } from "./parts";
import { cn } from "@/lib/utils";

const PREVIEW_ROWS = 100;
const ACCEPT = ".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,application/json,text/plain";

async function loadFile(file: File | undefined) {
  const { loadText, setError } = useChartStore.getState();
  if (!file) return;
  if (file.size > MAX_DATA_BYTES) return setError("That file is larger than 10 MB.");
  if (/\.(xlsx?|numbers|ods)$/i.test(file.name)) {
    return setError("Spreadsheet files can't be read directly. Export the sheet as CSV, or copy the cells and paste them here.");
  }
  loadText(await file.text(), file.name.replace(/\.[^.]+$/, ""));
}

function DataInput() {
  const loadText = useChartStore((s) => s.loadText);
  const loadSample = useChartStore((s) => s.loadSample);
  const source = useChartStore((s) => s.source);
  const [text, setText] = useState(source?.sampleId ? "" : (source?.text ?? ""));
  const [pasting, setPasting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // A file picked before hydration never fired React's onChange; load it now.
  useEffect(() => {
    const pending = inputRef.current?.files?.[0];
    if (!pending) return;
    queueMicrotask(() => {
      void loadFile(pending);
      if (inputRef.current) inputRef.current.value = "";
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        {/* Drop zone: the whole card is a button that opens the file picker. */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void loadFile(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors outline-none hover:border-(--tone) hover:bg-(--tone-soft) focus-visible:ring-3 focus-visible:ring-ring/50",
            dragging && "border-(--tone) bg-(--tone-soft)",
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-(--tone-soft) text-(--tone-fg)">
            <Upload className="size-6" aria-hidden />
          </span>
          <span>
            <span className="block font-medium">{dragging ? "Drop it!" : "Upload a file"}</span>
            <span className="block text-xs text-muted-foreground">CSV · TSV · JSON</span>
          </span>
        </button>
        <input
          ref={inputRef}
          data-testid="data-file-input"
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            void loadFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {pasting ? (
          <div className="flex min-h-40 flex-col gap-2">
            <label htmlFor="data-paste" className="sr-only">
              Paste data
            </label>
            <Textarea
              id="data-paste"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              placeholder={"name,value\nApples,12\nPears,7"}
              className="min-h-28 flex-1 resize-y font-mono text-xs"
            />
            <Button onClick={() => loadText(text, "Pasted data")} disabled={!text.trim()}>
              Use this data
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPasting(true)}
            className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors outline-none hover:border-(--tone) hover:bg-(--tone-soft) focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-(--tone-soft) text-(--tone-fg)">
              <ClipboardPaste className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block font-medium">Paste data</span>
              <span className="block text-xs text-muted-foreground">From Excel, Sheets or text</span>
            </span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Or start from a sample</h3>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {samples.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => loadSample(s.id)}
                title={s.description}
                className="flex w-full flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors outline-none hover:border-(--tone) hover:bg-(--tone-soft) focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ChartThumb id={s.chart} className="text-(--tone-fg)" />
                <span className="text-xs font-medium">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DataTable() {
  const dataset = useChartStore((s) => s.dataset)!;
  const setColumnType = useChartStore((s) => s.setColumnType);
  const raw = useChartStore((s) => s.raw)!;
  const rows = raw.cells.slice(0, PREVIEW_ROWS);

  return (
    <div className="max-h-96 overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-muted">
          <tr>
            {dataset.columns.map((c) => (
              <th key={c.name} scope="col" className="min-w-32 border-b px-2 py-1.5 text-left align-top font-medium">
                <div className="flex items-center gap-1.5">
                  <TypeIcon type={c.type} />
                  <span className="truncate" title={c.name}>
                    {c.name}
                  </span>
                </div>
                <select
                  aria-label={`Type of ${c.name}`}
                  title="Detected automatically; change it if it looks wrong"
                  value={c.type}
                  onChange={(e) => setColumnType(c.name, e.target.value as ColumnType)}
                  className={cn(selectClassName, "mt-1 h-7 text-xs font-normal")}
                >
                  {(Object.keys(typeNames) as ColumnType[]).map((t) => (
                    <option key={t} value={t}>
                      {typeNames[t]}
                    </option>
                  ))}
                </select>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((cell, j) => {
                const c = dataset.columns[j];
                const invalid = cell !== "" && dataset.rows[i][c.name] === null;
                return (
                  <td
                    key={j}
                    title={invalid ? `Not a valid ${typeNames[c.type].toLowerCase()}; it will be treated as empty` : undefined}
                    className={cn(
                      "max-w-60 truncate px-2 py-1 whitespace-nowrap",
                      c.type !== "string" && "text-right tabular-nums",
                      invalid && "bg-destructive/10 text-destructive",
                    )}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataStep() {
  const source = useChartStore((s) => s.source);
  const dataset = useChartStore((s) => s.dataset);
  const error = useChartStore((s) => s.error);
  const setError = useChartStore((s) => s.setError);
  const clearData = useChartStore((s) => s.clearData);
  const [replacing, setReplacing] = useState(false);
  const showInput = !dataset || replacing;

  // Leave replace mode once new data loads.
  const loadedText = source?.text;
  const [seenText, setSeenText] = useState(loadedText);
  if (loadedText !== seenText) {
    setSeenText(loadedText);
    setReplacing(false);
  }

  return (
    <Panel
      title={dataset && !replacing ? (source?.name ?? "Your data") : "Add your data"}
      aside={
        dataset && (
          <div className="flex items-center gap-1">
            {!replacing && (
              <span className="mr-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                {dataset.rows.length.toLocaleString()} × {dataset.columns.length}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => setReplacing(!replacing)}>
              {replacing ? (
                "Cancel"
              ) : (
                <>
                  <RefreshCw /> Replace
                </>
              )}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={clearData} aria-label="Remove data" title="Remove data">
              <X />
            </Button>
          </div>
        )
      }
      next={dataset && !replacing ? { label: "Choose a chart" } : undefined}
    >
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="flex-1">{error}</p>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="shrink-0">
            <X className="size-4" />
          </button>
        </div>
      )}
      {showInput ? <DataInput /> : <DataTable />}
    </Panel>
  );
}

