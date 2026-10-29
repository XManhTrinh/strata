import { type Page, expect, test } from "@playwright/test";

// Run against a production build: STRATA_DEV_PAGES=1 pnpm start, then PERF=1 pnpm test:e2e e2e/perf
test.skip(({ viewport }) => (viewport?.width ?? 0) < 1200, "measured at desktop size");

test.setTimeout(120_000);

const step = (label: string) => console.log(`STEP ${label} ${Math.round(performance.now())}`);

const TARGETS = { firstRowsMs: 100, frameP95Ms: 1000 / 60 + 1, sortMs: 300, keystrokeMs: 16 };

/** Scrolls an element top to bottom over ~3 seconds, one step per frame, and returns frame times. */
async function scrollFrames(
  page: Page,
  selector: string
): Promise<{ p95: number; avgFps: number }> {
  return page.evaluate(async (sel) => {
    const element = document.querySelector<HTMLElement>(sel)!;
    const steps = 180;
    const times: number[] = [];
    let last = performance.now();
    await new Promise<void>((resolve) => {
      let i = 0;
      const step = () => {
        const now = performance.now();
        times.push(now - last);
        last = now;
        element.scrollTop = (element.scrollHeight * i) / steps;
        i += 1;
        if (i <= steps) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    const frames = times.slice(2).sort((a, b) => a - b);
    const avg = frames.reduce((sum, t) => sum + t, 0) / frames.length;
    return { p95: frames[Math.floor(frames.length * 0.95)]!, avgFps: 1000 / avg };
  }, selector);
}

for (const count of [100, 1_000, 10_000, 100_000]) {
  test(`DataTable spike: ${count} rows`, async ({ page }) => {
    step("table:goto");
    await page.goto(`/spike?view=table&count=${count}`);
    step("table:loaded");
    await page.waitForFunction(() => document.documentElement.dataset.spikeRendered, null, {
      timeout: 60_000,
    });
    step("table:rendered");
    const firstRowsMs = await page.evaluate(
      () => performance.measure("first", "spike:data-ready", "spike:rows-painted").duration
    );
    const scroll = await scrollFrames(page, '[data-testid="spike-table"]');
    step("table:scrolled");

    await page.evaluate(() => delete document.documentElement.dataset.spikeRendered);
    await page.getByRole("columnheader", { name: "Salary" }).click();
    await page.waitForFunction(() => document.documentElement.dataset.spikeRendered);
    const sortMs = await page.evaluate(
      () => performance.measure("sort", "spike:sort-start", "spike:rows-painted").duration
    );

    const result = {
      count,
      firstRowsMs,
      scrollP95Ms: scroll.p95,
      scrollAvgFps: scroll.avgFps,
      sortMs,
    };
    console.log("TABLE", JSON.stringify(result));
    expect.soft(firstRowsMs).toBeLessThan(TARGETS.firstRowsMs);
    expect.soft(scroll.p95).toBeLessThan(TARGETS.frameP95Ms);
    expect.soft(sortMs).toBeLessThan(TARGETS.sortMs);
  });
}

test("DataGrid spike: 2,000 × 24 editable cells", async ({ page }) => {
  await page.goto("/spike?view=grid");
  await page.getByRole("grid").waitFor();
  const scroll = await scrollFrames(page, '[data-testid="spike-grid"]');

  // Event Timing reports events whose time to next paint is 16ms or more; we record their
  // processing time, which is what the keystroke target is about.
  await page.evaluate(() => {
    (window as unknown as { slow: number[] }).slow = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceEventTiming[]) {
        // Processing time is unrounded; duration also includes waiting for the next frame.
        (window as unknown as { slow: number[] }).slow.push(
          entry.processingEnd - entry.processingStart
        );
      }
    }).observe({
      type: "event",
      durationThreshold: 16,
      buffered: false,
    } as PerformanceObserverInit);
  });
  await page.evaluate(() =>
    document.querySelector<HTMLElement>('[data-testid="spike-grid"]')!.scrollTo(0, 0)
  );
  const cell = page.getByRole("textbox", { name: "Person 1, month 1", exact: true });
  await cell.click();
  await cell.fill("");
  await page.keyboard.type("0.75123456789", { delay: 30 });
  await page.waitForTimeout(300);
  const slowKeystrokes = await page.evaluate(() => (window as unknown as { slow: number[] }).slow);

  const keystrokeMaxMs = Math.max(0, ...slowKeystrokes);
  const result = {
    scrollP95Ms: scroll.p95,
    scrollAvgFps: scroll.avgFps,
    keystrokes: slowKeystrokes.length,
    keystrokeMaxMs,
  };
  console.log("GRID", JSON.stringify(result));
  expect.soft(scroll.p95).toBeLessThan(TARGETS.frameP95Ms);
  expect.soft(keystrokeMaxMs).toBeLessThan(TARGETS.keystrokeMs);
});
