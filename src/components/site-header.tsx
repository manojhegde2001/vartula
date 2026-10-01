import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToolsMenu } from "@/components/tools-menu";
import { Logo } from "@/lib/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link href="/" className="site-logo">
          <Logo className="text-[1.375rem]" />
        </Link>
        <ToolsMenu />
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
