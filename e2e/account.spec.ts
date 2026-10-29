import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test("a user updates their profile and email preferences", async ({ page }, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-${id}@example.test`);
  await createWorkspace(page, "Personal", `Ana ${id}`);

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Profile" }).click();
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByLabel("Full name").fill("Ana Maria Pop");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue("Ana Maria Pop");

  await page.goto("/account/notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Email for Time off" }).click();
  await page.getByRole("option", { name: "Daily summary" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Email for Time off" })).toContainText(
    "Daily summary"
  );
});
