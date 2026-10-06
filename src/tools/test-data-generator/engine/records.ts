/** Rows from a schema: blanks, unique values, lists and dotted names for nested output. */
import type { Faker } from "@faker-js/faker";
import { defaultOptions, fieldTypes, type FieldType, type FieldTypeId, type Options, type Row, type Value } from "./fields";
import { createRng, randInt } from "./rng";
import type { LocaleId } from "./locales";

export interface FieldSpec {
  id: string;
  /** Column / key name. Dots nest in JSON, YAML and XML: `address.city`. */
  name: string;
  type: FieldTypeId;
  options: Options;
  /** Percent of rows left null (0–100). */
  blank: number;
  unique: boolean;
  /** 0 for a single value; otherwise a list of 1..list values. */
  list: number;
}

/** Dates are generated relative to this fixed moment so a seed gives the same data on any day. */
export const REF_NOW = Date.UTC(2026, 0, 1);

export class UniqueError extends Error {
  constructor(field: string) {
    super(`Couldn't make "${field}" unique: the field type has too few possible values for this many rows. Turn off Unique or widen its range.`);
  }
}

const keyOf = (v: Value) => (typeof v === "object" && v !== null ? JSON.stringify(v) : String(v));

/** A function that returns the next row each time it is called. Seeding resets faker, so call once per run. */
export function createRowGenerator(f: Faker, fields: FieldSpec[], seed: number, now = REF_NOW): () => Row {
  f.seed(seed);
  f.setDefaultRefDate(now);
  const rng = createRng(seed ^ 0x5bd1e995);
  const seen = fields.map((fl) => (fl.unique ? new Set<string>() : null));
  let row = 0;

  return () => {
    const record: Row = {};
    fields.forEach((field, i) => {
      const type = fieldTypes[field.type] as FieldType | undefined;
      if (!type) return;
      if (field.blank > 0 && rng() * 100 < field.blank) {
        record[field.name] = null;
        return;
      }
      const ctx = { f, rng, row, record, now };
      const options = { ...defaultOptions(field.type), ...field.options };
      const one = () => (field.list > 0 ? Array.from({ length: randInt(rng, 1, field.list) }, () => type.gen(ctx, options)) : type.gen(ctx, options));
      let value = one();
      const set = seen[i];
      if (set) {
        let tries = 0;
        while (set.has(keyOf(value))) {
          if (++tries > 200) throw new UniqueError(field.name);
          value = one();
        }
        set.add(keyOf(value));
      }
      record[field.name] = value;
    });
    row++;
    return record;
  };
}

/** Turn `{"address.city": "Pune"}` into `{"address": {"city": "Pune"}}`. */
export function nest(row: Row): { [key: string]: Value } {
  const out: { [key: string]: Value } = {};
  for (const [name, value] of Object.entries(row)) {
    const path = name.split(".").filter(Boolean);
    if (path.length === 0) continue;
    let node = out;
    for (const key of path.slice(0, -1)) {
      const next = node[key];
      if (typeof next !== "object" || next === null || Array.isArray(next)) node[key] = {};
      node = node[key] as { [key: string]: Value };
    }
    node[path.at(-1)!] = value;
  }
  return out;
}

let nextId = 0;
export const fieldId = () => `f${Date.now().toString(36)}${(nextId++).toString(36)}`;

export function field(name: string, type: FieldTypeId, options: Options = {}, extra: Partial<FieldSpec> = {}): FieldSpec {
  return { id: fieldId(), name, type, options: { ...defaultOptions(type), ...options }, blank: 0, unique: false, list: 0, ...extra };
}

export interface Preset {
  id: string;
  label: string;
  table: string;
  fields: () => FieldSpec[];
  /** Locale that suits the preset (e.g. Indian names for Indian IDs). */
  locale?: LocaleId;
}

export const presets: Preset[] = [
  {
    id: "users",
    label: "Users",
    table: "users",
    fields: () => [
      field("id", "rowNumber"),
      field("first_name", "firstName"),
      field("last_name", "lastName"),
      field("email", "email", {}, { unique: true }),
      field("phone", "phone", {}, { blank: 10 }),
      field("date_of_birth", "birthdate"),
      field("address.city", "city"),
      field("address.country", "country"),
      field("status", "list", { values: "active:7, pending:2, suspended:1" }),
      field("created_at", "date", { format: "iso" }),
    ],
  },
  {
    id: "orders",
    label: "Orders",
    table: "orders",
    fields: () => [
      field("order_id", "pattern", { pattern: "ORD-######" }, { unique: true }),
      field("customer_id", "reference", { max: 500 }),
      field("product", "product"),
      field("quantity", "integer", { min: 1, max: 5 }),
      field("unit_price", "price", { min: 5, max: 300 }),
      field("currency", "list", { values: "USD:5, EUR:3, INR:2" }),
      field("status", "list", { values: "delivered:6, shipped:2, processing:1, cancelled:1" }),
      field("ordered_at", "date", { format: "iso" }),
    ],
  },
  {
    id: "products",
    label: "Products",
    table: "products",
    fields: () => [
      field("sku", "pattern", { pattern: "SKU-????-####" }, { unique: true }),
      field("name", "product"),
      field("department", "department"),
      field("price", "price"),
      field("in_stock", "boolean", { chance: 85 }),
      field("tags", "word", {}, { list: 3 }),
      field("description", "sentence"),
    ],
  },
  {
    id: "employees",
    label: "Employees",
    table: "employees",
    fields: () => [
      field("employee_id", "pattern", { pattern: "EMP-#####" }, { unique: true }),
      field("full_name", "fullName"),
      field("job_title", "jobTitle"),
      field("department", "department"),
      field("salary", "integer", { min: 30000, max: 180000 }),
      field("manager_id", "reference", { max: 50 }, { blank: 5 }),
      field("hired_on", "date", { from: "2015-01-01", to: "2025-12-31", format: "iso-date" }),
      field("remote", "boolean", { chance: 30 }),
    ],
  },
  {
    id: "transactions",
    label: "Transactions",
    table: "transactions",
    fields: () => [
      field("id", "uuid", { version: "v7" }),
      field("account", "iban"),
      field("type", "transactionType"),
      field("amount", "decimal", { min: 1, max: 5000, decimals: 2 }),
      field("currency", "currency"),
      field("card", "creditCard", {}, { blank: 40 }),
      field("timestamp", "date", { format: "iso" }),
    ],
  },
  {
    id: "logs",
    label: "Server logs",
    table: "request_logs",
    fields: () => [
      field("timestamp", "date", { from: "2025-12-01", to: "2025-12-31", format: "iso" }),
      field("ip", "ipv4"),
      field("method", "list", { values: "GET:7, POST:2, PUT:1, DELETE:1" }),
      field("path", "list", { values: "/, /login, /api/orders, /api/users, /search, /checkout" }),
      field("status", "list", { values: "200:16, 201:2, 301:1, 404:2, 500:1" }),
      field("duration_ms", "integer", { min: 3, max: 1800 }),
      field("user_agent", "userAgent"),
    ],
  },
  {
    id: "india",
    label: "Indian customers",
    locale: "en_IN",
    table: "customers",
    fields: () => [
      field("id", "rowNumber"),
      field("first_name", "firstName"),
      field("last_name", "lastName"),
      field("mobile", "mobileIN", {}, { unique: true }),
      field("email", "email"),
      field("pan", "pan", {}, { unique: true }),
      field("gstin", "gstin", {}, { blank: 60 }),
      field("upi_id", "upi"),
      field("pin_code", "pinCode"),
      field("bank_ifsc", "ifsc"),
    ],
  },
];
