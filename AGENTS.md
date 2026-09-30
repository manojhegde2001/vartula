<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Vartula

Vartula is a multi-tool website (Next.js App Router, TypeScript, Tailwind v4, shadcn/ui on Base UI).
Every tool runs fully client-side; nothing is uploaded to a server.

## Rules

- **Every tool lives in `src/tools/<slug>/`.** Nothing tool-specific goes anywhere else
  except its one-line entries in `src/tools/registry.ts` and `src/tools/components.tsx`.
- `src/tools/registry.ts` is the single list of tools (`{ slug, name, description, category, icon, updated, seoTitle? }`).
  Bump a tool's `updated` date when it changes meaningfully (it feeds the sitemap and JSON-LD).
  The home page, `/tools/[slug]`, `sitemap.ts`, `robots.ts` and per-tool metadata all read from it.
  Keep it free of React and browser imports.
- Pure logic (no React, no DOM rendering) goes in the tool's `engine/` folder and gets Vitest tests.
- Heavy, rarely used code (exporters, encoders, syntax highlighting) must be loaded with dynamic `import()`
  so the initial tool bundle stays small.
- SVG Animator: the engine is the single source of truth. The preview, code exporters and
  video export must all derive values from `getFrameState` / `buildPlan`; never re-implement timing.
- Run `npm run build`, `npm run size`, `npm run lint` and `npm test` before committing.
- The home page must not load Base UI: use native elements (with `buttonVariants` from `ui/button-variants`)
  in site chrome and render cards on the server. `npm run size` enforces the first-load JS budgets.

## Structure

```
src/
  app/                    routes: home, /tools/[slug], sitemap, robots, manifest, icons, 404, OG images
  components/             site chrome (header, footer, tool grid, theme) and components/ui (shadcn)
  lib/                    site config and shared utilities
  tools/
    registry.ts           tool metadata — the source of truth
    components.tsx        slug -> server component that renders the tool page
    svg-animator/
      tool-page.tsx       server component: editor + SEO copy + FAQ (+ FAQPage JSON-LD)
      content.ts          FAQ and how-to copy
      samples.ts          built-in sample SVGs
      store.ts            Zustand store (config + loaded SVG)
      engine/             pure TS animation engine: parseSvg, getFrameState, totalDuration, easing
        exporters/        toCss, toSmil, toReact, toVanillaJs, toGsap (all render plan.ts)
      lib/                browser helpers: DOMPurify sanitizing, Shiki highlighting, share hash
      components/         client React UI for the editor
      export/             browser-only renderFrame + MP4/WebM/GIF/PNG encoders (lazy-loaded)
e2e/                      Playwright smoke and integration tests
```

## Adding a tool

1. Create `src/tools/<slug>/tool-page.tsx` (plus `engine/`, `components/` as needed).
2. Add an entry to `tools` in `src/tools/registry.ts` (add an icon to `src/components/tool-icon.tsx` if new).
3. Map the slug in `src/tools/components.tsx`.
4. The home grid, route, sitemap, robots and metadata pick it up automatically.

## Commands

- `npm run dev` — dev server on http://localhost:3000
- `npm run build` — production build
- `npm test` — Vitest unit and snapshot tests
- `npm run test:e2e` — Playwright smoke tests (builds and starts the app)
- `npm run size` — first-load JS budget check (run after `npm run build`)
- `npm run lint`, `npm run typecheck`
