/**
 * A file described as parts rather than bytes, so a 4 GB file can be streamed to disk in 1 MB chunks
 * without ever existing in memory. Writers return parts; lib/save.ts turns them into a Blob or a disk stream.
 */
import { createRng, randomBytes } from "../rng";

export type Part =
  | Uint8Array
  /** `count` copies of one byte. */
  | { fill: number; byte: number }
  /** `times` copies of a block. */
  | { repeat: Uint8Array; times: number }
  /** `count` seeded pseudo-random bytes (incompressible). */
  | { random: number; seed: number };

export const CHUNK = 1 << 20;

// `instanceof Uint8Array` fails for arrays from another realm (e.g. TextEncoder under jsdom).
const isBytes = (p: Part): p is Uint8Array => ArrayBuffer.isView(p);

export function partSize(p: Part): number {
  if (isBytes(p)) return p.length;
  if ("fill" in p) return p.fill;
  if ("repeat" in p) return p.repeat.length * p.times;
  return p.random;
}

export const totalSize = (parts: Part[]) => parts.reduce((n, p) => n + partSize(p), 0);

/**
 * Stream the bytes in chunks of at most `chunkSize`. Every chunk is a fresh array, so callers may keep
 * them (e.g. in a Blob) without later chunks overwriting earlier ones.
 */
export function* chunks(parts: Part[], chunkSize = CHUNK): Generator<Uint8Array> {
  for (const p of parts) {
    if (isBytes(p)) {
      for (let i = 0; i < p.length; i += chunkSize) yield p.slice(i, i + chunkSize);
    } else if ("fill" in p) {
      for (let left = p.fill; left > 0; left -= chunkSize) yield new Uint8Array(Math.min(chunkSize, left)).fill(p.byte);
    } else if ("repeat" in p) {
      const unit = p.repeat;
      if (unit.length === 0 || p.times === 0) continue;
      // Pack whole copies of the unit into each chunk.
      const perChunk = Math.max(1, Math.floor(chunkSize / unit.length));
      for (let left = p.times; left > 0; left -= perChunk) {
        const n = Math.min(perChunk, left);
        const out = new Uint8Array(n * unit.length);
        for (let k = 0; k < n; k++) out.set(unit, k * unit.length);
        yield out;
      }
    } else {
      const rng = createRng(p.seed);
      for (let left = p.random; left > 0; left -= chunkSize) yield randomBytes(rng, new Uint8Array(Math.min(chunkSize, left)));
    }
  }
}

/** All bytes in one array; only for files small enough to hold in memory. */
export function toBytes(parts: Part[]): Uint8Array {
  const out = new Uint8Array(totalSize(parts));
  let offset = 0;
  for (const c of chunks(parts)) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

const encoder = new TextEncoder();
export const ascii = (s: string) => encoder.encode(s);

// ---- CRC-32 (PNG, ZIP) ----

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** Continue a CRC-32 over more bytes. Start with `crc32(bytes)` and pass the result back in. */
export function crc32(data: Uint8Array, crc = 0): number {
  let c = ~crc >>> 0;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

export function crcOfParts(parts: Part[]): number {
  let crc = 0;
  for (const c of chunks(parts)) crc = crc32(c, crc);
  return crc;
}

export const u16le = (n: number) => new Uint8Array([n & 255, (n >>> 8) & 255]);
export const u32le = (n: number) => new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
export const u32be = (n: number) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);

export function concat(arrays: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrays) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

/** The requested size can't hold this file; `min` is the smallest size that can. */
export class SizeError extends Error {
  constructor(
    message: string,
    public readonly min?: number,
  ) {
    super(message);
  }
}
