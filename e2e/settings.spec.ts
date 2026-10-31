import { type Page, expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId, settingsSection, chooseFile } from "./helpers";

/** A 64 × 64 blue square, for the logo. */
const LOGO_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAT0lEQVR42u3PQQkAAAgEsItjJhMbywi+hcEKLNXzWgQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQELgtZCaEttSk+KwAAAABJRU5ErkJggg==";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "settings need a larger screen");

/** Opens a settings section; below 840px the list and detail show one at a time (Material 3). */
async function openSection(page: Page, name: string) {
  const link = settingsSection(page, name);
  const back = page.getByRole("link", { name: "Back to settings" });
  await expect(link.or(back).first()).toBeVisible();
  if (!(await link.isVisible())) await back.click();
  await link.click();
}

test("an owner manages general settings, features, roles and sees the audit log", async ({
  page,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  await page.getByRole("link", { name: "Settings" }).first().click();

  // General
  await openSection(page, "General");
  await expect(page.getByRole("heading", { name: "General" })).toBeVisible();
  await expectNoA11yViolations(page);
  // A logo, cropped to a square, shows at the top of the navigation.
  await chooseFile(
    page,
    { name: "logo.png", mimeType: "image/png", buffer: Buffer.from(LOGO_PNG, "base64") },
    "Adjust the logo"
  );
  await page
    .getByRole("dialog", { name: "Adjust the logo" })
    .getByRole("button", { name: "Save" })
    .click();
  await expect(page.getByText("Logo saved")).toBeVisible();
  const railLogo = page.locator('img[src*="/storage/v1/object/sign/workspace-logos/"]');
  await expect(railLogo.first()).toBeAttached();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("Logo removed")).toBeVisible();
  await expect(railLogo).toHaveCount(0);

  await page.getByLabel("Workspace name").fill(`Acme Group ${id}`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Settings saved")).toBeVisible();

  // Features: turning off a feature others depend on asks first.
  await openSection(page, "Features");
  await expect(page.getByRole("heading", { name: "Features" })).toBeVisible();
  await expectNoA11yViolations(page);
  // Keyboard, as Windmorph draws the switch over its native input.
  await page.getByRole("switch", { name: "Capacity planning" }).press("Space");
  const confirm = page.getByRole("alertdialog", { name: "Turn off Capacity planning?" });
  await expect(confirm.getByText(/Rate cards/)).toBeVisible();
  await confirm.getByRole("button", { name: "Turn off" }).click();
  await expect(page.getByText("Capacity planning, Rate cards turned off")).toBeVisible();
  await expect(page.getByRole("switch", { name: "Rate cards" })).not.toBeChecked();

  // Roles: Admin is fixed; a new role gets a permission.
  await openSection(page, "Roles");
  await expect(page.getByRole("heading", { name: "Roles" })).toBeVisible();
  await page
    .getByRole("grid", { name: "Roles" })
    .getByRole("row", { name: /^Admin/ })
    .click();
  await expect(page.getByText("The Admin role has every permission")).toBeVisible();
  // From 1200px the roles stay beside the open role; narrower, it goes back to them.
  const backToRoles = page.getByRole("link", { name: "Back to roles" });
  if (await backToRoles.isVisible()) await backToRoles.click();

  await page.getByRole("button", { name: "New role" }).click();
  await page.getByLabel("Role name").fill("Team lead");
  await page.getByRole("button", { name: "Create role" }).click();
  await expect(page.getByRole("heading", { name: "Team lead" })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Access for View people" }).click();
  await page.getByRole("option", { name: "Whole workspace" }).click();
  await expect(page.getByRole("button", { name: "Access for View people" })).toContainText(
    "Whole workspace"
  );

  // Audit log shows what happened, and who did it.
  await openSection(page, "Audit log");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  await expect(page.getByText("Ana Pop added a role", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("Ana Pop changed workspace settings", { exact: true }).first()
  ).toBeVisible();
  await expectNoA11yViolations(page);

  // Filtering by what changed.
  await page.getByRole("button", { name: /What changed/ }).click();
  await page.getByRole("option", { name: "a feature" }).click();
  await expect(page).toHaveURL(/table=workspace_features/);
  await expect(page.getByText("Ana Pop changed a feature", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Ana Pop added a role", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("Ana Pop added a role", { exact: true }).first()).toBeVisible();
});
