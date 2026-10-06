import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

/** A PDF whose pages have distinct widths (first, first + 1, …), so order survives a round trip. */
async function makePdf(name: string, pageCount: number, firstWidth: number) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([firstWidth + i, 400]).drawText(`${name} ${i + 1}`, { x: 20, y: 200, size: 18 });
  return { name: `${name}.pdf`, mimeType: "application/pdf", buffer: Buffer.from(await doc.save()) };
}

async function loadDownload(download: Download) {
  return PDFDocument.load(await readFile(await download.path()));
}

async function open(page: Page) {
  await page.goto("/tools/pdf-toolkit");
  await page.getByTestId("pdf-file-input").setInputFiles([await makePdf("alpha", 3, 300), await makePdf("beta", 2, 400)]);
  await expect(page.getByText("alpha.pdf")).toBeVisible();
  await expect(page.getByText("beta.pdf")).toBeVisible();
}

test("merge, organize and split PDFs", async ({ page }) => {
  await open(page);

  // Merge in the reverse order.
  await page.getByRole("button", { name: "Move beta.pdf up" }).click();
  const merged = page.waitForEvent("download");
  await page.getByRole("button", { name: "Merge and download" }).click();
  const mergedDoc = await loadDownload(await merged);
  expect(mergedDoc.getPages().map((p) => p.getWidth())).toEqual([400, 401, 300, 301, 302]);

  // Organize: page thumbnails render; delete one page and rotate another.
  await page.getByRole("tab", { name: "Organize" }).click();
  await expect(page).toHaveURL(/#organize$/);
  const grid = page.getByTestId("page-grid");
  await expect(grid.getByRole("img", { name: "Page 1" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Delete page 1", exact: true }).click();
  await page.getByRole("button", { name: "Rotate page 1 right", exact: true }).click();
  const organized = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const organizedDoc = await loadDownload(await organized);
  expect(organizedDoc.getPageCount()).toBe(4);
  expect(organizedDoc.getPage(0).getRotation().angle).toBe(90);

  // Split the first document by ranges into a ZIP.
  await page.getByRole("tab", { name: "Split" }).click();
  await page.getByLabel("Page ranges, one PDF per range").fill("1-2, 3");
  await expect(page.getByText("Creates 2 PDFs in a ZIP")).toBeVisible();
  const zip = page.waitForEvent("download");
  await page.getByRole("button", { name: "Split and download" }).click();
  expect((await zip).suggestedFilename()).toBe("alpha-split.zip");

  // Bad ranges are explained and block the download.
  await page.getByLabel("Page ranges, one PDF per range").fill("1-9");
  await expect(page.getByText("Page 9 doesn't exist (the document has 3)")).toBeVisible();
  await expect(page.getByRole("button", { name: "Split and download" })).toBeDisabled();
});

test("compress and sign a PDF", async ({ page }) => {
  await open(page);

  await page.getByRole("tab", { name: "Compress" }).click();
  await page.getByRole("button", { name: "Compress 2 PDFs" }).click();
  await expect(page.getByTestId("compress-total")).toBeVisible();
  const zip = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all (2)" }).click();
  expect((await zip).suggestedFilename()).toBe("compressed-pdfs.zip");

  await page.getByRole("radio", { name: /^Strong/ }).click();
  await page.getByRole("button", { name: "Compress 2 PDFs" }).click();
  await expect(page.getByTestId("compress-total")).toBeVisible({ timeout: 60_000 });

  await page.getByRole("tab", { name: "Sign" }).click();
  await page.getByRole("button", { name: "Create signature" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: /Type/ }).click();
  await dialog.getByLabel("Signature text").fill("Jane Doe");
  await dialog.getByRole("button", { name: "Add signature" }).click();
  await expect(dialog).toBeHidden();

  // Click on the second page to place it.
  const pageTwo = page.locator("[data-page='1']");
  await pageTwo.scrollIntoViewIfNeeded();
  await expect(pageTwo.getByRole("img", { name: "Page 2" })).toBeVisible();
  await pageTwo.click({ position: { x: 120, y: 200 } });
  await expect(page.getByTestId("placed-signature")).toHaveCount(1);
  await expect(page.getByText("1 signature placed")).toBeVisible();

  const signed = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download signed PDF" }).click();
  const download = await signed;
  expect(download.suggestedFilename()).toBe("alpha-signed.pdf");
  const doc = await loadDownload(download);
  expect(doc.getPageCount()).toBe(3);
});

test("rejects files that aren't PDFs", async ({ page }) => {
  await page.goto("/tools/pdf-toolkit#split");
  await expect(page.getByRole("tab", { name: "Split" })).toHaveAttribute("aria-selected", "true");
  await page.getByTestId("pdf-file-input").setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("hello") });
  await expect(page.getByText("notes.pdf: This file isn't a valid PDF")).toBeVisible();
});
