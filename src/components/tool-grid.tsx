import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { ToolIcon } from "@/components/tool-icon";
import { ToolBrowser, type CategoryTab } from "@/components/tool-browser";
import { toolThumbnails } from "@/tools/thumbnails";
import { categoryInfo, toolCategories, toolPath, toolsInCategory, type Tool, type ToolCategory } from "@/tools/registry";

const toneStyle = (category: ToolCategory) => ({ "--tone-h": categoryInfo[category].hue }) as CSSProperties;

/**
 * Every tool in one grid with category filters and search. Cards, icons and thumbnails render on the server;
 * only the filtering runs on the client, so the artwork adds no JavaScript.
 */
export function ToolGrid({ tools }: { tools: Tool[] }) {
  const categories: CategoryTab[] = toolCategories.map((name) => ({
    name,
    count: toolsInCategory(tools, name).length,
    hue: categoryInfo[name].hue,
    icon: <ToolIcon name={categoryInfo[name].icon} className="size-4" />,
    comingSoon: <ComingSoonCard category={name} hasTools={toolsInCategory(tools, name).length > 0} />,
  }));

  return (
    <section id="tools" aria-labelledby="tools-heading" className="scroll-mt-20 space-y-6">
      <ToolBrowser
        tools={tools}
        categories={categories}
        heading={
          <h2 id="tools-heading" className="text-2xl font-semibold tracking-tight">
            All tools
          </h2>
        }
        searchIcon={
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        }
        cards={Object.fromEntries(tools.map((tool, i) => [tool.slug, <ToolCard key={tool.slug} tool={tool} index={i} />]))}
      />
    </section>
  );
}

function CategoryBadge({ category }: { category: ToolCategory }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium text-(--tone-fg) shadow-sm backdrop-blur">
      <ToolIcon name={categoryInfo[category].icon} className="size-3.5" />
      {category}
    </span>
  );
}

function ToolCard({ tool, index }: { tool: Tool; index: number }) {
  const Thumbnail = toolThumbnails[tool.slug];
  return (
    <Link
      href={toolPath(tool.slug)}
      style={{ ...toneStyle(tool.category), "--enter-i": Math.min(index, 8) } as CSSProperties}
      className="tone tool-card group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-(--tone)/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative aspect-[16/10] border-b bg-(--tone-soft)">
        {Thumbnail ? (
          <Thumbnail />
        ) : (
          <div className="grid size-full place-items-center text-(--tone-fg)">
            <ToolIcon name={tool.icon} className="size-14" strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute top-3 left-3">
          <CategoryBadge category={tool.category} />
        </span>
      </div>
      <div className="flex flex-1 items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{tool.name}</h3>
          <p className="text-sm text-muted-foreground">{tool.tagline}</p>
        </div>
        <ArrowRight
          aria-hidden
          className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
        />
      </div>
    </Link>
  );
}

function ComingSoonCard({ category, hasTools }: { category: ToolCategory; hasTools: boolean }) {
  return (
    <div style={toneStyle(category)} className="tone flex h-full flex-col overflow-hidden rounded-2xl border border-dashed">
      <div className="relative grid h-24 place-items-center border-b border-dashed sm:h-auto sm:aspect-[16/10] bg-(--tone-soft)/50 text-(--tone-fg)">
        <ToolIcon name={categoryInfo[category].icon} className="size-12 opacity-60" strokeWidth={1.5} />
        <span className="absolute top-3 left-3">
          <CategoryBadge category={category} />
        </span>
      </div>
      <div className="flex-1 space-y-1 p-4">
        <h3 className="font-semibold text-muted-foreground">
          {hasTools ? "More" : "New"} {category.toLowerCase()} tools soon
        </h3>
        <p className="text-sm text-muted-foreground">
          {categoryInfo[category].blurb}{" "}
          <Link href="/contact" className="font-medium text-foreground underline-offset-4 hover:underline">
            Suggest a tool
          </Link>
        </p>
      </div>
    </div>
  );
}
