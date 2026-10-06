import { expect, test } from "@playwright/test";

test("installable manifest", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  expect(manifest.shortcuts.length).toBeGreaterThan(0);
  const sw = await request.get("/sw.js");
  expect(sw.headers()["content-type"]).toMatch(/javascript/);
  expect(sw.headers()["cache-control"]).toMatch(/no-cache/);
});

test("tools open offline after the first visit", async ({ page, context }) => {
  await page.goto("/");
  // Wait until the worker is installed (precache done) and controls the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }));
  });

  await context.setOffline(true);

  // A tool that was never visited, served from the precache, and it still works.
  await page.goto("/tools/chart-maker");
  await expect(page.getByRole("heading", { level: 1, name: "Chart Maker" })).toBeVisible();
  await page.getByRole("button", { name: /Paste data/ }).click();
  await page.getByLabel("Paste data").fill("fruit,sold\nApple,10\nPear,7");
  await page.getByRole("button", { name: "Use this data" }).click();
  await page.getByRole("radio", { name: /Bar chart/ }).click();
  await expect(page.getByTestId("chart-preview").locator("svg")).toBeVisible();

  // A page that isn't cached falls back to the offline page.
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "You’re offline" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /PDF Toolkit/ })).toBeVisible();

  await context.setOffline(false);
});
