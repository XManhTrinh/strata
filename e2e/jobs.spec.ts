import { type Page, expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "settings need a larger screen");

async function addFromDialog(
  page: Page,
  button: string,
  dialogName: string,
  fill: () => Promise<void>
) {
  await page.getByRole("button", { name: button }).click();
  await expect(page.getByRole("dialog", { name: dialogName })).toBeVisible();
  await fill();
  await page.getByRole("dialog", { name: dialogName }).getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("dialog", { name: dialogName })).toHaveCount(0);
}

async function choose(page: Page, label: RegExp, option: string) {
  await page.getByRole("button", { name: label }).click();
  // Options are named by their label, then any description.
  await page.getByRole("option", { name: new RegExp(`^${option}`) }).click();
}

test("an owner sets up career levels, positions and employment types", async ({
  page,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-j-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  await page.goto(page.url().replace(/\/?$/, "/settings/jobs"));
  await expect(page.getByRole("heading", { name: "Jobs", level: 2 })).toBeVisible();

  // Career levels: two on the individual contributor track, one on management.
  for (const [name, track] of [
    ["Engineer", "IC"],
    ["Senior engineer", "IC"],
    ["Engineering manager", "Management"],
  ] as const) {
    await addFromDialog(page, "Add level", "Add career level", async () => {
      const dialog = page.getByRole("dialog", { name: "Add career level" });
      await dialog.getByLabel("Name").fill(name);
      await dialog.getByLabel("Track").fill(track);
    });
    await expect(page.getByText(`${name} added`)).toBeVisible();
  }
  await expect(page.getByRole("list", { name: "IC" }).getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("list", { name: "Management" }).getByRole("listitem")).toHaveCount(1);

  // A position spanning the IC track; the highest level only offers that track.
  await addFromDialog(page, "Add position", "Add position", async () => {
    const dialog = page.getByRole("dialog", { name: "Add position" });
    await dialog.getByLabel("Name").fill("Software engineer");
    await choose(page, /Lowest level$/, "IC · Engineer");
    await page.getByRole("button", { name: /Highest level$/ }).click();
    await expect(
      page.getByRole("option", { name: "Management · Engineering manager" })
    ).toHaveCount(0);
    await page.getByRole("option", { name: "IC · Senior engineer" }).click();
  });
  const positions = page.getByRole("grid", { name: "Positions" });
  await expect(positions.getByRole("row", { name: /Software engineer/ })).toContainText(
    "IC · Engineer – IC · Senior engineer"
  );

  // Employment types: Company starts with Employee and Contractor; add Intern on a day rate.
  const types = page.getByRole("list", { name: "Employment types" });
  await expect(types.getByRole("listitem")).toHaveCount(2);
  await addFromDialog(page, "Add type", "Add employment type", async () => {
    await page
      .getByRole("dialog", { name: "Add employment type" })
      .getByLabel("Name")
      .fill("Intern");
    await choose(page, /Cost$/, "Day rate");
  });
  await expect(types.getByRole("listitem").last()).toContainText("Intern");
  await expect(types.getByRole("listitem").last()).toContainText("Day rate");

  // Reorder and archive.
  await page.getByRole("button", { name: "Actions for Intern" }).click();
  await page.getByRole("menuitem", { name: "Move up" }).click();
  await expect(page.getByText("Order saved")).toBeVisible();
  await expect(types.getByRole("listitem").nth(1)).toContainText("Intern");
  await page.getByRole("button", { name: "Actions for Intern" }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await expect(types.getByRole("listitem").nth(1)).toContainText("Archived");

  await expectNoA11yViolations(page);
});
