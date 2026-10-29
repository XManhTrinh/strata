import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

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

  // A 1×1 PNG: uploaded into the private bucket, shown through a signed link, then removed.
  const signedPhoto = page.locator('img[src*="/storage/v1/object/sign/avatars/"]');
  await page.locator('input[type="file"]').setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(ONE_PIXEL_PNG, "base64"),
  });
  await expect(page.getByText("Photo updated")).toBeVisible();
  await expect(signedPhoto.first()).toBeAttached();
  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect(page.getByText("Photo removed")).toBeVisible();
  await expect(signedPhoto).toHaveCount(0);

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
