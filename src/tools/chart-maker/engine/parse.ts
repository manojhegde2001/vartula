import type { Column, ColumnType, Dataset, RawTable, Row, Value } from "./types";

export class DataParseError extends Error {}

/** Largest pasted or uploaded data accepted (bytes of text). */
export const MAX_DATA_BYTES = 10 * 1024 * 1024;

const DELIMITERS = [",", "\t", ";", "|"] as const;

/** RFC 4180 parser: quoted fields may contain delimiters, quotes ("") and newlines. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  const pushRow = () => {
    row.push(field);
    // Skip blank lines (a lone empty field).
    if (!(row.length === 1 && row[0].trim() === "")) rows.push(row);
    row = [];
    field = "";
  };

  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        field += c;
      }
      i++;
      continue;
    }
    if (c === '"' && field.trim() === "") {
      quoted = true;
      field = "";
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      pushRow();
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else {
      field += c;
    }
    i++;
  }
  if (field !== "" || row.length > 0) pushRow();
  return rows;
}

/** Count delimiter occurrences outside quotes in the first few lines and pick the most consistent one. */
export function detectDelimiter(text: string): string {
  const sample = text.slice(0, 20_000);
  let best: string = ",";
  let bestScore = 0;
  for (const d of DELIMITERS) {
    const rows = parseDelimited(sample, d).slice(0, 20);
    if (rows.length === 0) continue;
    const width = rows[0].length;
    if (width < 2) continue;
    const consistent = rows.filter((r) => r.length === width).length / rows.length;
    const score = width * consistent;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

/** Make header names non-empty and unique ("value", "value 2", ...). */
function uniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h, i) => {
    const base = h.trim() || `Column ${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} ${n}`;
  });
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function parseJsonTable(text: string): RawTable {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new DataParseError("That looks like JSON but could not be parsed. Check for a missing comma or bracket.");
  }
  // Accept { "data": [...] }-style wrappers with a single array property.
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const arrays = Object.values(json).filter(Array.isArray);
    if (arrays.length === 1) json = arrays[0];
  }
  if (!Array.isArray(json) || json.length === 0) {
    throw new DataParseError("JSON data must be a non-empty array of objects or arrays.");
  }
  if (json.every(Array.isArray)) {
    const [head, ...rest] = json as unknown[][];
    return normalize(head.map(cellText), rest.map((r) => r.map(cellText)));
  }
  if (!json.every((r) => r && typeof r === "object")) {
    throw new DataParseError("JSON data must be an array of objects, one per row.");
  }
  const headers: string[] = [];
  const known = new Set<string>();
  for (const r of json as Record<string, unknown>[]) {
    for (const key of Object.keys(r)) {
      if (!known.has(key)) {
        known.add(key);
        headers.push(key);
      }
    }
  }
  return {
    headers,
    cells: (json as Record<string, unknown>[]).map((r) => headers.map((h) => cellText(r[h]))),
  };
}

function normalize(rawHeaders: string[], body: string[][]): RawTable {
  const width = Math.max(rawHeaders.length, ...body.map((r) => r.length));
  const headers = uniqueHeaders(Array.from({ length: width }, (_, i) => rawHeaders[i] ?? ""));
  const cells = body.map((r) => Array.from({ length: width }, (_, i) => (r[i] ?? "").trim()));
  return { headers, cells };
}

/** Parse CSV, TSV, semicolon- or pipe-separated text, or JSON into a raw table. */
export function parseTable(text: string): RawTable {
  const trimmed = text.replace(/^﻿/, "").trim();
  if (!trimmed) throw new DataParseError("There is no data to read.");
  if (trimmed.length > MAX_DATA_BYTES) throw new DataParseError("That data is larger than 10 MB.");
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return parseJsonTable(trimmed);

  const rows = parseDelimited(trimmed, detectDelimiter(trimmed));
  if (rows.length < 2) throw new DataParseError("Add a header row and at least one row of data.");
  const table = normalize(rows[0], rows.slice(1));
  if (table.headers.length < 1) throw new DataParseError("No columns were found.");
  return table;
}

const NUMBER = /^[-+]?(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d+)?(?:[eE][-+]?\d+)?$/;
const DATE = /^(\d{4})(?:[-/](\d{1,2})(?:[-/](\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?)?)$/;

export function parseNumber(s: string): number | null {
  const t = s.trim();
  if (!t || !NUMBER.test(t) || !/\d/.test(t)) return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** ISO-style dates only (2024, 2024-03, 2024-03-15, 2024/03/15, with optional time), read as UTC. */
export function parseDate(s: string): Date | null {
  const m = DATE.exec(s.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, sec, zone] = m;
  // A bare 4-digit year is a number, not a date.
  if (mo === undefined) return null;
  const month = Number(mo) - 1;
  const day = d === undefined ? 1 : Number(d);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  if (zone) {
    const date = new Date(s.trim().replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return new Date(Date.UTC(Number(y), month, day, Number(h ?? 0), Number(mi ?? 0), Number(sec ?? 0)));
}

/** Most specific type every non-empty value in the column satisfies. */
export function inferType(values: string[]): ColumnType {
  const filled = values.filter((v) => v.trim() !== "");
  if (filled.length === 0) return "string";
  if (filled.every((v) => parseNumber(v) !== null)) return "number";
  if (filled.every((v) => parseDate(v) !== null)) return "date";
  return "string";
}

export function parseValue(s: string, type: ColumnType): Value {
  if (s.trim() === "") return null;
  if (type === "number") return parseNumber(s);
  if (type === "date") return parseDate(s);
  return s;
}

/** Type a raw table with the given column types (inferred when omitted). */
export function typeTable(table: RawTable, types?: Record<string, ColumnType>): Dataset {
  const columns: Column[] = table.headers.map((name, i) => ({
    name,
    type: types?.[name] ?? inferType(table.cells.map((r) => r[i])),
  }));
  const rows: Row[] = table.cells.map((cells) => {
    const row: Row = {};
    columns.forEach((c, i) => (row[c.name] = parseValue(cells[i], c.type)));
    return row;
  });
  return { columns, rows };
}
