/**
 * Small files that upload forms, parsers and virus scanners commonly mishandle. Every file is harmless:
 * the "security" ones only check that your app sanitises names, paths and markup.
 */
import { zipSync } from "fflate";
import { pdfFile } from "./documents";
import { encodePng, patternPixels, pixelFloodPng } from "./images";
import { ascii, concat } from "./parts";

export interface EdgeFile {
  id: string;
  name: string;
  label: string;
  description: string;
  group: "Broken" | "Mismatched" | "Names" | "Security" | "Encoding";
  build: () => Promise<Uint8Array>;
}

const png = (w = 64, h = 64) => encodePng(patternPixels("gradient", w, h), w, h);
const text = (s: string) => ascii(s);
const smallPdf = () => pdfFile({ pages: 1, pageSize: "a4", label: "Test PDF" }, 4000).catch(() => pdfFile({ pages: 1, pageSize: "a4", label: "Test PDF" }, 8000));

export const edgeFiles: EdgeFile[] = [
  { id: "empty-txt", name: "empty.txt", label: "Empty file (0 bytes)", description: "Zero-byte text file.", group: "Broken", build: async () => new Uint8Array() },
  { id: "empty-pdf", name: "empty.pdf", label: "Empty PDF (0 bytes)", description: "Has a .pdf name but no content at all.", group: "Broken", build: async () => new Uint8Array() },
  { id: "empty-png", name: "empty.png", label: "Empty image (0 bytes)", description: "Has a .png name but no content at all.", group: "Broken", build: async () => new Uint8Array() },
  {
    id: "truncated-png",
    name: "truncated.png",
    label: "Truncated PNG",
    description: "A valid PNG cut off halfway, like an interrupted upload.",
    group: "Broken",
    build: async () => {
      const p = png(256, 256);
      return p.slice(0, Math.floor(p.length / 2));
    },
  },
  {
    id: "truncated-pdf",
    name: "truncated.pdf",
    label: "Truncated PDF",
    description: "A PDF missing its second half, including the cross-reference table and %%EOF.",
    group: "Broken",
    build: async () => {
      const p = await smallPdf();
      return p.slice(0, Math.floor(p.length / 2));
    },
  },
  {
    id: "corrupt-header",
    name: "corrupt-header.png",
    label: "Corrupt PNG header",
    description: "A full PNG whose 8-byte signature has been zeroed.",
    group: "Broken",
    build: async () => {
      const p = png();
      p.fill(0, 0, 8);
      return p;
    },
  },
  {
    id: "png-as-jpg",
    name: "photo.jpg",
    label: "PNG named .jpg",
    description: "PNG content with a .jpg extension: tests content sniffing versus trusting the name.",
    group: "Mismatched",
    build: async () => png(),
  },
  {
    id: "text-as-png",
    name: "not-an-image.png",
    label: "Text file named .png",
    description: "Plain text with an image extension.",
    group: "Mismatched",
    build: async () => text("This is a plain text file, not an image.\n"),
  },
  {
    id: "pdf-as-docx",
    name: "report.docx",
    label: "PDF named .docx",
    description: "A real PDF with a Word extension.",
    group: "Mismatched",
    build: smallPdf,
  },
  {
    id: "double-ext",
    name: "invoice.pdf.exe",
    label: "Double extension",
    description: "Harmless text named like a disguised program; uploads should reject or rename it.",
    group: "Mismatched",
    build: async () => text("Harmless test file. Upload filters should not trust the first extension.\n"),
  },
  { id: "no-ext", name: "README", label: "No extension", description: "A text file without any extension.", group: "Mismatched", build: async () => text("A file without an extension.\n") },
  { id: "upper-ext", name: "PHOTO.PNG", label: "Upper-case extension", description: "Extension checks are often case-sensitive by mistake.", group: "Names", build: async () => png() },
  { id: "unicode-name", name: "测试-тест-ñandú-🙂.png", label: "Unicode & emoji name", description: "Chinese, Cyrillic, accents and an emoji in the file name.", group: "Names", build: async () => png() },
  {
    id: "long-name",
    name: `${"long-file-name-".repeat(17).slice(0, 251)}.png`,
    label: "255-character name",
    description: "The longest name most file systems allow.",
    group: "Names",
    build: async () => png(),
  },
  { id: "special-name", name: "my file (1) #final & v2 [copy]; 'test'.png", label: "Spaces & symbols", description: "Spaces, brackets, quotes, # and & in the name.", group: "Names", build: async () => png() },
  { id: "dot-name", name: ".hidden.png", label: "Leading dot", description: "Hidden on macOS and Linux; some apps drop it.", group: "Names", build: async () => png() },
  {
    id: "pixel-flood",
    name: "pixel-flood-50000x50000.png",
    label: "Pixel flood PNG (50000×50000)",
    description: "A few hundred KB on disk but 7.5 GB or more once decoded. Servers should check dimensions before decoding.",
    group: "Security",
    build: async () => pixelFloodPng(50_000, 50_000),
  },
  {
    id: "svg-script",
    name: "script.svg",
    label: "SVG with a script",
    description: "An SVG containing <script>alert(1)</script>. Uploaded SVGs must be sanitised or served as attachments.",
    group: "Security",
    build: async () =>
      text(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#4f8cdc"/><script>alert("SVG script ran")</script><text x="20" y="55" fill="#fff">SVG test</text></svg>\n',
      ),
  },
  {
    id: "zip-slip",
    name: "zip-slip.zip",
    label: "ZIP with ../ path",
    description: "Contains an entry named ../../evil.txt. Extractors must not write outside the target folder.",
    group: "Security",
    build: async () => zipSync({ "../../evil.txt": text("If you can read this outside the extraction folder, the extractor is vulnerable.\n"), "ok.txt": text("Normal file\n") }),
  },
  {
    id: "csv-formula",
    name: "formulas.csv",
    label: "CSV with formulas",
    description: "Cells starting with =, +, - and @ that spreadsheets would execute when the export is opened.",
    group: "Security",
    build: async () => text('name,note\r\nAlice,=1+1\r\nBob,"=HYPERLINK(""http://example.com"",""click"")"\r\nCarol,+SUM(1;2)\r\nDan,@cmd\r\n'),
  },
  {
    id: "utf16-csv",
    name: "utf16.csv",
    label: "UTF-16 CSV",
    description: "UTF-16 LE with a byte-order mark, as Excel's 'Unicode text' export produces.",
    group: "Encoding",
    build: async () => {
      const s = "﻿name,city\r\nJosé,São Paulo\r\n李雷,北京\r\n";
      const out = new Uint8Array(s.length * 2);
      for (let i = 0; i < s.length; i++) {
        out[i * 2] = s.charCodeAt(i) & 255;
        out[i * 2 + 1] = s.charCodeAt(i) >>> 8;
      }
      return out;
    },
  },
  {
    id: "latin1-csv",
    name: "latin1.csv",
    label: "Latin-1 CSV",
    description: "Windows-1252 bytes (not UTF-8): accented letters turn into mojibake if decoded wrongly.",
    group: "Encoding",
    build: async () => Uint8Array.from("name,city\r\nJos\xe9,M\xfcnchen\r\nFran\xe7ois,Orl\xe9ans\r\n", (c) => c.charCodeAt(0)),
  },
  {
    id: "bom-json",
    name: "bom.json",
    label: "JSON with a BOM",
    description: "Valid JSON preceded by a UTF-8 byte-order mark, which strict parsers reject.",
    group: "Encoding",
    build: async () => concat([new Uint8Array([0xef, 0xbb, 0xbf]), text('{"ok":true}\n')]),
  },
  {
    id: "crlf-mixed",
    name: "mixed-line-endings.txt",
    label: "Mixed line endings",
    description: "Windows (CRLF), Unix (LF) and old Mac (CR) line breaks in one file.",
    group: "Encoding",
    build: async () => text("line 1 (CRLF)\r\nline 2 (LF)\nline 3 (CR)\rline 4\n"),
  },
];
