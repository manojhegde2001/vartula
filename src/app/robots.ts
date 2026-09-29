import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { toolPath, tools } from "@/tools/registry";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", ...tools.map((t) => toolPath(t.slug))] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
