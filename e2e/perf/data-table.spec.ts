import { expect, test } from "@playwright/test";

/**
 * Nightly benchmark of the real DataTable at its client-mode limit (5,000 rows held in the
 * browser): sorting, searching and changing pages, against the product targets. Run with
 * PERF=1 against a production build (`STRATA_DEV_PAGES=1 pnpm start`).
 */

test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, "measured on desktop only");

const TARGETS = { sortMs: 300, searchMs: 300, pageMs: 100 };

test("DataTable at 5,000 rows sorts, searches and pages within target", async ({ page }) => {
  await page.goto("/components/data-table?count=5000");
  const table = page.getByRole("grid", { name: "Demo people" });
  await expect(table.getByRole("row").nth(1)).toBeVisible();
  await expect(page.getByText("1–50 of 5,000")).toBeVisible();

  // Each action is timed in the page, from the input to the rows changing.
  const timed = (action: string) =>
    page.evaluate(async (what) => {
      // The last row group is the body; the first is the header.
      const groups = document.querySelectorAll('[role="grid"] [role="rowgroup"]');
      const body = groups[groups.length - 1]!;
      const before = body.textContent;
      const start = performance.now();
      if (what === "sort") {
        const headers = [...document.querySelectorAll<HTMLElement>('[role="columnheader"]')];
        headers.find((h) => h.textContent?.trim().startsWith("Name"))!.click();
      } else if (what === "page") {
        (document.querySelector('button[aria-label="Next page"]') as HTMLElement).click();
      } else {
        const input = document.querySelector('input[type="search"]') as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
        setter.call(input, "Ana Pop 12");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      await new Promise<void>((resolve) => {
        const check = () =>
          body.textContent !== before ? resolve() : requestAnimationFrame(check);
        check();
      });
      return performance.now() - start;
    }, action);

  const sortMs = await timed("sort");
  const pageMs = await timed("page");
  const searchMs = await timed("search");
  const result = {
    sortMs: Math.round(sortMs),
    pageMs: Math.round(pageMs),
    searchMs: Math.round(searchMs),
  };
  console.log("DATATABLE", JSON.stringify(result));
  await test.info().attach("data-table.json", {
    body: JSON.stringify({ result, targets: TARGETS }, null, 2),
    contentType: "application/json",
  });

  expect.soft(sortMs).toBeLessThan(TARGETS.sortMs);
  expect.soft(pageMs).toBeLessThan(TARGETS.pageMs);
  expect.soft(searchMs).toBeLessThan(TARGETS.searchMs);
});
