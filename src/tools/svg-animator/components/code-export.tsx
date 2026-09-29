"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadText } from "@/lib/download";
import type { CodeFormat } from "../engine/exporters";
import { useAnimatorStore } from "../store";

type Exporters = typeof import("../engine/exporters");

/** Code output tabs. Exporters and the highlighter load on first use. */
export function CodeExport() {
  const source = useAnimatorStore((s) => s.source);
  const config = useAnimatorStore((s) => s.config);
  const [exporters, setExporters] = useState<Exporters | null>(null);
  const [formatId, setFormatId] = useState<CodeFormat["id"]>("css");
  const [minify, setMinify] = useState(false);
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState<{ code: string; html: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("../engine/exporters").then((mod) => !cancelled && setExporters(mod));
    return () => {
      cancelled = true;
    };
  }, []);

  // Deferred so dragging a slider doesn't regenerate code on every tick.
  const deferredConfig = useDeferredValue(config);
  const format = exporters?.codeFormats.find((f) => f.id === formatId);

  const code = useMemo(() => {
    if (!format || !source) return "";
    try {
      return format.run(deferredConfig, source.model, source.markup, { minify });
    } catch (err) {
      return `/* Export failed: ${err instanceof Error ? err.message : String(err)} */`;
    }
  }, [format, source, deferredConfig, minify]);

  useEffect(() => {
    if (!code || !format) return;
    let cancelled = false;
    import("../lib/highlight")
      .then(({ highlight }) => highlight(code, format.lang))
      .then((result) => !cancelled && setHtml({ code, html: result }))
      .catch(() => !cancelled && setHtml({ code, html: null }));
    return () => {
      cancelled = true;
    };
  }, [code, format]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const highlighted = html?.code === code ? html.html : null;

  return (
    <section aria-labelledby="code-heading" className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="code-heading" className="font-semibold">
          Export code
        </h2>
        <div className="flex items-center gap-2">
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Switch checked={minify} onCheckedChange={setMinify} aria-label="Minify" />
            Minify
          </Label>
          <Button variant="outline" size="sm" onClick={copy} disabled={!code}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!code || !format}
            onClick={() => format && downloadText(code, format.filename, format.mime)}
          >
            <Download /> Download
          </Button>
        </div>
      </div>

      <Tabs value={formatId} onValueChange={(v) => setFormatId(v as CodeFormat["id"])}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          {(exporters?.codeFormats ?? []).map((f) => (
            <TabsTrigger key={f.id} value={f.id} className="flex-none px-3">
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {format && <p className="text-sm text-muted-foreground">{format.description}</p>}

      <div
        className="code-output max-h-[28rem] overflow-auto rounded-lg border bg-muted/30 text-xs"
        data-testid="code-output"
        data-format={formatId}
      >
        {highlighted ? (
          <div dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <pre className="p-4 font-mono whitespace-pre">{code || "Loading…"}</pre>
        )}
      </div>
    </section>
  );
}
