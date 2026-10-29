import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "settings need a larger screen");

test("an owner adds custom fields and a choice field's options", async ({ page }, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-f-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  await page.goto(page.url().replace(/\/?$/, "/settings/fields"));
  await expect(page.getByRole("heading", { name: "Custom fields", level: 2 })).toBeVisible();

  // A sensitive single-choice field; the key follows the label.
  await page.getByRole("button", { name: "Add field" }).click();
  const add = page.getByRole("dialog", { name: "Add custom field" });
  await add.getByLabel("Label").fill("Capex or Opex");
  await expect(add.getByLabel("Key")).toHaveValue("capex_or_opex");
  await add.getByRole("button", { name: /Type$/ }).click();
  await page.getByRole("option", { name: "Single choice" }).click();
  await add.getByRole("switch", { name: "Sensitive" }).press("Space");
  await expectNoA11yViolations(page);
  await add.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Capex or Opex added")).toBeVisible();

  const fields = page.getByRole("list", { name: "Custom fields" });
  await expect(fields.getByRole("listitem")).toContainText("Single choice · Sensitive");

  // Options, added one after another.
  await page.getByRole("button", { name: "Actions for Capex or Opex" }).click();
  await page.getByRole("menuitem", { name: "Options" }).click();
  const options = page.getByRole("dialog", { name: "Options for Capex or Opex" });
  for (const option of ["Capex", "Opex"]) {
    await options.getByLabel("New option").fill(option);
    await options.getByRole("button", { name: "Add option" }).click();
    await expect(options.getByRole("list", { name: "Options" })).toContainText(option);
  }
  await expect(options.getByLabel("New option")).toHaveValue("");
  await options.getByRole("button", { name: "Done" }).click();
  await expect(fields.getByRole("listitem")).toContainText("Capex, Opex");

  // Editing keeps the key.
  await page.getByRole("button", { name: "Actions for Capex or Opex" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: "Edit custom field" });
  await expect(edit.getByText("Key: capex_or_opex")).toBeVisible();
  await edit.getByLabel("Label").fill("Cost type");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Cost type saved")).toBeVisible();
  await expectNoA11yViolations(page);
});
