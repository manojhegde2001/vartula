/**
 * Strings that commonly break forms, parsers and databases, grouped for exploratory testing.
 * Inspired by the Big List of Naughty Strings and OWASP test guides; the security entries are harmless probes
 * meant for testing your own applications.
 */

export interface EdgeCase {
  value: string;
  /** What the string exercises. */
  note: string;
}

export interface EdgeCategory {
  id: string;
  label: string;
  description: string;
  cases: EdgeCase[];
}

const c = (value: string, note: string): EdgeCase => ({ value, note });

export const edgeCategories: EdgeCategory[] = [
  {
    id: "empty",
    label: "Empty & whitespace",
    description: "Blank-looking input that validation often lets through.",
    cases: [
      c("", "Empty string"),
      c(" ", "Single space"),
      c("   ", "Only spaces"),
      c("\t", "Tab"),
      c("\n", "Line feed"),
      c("\r\n", "Windows line break"),
      c("  leading", "Leading spaces"),
      c("trailing  ", "Trailing spaces"),
      c("\u00a0", "No-break space (looks like a space, isn't one)"),
      c("\u3000", "Ideographic (full-width) space"),
      c("\u200b", "Zero-width space (invisible)"),
      c("\ufeff", "Byte-order mark (invisible)"),
      c("null", "The word null"),
      c("undefined", "The word undefined"),
      c("NaN", "The word NaN"),
    ],
  },
  {
    id: "unicode",
    label: "Unicode & emoji",
    description: "Characters that break byte-length checks, fonts and string slicing.",
    cases: [
      c("José Müller-Ørsted", "Accents and other Latin letters"),
      c("e\u0301", "e + combining accent (2 code points, 1 visible letter)"),
      c("Z\u0351\u0352\u0353\u0354a\u0355\u0356l\u0357\u0358g\u0359o\u035a", "Zalgo-style combining marks"),
      c("😀", "Emoji (2 UTF-16 units, 4 UTF-8 bytes)"),
      c("👨‍👩‍👧‍👦", "Family emoji (one glyph, 11 UTF-16 units)"),
      c("🇮🇳🇺🇸", "Flags (pairs of regional indicators)"),
      c("👍🏽", "Emoji with skin-tone modifier"),
      c("田中太郎", "Japanese (CJK)"),
      c("Привет мир", "Cyrillic"),
      c("नमस्ते दुनिया", "Devanagari (Hindi)"),
      c("ﷺ", "A single character that renders very wide"),
      c("𝕿𝖊𝖘𝖙", "Mathematical letters outside the BMP"),
      c("İstanbul", "Dotted capital I (breaks naive lower-casing)"),
      c("ß", "Sharp s (upper-cases to SS)"),
      c("\ud83d", "Lone surrogate (invalid UTF-16)"),
    ],
  },
  {
    id: "rtl",
    label: "Right-to-left & invisible",
    description: "Text direction controls and hidden characters that change how text displays.",
    cases: [
      c("مرحبا بالعالم", "Arabic"),
      c("שלום עולם", "Hebrew"),
      c("Hello مرحبا World", "Mixed direction"),
      c("\u202Etxet desrever", "Right-to-left override (reverses what follows)"),
      c("admin\u200b", "Looks like 'admin', has an invisible character"),
      c("pаypal", "Cyrillic 'а' that looks Latin (homoglyph)"),
      c("a\u00adb", "Soft hyphen (invisible unless the line wraps)"),
      c("\u2066isolated\u2069", "Bidi isolate characters"),
    ],
  },
  {
    id: "numbers",
    label: "Numbers",
    description: "Values at the edges of number parsing and storage.",
    cases: [
      c("0", "Zero"),
      c("-0", "Negative zero"),
      c("-1", "Negative"),
      c("0.1", "Decimal"),
      c("0,1", "Comma decimal (European)"),
      c("1,000,000", "Thousands separators"),
      c("1e309", "Overflows to Infinity"),
      c("1e-400", "Underflows to 0"),
      c("2147483647", "Max 32-bit signed integer"),
      c("2147483648", "Max 32-bit signed integer + 1"),
      c("9007199254740993", "Beyond JavaScript's safe integer range"),
      c("18446744073709551616", "2^64"),
      c("00042", "Leading zeros"),
      c("0x1F", "Hexadecimal"),
      c("١٢٣", "Arabic-Indic digits"),
      c("１２３", "Full-width digits"),
      c("Infinity", "The word Infinity"),
    ],
  },
  {
    id: "dates",
    label: "Dates & times",
    description: "Calendar edge cases for date pickers, parsers and time zones.",
    cases: [
      c("2024-02-29", "Leap day"),
      c("2023-02-29", "Leap day in a non-leap year (invalid)"),
      c("1900-02-29", "1900 was not a leap year"),
      c("2000-02-29", "2000 was a leap year"),
      c("1970-01-01T00:00:00Z", "Unix epoch"),
      c("1969-12-31T23:59:59Z", "One second before the epoch (negative timestamp)"),
      c("2038-01-19T03:14:08Z", "Year 2038 overflow of 32-bit time"),
      c("9999-12-31", "Maximum 4-digit year"),
      c("0001-01-01", "Year 1"),
      c("2024-03-10T02:30:00-05:00", "Inside a US daylight-saving gap"),
      c("2024-11-03T01:30:00-04:00", "Ambiguous hour when US clocks go back"),
      c("2024-12-31T23:59:60Z", "Leap second"),
      c("31/12/2024", "Day-first format"),
      c("12/31/2024", "Month-first format"),
      c("2024-13-01", "Month 13 (invalid)"),
    ],
  },
  {
    id: "length",
    label: "Length & format",
    description: "Inputs that test limits and structure.",
    cases: [
      c("a", "Single character"),
      c("a".repeat(255), "255 characters"),
      c("a".repeat(256), "256 characters"),
      c("a".repeat(1025), "1,025 characters"),
      c("Supercalifragilisticexpialidocious".repeat(8), "A very long word with no spaces"),
      c("first.last+tag@sub.example.co.uk", "Valid email with plus and subdomain"),
      c('"very.(),:;<>[]".VERY."very@\\ "very".unusual"@strange.example.com', "Strange but valid email"),
      c("user@localhost", "Email without a dot in the domain"),
      c("o'brien", "Apostrophe in a name"),
      c("Mary-Jane O'Neil-Smith", "Hyphens and apostrophes"),
      c("a\nb", "Line break inside a single-line field"),
      c("https://example.com/path?query=1&b=2#frag", "URL with query and fragment"),
      c("C:\\Users\\test\\file.txt", "Windows path"),
    ],
  },
  {
    id: "injection",
    label: "Security probes",
    description: "Harmless payloads that reveal missing escaping. Use only on systems you are allowed to test.",
    cases: [
      c("' OR '1'='1", "SQL injection (classic)"),
      c("'; DROP TABLE users;--", "SQL injection (stacked query)"),
      c("<script>alert(1)</script>", "XSS (script tag)"),
      c('"><img src=x onerror=alert(1)>', "XSS (attribute break-out)"),
      c("javascript:alert(1)", "XSS (javascript: URL)"),
      c("{{7*7}}", "Template injection (shows 49 if evaluated)"),
      c("${7*7}", "Expression injection"),
      c("../../../../etc/passwd", "Path traversal"),
      c("..\\..\\..\\windows\\win.ini", "Path traversal (Windows)"),
      c("%s%s%s%n", "Format string"),
      c("=HYPERLINK(\"http://example.com\",\"click\")", "CSV / spreadsheet formula injection"),
      c("<!--", "Unclosed HTML comment"),
      c("%00", "URL-encoded null byte"),
      c("\u0000", "Null character"),
      c("admin'--", "Login bypass attempt"),
    ],
  },
];

/**
 * A counterstring of exactly `length` characters: each `marker` sits at the position its preceding number
 * names (e.g. "*3*5*7*9*12*"), so where text was cut off shows exactly how many characters were accepted.
 */
export function counterstring(length: number, marker = "*"): string {
  if (length <= 0) return "";
  const parts: string[] = [];
  let pos = length;
  while (pos > 0) {
    const chunk = `${pos}${marker}`;
    if (chunk.length > pos) {
      parts.push(marker.repeat(pos));
      break;
    }
    parts.push(chunk);
    pos -= chunk.length;
  }
  return parts.reverse().join("");
}

/** Show invisible characters so a list of edge cases is readable: ␠ for spaces, \u{…} for controls. */
export function visible(s: string): string {
  if (s === "") return "(empty)";
  return [...s]
    .map((ch) => {
      const cp = ch.codePointAt(0)!;
      if (ch === " ") return "␠";
      if (ch === "\t") return "⇥";
      if (ch === "\n") return "↵";
      if (ch === "\r") return "␍";
      if (cp < 32 || (cp >= 0x7f && cp < 0xa0) || [0xa0, 0xad, 0x200b, 0x200c, 0x200d, 0x2066, 0x2069, 0x202e, 0xfeff, 0x3000].includes(cp) || (cp >= 0xd800 && cp <= 0xdfff)) {
        return `\\u{${cp.toString(16).toUpperCase()}}`;
      }
      return ch;
    })
    .join("");
}

/** Lengths that matter to different systems. */
export function lengths(s: string) {
  return {
    utf16: s.length,
    codePoints: [...s].length,
    utf8: new TextEncoder().encode(s).length,
  };
}
