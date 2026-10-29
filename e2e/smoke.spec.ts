import { expectNoA11yViolations } from "./a11y";
import { expect, test } from "@playwright/test";

test("home page renders and has no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Strata" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();

  await expectNoA11yViolations(page);
});

test("unknown pages show the not-found state", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
