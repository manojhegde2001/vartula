import { describe, expect, it } from "vitest";
import { GET } from "@/app/sw.js/route";
import { serviceWorkerScript } from "./service-worker";

describe("service worker", () => {
  const script = serviceWorkerScript({ version: "test-1", precache: ["/", "/offline", "/tools/a"], offlinePath: "/offline" });

  it("is valid JavaScript", () => {
    expect(() => new Function(script)).not.toThrow();
  });

  it("bakes in the version, precache list and offline page", () => {
    expect(script).toContain('const VERSION = "test-1";');
    expect(script).toContain('const PRECACHE = ["/","/offline","/tools/a"];');
    expect(script).toContain('const OFFLINE = "/offline";');
  });

  it("finds hashed assets in page HTML", () => {
    const pattern = new Function(`${script.match(/const ASSET = .*;/)![0]} return ASSET;`)() as RegExp;
    const html = `<script src="/_next/static/chunks/abc123.js" async></script><link href="/_next/static/media/font.woff2" rel="preload"/><img src="/icon.svg">`;
    expect([...html.matchAll(pattern)].map((m) => m[0])).toEqual(["/_next/static/chunks/abc123.js", "/_next/static/media/font.woff2"]);
  });

  it("is served from /sw.js with every tool precached", async () => {
    const res = GET();
    expect(res.headers.get("Content-Type")).toMatch(/javascript/);
    expect(res.headers.get("Cache-Control")).toMatch(/no-cache/);
    const body = await res.text();
    expect(body).toContain('"/tools/svg-animator"');
    expect(body).toContain('"/offline"');
  });
});
