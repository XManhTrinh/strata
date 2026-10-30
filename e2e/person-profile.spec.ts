import { type Page, expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "editing people needs a larger screen");

/** Types a date into a Material 3 date field (en-US: MM/DD/YYYY) and commits it. */
async function fillDate(page: Page, label: string, iso: string) {
  const [year, month, day] = iso.split("-");
  const field = page.getByRole("textbox", { name: new RegExp(`^${label}`) });
  await field.fill(`${month}/${day}/${year}`);
  await field.press("Tab");
}

test("an owner adds a person and changes their job, pay and end date", async ({
  page,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-pp-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  await page.getByRole("link", { name: "People" }).first().click();

  // Add Bo, managed by Ana.
  await page.getByRole("button", { name: "Add person" }).click();
  const add = page.getByRole("dialog", { name: "Add person" });
  await add.getByLabel("Full name").fill("Bo Ionescu");
  await add.getByLabel("Person key").fill("E-42");
  await add.getByRole("combobox", { name: "Manager" }).fill("Ana");
  await page.getByRole("option", { name: /^Ana Pop/ }).click();
  await add.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("heading", { name: "Bo Ionescu", level: 1 })).toBeVisible();
  await expect(page.getByRole("list", { name: "Job" })).toContainText("Ana Pop");
  await expectNoA11yViolations(page);

  // Saving the job as it is changes nothing, and says so.
  await page.getByRole("button", { name: "Change job" }).click();
  const same = page.getByRole("dialog", { name: "Change job" });
  await same.getByRole("button", { name: "Save" }).click();
  await expect(same.getByText(/^Nothing changed/)).toBeVisible();
  await same.getByRole("button", { name: "Cancel" }).click();

  // A move scheduled next year shows in the history.
  const nextYear = `${new Date().getUTCFullYear() + 1}-03-01`;
  await page.getByRole("button", { name: "Change job" }).click();
  const job = page.getByRole("dialog", { name: "Change job" });
  await fillDate(page, "From", nextYear);
  await job.getByRole("button", { name: "Clear Manager" }).click();
  await job.getByRole("combobox", { name: "Manager" }).press("Tab");
  await job.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Job changed")).toBeVisible();
  await page.getByRole("tab", { name: "History" }).click();
  const history = page.getByRole("list", { name: "Job" });
  await expect(history.getByRole("listitem")).toHaveCount(2);
  await expect(history.getByRole("listitem").first()).toContainText("Scheduled");

  // Pay.
  await page.getByRole("tab", { name: "Pay" }).click();
  await page.getByRole("button", { name: "Change pay" }).click();
  const pay = page.getByRole("dialog", { name: "Change pay" });
  await pay.getByLabel("Annual salary").fill("52000");
  await pay.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Pay changed")).toBeVisible();
  await expect(page.getByRole("list", { name: "Pay" })).toContainText("52,000");

  // End date.
  await page.getByRole("button", { name: "Actions" }).click();
  await page.getByRole("menuitem", { name: "Set end date" }).click();
  await fillDate(page, "Last day", nextYear);
  await page
    .getByRole("dialog", { name: "End date" })
    .getByRole("button", { name: "Save" })
    .click();
  await expect(page.getByText(/^Leaves on /)).toBeVisible();
  await expectNoA11yViolations(page);
});
