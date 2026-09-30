"use client";

import { useMemo, useState, type ReactNode } from "react";
import { filterTools } from "@/lib/filter-tools";
import type { Tool } from "@/tools/registry";

// Same look as components/ui/input, but a plain <input> keeps Base UI out of the home page bundle.
const inputClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pl-8 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

export function ToolSearch({
  tools,
  cards,
  heading,
  searchIcon,
}: {
  tools: Tool[];
  /** Server-rendered card per tool slug. */
  cards: Record<string, ReactNode>;
  heading: ReactNode;
  searchIcon: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => filterTools(tools, query), [tools, query]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {heading}
        <div className="relative sm:w-72">
          {searchIcon}
          <input
            type="search"
            placeholder="Search tools…"
            aria-label="Search tools"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={inputClassName}
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
            <li key={tool.slug}>{cards[tool.slug]}</li>
          ))}
        </ul>
      )}
    </>
  );
}
