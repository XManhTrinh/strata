import { type Page, expect, test } from "@playwright/test";
import { chooseFile, completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "imports need a larger screen");

/** Chooses a file and maps the Team column to the Team level. */
async function chooseAndMap(page: Page, file: Parameters<Page["setInputFiles"]>[1]) {
  await chooseFile(page, file, / rows?, \d+ columns?$/);
  await page.getByRole("button", { name: "Next: columns" }).click();
  await page.getByRole("button", { name: /Team$/ }).last().click();
  await page.getByRole("option", { name: "Team", exact: true }).click();
}

test("an Excel import, then a re-import with a move and a leaver, resumed", async ({
  page,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-r-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  const base = page.url().replace(/\/$/, "");

  await page.goto(`${base}/settings/hierarchy`);
  await page.getByRole("button", { name: "Add level" }).click();
  await page.getByRole("dialog", { name: "Add level" }).getByLabel("Name").fill("Team");
  await page
    .getByRole("dialog", { name: "Add level" })
    .getByRole("button", { name: "Add" })
    .click();
  await expect(page.getByText("Level added")).toBeVisible();

  // First import, from Excel: Bo and Cy in Squad A.
  await page.goto(`${base}/people/import`);
  await chooseAndMap(page, "e2e/fixtures/people.xlsx");
  await page.getByRole("button", { name: "Next: preview" }).click();
  await expect(page.getByRole("definition").nth(0)).toHaveText("2");
  await page.getByRole("button", { name: "Apply import" }).click();
  await expect(page.getByText("2 added, 0 changed, 0 marked as leaving.")).toBeVisible({
    timeout: 30_000,
  });

  // Re-import: Cy moves to Squad B, Bo isn't in the file and leaves.
  await page.getByRole("button", { name: "Import another file" }).click();
  await chooseAndMap(page, {
    name: "people-2.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Employee ID,Full Name,Team\nE-2,Cy Radu,Squad B\n"),
  });
  await page.getByText("Mark people missing from the file as leaving").click();
  await page.getByRole("button", { name: "Next: preview" }).click();
  const counts = page.getByRole("definition");
  await expect(counts.nth(1)).toHaveText("1");
  await expect(counts.nth(3)).toHaveText("1");
  await expect(page.getByText("1 person not in the file will be marked as leaving.")).toBeVisible();

  // Leave before applying; the import waits to be resumed.
  await page.reload();
  await expect(page.getByRole("list", { name: "Unfinished imports" })).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(counts.nth(3)).toHaveText("1");
  await page.getByRole("button", { name: "Apply import" }).click();
  await expect(page.getByText("0 added, 1 changed, 1 marked as leaving.")).toBeVisible({
    timeout: 30_000,
  });

  // Cy is in Squad B. Bo joined today, so he leaves today (never before his first day).
  await page.goto(`${base}/people`);
  const table = page.getByRole("grid", { name: "People" });
  await expect(table.getByRole("row", { name: /Cy Radu/ })).toContainText("Squad B");
  await table.getByRole("row", { name: /Bo Ionescu/ }).click();
  await expect(page.getByText(/^Leaves on /)).toBeVisible();
});
