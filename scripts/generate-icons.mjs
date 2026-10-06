// Regenerates the favicon and app icons from the mark in src/lib/logo.tsx:
// the white mark on a dark rounded tile. Run with `node scripts/generate-icons.mjs` after changing the mark.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const logo = await readFile("src/lib/logo.tsx", "utf8");
const viewBox = logo.match(/markViewBox = "([^"]+)"/)[1];
const path = logo.match(/markPath =\s*"([^"]+)"/)[1];
const [, , markW, markH] = viewBox.split(" ").map(Number);

/** A square tile with the mark centred at `scale` of its width. Small sizes use a bigger mark. */
function tile(scale) {
  const size = 96;
  const w = size * scale;
  const h = (w * markH) / markW;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="22" fill="#0c0d12"/>
  <svg x="${(size - w) / 2}" y="${(size - h) / 2}" width="${w}" height="${h}" viewBox="${viewBox}">
    <path fill="#ffffff" fill-rule="evenodd" d="${path}"/>
  </svg>
</svg>
`;
}

const png = (svg, px) => sharp(Buffer.from(svg), { density: 72 * (px / 96) * 4 }).resize(px, px).png().toBuffer();

/** ICO with embedded PNGs (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ px, data }, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(px >= 256 ? 0 : px, e);
    header.writeUInt8(px >= 256 ? 0 : px, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((img) => img.data)]);
}

/** Maskable icon: full-bleed background (the OS applies its own shape) with the mark inside the 80% safe zone. */
function maskable() {
  const size = 96;
  const w = size * 0.5;
  const h = (w * markH) / markW;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0c0d12"/>
  <svg x="${(size - w) / 2}" y="${(size - h) / 2}" width="${w}" height="${h}" viewBox="${viewBox}">
    <path fill="#ffffff" fill-rule="evenodd" d="${path}"/>
  </svg>
</svg>
`;
}

const large = tile(0.72);
const small = tile(0.84);

await writeFile("src/app/icon.svg", large);
await writeFile("src/app/apple-icon.png", await png(large, 180));
await writeFile("public/icon-192.png", await png(large, 192));
await writeFile("public/icon-512.png", await png(large, 512));
await writeFile("public/icon-maskable-512.png", await png(maskable(), 512));
const favicon = await Promise.all([16, 32, 48].map(async (px) => ({ px, data: await png(small, px) })));
await writeFile("src/app/favicon.ico", ico(favicon));
console.log("Wrote icon.svg, favicon.ico, apple-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png");
