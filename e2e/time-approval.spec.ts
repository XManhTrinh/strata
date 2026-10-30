import { type Page, expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, followEmailLink, uniqueId } from "./helpers";
import { latestLinkFor } from "./mailpit";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "managing people needs a larger screen");

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

test("a manager approves a report's leave, books a team event and adjusts a balance", async ({
  browser,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  const benEmail = `ben-ta-${id}@example.test`;

  // Ana creates the workspace and invites Ben, who joins.
  const ana = await (await browser.newContext()).newPage();
  await ana.goto("/sign-up");
  await completeSignUp(ana, "Ana Pop", `ana-ta-${id}@example.test`);
  await createWorkspace(ana, "Company", `Acme ${id}`);
  const base = ana.url().replace(/\/$/, "");
  await ana.goto(`${base}/settings/members`);
  await ana.getByRole("button", { name: "Invite people" }).click();
  await ana.getByLabel("Email addresses").fill(benEmail);
  await ana.getByRole("button", { name: "Send invitations" }).click();
  await expect(ana.getByText("Invitation sent")).toBeVisible();

  const ben = await (await browser.newContext()).newPage();
  await followEmailLink(ben, await latestLinkFor(benEmail));
  await ben.getByRole("link", { name: "Create an account" }).click();
  await completeSignUp(ben, "Ben Ionescu", benEmail);
  await ben.getByRole("button", { name: "Accept and join" }).click();
  await expect(ben.getByRole("heading", { name: "Welcome, Ben Ionescu" })).toBeVisible();

  // Ana becomes Ben's line manager.
  await ana.goto(`${base}/people`);
  await ana
    .getByRole("grid", { name: "People" })
    .getByRole("row", { name: /Ben Ionescu/ })
    .click();
  await ana.getByRole("button", { name: "Change job" }).click();
  const job = ana.getByRole("dialog", { name: "Change job" });
  await job.getByRole("combobox", { name: "Manager" }).fill("Ana");
  await ana.getByRole("option", { name: /^Ana Pop/ }).click();
  await job.getByRole("button", { name: "Save" }).click();
  await expect(ana.getByText("Job changed")).toBeVisible();
  const profile = ana.url();

  // Ben asks for two days of annual leave.
  await ben.goto(`${base}/time-off`);
  await ben.getByRole("button", { name: "Book time off" }).click();
  const book = ben.getByRole("dialog", { name: "Book time off" });
  await fillDate(ben, "From", nextMonday());
  await fillDate(ben, "To", nextMonday(1));
  await expect(book.getByText("2 working days")).toBeVisible();
  await book.getByRole("button", { name: "Book time off" }).click();
  await expect(ben.getByRole("list", { name: "My bookings" })).toContainText("Waiting");

  // Ana hears about it, and approves it.
  await ana.goto(`${base}/time-off?tab=approvals`);
  await ana.getByRole("button", { name: /^Notifications, \d+ unread$/ }).click();
  await expect(ana.getByText(/^Ben Ionescu asked for Annual leave, /)).toBeVisible();
  await ana.keyboard.press("Escape");
  const approvals = ana.getByRole("list", { name: "Approvals" });
  await expect(approvals).toContainText("Ben Ionescu: Annual leave");
  await expectNoA11yViolations(ana);
  await approvals.getByRole("button", { name: "Approve" }).click();
  await expect(ana.getByText("No requests are waiting for you.")).toBeVisible();
  await ben.reload();
  await expect(ben.getByRole("list", { name: "My bookings" })).toContainText("Approved");
  await ben.getByRole("button", { name: /^Notifications, \d+ unread$/ }).click();
  await expect(ben.getByText(/^Your Annual leave for .+ was approved$/)).toBeVisible();
  await ben.keyboard.press("Escape");

  // A team event for both of them, booked by Ana.
  await ana.goto(`${base}/time-off`);
  await ana.getByRole("button", { name: "Book time off" }).click();
  const event = ana.getByRole("dialog", { name: "Book time off" });
  await event.getByRole("button", { name: /Type$/ }).click();
  await ana.getByRole("option", { name: "Team event" }).click();
  await event.getByRole("combobox", { name: "Who's going" }).fill("Ben");
  await ana.getByRole("option", { name: /^Ben Ionescu/ }).click();
  await event.getByRole("combobox", { name: "Who's going" }).press("Tab");
  await fillDate(ana, "From", nextMonday(3));
  await fillDate(ana, "To", nextMonday(3));
  await event.getByLabel("Title (optional)").fill("Offsite");
  await event.getByRole("button", { name: "Book time off" }).click();
  await expect(ana.getByText("Booked", { exact: true })).toBeVisible();
  await ben.reload();
  await expect(ben.getByRole("list", { name: "My bookings" })).toContainText("Offsite");

  // Ana gives Ben two extra days, with a reason, from his profile.
  await ana.goto(profile);
  await ana.getByRole("tab", { name: "Time off" }).click();
  await ana.getByRole("button", { name: "Adjust balance" }).click();
  const adjust = ana.getByRole("dialog", { name: "Adjust a balance" });
  await adjust.getByLabel("Days to add (negative to remove)").fill("2");
  await adjust.getByLabel("Reason").fill("Long service");
  await adjust.getByRole("button", { name: "Adjust balance" }).click();
  await expect(ana.getByText("Balance adjusted")).toBeVisible();
  // The balance explains itself: the adjustment shows on its own line.
  await ben.reload();
  await expect(ben.getByText("Adjusted")).toBeVisible();
});
