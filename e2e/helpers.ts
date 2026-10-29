import { type Page, expect } from "@playwright/test";
import { latestLinkFor } from "./mailpit";

const PASSWORD = "secret123";

/** A unique id per test run and Playwright project, for emails and workspace names. */
export function uniqueId(projectName: string): string {
  return `${Date.now()}-${projectName}`;
}

/** Signs up from the current sign-up form and follows the confirmation email. */
export async function completeSignUp(page: Page, fullName: string, email: string): Promise<void> {
  await page.getByLabel("Full name").fill(fullName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  await page.goto(await latestLinkFor(email));
}

/** Creates a workspace from the onboarding form and waits for its home page. */
export async function createWorkspace(page: Page, template: string, name: string): Promise<void> {
  await expect(page.getByRole("heading", { name: "Create a workspace" })).toBeVisible();
  await page.getByText(template, { exact: true }).click();
  await page.getByLabel("Workspace name").fill(name);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByRole("heading", { name: /^Welcome, / })).toBeVisible();
}
