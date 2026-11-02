import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "settings need a larger screen");

test("someone asks to join through the link and an admin approves", async ({
  browser,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);

  // Ana switches on the join link.
  const ana = await (await browser.newContext()).newPage();
  await ana.goto("/sign-up");
  await completeSignUp(ana, "Ana Pop", `ana-jl-${id}@example.test`);
  await createWorkspace(ana, "Company", `Acme ${id}`);
  const base = ana.url().replace(/\/$/, "");
  await ana.goto(`${base}/settings/members`);
  await ana.getByRole("button", { name: "Create join link" }).click();
  const link = await ana.getByRole("textbox", { name: "Join link" }).inputValue();
  expect(link).toMatch(/\/join\/[0-9a-f]{64}$/);
  await expectNoA11yViolations(ana);

  // Cy opens it, signs up, and asks.
  const cy = await (await browser.newContext()).newPage();
  const joinPath = new URL(link).pathname;
  await cy.goto(joinPath);
  await expect(cy).toHaveURL(/\/sign-in/);
  await cy.goto(`/sign-up?next=${encodeURIComponent(joinPath)}`);
  await completeSignUp(cy, "Cy Radu", `cy-jl-${id}@example.test`);
  await cy.goto(joinPath);
  await expect(cy.getByRole("heading", { name: `Join Acme ${id}` })).toBeVisible();
  await cy.getByLabel("Message (optional)").fill("I'm in Finance");
  await cy.getByRole("button", { name: "Ask to join" }).click();
  await expect(cy.getByText(/Your request is waiting/)).toBeVisible();
  await expectNoA11yViolations(cy);

  // Ana sees it and approves.
  await ana.reload();
  const requests = ana.getByRole("list", { name: /Requests to join/ });
  await expect(requests).toContainText("I'm in Finance");
  await requests.getByRole("button", { name: "Approve" }).click();
  await expect(ana.getByText("Cy Radu joined")).toBeVisible();

  // Cy is in.
  await cy.reload();
  await expect(cy.getByText(`You're already a member of Acme ${id}.`)).toBeVisible();
  await cy.getByRole("link", { name: `Open Acme ${id}` }).click();
  await expect(cy).toHaveURL(new RegExp(`${new URL(base).pathname}$`));
});
