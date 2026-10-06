import { describe, expect, it } from "vitest";
import { degrees, PDFDocument } from "pdf-lib";
import { formatPages, parseRanges, partName, splitEvery, toPdfPlacement, toUserSpace, type PageBox, type Rotation } from ".";
import { assemble, countPages, fromImages, PdfError, restructure, split, stamp } from "./pdf";

describe("parseRanges", () => {
  it("parses single pages, ranges and open ends", () => {
    expect(parseRanges("1-3, 5, 8-", 10)).toEqual({ groups: [[0, 1, 2], [4], [7, 8, 9]], error: null });
    expect(parseRanges("-2; last", 4).groups).toEqual([[0, 1], [3]]);
    expect(parseRanges("4-2", 5).groups).toEqual([[3, 2, 1]]);
    expect(parseRanges(" 2 – 3 ", 5).groups).toEqual([[1, 2]]);
  });

  it("explains bad input", () => {
    expect(parseRanges("", 5).error).toMatch(/Enter pages/);
    expect(parseRanges("1, x", 5).error).toMatch(/“x”/);
    expect(parseRanges("2-9", 5).error).toMatch(/Page 9 doesn't exist/);
    expect(parseRanges("0", 5).error).toMatch(/Page 0/);
  });
});

describe("split plans and labels", () => {
  it("chunks pages", () => {
    expect(splitEvery(5, 2)).toEqual([[0, 1], [2, 3], [4]]);
    expect(splitEvery(3, 1)).toEqual([[0], [1], [2]]);
    expect(splitEvery(3, 0)).toEqual([[0], [1], [2]]);
  });

  it("labels pages compactly", () => {
    expect(formatPages([0, 1, 2, 4, 6, 7])).toBe("1-3, 5, 7-8");
    expect(partName("report", [0, 1, 2])).toBe("report-pages-1-3.pdf");
    expect(partName("report", [4])).toBe("report-page-5.pdf");
  });
});

describe("placement", () => {
  const box: PageBox = { x: 10, y: 20, width: 600, height: 800 };

  it("maps the displayed corners to user space for every rotation", () => {
    // Top-left of the displayed page, for each /Rotate value.
    expect(toUserSpace(0, 0, box, 0)).toEqual({ x: 10, y: 820 });
    expect(toUserSpace(0, 0, box, 90)).toEqual({ x: 10, y: 20 });
    expect(toUserSpace(0, 0, box, 180)).toEqual({ x: 610, y: 20 });
    expect(toUserSpace(0, 0, box, 270)).toEqual({ x: 610, y: 820 });
  });

  it("sizes the image in displayed proportions and counter-rotates it", () => {
    const view = { u: 0.5, v: 0.5, w: 0.25, h: 0.1 };
    expect(toPdfPlacement(view, box, 0)).toEqual({ x: 310, y: 340, width: 150, height: 80, rotate: 0 });
    const r90 = toPdfPlacement(view, box, 90);
    // Displayed page is 800 wide, 600 tall.
    expect(r90).toMatchObject({ width: 200, height: 60, rotate: 90 });
    expect(r90.x).toBeCloseTo(10 + 0.6 * 600);
    expect(r90.y).toBeCloseTo(20 + 0.5 * 800);
  });

  it("keeps a full-page box covering the page", () => {
    for (const r of [0, 90, 180, 270] as Rotation[]) {
      const p = toPdfPlacement({ u: 0, v: 0, w: 1, h: 1 }, box, r);
      // Rotating the image by `rotate` around its anchor must cover exactly the crop box.
      const rad = (p.rotate * Math.PI) / 180;
      const corner = (dx: number, dy: number) => ({
        x: p.x + dx * Math.cos(rad) - dy * Math.sin(rad),
        y: p.y + dx * Math.sin(rad) + dy * Math.cos(rad),
      });
      const pts = [corner(0, 0), corner(p.width, 0), corner(0, p.height), corner(p.width, p.height)];
      expect(Math.min(...pts.map((q) => q.x))).toBeCloseTo(10);
      expect(Math.max(...pts.map((q) => q.x))).toBeCloseTo(610);
      expect(Math.min(...pts.map((q) => q.y))).toBeCloseTo(20);
      expect(Math.max(...pts.map((q) => q.y))).toBeCloseTo(820);
    }
  });
});

/** A PDF whose pages have distinct widths (100, 101, …), so their order can be checked. */
async function makePdf(pageCount: number, firstWidth = 100) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([firstWidth + i, 200]);
    page.drawText(`Page ${i + 1}`, { x: 10, y: 100, size: 12 });
  }
  return doc.save();
}

async function widths(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => p.getWidth());
}

// 1x1 transparent PNG.
const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0),
);

describe("pdf operations", () => {
  it("merges and reorders pages from several files", async () => {
    const a = await makePdf(3, 100);
    const b = await makePdf(2, 200);
    const out = await assemble({ a, b }, [
      { fileId: "b", index: 1 },
      { fileId: "a", index: 0 },
      { fileId: "a", index: 2, rotation: 90 },
    ]);
    expect(await widths(out)).toEqual([201, 100, 102]);
    const doc = await PDFDocument.load(out, { updateMetadata: false });
    expect(doc.getPage(2).getRotation().angle).toBe(90);
    expect(doc.getProducer()).toMatch(/Vartula/);
  });

  it("adds rotation to a page's own rotation", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]).setRotation(degrees(270));
    const out = await assemble({ x: await doc.save() }, [{ fileId: "x", index: 0, rotation: 180 }]);
    expect((await PDFDocument.load(out)).getPage(0).getRotation().angle).toBe(90);
  });

  it("splits into groups", async () => {
    const parts = await split(await makePdf(5), [[0, 1], [4], [2]]);
    expect(await Promise.all(parts.map(widths))).toEqual([[100, 101], [104], [102]]);
  });

  it("restructures without losing pages", async () => {
    const src = await makePdf(4);
    expect(await widths(await restructure(src))).toEqual([100, 101, 102, 103]);
  });

  it("builds a PDF from page images", async () => {
    // Smallest valid baseline JPEG (1x1 grey).
    const jpeg = Uint8Array.from(
      atob(
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      ),
      (c) => c.charCodeAt(0),
    );
    const out = await fromImages([{ jpeg, width: 300, height: 400 }], "Scan");
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(0).getSize()).toEqual({ width: 300, height: 400 });
    expect(doc.getTitle()).toBe("Scan");
  });

  it("stamps images and keeps the page count", async () => {
    const out = await stamp(await makePdf(2), [
      { pageIndex: 1, png: PNG, box: { u: 0.1, v: 0.8, w: 0.3, h: 0.1 } },
      { pageIndex: 0, png: PNG, box: { u: 0.5, v: 0.5, w: 0.2, h: 0.1 } },
    ]);
    expect(await countPages(out)).toBe(2);
    expect(out.length).toBeGreaterThan(0);
  });

  it("rejects files that aren't PDFs", async () => {
    await expect(countPages(new TextEncoder().encode("hello"))).rejects.toBeInstanceOf(PdfError);
  });
});
