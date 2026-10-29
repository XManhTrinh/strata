import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

// The demo page lives under (dev) and exists only with STRATA_DEV_PAGES=1 (set for the test server).
const DEMO = "/components/data-table";

test("DataTable: sort, search, select, columns and pages", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 600, "phones get the list layout (tested below)");
  await page.goto(DEMO);
  const table = page.getByRole("grid", { name: "Demo people" });
  await expect(table).toBeVisible();
  await expectNoA11yViolations(page);

  // Sorting by a header click, then reversing it.
  await page.getByRole("columnheader", { name: "Salary" }).click();
  await expect(page.getByRole("columnheader", { name: "Salary" })).toHaveAttribute(
    "aria-sort",
    "ascending"
  );
  await page.getByRole("columnheader", { name: "Salary" }).click();
  await expect(page.getByRole("columnheader", { name: "Salary" })).toHaveAttribute(
    "aria-sort",
    "descending"
  );

  // Paging, in the Material 3 footer.
  await expect(page.getByText("1–50 of 300")).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("51–100 of 300")).toBeVisible();

  // Search filters and goes back to the first page.
  await page.getByRole("searchbox", { name: "Search" }).fill("Ana Pop 1");
  await expect(page.getByText(/^1–\d+ of \d+$/)).toBeVisible();
  await expect(table.getByRole("rowheader", { name: "Ana Pop 1", exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search" }).fill("");

  // Selecting rows swaps the toolbar for the bulk bar.
  const rowBoxes = table.getByRole("checkbox", { name: /^Select (?!all)/ });
  await rowBoxes.nth(0).click({ force: true });
  await rowBoxes.nth(1).click({ force: true });
  await expect(page.getByRole("toolbar", { name: "2 selected" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(page.getByRole("toolbar", { name: "2 selected" })).toHaveCount(0);

  // Column settings: hide a column, move another with the keyboard buttons.
  await page.getByRole("button", { name: "Columns" }).click();
  const settings = page.getByRole("dialog", { name: "Columns" });
  // Space toggles a row of the column list, as the list's selection is "shown columns".
  await settings.getByRole("row", { name: /Email/ }).press("Space");
  await expect(settings.getByRole("row", { name: /Email/ })).toHaveAttribute(
    "aria-selected",
    "false"
  );
  await expect(page.getByRole("columnheader", { name: "Email" })).toHaveCount(0);
  await settings.getByRole("button", { name: "Move Salary up" }).click();
  await settings.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("columnheader", { name: "Email" })).toHaveCount(0);
  const headers = await page.getByRole("columnheader").allInnerTexts();
  // The first line is the label; the rest is the sort icon's ligature.
  expect(headers.map((h) => h.split("\n")[0]?.trim()).filter(Boolean)).toEqual([
    "Name",
    "Team",
    "Salary",
    "Position",
  ]);
  await expectNoA11yViolations(page);
});

test("DataTable: a list on phones", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) >= 600, "phones only");
  await page.goto(DEMO);
  await expect(page.getByRole("grid", { name: "Demo people" })).toHaveCount(0);
  await expect(page.getByText("Ana Pop 1", { exact: true })).toBeVisible();
  await expect(page.getByText("1–50 of 300")).toBeVisible();
  await expectNoA11yViolations(page);
});
