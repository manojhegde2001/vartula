import { expect, test } from "@playwright/test";

test("home page has a canonical URL and site structured data", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
  const graph = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) => els.flatMap((el) => JSON.parse(el.textContent ?? "{}")["@graph"] ?? []));
  expect(graph.map((node: { "@type": string }) => node["@type"])).toEqual(["Organization", "WebSite", "ItemList"]);
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("content", /#/);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
});

test("manifest and icons are served", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).short_name).toBe("Vartula");
  for (const icon of ["/icon.svg", "/apple-icon"]) expect((await request.get(icon)).ok()).toBe(true);
});

test("unknown pages return a 404 with links to the tools", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "SVG Animator" }).last()).toBeVisible();
  const robots = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((el) => el.getAttribute("content")));
  expect(robots.length).toBeGreaterThan(0);
  for (const content of robots) expect(content).toContain("noindex");
});
