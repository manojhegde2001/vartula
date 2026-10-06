"use client";

import dynamic from "next/dynamic";

// Every tool shares the /tools/[slug] route; loading the editor through next/dynamic keeps its code in a
// chunk that only this tool's page attaches. faker, pdf-lib and the encoders load later still, on first use.
const Editor = dynamic(() => import("./editor").then((m) => m.TestDataEditor));

export function TestDataEditorLoader() {
  return <Editor />;
}
