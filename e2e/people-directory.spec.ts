import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId, openRow } from "./helpers";

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
  // A table from 600px, a list of links on phones.
  const phone = (viewport?.width ?? 0) < 600;
  const table = page.getByRole(phone ? "list" : "grid", { name: "People" });
  const ana = table.getByRole(phone ? "link" : "row", { name: /Ana Pop/ });
  await expect(ana).toBeVisible();

  // Search waits for a pause, then lives in the URL.
  await page.getByRole("searchbox", { name: "Search" }).fill("nobody-here");
  await expect(page).toHaveURL(/q=nobody-here/);
  await expect(page.getByText("No one matches")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search" }).fill("");
  await expect(ana).toBeVisible();

  // Status filter (behind the Filters button on phones): the owner hasn't left.
  if (phone) await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("button", { name: /Status$/ }).click();
  await page.getByRole("option", { name: "Leavers" }).click();
  await expect(page).toHaveURL(/status=leavers/);
  await expect(page.getByText("No one matches")).toBeVisible();
  await expectNoA11yViolations(page);

  // It shows as a chip; Clear all resets every filter.
  const chips = page.getByRole("group", { name: "Filters" });
  await expect(chips).toContainText("Status: Leavers");
  await chips.getByRole("button", { name: "Clear all" }).click();
  await expect(ana).toBeVisible();

  // A column filter: email contains, as a chip that can be changed or removed (on phones the
  // filters are still open from above).
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("menuitem", { name: "Email" }).click();
  const dialog = page.getByRole("dialog", { name: "Filter by Email" });
  await dialog.getByLabel("Contains").fill("nobody");
  await dialog.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/f=/);
  await expect(page.getByText("No one matches")).toBeVisible();
  await expect(chips).toContainText("Email contains “nobody”");
  await chips.getByRole("button", { name: /^Remove filter: Email/ }).click();
  await expect(ana).toBeVisible();

  // Opening a person.
  await page.goto(page.url().replace(/\?.*$/, ""));
  await openRow(page, ana, /\/people\/[0-9a-f-]{36}$/);
});
