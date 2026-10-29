import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test("the people directory searches, filters and opens on every screen", async ({
  page,
  viewport,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-p-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);

  await page.getByRole("link", { name: "People" }).first().click();
  await expect(page).toHaveURL(/\/people$/);
  // A table from 600px, a list on phones: both are grids named People.
  const table = page.getByRole("grid", { name: "People" });
  await expect(table.getByRole("row", { name: /Ana Pop/ })).toBeVisible();

  // Search waits for a pause, then lives in the URL.
  await page.getByRole("searchbox", { name: "Search" }).fill("nobody-here");
  await expect(page).toHaveURL(/q=nobody-here/);
  await expect(page.getByText("No one matches")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search" }).fill("");
  await expect(table.getByRole("row", { name: /Ana Pop/ })).toBeVisible();

  // Status filter (behind the Filters button on phones): the owner hasn't left.
  if ((viewport?.width ?? 0) < 600) await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("button", { name: /Status$/ }).click();
  await page.getByRole("option", { name: "Leavers" }).click();
  await expect(page).toHaveURL(/status=leavers/);
  await expect(page.getByText("No one matches")).toBeVisible();
  await expectNoA11yViolations(page);

  // Opening a person.
  await page.goto(page.url().replace(/\?.*$/, ""));
  await table.getByRole("row", { name: /Ana Pop/ }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/);
});
