import { expectNoA11yViolations } from "./a11y";
import { expect, test } from "@playwright/test";
import { completeSignUp, uniqueId } from "./helpers";

test("a new user signs up, confirms their email and creates a workspace", async ({
  page,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);

  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-${id}@example.test`);
  await expect(page).toHaveURL(/\/onboarding$/);
  await expectNoA11yViolations(page);

  await page.getByText("Company", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /Company/ })).toBeChecked();
  await page.getByLabel("Workspace name").fill(`Acme ${id}`);
  await expect(page.getByLabel("Web address")).toHaveValue(`acme-${id}`.toLowerCase());
  await page.getByRole("button", { name: "Create workspace" }).click();

  await expect(page).toHaveURL(new RegExp(`/w/acme-${id}$`, "i"));
  await expect(page.getByRole("heading", { name: "Welcome, Ana Pop" })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Settings" })
  ).toBeVisible();
  await expectNoA11yViolations(page);
});

test("signed-out visitors are sent to sign-in and back", async ({ page }) => {
  await page.goto("/w/anything/settings");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fw%2Fanything%2Fsettings$/);
});
