import type { ToolContent } from "@/lib/tool-content";
import { content as chartMaker } from "@/tools/chart-maker/content";
import { content as imageConverter } from "@/tools/image-converter/content";
import { content as pdfToolkit } from "@/tools/pdf-toolkit/content";
import { content as svgAnimator } from "@/tools/svg-animator/content";

/**
 * Maps registry slugs to each tool's long-form copy (used for /llms.txt and /tools/<slug>.md).
 * Every slug in registry.ts must have an entry here (enforced by tests). No React imports.
 */
export const toolContents: Record<string, ToolContent> = {
  "svg-animator": svgAnimator,
  "chart-maker": chartMaker,
  "image-converter": imageConverter,
  "pdf-toolkit": pdfToolkit,
};
