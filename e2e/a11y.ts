import AxeBuilder from "@axe-core/playwright";
import { type Page, expect } from "@playwright/test";

/**
 * Checks the page against WCAG 2.2 AA once entry animations have finished, so text that is
 * still fading in isn't reported as low contrast.
 */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running")
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  // Rule, element and reason for each violation, so a failure says what to fix.
  const found = results.violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} — ${n.failureSummary ?? v.help}`)
  );
  expect(found, "accessibility violations").toEqual([]);
}
