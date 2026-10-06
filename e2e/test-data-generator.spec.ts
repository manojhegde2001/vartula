import { readFile } from "node:fs/promises";
import { expect, test, type Download } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

const bytesOf = async (d: Download) => readFile(await d.path());

test("generate records: preview, CSV and SQL downloads, share link", async ({ page }) => {
  await page.goto("/tools/test-data-generator");
  const table = page.getByTestId("preview-table");
  await expect(table.locator("tbody tr")).toHaveCount(20);
  await expect(table.locator("thead")).toContainText("email");

  // Same seed, same first row: reload and compare.
  const firstRow = await table.locator("tbody tr").first().innerText();

  await page.getByRole("button", { name: "1k", exact: true }).click();
  await page.getByRole("radio", { name: "CSV" }).click();
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download 1,000 rows as CSV/ }).click();
  const csv = (await bytesOf(await csvDownload)).toString("utf8").trim().split("\r\n");
  expect(csv).toHaveLength(1001);
  expect(csv[0]).toBe("id,first_name,last_name,email,phone,date_of_birth,address.city,address.country,status,created_at");
  expect(new Set(csv.slice(1).map((l) => l.split(",")[3])).size).toBe(1000); // unique emails

  await page.getByRole("radio", { name: "SQL" }).click();
  await page.getByRole("radio", { name: "MySQL" }).click();
  await expect(page.getByTestId("preview-output").or(table)).toBeVisible();
  const sqlDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download 1,000 rows as SQL/ }).click();
  const sql = (await bytesOf(await sqlDownload)).toString("utf8");
  expect(sql).toContain("CREATE TABLE `users`");
  expect(sql.match(/INSERT INTO `users`/g)).toHaveLength(10);

  // Change a field, then load the share link in a fresh page.
  await page.getByLabel("Name of field 1", { exact: true }).fill("user_id");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Share link" }).click();
  const url = page.url();
  expect(url).toContain("#data=");
  const other = await page.context().newPage();
  await other.goto(url);
  await expect(other.getByLabel("Name of field 1", { exact: true })).toHaveValue("user_id");
  await expect.poll(() => other.getByTestId("preview-table").locator("tbody tr").first().innerText()).toBe(firstRow);
});

test("generate files at an exact size", async ({ page }) => {
  await page.goto("/tools/test-data-generator#files");
  await expect(page.getByRole("tab", { name: /Files/ })).toHaveAttribute("aria-selected", "true");

  // 1 MB PNG (1,048,576 bytes) that decodes.
  await page.getByRole("button", { name: "1 MB", exact: true }).click();
  let download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Generate PNG" }).click();
  let file = await download;
  expect(file.suggestedFilename()).toBe("test-1MB.png");
  const png = await bytesOf(file);
  expect(png.length).toBe(1_048_576);
  expect((await sharp(png).metadata()).width).toBe(1280);

  // One byte over a 100 KB limit, as JPG.
  await page.getByRole("radio", { name: "JPG" }).click();
  await page.getByRole("button", { name: "100 KB", exact: true }).click();
  await page.getByRole("button", { name: "1 byte", exact: false }).last().click();
  download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Generate JPG" }).click();
  file = await download;
  expect(file.suggestedFilename()).toBe("test-100KB+1B.jpg");
  const jpg = await bytesOf(file);
  expect(jpg.length).toBe(102_401);
  expect((await sharp(jpg).metadata()).format).toBe("jpeg");

  // 250 KB PDF that opens.
  await page.getByRole("radio", { name: "PDF" }).click();
  await page.getByLabel("Size", { exact: true }).fill("250");
  await page.getByLabel("Unit").selectOption("KB");
  download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Generate PDF" }).click();
  const pdf = await bytesOf(await download);
  expect(pdf.length).toBe(256_000);
  expect((await PDFDocument.load(pdf)).getPageCount()).toBe(3);

  // A batch of 3 CSV files in a ZIP.
  await page.getByRole("radio", { name: "CSV" }).click();
  await page.getByLabel("How many").fill("3");
  await page.getByLabel("How many").press("Enter");
  download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Generate 3 files (ZIP)" }).click();
  expect((await download).suggestedFilename()).toBe("test-250KB-x3.zip");

  // A problem file.
  download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Truncated PNG" }).click();
  expect((await download).suggestedFilename()).toBe("truncated.png");
});

test("edge cases and values", async ({ page }) => {
  await page.goto("/tools/test-data-generator#edge");
  await page.getByLabel("Length", { exact: true }).fill("12");
  await page.getByLabel("Length", { exact: true }).press("Enter");
  await expect(page.getByTestId("length-output")).toHaveText("*3*5*7*9*12*");
  await expect(page.getByText("<script>alert(1)</script>")).toBeVisible();

  await page.getByRole("tab", { name: /Values/ }).click();
  const cards = page.getByTestId("values-Card numbers").locator("li");
  await expect(cards).toHaveCount(5);
  const first = (await cards.first().innerText()).replace(/\s/g, "");
  expect(first).toMatch(/^4\d{15}$/);
});
