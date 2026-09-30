# Vartula

A collection of free design tools that run entirely in the browser. The first tool is the
**SVG Animator**: upload an SVG, tune a line-drawing animation, and export it as CSS, SMIL,
React, vanilla JavaScript, GSAP, MP4, WebM, GIF or a PNG sequence.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build
npm start            # serve the production build
npm test             # Vitest unit and snapshot tests
npm run test:e2e     # Playwright tests (builds and starts the app on port 3100)
npm run lint
npm run typecheck
```

Before the first e2e run, install the browser once: `npx playwright install chromium`.

The site is live at https://www.vartula.net (deployed by Vercel from `main`). Canonical URLs,
the sitemap, llms.txt and Open Graph images use that domain by default; set `NEXT_PUBLIC_SITE_URL`
to override it. Requests to vartula.vercel.app and the bare vartula.net domain redirect there.

## How the SVG Animator works

`src/tools/svg-animator/engine/` is a pure TypeScript animation engine and the single source
of truth:

- `parseSvg(markup)` returns the viewBox, size and every drawable element with its length.
- `getFrameState(config, model, timeMs)` returns each element's `stroke-dasharray`,
  `stroke-dashoffset` and `fill-opacity` at that moment.
- `totalDuration(config, model)` returns the length of one pass.

The live preview applies `getFrameState` in a `requestAnimationFrame` loop. Code exporters
render a keyframe plan derived from the same functions (tests check that plan against
`getFrameState`). Video, GIF and PNG export rasterize `getFrameState` frames with
`renderFrame`.

See [AGENTS.md](AGENTS.md) for the project structure and conventions.
