import { type Page, expect } from "@playwright/test";
import { latestLinkFor } from "./mailpit";

const PASSWORD = "secret123";

/** A unique id per test run and Playwright project, for emails and workspace names. */
export function uniqueId(projectName: string): string {
  // Tests start in the same millisecond, so add a random part.
  return `${Date.now()}${Math.random().toString(36).slice(2, 6)}-${projectName}`;
}

/** The app's own address in emails (its NEXT_PUBLIC_SITE_URL), and where the tests run it. */
const SITE = "http://localhost:3000";
const TEST_SERVER = `http://localhost:${process.env.E2E_PORT ?? 3000}`;

/**
 * Opens a link from an email. Emails point at the app's site address; when the tests run their own
 * server on another port (E2E_PORT), the link's destination is moved there.
 */
export async function followEmailLink(page: Page, link: string): Promise<void> {
  if (TEST_SERVER === SITE) {
    await page.goto(link);
    return;
  }
  // Redirects during a navigation can't be rerouted, so read where the link sends us first.
  const response = await page.request.get(link, { maxRedirects: 0 });
  const location = response.headers()["location"];
  await page.goto(location ? location.replace(SITE, TEST_SERVER) : link);
}

/** Signs up from the current sign-up form and follows the confirmation email. */
export async function completeSignUp(page: Page, fullName: string, email: string): Promise<void> {
  await page.getByLabel("Full name").fill(fullName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  await followEmailLink(page, await latestLinkFor(email));
}

/** Creates a workspace from the onboarding form and waits for its home page. */
export async function createWorkspace(page: Page, template: string, name: string): Promise<void> {
  await expect(page.getByRole("heading", { name: "Create a workspace" })).toBeVisible();
  await page.getByText(template, { exact: true }).click();
  await page.getByLabel("Workspace name").fill(name);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByRole("heading", { name: /^Welcome, / })).toBeVisible();
}

/**
 * Chooses a file in a file trigger, again if needed: before the page's script loads, a file chosen
 * this way isn't read yet (a person can't choose one that fast).
 */
export async function chooseFile(
  page: Page,
  file: Parameters<Page["setInputFiles"]>[1],
  readText: string | RegExp
): Promise<void> {
  const input = page.locator('input[type="file"]');
  await expect(async () => {
    // Choosing the same file again fires no change, so clear the input first.
    await input.setInputFiles([]);
    await input.setInputFiles(file);
    await expect(page.getByText(readText)).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20_000 });
}
