import { describe, expect, it } from "vitest";
import { collectDrawables, parseSvg, parseSvgDocument, SvgParseError } from "./parse";

const svg = (body: string, attrs = 'viewBox="0 0 100 50"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

describe("parseSvg", () => {
  it("returns viewBox, size and drawable elements in document order", () => {
    const model = parseSvg(
      svg(`
        <rect width="10" height="10"/>
        <g><path d="M0 0 H10"/><circle r="5" cx="5" cy="5"/></g>
        <line x1="0" y1="0" x2="3" y2="4"/>
        <polyline points="0,0 10,0"/>
        <polygon points="0,0 10,0 10,10"/>
        <ellipse rx="10" ry="10"/>
        <text>ignored</text>
      `),
    );
    expect(model.viewBox).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    expect(model.width).toBe(100);
    expect(model.height).toBe(50);
    expect(model.elements.map((e) => e.tag)).toEqual(["rect", "path", "circle", "line", "polyline", "polygon", "ellipse"]);
    expect(model.elements.map((e) => e.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const [rect, path, circle, line] = model.elements;
    expect(rect.length).toBe(40);
    expect(path.length).toBe(10);
    expect(circle.length).toBeCloseTo(10 * Math.PI, 3);
    expect(line.length).toBe(5);
  });

  it("skips shapes inside defs, clipPath, mask, symbol and markers", () => {
    const model = parseSvg(
      svg(`
        <defs><path d="M0 0 H5"/></defs>
        <clipPath id="c"><rect width="5" height="5"/></clipPath>
        <mask id="m"><circle r="2"/></mask>
        <symbol id="s"><line x2="4"/></symbol>
        <marker id="k"><path d="M0 0 H1"/></marker>
        <path id="kept" d="M0 0 H7"/>
      `),
    );
    expect(model.elements).toHaveLength(1);
    expect(model.elements[0]).toMatchObject({ id: "kept", length: 7 });
  });

  it("derives size from width/height and the viewBox aspect ratio", () => {
    expect(parseSvg(svg("", 'viewBox="0 0 100 50" width="200"'))).toMatchObject({ width: 200, height: 100 });
    expect(parseSvg(svg("", 'viewBox="0 0 100 50" height="10"'))).toMatchObject({ width: 20, height: 10 });
    expect(parseSvg(svg("", 'width="64" height="32"'))).toMatchObject({
      width: 64,
      height: 32,
      viewBox: { x: 0, y: 0, width: 64, height: 32 },
    });
    expect(parseSvg(svg("", ""))).toMatchObject({ width: 300, height: 150 });
    expect(parseSvg(svg("", 'viewBox="-10,-10,20,20" width="100%"'))).toMatchObject({
      width: 20,
      viewBox: { x: -10, y: -10 },
    });
  });

  it("uses the pathLength attribute when present", () => {
    const model = parseSvg(svg('<path d="M0 0 H10" pathLength="1"/>'));
    expect(model.elements[0].length).toBe(1);
  });

  it("reports zero length for degenerate shapes", () => {
    const model = parseSvg(svg('<path d="M5 5"/><circle r="0"/><rect width="0" height="4"/><path/>'));
    expect(model.elements.map((e) => e.length)).toEqual([0, 0, 0, 0]);
  });

  it("resolves inherited and inline fill-opacity", () => {
    const model = parseSvg(
      svg(`
        <g fill-opacity="0.5"><path d="M0 0H1"/><path d="M0 0H1" style="fill-opacity: 0.25"/></g>
        <path d="M0 0H1" fill-opacity="40%"/>
        <path d="M0 0H1"/>
      `),
    );
    expect(model.elements.map((e) => e.fillOpacity)).toEqual([0.5, 0.25, 0.4, 1]);
  });

  it("resolves percentage lengths against the viewBox", () => {
    const model = parseSvg(svg('<line x1="0" y1="0" x2="50%" y2="0"/>'));
    expect(model.elements[0].length).toBe(50);
  });

  it("accepts SVGs without xmlns or xmlns:xlink declarations", () => {
    const model = parseSvg('<svg viewBox="0 0 10 10"><path d="M0 0H3"/><use xlink:href="#a"/></svg>');
    expect(model.elements).toHaveLength(1);
    const { root } = parseSvgDocument("<svg><path d='M0 0H1'/></svg>");
    expect(root.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });

  it("accepts an XML prolog and doctype", () => {
    const markup = `<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n${svg('<path d="M0 0H2"/>')}`;
    expect(parseSvg(markup).elements[0].length).toBe(2);
  });

  it("throws SvgParseError for invalid input", () => {
    expect(() => parseSvg("")).toThrow(SvgParseError);
    expect(() => parseSvg("<div>hi</div>")).toThrow(/No <svg>/);
    expect(() => parseSvg("<svg><path></svg>")).toThrow(/well-formed/);
  });
});

describe("collectDrawables", () => {
  it("matches the model's element order", () => {
    const markup = svg('<g><circle r="1"/><rect width="1" height="1"/></g><path d="M0 0H1"/>');
    const { root } = parseSvgDocument(markup);
    expect(collectDrawables(root).map((e) => e.localName)).toEqual(parseSvg(markup).elements.map((e) => e.tag));
  });
});
