"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, Pencil, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_DATA_BYTES, type ColumnType } from "../engine";
import { samples } from "../samples";
import { useChartStore } from "../store";
import { selectClassName, Step, TypeIcon, typeNames } from "./parts";
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
  const [text, setText] = useState(source?.text ?? "");
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="space-y-2">
        <label htmlFor="data-paste" className="text-sm font-medium">
          Paste data
        </label>
        <div
          className="relative"
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
        >
          <Textarea
            id="data-paste"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder={"Paste CSV, TSV or JSON, or cells copied from a spreadsheet\n\ncountry,year,value\nNorway,2024,12.5\n…"}
            className="h-56 resize-y font-mono text-xs"
          />
          {dragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-background/80">
              <p className="flex items-center gap-2 font-medium">
                <FileUp className="size-5" aria-hidden /> Drop the file to load it
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => loadText(text, "Pasted data")} disabled={!text.trim()}>
            Use this data
          </Button>
          <span className="text-sm text-muted-foreground">or</span>
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <FileUp /> Upload a file
          </Button>
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
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Or try a sample</h3>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {samples.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => loadSample(s.id)}
                className="w-full rounded-lg border px-3 py-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="block text-sm font-medium">{s.name}</span>
                <span className="block text-xs text-muted-foreground">{s.description}</span>
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
                  <TypeIcon type={c.type} className="text-muted-foreground" />
                  <span className="truncate" title={c.name}>
                    {c.name}
                  </span>
                </div>
                <select
                  aria-label={`Type of ${c.name}`}
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
  const [editing, setEditing] = useState(false);
  const showInput = !dataset || editing;

  // Leave edit mode once new data loads.
  const loadedText = source?.text;
  const [seenText, setSeenText] = useState(loadedText);
  if (loadedText !== seenText) {
    setSeenText(loadedText);
    setEditing(false);
  }

  return (
    <Step
      number={1}
      title="Load your data"
      description={
        dataset && !editing
          ? `${source?.name} · ${dataset.rows.length.toLocaleString()} rows · ${dataset.columns.length} columns`
          : "CSV, TSV, JSON or spreadsheet cells. Your data stays in your browser."
      }
      aside={
        dataset && (
          <div className="flex gap-1">
            {editing ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil /> Change data
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearData} aria-label="Remove data">
              <X /> <span className="max-sm:hidden">Clear</span>
            </Button>
          </div>
        )
      }
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
      {showInput ? (
        <DataInput key={source?.text ?? ""} />
      ) : (
        <div className="space-y-2">
          <DataTable />
          <p className="text-xs text-muted-foreground">
            {dataset.rows.length > PREVIEW_ROWS && `Showing the first ${PREVIEW_ROWS} rows. `}
            Column types were detected automatically; change one if it looks wrong.
          </p>
        </div>
      )}
    </Step>
  );
}
