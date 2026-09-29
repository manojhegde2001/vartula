import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { tools, toolPath } from "@/tools/registry";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark />
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

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7 8l5 9 5-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
