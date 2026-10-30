import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(
  ({ viewport }) => (viewport?.width ?? 0) < 600,
  "rate cards are edited on larger screens"
);

test("finance sets planning rules and rate cards, and previews who gets which card", async ({
  page,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-r-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  const base = page.url().replace(/\/$/, "");

  // Planning rules.
  await page.goto(`${base}/settings/planning`);
  await page.getByRole("button", { name: /Planning period$/ }).click();
  await page.getByRole("option", { name: "Quarterly" }).click();
  await page.getByRole("button", { name: /Someone over full time$/ }).click();
  await page.getByRole("option", { name: "Don't allow" }).click();
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Planning settings saved")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /^Quarterly Planning period$/ })).toBeVisible();

  // A set with a group, from the Planning destination.
  await page.getByRole("link", { name: "Planning" }).first().click();
  await page.getByRole("tab", { name: "Rate cards" }).click();
  await expect(page.getByRole("heading", { name: "Rate cards", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "Add set" }).click();
  await page.getByRole("dialog", { name: "Add set" }).getByLabel("Name").fill("Digital");
  await page.getByRole("dialog", { name: "Add set" }).getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Add group" }).click();
  const group = page.getByRole("dialog", { name: "Add group" });
  await group.getByLabel("Name").fill("Opex");
  await group.getByRole("button", { name: /Set$/ }).click();
  await page.getByRole("option", { name: "Digital" }).click();
  await group.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("heading", { name: "Opex" })).toBeVisible();

  // A card for contractors, and a default card.
  await page.getByRole("button", { name: "Add card" }).click();
  const card = page.getByRole("dialog", { name: "Add rate card" });
  await card.getByLabel("Name").fill("Contractors");
  await card.getByRole("button", { name: /Group$/ }).click();
  await page.getByRole("option", { name: "Opex (Digital)" }).click();
  await card.getByRole("button", { name: "Add condition" }).click();
  await card.getByRole("button", { name: /Field$/ }).click();
  await page.getByRole("option", { name: "Employment type" }).click();
  await card.getByLabel("Value", { exact: true }).fill("Contractor");
  await card.getByLabel("Day rate").fill("500");
  await expect(card.getByText(/10,000\.00 a month at full time/)).toBeVisible();
  await expectNoA11yViolations(page);
  await card.getByRole("button", { name: "Add card", exact: true }).click();
  await expect(page.getByRole("list", { name: "Opex" })).toContainText(
    /Employment type is Contractor · .*500\.00 × 20 days/
  );

  await page.getByRole("button", { name: "Add card" }).click();
  const fallback = page.getByRole("dialog", { name: "Add rate card" });
  await fallback.getByLabel("Name").fill("Everyone else");
  await fallback.getByText("Default card for everyone no other card matches").click();
  await fallback.getByLabel("Day rate").fill("300");
  await fallback.getByRole("button", { name: "Add card", exact: true }).click();
  await expect(page.getByRole("list", { name: "Not in a group" })).toContainText("Everyone else");

  // Ana has no employment type, so she gets the default card.
  const preview = page.getByRole("complementary", { name: "Who gets which card" });
  await preview.getByRole("combobox", { name: "Person" }).fill("Ana");
  await page.getByRole("option", { name: /Ana Pop/ }).click();
  await expect(preview).toContainText("Everyone else");
  await expect(preview).toContainText(/6,000\.00 a month, from the card's rate/);
  await expectNoA11yViolations(page);
});
