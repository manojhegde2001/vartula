/**
 * Source of /sw.js, the service worker that lets Vartula open and run offline.
 *
 * - Pages: network first, so online visitors always get the latest HTML; the cached copy (or /offline)
 *   is used when the network fails.
 * - /_next/static/*: cache first. File names are content hashes, so a cached file never goes stale.
 *   This covers chunks, web workers, fonts and the lazily loaded encoders once they've been used.
 * - Icons and the manifest: stale-while-revalidate.
 * - Everything else (analytics, RSC payloads, other origins) goes straight to the network.
 *
 * The home page, the offline page and every tool page are cached with their scripts when the worker
 * installs, so each tool opens offline even if it was never visited. Kept free of React imports.
 */

export interface ServiceWorkerOptions {
  /** Changes on every build, so browsers install the new worker and refresh the precache. */
  version: string;
  /** Pages to cache (with their /_next/static assets) when the worker installs. */
  precache: string[];
  offlinePath: string;
}

/** Most hashed assets kept; the oldest are dropped first, so old builds don't pile up. */
const STATIC_LIMIT = 600;

export function serviceWorkerScript({ version, precache, offlinePath }: ServiceWorkerOptions): string {
  return `// Vartula service worker · ${version}
const VERSION = ${JSON.stringify(version)};
const PRECACHE = ${JSON.stringify(precache)};
const OFFLINE = ${JSON.stringify(offlinePath)};
const PAGES = "vartula-pages";
const STATIC = "vartula-static";
const MISC = "vartula-misc";
const STATIC_LIMIT = ${STATIC_LIMIT};
const ASSET = /\\/_next\\/static\\/[^"'\\s)\\\\]+/g;

const pageKey = (url) => {
  const u = new URL(url, self.location.origin);
  return u.origin + u.pathname;
};

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - STATIC_LIMIT; i++) await cache.delete(keys[i]);
}

/** Cache pages and every /_next/static file their HTML references. */
async function cachePages(paths) {
  const pages = await caches.open(PAGES);
  const statics = await caches.open(STATIC);
  const assets = new Set();
  await Promise.all(
    paths.map(async (path) => {
      try {
        const res = await fetch(path, { cache: "reload", credentials: "same-origin" });
        if (!res.ok) return;
        const html = await res.clone().text();
        await pages.put(pageKey(path), res);
        for (const m of html.matchAll(ASSET)) assets.add(m[0]);
      } catch {}
    }),
  );
  await cacheAssets(statics, assets);
}

async function cacheAssets(statics, urls) {
  await Promise.all(
    [...urls].map(async (url) => {
      try {
        if (await statics.match(url, { ignoreVary: true })) return;
        const res = await fetch(url);
        if (res.ok) await statics.put(url, res);
      } catch {}
    }),
  );
  await trim(statics);
}

self.addEventListener("install", (event) => {
  event.waitUntil(cachePages(PRECACHE).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PAGES, STATIC, MISC];
      for (const key of await caches.keys()) if (key.startsWith("vartula-") && !keep.includes(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// The first page loads before the worker controls it; it sends the files it used so they're cached too.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "cache-urls") return;
  event.waitUntil(
    (async () => {
      const statics = await caches.open(STATIC);
      const own = (data.urls || []).filter((u) => typeof u === "string" && u.startsWith(self.location.origin + "/_next/static/"));
      await cacheAssets(statics, own.map((u) => new URL(u).pathname + new URL(u).search));
      if (typeof data.page === "string" && data.page.startsWith("/")) {
        const pages = await caches.open(PAGES);
        if (!(await pages.match(pageKey(data.page), { ignoreVary: true }))) await cachePages([data.page]);
      }
    })(),
  );
});

async function networkFirst(request) {
  const pages = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res.ok && res.type === "basic") pages.put(pageKey(request.url), res.clone());
    return res;
  } catch {
    return (
      (await pages.match(pageKey(request.url), { ignoreVary: true })) ||
      (await pages.match(pageKey(OFFLINE), { ignoreVary: true })) ||
      new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
    );
  }
}

async function cacheFirst(request) {
  const statics = await caches.open(STATIC);
  const hit = await statics.match(request, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    await statics.put(request, res.clone());
    trim(statics);
  }
  return res;
}

async function staleWhileRevalidate(event) {
  const misc = await caches.open(MISC);
  const hit = await misc.match(event.request, { ignoreVary: true });
  const update = fetch(event.request)
    .then((res) => {
      if (res.ok) misc.put(event.request, res.clone());
      return res;
    })
    .catch(() => hit);
  if (hit) {
    event.waitUntil(update);
    return hit;
  }
  return update;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_vercel/") || url.pathname === "/sw.js") return;
  // Client-side navigation payloads; when offline Next falls back to a full page load, served below.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;
  if (request.mode === "navigate") return event.respondWith(networkFirst(request));
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(cacheFirst(request));
  if (/\\.(png|svg|ico|webmanifest)$/.test(url.pathname)) return event.respondWith(staleWhileRevalidate(event));
});
`;
}
