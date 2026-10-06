// Light helpers only. pdf.ts pulls in pdf-lib, so the UI imports it on demand with import("./engine/pdf").
export * from "./placement";
export * from "./ranges";

/** Largest PDF accepted, to keep everything within browser memory. */
export const MAX_PDF_BYTES = 200 * 1024 * 1024;
