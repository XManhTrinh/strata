import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "settings need a larger screen");

test("an owner builds the hierarchy: levels, units, moves and archiving", async ({
  page,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-h-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  await page.goto(page.url().replace(/\/?$/, "/settings/hierarchy"));
  await expect(page.getByRole("heading", { name: "Hierarchy", level: 2 })).toBeVisible();

  // Levels from the top down.
  for (const name of ["Division", "Team"]) {
    await page.getByRole("button", { name: "Add level" }).click();
    const dialog = page.getByRole("dialog", { name: "Add level" });
    await dialog.getByLabel("Name").fill(name);
    await dialog.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("Level added")).toBeVisible();
  }
  const levels = page.getByRole("list", { name: "Levels" });
  await expect(levels.getByRole("listitem")).toHaveCount(2);

  // Units: Engineering (division) under the root, Platform (team) under Engineering.
  async function addUnit(parent: string, name: string, level: string) {
    await page.getByRole("button", { name: `Actions for ${parent}` }).click();
    await page.getByRole("menuitem", { name: "Add sub-unit" }).click();
    const dialog = page.getByRole("dialog", { name: "Add unit" });
    await dialog.getByLabel("Name").fill(name);
    await dialog.getByRole("button", { name: /^Level/ }).click();
    await page.getByRole("option", { name: level }).click();
    await dialog.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(`${name} added`)).toBeVisible();
  }
  await addUnit(`Acme ${id}`, "Engineering", "Division");
  await addUnit("Engineering", "Platform", "Team");
  const units = page.getByRole("treegrid", { name: "Units" });
  await expect(units.getByRole("row", { name: /Platform/ })).toBeVisible();
  await expectNoA11yViolations(page);

  // Levels can't be reversed: Team above Division would put Platform above Engineering.
  await page.getByRole("button", { name: "Actions for Team" }).click();
  await page.getByRole("menuitem", { name: "Move up" }).click();
  await expect(page.getByText(/at or above the level of the unit it sits under/)).toBeVisible();

  // Archiving needs the sub-units archived first.
  await page.getByRole("button", { name: "Actions for Engineering" }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await expect(page.getByText("Archive or move the sub-units first.")).toBeVisible();
  await page.getByRole("button", { name: "Actions for Platform" }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await expect(page.getByText("Platform archived")).toBeVisible();
  await expect(units.getByRole("row", { name: /Platform/ })).toHaveCount(0);
  await page.getByText("Show archived").click();
  await expect(units.getByRole("row", { name: /Platform/ })).toContainText("Archived");

  // Edit: rename Engineering and give it a code.
  await page.getByRole("button", { name: "Actions for Engineering" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: "Edit unit" });
  await edit.getByLabel("Name").fill("Technology");
  await edit.getByLabel("Code").fill("CC-100");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Technology saved")).toBeVisible();
  await expect(units.getByRole("row", { name: /Technology/ })).toContainText("CC-100");
});
