/**
 * Single source of truth for every tool on the site.
 * The home page grid, /tools/[slug], sitemap.ts and robots.ts all read from here.
 * Keep this file free of React/browser imports so it is safe everywhere.
 */

export const toolCategories = ["Animation", "Image", "Code", "Color"] as const;
export type ToolCategory = (typeof toolCategories)[number];

/** Name of an icon in src/components/tool-icon.tsx. */
export type ToolIconName = "PenTool" | "Image" | "Code" | "Palette";

export interface Tool {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: ToolIconName;
  /** Search-only synonyms, not displayed. */
  keywords?: string[];
}

export const tools: Tool[] = [
  {
    slug: "svg-animator",
    name: "SVG Animator",
    description:
      "Turn any SVG into a line-drawing animation. Tweak stroke and fill timing, then export CSS, SMIL, React, GSAP, MP4, GIF or PNG frames.",
    category: "Animation",
    icon: "PenTool",
    keywords: ["svg", "animation", "line drawing", "stroke", "dashoffset", "css", "gif", "mp4", "video"],
  },
];

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export function toolPath(slug: string) {
  return `/tools/${slug}`;
}
