/**
 * Check-digit algorithms and generators for IDs that validators check: card numbers (Luhn), IBAN (ISO 7064
 * mod 97-10), Aadhaar (Verhoeff) and GSTIN. Generated values are random and only *look* valid; they belong
 * to no one and must only be used as test data.
 */
import { pick, randInt, type Rng } from "./rng";

const digits = (rng: Rng, n: number) => Array.from({ length: n }, () => randInt(rng, 0, 9)).join("");
const letters = (rng: Rng, n: number, set = "ABCDEFGHIJKLMNOPQRSTUVWXYZ") => Array.from({ length: n }, () => pick(rng, [...set])).join("");

// ---- Luhn (payment cards) ----

export function luhnCheckDigit(partial: string): number {
  let sum = 0;
  for (let i = 0; i < partial.length; i++) {
    let d = Number(partial[partial.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return (10 - (sum % 10)) % 10;
}

export const luhnValid = (num: string) => /^\d+$/.test(num) && luhnCheckDigit(num.slice(0, -1)) === Number(num.at(-1));

export const cardBrands = {
  visa: { label: "Visa", prefixes: ["4"], length: 16 },
  mastercard: { label: "Mastercard", prefixes: ["51", "52", "53", "54", "55", "2221", "2720"], length: 16 },
  amex: { label: "American Express", prefixes: ["34", "37"], length: 15 },
  discover: { label: "Discover", prefixes: ["6011", "65"], length: 16 },
  rupay: { label: "RuPay", prefixes: ["60", "6521", "6522", "81", "82"], length: 16 },
  jcb: { label: "JCB", prefixes: ["3528", "3589"], length: 16 },
  diners: { label: "Diners Club", prefixes: ["36", "38"], length: 14 },
} as const;
export type CardBrand = keyof typeof cardBrands;

export function cardNumber(rng: Rng, brand: CardBrand = "visa"): string {
  const { prefixes, length } = cardBrands[brand];
  const prefix = pick(rng, prefixes);
  const body = prefix + digits(rng, length - 1 - prefix.length);
  return body + luhnCheckDigit(body);
}

/** Group a card number the way it's printed: 4-4-4-4, or 4-6-5 for Amex. */
export function formatCard(num: string): string {
  if (num.length === 15) return `${num.slice(0, 4)} ${num.slice(4, 10)} ${num.slice(10)}`;
  return num.replace(/(.{4})(?=.)/g, "$1 ");
}

// ---- IBAN ----

/** BBAN layouts for countries without an extra national check digit. n = digits, a = letters, c = alphanumeric. */
export const ibanCountries = {
  DE: { label: "Germany", bban: "18n" },
  GB: { label: "United Kingdom", bban: "4a14n" },
  NL: { label: "Netherlands", bban: "4a10n" },
  IE: { label: "Ireland", bban: "4a14n" },
  AT: { label: "Austria", bban: "16n" },
  CH: { label: "Switzerland", bban: "5n12c" },
  AE: { label: "United Arab Emirates", bban: "3n16n" },
} as const;
export type IbanCountry = keyof typeof ibanCountries;

function mod97(numeric: string): number {
  let rem = 0;
  for (let i = 0; i < numeric.length; i += 7) rem = Number(String(rem) + numeric.slice(i, i + 7)) % 97;
  return rem;
}
const toNumeric = (s: string) => s.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

export function ibanValid(iban: string): boolean {
  const s = iban.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(s)) return false;
  return mod97(toNumeric(s.slice(4) + s.slice(0, 4))) === 1;
}

export function iban(rng: Rng, country: IbanCountry = "DE"): string {
  const bban = ibanCountries[country].bban.replace(/(\d+)([nac])/g, (_, n: string, kind: string) =>
    kind === "n" ? digits(rng, Number(n)) : kind === "a" ? letters(rng, Number(n)) : letters(rng, Number(n), "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
  );
  const check = 98 - mod97(toNumeric(`${bban}${country}00`));
  return `${country}${String(check).padStart(2, "0")}${bban}`;
}

export const formatIban = (s: string) => s.replace(/(.{4})(?=.)/g, "$1 ");

// ---- Verhoeff (Aadhaar) ----

const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

export function verhoeffCheckDigit(partial: string): number {
  let c = 0;
  const rev = [...partial].reverse();
  for (let i = 0; i < rev.length; i++) c = D[c][P[(i + 1) % 8][Number(rev[i])]];
  return INV[c];
}

export function verhoeffValid(num: string): boolean {
  let c = 0;
  const rev = [...num].reverse();
  for (let i = 0; i < rev.length; i++) c = D[c][P[i % 8][Number(rev[i])]];
  return c === 0;
}

/** 12 digits, first digit 2–9, Verhoeff check digit last: the Aadhaar format. Random; not a real number. */
export function aadhaar(rng: Rng): string {
  const partial = String(randInt(rng, 2, 9)) + digits(rng, 10);
  return partial + verhoeffCheckDigit(partial);
}

// ---- Indian tax and bank IDs ----

const STATE_CODES = ["01", "06", "07", "08", "09", "19", "24", "27", "29", "32", "33", "36"];
const B36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** PAN: 5 letters (4th is the holder type, P for a person), 4 digits, 1 letter. */
export function pan(rng: Rng, holder = "P"): string {
  return `${letters(rng, 3)}${holder}${letters(rng, 1)}${digits(rng, 4)}${letters(rng, 1)}`;
}

export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = B36.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return B36[(36 - (sum % 36)) % 36];
}

export const gstinValid = (g: string) => /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g) && gstinCheckChar(g.slice(0, 14)) === g[14];

/** GSTIN: state code + PAN + entity number + Z + check character. */
export function gstin(rng: Rng): string {
  const first14 = `${pick(rng, STATE_CODES)}${pan(rng, "C")}${randInt(rng, 1, 9)}Z`;
  return first14 + gstinCheckChar(first14);
}

/** IFSC: 4-letter bank code, a zero, 6-character branch code. */
export function ifsc(rng: Rng): string {
  return `${pick(rng, ["SBIN", "HDFC", "ICIC", "UTIB", "KKBK", "PUNB", "BARB", "CNRB"])}0${letters(rng, 6, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")}`;
}

export const indianMobile = (rng: Rng) => `+91 ${randInt(rng, 6, 9)}${digits(rng, 4)} ${digits(rng, 5)}`;
export const indianPin = (rng: Rng) => `${randInt(rng, 1, 8)}${digits(rng, 5)}`;
export const upiId = (rng: Rng, name = "user") => `${name.toLowerCase().replace(/[^a-z0-9.]/g, "")}${randInt(rng, 1, 999)}@${pick(rng, ["okaxis", "okhdfcbank", "oksbi", "ybl", "paytm"])}`;
export const vehicleIN = (rng: Rng) => `${pick(rng, ["MH", "KA", "DL", "TN", "GJ", "UP", "KL", "TS"])} ${String(randInt(rng, 1, 50)).padStart(2, "0")} ${letters(rng, 2)} ${digits(rng, 4)}`;
