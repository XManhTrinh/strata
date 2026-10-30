import { type Page, expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

async function addPerson(page: Page, base: string, name: string, manager: string) {
  await page.goto(`${base}/people`);
  await page.getByRole("button", { name: "Add person" }).click();
  const dialog = page.getByRole("dialog", { name: "Add person" });
  await dialog.getByLabel("Full name").fill(name);
  await dialog.getByRole("combobox", { name: "Manager" }).fill(manager.split(" ")[0]!);
  await page.getByRole("option", { name: new RegExp(`^${manager}`) }).click();
  await dialog.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
}

test("the org chart shows reporting lines, dates and units", async ({
  page,
  viewport,
}, testInfo) => {
  const phone = (viewport?.width ?? 0) < 600;
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-o-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  const base = page.url().replace(/\/$/, "");

  // Adding people happens on larger screens; phones read the chart.
  if (!phone) {
    await addPerson(page, base, "Bo Ionescu", "Ana Pop");
    await addPerson(page, base, "Cy Radu", "Bo Ionescu");
  }

  await page.goto(base);
  await page.getByRole("link", { name: "Org chart" }).first().click();
  await expect(page).toHaveURL(/\/org-chart/);

  if (phone) {
    // The person view: Ana, with no one reporting to her yet.
    await expect(page.getByRole("heading", { name: "Ana Pop", level: 2 })).toBeVisible();
    await expect(page.getByText("No direct reports")).toBeVisible();
    await expectNoA11yViolations(page);
    return;
  }

  // Opens on Ana, two levels deep.
  const chart = page.getByRole("application").or(page.locator(".react-flow")).first();
  await expect(chart.getByText("Bo Ionescu")).toBeVisible();
  await expect(chart.getByText("Cy Radu")).toBeVisible();

  // Collapse and expand Bo's branch.
  await page.getByRole("button", { name: "Hide Bo Ionescu's reports" }).click();
  await expect(chart.getByText("Cy Radu")).toHaveCount(0);
  await page.getByRole("button", { name: "Show Bo Ionescu's 1 report" }).click();
  await expect(chart.getByText("Cy Radu")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("chart.png") });
  await expectNoA11yViolations(page);

  // Before anyone started, there's no one to show.
  const lastYear = `${new Date().getUTCFullYear() - 1}-01-01`;
  await page.goto(`${page.url().split("?")[0]}?date=${lastYear}`);
  await expect(page.getByText("No one to show on this date")).toBeVisible();

  // Units: everyone is in the root unit.
  await page.goto(`${base}/org-chart?view=units`);
  await expect(page.getByRole("treegrid", { name: "Units" })).toContainText("3 people");
  await page.getByRole("link", { name: `People in Acme ${id}` }).click();
  await expect(page.getByRole("list", { name: `People in Acme ${id}` })).toContainText("Cy Radu");
});
