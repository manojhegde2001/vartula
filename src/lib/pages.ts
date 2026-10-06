import { siteConfig } from "@/lib/site";

/** Site information pages, for the footer, sitemap, metadata, share cards and tests. Keep free of React imports. */
export const infoPages = [
  {
    path: "/about",
    name: "About",
    description: `What ${siteConfig.name} is, why every tool runs in your browser, and who it's for.`,
    updated: "2026-09-30",
  },
  {
    path: "/contact",
    name: "Contact",
    description: `How to reach ${siteConfig.name}: email, bug reports and tool requests.`,
    updated: "2026-09-30",
  },
  {
    path: "/privacy",
    name: "Privacy Policy",
    description: `${siteConfig.name} processes your files in your browser and never uploads them. Read what little data we do handle.`,
    updated: "2026-10-06",
  },
  {
    path: "/terms",
    name: "Terms of Use",
    description: `The terms for using ${siteConfig.name}'s free in-browser design tools, and who owns what you create.`,
    updated: "2026-09-30",
  },
] as const;

export type InfoPath = (typeof infoPages)[number]["path"];

export function infoPage(path: InfoPath) {
  return infoPages.find((page) => page.path === path)!;
}
