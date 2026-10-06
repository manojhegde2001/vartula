import { describe, expect, it } from "vitest";
import { fitToSize, formatBytes, isHeif, outputName, planResize, uniqueNames, type ResizeSettings } from ".";

const resize = (r: Partial<ResizeSettings>): ResizeSettings => ({ mode: "none", percent: 100, width: null, height: null, ...r });

describe("planResize", () => {
  it("keeps the size when not resizing", () => {
    expect(planResize(4032, 3024, resize({}))).toEqual({ width: 4032, height: 3024, sx: 0, sy: 0, sw: 4032, sh: 3024 });
  });

  it("scales by percentage", () => {
    const p = planResize(4000, 3000, resize({ mode: "percent", percent: 25 }));
    expect([p.width, p.height]).toEqual([1000, 750]);
  });

  it("fits inside a box without enlarging", () => {
    expect(planResize(4000, 3000, resize({ mode: "fit", width: 1920, height: 1080 }))).toMatchObject({ width: 1440, height: 1080 });
    expect(planResize(4000, 3000, resize({ mode: "fit", width: 1000 }))).toMatchObject({ width: 1000, height: 750 });
    expect(planResize(800, 600, resize({ mode: "fit", width: 1920, height: 1080 }))).toMatchObject({ width: 800, height: 600 });
  });

  it("keeps the aspect ratio when only one exact side is given", () => {
    expect(planResize(4000, 3000, resize({ mode: "exact", height: 600 }))).toMatchObject({ width: 800, height: 600 });
  });

  it("centre-crops to fill an exact size", () => {
    const p = planResize(4000, 3000, resize({ mode: "exact", width: 600, height: 600 }));
    expect(p).toEqual({ width: 600, height: 600, sx: 500, sy: 0, sw: 3000, sh: 3000 });
    const tall = planResize(1000, 3000, resize({ mode: "exact", width: 400, height: 300 }));
    expect(tall).toMatchObject({ sx: 0, sw: 1000, sh: 750, sy: 1125 });
  });

  it("never returns an empty canvas", () => {
    expect(planResize(10, 10, resize({ mode: "percent", percent: 1 }))).toMatchObject({ width: 1, height: 1 });
  });
});

describe("fitToSize", () => {
  // A fake encoder whose output grows with quality and pixel count, like a real JPEG.
  const fake = (base: number) => {
    const calls: [number, number][] = [];
    const encode = async (q: number, s: number) => {
      calls.push([q, s]);
      return { size: Math.round(base * s * s * (0.2 + q)) };
    };
    return { encode, calls };
  };
  const dims = { width: 4000, height: 3000 };

  it("returns the first attempt when it already fits", async () => {
    const { encode, calls } = fake(1000);
    const r = await fitToSize(encode, { target: 5000, maxQuality: 0.8, lossy: true, ...dims });
    expect(r).toMatchObject({ quality: 0.8, scale: 1, met: true });
    expect(calls).toHaveLength(1);
  });

  it("finds the highest quality under the budget", async () => {
    const { encode } = fake(100_000);
    const r = await fitToSize(encode, { target: 70_000, maxQuality: 0.9, lossy: true, ...dims });
    expect(r.met).toBe(true);
    expect(r.scale).toBe(1);
    expect(r.result.size).toBeLessThanOrEqual(70_000);
    expect(r.quality).toBeGreaterThan(0.45);
  });

  it("shrinks the image when lowering quality is not enough", async () => {
    const { encode } = fake(1_000_000);
    const r = await fitToSize(encode, { target: 100_000, maxQuality: 0.8, lossy: true, ...dims });
    expect(r.met).toBe(true);
    expect(r.scale).toBeLessThan(1);
    expect(r.result.size).toBeLessThanOrEqual(100_000);
  });

  it("only resizes lossless formats", async () => {
    const { encode, calls } = fake(1_000_000);
    const r = await fitToSize(encode, { target: 200_000, maxQuality: 1, lossy: false, ...dims });
    expect(r.met).toBe(true);
    expect(new Set(calls.map(([q]) => q))).toEqual(new Set([1]));
  });

  it("reports when the budget cannot be met", async () => {
    const r = await fitToSize(async () => ({ size: 10_000 }), { target: 100, maxQuality: 0.8, lossy: true, ...dims });
    expect(r.met).toBe(false);
    expect(r.result.size).toBe(10_000);
  });
});

describe("helpers", () => {
  it("detects HEIF by name, type or magic bytes", () => {
    const bytes = (brand: string) => new Uint8Array([0, 0, 0, 24, ...[..."ftyp", ...brand].map((c) => c.charCodeAt(0))]);
    expect(isHeif(bytes("heic"))).toBe(true);
    expect(isHeif(bytes("mif1"))).toBe(true);
    expect(isHeif(bytes("avif"))).toBe(false);
    expect(isHeif(new Uint8Array(), "IMG_0001.HEIC")).toBe(true);
    expect(isHeif(new Uint8Array(), "x", "image/heif")).toBe(true);
    expect(isHeif(new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false);
  });

  it("formats sizes in 1000-based units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(99_999)).toBe("100 KB");
    expect(formatBytes(2_400_000)).toBe("2.40 MB");
  });

  it("renames and de-duplicates output files", () => {
    expect(outputName("IMG_0001.HEIC", "jpeg")).toBe("IMG_0001.jpg");
    expect(outputName("archive.tar.png", "webp")).toBe("archive.tar.webp");
    expect(uniqueNames(["a.jpg", "A.jpg", "a.jpg", "b.jpg"])).toEqual(["a.jpg", "A (2).jpg", "a (3).jpg", "b.jpg"]);
  });
});
