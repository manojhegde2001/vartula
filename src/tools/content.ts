import type { ToolContent } from "@/lib/tool-content";
import { content as svgAnimator } from "@/tools/svg-animator/content";

/**
 * Maps registry slugs to each tool's long-form copy (used for /llms.txt and /tools/<slug>.md).
 * Every slug in registry.ts must have an entry here (enforced by tests). No React imports.
 */
export const toolContents: Record<string, ToolContent> = {
  "svg-animator": svgAnimator,
};
