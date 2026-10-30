import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test("a planner creates and copies scenarios, takes one through approval, and compares them", async ({
  page,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-s-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  const base = page.url().replace(/\/$/, "");

  // Planning opens on scenarios.
  await page.goto(`${base}/planning`);
  await expect(page.getByRole("heading", { name: "No scenarios yet" })).toBeVisible();
  await page.getByRole("button", { name: "New scenario" }).click();
  const create = page.getByRole("dialog", { name: "New scenario" });
  await create.getByLabel("Name").fill("Plan A");
  await expectNoA11yViolations(page);
  await create.getByRole("button", { name: "Create" }).click();
  // Rows open their scenario, so the list is a grid of rows.
  const list = page.getByRole("grid", { name: "Scenarios" });
  await expect(list.getByRole("row")).toContainText("Plan A");
  await expect(list).toContainText("Costs not applied yet");

  const actions = (name: string) => page.getByRole("button", { name: `Actions for ${name}` });
  const choose = async (scenario: string, action: string, done: string) => {
    await actions(scenario).click();
    await page.getByRole("menuitem", { name: action }).click();
    await expect(page.getByText(done)).toBeVisible();
  };

  // A copy to try changes in.
  await actions("Plan A").click();
  await page.getByRole("menuitem", { name: "Copy" }).click();
  const copy = page.getByRole("dialog", { name: "Copy scenario" });
  await expect(copy.getByLabel("Name")).toHaveValue("Copy of Plan A");
  await copy.getByLabel("Name").fill("Plan B");
  await copy.getByRole("button", { name: "Copy" }).click();
  await expect(list).toContainText("Copied from Plan A");

  // Costs, then submit, approve and make live.
  await choose("Plan A", "Apply rate cards", "Costs applied to Plan A");
  await choose("Plan A", "Submit for approval", "Plan A submitted");
  await choose("Plan A", "Approve", "Plan A approved");
  await choose("Plan A", "Make live", "Plan A is the live plan");
  await expect(list.getByRole("row").first()).toContainText("Live");
  await actions("Plan A").click();
  await expect(page.getByRole("menuitem", { name: "Delete" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expectNoA11yViolations(page);

  // Side by side: the copy has the same people.
  await page.getByRole("tab", { name: "Compare" }).click();
  await expect(page.getByRole("heading", { name: "Compare scenarios" })).toBeVisible();
  await expect(page.getByText(/^Second scenario: 0 FTE/)).toBeVisible();
  await expectNoA11yViolations(page);

  // Totals open on the live plan, and export as CSV.
  await page.getByRole("tab", { name: "Totals" }).click();
  // A table, or a list on phones.
  const totals = page.getByLabel("Plan A totals");
  await expect(totals).toContainText(`Acme ${id}`);
  await expectNoA11yViolations(page);
  const exportHref = await page.getByRole("link", { name: "Export CSV" }).getAttribute("href");
  const csv = await page.request.get(exportHref!);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain(`Acme ${id},1,`);
});
