/**
 * Browser side of file generation: draws test cards on a canvas, uses the browser's JPEG/WebP encoders and
 * WebCodecs (MP4), then hands the bytes to the pure padding functions in engine/files. Loaded on first use.
 */
import { padMp4, rawContent, wavFile, zipFile, type BinaryContent, type WavTone } from "../engine/files/binary";
import { docxFile, pdfFile, xlsxFile, type PdfOptions } from "../engine/files/documents";
import { bmpFile, encodeGif, encodePng, padGif, padJpeg, padPng, padWebp, patternPixels, svgFile, type ImagePattern } from "../engine/files/images";
import { SizeError, type Part } from "../engine/files/parts";
import { textFile } from "../engine/files/text";
import type { FileTypeId } from "./file-types";

export interface FileOptions {
  width: number;
  height: number;
  pattern: ImagePattern;
  /** Shrink the image when the requested size is too small for these dimensions. */
  autoFit: boolean;
  pages: number;
  pageSize: PdfOptions["pageSize"];
  tone: WavTone;
  seconds: number;
  content: BinaryContent;
}

export interface Generated {
  parts: Part[];
  /** Something the user should know, e.g. that the image was made smaller to fit. */
  note?: string;
}

// ---- Drawing ----

function drawCard(ctx: CanvasRenderingContext2D, w: number, h: number, label: string, seed: number, frame?: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  const hue = (seed * 47) % 360;
  g.addColorStop(0, `hsl(${hue} 70% 55%)`);
  g.addColorStop(1, `hsl(${(hue + 80) % 360} 65% 45%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Grid and corner marks make cropping or scaling visible at a glance.
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = Math.max(1, Math.round(Math.min(w, h) / 400));
  for (let i = 1; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo((i * w) / 10, 0);
    ctx.lineTo((i * w) / 10, h);
    ctx.moveTo(0, (i * h) / 10);
    ctx.lineTo(w, (i * h) / 10);
    ctx.stroke();
  }
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) / 120));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  if (frame !== undefined) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(((frame * 7) % 100) * (w / 100), 0, Math.max(4, w / 60), h);
  }
  const big = Math.max(10, Math.round(Math.min(w / (label.length * 0.62), h / 4)));
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${big}px system-ui, sans-serif`;
  ctx.fillText(label, w / 2, h / 2 - (frame !== undefined ? big * 0.4 : 0));
  const small = Math.max(8, Math.round(big / 3));
  ctx.font = `${small}px system-ui, sans-serif`;
  ctx.fillText(frame !== undefined ? `${w}×${h} · frame ${frame + 1}` : `${w} × ${h}`, w / 2, h / 2 + big * 0.75);
}

function canvasFor(w: number, h: number, pattern: ImagePattern, label: string, seed: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  if (pattern === "card") drawCard(ctx, w, h, label, seed);
  else ctx.putImageData(new ImageData(patternPixels(pattern, w, h, seed), w, h), 0, 0);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b && b.type === type ? resolve(b) : reject(new Error(`Your browser can't encode ${type.replace("image/", "").toUpperCase()}.`))), type, quality),
  );
const blobBytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

/** Try encodings from largest to smallest; return the first that can be padded to the target. */
async function encodeImage(type: FileTypeId, w: number, h: number, o: FileOptions, label: string, seed: number, target: number): Promise<Part[] | "too-big"> {
  if (type === "svg") return svgFile(w, h, label, target) ?? "too-big";
  const canvas = canvasFor(w, h, o.pattern, label, seed);
  try {
    const rgba = () => canvas.getContext("2d")!.getImageData(0, 0, w, h).data;
    let smallest = Infinity;
    if (type === "png") {
      const px = rgba();
      for (const level of [6, 9, 4, 1, 0] as const) {
        const png = encodePng(px, w, h, level);
        smallest = Math.min(smallest, png.length);
        const p = png.length <= target ? padPng(png, target) : null;
        if (p) return p;
      }
    } else if (type === "bmp") {
      return bmpFile(rgba(), w, h, target) ?? "too-big";
    } else if (type === "gif") {
      const px = rgba();
      for (const colors of [256, 255, 254, 128, 64, 32, 16]) {
        const gif = encodeGif(px, w, h, colors);
        smallest = Math.min(smallest, gif.length);
        const p = gif.length <= target ? padGif(gif, target) : null;
        if (p) return p;
      }
    } else {
      const mime = type === "jpg" ? "image/jpeg" : "image/webp";
      for (let q = 0.92; q >= 0.3; q -= q > 0.5 ? 0.04 : 0.01) {
        const bytes = await blobBytes(await toBlob(canvas, mime, q));
        smallest = Math.min(smallest, bytes.length);
        if (bytes.length > target) continue;
        const p = type === "jpg" ? padJpeg(bytes, target) : padWebp(bytes, target, w, h);
        if (p) return p;
      }
    }
    if (smallest > target) return "too-big";
    throw new SizeError("Couldn't hit that exact size; try a size a few bytes larger.");
  } finally {
    canvas.width = canvas.height = 0;
  }
}

// ---- Video ----

async function encodeMp4(w: number, h: number, seconds: number, target: number, label: string, seed: number, onProgress?: (f: number) => void): Promise<Part[]> {
  if (typeof VideoEncoder === "undefined") throw new Error("Your browser can't encode video (WebCodecs is missing). Try Chrome, Edge or Safari 17+.");
  const mb = await import("mediabunny");
  const fps = 30;
  const frames = Math.max(1, Math.round(seconds * fps));
  // Aim for 70% of the target from video data and pad the rest; padding is free, encoding big bitrates isn't.
  let bitrate = Math.min(8_000_000, Math.max(50_000, (target * 8 * 0.7) / seconds));
  for (let attempt = 0; attempt < 4; attempt++) {
    const format = new mb.Mp4OutputFormat({ fastStart: "in-memory" });
    const codec = await mb.getFirstEncodableVideoCodec(["avc", "vp9", "av1"].filter((c) => format.getSupportedVideoCodecs().includes(c as never)) as never, { width: w, height: h });
    if (!codec) throw new Error("Your browser can't encode MP4 video at this size.");
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    const output = new mb.Output({ format, target: new mb.BufferTarget() });
    const source = new mb.CanvasSource(canvas, { codec, bitrate });
    output.addVideoTrack(source, { frameRate: fps });
    await output.start();
    try {
      for (let i = 0; i < frames; i++) {
        drawCard(ctx, w, h, label, seed, i);
        await source.add(i / fps, 1 / fps);
        onProgress?.((i + 1) / frames);
      }
      source.close();
      await output.finalize();
    } catch (err) {
      await output.cancel().catch(() => {});
      throw err;
    }
    const buffer = (output.target as InstanceType<typeof mb.BufferTarget>).buffer;
    if (!buffer) throw new Error("The encoder produced no data.");
    const mp4 = new Uint8Array(buffer);
    const padded = mp4.length <= target ? padMp4(mp4, target) : null;
    if (padded) return padded;
    bitrate *= mp4.length > target ? (target / mp4.length) * 0.6 : 0.98;
  }
  throw new SizeError("That size is too small for a video this long and large. Shorten it, lower the resolution or pick a larger size.");
}

// ---- Entry point ----

export async function generateFile(type: FileTypeId, target: number, o: FileOptions, label: string, seed: number, onProgress?: (fraction: number) => void): Promise<Generated> {
  switch (type) {
    case "png":
    case "jpg":
    case "webp":
    case "gif":
    case "bmp":
    case "svg": {
      let w = o.width;
      let h = o.height;
      for (let attempt = 0; attempt < 12; attempt++) {
        const result = await encodeImage(type, w, h, o, label, seed, target);
        if (result !== "too-big") return { parts: result, note: w !== o.width ? `Reduced to ${w}×${h} pixels to fit the size.` : undefined };
        if (!o.autoFit || (w <= 8 && h <= 8)) {
          throw new SizeError(`A ${o.width}×${o.height} ${type.toUpperCase()} doesn't fit in that size. Lower the dimensions, pick a simpler pattern or allow resizing.`);
        }
        // Encoded size tracks pixel count, so shrink both sides together.
        w = Math.max(8, Math.floor(w * 0.7));
        h = Math.max(8, Math.floor(h * 0.7));
      }
      throw new SizeError("That size is too small for an image.");
    }
    case "pdf":
      return { parts: [await pdfFile({ pages: o.pages, pageSize: o.pageSize, label }, target)] };
    case "docx":
      return { parts: [docxFile(target)] };
    case "xlsx":
      return { parts: [xlsxFile(target)] };
    case "txt":
    case "csv":
    case "json":
    case "xml":
    case "html":
    case "md":
    case "log":
      return { parts: textFile(type, target) };
    case "wav":
      return { parts: wavFile(target, o.tone, seed) };
    case "mp4":
      return { parts: await encodeMp4(o.width - (o.width % 2), o.height - (o.height % 2), o.seconds, target, label, seed, onProgress) };
    case "zip":
      return { parts: zipFile(target, o.content, o.content === "text" ? "data.txt" : "data.bin", seed) };
    case "bin":
      return { parts: rawContent(target, o.content, seed) };
  }
}
