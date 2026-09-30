// Fails when a page's first-load JavaScript (gzipped) grows past its budget.
// Reads the prerendered HTML in .next, so run it after `npm run build`.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const KB = 1024;
const budgets = {
  "index.html": 190 * KB,
  "tools/svg-animator.html": 315 * KB,
};

const nextDir = path.resolve(".next");
let failed = false;

for (const [page, budget] of Object.entries(budgets)) {
  const html = await readFile(path.join(nextDir, "server/app", page), "utf8");
  const chunks = new Set(html.match(/\/_next\/static\/chunks\/[^"?]+\.js/g) ?? []);
  let total = 0;
  for (const chunk of chunks) {
    const file = path.join(nextDir, chunk.replace("/_next/", ""));
    total += gzipSync(await readFile(file)).length;
  }
  const ok = total <= budget;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${page}: ${(total / KB).toFixed(1)} KB gzipped JS (budget ${budget / KB} KB)`);
}

process.exit(failed ? 1 : 0);
