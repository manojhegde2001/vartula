import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { toolPath, tools } from "@/tools/registry";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0c0d12",
    categories: ["design", "productivity", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the installed app's icon to jump straight to a tool.
    shortcuts: tools.map((tool) => ({
      name: tool.name,
      short_name: tool.name.length > 12 ? tool.name.split(" ")[0] : tool.name,
      description: tool.tagline,
      url: toolPath(tool.slug),
      icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    })),
  };
}
