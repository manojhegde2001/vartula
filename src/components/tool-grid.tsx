import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ToolIcon } from "@/components/tool-icon";
import { ToolSearch } from "@/components/tool-search";
import { toolPath, type Tool } from "@/tools/registry";

/**
 * Tool cards render on the server; only the search box and filtering run on the client,
 * so icons and badges add no JavaScript to the home page.
 */
export function ToolGrid({ tools }: { tools: Tool[] }) {
  return (
    <section aria-labelledby="tools-heading" className="space-y-6">
      <ToolSearch
        tools={tools}
        heading={
          <h2 id="tools-heading" className="text-xl font-semibold tracking-tight">
            All tools
          </h2>
        }
        searchIcon={
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        }
        cards={Object.fromEntries(tools.map((tool) => [tool.slug, <ToolCard key={tool.slug} tool={tool} />]))}
      />
    </section>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
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
  );
}
