import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(
  ({ viewport }) => (viewport?.width ?? 0) < 600,
  "the calendar grid is for larger screens"
);

/** The first Monday of next month, and that month's first day, as ISO dates. */
function nextMonthMonday(): { month: string; monday: string; wednesday: string } {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const monday = new Date(first);
  monday.setUTCDate(1 + ((8 - first.getUTCDay()) % 7));
  const wednesday = new Date(monday);
  wednesday.setUTCDate(monday.getUTCDate() + 2);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { month: iso(first), monday: iso(monday), wednesday: iso(wednesday) };
}

const fullDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    dateStyle: "full",
    timeZone: "UTC",
  });

test("someone books time off by dragging across days on the calendar", async ({
  page,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-c-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  const base = page.url().replace(/\/$/, "");
  const { month, monday, wednesday } = nextMonthMonday();

  // The calendar is the first view; an empty month still shows its days.
  await page.goto(`${base}/time-off?tab=calendar&date=${month}`);
  const start = page.getByRole("button", { name: `Book time on ${fullDate(monday)}` });
  const end = page.getByRole("button", { name: `Book time on ${fullDate(wednesday)}` });
  await expect(start).toBeVisible();
  await expectNoA11yViolations(page);

  // Monday to Wednesday by dragging.
  await start.hover();
  await page.mouse.down();
  await end.hover();
  await page.mouse.up();
  const dialog = page.getByRole("dialog", { name: "Book time off" });
  await expect(dialog.getByText("3 working days")).toBeVisible();
  await dialog.getByRole("button", { name: "Book time off" }).click();
  await expect(page.getByText("Requested: waiting for approval")).toBeVisible();

  // The request shows as a bar, marked as waiting.
  await expect(
    page.getByText(/^Ana Pop, Annual leave, .* waiting for approval$/).first()
  ).toBeAttached();

  // A single weekday from the keyboard (weekends are hidden at first).
  await end.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: /^From/ })).toHaveValue(
    `${wednesday.slice(5, 7)}/${wednesday.slice(8)}/${wednesday.slice(0, 4)}`
  );
});

test("the side panel shows what's waiting and filters the calendar by type", async ({
  page,
}, testInfo) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1200, "the panel is for wide screens");
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-p-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  const base = page.url().replace(/\/$/, "");
  const { month, monday } = nextMonthMonday();

  await page.goto(`${base}/time-off?tab=calendar&date=${month}`);
  const panel = page.getByRole("complementary", { name: "Time off overview" });
  await expect(panel.getByText("Your balances")).toBeVisible();
  await page.getByRole("button", { name: `Book time on ${fullDate(monday)}` }).click();
  await page
    .getByRole("dialog", { name: "Book time off" })
    .getByRole("button", { name: "Book time off" })
    .click();
  await expect(page.getByText("Requested: waiting for approval")).toBeVisible();
  const bar = page.getByText(/^Ana Pop, Annual leave, /).first();
  await expect(bar).toBeAttached();

  // Untick a type in the legend and its bookings leave the calendar.
  const annual = panel.getByRole("checkbox", { name: "Annual leave" });
  // Windmorph draws the box over the input, so click the checkbox's label like a person would.
  const annualLabel = panel.locator("label", { hasText: "Annual leave" });
  await annualLabel.click();
  await expect(annual).not.toBeChecked();
  await expect(bar).not.toBeAttached();
  await annualLabel.click();
  await expect(page.getByText(/^Ana Pop, Annual leave, /).first()).toBeAttached();

  // The owner manages time types from here too.
  await panel.getByRole("button", { name: "Edit Sick leave" }).click();
  const edit = page.getByRole("dialog", { name: "Edit time type" });
  await expect(edit.getByRole("textbox", { name: /^Name/ })).toHaveValue("Sick leave");
  await expectNoA11yViolations(page);
});
