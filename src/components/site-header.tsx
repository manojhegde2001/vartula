import Link from "next/link";
import { tools, toolPath } from "@/tools/registry";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/lib/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="site-logo">
          <Logo className="text-[1.375rem]" />
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
