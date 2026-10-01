/**
 * Single source of truth for every tool on the site.
 * The home page grid, /tools/[slug], sitemap.ts and robots.ts all read from here.
 * Keep this file free of React/browser imports so it is safe everywhere.
 */

export const toolCategories = ["Animation", "Image", "Code", "Color"] as const;
export type ToolCategory = (typeof toolCategories)[number];

/** Name of an icon in src/components/tool-icon.tsx. */
export type ToolIconName = "PenTool" | "Image" | "Code" | "Palette" | "Clapperboard";

export interface CategoryInfo {
  icon: ToolIconName;
  /** One line shown under the category heading on the home page. */
  blurb: string;
  /** OKLCH hue of the category's accent colour (see `.tone` in globals.css). */
  hue: number;
}

/** Display metadata for each category, in the order they appear on the home page. */
export const categoryInfo: Record<ToolCategory, CategoryInfo> = {
  Animation: { icon: "Clapperboard", blurb: "Bring vector art to life and export it anywhere.", hue: 295 },
  Image: { icon: "Image", blurb: "Edit and convert images without uploading them.", hue: 165 },
  Code: { icon: "Code", blurb: "Format, convert and generate code snippets.", hue: 250 },
  Color: { icon: "Palette", blurb: "Build palettes, check contrast and convert colors.", hue: 35 },
};

export interface Tool {
  slug: string;
  name: string;
  description: string;
  /** Short line for cards and menus; keep it under 50 characters. */
  tagline: string;
  category: ToolCategory;
  icon: ToolIconName;
  /** Search-only synonyms, not displayed. */
  keywords?: string[];
  /** Keyword-rich <title> (before " | Vartula"); falls back to `name`. Aim for under 60 characters in total. */
  seoTitle?: string;
  /** Date the tool last changed meaningfully (YYYY-MM-DD); feeds sitemap lastModified. */
  updated: string;
}

export const tools: Tool[] = [
  {
    slug: "svg-animator",
    name: "SVG Animator",
    description:
      "Turn any SVG into a line-drawing animation. Tweak stroke and fill timing, then export CSS, SMIL, React, GSAP, MP4, GIF or PNG frames.",
    tagline: "Line-drawing animations as code or video",
    category: "Animation",
    icon: "PenTool",
    keywords: ["svg", "animation", "line drawing", "stroke", "dashoffset", "css", "gif", "mp4", "video"],
    seoTitle: "SVG Animator — Free Line-Drawing Animation Maker",
    updated: "2026-09-30",
  },
];

export function toolsInCategory(tools: Tool[], category: ToolCategory) {
  return tools.filter((t) => t.category === category);
}

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export function toolPath(slug: string) {
  return `/tools/${slug}`;
}
