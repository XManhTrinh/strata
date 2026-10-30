import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "settings need a larger screen");

test("a role on specific units gets its units when assigned", async ({ page }, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-u-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  const base = page.url().replace(/\/$/, "");

  // A level and a unit.
  await page.goto(`${base}/settings/hierarchy`);
  await page.getByRole("button", { name: "Add level" }).click();
  await page.getByRole("dialog", { name: "Add level" }).getByLabel("Name").fill("Team");
  await page
    .getByRole("dialog", { name: "Add level" })
    .getByRole("button", { name: "Add" })
    .click();
  await expect(page.getByText("Level added")).toBeVisible();
  await page.getByRole("button", { name: `Actions for Acme ${id}` }).click();
  await page.getByRole("menuitem", { name: "Add sub-unit" }).click();
  const unit = page.getByRole("dialog", { name: "Add unit" });
  await unit.getByLabel("Name").fill("Squad B");
  await unit.getByRole("button", { name: /Level$/ }).click();
  await page.getByRole("option", { name: "Team" }).click();
  await unit.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Squad B added")).toBeVisible();

  // A role that views people in specific units.
  await page.goto(`${base}/settings/roles`);
  await page.getByRole("button", { name: "New role" }).click();
  await page.getByLabel("Role name").fill("Unit HR");
  await page.getByRole("button", { name: "Create role" }).click();
  await page.getByRole("button", { name: "Access for View people" }).click();
  await page.getByRole("option", { name: "Specific units" }).click();
  await expect(page.getByRole("button", { name: "Access for View people" })).toContainText(
    "Specific units"
  );

  // Someone to give it to.
  await page.goto(`${base}/people`);
  await page.getByRole("button", { name: "Add person" }).click();
  await page.getByRole("dialog", { name: "Add person" }).getByLabel("Full name").fill("Bo Ionescu");
  await page
    .getByRole("dialog", { name: "Add person" })
    .getByRole("button", { name: "Add" })
    .click();
  await expect(page.getByRole("heading", { name: "Bo Ionescu", level: 1 })).toBeVisible();

  // Assign the role, then choose its unit.
  await page.goto(`${base}/settings/members`);
  await page.getByRole("button", { name: "Actions for Bo Ionescu" }).click();
  await page.getByRole("menuitem", { name: "Change roles" }).click();
  const roles = page.getByRole("dialog", { name: /Bo Ionescu/ });
  await roles.getByText("Unit HR").click();
  await expect(roles.getByText(/No units yet/)).toBeVisible();
  await roles.getByRole("button", { name: "Choose units" }).click();
  const units = page.getByRole("dialog", { name: "Units for Unit HR" });
  await units.getByRole("combobox", { name: "Units" }).fill("Squad");
  await page.getByRole("option", { name: /Squad B$/ }).click();
  // Multiple choice keeps the list open; Tab closes it.
  await units.getByRole("combobox", { name: "Units" }).press("Tab");
  await units.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Units saved")).toBeVisible();
  await expect(roles.getByText(/Units: .*Squad B/)).toBeVisible();
  await expectNoA11yViolations(page);
});
