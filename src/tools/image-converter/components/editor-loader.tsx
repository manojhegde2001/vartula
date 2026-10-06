"use client";

import dynamic from "next/dynamic";

// Every tool shares the /tools/[slug] route; loading the editor through next/dynamic keeps its code
// in a chunk that only this tool's page attaches.
const Editor = dynamic(() => import("./editor").then((m) => m.ImageConverterEditor));

export function ImageConverterEditorLoader() {
  return <Editor />;
}
