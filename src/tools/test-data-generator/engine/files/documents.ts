/**
 * PDF, DOCX and XLSX files of an exact size. These are built in memory (pdf-lib, fflate) with real content,
 * then padded: an unused stream object in the PDF, an XML comment inside the Office package. Office files
 * are stored without compression, so every padding byte adds exactly one byte to the file.
 */
import { zipSync, type Zippable } from "fflate";
import { PDFDocument, PDFName, StandardFonts, rgb } from "pdf-lib";
import { SizeError } from "./parts";

/** Office and PDF files are assembled in memory; keep them within what a browser tab handles comfortably. */
export const MAX_IN_MEMORY = 300 * 1024 * 1024;

const FIXED_DATE = new Date(Date.UTC(2026, 0, 1));
const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet.";

function checkLimit(target: number) {
  if (target > MAX_IN_MEMORY) throw new SizeError(`This file type is built in memory, so it is limited to ${MAX_IN_MEMORY / 1024 / 1024} MB.`);
}

// ---- PDF ----

export const pageSizes = { a4: [595.28, 841.89], letter: [612, 792] } as const;

export interface PdfOptions {
  pages: number;
  pageSize: keyof typeof pageSizes;
  label: string;
}

async function buildPdf(o: PdfOptions, pad: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(o.label);
  doc.setProducer("Vartula Test Data Generator");
  doc.setCreator("Vartula Test Data Generator");
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [w, h] = pageSizes[o.pageSize];
  for (let i = 0; i < o.pages; i++) {
    const page = doc.addPage([w, h]);
    page.drawRectangle({ x: 0, y: h - 90, width: w, height: 90, color: rgb(0.31, 0.55, 0.86) });
    page.drawText(o.label, { x: 48, y: h - 58, size: 22, font: bold, color: rgb(1, 1, 1) });
    page.drawText(`Page ${i + 1} of ${o.pages}`, { x: 48, y: h - 130, size: 14, font: bold });
    for (let l = 0; l < 24; l++) page.drawText(LOREM.slice(0, 80 + ((l * 7) % 20)), { x: 48, y: h - 170 - l * 22, size: 11, font });
    page.drawText("Generated test file · vartula.net", { x: 48, y: 40, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
  }
  if (pad > 0) {
    // An unreferenced-by-pages stream: readers ignore it, but it is part of the file's object table.
    const ref = doc.context.register(doc.context.stream(new Uint8Array(pad).fill(0x20)));
    doc.catalog.set(PDFName.of("VartulaPadding"), ref);
  }
  return doc.save({ useObjectStreams: false });
}

/** Smallest valid size for these options. */
export async function pdfMinSize(o: PdfOptions): Promise<number> {
  return (await buildPdf(o, 0)).length;
}

export async function pdfFile(o: PdfOptions, target: number): Promise<Uint8Array> {
  checkLimit(target);
  const base = await buildPdf(o, 0);
  if (target === base.length) return base;
  // Adding the padding object has a fixed cost (object header, xref entry, catalog key), so probe it once.
  const probe = await buildPdf(o, 1);
  const overhead = probe.length - base.length - 1;
  if (target < base.length + overhead + 1) {
    throw new SizeError(`A ${o.pages}-page PDF needs at least ${base.length + overhead + 1} bytes (or exactly ${base.length}). Use fewer pages or a larger size.`, base.length);
  }
  // The /Length value and offsets grow by a digit now and then, so settle the last few bytes iteratively.
  let pad = target - base.length - overhead;
  for (let i = 0; i < 8; i++) {
    const out = await buildPdf(o, pad);
    if (out.length === target) return out;
    pad += target - out.length;
    if (pad < 1) break;
  }
  throw new SizeError("Couldn't hit that exact PDF size; try a size a few bytes larger.");
}

// ---- Office (DOCX, XLSX) ----

const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const enc = new TextEncoder();

function storedZip(files: Record<string, string>): Uint8Array {
  const entries: Zippable = {};
  for (const [name, text] of Object.entries(files)) entries[name] = [enc.encode(text), { level: 0, mtime: FIXED_DATE }];
  return zipSync(entries);
}

const padding = (n: number) => (n >= 7 ? `<!--${"x".repeat(n - 7)}-->` : " ".repeat(n));

interface OfficeLayout {
  /** Files besides the one that carries content and padding. */
  fixed: Record<string, string>;
  main: string;
  open: string;
  close: string;
  /** One unit of repeated content (index-dependent). */
  unit: (i: number) => string;
}

const docxLayout: OfficeLayout = {
  fixed: {
    "[Content_Types].xml": `${XML_DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels": `${XML_DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  },
  main: "word/document.xml",
  open: '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>Test document</w:t></w:r></w:p>',
  close: "<w:sectPr/></w:body></w:document>",
  unit: (i) => `<w:p><w:r><w:t xml:space="preserve">${i + 1}. ${LOREM}</w:t></w:r></w:p>`,
};

const xlsxLayout: OfficeLayout = {
  fixed: {
    "[Content_Types].xml": `${XML_DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `${XML_DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `${XML_DECL}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `${XML_DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
  },
  main: "xl/worksheets/sheet1.xml",
  open: '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>id</t></is></c><c r="B1" t="inlineStr"><is><t>name</t></is></c><c r="C1" t="inlineStr"><is><t>amount</t></is></c></row>',
  close: "</sheetData></worksheet>",
  unit: (i) => `<row r="${i + 2}"><c r="A${i + 2}"><v>${i + 1}</v></c><c r="B${i + 2}" t="inlineStr"><is><t>Item ${i + 1}</t></is></c><c r="C${i + 2}"><v>${((i * 37) % 1000) + 0.5}</v></c></row>`,
};

function officeFile(layout: OfficeLayout, target: number, kind: string): Uint8Array {
  checkLimit(target);
  const build = (body: string, pad: number) => storedZip({ ...layout.fixed, [layout.main]: XML_DECL + padding(pad) + layout.open + body + layout.close });
  const base = build("", 0).length;
  if (target < base) throw new SizeError(`A valid ${kind} needs at least ${base} bytes.`, base);
  // Real content first (paragraphs or rows); whatever is left (less than one unit) becomes padding.
  let room = target - base;
  const parts: string[] = [];
  for (let i = 0; ; i++) {
    const u = layout.unit(i);
    if (u.length > room) break;
    parts.push(u);
    room -= u.length;
  }
  const out = build(parts.join(""), room);
  if (out.length !== target) throw new SizeError(`Couldn't hit that exact ${kind} size.`);
  return out;
}

export const docxFile = (target: number) => officeFile(docxLayout, target, "DOCX file");
export const xlsxFile = (target: number) => officeFile(xlsxLayout, target, "XLSX file");
