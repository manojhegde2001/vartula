import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("paste data, pick a chart, map columns and export SVG and PNG", async ({ page }) => {
  await page.goto("/tools/chart-maker");

  await page.getByLabel("Paste data").fill("fruit,season,sold\nApple,Spring,10\nApple,Summer,14\nPear,Spring,7\nPear,Summer,3\nPlum,Summer,9");
  await page.getByRole("button", { name: "Use this data" }).click();
  await expect(page.getByText(/Pasted data · 5 rows · 3 columns/)).toBeVisible();

  await page.getByRole("radio", { name: /Bar chart/ }).click();
  // Required dimensions are filled automatically; add the series by hand.
  await page.getByLabel("Add a column to Group by").selectOption("season");

  const preview = page.getByTestId("chart-preview");
  await expect(preview.locator("svg")).toBeVisible();
  await expect(preview.locator("rect title", { hasText: "Apple · Summer: 14" })).toHaveCount(1);
  await expect(preview.locator(".legend")).toContainText("Summer");

  await page.getByLabel("Orientation").selectOption("horizontal");
  await page.getByLabel("Width", { exact: true }).fill("640");
  await page.getByLabel("Width", { exact: true }).blur();
  await expect(preview.locator("svg")).toHaveAttribute("width", "640");

  const svgDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "SVG", exact: true }).click();
  const svg = await svgDownload;
  expect(svg.suggestedFilename()).toBe("pasted-data-bar-chart.svg");
  const svgText = (await readFile(await svg.path())).toString("utf8");
  expect(svgText).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="640"');

  const pngDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  const png = await pngDownload;
  expect(png.suggestedFilename()).toBe("pasted-data-bar-chart.png");
  const bytes = await readFile(await png.path());
  expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
});

test("samples load with their chart, and switching charts remaps columns", async ({ page }) => {
  await page.goto("/tools/chart-maker");
  await page.getByRole("button", { name: /Customer journeys/ }).click();
  await expect(page.getByRole("radio", { name: /Alluvial diagram/ })).toHaveAttribute("aria-checked", "true");
  const preview = page.getByTestId("chart-preview");
  await expect(preview).toContainText("Referral");

  await page.getByRole("radio", { name: /Treemap/ }).click();
  await expect(page.getByTestId("dimension-levels")).toContainText("channel");
  await expect(preview.locator("svg")).toBeVisible();

  // Forcing a wrong type flags the cells and drops the column from Size (rows are counted instead).
  await page.getByLabel("Type of customers").selectOption("date");
  await expect(page.locator("td[title^='Not a valid date']").first()).toBeVisible();
  await expect(page.getByTestId("dimension-size")).not.toContainText("customers");
  await expect(preview.locator("svg")).toBeVisible();
});
