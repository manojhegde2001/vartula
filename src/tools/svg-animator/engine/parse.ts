import { ellipsePerimeter, pathLength, pointsLength, rectLength } from "./geometry";
import type { DrawableElement, DrawableTag, SvgModel, ViewBox } from "./types";

export const SVG_NS = "http://www.w3.org/2000/svg";
export const DRAWABLE_TAGS: readonly DrawableTag[] = ["path", "line", "polyline", "polygon", "circle", "ellipse", "rect"];
const DRAWABLE_SET = new Set<string>(DRAWABLE_TAGS);

/** Containers whose children are never rendered directly (lower-cased). */
const NON_RENDERED = new Set([
  "defs",
  "clippath",
  "mask",
  "symbol",
  "pattern",
  "marker",
  "lineargradient",
  "radialgradient",
  "filter",
  "foreignobject",
]);

export class SvgParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SvgParseError";
  }
}

/**
 * Drawable elements of an SVG root, in document order. Parsing, preview,
 * frame rendering and exporters all use this so element indices always line up.
 */
export function collectDrawables(root: Element): Element[] {
  const out: Element[] = [];
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const name = child.localName.toLowerCase();
      if (NON_RENDERED.has(name)) continue;
      if (DRAWABLE_SET.has(name)) out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
}

function getDomParser(): DOMParser {
  const Parser = (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
  if (!Parser) throw new SvgParseError("DOMParser is not available in this environment.");
  return new Parser();
}

const hasParserError = (doc: Document) => doc.getElementsByTagName("parsererror").length > 0;

/** Parse markup into an XML document rooted at <svg>, adding the SVG namespace if it was omitted. */
export function parseSvgDocument(markup: string): { doc: Document; root: Element } {
  const trimmed = markup.trim();
  if (!trimmed) throw new SvgParseError("The SVG is empty.");
  if (!/<svg[\s>]/i.test(trimmed)) throw new SvgParseError("No <svg> element found.");

  const parser = getDomParser();
  let doc = parser.parseFromString(trimmed, "image/svg+xml");
  if (hasParserError(doc) || doc.documentElement.namespaceURI !== SVG_NS) {
    // Hand-written SVGs often omit xmlns / xmlns:xlink; declare them and retry.
    doc = parser.parseFromString(addMissingNamespaces(trimmed), "image/svg+xml");
    if (hasParserError(doc)) throw new SvgParseError("The SVG markup is not well-formed XML.");
  }
  const root = doc.documentElement;
  if (root.localName !== "svg") throw new SvgParseError("The root element must be <svg>.");
  return { doc, root };
}

function addMissingNamespaces(markup: string): string {
  return markup.replace(/<svg(?=[\s>/])([^>]*)>/i, (_tag, attrs: string) => {
    let extra = "";
    if (!/\sxmlns\s*=/.test(attrs)) extra += ` xmlns="${SVG_NS}"`;
    if (/xlink:/.test(markup) && !/\sxmlns:xlink\s*=/.test(attrs)) extra += ` xmlns:xlink="http://www.w3.org/1999/xlink"`;
    return `<svg${extra}${attrs}>`;
  });
}

function lengthAttr(el: Element, name: string, basis: number): number {
  const raw = el.getAttribute(name);
  if (raw == null) return 0;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  return raw.trim().endsWith("%") ? (n / 100) * basis : n;
}

function optLengthAttr(el: Element, name: string, basis: number): number | null {
  const raw = el.getAttribute(name)?.trim();
  if (!raw || raw === "auto") return null;
  return lengthAttr(el, name, basis);
}

function styleProp(el: Element, prop: string): string | null {
  const style = el.getAttribute("style");
  if (!style) return null;
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;!]+)`, "i").exec(style);
  return m ? m[1].trim() : null;
}

/** fill-opacity is inherited; an inline style beats the presentation attribute. */
function effectiveFillOpacity(el: Element): number {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const v = (styleProp(node, "fill-opacity") ?? node.getAttribute("fill-opacity"))?.trim();
    if (v && v !== "inherit") {
      const n = v.endsWith("%") ? parseFloat(v) / 100 : parseFloat(v);
      if (Number.isFinite(n)) return Math.min(Math.max(n, 0), 1);
    }
  }
  return 1;
}

/** Stroke length of one drawable element, in its own user units. */
export function elementLength(el: Element, vb: ViewBox): number {
  const explicit = parseFloat(el.getAttribute("pathLength") ?? "");
  if (explicit > 0) return explicit;
  const w = vb.width;
  const h = vb.height;
  const diag = Math.sqrt((w * w + h * h) / 2);
  switch (el.localName.toLowerCase() as DrawableTag) {
    case "path":
      return pathLength(el.getAttribute("d") ?? "");
    case "line":
      return Math.hypot(lengthAttr(el, "x2", w) - lengthAttr(el, "x1", w), lengthAttr(el, "y2", h) - lengthAttr(el, "y1", h));
    case "polyline":
      return pointsLength(el.getAttribute("points") ?? "", false);
    case "polygon":
      return pointsLength(el.getAttribute("points") ?? "", true);
    case "circle": {
      const r = lengthAttr(el, "r", diag);
      return r > 0 ? 2 * Math.PI * r : 0;
    }
    case "ellipse":
      return ellipsePerimeter(lengthAttr(el, "rx", w), lengthAttr(el, "ry", h));
    case "rect":
      return rectLength(
        lengthAttr(el, "width", w),
        lengthAttr(el, "height", h),
        optLengthAttr(el, "rx", w),
        optLengthAttr(el, "ry", h),
      );
    default:
      return 0;
  }
}

export function readViewBox(root: Element): { viewBox: ViewBox; width: number; height: number } {
  const parts = (root.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  const hasVb = parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0;

  const abs = (name: string) => {
    const raw = root.getAttribute(name)?.trim();
    if (!raw || raw.endsWith("%")) return null;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const w = abs("width");
  const h = abs("height");

  if (hasVb) {
    const [x, y, vw, vh] = parts;
    const width = w ?? (h != null ? (h * vw) / vh : vw);
    const height = h ?? (w != null ? (w * vh) / vw : vh);
    return { viewBox: { x, y, width: vw, height: vh }, width, height };
  }
  // No viewBox: browsers default to 300x150 when size is missing too.
  const width = w ?? 300;
  const height = h ?? 150;
  return { viewBox: { x: 0, y: 0, width, height }, width, height };
}

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

/** Parse SVG markup into the model the animation engine runs on. */
export function parseSvg(markup: string): SvgModel {
  const { root } = parseSvgDocument(markup);
  const { viewBox, width, height } = readViewBox(root);
  const elements: DrawableElement[] = collectDrawables(root).map((el, index) => {
    const length = elementLength(el, viewBox);
    return {
      index,
      tag: el.localName.toLowerCase() as DrawableTag,
      length: Number.isFinite(length) && length > 0 ? round(length, 4) : 0,
      fillOpacity: effectiveFillOpacity(el),
      id: el.getAttribute("id"),
    };
  });
  return { viewBox, width, height, elements };
}
