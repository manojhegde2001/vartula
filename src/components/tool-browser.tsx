"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { filterTools } from "@/lib/filter-tools";
import type { Tool, ToolCategory } from "@/tools/registry";

export interface CategoryTab {
  name: ToolCategory;
  count: number;
  hue: number;
  /** Server-rendered icon and "coming soon" card, so lucide stays out of this bundle. */
  icon: ReactNode;
  comingSoon: ReactNode;
}

// Classes are joined by hand: cn() would pull tailwind-merge into the home page bundle.
// Same look as components/ui/input, but a plain <input> keeps Base UI out of the home page bundle.
const inputClassName =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 py-1 pl-8 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

const pillClassName =
  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** One grid of every tool, narrowed by a category filter and a search box. */
export function ToolBrowser({
  tools,
  categories,
  cards,
  heading,
  searchIcon,
}: {
  tools: Tool[];
  categories: CategoryTab[];
  /** Server-rendered card per tool slug. */
  cards: Record<string, ReactNode>;
  heading: ReactNode;
  searchIcon: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ToolCategory | null>(null);
  const results = useMemo(() => filterTools(tools, query), [tools, query]);
  const searching = query.trim() !== "";

  const shown = results.filter((t) => active === null || t.category === active);
  // Placeholders for categories still being built: the chosen one, or every empty one in the "All" view.
  const upcoming = searching ? [] : categories.filter((c) => (active === null ? c.count === 0 : c.name === active));

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          {heading}
          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={active === null}
              onClick={() => setActive(null)}
              className={`${pillClassName} ${active === null ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted"}`}
            >
              All
              <span className="text-xs opacity-70">{tools.length}</span>
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                aria-pressed={active === c.name}
                onClick={() => setActive(active === c.name ? null : c.name)}
                style={{ "--tone-h": c.hue } as CSSProperties}
                className={`tone ${pillClassName} ${active === c.name ? "border-(--tone) bg-(--tone-soft) text-(--tone-fg)" : "bg-card hover:bg-muted"}`}
              >
                <span className="text-(--tone-fg)">{c.icon}</span>
                {c.name}
                <span className="text-xs opacity-70">{c.count || "soon"}</span>
              </button>
            ))}
          </div>
        </div>
        <div role="search" className="relative lg:w-72">
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

      {shown.length === 0 && upcoming.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No tools match “{query}”{active ? ` in ${active}` : ""}.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {shown.map((tool) => (
            <li key={tool.slug}>{cards[tool.slug]}</li>
          ))}
          {upcoming.map((c) => (
            <li key={c.name}>{c.comingSoon}</li>
          ))}
        </ul>
      )}
    </>
  );
}
