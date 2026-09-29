"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToolIcon } from "@/components/tool-icon";
import { toolPath, type Tool } from "@/tools/registry";

export function filterTools(tools: Tool[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  return tools.filter((tool) =>
    [tool.name, tool.description, tool.category, ...(tool.keywords ?? [])].some((s) => s.toLowerCase().includes(q)),
  );
}

export function ToolGrid({ tools }: { tools: Tool[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => filterTools(tools, query), [tools, query]);

  return (
    <section aria-labelledby="tools-heading" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="tools-heading" className="text-xl font-semibold tracking-tight">
          All tools
        </h2>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tools…"
            aria-label="Search tools"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {results.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No tools match “{query}”.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((tool) => (
            <li key={tool.slug}>
              <Link
                href={toolPath(tool.slug)}
                className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-foreground/30 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                    <ToolIcon name={tool.icon} className="size-5" />
                  </span>
                  <Badge variant="secondary">{tool.category}</Badge>
                </div>
                <h3 className="font-semibold">{tool.name}</h3>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
