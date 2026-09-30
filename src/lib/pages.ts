/** Site information pages, for the footer, sitemap and tests. Keep free of React imports. */
export const infoPages = [
  { path: "/about", name: "About", updated: "2026-09-30" },
  { path: "/contact", name: "Contact", updated: "2026-09-30" },
  { path: "/privacy", name: "Privacy Policy", updated: "2026-09-30" },
  { path: "/terms", name: "Terms of Use", updated: "2026-09-30" },
] as const;

export type InfoPath = (typeof infoPages)[number]["path"];

export function infoPage(path: InfoPath) {
  return infoPages.find((page) => page.path === path)!;
}
