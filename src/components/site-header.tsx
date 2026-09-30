import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { tools, toolPath } from "@/tools/registry";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoMark } from "@/lib/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="site-logo flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark className="size-7" />
          {siteConfig.name}
        </Link>
        <nav aria-label="Tools" className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
          {tools.slice(0, 4).map((tool) => (
            <Link key={tool.slug} href={toolPath(tool.slug)} className="hover:text-foreground">
              {tool.name}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
