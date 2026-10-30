import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "views are managed on larger screens");

test("a saved view keeps filters and columns and opens by default", async ({ page }, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-v-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  await page.getByRole("link", { name: "People" }).first().click();
  const table = page.getByRole("grid", { name: "People" });
  await expect(table.getByRole("row", { name: /Ana Pop/ })).toBeVisible();

  // Everyone, sorted by name descending, without the Email column.
  await page.getByRole("button", { name: /Status$/ }).click();
  await page.getByRole("option", { name: "Everyone" }).click();
  await expect(page).toHaveURL(/status=all/);
  await page.getByRole("button", { name: "Columns" }).click();
  const columns = page.getByRole("dialog", { name: "Columns" });
  await columns.getByRole("row", { name: /Email/ }).press("Space");
  await columns.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("columnheader", { name: "Email" })).toHaveCount(0);

  // Save it as my default.
  await page.getByRole("button", { name: "Views" }).click();
  await page.getByRole("menuitem", { name: "Save as new view" }).click();
  const dialog = page.getByRole("dialog", { name: "Save view" });
  await dialog.getByLabel("Name").fill("Everyone, no email");
  await dialog.getByText("Open this view by default").click();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/view=[0-9a-f-]{36}/);
  await expect(page.getByRole("button", { name: "View: Everyone, no email" })).toBeVisible();
  await expectNoA11yViolations(page);

  // A plain visit opens the default view, columns included.
  await page.goto(page.url().replace(/\?.*$/, ""));
  await expect(page).toHaveURL(/status=all.*view=/);
  await expect(page.getByRole("button", { name: "View: Everyone, no email" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Email" })).toHaveCount(0);

  // Changing it shows "(edited)" until saved.
  await page.getByRole("button", { name: /Status$/ }).click();
  await page.getByRole("option", { name: "Leavers" }).click();
  await expect(page.getByRole("button", { name: "Everyone, no email (edited)" })).toBeVisible();
});
