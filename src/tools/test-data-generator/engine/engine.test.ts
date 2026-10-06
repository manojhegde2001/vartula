import { describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker/locale/en";
import {
  aadhaar,
  cardBrands,
  cardNumber,
  counterstring,
  createRng,
  formatSize,
  gstin,
  gstinValid,
  iban,
  ibanCountries,
  ibanValid,
  lengths,
  luhnValid,
  pan,
  parseSize,
  password,
  ulid,
  uuidV4,
  uuidV7,
  verhoeffValid,
  visible,
  type CardBrand,
  type IbanCountry,
} from ".";
import { fieldTypes, type FieldTypeId } from "./fields";
import { createWriter, csvCell, sqlValue, writeAll, type FormatOptions, defaultFormatOptions } from "./formats";
import { createRowGenerator, field, nest, presets, UniqueError } from "./records";

describe("checksums", () => {
  const rng = createRng(7);

  it("generates Luhn-valid cards of the right length for every brand", () => {
    for (const brand of Object.keys(cardBrands) as CardBrand[]) {
      for (let i = 0; i < 20; i++) {
        const n = cardNumber(rng, brand);
        expect(n).toHaveLength(cardBrands[brand].length);
        expect(cardBrands[brand].prefixes.some((p) => n.startsWith(p))).toBe(true);
        expect(luhnValid(n)).toBe(true);
      }
    }
    expect(luhnValid("4242424242424242")).toBe(true);
    expect(luhnValid("4242424242424241")).toBe(false);
  });

  it("generates valid IBANs", () => {
    expect(ibanValid("GB82 WEST 1234 5698 7654 32")).toBe(true);
    expect(ibanValid("GB82WEST12345698765433")).toBe(false);
    for (const c of Object.keys(ibanCountries) as IbanCountry[]) for (let i = 0; i < 10; i++) expect(ibanValid(iban(rng, c)), c).toBe(true);
  });

  it("generates Indian IDs in the right format", () => {
    for (let i = 0; i < 50; i++) {
      const a = aadhaar(rng);
      expect(a).toMatch(/^[2-9]\d{11}$/);
      expect(verhoeffValid(a)).toBe(true);
      expect(gstinValid(gstin(rng))).toBe(true);
      expect(pan(rng)).toMatch(/^[A-Z]{3}P[A-Z]\d{4}[A-Z]$/);
    }
    expect(gstinValid("27AAPFU0939F1ZV")).toBe(true);
    expect(verhoeffValid("2363")).toBe(true);
  });
});

describe("ids", () => {
  const rng = createRng(1);
  it("makes UUIDs, ULIDs and passwords", () => {
    expect(uuidV4(rng)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const a = uuidV7(rng, 1_700_000_000_000);
    const b = uuidV7(rng, 1_700_000_001_000);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a < b).toBe(true);
    expect(ulid(rng, 1_700_000_000_000)).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    const pw = password(rng, { length: 12, upper: true, lower: true, digits: true, symbols: false, noAmbiguous: true });
    expect(pw).toHaveLength(12);
    expect(pw).toMatch(/[A-Z]/);
    expect(pw).toMatch(/[a-z]/);
    expect(pw).toMatch(/\d/);
    expect(pw).not.toMatch(/[0O1lI]/);
  });
});

describe("sizes", () => {
  it("parses and formats sizes", () => {
    expect(parseSize("25 MB")).toBe(25 * 1024 * 1024);
    expect(parseSize("25mb", 1000)).toBe(25_000_000);
    expect(parseSize("1.5 GiB", 1000)).toBe(1.5 * 1024 ** 3);
    expect(parseSize("512k")).toBe(512 * 1024);
    expect(parseSize("2048")).toBe(2048);
    expect(parseSize("lots")).toBeNull();
    expect(formatSize(5 * 1024 * 1024)).toBe("5 MB");
    expect(formatSize(1536)).toBe("1.5 KB");
    expect(formatSize(999)).toBe("999 B");
  });
});

describe("edge cases", () => {
  it("builds counterstrings of exact length with position markers", () => {
    expect(counterstring(12)).toBe("*3*5*7*9*12*");
    for (const n of [1, 2, 9, 10, 11, 100, 255, 1000]) {
      const s = counterstring(n);
      expect(s).toHaveLength(n);
      // Each number is followed by a marker at exactly that position.
      for (const m of s.matchAll(/(\d+)\*/g)) expect(m.index! + m[0].length).toBe(Number(m[1]));
    }
  });

  it("shows invisible characters and counts lengths", () => {
    expect(visible("a b​")).toBe("a␠b\\u{200B}");
    expect(visible("")).toBe("(empty)");
    expect(lengths("👨‍👩‍👧‍👦")).toEqual({ utf16: 11, codePoints: 7, utf8: 25 });
  });
});

describe("records", () => {
  const fields = presets[0].fields();

  it("is reproducible from a seed", () => {
    const a = createRowGenerator(faker, fields, 123);
    const rowsA = [a(), a(), a()];
    const b = createRowGenerator(faker, fields, 123);
    expect([b(), b(), b()]).toEqual(rowsA);
    const c = createRowGenerator(faker, fields, 124);
    expect(c()).not.toEqual(rowsA[0]);
  });

  it("generates every field type", () => {
    const all = (Object.keys(fieldTypes) as FieldTypeId[]).map((t) => field(t, t));
    const next = createRowGenerator(faker, all, 5);
    for (let i = 0; i < 20; i++) {
      const row = next();
      for (const t of Object.keys(fieldTypes)) expect(row[t], t).not.toBeUndefined();
    }
  });

  it("honours blanks, uniqueness and lists", () => {
    const next = createRowGenerator(
      faker,
      [field("a", "integer", { min: 1, max: 50 }, { unique: true }), field("b", "word", {}, { blank: 100 }), field("c", "word", {}, { list: 3 })],
      9,
    );
    const rows = Array.from({ length: 50 }, next);
    expect(new Set(rows.map((r) => r.a)).size).toBe(50);
    expect(rows.every((r) => r.b === null)).toBe(true);
    expect(rows.every((r) => Array.isArray(r.c) && r.c.length >= 1 && r.c.length <= 3)).toBe(true);
    expect(() => {
      const gen = createRowGenerator(faker, [field("x", "boolean", {}, { unique: true })], 1);
      for (let i = 0; i < 3; i++) gen();
    }).toThrow(UniqueError);
  });

  it("uses earlier fields in templates and emails", () => {
    const next = createRowGenerator(faker, [field("first_name", "constant", { value: "Ada" }), field("last_name", "constant", { value: "Lovelace" }), field("email", "email"), field("tag", "template", { template: "{{first_name}}-{{person.lastName}}" })], 1);
    const row = next();
    expect(row.email).toMatch(/^ada\.lovelace\d*@example\.com$/);
    expect(row.tag).toMatch(/^Ada-\S+/);
  });

  it("nests dotted names", () => {
    expect(nest({ id: 1, "address.city": "Pune", "address.geo.lat": 18.5 })).toEqual({ id: 1, address: { city: "Pune", geo: { lat: 18.5 } } });
  });
});

describe("formats", () => {
  const fields = [field("id", "rowNumber"), field("name", "constant", { value: "x" }), field("address.city", "constant", { value: "Pune" }), field("tags", "word", {}, { list: 2 })];
  const rows = [
    { id: 1, name: 'He said "hi", then\nleft', "address.city": "Pune", tags: ["a", "b"] },
    { id: 2, name: "O'Brien \\ ok", "address.city": null, tags: ["c"] },
  ];
  const opts = (o: Partial<FormatOptions>): FormatOptions => ({ ...defaultFormatOptions, table: "people", ...o });

  it("escapes CSV cells", () => {
    expect(csvCell('a,"b"', ",")).toBe('"a,""b"""');
    expect(csvCell(" x", ",")).toBe('" x"');
    expect(csvCell(null, ",")).toBe("");
    const csv = writeAll(fields, opts({ format: "csv" }), rows);
    expect(csv.split("\r\n")[0]).toBe("id,name,address.city,tags");
    expect(csv).toContain('"He said ""hi"", then\nleft"');
    expect(csv).toContain("a; b");
  });

  it("writes JSON, JSON Lines and TypeScript that parse back", () => {
    const json = JSON.parse(writeAll(fields, opts({ format: "json" }), rows));
    expect(json[0].address.city).toBe("Pune");
    expect(JSON.parse(writeAll(fields, opts({ format: "json", pretty: false }), rows))).toEqual(json);
    expect(JSON.parse(writeAll(fields, opts({ format: "json" }), []))).toEqual([]);
    const lines = writeAll(fields, opts({ format: "ndjson" }), rows).trim().split("\n");
    expect(lines.map((l) => JSON.parse(l))).toEqual(json);
    const ts = writeAll(fields, opts({ format: "ts" }), rows);
    expect(ts).toContain("export interface People {");
    expect(ts).toContain("tags: string[];");
    expect(ts).toContain("export const people: People[] = [");
  });

  it("writes SQL with batches, escaping and dialects", () => {
    expect(sqlValue("O'Brien \\", "postgres")).toBe("'O''Brien \\'");
    expect(sqlValue("O'Brien \\", "mysql")).toBe("'O''Brien \\\\'");
    expect(sqlValue(true, "sqlite")).toBe("1");
    expect(sqlValue(null, "mysql")).toBe("NULL");
    const many = Array.from({ length: 250 }, (_, i) => ({ id: i, name: "n", "address.city": "c", tags: [] }));
    const sql = writeAll(fields, opts({ format: "sql" }), many);
    expect(sql).toContain('CREATE TABLE "people" (\n  "id" BIGINT,');
    expect(sql).toContain('"address_city" TEXT');
    expect(sql.match(/INSERT INTO/g)).toHaveLength(3);
    expect(sql.match(/;\n/g)).toHaveLength(4);
    expect(sql.trimEnd().endsWith(";")).toBe(true);
    expect(writeAll(fields, opts({ format: "sql", dialect: "mysql", createTable: false }), rows)).toMatch(/^INSERT INTO `people` \(`id`/);
  });

  it("writes well-formed XML and YAML", () => {
    const xml = writeAll(fields, opts({ format: "xml" }), rows);
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
    expect(doc.getElementsByTagName("row")).toHaveLength(2);
    expect(doc.getElementsByTagName("city")[0].textContent).toBe("Pune");
    expect(doc.getElementsByTagName("tags")).toHaveLength(3);
    const yaml = writeAll(fields, opts({ format: "yaml" }), rows);
    expect(yaml).toContain('- id: 1\n  name: "He said \\"hi\\", then\\nleft"\n  address:\n    city: "Pune"\n  tags:\n    - "a"\n');
    expect(yaml).toContain("    city: null");
  });

  it("streams the same text as writeAll", () => {
    const w = createWriter(fields, opts({ format: "json" }), rows.length);
    expect(w.start() + w.row(rows[0], 0) + w.row(rows[1], 1) + w.end()).toBe(writeAll(fields, opts({ format: "json" }), rows));
  });
});
