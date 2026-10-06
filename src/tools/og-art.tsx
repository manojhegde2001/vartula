import type { ComponentType } from "react";
import ChartMakerOgArt from "@/tools/chart-maker/og-art";
import ImageConverterOgArt from "@/tools/image-converter/og-art";
import PdfToolkitOgArt from "@/tools/pdf-toolkit/og-art";
import SvgAnimatorOgArt from "@/tools/svg-animator/og-art";

/**
 * Maps registry slugs to the picture on the tool's Open Graph card (the preview shown when a link is shared).
 * Rendered by Satori, so use inline SVG with plain colours (no classes or CSS variables).
 * Optional: a tool without an entry gets a text-only card.
 */
export const toolOgArt: Record<string, ComponentType<{ accent: string }>> = {
  "svg-animator": SvgAnimatorOgArt,
  "chart-maker": ChartMakerOgArt,
  "image-converter": ImageConverterOgArt,
  "pdf-toolkit": PdfToolkitOgArt,
};
