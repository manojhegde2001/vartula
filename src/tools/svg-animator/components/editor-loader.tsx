"use client";

import dynamic from "next/dynamic";

// Every tool shares the /tools/[slug] route, whose entry lists the client chunks of every
// statically imported tool. Loading the editor through next/dynamic keeps its code in a
// chunk that only pages rendering it attach.
const Editor = dynamic(() => import("./editor").then((m) => m.SvgAnimatorEditor));

export function SvgAnimatorEditorLoader() {
  return <Editor />;
}
