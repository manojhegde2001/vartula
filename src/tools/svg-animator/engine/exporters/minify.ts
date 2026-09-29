/**
 * Minifiers for the code this tool generates. They are not general-purpose:
 * they rely on the exporters' templates (no block comments inside strings,
 * every statement terminated, comments on their own lines).
 */

export function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

export function minifyMarkup(markup: string): string {
  return markup
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function minifyJs(code: string): string {
  const lines = code
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"));
  const ident = /[\w$]/;
  let out = "";
  for (const line of lines) {
    if (out && ident.test(out[out.length - 1]) && ident.test(line[0])) out += " ";
    out += line;
  }
  return out;
}
