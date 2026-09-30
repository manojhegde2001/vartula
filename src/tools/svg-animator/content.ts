import type { ToolContent } from "@/lib/tool-content";

/** Server-rendered copy for the SVG Animator page, also served as Markdown to AI agents. */
export const content: ToolContent = {
  summaryTitle: "A line-drawing animator that runs in your browser",
  summary: [
    "The SVG Animator turns logos, icons, signatures and illustrations into the popular “self-drawing” effect. Strokes are traced with `stroke-dashoffset` and fills fade in afterwards, each with its own duration, delay, per-shape stagger, easing curve and direction.",
    "One animation engine drives the live preview and every export, so the CSS, SMIL, React, vanilla JavaScript and GSAP code, and the MP4, WebM, GIF and PNG renders, all match what you see. Nothing is uploaded: your SVG is sanitized and processed locally.",
  ],
  howToTitle: "How to animate an SVG",
  howTo: [
    "Upload an SVG, drag it onto the preview, paste the markup, or start from a sample.",
    "Pick a style preset such as Draw + fill, Handwritten or Pulse loop, then fine-tune the speed and each duration. The timing button beside each of them opens delay, stagger, easing and direction.",
    "Choose Once to play a single time or Loop to repeat forever, and set a background color.",
    "Use Export to copy CSS, SMIL, React, JavaScript or GSAP code, or to render a video, GIF or PNG sequence.",
  ],
  features: {
    title: "Export formats",
    items: [
      { name: "CSS", description: "Pure CSS keyframes, the lightest option for websites. Pair it with the exported SVG markup." },
      { name: "SMIL", description: "A single self-contained SVG file that animates anywhere SVG is shown, even in an `<img>` tag." },
      { name: "React", description: "A drop-in React component (TypeScript) with the SVG inlined." },
      { name: "JavaScript", description: "Vanilla JavaScript using the Web Animations API, for controlling playback from code." },
      { name: "GSAP", description: "A GSAP 3 timeline, for sites that already use GSAP." },
      { name: "MP4", description: "H.264 video with the best compatibility, for social media and slides." },
      { name: "WebM", description: "Smaller video that supports transparency." },
      { name: "GIF", description: "Plays everywhere, limited to 256 colors, supports transparency." },
      { name: "PNG sequence", description: "Lossless transparent frames in a .zip, for video editors." },
    ],
  },
  faq: [
    {
      question: "How does the SVG line-drawing animation work?",
      answer:
        "Each shape's outline is turned into a single dash as long as the shape itself. Animating stroke-dashoffset from the full length to zero slides that dash into view, so the line appears to draw itself. Vartula measures every path, line, polyline, polygon, circle, ellipse and rect for you.",
    },
    {
      question: "Is my SVG uploaded anywhere?",
      answer:
        "No. Parsing, previewing and every export — CSS, JavaScript, MP4, GIF and PNG — happen entirely in your browser. Your file never leaves your device.",
    },
    {
      question: "What is the difference between Once and Loop?",
      answer:
        "Once plays a single time and holds the final frame, which suits logos that draw in on page load or when scrolled into view. Loop repeats forever; combine it with the Alternate direction, as the Pulse loop preset does, to draw in and out continuously.",
    },
    {
      question: "Why doesn't my text animate?",
      answer:
        "Only shapes with outlines can be drawn. Convert text to paths in your design tool (in Figma: Outline stroke / Flatten; in Illustrator: Create Outlines; in Inkscape: Object to Path) and upload the SVG again.",
    },
    {
      question: "Which export format should I use?",
      answer:
        "Use CSS for the lightest result on websites, SMIL for a single self-contained SVG file, React or vanilla JavaScript when you want to control playback from code, and GSAP if your site already uses it. For social media or slides, export MP4, WebM or GIF.",
    },
    {
      question: "Which browsers support video export?",
      answer:
        "MP4 and WebM use the WebCodecs API, available in current Chrome, Edge, Safari and Firefox. Older browsers fall back to recording WebM in real time. GIF and PNG export work in every modern browser.",
    },
  ],
};
