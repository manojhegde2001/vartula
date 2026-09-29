import { describe, expect, it } from "vitest";
import { getTool } from "@/tools/registry";
import { serializeJsonLd, toolJsonLd, toolMetadata } from "./seo";

const tool = getTool("svg-animator")!;

describe("seo", () => {
  it("describes tools as a free SoftwareApplication", () => {
    const ld = toolJsonLd(tool);
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "SVG Animator",
      offers: { price: "0" },
    });
    expect(ld.url).toMatch(/^https?:\/\/.+\/tools\/svg-animator$/);
  });

  it("escapes < so JSON-LD cannot close its script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });

  it("builds canonical, Open Graph and Twitter metadata", () => {
    const meta = toolMetadata(tool);
    expect(meta.alternates?.canonical).toBe("/tools/svg-animator");
    expect(meta.openGraph).toMatchObject({ url: "/tools/svg-animator", description: tool.description });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });
});
