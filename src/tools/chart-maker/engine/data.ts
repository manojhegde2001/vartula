import { max, mean, median, min, sum } from "d3-array";
import { valueKey } from "./colors";
import type { Aggregation, Column, ResolvedDimension, Row, Value } from "./types";

export const aggregations: { value: Aggregation; label: string }[] = [
  { value: "sum", label: "Sum" },
  { value: "mean", label: "Average" },
  { value: "median", label: "Median" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "count", label: "Count rows" },
];

export function aggregate(values: number[], how: Aggregation): number {
  if (how === "count") return values.length;
  if (values.length === 0) return 0;
  switch (how) {
    case "sum":
      return sum(values);
    case "mean":
      return mean(values) ?? 0;
    case "median":
      return median(values) ?? 0;
    case "min":
      return min(values) ?? 0;
    case "max":
      return max(values) ?? 0;
  }
}

/** The single column mapped to a dimension, if any. */
export function col(dim: ResolvedDimension | undefined): Column | undefined {
  return dim?.columns[0];
}

/**
 * Value of an aggregated size dimension for a group of rows.
 * Without a mapped column it counts rows, which is what most charts want by default.
 */
export function measure(rows: Row[], dim: ResolvedDimension | undefined): number {
  const c = col(dim);
  if (!c) return rows.length;
  const values: number[] = [];
  for (const row of rows) {
    const v = row[c.name];
    if (typeof v === "number") values.push(v);
  }
  return aggregate(values, dim!.aggregation);
}

/** Distinct values of a column: first-seen order for text, ascending for numbers and dates. */
export function domainOf(rows: Row[], column: Column, sortText = false): Value[] {
  const seen = new Map<string, Value>();
  for (const row of rows) {
    const v = row[column.name];
    const key = valueKey(v);
    if (!seen.has(key)) seen.set(key, v);
  }
  const values = [...seen.values()];
  if (column.type !== "string") {
    values.sort((a, b) => (a === null ? 1 : b === null ? -1 : +a - +b));
  } else if (sortText) {
    values.sort((a, b) => String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true }));
  }
  return values;
}

/** Group rows by the values of one or more columns, keeping first-seen order. */
export function groupRows(rows: Row[], columns: Column[]): { values: Value[]; rows: Row[] }[] {
  const groups = new Map<string, { values: Value[]; rows: Row[] }>();
  for (const row of rows) {
    const values = columns.map((c) => row[c.name]);
    const key = values.map(valueKey).join("\u0000");
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { values, rows: [] }));
    g.rows.push(row);
  }
  return [...groups.values()];
}

export function asNumber(v: Value): number | null {
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  return null;
}
