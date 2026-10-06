/**
 * Image files of an exact byte size. Pixels are encoded first, then the gap to the target is filled with
 * data every decoder skips: private PNG chunks, JPEG comment segments, GIF comment blocks, an unknown WebP
 * chunk, the BMP pixel-offset gap or an SVG comment. Pad functions return null when a gap is too small for
 * the format's padding unit (a few bytes); callers then re-encode slightly differently and try again.
 */
import { Zlib, zlibSync } from "fflate";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { createRng } from "../rng";
import { ascii, concat, crc32, u16le, u32be, u32le, type Part } from "./parts";

export type Pixels = Uint8Array | Uint8ClampedArray;

export const imagePatterns = ["card", "gradient", "noise", "solid"] as const;
export type ImagePattern = (typeof imagePatterns)[number];

/** RGBA pixels for the patterns that don't need text (the "card" pattern is drawn on a canvas in the browser). */
export function patternPixels(kind: Exclude<ImagePattern, "card">, w: number, h: number, seed = 1): Uint8ClampedArray<ArrayBuffer> {
  const px = new Uint8ClampedArray(w * h * 4);
  const rng = createRng(seed);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (kind === "noise") {
        px[i] = rng() * 256;
        px[i + 1] = rng() * 256;
        px[i + 2] = rng() * 256;
      } else if (kind === "gradient") {
        px[i] = (x / Math.max(1, w - 1)) * 255;
        px[i + 1] = (y / Math.max(1, h - 1)) * 255;
        px[i + 2] = 180;
      } else {
        px[i] = 79;
        px[i + 1] = 140;
        px[i + 2] = 220;
      }
      px[i + 3] = 255;
    }
  }
  return px;
}

// ---- PNG ----

const PNG_SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const body = concat([ascii(type), data]);
  return concat([u32be(data.length), body, u32be(crc32(body))]);
}

function ihdr(w: number, h: number, depth: number, colorType: number) {
  return pngChunk("IHDR", concat([u32be(w), u32be(h), new Uint8Array([depth, colorType, 0, 0, 0])]));
}

/** 8-bit RGB PNG (alpha dropped: test images are opaque). `level` 0–9 changes the size, which helps hit awkward gaps. */
export function encodePng(rgba: Pixels, w: number, h: number, level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = 6): Uint8Array {
  const stride = w * 3 + 1;
  const raw = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    // Filter type 1 (Sub): store each byte as the difference from the pixel to its left.
    raw[y * stride] = 1;
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        const v = rgba[(y * w + x) * 4 + c];
        const left = x > 0 ? rgba[(y * w + x - 1) * 4 + c] : 0;
        raw[y * stride + 1 + x * 3 + c] = (v - left) & 255;
      }
    }
  }
  return concat([PNG_SIG, ihdr(w, h, 8, 2), pngChunk("IDAT", zlibSync(raw, { level })), pngChunk("IEND", new Uint8Array())]);
}

/** Largest data length per padding chunk; keeps each CRC pass short. */
const PNG_PAD_MAX = 64 << 20;
const PAD_TYPE = ascii("vtPd"); // ancillary, private, safe-to-copy: every decoder skips it.
const zeroCrcCache = new Map<number, number>();

function crcTypeAndZeros(len: number): number {
  let crc = zeroCrcCache.get(len);
  if (crc === undefined) {
    crc = crc32(PAD_TYPE);
    const zeros = new Uint8Array(Math.min(len, 1 << 20));
    for (let left = len; left > 0; left -= zeros.length) crc = crc32(left >= zeros.length ? zeros : zeros.subarray(0, left), crc);
    zeroCrcCache.set(len, crc);
  }
  return crc;
}

/** Split `total` bytes into units of `unitOverhead + data`, each data ≤ max, so they add up exactly. Null if impossible. */
function splitUnits(total: number, overhead: number, max: number): number[] | null {
  if (total === 0) return [];
  if (total < overhead) return null;
  const full = overhead + max;
  const n = Math.ceil(total / full);
  const last = total - (n - 1) * full;
  const sizes = Array<number>(n - 1).fill(max);
  if (last >= overhead) sizes.push(last - overhead);
  else if (n > 1) {
    // Borrow from the previous unit so the last one can hold its overhead.
    sizes[n - 2] = max - (overhead - last);
    sizes.push(0);
  } else return null;
  return sizes;
}

export function padPng(png: Uint8Array, target: number): Part[] | null {
  const datas = splitUnits(target - png.length, 12, PNG_PAD_MAX);
  if (!datas) return null;
  const iend = png.length - 12;
  const parts: Part[] = [png.subarray(0, iend)];
  for (const len of datas) parts.push(concat([u32be(len), PAD_TYPE]), { fill: len, byte: 0 }, u32be(crcTypeAndZeros(len)));
  parts.push(png.subarray(iend));
  return parts;
}

/**
 * A "pixel flood" PNG: tiny on disk but huge when decoded (e.g. 50000×50000), for testing that uploads
 * reject or safely handle images whose dimensions would exhaust memory.
 */
export function pixelFloodPng(w: number, h: number): Uint8Array {
  const stride = 1 + Math.ceil(w / 8); // 1-bit greyscale, filter byte per row
  const rowsPerPush = Math.max(1, Math.floor((4 << 20) / stride));
  const zeros = new Uint8Array(rowsPerPush * stride);
  const out: Uint8Array[] = [];
  const z = new Zlib({ level: 9 });
  z.ondata = (chunk) => out.push(chunk);
  for (let left = h; left > 0; left -= rowsPerPush) {
    const n = Math.min(rowsPerPush, left);
    z.push(n === rowsPerPush ? zeros : zeros.subarray(0, n * stride), left - n <= 0);
  }
  return concat([PNG_SIG, ihdr(w, h, 1, 0), pngChunk("IDAT", concat(out)), pngChunk("IEND", new Uint8Array())]);
}

// ---- JPEG ----

const JPEG_SEG_MAX = 65533; // COM payload: the 2-byte length field counts itself

function jpegComment(len: number): Uint8Array {
  const seg = new Uint8Array(4 + len).fill(0x20);
  seg.set([0xff, 0xfe, ((len + 2) >>> 8) & 255, (len + 2) & 255]);
  return seg;
}

export function padJpeg(jpeg: Uint8Array, target: number): Part[] | null {
  const sizes = splitUnits(target - jpeg.length, 4, JPEG_SEG_MAX);
  if (!sizes) return null;
  const full = sizes.filter((s) => s === JPEG_SEG_MAX).length;
  const rest = sizes.filter((s) => s !== JPEG_SEG_MAX);
  // Comment segments go straight after the SOI marker.
  return [jpeg.subarray(0, 2), { repeat: jpegComment(JPEG_SEG_MAX), times: full }, ...rest.map(jpegComment), jpeg.subarray(2)];
}

// ---- GIF ----

export function encodeGif(rgba: Pixels, w: number, h: number, colors = 256): Uint8Array {
  const palette = quantize(rgba, colors);
  const gif = GIFEncoder();
  gif.writeFrame(applyPalette(rgba, palette), w, h, { palette });
  gif.finish();
  return gif.bytes();
}

export function padGif(gif: Uint8Array, target: number): Part[] | null {
  const d = target - gif.length;
  if (d === 0) return [gif];
  // Comment extension: 21 FE, sub-blocks of (length byte + ≤255 bytes), 00 terminator.
  let m = d - 3;
  if (m < 0) return null;
  let full = Math.floor(m / 256);
  m -= full * 256;
  const tail: number[] = [];
  if (m === 1) {
    if (full === 0) return null;
    full--;
    tail.push(128, 127); // 129 + 128 = 257 bytes
  } else if (m >= 2) tail.push(m - 1);
  const block = (len: number) => {
    const b = new Uint8Array(len + 1).fill(0x78);
    b[0] = len;
    return b;
  };
  return [
    gif.subarray(0, gif.length - 1),
    new Uint8Array([0x21, 0xfe]),
    { repeat: block(255), times: full },
    ...tail.map(block),
    new Uint8Array([0x00]),
    gif.subarray(gif.length - 1),
  ];
}

// ---- WebP ----

const fourcc = (b: Uint8Array, at: number) => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);

/** Extra chunks are only allowed in the extended (VP8X) layout, so a simple WebP is converted first. */
export function padWebp(webp: Uint8Array, target: number, w: number, h: number): Part[] | null {
  if (target === webp.length) return [webp];
  const extended = fourcc(webp, 12) === "VP8X";
  const vp8x = extended
    ? new Uint8Array()
    : concat([ascii("VP8X"), u32le(10), new Uint8Array(4), u32le(w - 1).subarray(0, 3), u32le(h - 1).subarray(0, 3)]);
  const d = target - webp.length - vp8x.length;
  // Chunks are word-aligned, so the padding chunk (8-byte header + data) can only add an even number of bytes.
  if (d !== 0 && (d < 8 || d % 2 !== 0)) return null;
  if (target - 8 > 0xffffffff) return null;
  const header = concat([ascii("RIFF"), u32le(target - 8), ascii("WEBP")]);
  const parts: Part[] = [header, vp8x, webp.subarray(12)];
  if (d > 0) parts.push(concat([ascii("VTPD"), u32le(d - 8)]), { fill: d - 8, byte: 0 });
  return parts;
}

// ---- BMP ----

/** 24-bit BMP. Any extra size goes between the headers and the pixels (the pixel offset says where they start). */
export function bmpFile(rgba: Pixels, w: number, h: number, target: number): Part[] | null {
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const pixelBytes = rowSize * h;
  const gap = target - 54 - pixelBytes;
  if (gap < 0 || target > 0xffffffff) return null;
  const header = new Uint8Array(54);
  header.set(ascii("BM"), 0);
  header.set(u32le(target), 2);
  header.set(u32le(54 + gap), 10);
  header.set(u32le(40), 14);
  header.set(u32le(w), 18);
  header.set(u32le(h), 22);
  header.set(u16le(1), 26);
  header.set(u16le(24), 28);
  header.set(u32le(pixelBytes), 34);
  header.set(u32le(2835), 38);
  header.set(u32le(2835), 42);
  const pixels = new Uint8Array(pixelBytes);
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w * 4; // bottom-up rows
    for (let x = 0; x < w; x++) {
      const o = y * rowSize + x * 3;
      pixels[o] = rgba[src + x * 4 + 2];
      pixels[o + 1] = rgba[src + x * 4 + 1];
      pixels[o + 2] = rgba[src + x * 4];
    }
  }
  return [header, { fill: gap, byte: 0 }, pixels];
}

export const bmpMinSize = (w: number, h: number) => 54 + Math.ceil((w * 3) / 4) * 4 * h;

// ---- SVG ----

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function svgFile(w: number, h: number, label: string, target: number): Part[] | null {
  const fs = Math.max(10, Math.round(Math.min(w, h) / 10));
  const grid = Array.from({ length: 9 }, (_, i) => `<path d="M${((i + 1) * w) / 10} 0V${h}M0 ${((i + 1) * h) / 10}H${w}"/>`).join("");
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f8cdc"/><stop offset="1" stop-color="#8a5cf6"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<g stroke="#ffffff" stroke-opacity="0.25">${grid}</g>
<text x="50%" y="50%" fill="#fff" font-family="sans-serif" font-size="${fs}" text-anchor="middle" dominant-baseline="middle">${xml(label)}</text>
`;
  const tail = "</svg>\n";
  const base = ascii(head + tail).length;
  const d = target - base;
  if (d < 0) return null;
  const padding: Part[] = d >= 7 ? [ascii("<!--"), { fill: d - 7, byte: 0x78 }, ascii("-->")] : [{ fill: d, byte: 0x20 }];
  return [ascii(head), ...padding, ascii(tail)];
}
