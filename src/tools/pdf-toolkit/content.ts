import type { ToolContent } from "@/lib/tool-content";

/** Server-rendered copy for the PDF Toolkit page, also served as Markdown to AI agents. */
export const content: ToolContent = {
  summaryTitle: "Private PDF tools that run in your browser",
  summary: [
    "The PDF Toolkit merges, splits, reorders, rotates, compresses and signs PDF files without sending them anywhere. Most online PDF sites upload your documents to their servers; here every page is read and written by your own browser, so contracts, bank statements, tax forms and ID scans stay on your device.",
    "Load one or more PDFs once and switch between tools: merge a stack of files, split out a chapter, drop a blank page, turn a sideways scan upright, shrink an attachment for email, then sign the result. It is free, has no page limits or watermarks, and needs no account.",
  ],
  howToTitle: "How to merge, split, compress or sign a PDF",
  howTo: [
    "Choose a tool at the top: Merge, Split, Organize, Compress or Sign. You can link straight to one, for example /tools/pdf-toolkit#sign.",
    "Drop your PDF files onto the page or click to choose them. Thumbnails of every page appear as soon as each file is read.",
    "Arrange the result: drag files or pages into order, enter page ranges such as 1-3, 8-, rotate or delete pages, pick a compression level, or draw your signature and click where it should go.",
    "Download the new PDF. Splits that create several files download together as a ZIP.",
  ],
  features: {
    title: "Tools",
    items: [
      { name: "Merge PDF", description: "Combine any number of PDFs into one document and drag them into the order you want." },
      { name: "Split PDF", description: "Split by custom ranges like `1-3, 4-10`, into single pages, every N pages, or extract only the pages you pick." },
      { name: "Organize pages", description: "Reorder pages by dragging, rotate them left or right, and delete pages you don't need, across several files at once." },
      { name: "Compress PDF", description: "Basic mode repacks the file losslessly and keeps text selectable; Strong mode re-renders pages as JPEG at 72–150 dpi for big savings on scans." },
      { name: "Sign PDF", description: "Draw a signature with a mouse or finger, type it in a handwriting font, or upload a photo, then place, move and resize it on any page." },
    ],
  },
  faq: [
    {
      question: "Are my PDFs uploaded to a server?",
      answer:
        "No. The toolkit uses pdf.js to display pages and pdf-lib to write new files, both running inside your browser. Your documents never leave your device, nothing is stored, and the tools keep working if you go offline after the page has loaded.",
    },
    {
      question: "Is there a file size or page limit?",
      answer:
        "There are no page limits and no watermarks. Each file can be up to 200 MB; the practical limit is your device's memory, so very large scans may be slow on phones.",
    },
    {
      question: "How much can a PDF be compressed?",
      answer:
        "It depends on what is inside. Basic compression removes unused data and packs the file structure, which helps most with files that were edited many times. PDFs made of scanned pages or photos shrink much more with Strong compression, often by 70–90%, but the pages become images, so their text can no longer be selected. If the result isn't smaller, the original is kept.",
    },
    {
      question: "Is a signature added here legally binding?",
      answer:
        "It adds a visible image of your signature to the page, which is what most forms, leases and everyday agreements ask for, and is accepted as an electronic signature in many countries. It is not a certificate-based digital signature; documents that require one need a qualified signing service.",
    },
    {
      question: "Can I open password-protected PDFs?",
      answer:
        "Not yet. Encrypted PDFs must be unlocked first, for example by opening the file in a PDF reader with its password and saving or printing an unprotected copy.",
    },
    {
      question: "Will merging or splitting keep links, bookmarks and forms?",
      answer:
        "Page content, text, images and annotations are kept exactly. Document-level extras such as bookmarks (the outline) and interactive form fields are not carried over to merged, split or compressed files. Signing keeps the whole original document and only adds the signature images.",
    },
  ],
};
