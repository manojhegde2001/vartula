import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { ToolIcon } from "@/components/tool-icon";
import { toolPath, tools } from "@/tools/registry";

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false },
};

/** Shown by the service worker when a page isn't cached and there's no connection. */
export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-20">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-7 text-muted-foreground" aria-hidden />
      </span>
      <h1 className="text-3xl font-bold tracking-tight">You’re offline</h1>
      <p className="text-muted-foreground">
        This page isn’t saved on this device yet. Every tool runs entirely in your browser, so these still work without a connection:
      </p>
      <ul className="divide-y rounded-xl border">
        {tools.map((tool) => (
          <li key={tool.slug}>
            {/* Plain links: a full page load lets the service worker serve the saved copy. */}
            <a href={toolPath(tool.slug)} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
              <ToolIcon name={tool.icon} className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block font-medium">{tool.name}</span>
                <span className="block truncate text-sm text-muted-foreground">{tool.tagline}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
