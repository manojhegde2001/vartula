import type { MetadataRoute } from "next";
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
  ];
}
