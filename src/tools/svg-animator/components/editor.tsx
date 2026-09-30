"use client";

import { useEffect, useRef } from "react";
import { decodeShareHash, encodeShareHash } from "../lib/share";
import { defaultSample, samples } from "../samples";
import { useAnimatorStore } from "../store";
import { CodeExport } from "./code-export";
import { Controls } from "./controls";
import { ExportMenu, ShareButton } from "./export-menu";
import { Preview } from "./preview";
import { SourceToolbar, SvgDropTarget } from "./source-toolbar";

/** Restore config/sample from the URL hash, then keep the hash in sync. */
function useShareHash() {
  const config = useAnimatorStore((s) => s.config);
  const sampleId = useAnimatorStore((s) => s.source?.sampleId ?? null);
  const hasSource = useAnimatorStore((s) => s.source !== null);
  const restored = useRef(false);

  // DOMPurify and DOMParser are browser-only, so the first SVG loads after hydration.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const { config: shared, sampleId: sharedSample } = decodeShareHash(window.location.hash);
    const { setConfig, loadMarkup } = useAnimatorStore.getState();
    if (shared) setConfig(shared);
    const sample = samples.find((s) => s.id === sharedSample) ?? defaultSample;
    loadMarkup(sample.markup, sample.name, sample.id);
  }, []);

  useEffect(() => {
    if (!restored.current || !hasSource) return;
    const id = setTimeout(() => {
      const hash = encodeShareHash(config, sampleId);
      if (window.location.hash.slice(1) !== hash) {
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${hash}`);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [config, sampleId, hasSource]);
}

export function SvgAnimatorEditor() {
  useShareHash();

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* On desktop the editor fills the rest of the screen: no page or panel scrolling needed to use it. */}
      <div className="grid items-start gap-4 lg:h-[calc(100dvh-9.5rem)] lg:min-h-[34rem] lg:grid-cols-[minmax(0,1fr)_340px] lg:items-stretch lg:gap-6 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <SvgDropTarget className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card lg:min-h-0">
          <SourceToolbar
            actions={
              <>
                <ShareButton />
                <ExportMenu />
              </>
            }
          />
          <Preview className="flex flex-1 flex-col" />
        </SvgDropTarget>
        {/* overflow is only a safety net for very short windows; the panel fits from about 600px tall. */}
        <Controls className="lg:min-h-0 lg:overflow-y-auto" />
      </div>
      <CodeExport />
    </div>
  );
}
