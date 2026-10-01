import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { DetailsMenu } from "@/components/details-menu";
import { ToolIcon } from "@/components/tool-icon";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { categoryInfo, toolCategories, toolPath, tools, toolsInCategory } from "@/tools/registry";

/** Header "Tools" dropdown, grouped by category. Rendered on the server; only open/close runs on the client. */
export function ToolsMenu() {
  return (
    <DetailsMenu className="group/menu relative">
      <summary
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "list-none gap-1 text-muted-foreground group-open/menu:bg-muted group-open/menu:text-foreground [&::-webkit-details-marker]:hidden",
        )}
      >
        Tools
        <ChevronDown className="transition-transform group-open/menu:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <nav
        aria-label="Tools"
        className="fixed inset-x-4 top-14 z-50 mt-1 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:w-[34rem]"
      >
        <ul className="grid gap-1 sm:grid-cols-2">
          {toolCategories.map((category) => {
            const info = categoryInfo[category];
            const items = toolsInCategory(tools, category);
            return (
              <li key={category} className="tone rounded-lg p-2" style={{ "--tone-h": info.hue } as CSSProperties}>
                <p className="mb-1 flex items-center gap-2 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <ToolIcon name={info.icon} className="size-3.5 text-(--tone-fg)" />
                  {category}
                </p>
                {items.length === 0 ? (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">Coming soon</p>
                ) : (
                  <ul>
                    {items.map((tool) => (
                      <li key={tool.slug}>
                        <Link
                          href={toolPath(tool.slug)}
                          className="flex items-start gap-3 rounded-md px-2 py-1.5 outline-none hover:bg-muted focus-visible:bg-muted"
                        >
                          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-(--tone-soft) text-(--tone-fg)">
                            <ToolIcon name={tool.icon} className="size-3.5" />
                          </span>
                          <span>
                            <span className="block text-sm font-medium">{tool.name}</span>
                            <span className="block text-xs text-muted-foreground">{tool.tagline}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        <Link
          href="/#tools"
          className="mt-2 flex items-center justify-between rounded-md border-t px-4 pt-3 pb-1 text-sm font-medium hover:text-foreground"
        >
          Browse all tools
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </nav>
    </DetailsMenu>
  );
}
