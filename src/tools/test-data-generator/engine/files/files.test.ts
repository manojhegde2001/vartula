import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { padMp4, wavFile, zipFile } from "./binary";
import { docxFile, pdfFile, xlsxFile } from "./documents";
import { edgeFiles } from "./edge-files";
import { bmpFile, encodeGif, encodePng, padGif, padJpeg, padPng, padWebp, patternPixels, pixelFloodPng, svgFile } from "./images";
import { chunks, crc32, toBytes, totalSize, type Part } from "./parts";
import { textFile, textKinds, textMinSize } from "./text";

const bytes = (parts: Part[] | null) => {
  expect(parts).not.toBeNull();
  return toBytes(parts!);
};

describe("parts", () => {
  it("streams fills, repeats and random bytes in bounded chunks", () => {
    const parts: Part[] = [new Uint8Array([1, 2, 3]), { fill: 5, byte: 9 }, { repeat: new Uint8Array([7, 8]), times: 4 }, { random: 10, seed: 3 }];
    expect(totalSize(parts)).toBe(26);
    const all = toBytes(parts);
    expect([...all.slice(0, 16)]).toEqual([1, 2, 3, 9, 9, 9, 9, 9, 7, 8, 7, 8, 7, 8, 7, 8]);
    expect(toBytes(parts)).toEqual(all); // random parts are seeded
    for (const c of chunks(parts, 4)) expect(c.length).toBeLessThanOrEqual(4);
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
});

describe("text files", () => {
  it.each(textKinds)("%s hits exact sizes and stays valid", (kind) => {
    for (const size of [textMinSize(kind), textMinSize(kind) + 1, 1000, 8191, 50_000]) {
      const out = bytes(textFile(kind, size));
      expect(out.length, `${kind} ${size}`).toBe(size);
      const s = new TextDecoder().decode(out);
      if (kind === "json") expect(() => JSON.parse(s)).not.toThrow();
      if (kind === "xml" || kind === "html") expect(new DOMParser().parseFromString(s, kind === "xml" ? "application/xml" : "text/html").getElementsByTagName("parsererror")).toHaveLength(0);
      if (kind === "csv") for (const line of s.split("\r\n").filter(Boolean)) expect(line.split(",").length, line.slice(0, 40)).toBeGreaterThanOrEqual(5);
    }
  });

  it("refuses sizes below the minimum", () => {
    expect(() => textFile("json", 5)).toThrow(/at least/);
  });
});

describe("images", () => {
  const w = 120;
  const h = 80;
  const px = patternPixels("gradient", w, h);

  it("pads PNGs exactly and they still decode", async () => {
    const png = encodePng(px, w, h);
    for (const target of [png.length, png.length + 12, png.length + 13, png.length + 100_000]) {
      const out = bytes(padPng(png, target));
      expect(out.length).toBe(target);
      const meta = await sharp(out).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(["png", w, h]);
    }
    expect(padPng(png, png.length + 5)).toBeNull();
  });

  it("pads JPEG, GIF and WebP exactly and they still decode", async () => {
    const raw = { raw: { width: w, height: h, channels: 4 as const } };
    const jpeg = new Uint8Array(await sharp(Buffer.from(px), raw).jpeg().toBuffer());
    const webp = new Uint8Array(await sharp(Buffer.from(px), raw).webp({ quality: 80 }).toBuffer());
    const gif = encodeGif(px, w, h);
    const cases = [
      { name: "jpeg", pad: (t: number) => padJpeg(jpeg, t), base: jpeg.length, deltas: [0, 4, 5, 65_537, 65_538, 200_003] },
      { name: "gif", pad: (t: number) => padGif(gif, t), base: gif.length, deltas: [0, 3, 5, 259, 260, 10_000] },
      { name: "webp", pad: (t: number) => padWebp(webp, t, w, h), base: webp.length, deltas: [18, 26, 1000, 50_000] },
    ];
    for (const c of cases) {
      for (const d of c.deltas) {
        const out = bytes(c.pad(c.base + d));
        expect(out.length, `${c.name} +${d}`).toBe(c.base + d);
        const meta = await sharp(out).metadata();
        expect([meta.width, meta.height], `${c.name} +${d}`).toEqual([w, h]);
      }
    }
    expect(padJpeg(jpeg, jpeg.length + 2)).toBeNull();
    expect(padGif(gif, gif.length + 4)).toBeNull();
    expect(padWebp(webp, webp.length + 27, w, h)).toBeNull();
  });

  it("writes BMP and SVG at exact sizes", () => {
    const bmp = bytes(bmpFile(px, w, h, 40_000));
    expect(bmp.length).toBe(40_000);
    expect(String.fromCharCode(bmp[0], bmp[1])).toBe("BM");
    expect(new DataView(bmp.buffer).getUint32(2, true)).toBe(40_000);
    expect(bmpFile(px, w, h, 100)).toBeNull();
    for (const target of [1000, 1003, 20_000]) {
      const svg = bytes(svgFile(320, 200, "Test 1 KB", target));
      expect(svg.length).toBe(target);
      expect(new DOMParser().parseFromString(new TextDecoder().decode(svg), "image/svg+xml").getElementsByTagName("parsererror")).toHaveLength(0);
    }
  });

  it("makes pixel-flood PNGs with huge declared dimensions", async () => {
    const png = pixelFloodPng(4000, 3000);
    expect(png.length).toBeLessThan(20_000);
    const meta = await sharp(png).metadata();
    expect([meta.width, meta.height]).toEqual([4000, 3000]);
  });
});

describe("documents", () => {
  it("makes PDFs of an exact size", async () => {
    const o = { pages: 2, pageSize: "a4" as const, label: "Test" };
    for (const target of [20_000, 20_001, 123_457]) {
      const pdf = await pdfFile(o, target);
      expect(pdf.length).toBe(target);
      expect((await PDFDocument.load(pdf)).getPageCount()).toBe(2);
    }
    await expect(pdfFile(o, 500)).rejects.toThrow(/at least/);
  });

  it("makes DOCX and XLSX of an exact size", () => {
    for (const [make, main] of [
      [docxFile, "word/document.xml"],
      [xlsxFile, "xl/worksheets/sheet1.xml"],
    ] as const) {
      for (const target of [3000, 3001, 75_000]) {
        const out = make(target);
        expect(out.length).toBe(target);
        const files = unzipSync(out);
        const xml = new TextDecoder().decode(files[main]);
        expect(new DOMParser().parseFromString(xml, "application/xml").getElementsByTagName("parsererror")).toHaveLength(0);
      }
    }
  });
});

describe("binary", () => {
  it("makes WAV files of any size", () => {
    for (const tone of ["sine", "silence", "noise"] as const) {
      for (const target of [44, 45, 46, 10_001, 88_244]) {
        const wav = bytes(wavFile(target, tone));
        expect(wav.length).toBe(target);
        const v = new DataView(wav.buffer);
        expect(v.getUint32(4, true)).toBe(target - 8);
        expect(v.getUint32(40, true) % 1).toBe(0);
      }
    }
  });

  it("makes ZIP files that unzip to the right content", () => {
    for (const content of ["random", "zeros", "text"] as const) {
      const zip = bytes(zipFile(50_000, content));
      expect(zip.length).toBe(50_000);
      const files = unzipSync(zip);
      expect(files["data.bin"].length).toBe(50_000 - 98 - 16);
    }
  });

  it("pads MP4 with a free box", () => {
    const fake = new Uint8Array(100);
    expect(bytes(padMp4(fake, 1000)).length).toBe(1000);
    expect(padMp4(fake, 105)).toBeNull();
    const big = padMp4(fake, 100 + 5 * 2 ** 32)!;
    expect(totalSize(big)).toBe(100 + 5 * 2 ** 32);
  });
});

describe("edge files", () => {
  it("builds every edge-case file", async () => {
    for (const f of edgeFiles.filter((x) => x.id !== "pixel-flood")) {
      const out = await f.build();
      expect(ArrayBuffer.isView(out), f.id).toBe(true);
    }
    const slip = unzipSync(await edgeFiles.find((f) => f.id === "zip-slip")!.build());
    expect(Object.keys(slip)).toContain("../../evil.txt");
    expect(edgeFiles.find((f) => f.id === "long-name")!.name).toHaveLength(255);
  });
});
