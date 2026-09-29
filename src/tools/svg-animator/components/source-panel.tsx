"use client";

import { useRef, useState } from "react";
import { ClipboardPaste, FileUp, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useAnimatorStore } from "../store";
import { cn } from "@/lib/utils";

const isSvgFile = (file: File) => file.type === "image/svg+xml" || /\.svg$/i.test(file.name);

export function SourcePanel() {
  const loadMarkup = useAnimatorStore((s) => s.loadMarkup);
  const source = useAnimatorStore((s) => s.source);
  const error = useAnimatorStore((s) => s.error);
  const clearError = useAnimatorStore((s) => s.clearError);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);

  const readFile = async (file: File | undefined) => {
    setFileError(null);
    if (!file) return;
    if (!isSvgFile(file)) return setFileError(`“${file.name}” is not an SVG file.`);
    if (file.size > MAX_SVG_BYTES) return setFileError("That SVG is larger than 5 MB.");
    loadMarkup(await file.text(), file.name.replace(/\.svg$/i, ""));
  };

  const shownError = fileError ?? error;

  const openPaste = () => {
    setFileError(null);
    clearError();
    setPasteOpen(true);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void readFile(e.dataTransfer.files[0]);
        }}
        data-testid="dropzone"
        className={cn(
          "flex flex-col items-center justify-between gap-3 rounded-xl border border-dashed p-4 transition-colors sm:flex-row",
          dragging ? "border-primary bg-primary/5" : "bg-muted/30",
        )}
      >
        <div className="flex items-center gap-3 text-sm">
          <FileUp className="size-5 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-medium">Drop an SVG here</p>
            <p className="text-muted-foreground">
              {source ? (
                <>
                  Editing <span className="font-medium text-foreground">{source.name}</span> ·{" "}
                  {source.model.elements.length} {source.model.elements.length === 1 ? "shape" : "shapes"}
                </>
              ) : (
                "Everything stays in your browser."
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <FileUp /> Upload SVG
          </Button>
          <Button variant="outline" size="sm" onClick={openPaste}>
            <ClipboardPaste /> Paste markup
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".svg,image/svg+xml"
          className="sr-only"
          aria-label="Upload SVG file"
          data-testid="file-input"
          onChange={(e) => {
            void readFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {shownError && !pasteOpen && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="flex-1">{shownError}</p>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => {
              setFileError(null);
              clearError();
            }}
          >
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
