/**
 * Single source of truth for every tool on the site.
 * The home page grid, /tools/[slug], sitemap.ts and robots.ts all read from here.
 * Keep this file free of React/browser imports so it is safe everywhere.
 */

export const toolCategories = ["Animation", "Data", "Image", "Document", "Code", "Color"] as const;
export type ToolCategory = (typeof toolCategories)[number];

/** Name of an icon in src/components/tool-icon.tsx. */
export type ToolIconName =
  | "PenTool"
  | "Image"
  | "Code"
  | "Palette"
  | "Clapperboard"
  | "ChartColumn"
  | "ChartPie"
  | "Images"
  | "FileStack"
  | "FileText";

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
  Data: { icon: "ChartPie", blurb: "Turn spreadsheets into charts and visualizations.", hue: 345 },
  Image: { icon: "Image", blurb: "Edit and convert images without uploading them.", hue: 165 },
  Document: { icon: "FileText", blurb: "Merge, split, compress and sign PDFs privately.", hue: 210 },
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
  {
    slug: "chart-maker",
    name: "Chart Maker",
    description:
      "Turn CSV, JSON or spreadsheet data into bar, line, scatter, treemap, sunburst, alluvial and other charts. Map columns, style it, then export SVG or PNG.",
    tagline: "Charts from your data, exported as SVG",
    category: "Data",
    icon: "ChartColumn",
    keywords: ["chart", "graph", "data visualization", "dataviz", "csv", "rawgraphs", "sankey", "alluvial", "treemap", "sunburst", "streamgraph", "scatter", "bubble", "heatmap", "box plot"],
    seoTitle: "Chart Maker — Free Online Data Visualization Tool",
    updated: "2026-10-06",
  },
  {
    slug: "image-converter",
    name: "Image Converter",
    description:
      "Convert HEIC, PNG, JPG, WebP and AVIF images, resize them and compress them to a target size like 100 KB. Batch-process photos without uploading them.",
    tagline: "Convert, resize and compress images",
    category: "Image",
    icon: "Images",
    keywords: ["heic to jpg", "png to jpg", "jpg to webp", "webp to png", "avif", "compress image", "reduce image size", "resize image", "100kb", "50kb", "photo", "exif", "batch"],
    seoTitle: "Image Converter & Compressor — HEIC, WebP, JPG",
    updated: "2026-10-06",
  },
  {
    slug: "pdf-toolkit",
    name: "PDF Toolkit",
    description:
      "Merge, split, reorder, rotate, compress and sign PDF files in your browser. Your documents are never uploaded, so it is safe for contracts and IDs.",
    tagline: "Merge, split, compress and sign PDFs",
    category: "Document",
    icon: "FileStack",
    keywords: ["pdf", "merge pdf", "combine pdf", "split pdf", "extract pages", "reorder pages", "rotate pdf", "delete pages", "compress pdf", "reduce pdf size", "sign pdf", "e-signature", "ilovepdf", "smallpdf"],
    seoTitle: "PDF Toolkit — Merge, Split, Compress & Sign PDF",
    updated: "2026-10-06",
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
