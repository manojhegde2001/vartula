import type { ComponentType } from "react";
import ChartMakerThumbnail from "@/tools/chart-maker/thumbnail";
import ImageConverterThumbnail from "@/tools/image-converter/thumbnail";
import PdfToolkitThumbnail from "@/tools/pdf-toolkit/thumbnail";
import SvgAnimatorThumbnail from "@/tools/svg-animator/thumbnail";

/**
 * Maps registry slugs to the server-rendered SVG preview on home-page cards.
 * Kept apart from components.tsx so the home page never imports a tool's editor.
 * Optional: a tool without an entry falls back to its icon.
 */
export const toolThumbnails: Record<string, ComponentType> = {
  "svg-animator": SvgAnimatorThumbnail,
  "chart-maker": ChartMakerThumbnail,
  "image-converter": ImageConverterThumbnail,
  "pdf-toolkit": PdfToolkitThumbnail,
};
