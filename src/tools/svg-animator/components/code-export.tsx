"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Check, CirclePlay, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadText } from "@/lib/download";
import type { CodeFormat } from "../engine/exporters";
import { useAnimatorStore } from "../store";
import { CODE_SECTION_ID } from "./export-menu";

type Exporters = typeof import("../engine/exporters");
type FormatLogos = typeof import("../lib/format-logos").formatLogos;

function FormatLogo({ id, logos }: { id: CodeFormat["id"]; logos: FormatLogos }) {
  const logo = logos[id];
  if (!logo) return <CirclePlay aria-hidden className="size-4 text-[#FFB13B]" />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 shrink-0" fill={logo.color}>
      <path d={logo.path} />
    </svg>
  );
}

/** Code output tabs. Exporters load after hydration; the highlighter waits until the panel is near the viewport. */
export function CodeExport() {
  const source = useAnimatorStore((s) => s.source);
  const config = useAnimatorStore((s) => s.config);
  const [exporters, setExporters] = useState<{ mod: Exporters; logos: FormatLogos } | null>(null);
  const [formatId, setFormatId] = useState<CodeFormat["id"]>("css");
  const [minify, setMinify] = useState(false);
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState<{ code: string; html: string | null } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const nearViewport = useNearViewport(sectionRef);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import("../engine/exporters"), import("../lib/format-logos")]).then(
      ([mod, { formatLogos }]) => !cancelled && setExporters({ mod, logos: formatLogos }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Deferred so dragging a slider doesn't regenerate code on every tick.
  const deferredConfig = useDeferredValue(config);
  const format = exporters?.mod.codeFormats.find((f) => f.id === formatId);

  const code = useMemo(() => {
    if (!format || !source) return "";
    try {
      return format.run(deferredConfig, source.model, source.markup, { minify });
    } catch (err) {
      return `/* Export failed: ${err instanceof Error ? err.message : String(err)} */`;
    }
  }, [format, source, deferredConfig, minify]);

  useEffect(() => {
    if (!code || !format || !nearViewport) return;
    let cancelled = false;
    import("../lib/highlight")
      .then(({ highlight }) => highlight(code, format.lang))
      .then((result) => !cancelled && setHtml({ code, html: result }))
      .catch(() => !cancelled && setHtml({ code, html: null }));
    return () => {
      cancelled = true;
    };
  }, [code, format, nearViewport]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const highlighted = html?.code === code ? html.html : null;

  return (
    <section
      ref={sectionRef}
      id={CODE_SECTION_ID}
      aria-labelledby="code-heading"
      className="scroll-mt-20 space-y-3 rounded-xl border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="code-heading" className="font-semibold">
          Get the code
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
        <TabsList className="w-full justify-start overflow-x-auto [scrollbar-width:none]">
          {exporters?.mod.codeFormats.map((f) => (
            <TabsTrigger key={f.id} value={f.id} className="flex-none gap-1.5 px-3">
              <FormatLogo id={f.id} logos={exporters.logos} />
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

/** True once the element comes within 300px of the viewport (stays true). */
function useNearViewport(ref: RefObject<HTMLElement | null>) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNear(true);
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, near]);
  return near;
}
