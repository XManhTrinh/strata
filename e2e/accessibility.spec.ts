import { expect, test } from "@playwright/test";
import { a11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, openRow, uniqueId } from "./helpers";

test.setTimeout(240_000);

const SETTINGS = [
  "general",
  "members",
  "roles",
  "hierarchy",
  "jobs",
  "fields",
  "time-types",
  "allowances",
  "working-time",
  "planning",
  "features",
  "personal-data",
  "audit",
];

// Every screen of a new Company workspace, at each width; one report of everything found.
test("every screen meets WCAG 2.2 AA", async ({ page }, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  const report: string[] = [];
  const check = async (url: string) => {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    for (const found of await a11yViolations(page)) report.push(`${url} ${found}`);
  };

  for (const url of ["/", "/sign-in", "/sign-up", "/forgot-password", "/help", "/legal/terms"]) {
    await check(url);
  }

  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-a11y-${id}@example.test`);
  await check("/onboarding");
  await createWorkspace(page, "Company", `Acme ${id}`);
  const base = new URL(page.url()).pathname.replace(/\/$/, "");

  await page.goto(`${base}/people`);
  if ((page.viewportSize()?.width ?? 0) >= 600) {
    await openRow(page, page.getByRole("row", { name: /Ana Pop/ }), /\/people\/[0-9a-f-]{36}$/);
    await check(new URL(page.url()).pathname);
  }

  for (const url of [
    base,
    `${base}/people`,
    `${base}/people/import`,
    `${base}/org-chart`,
    `${base}/time-off`,
    `${base}/time-off?tab=mine`,
    `${base}/time-off?tab=calendar`,
    `${base}/planning/scenarios`,
    `${base}/planning/rate-cards`,
    `${base}/planning/totals`,
    `${base}/planning/compare`,
    `${base}/settings`,
    ...SETTINGS.map((section) => `${base}/settings/${section}`),
    "/account/profile",
    "/account/notifications",
  ]) {
    await check(url);
  }

  expect(report, "accessibility violations").toEqual([]);
});
