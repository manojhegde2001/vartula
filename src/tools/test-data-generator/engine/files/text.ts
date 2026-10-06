/**
 * Text-based files of an exact byte size. Each format repeats a block of realistic content and fills the
 * remainder in a way the format allows (a cut-off last line, a padding field, a comment), so the result
 * stays valid however large it is.
 */
import { createRng, pick, randInt } from "../rng";
import { ascii, SizeError, type Part } from "./parts";

export const textKinds = ["txt", "log", "csv", "json", "xml", "html", "md"] as const;
export type TextKind = (typeof textKinds)[number];

const FIRST = ["Aarav", "Maya", "Liam", "Sofia", "Noah", "Ananya", "Lucas", "Emma", "Kenji", "Zara", "Omar", "Isla"];
const LAST = ["Sharma", "Garcia", "Smith", "Rossi", "Tanaka", "Okafor", "Müller", "Silva", "Khan", "Novak"];
const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

/** About 8 KB of rows, repeated as needed; varied enough to look real, ASCII-safe for byte slicing except where noted. */
function block(kind: TextKind): string {
  const rng = createRng(42);
  const lines: string[] = [];
  for (let i = 1; i <= 60; i++) {
    const first = pick(rng, FIRST);
    const last = pick(rng, LAST).normalize("NFD").replace(/[̀-ͯ]/g, "");
    const amount = (randInt(rng, 100, 99_999) / 100).toFixed(2);
    const day = String(randInt(rng, 1, 28)).padStart(2, "0");
    switch (kind) {
      case "txt":
        lines.push(`${i}. ${LOREM.slice(0, randInt(rng, 60, LOREM.length))}\n`);
        break;
      case "md":
        lines.push(i % 10 === 1 ? `\n## Section ${i}\n\n` : `- ${LOREM.slice(0, randInt(rng, 40, 120))}\n`);
        break;
      case "log": {
        const status = pick(rng, [200, 200, 200, 201, 304, 404, 500]);
        lines.push(
          `2025-12-${day}T${String(randInt(rng, 0, 23)).padStart(2, "0")}:${String(randInt(rng, 0, 59)).padStart(2, "0")}:00Z ${status >= 500 ? "ERROR" : "INFO "} ${pick(rng, ["GET", "POST", "PUT"])} ${pick(rng, ["/api/orders", "/login", "/api/users/42", "/search?q=test"])} ${status} ${randInt(rng, 3, 900)}ms\n`,
        );
        break;
      }
      case "csv":
        lines.push(`${i},${first} ${last},${first.toLowerCase()}.${last.toLowerCase()}@example.com,${amount},2025-11-${day}\r\n`);
        break;
      case "json":
        lines.push(`{"id":${i},"name":"${first} ${last}","email":"${first.toLowerCase()}@example.com","amount":${amount},"active":${rng() < 0.7}},`);
        break;
      case "xml":
        lines.push(`  <item id="${i}"><name>${first} ${last}</name><amount>${amount}</amount></item>\n`);
        break;
      case "html":
        lines.push(`<p>${i}. ${LOREM.slice(0, randInt(rng, 60, 180))}</p>\n`);
        break;
    }
  }
  return lines.join("");
}

interface Layout {
  prefix: string;
  /** Text around the padding; empty for formats that cut the last block instead. */
  padOpen: string;
  padClose: string;
  suffix: string;
  /** Byte used for padding, or "cut" to truncate the final copy of the block. */
  pad: number | "cut";
}

const layouts: Record<TextKind, Layout> = {
  txt: { prefix: "", padOpen: "", padClose: "", suffix: "", pad: "cut" },
  md: { prefix: "# Test document\n", padOpen: "", padClose: "", suffix: "", pad: "cut" },
  log: { prefix: "", padOpen: "", padClose: "", suffix: "", pad: "cut" },
  csv: { prefix: "id,name,email,amount,date\r\n", padOpen: '0,"', padClose: '",,,\r\n', suffix: "", pad: 0x78 },
  json: { prefix: '{"generator":"vartula","items":[', padOpen: '{"padding":"', padClose: '"}', suffix: "]}\n", pad: 0x78 },
  xml: { prefix: '<?xml version="1.0" encoding="UTF-8"?>\n<items>\n', padOpen: "<!--", padClose: "-->\n", suffix: "</items>\n", pad: 0x78 },
  html: {
    prefix: '<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>Test file</title></head>\n<body>\n',
    padOpen: "<!--",
    padClose: "-->\n",
    suffix: "</body>\n</html>\n",
    pad: 0x78,
  },
};

export const textMime: Record<TextKind, string> = {
  txt: "text/plain",
  md: "text/markdown",
  log: "text/plain",
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
  html: "text/html",
};

/** Smallest valid size for a kind. */
export function textMinSize(kind: TextKind): number {
  const l = layouts[kind];
  return ascii(l.prefix + l.padOpen + l.padClose + l.suffix).length;
}

export function textFile(kind: TextKind, size: number): Part[] {
  const l = layouts[kind];
  const min = textMinSize(kind);
  if (size < min) throw new SizeError(`A valid ${kind.toUpperCase()} file needs at least ${min} bytes.`, min);
  const unit = ascii(block(kind));
  const prefix = ascii(l.prefix);
  const suffix = ascii(l.suffix);

  if (l.pad === "cut") {
    const body = size - prefix.length;
    const times = Math.floor(body / unit.length);
    return [prefix, { repeat: unit, times }, unit.slice(0, body - times * unit.length)];
  }
  const open = ascii(l.padOpen);
  const close = ascii(l.padClose);
  const body = size - min;
  const times = Math.floor(body / unit.length);
  return [prefix, { repeat: unit, times }, open, { fill: body - times * unit.length, byte: l.pad }, close, suffix];
}
