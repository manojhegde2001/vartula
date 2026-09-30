import { describe, expect, it } from "vitest";
import { getTool, tools } from "./registry";
import { toolComponents } from "./components";
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

  it("has a component for every tool", () => {
    for (const tool of tools) expect(toolComponents[tool.slug]).toBeTypeOf("function");
  });

  it("has a valid updated date and a title that fits in search results", () => {
    for (const tool of tools) {
      expect(tool.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(tool.updated))).toBe(false);
      expect(`${tool.seoTitle ?? tool.name} | Vartula`.length).toBeLessThanOrEqual(60);
    }
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
