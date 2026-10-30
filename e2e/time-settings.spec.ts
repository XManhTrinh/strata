import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "settings need a larger screen");

test("an owner sets up time types, allowances, schedules and holidays", async ({
  page,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-t-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  const base = page.url().replace(/\/$/, "");
  const year = new Date().getFullYear();

  // Working time: the default calendar already has this year's holidays.
  await page.goto(`${base}/settings/working-time`);
  const holidays = page.getByRole("list", { name: `Holidays in ${year}` });
  await expect(holidays.getByRole("listitem").first()).toBeVisible();
  await expect(page.getByText(`Holidays until ${year + 2}`)).toBeVisible();

  // A part-time week.
  await page.getByRole("button", { name: "Add schedule" }).click();
  const schedule = page.getByRole("dialog", { name: "Add work schedule" });
  await schedule.getByLabel("Name").fill("Mon–Wed");
  await schedule.getByText("Thursday").click();
  await schedule.getByText("Friday").click();
  await schedule.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("list", { name: "Work schedules" })).toContainText("Mon–Wed");

  // A hand-made half-day holiday is kept as edited.
  await page.getByRole("button", { name: "Add holiday" }).click();
  const holiday = page.getByRole("dialog", { name: "Add holiday" });
  await holiday.getByLabel("Name").fill("Founders' afternoon");
  await holiday.getByText("Half day").click();
  await holiday.getByRole("button", { name: "Add" }).click();
  await expect(holidays).toContainText("Founders' afternoon");
  await expectNoA11yViolations(page);

  // A time type using an allowance, approved by HR.
  await page.goto(`${base}/settings/time-types`);
  await expect(page.getByRole("list", { name: "Time types" })).toContainText("Annual leave");
  await page.getByRole("button", { name: "Add time type" }).click();
  const type = page.getByRole("dialog", { name: "Add time type" });
  await type.getByLabel("Name").fill("Parental leave");
  await type.getByText("Uses an allowance").click();
  await type.getByText("Needs approval").click();
  await type.getByRole("button", { name: /Approver$/ }).click();
  await page.getByRole("option", { name: "A role" }).click();
  await type.getByRole("button", { name: /Approving role$/ }).click();
  await page.getByRole("option", { name: "HR" }).click();
  await expectNoA11yViolations(page);
  await type.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("list", { name: "Time types" })).toContainText("Approval by A role");

  // Its allowance policy.
  await page.goto(`${base}/settings/allowances`);
  await page.getByRole("button", { name: "Add policy" }).click();
  const policy = page.getByRole("dialog", { name: "Add allowance policy" });
  await policy.getByLabel("Name").fill("Parental leave");
  await policy.getByRole("button", { name: /Time type$/ }).click();
  await page.getByRole("option", { name: "Parental leave" }).click();
  await policy.getByLabel("Days a year").fill("10");
  await policy.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("list", { name: "Parental leave" })).toContainText("10 days a year");
  await expectNoA11yViolations(page);
});
