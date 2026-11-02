import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";

test("anyone reads the help and the legal pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Help" }).click();
  await expect(page.getByRole("heading", { name: "Help", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: /^Time off/ }).click();
  await expect(page.getByRole("heading", { name: "Approvals", level: 2 })).toBeVisible();
  // Next.js streams the title in after the page.
  await expect(page).toHaveTitle(/Time off/);
  await expectNoA11yViolations(page);

  await page
    .getByRole("navigation", { name: "Help and legal" })
    .getByRole("link", { name: "Privacy" })
    .click();
  await expect(page.getByRole("heading", { name: "Privacy notice", level: 1 })).toBeVisible();
  await expect(page.getByText("Data is stored in the European Union (Ireland).")).toBeVisible();
  await expect(page).toHaveTitle(/Privacy notice/);
  await expectNoA11yViolations(page);

  await page.goto("/legal/sub-processors");
  await expect(page.getByRole("heading", { name: "Supabase", level: 2 })).toBeVisible();
  await page.goto("/legal/nothing");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();

  await page.goto("/sign-up");
  await page.getByRole("link", { name: "terms" }).click();
  await expect(page.getByRole("heading", { name: "Terms of service", level: 1 })).toBeVisible();
});
