/**
 * Streaming writers for generated rows. Each writer returns text for the start, each row and the end,
 * so a million rows never have to sit in one string.
 */
import { fieldTypes, type FieldType, type Row, type Value } from "./fields";
import { nest, type FieldSpec } from "./records";

export const dataFormats = [
  { id: "json", label: "JSON", ext: "json", mime: "application/json" },
  { id: "ndjson", label: "JSON Lines", ext: "jsonl", mime: "application/x-ndjson" },
  { id: "csv", label: "CSV", ext: "csv", mime: "text/csv" },
  { id: "tsv", label: "TSV", ext: "tsv", mime: "text/tab-separated-values" },
  { id: "sql", label: "SQL", ext: "sql", mime: "application/sql" },
  { id: "xml", label: "XML", ext: "xml", mime: "application/xml" },
  { id: "yaml", label: "YAML", ext: "yaml", mime: "application/yaml" },
  { id: "ts", label: "TypeScript", ext: "ts", mime: "text/plain" },
] as const;
export type DataFormat = (typeof dataFormats)[number]["id"];

export type SqlDialect = "postgres" | "mysql" | "sqlite";

export interface FormatOptions {
  format: DataFormat;
  /** Indented JSON / TypeScript. */
  pretty: boolean;
  /** Table name (SQL), root element (XML) and variable name (TypeScript). */
  table: string;
  dialect: SqlDialect;
  createTable: boolean;
  /** CSV/TSV header row. */
  header: boolean;
  /** Byte-order mark so Excel opens UTF-8 CSV correctly. */
  bom: boolean;
}

export const defaultFormatOptions: FormatOptions = {
  format: "json",
  pretty: true,
  table: "users",
  dialect: "postgres",
  createTable: true,
  header: true,
  bom: false,
};

export interface Writer {
  start(): string;
  row(row: Row, index: number): string;
  end(): string;
}

// ---- CSV ----

export function csvCell(v: Value, sep: string): string {
  if (v === null) return "";
  const s = typeof v === "object" ? (Array.isArray(v) && v.every((x) => typeof x !== "object") ? v.join("; ") : JSON.stringify(v)) : String(v);
  return s.includes(sep) || /["\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---- SQL ----

const sqlIdent = (name: string, d: SqlDialect) => (d === "mysql" ? `\`${name.replace(/`/g, "``")}\`` : `"${name.replace(/"/g, '""')}"`);
const sqlColumn = (name: string) => name.replace(/\./g, "_");

export function sqlValue(v: Value, d: SqlDialect): string {
  if (v === null) return "NULL";
  if (typeof v === "boolean") return d === "sqlite" ? (v ? "1" : "0") : v ? "TRUE" : "FALSE";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  const s = typeof v === "object" ? JSON.stringify(v) : v;
  // MySQL treats backslash as an escape inside strings by default.
  const escaped = (d === "mysql" ? s.replace(/\\/g, "\\\\") : s).replace(/'/g, "''");
  return `'${escaped}'`;
}

const sqlTypes: Record<FieldType["sql"], Record<SqlDialect, string>> = {
  text: { postgres: "TEXT", mysql: "VARCHAR(255)", sqlite: "TEXT" },
  integer: { postgres: "BIGINT", mysql: "BIGINT", sqlite: "INTEGER" },
  decimal: { postgres: "NUMERIC", mysql: "DECIMAL(18,6)", sqlite: "REAL" },
  boolean: { postgres: "BOOLEAN", mysql: "BOOLEAN", sqlite: "INTEGER" },
  date: { postgres: "DATE", mysql: "DATE", sqlite: "TEXT" },
  timestamp: { postgres: "TIMESTAMPTZ", mysql: "DATETIME", sqlite: "TEXT" },
  uuid: { postgres: "UUID", mysql: "CHAR(36)", sqlite: "TEXT" },
};

function columnSqlType(f: FieldSpec, d: SqlDialect): string {
  const t = fieldTypes[f.type] as FieldType;
  if (f.list > 0) return d === "postgres" ? "JSONB" : d === "mysql" ? "JSON" : "TEXT";
  // Dates written as numbers or in local formats aren't valid DATE literals.
  const fmt = String(f.options.format ?? "");
  if ((t.sql === "date" || t.sql === "timestamp") && fmt && !["iso", "iso-date", "sql"].includes(fmt)) return fmt.startsWith("unix") ? sqlTypes.integer[d] : sqlTypes.text[d];
  return sqlTypes[t.sql][d];
}

const BATCH = 100;

// ---- XML ----

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// XML 1.0 can't contain most control characters even when escaped.
const xmlText = (s: string) => xmlEscape(s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "�"));
const xmlName = (s: string) => {
  const n = s.replace(/[^A-Za-z0-9_.-]/g, "_");
  return /^[A-Za-z_]/.test(n) ? n : `_${n}`;
};

function xmlNode(name: string, v: Value, indent: string): string {
  const tag = xmlName(name);
  if (v === null) return `${indent}<${tag}/>\n`;
  if (Array.isArray(v)) return v.map((item) => xmlNode(name, item, indent)).join("");
  if (typeof v === "object") {
    return `${indent}<${tag}>\n${Object.entries(v)
      .map(([k, x]) => xmlNode(k, x, `${indent}  `))
      .join("")}${indent}</${tag}>\n`;
  }
  return `${indent}<${tag}>${xmlText(String(v))}</${tag}>\n`;
}

// ---- YAML ----

function yamlScalar(v: Value): string {
  if (v === null) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // Double-quoted JSON strings are valid YAML and sidestep every implicit-typing trap ("no", "1e3", "08").
  return JSON.stringify(v);
}

function yamlBlock(v: { [k: string]: Value }, indent: string, first: string): string {
  let out = "";
  let prefix = first;
  for (const [k, x] of Object.entries(v)) {
    const key = /^[A-Za-z_][\w.-]*$/.test(k) ? k : JSON.stringify(k);
    if (x !== null && typeof x === "object" && !Array.isArray(x)) {
      out += `${prefix}${key}:\n${yamlBlock(x, `${indent}  `, `${indent}  `)}`;
    } else if (Array.isArray(x)) {
      out += x.length === 0 ? `${prefix}${key}: []\n` : `${prefix}${key}:\n${x.map((item) => `${indent}  - ${typeof item === "object" && item !== null ? JSON.stringify(item) : yamlScalar(item)}\n`).join("")}`;
    } else {
      out += `${prefix}${key}: ${yamlScalar(x)}\n`;
    }
    prefix = indent;
  }
  return out;
}

// ---- TypeScript ----

function tsType(fields: FieldSpec[]): string {
  type Node = { [k: string]: Node | string };
  const tree: Node = {};
  for (const f of fields) {
    const path = f.name.split(".").filter(Boolean);
    let node = tree;
    for (const key of path.slice(0, -1)) {
      if (typeof node[key] !== "object") node[key] = {};
      node = node[key] as Node;
    }
    let t: string = (fieldTypes[f.type] as FieldType).kind;
    if (["unix", "unix-ms"].includes(String(f.options.format))) t = "number";
    if (f.list > 0) t = `${t}[]`;
    if (f.blank > 0) t += " | null";
    node[path.at(-1)!] = t;
  }
  const render = (n: Node, indent: string): string =>
    `{\n${Object.entries(n)
      .map(([k, v]) => `${indent}  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${typeof v === "string" ? v : render(v, `${indent}  `)};`)
      .join("\n")}\n${indent}}`;
  return render(tree, "");
}

const pascal = (s: string) => s.replace(/(^|[^A-Za-z0-9])([a-z])/g, (_, __, c: string) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, "") || "Row";
const camel = (s: string) => {
  const p = pascal(s);
  return p[0].toLowerCase() + p.slice(1);
};

const indentLines = (s: string, by: string) => s.replace(/\n/g, `\n${by}`);

export function createWriter(fields: FieldSpec[], o: FormatOptions, count: number): Writer {
  const table = o.table.trim() || "data";
  switch (o.format) {
    case "json":
      return {
        start: () => "[",
        row: (r, i) => (i ? "," : "") + (o.pretty ? `\n  ${indentLines(JSON.stringify(nest(r), null, 2), "  ")}` : JSON.stringify(nest(r))),
        end: () => (count && o.pretty ? "\n]\n" : "]\n"),
      };
    case "ndjson":
      return { start: () => "", row: (r) => `${JSON.stringify(nest(r))}\n`, end: () => "" };
    case "csv":
    case "tsv": {
      const sep = o.format === "csv" ? "," : "\t";
      return {
        start: () => (o.bom ? "﻿" : "") + (o.header ? `${fields.map((f) => csvCell(f.name, sep)).join(sep)}\r\n` : ""),
        row: (r) => `${fields.map((f) => csvCell(r[f.name] ?? null, sep)).join(sep)}\r\n`,
        end: () => "",
      };
    }
    case "sql": {
      const d = o.dialect;
      const cols = fields.map((f) => sqlIdent(sqlColumn(f.name), d)).join(", ");
      return {
        start: () =>
          o.createTable
            ? `CREATE TABLE ${sqlIdent(table, d)} (\n${fields.map((f) => `  ${sqlIdent(sqlColumn(f.name), d)} ${columnSqlType(f, d)}`).join(",\n")}\n);\n\n`
            : "",
        row: (r, i) => {
          const values = `(${fields.map((f) => sqlValue(r[f.name] ?? null, d)).join(", ")})`;
          const head = i % BATCH === 0 ? `INSERT INTO ${sqlIdent(table, d)} (${cols}) VALUES\n  ` : ",\n  ";
          const tail = (i + 1) % BATCH === 0 || i === count - 1 ? ";\n" : "";
          return head + values + tail;
        },
        end: () => "",
      };
    }
    case "xml": {
      const root = xmlName(table);
      return {
        start: () => `<?xml version="1.0" encoding="UTF-8"?>\n<${root}>\n`,
        row: (r) => xmlNode("row", nest(r), "  "),
        end: () => `</${root}>\n`,
      };
    }
    case "yaml":
      return { start: () => (count ? "" : "[]\n"), row: (r) => yamlBlock(nest(r), "  ", "- ") || "- {}\n", end: () => "" };
    case "ts": {
      const type = pascal(table.replace(/s$/, ""));
      return {
        start: () => `export interface ${type} ${tsType(fields)}\n\nexport const ${camel(table)}: ${type}[] = [`,
        row: (r, i) => (i ? "," : "") + `\n  ${indentLines(JSON.stringify(nest(r), null, o.pretty ? 2 : undefined), "  ")}`,
        end: () => (count ? "\n];\n" : "];\n"),
      };
    }
  }
}

/** Whole output as one string (for previews and small exports). */
export function writeAll(fields: FieldSpec[], o: FormatOptions, rows: Row[]): string {
  const w = createWriter(fields, o, rows.length);
  return w.start() + rows.map((r, i) => w.row(r, i)).join("") + w.end();
}

export const formatInfo = (id: DataFormat) => dataFormats.find((f) => f.id === id)!;
