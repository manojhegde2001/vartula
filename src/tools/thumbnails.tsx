import type { ComponentType } from "react";
import SvgAnimatorThumbnail from "@/tools/svg-animator/thumbnail";

/**
 * Maps registry slugs to the server-rendered SVG preview on home-page cards.
 * Kept apart from components.tsx so the home page never imports a tool's editor.
 * Optional: a tool without an entry falls back to its icon.
 */
export const toolThumbnails: Record<string, ComponentType> = {
  "svg-animator": SvgAnimatorThumbnail,
};
