import type { AnimatorConfig, SvgModel } from "../types";

export interface ExportOptions {
  minify?: boolean;
}

/** Every code exporter has this shape: (config, model, svgMarkup) -> source text. */
export type Exporter = (config: AnimatorConfig, model: SvgModel, svgMarkup: string, options?: ExportOptions) => string;
