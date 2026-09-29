import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const fixture = path.resolve("e2e/fixtures/logo.svg");

async function downloadedBytes(download: import("@playwright/test").Download) {
  const file = await download.path();
  return readFile(file);
}

test("upload an SVG, then export CSS and MP4", async ({ page }) => {
  await page.goto("/tools/svg-animator");
  const preview = page.getByTestId("preview");
  await expect(preview.locator("svg")).toBeVisible();

  // Upload
  await page.getByTestId("file-input").setInputFiles(fixture);
  await expect(page.getByText("3 shapes")).toBeVisible();
  await expect(page.getByText(/Editing\s*logo/)).toBeVisible();
  await expect(preview.locator("circle")).toHaveCount(1);

  // The preview animates the uploaded shapes.
  await expect
    .poll(async () => preview.locator("rect").evaluate((el) => (el as SVGElement).style.strokeDasharray))
    .not.toBe("");

  // CSS export
  const code = page.getByTestId("code-output");
  await expect(code).toHaveAttribute("data-format", "css");
  await expect(code).toContainText(".vartula-svg .vt-0");
  const cssDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const css = await cssDownload;
  expect(css.suggestedFilename()).toBe("animation.css");
  const cssBytes = await downloadedBytes(css);
  expect(cssBytes.length).toBeGreaterThan(0);
  expect(cssBytes.toString("utf8")).toContain(".vartula-svg .vt-2");

  // MP4 export
  await page.getByRole("button", { name: "Export video / GIF" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: /^MP4/ }).click();
  await dialog.getByRole("radio", { name: /^720p/ }).click();
  await dialog.getByRole("radio", { name: /^24 fps/ }).click();
  const mp4Download = page.waitForEvent("download", { timeout: 90_000 });
  await dialog.getByRole("button", { name: "Export MP4" }).click();
  const mp4 = await mp4Download;
  expect(mp4.suggestedFilename()).toBe("logo.mp4");
  const mp4Bytes = await downloadedBytes(mp4);
  expect(mp4Bytes.length).toBeGreaterThan(1000);
  expect(mp4Bytes.subarray(4, 8).toString("latin1")).toBe("ftyp");
  await expect(dialog.getByTestId("export-done")).toContainText("logo.mp4");
});
