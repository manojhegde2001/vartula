import type { ToolContent } from "@/lib/tool-content";

/** Server-rendered copy for the Image Converter page, also served as Markdown to AI agents. */
export const content: ToolContent = {
  summaryTitle: "Convert and compress images without uploading them",
  summary: [
    "The Image Converter turns HEIC photos from iPhones into JPG, saves PNG, JPG, WebP and AVIF in any of those formats, resizes them and compresses them to a size you choose. Drop one picture or a whole folder: every image is converted on your device and can be downloaded on its own or together as a ZIP.",
    "Need a photo under 100 KB for an application form or exam portal? Pick a target size and the converter finds the highest quality that fits, shrinking the dimensions only if lowering the quality isn't enough. Converted files carry no EXIF metadata, so the camera model and GPS location are stripped as well.",
  ],
  howToTitle: "How to convert or compress an image",
  howTo: [
    "Drop images onto the page, choose them from your device, or paste a screenshot with Ctrl+V (⌘V on a Mac). HEIC, JPG, PNG, WebP, AVIF, GIF, BMP and SVG files all work.",
    "Choose the output format: JPG for photos that must open everywhere, PNG for screenshots and transparency, WebP or AVIF for the smallest files on the web.",
    "Optionally set a quality, a target file size such as 50 KB or 100 KB, and a new size: a percentage, a box to fit inside, or exact pixel dimensions.",
    "Check the new size of each image, then download them one at a time or all at once as a ZIP.",
  ],
  features: {
    title: "What it can do",
    items: [
      { name: "HEIC to JPG", description: "Open iPhone photos (HEIC/HEIF) on any computer, converted in the browser with no app to install." },
      { name: "Format conversion", description: "Convert between JPG, PNG, WebP and AVIF, in any direction. Transparent areas become a background colour you pick when saving to JPG." },
      { name: "Compress to a target size", description: "Get any image under 20 KB, 50 KB, 100 KB, 200 KB or a size you type, for forms and upload limits." },
      { name: "Resize", description: "Scale by percentage, fit inside a maximum width and height, or set exact dimensions with a centre crop." },
      { name: "Batch processing", description: "Convert dozens of images with the same settings and download them as a single ZIP file." },
      { name: "Strip metadata", description: "Every output is re-encoded without EXIF, so location, camera and date tags are removed." },
    ],
  },
  faq: [
    {
      question: "Are my photos uploaded to a server?",
      answer:
        "No. Decoding, resizing and compression all happen in your browser, and the files never leave your device. That makes it safe for ID documents, passport photos and private pictures, and it works offline once the page has loaded.",
    },
    {
      question: "How do I convert HEIC to JPG?",
      answer:
        "Drop your .heic files on the page and leave the format set to JPG. Safari decodes HEIC natively; in Chrome, Edge and Firefox the converter loads a HEIC decoder the first time you add a HEIC file, then converts everything locally.",
    },
    {
      question: "How do I compress an image to 100 KB or 50 KB?",
      answer:
        "Pick a preset under Target file size or type your own limit in KB. The converter searches for the highest quality that stays under the limit and, if even low quality is too big, reduces the dimensions until it fits. Sizes use 1 KB = 1000 bytes, so the result is under the limit however a website counts kilobytes.",
    },
    {
      question: "Which format should I choose?",
      answer:
        "Use JPG for photos that need to open everywhere and for most upload forms. Use PNG for screenshots, logos and anything with transparency. WebP and AVIF give much smaller files at the same quality and are supported by all modern browsers, but some older software can't open them.",
    },
    {
      question: "Why can't I select WebP or AVIF?",
      answer:
        "Saving uses your browser's built-in image encoders. Safari can't save WebP, and only some browsers can save AVIF; unavailable formats are greyed out. Chrome and Edge support the most formats.",
    },
    {
      question: "Does it keep EXIF data and the photo's orientation?",
      answer:
        "Orientation is applied, so phone photos come out the right way up. All other metadata, including GPS location, camera model and capture date, is removed from the converted file.",
    },
  ],
};
