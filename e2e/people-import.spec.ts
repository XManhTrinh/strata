import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { chooseFile, completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "imports need a larger screen");

const CSV = [
  "Employee ID,Full Name,Email,Team,Line Manager ID",
  "E-1,Bo Ionescu,bo@acme.test,Squad A,",
  "E-2,Cy Radu,cy@acme.test,Squad A,E-1",
  "E-3,,not-an-email,Squad B,",
].join("\n");

test("an importer maps, previews and applies a people file", async ({ page }, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-i-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  const base = page.url().replace(/\/$/, "");

  // One hierarchy level to import teams into.
  await page.goto(`${base}/settings/hierarchy`);
  await page.getByRole("button", { name: "Add level" }).click();
  await page.getByRole("dialog", { name: "Add level" }).getByLabel("Name").fill("Team");
  await page
    .getByRole("dialog", { name: "Add level" })
    .getByRole("button", { name: "Add" })
    .click();
  await expect(page.getByText("Level added")).toBeVisible();

  await page.goto(`${base}/people`);
  await page.getByRole("link", { name: "Import" }).click();
  await expect(page).toHaveURL(/\/people\/import$/);

  // The file is read in the browser.
  await chooseFile(
    page,
    { name: "people.csv", mimeType: "text/csv", buffer: Buffer.from(CSV) },
    "people.csv: 3 rows, 5 columns"
  );
  await page.getByRole("button", { name: "Next: columns" }).click();

  // Columns were guessed from the headers; the Team column feeds the Team level.
  await expect(page.getByRole("button", { name: /Employee ID Person key$/ })).toBeVisible();
  await page.getByRole("button", { name: /Team$/ }).last().click();
  await page.getByRole("option", { name: "Team", exact: true }).click();
  await expectNoA11yViolations(page);
  await page.getByRole("button", { name: "Next: preview" }).click();

  // Preview: two new people, one row skipped with its reasons.
  const counts = page.getByRole("definition");
  await expect(page.getByRole("heading", { name: "What will happen" })).toBeVisible();
  await expect(counts.nth(0)).toHaveText("2");
  await expect(counts.nth(4)).toHaveText("1");
  await expect(page.getByRole("grid", { name: "Rows with errors" })).toContainText(
    "New people need a name"
  );
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Apply import" }).click();
  await expect(page.getByText("Import applied")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("2 added, 0 changed, 0 marked as leaving.")).toBeVisible();

  // The people are there, in their team, with Cy reporting to Bo.
  await page.getByRole("link", { name: "Go to people" }).click();
  const table = page.getByRole("grid", { name: "People" });
  await expect(table.getByRole("row", { name: /Cy Radu/ })).toContainText("Squad A");
  await expect(table.getByRole("row", { name: /Cy Radu/ })).toContainText("Bo Ionescu");
});
