"use client";

import { useEffect, useRef } from "react";
import { decodeShareHash, encodeShareHash } from "../lib/share";
import { defaultSample, samples } from "../samples";
import { useAnimatorStore } from "../store";
import { CodeExport } from "./code-export";
import { Controls } from "./controls";
import { MediaExportButton } from "./media-export-button";
import { Preview } from "./preview";
import { SourcePanel } from "./source-panel";

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
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <SourcePanel />
          <Preview />
          <div className="flex justify-end">
            <MediaExportButton />
          </div>
        </div>
        <Controls />
      </div>
      <CodeExport />
    </div>
  );
}
