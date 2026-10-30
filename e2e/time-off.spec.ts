import { type Page, expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

/** The Monday at least a week ahead, and a day some days after it, as ISO dates. */
function nextMonday(plusDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7 + ((8 - d.getUTCDay()) % 7) + plusDays);
  return d.toISOString().slice(0, 10);
}

async function fillDate(page: Page, label: string, iso: string) {
  const [year, month, day] = iso.split("-");
  const field = page.getByRole("textbox", { name: new RegExp(`^${label}`) });
  await field.fill(`${month}/${day}/${year}`);
  await field.press("Tab");
}

test("people book time off, see their balance, cancel, and see who's away", async ({
  page,
  viewport,
}, testInfo) => {
  const phone = (viewport?.width ?? 0) < 600;
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-o-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  await page.getByRole("link", { name: "Time off" }).first().click();
  await expect(page).toHaveURL(/\/time-off/);
  await expect(page.getByText(/days left$/).first()).toBeVisible();

  // Annual leave, Monday to Tuesday: two working days, waiting for approval.
  const monday = nextMonday();
  await page.getByRole("button", { name: "Book time off" }).click();
  const dialog = page.getByRole("dialog", { name: "Book time off" });
  await fillDate(page, "From", monday);
  await fillDate(page, "To", nextMonday(1));
  await expect(dialog.getByText("2 working days")).toBeVisible();
  await expectNoA11yViolations(page);
  await dialog.getByRole("button", { name: "Book time off" }).click();
  await expect(page.getByText("Requested: waiting for approval")).toBeVisible();
  const bookings = page.getByRole("list", { name: "My bookings" });
  await expect(bookings).toContainText("Waiting");

  // Cancelling gives the days back.
  await page.getByRole("button", { name: "Actions for Annual leave" }).click();
  await page.getByRole("menuitem", { name: "Cancel" }).click();
  await expect(bookings).toContainText("Cancelled");

  // Sick leave needs no approval and shows in the calendar.
  await page.getByRole("button", { name: "Book time off" }).click();
  await dialog.getByRole("button", { name: /Type$/ }).click();
  await page.getByRole("option", { name: "Sick leave" }).click();
  await fillDate(page, "From", monday);
  await fillDate(page, "To", monday);
  await dialog.getByRole("button", { name: "Book time off" }).click();
  await expect(page.getByText("Booked", { exact: true })).toBeVisible();

  // A weekly team meeting for three weeks.
  await page.getByRole("button", { name: "Book time off" }).click();
  await dialog.getByRole("button", { name: /Type$/ }).click();
  await page.getByRole("option", { name: "Team event" }).click();
  await fillDate(page, "From", nextMonday(2));
  await fillDate(page, "To", nextMonday(2));
  await dialog.getByLabel("Title (optional)").fill("Team sync");
  await dialog.getByRole("button", { name: /Repeats$/ }).click();
  await page.getByRole("option", { name: "Every week" }).click();
  await fillDate(page, "Until", nextMonday(16));
  await dialog.getByRole("button", { name: "Book time off" }).click();
  await expect(page.getByText("Booked", { exact: true })).toBeVisible();

  const timeOff = page.url().split("?")[0];
  await page.goto(`${timeOff}?tab=calendar&view=month&date=${monday}`);
  if (phone) {
    await expect(page.getByRole("list", { name: /Who's away/ })).toContainText("Ana Pop");
  } else {
    await expect(page.getByRole("table", { name: /Who's away/ })).toContainText("Ana Pop");
    await expect(page.getByRole("cell", { name: /Ana Pop, Sick leave/ })).toHaveCount(1);
  }
  await expectNoA11yViolations(page);

  // The week view shows that week; the list shows each meeting of the next four weeks.
  await page.goto(`${timeOff}?tab=calendar&view=week&date=${monday}`);
  await expect(page.getByRole("heading", { name: /^Week of / })).toBeVisible();
  await page.goto(`${timeOff}?tab=calendar&view=list&date=${monday}`);
  const list = page.getByRole("list", { name: /Who's away/ });
  await expect(list.getByRole("listitem").filter({ hasText: "Repeats" })).toHaveCount(3);
  await expectNoA11yViolations(page);

  // The owner approves others' requests, never their own: nothing waits here.
  await page.goto(`${page.url().split("?")[0]}?tab=approvals`);
  await expect(page.getByText("No requests are waiting for you.")).toBeVisible();
});
