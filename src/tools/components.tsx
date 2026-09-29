import type { ComponentType } from "react";
import SvgAnimatorToolPage from "@/tools/svg-animator/tool-page";

/**
 * Maps registry slugs to the server component that renders the tool.
 * Every slug in registry.ts must have an entry here (enforced by tests).
 */
export const toolComponents: Record<string, ComponentType> = {
  "svg-animator": SvgAnimatorToolPage,
};
