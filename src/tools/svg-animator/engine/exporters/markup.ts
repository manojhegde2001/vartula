import { collectDrawables, parseSvgDocument } from "../parse";

export const ROOT_CLASS = "vartula-svg";
export const elementClass = (index: number) => `vt-${index}`;

/** Properties the animation controls; inline values would override the exported CSS. */
const ANIMATED_PROPS = ["stroke-dasharray", "stroke-dashoffset", "fill-opacity"];

function addClass(el: Element, name: string) {
  const existing = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
  if (!existing.includes(name)) existing.push(name);
  el.setAttribute("class", existing.join(" "));
}

function stripAnimatedProps(el: Element) {
  for (const prop of ANIMATED_PROPS) el.removeAttribute(prop);
  const style = el.getAttribute("style");
  if (!style) return;
  const kept = style
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d && !ANIMATED_PROPS.includes(d.split(":")[0].trim().toLowerCase()));
  if (kept.length) el.setAttribute("style", kept.join("; "));
  else el.removeAttribute("style");
}

/**
 * Tag the SVG so exported code can find each drawable: the root gets
 * `vartula-svg`, drawable i gets `vt-i` (same order as the engine model).
 * The callbacks can add attributes or children (used by the SMIL exporter).
 */
export function annotateSvg(
  svgMarkup: string,
  decorate: {
    element?: (el: Element, index: number, doc: Document) => void;
    root?: (root: Element) => void;
  } = {},
): string {
  const { doc, root } = parseSvgDocument(svgMarkup);
  addClass(root, ROOT_CLASS);
  decorate.root?.(root);
  collectDrawables(root).forEach((el, i) => {
    stripAnimatedProps(el);
    addClass(el, elementClass(i));
    decorate.element?.(el, i, doc);
  });
  return new XMLSerializer().serializeToString(root);
}

/** Set one inline style property on an element, keeping its other declarations. */
export function setStyleProperty(el: Element, prop: string, value: string) {
  const kept = (el.getAttribute("style") ?? "")
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d && d.split(":")[0].trim().toLowerCase() !== prop);
  el.setAttribute("style", [...kept, `${prop}: ${value}`].join("; "));
}
