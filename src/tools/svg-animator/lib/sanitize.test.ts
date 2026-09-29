import { describe, expect, it } from "vitest";
import { loadSvg, sanitizeSvg } from "./sanitize";

describe("sanitizeSvg", () => {
  it("removes scripts, event handlers and javascript: links", () => {
    const out = sanitizeSvg(
      `<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script>` +
        `<a href="javascript:alert(3)"><path d="M0 0H5" onclick="alert(4)"/></a></svg>`,
    );
    expect(out).not.toMatch(/alert|script|onload|onclick|javascript/i);
    expect(out).toContain('d="M0 0H5"');
  });

  it("keeps case-sensitive SVG attributes and declares the namespace", () => {
    const out = sanitizeSvg(`<svg viewBox="0 0 10 10"><path d="M0 0H5" stroke-width="2"/></svg>`);
    expect(out).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(out).toContain('viewBox="0 0 10 10"');
    expect(out).toContain('stroke-width="2"');
  });

  it("drops XML prologs, doctypes and editor metadata", () => {
    const out = sanitizeSvg(
      `<?xml version="1.0"?><!DOCTYPE svg><svg xmlns:inkscape="x" inkscape:version="1" viewBox="0 0 1 1"><path d="M0 0H1"/></svg>`,
    );
    expect(out).not.toMatch(/inkscape|DOCTYPE|<\?xml/);
  });

  it("produces well-formed XML even from HTML-only entities", () => {
    const { model } = loadSvg(`<svg viewBox="0 0 1 1"><title>a&nbsp;b</title><path d="M0 0H1"/></svg>`);
    expect(model.elements).toHaveLength(1);
  });
});

describe("loadSvg", () => {
  it("rejects SVGs without drawable shapes", () => {
    expect(() => loadSvg(`<svg><text>hi</text></svg>`)).toThrow(/no shapes/);
  });

  it("rejects non-SVG input", () => {
    expect(() => loadSvg(`<div>nope</div>`)).toThrow(/No <svg>/);
  });
});
