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
  for (const icon of ["/icon.svg", "/favicon.ico", "/apple-icon.png", "/icon-192.png", "/icon-512.png"]) expect((await request.get(icon)).ok()).toBe(true);
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

test("AI agents get llms.txt, llms-full.txt and a Markdown twin of each tool", async ({ page, request }) => {
  const llms = await request.get("/llms.txt");
  expect(llms.headers()["content-type"]).toContain("text/plain");
  expect(await llms.text()).toMatch(/^# Vartula\n/);

  const full = await request.get("/llms-full.txt");
  expect(await full.text()).toContain("## SVG Animator");

  const md = await request.get("/tools/svg-animator.md");
  expect(md.status()).toBe(200);
  expect(md.headers()["content-type"]).toContain("text/markdown");
  expect(md.headers()["link"]).toMatch(/\/tools\/svg-animator>; rel="canonical"/);
  expect(await md.text()).toMatch(/^# SVG Animator\n/);
  expect((await request.get("/tools/no-such-tool.md")).status()).toBe(404);

  await page.goto("/tools/svg-animator");
  await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveAttribute("href", /\/tools\/svg-animator\.md$/);
  await expect(page.getByRole("heading", { name: "Export formats" })).toBeVisible();
});

test("robots.txt welcomes AI crawlers and points at the sitemap", async ({ request }) => {
  const robots = await request.get("/robots.txt").then((r) => r.text());
  expect(robots).toContain("User-Agent: GPTBot");
  expect(robots).toContain("User-Agent: ClaudeBot");
  expect(robots).not.toMatch(/Disallow: \/\s*$/m);
  expect(robots).toMatch(/Sitemap: .+\/sitemap\.xml/);
});

test("about, contact, privacy and terms pages are linked from the footer and listed in the sitemap", async ({
  page,
  request,
}) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const [path, heading] of [
    ["/about", "About"],
    ["/contact", "Contact"],
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms of Use"],
  ]) {
    expect(sitemap).toContain(`${path}</loc>`);
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: heading, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
  }
});
