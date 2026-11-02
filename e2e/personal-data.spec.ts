import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, settingsSection, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "managing people needs a larger screen");

test("an owner downloads and erases a person's data", async ({ page }, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-g-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  const base = page.url().replace(/\/$/, "");

  await page.goto(`${base}/people`);
  await page.getByRole("button", { name: "Add person" }).click();
  await page.getByRole("dialog", { name: "Add person" }).getByLabel("Full name").fill("Bo Ionescu");
  await page
    .getByRole("dialog", { name: "Add person" })
    .getByRole("button", { name: "Add" })
    .click();
  await expect(page.getByRole("heading", { name: "Bo Ionescu", level: 1 })).toBeVisible();

  // Everything about Bo, as a file.
  const data = await page.request.get(`${page.url()}/data`);
  expect((await data.json()).person.name).toBe("Bo Ionescu");

  // Erasing asks for a reason and leaves a former employee.
  await page.getByRole("button", { name: "Actions" }).click();
  await page.getByRole("menuitem", { name: "Erase person…" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Erase Bo Ionescu?" });
  await expect(dialog.getByRole("button", { name: "Erase" })).toBeDisabled();
  await dialog.getByLabel("Reason").fill("Asked to be forgotten");
  await expectNoA11yViolations(page);
  await dialog.getByRole("button", { name: "Erase" }).click();
  await expect(page.getByRole("heading", { name: "Former employee", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Actions" })).toHaveCount(0);

  // Settings lists the erasure and keeps the retention rules.
  await page.goto(`${base}/settings`);
  await settingsSection(page, "Personal data").click();
  await expect(page.getByRole("list", { name: "Recent erasures" })).toContainText(
    "Asked to be forgotten"
  );
  const notifications = page.getByLabel("Remove notifications after (months)");
  await notifications.fill("0");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Enter a whole number in the range shown")).toBeVisible();
  await notifications.fill("");
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Retention rules saved")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Remove notifications after (months)")).toHaveValue("");
});

test("someone downloads their data and deletes their account", async ({ page }, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  const email = `cy-g-${id}@example.test`;
  await page.goto("/sign-up");
  await completeSignUp(page, "Cy Radu", email);
  await createWorkspace(page, "Personal", `Cy ${id}`);

  await page.goto("/account/profile");
  const mine = await page.request.get("/account/data");
  expect((await mine.json()).workspaces).toHaveLength(1);

  await page.getByRole("button", { name: "Delete my account" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete your account?" });
  await expect(dialog).toContainText(`Cy ${id}`);
  await expectNoA11yViolations(page);
  await dialog.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
});
