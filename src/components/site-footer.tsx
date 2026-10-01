import Link from "next/link";
import { Logo } from "@/lib/logo";
import { infoPages } from "@/lib/pages";
import { siteConfig } from "@/lib/site";
import { tools, toolPath } from "@/tools/registry";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="grid gap-8 px-4 py-10 sm:px-6 lg:px-8 text-sm text-muted-foreground sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="text-foreground">
            <Logo className="text-xl" />
          </p>
          <p className="mt-2 max-w-sm">
            {siteConfig.tagline}. Everything runs locally — your files never leave your device.
          </p>
          <p className="mt-4">© {new Date().getFullYear()} {siteConfig.name}</p>
        </div>
        <nav aria-label="Footer tools">
          <p className="font-semibold text-foreground">Tools</p>
          <ul className="mt-2 space-y-1">
            {tools.map((tool) => (
              <li key={tool.slug}>
                <Link href={toolPath(tool.slug)} className="hover:text-foreground">
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <p className="font-semibold text-foreground">{siteConfig.name}</p>
          <ul className="mt-2 space-y-1">
            {infoPages.map((page) => (
              <li key={page.path}>
                <Link href={page.path} className="hover:text-foreground">
                  {page.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
