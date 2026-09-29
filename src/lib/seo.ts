import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { toolPath, type Tool } from "@/tools/registry";

/** Serialize JSON-LD safely for an inline <script> (no "</script>" breakouts). */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** schema.org SoftwareApplication for a tool page. */
export function toolJsonLd(tool: Tool) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.description,
    url: absoluteUrl(toolPath(tool.slug)),
    image: absoluteUrl(`${toolPath(tool.slug)}/opengraph-image`),
    applicationCategory: tool.category === "Animation" ? "MultimediaApplication" : "DesignApplication",
    operatingSystem: "Any (runs in a web browser)",
    browserRequirements: "Requires JavaScript and a modern browser.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    keywords: tool.keywords?.join(", "),
    publisher: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
  };
}

export function toolMetadata(tool: Tool): Metadata {
  const url = toolPath(tool.slug);
  const title = `${tool.name} — free online tool`;
  return {
    title: tool.name,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description: tool.description, siteName: siteConfig.name },
    twitter: { card: "summary_large_image", title, description: tool.description },
  };
}
