import type { HighlighterCore } from "shiki/core";

export type HighlightLang = "xml" | "css" | "tsx" | "javascript";

let highlighter: Promise<HighlighterCore> | null = null;

/** Lazily create a small Shiki highlighter (JS regex engine, four languages, two themes). */
function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
    ]);
    return createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [import("shiki/dist/themes/github-light.mjs"), import("shiki/dist/themes/github-dark.mjs")],
      langs: [
        import("shiki/dist/langs/xml.mjs"),
        import("shiki/dist/langs/css.mjs"),
        import("shiki/dist/langs/tsx.mjs"),
        import("shiki/dist/langs/javascript.mjs"),
      ],
    });
  })();
  return highlighter;
}

/** Longest input we syntax-highlight; bigger outputs render as plain text. */
export const MAX_HIGHLIGHT_CHARS = 200_000;

export async function highlight(code: string, lang: HighlightLang): Promise<string | null> {
  if (code.length > MAX_HIGHLIGHT_CHARS) return null;
  const h = await getHighlighter();
  return h.codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
}
