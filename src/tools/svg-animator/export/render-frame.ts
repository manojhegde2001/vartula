/**
 * Rasterize animation frames. Each frame bakes getFrameState values into the
 * SVG, serializes it, loads it as an Image from a Blob URL and draws it onto an
 * OffscreenCanvas. Browser-only.
 */
import { applyFrame, collectDrawables, getFrameState, parseSvgDocument } from "../engine";
import type { AnimatorConfig, SvgModel } from "../engine";

export interface FrameRenderer {
  /** Reused for every frame; read or encode it before rendering the next one. */
  canvas: OffscreenCanvas;
  context: OffscreenCanvasRenderingContext2D;
  render(timeMs: number): Promise<OffscreenCanvas>;
}

/** Fraction of the shorter side kept as margin around the artwork. */
const MARGIN = 0.05;

export function createFrameRenderer(
  svgMarkup: string,
  config: AnimatorConfig,
  model: SvgModel,
  width: number,
  height: number,
  { willReadFrequently = false }: { willReadFrequently?: boolean } = {},
): FrameRenderer {
  const { root } = parseSvgDocument(svgMarkup);
  const elements = collectDrawables(root);

  // Fit the artwork (aspect preserved) inside the frame with a small margin.
  const margin = Math.round(Math.min(width, height) * MARGIN);
  const scale = Math.min((width - 2 * margin) / model.width, (height - 2 * margin) / model.height);
  const drawW = model.width * scale;
  const drawH = model.height * scale;
  const drawX = (width - drawW) / 2;
  const drawY = (height - drawH) / 2;
  const { x, y, width: vw, height: vh } = model.viewBox;
  root.setAttribute("viewBox", `${x} ${y} ${vw} ${vh}`);
  root.setAttribute("width", String(drawW));
  root.setAttribute("height", String(drawH));

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", { alpha: true, willReadFrequently });
  if (!context) throw new Error("Could not create a 2D canvas context.");
  const serializer = new XMLSerializer();
  const background = config.background === "transparent" ? null : config.background;

  return {
    canvas,
    context,
    async render(timeMs: number) {
      applyFrame(elements, getFrameState(config, model, timeMs));
      const blob = new Blob([serializer.serializeToString(root)], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      try {
        img.src = url;
        await img.decode();
        context.clearRect(0, 0, width, height);
        if (background) {
          context.fillStyle = background;
          context.fillRect(0, 0, width, height);
        }
        context.drawImage(img, drawX, drawY, drawW, drawH);
      } finally {
        URL.revokeObjectURL(url);
        img.src = "";
      }
      return canvas;
    },
  };
}

/** Render a single frame at `timeMs` into a new OffscreenCanvas of w×h pixels. */
export function renderFrame(
  svgMarkup: string,
  config: AnimatorConfig,
  model: SvgModel,
  timeMs: number,
  width: number,
  height: number,
): Promise<OffscreenCanvas> {
  return createFrameRenderer(svgMarkup, config, model, width, height).render(timeMs);
}
