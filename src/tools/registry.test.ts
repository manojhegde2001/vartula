import { describe, expect, it } from "vitest";
import { categoryInfo, getTool, toolCategories, tools, toolsInCategory } from "./registry";
import { toolComponents } from "./components";
import { toolContents } from "./content";
import { filterTools } from "@/lib/filter-tools";
import sitemap from "@/app/sitemap";

describe("tool registry", () => {
  it("has unique, url-safe slugs", () => {
    const slugs = tools.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("registers the SVG Animator", () => {
    expect(getTool("svg-animator")?.name).toBe("SVG Animator");
  });

  it("registers the Chart Maker", () => {
    expect(getTool("chart-maker")?.category).toBe("Data");
    expect(filterTools(tools, "sankey").map((t) => t.slug)).toEqual(["chart-maker"]);
  });

  it("registers the Image Converter and PDF Toolkit", () => {
    expect(getTool("image-converter")?.category).toBe("Image");
    expect(getTool("pdf-toolkit")?.category).toBe("Document");
    expect(filterTools(tools, "heic").map((t) => t.slug)).toEqual(["image-converter"]);
    expect(filterTools(tools, "merge pdf").map((t) => t.slug)).toEqual(["pdf-toolkit"]);
  });

  it("registers the Test Data Generator", () => {
    expect(getTool("test-data-generator")?.category).toBe("Testing");
    expect(filterTools(tools, "mock data").map((t) => t.slug)).toEqual(["test-data-generator"]);
  });

  it("has a component for every tool", () => {
    for (const tool of tools) expect(toolComponents[tool.slug]).toBeTypeOf("function");
  });

  it("has long-form content for every tool", () => {
    for (const tool of tools) {
      const content = toolContents[tool.slug];
      expect(content, tool.slug).toBeDefined();
      expect(content.howTo.length).toBeGreaterThan(0);
      expect(content.faq.length).toBeGreaterThan(0);
    }
  });

  it("has a valid updated date and a title that fits in search results", () => {
    for (const tool of tools) {
      expect(tool.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(tool.updated))).toBe(false);
      expect(`${tool.seoTitle ?? tool.name} | Vartula`.length).toBeLessThanOrEqual(60);
    }
  });

  it("has a short tagline for cards and menus", () => {
    for (const tool of tools) {
      expect(tool.tagline.length, tool.slug).toBeGreaterThan(0);
      expect(tool.tagline.length, tool.slug).toBeLessThanOrEqual(50);
    }
  });

  it("has display metadata for every category", () => {
    for (const category of toolCategories) {
      expect(categoryInfo[category].blurb.length).toBeGreaterThan(0);
      expect(categoryInfo[category].hue).toBeGreaterThanOrEqual(0);
      expect(categoryInfo[category].hue).toBeLessThan(360);
    }
    expect(toolsInCategory(tools, "Animation").map((t) => t.slug)).toContain("svg-animator");
  });

  it("lists every tool in the sitemap", () => {
    const urls = sitemap().map((e) => e.url);
    for (const tool of tools) expect(urls.some((u) => u.endsWith(`/tools/${tool.slug}`))).toBe(true);
  });

  it("filters by name, category and keyword", () => {
    expect(filterTools(tools, "animator")).toHaveLength(1);
    expect(filterTools(tools, "ANIMATION")).toHaveLength(1);
    expect(filterTools(tools, "dashoffset")).toHaveLength(1);
    expect(filterTools(tools, "zzz-nothing")).toHaveLength(0);
    expect(filterTools(tools, "  ")).toHaveLength(tools.length);
  });
});
