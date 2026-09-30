import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { toolMarkdownPath } from "@/lib/tool-content";
import { toolPath, type Tool } from "@/tools/registry";

/** Serialize JSON-LD safely for an inline <script> (no "</script>" breakouts). */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const organizationId = `${siteConfig.url}/#organization`;
const websiteId = `${siteConfig.url}/#website`;

/** schema.org WebSite + Organization + the list of tools, for the home page. */
export function homeJsonLd(tools: Tool[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: absoluteUrl("/apple-icon"),
        sameAs: [siteConfig.repo],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        inLanguage: "en",
        publisher: { "@id": organizationId },
      },
      {
        "@type": "ItemList",
        name: `${siteConfig.name} tools`,
        itemListElement: tools.map((tool, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: tool.name,
          url: absoluteUrl(toolPath(tool.slug)),
        })),
      },
    ],
  };
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
    dateModified: tool.updated,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    keywords: tool.keywords?.join(", "),
    publisher: { "@type": "Organization", "@id": organizationId, name: siteConfig.name, url: siteConfig.url },
  };
}

/** schema.org BreadcrumbList: Home › Tool. Mirrors the visible breadcrumb on tool pages. */
export function breadcrumbJsonLd(tool: Tool) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: tool.name, item: absoluteUrl(toolPath(tool.slug)) },
    ],
  };
}

export function toolMetadata(tool: Tool): Metadata {
  const url = toolPath(tool.slug);
  const title = tool.seoTitle ?? `${tool.name} — free online tool`;
  return {
    title: tool.seoTitle ?? tool.name,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: url, types: { "text/markdown": toolMarkdownPath(tool.slug) } },
    openGraph: { type: "website", url, title, description: tool.description, siteName: siteConfig.name },
    twitter: { card: "summary_large_image", title, description: tool.description },
  };
}
