import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { toolPath, tools } from "@/tools/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    ...tools.map((tool) => ({
      url: absoluteUrl(toolPath(tool.slug)),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
