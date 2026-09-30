import type { MetadataRoute } from "next";
import { infoPages } from "@/lib/pages";
import { absoluteUrl } from "@/lib/site";
import { toolPath, tools } from "@/tools/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const latest = tools.map((t) => t.updated).sort().at(-1);
  return [
    { url: absoluteUrl("/"), lastModified: latest, changeFrequency: "weekly", priority: 1 },
    ...tools.map((tool) => ({
      url: absoluteUrl(toolPath(tool.slug)),
      lastModified: tool.updated,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...infoPages.map((page) => ({
      url: absoluteUrl(page.path),
      lastModified: page.updated,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
