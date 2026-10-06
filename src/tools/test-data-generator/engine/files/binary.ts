/** WAV, ZIP, raw binary and MP4 padding: formats whose exact size can be streamed without holding them in memory. */
import { ascii, concat, crcOfParts, SizeError, u16le, u32be, u32le, type Part } from "./parts";

// ---- WAV ----

export const wavTones = ["sine", "silence", "noise"] as const;
export type WavTone = (typeof wavTones)[number];

export const WAV_RATE = 44_100;

/** 8-bit mono PCM at 44.1 kHz: one byte per sample, so any size from 44 bytes up is reachable. */
export function wavFile(target: number, tone: WavTone, seed = 1): Part[] {
  if (target < 44) throw new SizeError("A WAV file needs at least 44 bytes for its header.", 44);
  if (target > 0xffffffff) throw new SizeError("WAV files can't be larger than 4 GB.");
  // RIFF chunks are word-aligned: an odd-length data chunk is followed by one pad byte.
  const dataLen = (target - 44) % 2 === 0 ? target - 44 : target - 45;
  const header = concat([
    ascii("RIFF"),
    u32le(target - 8),
    ascii("WAVEfmt "),
    u32le(16),
    u16le(1), // PCM
    u16le(1), // mono
    u32le(WAV_RATE),
    u32le(WAV_RATE), // byte rate
    u16le(1), // block align
    u16le(8), // bits per sample
    ascii("data"),
    u32le(dataLen),
  ]);
  let data: Part;
  if (tone === "noise") data = { random: dataLen, seed };
  else if (tone === "silence") data = { fill: dataLen, byte: 128 };
  else {
    // 441 Hz: exactly 100 samples per cycle at 44.1 kHz, so one cycle repeats seamlessly.
    const cycle = Uint8Array.from({ length: 100 }, (_, i) => Math.round(128 + 90 * Math.sin((2 * Math.PI * i) / 100)));
    const times = Math.floor(dataLen / 100);
    data = { repeat: cycle, times };
    const rest = cycle.slice(0, dataLen - times * 100);
    return [header, data, rest, ...(dataLen < target - 44 ? [new Uint8Array(1)] : [])];
  }
  return [header, data, ...(dataLen < target - 44 ? [new Uint8Array(1)] : [])];
}

export const wavSeconds = (size: number) => Math.max(0, size - 44) / WAV_RATE;

// ---- Raw content ----

export const binaryContents = ["random", "zeros", "text"] as const;
export type BinaryContent = (typeof binaryContents)[number];

const TEXT_UNIT = ascii("The quick brown fox jumps over the lazy dog. 0123456789\n");

export function rawContent(size: number, content: BinaryContent, seed = 1): Part[] {
  if (content === "random") return [{ random: size, seed }];
  if (content === "zeros") return [{ fill: size, byte: 0 }];
  const times = Math.floor(size / TEXT_UNIT.length);
  return [{ repeat: TEXT_UNIT, times }, TEXT_UNIT.slice(0, size - times * TEXT_UNIT.length)];
}

// ---- ZIP ----

// 2026-01-01 00:00 in MS-DOS date/time fields.
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

/** A stored (uncompressed) single-file ZIP. Without ZIP64 the limit is 4 GB. */
export function zipFile(target: number, content: BinaryContent, innerName = "data.bin", seed = 1): Part[] {
  const name = ascii(innerName);
  const overhead = 30 + 46 + 22 + name.length * 2;
  if (target < overhead) throw new SizeError(`A ZIP with one file needs at least ${overhead} bytes.`, overhead);
  if (target > 0xffffffff) throw new SizeError("ZIP files over 4 GB need ZIP64, which isn't supported here.");
  const size = target - overhead;
  const data = rawContent(size, content, seed);
  const crc = crcOfParts(data);
  const common = concat([u16le(20), u16le(0), u16le(0), u16le(0), u16le(DOS_DATE), u32le(crc), u32le(size), u32le(size), u16le(name.length), u16le(0)]);
  const local = concat([u32le(0x04034b50), common, name]);
  const central = concat([u32le(0x02014b50), u16le(20), common, u16le(0), u16le(0), u16le(0), u32le(0), u32le(0), name]);
  const end = concat([u32le(0x06054b50), u16le(0), u16le(0), u16le(1), u16le(1), u32le(central.length), u32le(local.length + size), u16le(0)]);
  return [local, ...data, central, end];
}

// ---- MP4 ----

/** Append a top-level `free` box, which players skip. Needs 8 bytes (16 above 4 GB). */
export function padMp4(mp4: Uint8Array, target: number): Part[] | null {
  const d = target - mp4.length;
  if (d === 0) return [mp4];
  if (d < 8) return null;
  if (d <= 0xffffffff) return [mp4, concat([u32be(d), ascii("free")]), { fill: d - 8, byte: 0 }];
  const hi = Math.floor(d / 2 ** 32);
  return [mp4, concat([u32be(1), ascii("free"), u32be(hi), u32be(d - hi * 2 ** 32)]), { fill: d - 16, byte: 0 }];
}
