import DOMPurify from "dompurify";
import { parseSvg, SvgParseError } from "../engine";
import type { SvgModel } from "../engine";

/** Largest SVG we accept, in bytes of markup. */
export const MAX_SVG_BYTES = 5 * 1024 * 1024;

/**
 * Strip scripts, event handlers, external references and non-SVG content, then
 * re-serialize as standalone XML (with xmlns) so it can be rendered as an image.
 * Browser-only (DOMPurify needs a DOM).
 */
export function sanitizeSvg(raw: string): string {
  if (raw.length > MAX_SVG_BYTES) throw new SvgParseError("That SVG is larger than 5 MB.");
  if (!/<svg[\s>]/i.test(raw)) throw new SvgParseError("No <svg> element found.");

  const fragment = DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    RETURN_DOM_FRAGMENT: true,
  });
  const svg = fragment.querySelector("svg");
  if (!svg) throw new SvgParseError("No <svg> element found after sanitizing.");
  return new XMLSerializer().serializeToString(svg);
}

export interface LoadedSvg {
  markup: string;
  model: SvgModel;
}

/** Sanitize and parse user-provided markup. Throws SvgParseError with a readable message. */
export function loadSvg(raw: string): LoadedSvg {
  const markup = sanitizeSvg(raw);
  const model = parseSvg(markup);
  if (model.elements.length === 0) {
    throw new SvgParseError(
      "This SVG has no shapes to animate (path, line, polyline, polygon, circle, ellipse or rect). Text must be converted to paths first.",
    );
  }
  return { markup, model };
}
