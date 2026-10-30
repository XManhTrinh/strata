import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, "plans are edited on desktop");

test("a planner edits time in the grid, adds a planned role and fills it", async ({
  page,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-g-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  const base = page.url().replace(/\/$/, "");

  await page.goto(`${base}/planning/scenarios`);
  await page.getByRole("button", { name: "New scenario" }).click();
  await page.getByRole("dialog", { name: "New scenario" }).getByLabel("Name").fill("Plan");
  await page
    .getByRole("dialog", { name: "New scenario" })
    .getByRole("button", { name: "Create" })
    .click();
  await page.getByText("Plan", { exact: true }).click();

  // Ana starts at full time this month; half time is saved with the grid.
  const grid = page.getByRole("grid", { name: "Plan: time by team and month" });
  const cell = grid.getByRole("gridcell", { name: /^Ana Pop, .*: 1$/ }).first();
  await cell.click();
  await page.keyboard.type("0.5");
  await page.keyboard.press("Enter");
  await expect(page.getByText("1 change not saved")).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("1 change saved")).toBeVisible();
  await expect(
    grid.getByRole("gridcell", { name: /^Ana Pop, .*: 0\.5, under full time$/ })
  ).toHaveCount(1);

  // A vacancy, then filled by Ana.
  await page.getByRole("button", { name: "Add planned role" }).click();
  const role = page.getByRole("dialog", { name: "Add planned role" });
  await role.getByLabel("Title").fill("Engineer");
  await role.getByLabel("FTE").fill("0.5");
  await role.getByRole("button", { name: "Add", exact: true }).click();
  await expect(grid.getByRole("rowheader", { name: /Engineer/ })).toContainText("Open role");

  await page.getByRole("button", { name: "Actions for Engineer" }).click();
  await page.getByRole("menuitem", { name: "Fill with a person" }).click();
  const fill = page.getByRole("dialog", { name: "Fill Engineer" });
  await fill.getByRole("combobox", { name: "Person" }).fill("Ana");
  await page.getByRole("option", { name: /Ana Pop/ }).click();
  await fill.getByRole("button", { name: "Fill", exact: true }).click();
  // Filled from its first month, all its time is Ana's: half time plus half time.
  await expect(grid.getByRole("rowheader", { name: /Engineer/ })).toHaveCount(0);
  await expect(grid.getByRole("gridcell", { name: /^Ana Pop, .*: 1$/ }).first()).toBeVisible();
  await expectNoA11yViolations(page);

  // Another vacancy; once the plan is live, the org chart shows it as an open role.
  await page.getByRole("button", { name: "Add planned role" }).click();
  await page.getByRole("dialog", { name: "Add planned role" }).getByLabel("Title").fill("Designer");
  await page
    .getByRole("dialog", { name: "Add planned role" })
    .getByRole("button", { name: "Add", exact: true })
    .click();
  await expect(grid.getByRole("rowheader", { name: /Designer/ })).toContainText("Open role");
  await page.getByRole("link", { name: "Scenarios" }).click();
  for (const [action, done] of [
    ["Submit for approval", "Plan submitted"],
    ["Approve", "Plan approved"],
    ["Make live", "Plan is the live plan"],
  ] as const) {
    await page.getByRole("button", { name: "Actions for Plan" }).click();
    await page.getByRole("menuitem", { name: action }).click();
    await expect(page.getByText(done)).toBeVisible();
  }
  await page.goto(`${base}/org-chart?view=units`);
  await expect(page.getByText("1 open role")).toBeVisible();
  await page.getByRole("link", { name: new RegExp(` in Acme ${id}$`) }).click();
  await expect(page.getByRole("list", { name: `Open roles in Acme ${id}` })).toContainText(
    "Designer"
  );
  await expectNoA11yViolations(page);
});
