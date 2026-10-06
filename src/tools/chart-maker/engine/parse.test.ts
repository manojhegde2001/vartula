import { describe, expect, it } from "vitest";
import { DataParseError, detectDelimiter, inferType, parseDate, parseDelimited, parseNumber, parseTable, typeTable } from "./parse";

describe("parseDelimited", () => {
  it("handles quotes, escaped quotes, embedded delimiters and newlines", () => {
    const rows = parseDelimited('a,b\n"x, y","say ""hi"""\n"multi\nline",2\r\n', ",");
    expect(rows).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
      ["multi\nline", "2"],
    ]);
  });

  it("skips blank lines", () => {
    expect(parseDelimited("a\n\n1\n\n", ",")).toEqual([["a"], ["1"]]);
  });
});

describe("detectDelimiter", () => {
  it("picks the consistent separator", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(detectDelimiter("a\tb\n1,5\t2")).toBe("\t");
    expect(detectDelimiter("name;price\nTea;1,50\nCake;3,20")).toBe(";");
  });
});

describe("parseTable", () => {
  it("reads CSV with a BOM and makes headers unique", () => {
    const t = parseTable("﻿name,name,\nA,B,C\n");
    expect(t.headers).toEqual(["name", "name 2", "Column 3"]);
    expect(t.cells).toEqual([["A", "B", "C"]]);
  });

  it("pads short rows", () => {
    expect(parseTable("a,b,c\n1").cells).toEqual([["1", "", ""]]);
  });

  it("reads JSON arrays of objects, of arrays, and wrapped arrays", () => {
    expect(parseTable('[{"a":1,"b":"x"},{"a":2,"c":true}]')).toEqual({
      headers: ["a", "b", "c"],
      cells: [
        ["1", "x", ""],
        ["2", "", "true"],
      ],
    });
    expect(parseTable('[["a","b"],[1,2]]').cells).toEqual([["1", "2"]]);
    expect(parseTable('{"data":[{"a":1}]}').cells).toEqual([["1"]]);
  });

  it("rejects empty and broken input", () => {
    expect(() => parseTable("   ")).toThrow(DataParseError);
    expect(() => parseTable("only,a,header")).toThrow(DataParseError);
    expect(() => parseTable("[{]")).toThrow(DataParseError);
  });
});

describe("types", () => {
  it("parses numbers with thousands separators and exponents", () => {
    expect(parseNumber("1,234.5")).toBe(1234.5);
    expect(parseNumber("-2e3")).toBe(-2000);
    expect(parseNumber(".5")).toBe(0.5);
    expect(parseNumber("12a")).toBeNull();
    expect(parseNumber("-")).toBeNull();
  });

  it("parses ISO dates as UTC and leaves bare years as numbers", () => {
    expect(parseDate("2024-03-15")?.toISOString()).toBe("2024-03-15T00:00:00.000Z");
    expect(parseDate("2024/3")?.toISOString()).toBe("2024-03-01T00:00:00.000Z");
    expect(parseDate("2024-03-15 08:30")?.toISOString()).toBe("2024-03-15T08:30:00.000Z");
    expect(parseDate("2024-13-01")).toBeNull();
    expect(parseDate("2024")).toBeNull();
  });

  it("infers the most specific type, ignoring empty cells", () => {
    expect(inferType(["1", "", "2.5"])).toBe("number");
    expect(inferType(["2024-01-01", "2024-02-01"])).toBe("date");
    expect(inferType(["2024", "2025"])).toBe("number");
    expect(inferType(["1", "x"])).toBe("string");
    expect(inferType(["", ""])).toBe("string");
  });

  it("types a table, honoring overrides", () => {
    const table = parseTable("year,value\n2020,1\n2021,");
    const auto = typeTable(table);
    expect(auto.columns).toEqual([
      { name: "year", type: "number" },
      { name: "value", type: "number" },
    ]);
    expect(auto.rows[1]).toEqual({ year: 2021, value: null });
    expect(typeTable(table, { year: "string" }).rows[0].year).toBe("2020");
  });
});
