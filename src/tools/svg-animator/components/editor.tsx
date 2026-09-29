"use client";

import { useEffect } from "react";
import { defaultSample } from "../samples";
import { useAnimatorStore } from "../store";
import { Controls } from "./controls";
import { Preview } from "./preview";
import { SourcePanel } from "./source-panel";

export function SvgAnimatorEditor() {
  const hasSource = useAnimatorStore((s) => s.source !== null);
  const loadMarkup = useAnimatorStore((s) => s.loadMarkup);

  // DOMPurify and DOMParser are browser-only, so the first SVG loads after hydration.
  useEffect(() => {
    if (!hasSource) loadMarkup(defaultSample.markup, defaultSample.name);
  }, [hasSource, loadMarkup]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <SourcePanel />
        <Preview />
      </div>
      <Controls />
    </div>
  );
}
