import type { ComponentType } from "react";
import ChartMakerToolPage from "@/tools/chart-maker/tool-page";
import ImageConverterToolPage from "@/tools/image-converter/tool-page";
import PdfToolkitToolPage from "@/tools/pdf-toolkit/tool-page";
import SvgAnimatorToolPage from "@/tools/svg-animator/tool-page";

/**
 * Maps registry slugs to the server component that renders the tool.
 * Every slug in registry.ts must have an entry here (enforced by tests).
 */
export const toolComponents: Record<string, ComponentType> = {
  "svg-animator": SvgAnimatorToolPage,
  "chart-maker": ChartMakerToolPage,
  "image-converter": ImageConverterToolPage,
  "pdf-toolkit": PdfToolkitToolPage,
};
