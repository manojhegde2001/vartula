/**
 * PDF writing with pdf-lib: assemble pages from several files, split, restructure and stamp images.
 * Pure JavaScript with no DOM, so it runs in tests; the UI loads it with dynamic import().
 */
import { degrees, EncryptedPDFError, PDFDocument } from "pdf-lib";
import { normalizeRotation, toPdfPlacement, type ViewBox } from "./placement";

export class PdfError extends Error {}

const PRODUCER = "Vartula PDF Toolkit (vartula.net)";

/** Open a PDF, turning pdf-lib's errors into messages a person can act on. */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (err) {
    if (err instanceof EncryptedPDFError) {
      throw new PdfError("This PDF is password-protected or encrypted. Remove the protection in a PDF reader first.");
    }
    throw new PdfError("This file isn't a valid PDF, or it is damaged.");
  }
}

async function save(doc: PDFDocument): Promise<Uint8Array> {
  doc.setProducer(PRODUCER);
  doc.setCreator(PRODUCER);
  return doc.save({ useObjectStreams: true });
}

/** Number of pages, or a PdfError for encrypted and broken files. */
export async function countPages(bytes: Uint8Array): Promise<number> {
  return (await loadPdf(bytes)).getPageCount();
}

export interface PageRef {
  fileId: string;
  /** 0-based page index in that file. */
  index: number;
  /** Extra clockwise rotation added on top of the page's own. */
  rotation?: number;
}

/** Build a new PDF from pages of one or more files, in the given order. */
export async function assemble(sources: Record<string, Uint8Array>, pages: PageRef[]): Promise<Uint8Array> {
  if (pages.length === 0) throw new PdfError("There are no pages to save.");
  const out = await PDFDocument.create();
  const loaded = new Map<string, PDFDocument>();
  for (const ref of pages) {
    let src = loaded.get(ref.fileId);
    if (!src) {
      const bytes = sources[ref.fileId];
      if (!bytes) throw new PdfError("A page refers to a file that was removed.");
      src = await loadPdf(bytes);
      loaded.set(ref.fileId, src);
    }
    const [page] = await out.copyPages(src, [ref.index]);
    if (ref.rotation) page.setRotation(degrees(normalizeRotation(page.getRotation().angle + ref.rotation)));
    out.addPage(page);
  }
  // Keep the first file's title so the merged document still has a name.
  const title = loaded.values().next().value?.getTitle();
  if (title) out.setTitle(title);
  return save(out);
}

/** One new PDF per group of 0-based page indices. */
export async function split(bytes: Uint8Array, groups: number[][]): Promise<Uint8Array[]> {
  const src = await loadPdf(bytes);
  const results: Uint8Array[] = [];
  for (const group of groups) {
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, group);
    for (const p of pages) out.addPage(p);
    results.push(await save(out));
  }
  return results;
}

/**
 * Lossless size reduction: copy every page into a fresh document, which drops unreferenced objects and
 * old revisions, then write it with compressed object streams. Form fields and bookmarks are not kept.
 */
export async function restructure(bytes: Uint8Array): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  for (const p of pages) out.addPage(p);
  const title = src.getTitle();
  if (title) out.setTitle(title);
  return save(out);
}

/** A rendered page for image-based compression: JPEG bytes and the displayed page size in points. */
export interface PageImage {
  jpeg: Uint8Array;
  width: number;
  height: number;
}

/** Rebuild a PDF from page images (strong compression; text is no longer selectable). */
export async function fromImages(images: PageImage[], title?: string): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const img of images) {
    const embedded = await out.embedJpg(img.jpeg);
    const page = out.addPage([img.width, img.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: img.width, height: img.height });
  }
  if (title) out.setTitle(title);
  return save(out);
}

export interface Stamp {
  pageIndex: number;
  /** PNG bytes; identical arrays are embedded once. */
  png: Uint8Array;
  box: ViewBox;
}

/** Draw signature images onto pages, keeping everything else in the document as it was. */
export async function stamp(bytes: Uint8Array, stamps: Stamp[]): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const embedded = new Map<Uint8Array, Awaited<ReturnType<PDFDocument["embedPng"]>>>();
  const pages = doc.getPages();
  for (const s of stamps) {
    const page = pages[s.pageIndex];
    if (!page) throw new PdfError(`Page ${s.pageIndex + 1} doesn't exist.`);
    let image = embedded.get(s.png);
    if (!image) {
      image = await doc.embedPng(s.png);
      embedded.set(s.png, image);
    }
    const p = toPdfPlacement(s.box, page.getCropBox(), normalizeRotation(page.getRotation().angle));
    page.drawImage(image, { x: p.x, y: p.y, width: p.width, height: p.height, rotate: degrees(p.rotate) });
  }
  doc.setModificationDate(new Date());
  return doc.save({ useObjectStreams: true });
}
