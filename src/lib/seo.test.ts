import { describe, expect, it } from "vitest";
import { getTool, tools } from "@/tools/registry";
import { toolOgArt } from "@/tools/og-art";
import { oklchHex } from "./og";
import { infoPages } from "./pages";
import { breadcrumbJsonLd, homeJsonLd, infoMetadata, serializeJsonLd, toolJsonLd, toolMetadata } from "./seo";

const tool = getTool("svg-animator")!;

describe("seo", () => {
  it("describes tools as a free SoftwareApplication", () => {
    const ld = toolJsonLd(tool);
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "SVG Animator",
      offers: { price: "0" },
      dateModified: tool.updated,
    });
    expect(ld.url).toMatch(/^https?:\/\/.+\/tools\/svg-animator$/);
  });

  it("describes the site, publisher and every tool on the home page", () => {
    const graph = homeJsonLd(tools)["@graph"];
    expect(graph.map((node) => node["@type"])).toEqual(["Organization", "WebSite", "ItemList"]);
    const list = graph.find((node) => node["@type"] === "ItemList") as { itemListElement: { url: string }[] };
    expect(list.itemListElement).toHaveLength(tools.length);
    expect(list.itemListElement[0].url).toMatch(/\/tools\/svg-animator$/);
  });

  it("builds a Home › Tool breadcrumb", () => {
    const items = breadcrumbJsonLd(tool).itemListElement;
    expect(items.map((i) => i.name)).toEqual(["Home", "SVG Animator"]);
    expect(items.map((i) => i.position)).toEqual([1, 2]);
  });

  it("escapes < so JSON-LD cannot close its script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });

  it("builds canonical, Open Graph and Twitter metadata", () => {
    const meta = toolMetadata(tool);
    expect(meta.title).toBe(tool.seoTitle);
    expect(meta.alternates?.canonical).toBe("/tools/svg-animator");
    expect(meta.openGraph).toMatchObject({ url: "/tools/svg-animator", description: tool.description });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("gives each info page its own URL and description for link previews", () => {
    for (const page of infoPages) {
      const meta = infoMetadata(page.path);
      expect(meta.alternates?.canonical).toBe(page.path);
      expect(meta.openGraph).toMatchObject({ url: page.path, title: `${page.name} | Vartula`, description: page.description });
      expect(meta.twitter).toMatchObject({ card: "summary_large_image", description: page.description });
    }
  });

  it("only has share-card art for registered tools", () => {
    for (const slug of Object.keys(toolOgArt)) expect(getTool(slug), slug).toBeDefined();
  });

  it("converts OKLCH accents to hex for share cards", () => {
    expect(oklchHex(0, 1, 0)).toBe("#ffffff");
    expect(oklchHex(0, 0, 0)).toBe("#000000");
    expect(oklchHex(29.23, 0.628, 0.2577)).toBe("#ff0000");
  });
});
