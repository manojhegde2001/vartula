/**
 * Field types for the record generator. Each type draws from faker (passed in, already seeded and localised)
 * or from the checksum/ID helpers, so a schema plus a seed always produces the same rows.
 */
import type { Faker } from "@faker-js/faker";
import { aadhaar, cardNumber, gstin, iban, ifsc, indianMobile, indianPin, pan, upiId, vehicleIN, type CardBrand, type IbanCountry } from "./checksums";
import { edgeCategories } from "./edge-cases";
import { formatDate, nanoid, password, ulid, uuidV4, uuidV7 } from "./ids";
import type { Rng } from "./rng";

export type Value = string | number | boolean | null | Value[] | { [key: string]: Value };
export type Row = Record<string, Value>;

export interface GenContext {
  f: Faker;
  rng: Rng;
  /** 0-based row index. */
  row: number;
  /** Values already generated for this row, by field name (for templates). */
  record: Row;
  /** Fixed "now" so dates are reproducible. */
  now: number;
}

export type OptionDef =
  | { key: string; label: string; kind: "number"; default: number; min?: number; max?: number; step?: number }
  | { key: string; label: string; kind: "text"; default: string; placeholder?: string }
  | { key: string; label: string; kind: "select"; default: string; choices: { value: string; label: string }[] }
  | { key: string; label: string; kind: "date"; default: string };

export type Options = Record<string, string | number>;

export interface FieldType {
  label: string;
  group: string;
  /** Shape of the value, for TypeScript output. */
  kind: "string" | "number" | "boolean";
  /** Column type for CREATE TABLE. */
  sql: "text" | "integer" | "decimal" | "boolean" | "date" | "timestamp" | "uuid";
  options?: OptionDef[];
  gen: (ctx: GenContext, o: Options) => Value;
}

const num = (o: Options, k: string) => Number(o[k]);
const str = (o: Options, k: string) => String(o[k] ?? "");

const dateFormats = [
  { value: "iso-date", label: "2024-03-15" },
  { value: "iso", label: "ISO 8601 date-time" },
  { value: "sql", label: "2024-03-15 14:30:00" },
  { value: "dmy", label: "15/03/2024" },
  { value: "mdy", label: "03/15/2024" },
  { value: "unix", label: "Unix seconds" },
  { value: "unix-ms", label: "Unix milliseconds" },
];

function writeDate(d: Date, format: string): Value {
  switch (format) {
    case "iso":
      return d.toISOString();
    case "sql":
      return formatDate(d, "yyyy-MM-dd HH:mm:ss");
    case "dmy":
      return formatDate(d, "dd/MM/yyyy");
    case "mdy":
      return formatDate(d, "MM/dd/yyyy");
    case "unix":
      return Math.floor(d.getTime() / 1000);
    case "unix-ms":
      return d.getTime();
    default:
      return formatDate(d, "yyyy-MM-dd");
  }
}

/** `#` digit, `?` upper-case letter, `*` letter or digit, `\` escapes the next character. */
export function fromPattern(rng: Rng, pattern: string): string {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "\\" && i + 1 < pattern.length) out += pattern[++i];
    else if (ch === "#") out += Math.floor(rng() * 10);
    else if (ch === "?") out += String.fromCharCode(65 + Math.floor(rng() * 26));
    else if (ch === "*") out += "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(rng() * 36)];
    else out += ch;
  }
  return out;
}

/** Fill `{{name}}` from earlier fields in the row; anything else (e.g. `{{person.firstName}}`) goes to faker. */
function fillTemplate(ctx: GenContext, template: string): string {
  const own = template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key: string) => {
    if (key in ctx.record) {
      const v = ctx.record[key];
      return v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    }
    return match;
  });
  try {
    return own.includes("{{") ? ctx.f.helpers.fake(own) : own;
  } catch {
    return own;
  }
}

const emailSafe = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");

const edgeChoices = [{ value: "any", label: "Any category" }, ...edgeCategories.map((c) => ({ value: c.id, label: c.label }))];

export const fieldTypes = {
  // ---- Basic ----
  rowNumber: {
    label: "Row number",
    group: "Basic",
    kind: "number",
    sql: "integer",
    options: [{ key: "start", label: "Start at", kind: "number", default: 1 }],
    gen: (c, o) => num(o, "start") + c.row,
  },
  uuid: {
    label: "UUID",
    group: "Basic",
    kind: "string",
    sql: "uuid",
    options: [{ key: "version", label: "Version", kind: "select", default: "v4", choices: [{ value: "v4", label: "v4 (random)" }, { value: "v7", label: "v7 (time-ordered)" }] }],
    gen: (c, o) => (o.version === "v7" ? uuidV7(c.rng, c.now - 86_400_000 + c.row * 1000) : uuidV4(c.rng)),
  },
  ulid: { label: "ULID", group: "Basic", kind: "string", sql: "text", gen: (c) => ulid(c.rng, c.now - 86_400_000 + c.row * 1000) },
  nanoid: {
    label: "Nano ID",
    group: "Basic",
    kind: "string",
    sql: "text",
    options: [{ key: "size", label: "Length", kind: "number", default: 21, min: 2, max: 64 }],
    gen: (c, o) => nanoid(c.rng, num(o, "size")),
  },
  integer: {
    label: "Integer",
    group: "Basic",
    kind: "number",
    sql: "integer",
    options: [
      { key: "min", label: "Min", kind: "number", default: 1 },
      { key: "max", label: "Max", kind: "number", default: 1000 },
    ],
    gen: (c, o) => c.f.number.int({ min: Math.min(num(o, "min"), num(o, "max")), max: Math.max(num(o, "min"), num(o, "max")) }),
  },
  decimal: {
    label: "Decimal",
    group: "Basic",
    kind: "number",
    sql: "decimal",
    options: [
      { key: "min", label: "Min", kind: "number", default: 0 },
      { key: "max", label: "Max", kind: "number", default: 100 },
      { key: "decimals", label: "Decimals", kind: "number", default: 2, min: 0, max: 10 },
    ],
    gen: (c, o) => Number(c.f.number.float({ min: Math.min(num(o, "min"), num(o, "max")), max: Math.max(num(o, "min"), num(o, "max")) }).toFixed(num(o, "decimals"))),
  },
  boolean: {
    label: "Boolean",
    group: "Basic",
    kind: "boolean",
    sql: "boolean",
    options: [{ key: "chance", label: "% true", kind: "number", default: 50, min: 0, max: 100 }],
    gen: (c, o) => c.rng() * 100 < num(o, "chance"),
  },
  list: {
    label: "Custom list",
    group: "Basic",
    kind: "string",
    sql: "text",
    options: [{ key: "values", label: "Values (comma separated, add :weight)", kind: "text", default: "active:6, pending:3, blocked:1", placeholder: "red, green, blue" }],
    gen: (c, o) => {
      const items = str(o, "values")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const m = /^(.*?):(\d+(?:\.\d+)?)$/.exec(s);
          return m ? { value: m[1].trim(), weight: Number(m[2]) } : { value: s, weight: 1 };
        });
      if (items.length === 0) return null;
      return c.f.helpers.weightedArrayElement(items);
    },
  },
  pattern: {
    label: "Pattern",
    group: "Basic",
    kind: "string",
    sql: "text",
    options: [{ key: "pattern", label: "# digit · ? letter · * either", kind: "text", default: "ORD-####-??" }],
    gen: (c, o) => fromPattern(c.rng, str(o, "pattern")),
  },
  regex: {
    label: "Regular expression",
    group: "Basic",
    kind: "string",
    sql: "text",
    options: [{ key: "regex", label: "Regex", kind: "text", default: "[A-Z]{3}-[0-9]{4}" }],
    gen: (c, o) => {
      try {
        return c.f.helpers.fromRegExp(str(o, "regex"));
      } catch {
        return null;
      }
    },
  },
  template: {
    label: "Template",
    group: "Basic",
    kind: "string",
    sql: "text",
    options: [{ key: "template", label: "Use {{field}} or {{person.firstName}}", kind: "text", default: "{{first_name}}.{{last_name}}@example.com" }],
    gen: (c, o) => fillTemplate(c, str(o, "template")),
  },
  constant: {
    label: "Constant",
    group: "Basic",
    kind: "string",
    sql: "text",
    options: [{ key: "value", label: "Value", kind: "text", default: "test" }],
    gen: (_, o) => str(o, "value"),
  },
  reference: {
    label: "Reference ID (foreign key)",
    group: "Basic",
    kind: "number",
    sql: "integer",
    options: [{ key: "max", label: "Rows in the other table", kind: "number", default: 100, min: 1 }],
    gen: (c, o) => c.f.number.int({ min: 1, max: Math.max(1, num(o, "max")) }),
  },

  // ---- Person ----
  firstName: { label: "First name", group: "Person", kind: "string", sql: "text", gen: (c) => c.f.person.firstName() },
  lastName: { label: "Last name", group: "Person", kind: "string", sql: "text", gen: (c) => c.f.person.lastName() },
  fullName: { label: "Full name", group: "Person", kind: "string", sql: "text", gen: (c) => c.f.person.fullName() },
  sex: { label: "Sex", group: "Person", kind: "string", sql: "text", gen: (c) => c.f.person.sex() },
  jobTitle: { label: "Job title", group: "Person", kind: "string", sql: "text", gen: (c) => c.f.person.jobTitle() },
  username: { label: "Username", group: "Person", kind: "string", sql: "text", gen: (c) => c.f.internet.username() },
  age: {
    label: "Age",
    group: "Person",
    kind: "number",
    sql: "integer",
    options: [
      { key: "min", label: "Min", kind: "number", default: 18 },
      { key: "max", label: "Max", kind: "number", default: 80 },
    ],
    gen: (c, o) => c.f.number.int({ min: num(o, "min"), max: Math.max(num(o, "min"), num(o, "max")) }),
  },
  birthdate: {
    label: "Date of birth",
    group: "Person",
    kind: "string",
    sql: "date",
    options: [
      { key: "min", label: "Min age", kind: "number", default: 18 },
      { key: "max", label: "Max age", kind: "number", default: 80 },
      { key: "format", label: "Format", kind: "select", default: "iso-date", choices: dateFormats },
    ],
    gen: (c, o) =>
      writeDate(c.f.date.birthdate({ mode: "age", min: num(o, "min"), max: Math.max(num(o, "min"), num(o, "max")), refDate: c.now }), str(o, "format")),
  },

  // ---- Internet & contact ----
  email: {
    label: "Email",
    group: "Internet",
    kind: "string",
    sql: "text",
    options: [{ key: "domain", label: "Domain (blank = realistic providers)", kind: "text", default: "example.com" }],
    gen: (c, o) => {
      const first = typeof c.record.first_name === "string" ? c.record.first_name : c.f.person.firstName();
      const last = typeof c.record.last_name === "string" ? c.record.last_name : c.f.person.lastName();
      const local = `${emailSafe(first)}.${emailSafe(last)}${c.rng() < 0.4 ? c.f.number.int({ min: 1, max: 99 }) : ""}`;
      return str(o, "domain") ? `${local}@${str(o, "domain")}` : c.f.internet.email({ firstName: first, lastName: last });
    },
  },
  phone: { label: "Phone number", group: "Internet", kind: "string", sql: "text", gen: (c) => c.f.phone.number() },
  url: { label: "URL", group: "Internet", kind: "string", sql: "text", gen: (c) => c.f.internet.url() },
  domain: { label: "Domain name", group: "Internet", kind: "string", sql: "text", gen: (c) => c.f.internet.domainName() },
  ipv4: { label: "IPv4 address", group: "Internet", kind: "string", sql: "text", gen: (c) => c.f.internet.ipv4() },
  ipv6: { label: "IPv6 address", group: "Internet", kind: "string", sql: "text", gen: (c) => c.f.internet.ipv6() },
  mac: { label: "MAC address", group: "Internet", kind: "string", sql: "text", gen: (c) => c.f.internet.mac() },
  userAgent: { label: "User agent", group: "Internet", kind: "string", sql: "text", gen: (c) => c.f.internet.userAgent() },
  password: {
    label: "Password",
    group: "Internet",
    kind: "string",
    sql: "text",
    options: [{ key: "length", label: "Length", kind: "number", default: 14, min: 4, max: 128 }],
    gen: (c, o) => password(c.rng, { length: num(o, "length"), upper: true, lower: true, digits: true, symbols: true, noAmbiguous: true }),
  },
  color: { label: "Hex colour", group: "Internet", kind: "string", sql: "text", gen: (c) => c.f.color.rgb() },
  emoji: { label: "Emoji", group: "Internet", kind: "string", sql: "text", gen: (c) => c.f.internet.emoji() },
  httpStatus: { label: "HTTP status code", group: "Internet", kind: "number", sql: "integer", gen: (c) => c.f.internet.httpStatusCode() },
  httpMethod: { label: "HTTP method", group: "Internet", kind: "string", sql: "text", gen: (c) => c.f.internet.httpMethod() },

  // ---- Location ----
  street: { label: "Street address", group: "Location", kind: "string", sql: "text", gen: (c) => c.f.location.streetAddress() },
  city: { label: "City", group: "Location", kind: "string", sql: "text", gen: (c) => c.f.location.city() },
  state: { label: "State / region", group: "Location", kind: "string", sql: "text", gen: (c) => c.f.location.state() },
  zip: { label: "Postal code", group: "Location", kind: "string", sql: "text", gen: (c) => c.f.location.zipCode() },
  country: { label: "Country", group: "Location", kind: "string", sql: "text", gen: (c) => c.f.location.country() },
  countryCode: { label: "Country code", group: "Location", kind: "string", sql: "text", gen: (c) => c.f.location.countryCode() },
  address: {
    label: "Full address",
    group: "Location",
    kind: "string",
    sql: "text",
    gen: (c) => `${c.f.location.streetAddress()}, ${c.f.location.city()}, ${c.f.location.state()} ${c.f.location.zipCode()}`,
  },
  latitude: { label: "Latitude", group: "Location", kind: "number", sql: "decimal", gen: (c) => c.f.location.latitude() },
  longitude: { label: "Longitude", group: "Location", kind: "number", sql: "decimal", gen: (c) => c.f.location.longitude() },
  timeZone: { label: "Time zone", group: "Location", kind: "string", sql: "text", gen: (c) => c.f.location.timeZone() },

  // ---- Business & finance ----
  company: { label: "Company", group: "Business", kind: "string", sql: "text", gen: (c) => c.f.company.name() },
  department: { label: "Department", group: "Business", kind: "string", sql: "text", gen: (c) => c.f.commerce.department() },
  product: { label: "Product name", group: "Business", kind: "string", sql: "text", gen: (c) => c.f.commerce.productName() },
  price: {
    label: "Price",
    group: "Business",
    kind: "number",
    sql: "decimal",
    options: [
      { key: "min", label: "Min", kind: "number", default: 1 },
      { key: "max", label: "Max", kind: "number", default: 500 },
    ],
    gen: (c, o) => Number(c.f.commerce.price({ min: num(o, "min"), max: Math.max(num(o, "min"), num(o, "max")) })),
  },
  currency: { label: "Currency code", group: "Business", kind: "string", sql: "text", gen: (c) => c.f.finance.currencyCode() },
  creditCard: {
    label: "Card number (test)",
    group: "Business",
    kind: "string",
    sql: "text",
    options: [
      {
        key: "brand",
        label: "Brand",
        kind: "select",
        default: "visa",
        choices: [
          { value: "visa", label: "Visa" },
          { value: "mastercard", label: "Mastercard" },
          { value: "amex", label: "American Express" },
          { value: "discover", label: "Discover" },
          { value: "rupay", label: "RuPay" },
          { value: "jcb", label: "JCB" },
          { value: "diners", label: "Diners Club" },
        ],
      },
    ],
    gen: (c, o) => cardNumber(c.rng, str(o, "brand") as CardBrand),
  },
  cvv: { label: "Card CVV", group: "Business", kind: "string", sql: "text", gen: (c) => fromPattern(c.rng, "###") },
  cardExpiry: {
    label: "Card expiry (MM/YY)",
    group: "Business",
    kind: "string",
    sql: "text",
    gen: (c) => formatDate(c.f.date.future({ years: 5, refDate: c.now }), "MM/yyyy").replace(/\/\d\d(\d\d)$/, "/$1"),
  },
  iban: {
    label: "IBAN (test)",
    group: "Business",
    kind: "string",
    sql: "text",
    options: [
      {
        key: "country",
        label: "Country",
        kind: "select",
        default: "DE",
        choices: [
          { value: "DE", label: "Germany" },
          { value: "GB", label: "United Kingdom" },
          { value: "NL", label: "Netherlands" },
          { value: "IE", label: "Ireland" },
          { value: "AT", label: "Austria" },
          { value: "CH", label: "Switzerland" },
          { value: "AE", label: "UAE" },
        ],
      },
    ],
    gen: (c, o) => iban(c.rng, str(o, "country") as IbanCountry),
  },
  bic: { label: "BIC / SWIFT", group: "Business", kind: "string", sql: "text", gen: (c) => c.f.finance.bic() },
  accountNumber: { label: "Account number", group: "Business", kind: "string", sql: "text", gen: (c) => c.f.finance.accountNumber(12) },
  transactionType: { label: "Transaction type", group: "Business", kind: "string", sql: "text", gen: (c) => c.f.finance.transactionType() },

  // ---- Dates ----
  date: {
    label: "Date / time",
    group: "Date",
    kind: "string",
    sql: "timestamp",
    options: [
      { key: "from", label: "From", kind: "date", default: "2023-01-01" },
      { key: "to", label: "To", kind: "date", default: "2025-12-31" },
      { key: "format", label: "Format", kind: "select", default: "iso", choices: dateFormats },
    ],
    gen: (c, o) => {
      const from = Date.parse(str(o, "from")) || c.now - 365 * 86_400_000;
      const to = Date.parse(str(o, "to")) || c.now;
      return writeDate(c.f.date.between({ from: Math.min(from, to), to: Math.max(from, to) }), str(o, "format"));
    },
  },
  time: { label: "Time of day", group: "Date", kind: "string", sql: "text", gen: (c) => formatDate(new Date(Math.floor(c.rng() * 86_400) * 1000), "HH:mm:ss") },
  weekday: { label: "Weekday", group: "Date", kind: "string", sql: "text", gen: (c) => c.f.date.weekday() },
  month: { label: "Month", group: "Date", kind: "string", sql: "text", gen: (c) => c.f.date.month() },

  // ---- Text ----
  word: { label: "Word", group: "Text", kind: "string", sql: "text", gen: (c) => c.f.lorem.word() },
  words: {
    label: "Words",
    group: "Text",
    kind: "string",
    sql: "text",
    options: [{ key: "count", label: "Words", kind: "number", default: 3, min: 1, max: 100 }],
    gen: (c, o) => c.f.lorem.words(num(o, "count")),
  },
  sentence: { label: "Sentence", group: "Text", kind: "string", sql: "text", gen: (c) => c.f.lorem.sentence() },
  paragraph: { label: "Paragraph", group: "Text", kind: "string", sql: "text", gen: (c) => c.f.lorem.paragraph() },
  text: {
    label: "Text of exact length",
    group: "Text",
    kind: "string",
    sql: "text",
    options: [{ key: "length", label: "Characters", kind: "number", default: 50, min: 1, max: 100_000 }],
    gen: (c, o) => {
      let s = "";
      while (s.length < num(o, "length")) s += `${c.f.lorem.sentence()} `;
      return s.slice(0, num(o, "length"));
    },
  },
  slug: { label: "Slug", group: "Text", kind: "string", sql: "text", gen: (c) => c.f.lorem.slug() },
  edgeString: {
    label: "Edge-case string",
    group: "Text",
    kind: "string",
    sql: "text",
    options: [{ key: "category", label: "Category", kind: "select", default: "any", choices: edgeChoices }],
    gen: (c, o) => {
      const cats = o.category === "any" ? edgeCategories : edgeCategories.filter((x) => x.id === o.category);
      return c.f.helpers.arrayElement(c.f.helpers.arrayElement(cats).cases).value;
    },
  },

  // ---- India ----
  pan: { label: "PAN (test)", group: "India", kind: "string", sql: "text", gen: (c) => pan(c.rng) },
  gstin: { label: "GSTIN (test)", group: "India", kind: "string", sql: "text", gen: (c) => gstin(c.rng) },
  aadhaar: { label: "Aadhaar-format number (test)", group: "India", kind: "string", sql: "text", gen: (c) => aadhaar(c.rng) },
  ifsc: { label: "IFSC code", group: "India", kind: "string", sql: "text", gen: (c) => ifsc(c.rng) },
  pinCode: { label: "PIN code", group: "India", kind: "string", sql: "text", gen: (c) => indianPin(c.rng) },
  mobileIN: { label: "Mobile (+91)", group: "India", kind: "string", sql: "text", gen: (c) => indianMobile(c.rng) },
  upi: {
    label: "UPI ID",
    group: "India",
    kind: "string",
    sql: "text",
    gen: (c) => upiId(c.rng, typeof c.record.first_name === "string" ? c.record.first_name : c.f.person.firstName()),
  },
  vehicle: { label: "Vehicle registration", group: "India", kind: "string", sql: "text", gen: (c) => vehicleIN(c.rng) },
} satisfies Record<string, FieldType>;

export type FieldTypeId = keyof typeof fieldTypes;

export const fieldGroups = ["Basic", "Person", "Internet", "Location", "Business", "Date", "Text", "India"] as const;

export function defaultOptions(type: FieldTypeId): Options {
  const defs: OptionDef[] = (fieldTypes[type] as FieldType).options ?? [];
  return Object.fromEntries(defs.map((d) => [d.key, d.default]));
}
