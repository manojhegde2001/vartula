import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

test("home page search leads to the tool", async ({ page }) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search tools" });
  await search.fill("no such tool");
  await expect(page.getByText(/No tools match/)).toBeVisible();
  await search.fill("svg");
  await page.getByRole("region", { name: "All tools" }).getByRole("link", { name: /SVG Animator/ }).click();
  await expect(page).toHaveURL(/\/tools\/svg-animator/);
  await expect(page.getByRole("heading", { level: 1, name: "SVG Animator" })).toBeVisible();
});

test("home page filters tools by category", async ({ page }) => {
  await page.goto("/");
  const tools = page.getByRole("region", { name: "All tools" });
  const filters = page.getByRole("group", { name: "Filter by category" });
  await filters.getByRole("button", { name: /^Image/ }).click();
  await expect(filters.getByRole("button", { name: /^Image/ })).toHaveAttribute("aria-pressed", "true");
  await expect(tools.getByRole("link", { name: /Image Converter/ })).toBeVisible();
  await expect(tools.getByRole("link", { name: /SVG Animator/ })).toHaveCount(0);
  await filters.getByRole("button", { name: /^Code/ }).click();
  await expect(tools.getByText("New code tools soon")).toBeVisible();
  await filters.getByRole("button", { name: /^All/ }).click();
  await expect(tools.getByRole("link", { name: /SVG Animator/ })).toBeVisible();
});

test("header tools menu lists tools by category", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("banner").getByText("Tools", { exact: true }).click();
  const menu = page.getByRole("navigation", { name: "Tools", exact: true });
  await expect(menu).toContainText("Animation");
  await menu.getByRole("link", { name: /SVG Animator/ }).click();
  await expect(page).toHaveURL(/\/tools\/svg-animator/);
  await expect(menu).toBeHidden();
});

test("tool page ships metadata, JSON-LD and an OG image", async ({ page, request }) => {
  await page.goto("/tools/svg-animator");
  await expect(page).toHaveTitle("SVG Animator — Free Line-Drawing Animation Maker | Vartula");
  const types = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) => els.map((el) => JSON.parse(el.textContent ?? "{}")["@type"]));
  expect(types).toEqual(expect.arrayContaining(["SoftwareApplication", "FAQPage", "BreadcrumbList"]));
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("SVG Animator");

  const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
  expect(og).toBeTruthy();
  const res = await request.get(new URL(og!).pathname + new URL(og!).search);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("settings round-trip through the share hash", async ({ page }) => {
  await page.goto("/tools/svg-animator");
  await expect(page.getByTestId("preview").locator("svg")).toBeVisible();
  await page.getByRole("radio", { name: /^Loop/ }).click();
  await page.getByRole("button", { name: "Samples" }).click();
  await page.getByRole("menuitem", { name: "Heart" }).click();
  await expect(page.getByText(/Editing\s*Heart/)).toBeVisible();
  await expect(page).toHaveURL(/#c=.+&s=heart/);

  const shared = page.url();
  const other = await page.context().newPage();
  await other.goto(shared);
  await expect(other.getByText(/Editing\s*Heart/)).toBeVisible();
  await expect(other.getByRole("radio", { name: /^Loop/ })).toHaveAttribute("aria-checked", "true");
});

async function downloadCode(page: Page, tab: string) {
  await page.getByRole("tab", { name: tab, exact: true }).click();
  await expect(page.getByTestId("code-output")).not.toContainText("Loading");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  return (await readFile(await (await download).path())).toString("utf8");
}

test("exported CSS, JavaScript and SMIL animate identically in the browser", async ({ page, context }) => {
  await page.goto("/tools/svg-animator");
  await expect(page.getByTestId("preview").locator("svg")).toBeVisible();
  await page.getByRole("radio", { name: /^Loop/ }).click();

  const svg = await downloadCode(page, "SVG");
  const css = await downloadCode(page, "CSS");
  const js = await downloadCode(page, "JavaScript");
  const smil = await downloadCode(page, "SMIL");
  expect(css).toContain("@keyframes");

  const harness = await context.newPage();
  const sample = async (html: string, kind: "waapi" | "smil", t: number) => {
    await harness.setContent(`<!doctype html><body>${html}</body>`);
    return harness.evaluate(
      ({ kind, t }) => {
        const root = document.querySelector("svg")!;
        if (kind === "smil") {
          root.pauseAnimations();
          root.setCurrentTime(t / 1000);
        } else {
          for (const a of document.getAnimations()) {
            a.pause();
            a.currentTime = t;
          }
        }
        return Array.from(root.querySelectorAll("[class*='vt-']")).map((el) => {
          const cs = getComputedStyle(el);
          return { offset: parseFloat(cs.strokeDashoffset), dash: parseFloat(cs.strokeDasharray), fill: parseFloat(cs.fillOpacity) };
        });
      },
      { kind, t },
    );
  };

  for (const t of [0, 180, 520, 910, 1333, 1800, 2400]) {
    const fromCss = await sample(`<style>${css}</style>${svg}`, "waapi", t);
    const fromJs = await sample(`${svg}<script>${js}</script>`, "waapi", t);
    const fromSmil = await sample(smil, "smil", t);
    expect(fromCss.length).toBeGreaterThan(0);
    fromCss.forEach((c, i) => {
      for (const other of [fromJs[i], fromSmil[i]]) {
        if (c.dash > 0) expect(Math.abs(c.offset - other.offset) / c.dash, `t=${t} #${i} offset`).toBeLessThan(0.015);
        expect(Math.abs(c.fill - other.fill), `t=${t} #${i} fill`).toBeLessThan(0.02);
      }
    });
  }
});

test("media export can be cancelled", async ({ page }) => {
  await page.goto("/tools/svg-animator");
  await expect(page.getByTestId("preview").locator("svg")).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Video \/ GIF/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: /^PNG sequence/ }).click();
  await dialog.getByRole("radio", { name: /^1080p/ }).click();
  await dialog.getByRole("radio", { name: /^60 fps/ }).click();
  let downloaded = false;
  page.on("download", () => (downloaded = true));
  await dialog.getByRole("button", { name: "Export PNG sequence" }).click();
  await expect(dialog.getByText(/Rendering frame \d+ of \d+/)).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog.getByRole("button", { name: "Export PNG sequence" })).toBeEnabled();
  await expect(dialog.getByRole("progressbar")).toHaveCount(0);
  expect(downloaded).toBe(false);
});

test("explains when the browser cannot export media", async ({ page }) => {
  await page.addInitScript(() => {
    // Simulate a browser without OffscreenCanvas.
    delete (window as { OffscreenCanvas?: unknown }).OffscreenCanvas;
  });
  await page.goto("/tools/svg-animator");
  await expect(page.getByTestId("preview").locator("svg")).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Video \/ GIF/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("can't render animation frames");
  await expect(dialog.getByRole("button", { name: "Export MP4" })).toBeDisabled();
});

test("responses carry security headers", async ({ request }) => {
  for (const path of ["/", "/tools/svg-animator", "/tools/svg-animator.md"]) {
    const headers = (await request.get(path)).headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
  }
});
