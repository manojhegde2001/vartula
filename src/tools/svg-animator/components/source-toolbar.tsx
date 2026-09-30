"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ClipboardPaste, FileUp, Shapes, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MAX_SVG_BYTES } from "../lib/sanitize";
import { samples } from "../samples";
import { useAnimatorStore } from "../store";
import { cn } from "@/lib/utils";

const isSvgFile = (file: File) => file.type === "image/svg+xml" || /\.svg$/i.test(file.name);

/** Validate and load a user-picked or dropped file; problems surface through the store's `error`. */
async function loadSvgFile(file: File | undefined) {
  const { loadMarkup, setError, clearError } = useAnimatorStore.getState();
  if (!file) return;
  if (!isSvgFile(file)) return setError(`“${file.name}” is not an SVG file.`);
  if (file.size > MAX_SVG_BYTES) return setError("That SVG is larger than 5 MB.");
  clearError();
  loadMarkup(await file.text(), file.name.replace(/\.svg$/i, ""));
}

/** Makes its children a drop target for SVG files, with an overlay while dragging. */
export function SvgDropTarget({ children, className }: { children: ReactNode; className?: string }) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      data-testid="dropzone"
      className={cn("relative", className)}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void loadSvgFile(e.dataTransfer.files[0]);
      }}
    >
      {children}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] border-2 border-dashed border-primary bg-background/80 backdrop-blur-sm">
          <p className="flex items-center gap-2 font-medium">
            <FileUp className="size-5" aria-hidden /> Drop SVG to animate it
          </p>
        </div>
      )}
    </div>
  );
}

/** Top bar of the editor: what's loaded, ways to load something else, plus `actions` on the right. */
export function SourceToolbar({ actions }: { actions?: ReactNode }) {
  const loadMarkup = useAnimatorStore((s) => s.loadMarkup);
  const source = useAnimatorStore((s) => s.source);
  const error = useAnimatorStore((s) => s.error);
  const clearError = useAnimatorStore((s) => s.clearError);

  const inputRef = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");

  // A file picked before hydration never fired React's onChange; load it now.
  // (The async read also lands after the editor's default sample, so it wins.)
  useEffect(() => {
    const pending = inputRef.current?.files?.[0];
    if (!pending) return;
    queueMicrotask(() => {
      void loadSvgFile(pending);
      if (inputRef.current) inputRef.current.value = "";
    });
  }, []);

  const shapes = source?.model.elements.length ?? 0;

  return (
    <div className="border-b">
      <div className="flex flex-wrap items-center gap-2 p-2 sm:flex-nowrap">
        <div className="min-w-0 flex-1 px-1.5 text-sm">
          {source ? (
            <p className="truncate">
              <span className="sr-only">Editing </span>
              <span className="font-medium">{source.name}</span>{" "}
              <span className="text-muted-foreground">
                · {shapes} {shapes === 1 ? "shape" : "shapes"}
              </span>
            </p>
          ) : (
            <p className="truncate text-muted-foreground">Loading sample…</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label="Samples" />}>
              <Shapes /> <span className="max-sm:hidden">Samples</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44">
              {samples.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => {
                    clearError();
                    loadMarkup(s.markup, s.name, s.id);
                  }}
                >
                  {s.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" aria-label="Upload SVG" onClick={() => inputRef.current?.click()}>
            <FileUp /> <span className="max-sm:hidden">Upload</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Paste markup"
            onClick={() => {
              clearError();
              setPasteOpen(true);
            }}
          >
            <ClipboardPaste /> <span className="max-sm:hidden">Paste</span>
          </Button>
        </div>

        {actions && (
          <div className="flex items-center gap-1 border-l pl-2 max-sm:ml-auto">{actions}</div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".svg,image/svg+xml"
          className="sr-only"
          aria-label="Upload SVG file"
          data-testid="file-input"
          onChange={(e) => {
            void loadSvgFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {error && !pasteOpen && (
        <div role="alert" className="mx-2 mb-2 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="flex-1">{error}</p>
          <button type="button" aria-label="Dismiss error" onClick={clearError}>
            <X className="size-4" />
          </button>
        </div>
      )}

      <Dialog
        open={pasteOpen}
        onOpenChange={(open) => {
          setPasteOpen(open);
          if (open) clearError();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Paste SVG markup</DialogTitle>
            <DialogDescription>Paste the contents of an .svg file. Scripts and event handlers are removed.</DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="SVG markup"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={'<svg viewBox="0 0 100 100">…</svg>'}
            className="h-64 font-mono text-xs"
            spellCheck={false}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              disabled={!pasted.trim()}
              onClick={() => {
                if (loadMarkup(pasted, "Pasted SVG")) {
                  setPasteOpen(false);
                  setPasted("");
                }
              }}
            >
              Load SVG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
