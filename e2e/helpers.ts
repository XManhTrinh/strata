import { type Locator, type Page, expect } from "@playwright/test";
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
  // A link to the app itself (an invitation) goes straight to the test server.
  if (link.startsWith(SITE)) {
    await page.goto(link.replace(SITE, TEST_SERVER));
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

/**
 * A settings section's link: in the navigation rail's panel from 600px, or in the page's list
 * on phones (each hidden at the other size).
 */
export function settingsSection(page: Page, name: string) {
  return page
    .getByRole("navigation", { name: "Settings" })
    .getByRole("link", { name: new RegExp(`^${name}`) });
}

/** Opens a Planning screen: from the rail's panel, or its tab on phones. */
export async function openPlanning(page: Page, name: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Planning" })
    .getByRole("link", { name })
    .or(page.getByRole("tab", { name }))
    .first()
    .click();
}

/**
 * Opens a table row, again if needed: before the page's script loads, a click on a row isn't
 * handled yet (slow machines, such as CI, show it).
 */
export async function openRow(page: Page, row: Locator, url: RegExp): Promise<void> {
  await expect(async () => {
    await row.click();
    await expect(page).toHaveURL(url, { timeout: 2000 });
  }).toPass({ timeout: 20_000 });
}

/** Picks an option from a dropdown (a Windmorph Select, searchable or not) by its label. */
export async function pickOption(
  scope: Page | Locator,
  label: string,
  option: string
): Promise<void> {
  const page = "page" in scope ? scope.page() : scope;
  await scope
    .getByRole("button", { name: new RegExp(`${label}$`) })
    .last()
    .click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
