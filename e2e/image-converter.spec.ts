import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

/** A noisy photo-like PNG, which compresses poorly, so size targets have work to do. */
async function noisyPng(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: "#808080", noise: { type: "gaussian", mean: 128, sigma: 40 } } })
    .png()
    .toBuffer();
}

test("convert PNG to JPG, resize and compress to a target size", async ({ page }) => {
  await page.goto("/tools/image-converter");
  const png = await noisyPng(1200, 900);
  await page.getByTestId("image-file-input").setInputFiles([
    { name: "noise.png", mimeType: "image/png", buffer: png },
    { name: "noise-copy.png", mimeType: "image/png", buffer: png },
  ]);

  const rows = page.getByTestId("image-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("noise.jpg");
  await expect(rows.first()).toContainText("1200×900");

  // Fit inside 600 px wide.
  await page.getByRole("radio", { name: "Fit" }).click();
  await page.getByLabel("Width in pixels").fill("600");
  await page.getByLabel("Width in pixels").press("Enter");
  await page.getByLabel("Height in pixels").fill("");
  await page.getByLabel("Height in pixels").press("Enter");
  await expect(rows.first()).toContainText("600×450");

  // Under 50 KB.
  await page.getByRole("button", { name: "50 KB" }).click();
  await expect(rows.first().getByRole("button", { name: "Download noise.jpg" })).toBeEnabled();
  await expect(rows.nth(1).getByRole("button", { name: "Download noise-copy.jpg" })).toBeEnabled();

  const single = page.waitForEvent("download");
  await rows.first().getByRole("button", { name: "Download noise.jpg" }).click();
  const jpg = await readFile(await (await single).path());
  expect(jpg.length).toBeLessThanOrEqual(50_000);
  expect([...jpg.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);

  const zip = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all (2)" }).click();
  expect((await zip).suggestedFilename()).toBe("vartula-images-jpg.zip");
});

test("convert to PNG keeps the format's extension and can be cleared", async ({ page }) => {
  await page.goto("/tools/image-converter");
  await page.getByRole("radio", { name: "PNG" }).click();
  await page.getByTestId("image-file-input").setInputFiles({ name: "photo.webp", mimeType: "image/webp", buffer: await sharp(await noisyPng(64, 48)).webp().toBuffer() });
  const row = page.getByTestId("image-row");
  await expect(row).toContainText("photo.png");
  await expect(row).toContainText("64×48");
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(row).toHaveCount(0);
});
