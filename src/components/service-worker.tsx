"use client";

import { useEffect } from "react";

/** Registers /sw.js (production only) so the site can be installed and used offline. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const reg = await navigator.serviceWorker.ready;
        // This page loaded before the worker could cache anything, so hand over the files it used.
        const urls = performance.getEntriesByType("resource").map((e) => e.name);
        reg.active?.postMessage({ type: "cache-urls", page: location.pathname, urls });
      } catch {
        // Offline support is a bonus; the site works without it.
      }
    };
    // Wait for the page to finish loading so caching never competes with it for bandwidth.
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", () => void register(), { once: true });
  }, []);
  return null;
}
