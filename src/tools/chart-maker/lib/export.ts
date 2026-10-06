/** Browser-only helpers for saving a rendered chart. Loaded on first export. */

export type ExportFormat = "svg" | "png" | "jpg";

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart";
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Draw the SVG onto a canvas at `scale`. JPG gets a white backdrop because it has no transparency. */
async function rasterize(svg: string, width: number, height: number, scale: number, type: "image/png" | "image/jpeg"): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    if (type === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The image is too large to export."))), type, 0.92),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportChart(
  svg: string,
  { format, name, width, height, scale }: { format: ExportFormat; name: string; width: number; height: number; scale: number },
) {
  const base = slugify(name);
  if (format === "svg") {
    save(new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg}`], { type: "image/svg+xml" }), `${base}.svg`);
    return;
  }
  const type = format === "png" ? "image/png" : "image/jpeg";
  save(await rasterize(svg, width, height, scale, type), `${base}.${format}`);
}
