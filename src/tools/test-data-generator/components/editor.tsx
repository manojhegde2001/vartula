"use client";

import { useEffect, type CSSProperties } from "react";
import { Braces, FileStack, Fingerprint, TextCursorInput, type LucideIcon } from "lucide-react";
import { categoryInfo } from "@/tools/registry";
import { decodeShare, TABS, useDataStore, type Tab } from "../store";
import { DataTab } from "./data-tab";
import { EdgeTab } from "./edge-tab";
import { FilesTab } from "./files-tab";
import { ValuesTab } from "./values-tab";
import { cn } from "@/lib/utils";

const tabInfo: Record<Tab, { label: string; icon: LucideIcon; blurb: string }> = {
  data: { label: "Data", icon: Braces, blurb: "Records as JSON, CSV, SQL and more" },
  files: { label: "Files", icon: FileStack, blurb: "Any type, exact size" },
  edge: { label: "Edge cases", icon: TextCursorInput, blurb: "Strings that break things" },
  values: { label: "Values", icon: Fingerprint, blurb: "Cards, IBANs, IDs, passwords" },
};

export function TestDataEditor() {
  const tab = useDataStore((s) => s.tab);
  const setTab = useDataStore((s) => s.setTab);

  useEffect(() => {
    // #files, #edge, #values open a tab; #data=… loads a shared schema.
    const hash = location.hash.slice(1);
    const [name, payload] = hash.split("=", 2) as [string, string | undefined];
    if (name === "data" && payload) {
      const shared = decodeShare(payload);
      if (shared) useDataStore.getState().loadShared(shared);
    }
    if ((TABS as readonly string[]).includes(name)) useDataStore.getState().setTab(name as Tab);
  }, []);

  const open = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };

  return (
    // .tone gives the editor the Testing category accent (see globals.css).
    <div className="tone space-y-4" style={{ "--tone-h": categoryInfo.Testing.hue } as CSSProperties}>
      <div role="tablist" aria-label="Generators" className="grid grid-cols-2 gap-1 rounded-xl border bg-card p-1 sm:grid-cols-4">
        {TABS.map((t) => {
          const { label, icon: Icon, blurb } = tabInfo[t];
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => open(t)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active ? "bg-(--tone) text-white shadow-sm" : "hover:bg-(--tone-soft)",
              )}
            >
              <Icon className={cn("size-5 shrink-0", !active && "text-(--tone-fg)")} aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className={cn("block truncate text-xs", active ? "text-white/80" : "text-muted-foreground")}>{blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
      {tab === "data" && <DataTab />}
      {tab === "files" && <FilesTab />}
      {tab === "edge" && <EdgeTab />}
      {tab === "values" && <ValuesTab />}
    </div>
  );
}
