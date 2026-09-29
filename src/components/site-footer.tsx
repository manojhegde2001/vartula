import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { tools, toolPath } from "@/tools/registry";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-3">
        <div>
          <p className="font-semibold text-foreground">{siteConfig.name}</p>
          <p className="mt-2">{siteConfig.tagline}. Everything runs locally — your files never leave your device.</p>
        </div>
        <div>
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
        </div>
        <div className="sm:text-right">
          <p>© {new Date().getFullYear()} {siteConfig.name}</p>
        </div>
      </div>
    </footer>
  );
}
