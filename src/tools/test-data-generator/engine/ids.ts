/** Identifiers, passwords and timestamps from a seeded PRNG. */
import { pick, randInt, type Rng } from "./rng";

const hex = (rng: Rng, n: number) => Array.from({ length: n }, () => "0123456789abcdef"[randInt(rng, 0, 15)]).join("");

export function uuidV4(rng: Rng): string {
  const h = hex(rng, 32).split("");
  h[12] = "4";
  h[16] = "89ab"[randInt(rng, 0, 3)];
  const s = h.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** UUIDv7: 48-bit Unix milliseconds first, so IDs sort by creation time. */
export function uuidV7(rng: Rng, ms = Date.now()): string {
  const time = Math.floor(ms).toString(16).padStart(12, "0").slice(-12);
  const rand = hex(rng, 20).split("");
  rand[0] = "7";
  rand[4] = "89ab"[randInt(rng, 0, 3)];
  const r = rand.join("");
  return `${time.slice(0, 8)}-${time.slice(8, 12)}-${r.slice(0, 4)}-${r.slice(4, 8)}-${r.slice(8, 20)}`;
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** ULID: 10 characters of time + 16 of randomness, Crockford base32. */
export function ulid(rng: Rng, ms = Date.now()): string {
  let t = Math.floor(ms);
  let time = "";
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[t % 32] + time;
    t = Math.floor(t / 32);
  }
  return time + Array.from({ length: 16 }, () => pick(rng, [...CROCKFORD])).join("");
}

export const nanoid = (rng: Rng, size = 21) =>
  Array.from({ length: size }, () => pick(rng, [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"])).join("");

export interface PasswordRules {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  /** Leave out look-alikes such as 0/O and 1/l/I. */
  noAmbiguous: boolean;
}

export const defaultPasswordRules: PasswordRules = { length: 16, upper: true, lower: true, digits: true, symbols: true, noAmbiguous: true };

/** A password with at least one character from every enabled set. */
export function password(rng: Rng, r: PasswordRules): string {
  const strip = (s: string) => (r.noAmbiguous ? s.replace(/[0O1lI|]/g, "") : s);
  const sets = [
    r.upper && strip("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
    r.lower && strip("abcdefghijklmnopqrstuvwxyz"),
    r.digits && strip("0123456789"),
    r.symbols && strip("!@#$%^&*()-_=+[]{};:,.?/"),
  ].filter((s): s is string => !!s);
  if (sets.length === 0) return "";
  const length = Math.max(r.length, sets.length);
  const chars = sets.map((s) => pick(rng, [...s]));
  const all = [...sets.join("")];
  while (chars.length < length) chars.push(pick(rng, all));
  // Shuffle so the guaranteed characters aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** Format a date with tokens yyyy, MM, dd, HH, mm, ss (UTC). Anything else is kept. */
export function formatDate(d: Date, pattern: string): string {
  return pattern.replace(/yyyy|MM|dd|HH|mm|ss/g, (t) =>
    t === "yyyy"
      ? String(d.getUTCFullYear())
      : t === "MM"
        ? pad(d.getUTCMonth() + 1)
        : t === "dd"
          ? pad(d.getUTCDate())
          : t === "HH"
            ? pad(d.getUTCHours())
            : t === "mm"
              ? pad(d.getUTCMinutes())
              : pad(d.getUTCSeconds()),
  );
}

/** The ways a timestamp is commonly written, for the Values tab. */
export function timestampFormats(d: Date) {
  return [
    { label: "ISO 8601", value: d.toISOString() },
    { label: "Unix seconds", value: String(Math.floor(d.getTime() / 1000)) },
    { label: "Unix milliseconds", value: String(d.getTime()) },
    { label: "RFC 2822 / HTTP", value: d.toUTCString() },
    { label: "Date", value: formatDate(d, "yyyy-MM-dd") },
    { label: "SQL datetime", value: formatDate(d, "yyyy-MM-dd HH:mm:ss") },
    { label: "dd/MM/yyyy", value: formatDate(d, "dd/MM/yyyy") },
    { label: "MM/dd/yyyy", value: formatDate(d, "MM/dd/yyyy") },
  ];
}
