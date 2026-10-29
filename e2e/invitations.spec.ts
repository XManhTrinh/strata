import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";
import { latestLinkFor } from "./mailpit";

// Workspace settings ask for a larger screen on phones.
test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "settings need a larger screen");

test("an owner invites someone, who signs up from the email and joins", async ({
  browser,
}, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  const ownerEmail = `ana-${id}@example.test`;
  const inviteeEmail = `ben-${id}@example.test`;

  const owner = await (await browser.newContext()).newPage();
  await owner.goto("/sign-up");
  await completeSignUp(owner, "Ana Pop", ownerEmail);
  await createWorkspace(owner, "Company", `Acme ${id}`);

  await owner.getByRole("link", { name: "Settings" }).first().click();
  await owner.getByRole("row", { name: /^Members/ }).click();
  await expect(owner.getByRole("heading", { name: "Members" })).toBeVisible();
  await expectNoA11yViolations(owner);

  await owner.getByRole("button", { name: "Invite people" }).click();
  await owner.getByLabel("Email addresses").fill(inviteeEmail);
  await owner.getByRole("button", { name: "Send invitations" }).click();
  await expect(owner.getByText("Invitation sent")).toBeVisible();
  await expect(
    owner.getByRole("list", { name: "Pending invitations" }).getByText(inviteeEmail).first()
  ).toBeVisible();

  const invitee = await (await browser.newContext()).newPage();
  await invitee.goto(await latestLinkFor(inviteeEmail));
  await expect(invitee.getByRole("heading", { name: "You're invited" })).toBeVisible();
  await expect(
    invitee.getByText(`Ana Pop invited ${inviteeEmail} to join Acme ${id} as Member.`)
  ).toBeVisible();
  await expectNoA11yViolations(invitee);

  await invitee.getByRole("link", { name: "Create an account" }).click();
  await completeSignUp(invitee, "Ben Ionescu", inviteeEmail);
  await invitee.getByRole("button", { name: "Accept and join" }).click();
  await expect(invitee.getByRole("heading", { name: "Welcome, Ben Ionescu" })).toBeVisible();

  // The owner's open page hears about it live, through Realtime.
  await expect(owner.getByRole("button", { name: "Notifications, 1 unread" })).toBeVisible();
  await owner.getByRole("button", { name: "Notifications, 1 unread" }).click();
  await expect(owner.getByText("Ben Ionescu joined the workspace")).toBeVisible();
  await owner.getByRole("button", { name: "Mark all as read" }).click();
  await expect(owner.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
  await owner.keyboard.press("Escape");

  await owner.reload();
  await expect(owner.getByRole("list", { name: "Members" }).getByText("Ben Ionescu")).toBeVisible();
  await expect(owner.getByText("No pending invitations.")).toBeVisible();

  // Ben is a Member: settings show only what that role allows, and nothing else opens.
  await invitee.getByRole("link", { name: "Settings" }).first().click();
  await expect(invitee.getByRole("row", { name: /^Members/ })).toBeVisible();
  for (const hidden of ["General", "Roles", "Features", "Audit log"]) {
    await expect(invitee.getByRole("row", { name: new RegExp(`^${hidden}`) })).toHaveCount(0);
  }
  await invitee.getByRole("row", { name: /^Members/ }).click();
  await expect(invitee.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(invitee.getByRole("button", { name: "Invite people" })).toHaveCount(0);
  await invitee.goto(invitee.url().replace(/\/members$/, "/general"));
  await expect(invitee.getByRole("heading", { name: "Page not found" })).toBeVisible();

  // Ownership: the only owner can't leave; after adding Ben as an owner, Ana can.
  const menuFor = (name: string) => owner.getByRole("button", { name: `Actions for ${name}` });
  await menuFor("Ana Pop").click();
  await owner.getByRole("menuitem", { name: "Leave workspace" }).click();
  await owner
    .getByRole("alertdialog", { name: "Leave this workspace?" })
    .getByRole("button", { name: "Leave workspace" })
    .click();
  await expect(
    owner.getByText("You're the only owner. Make someone else an owner before leaving.")
  ).toBeVisible();

  await menuFor("Ben Ionescu").click();
  await owner.getByRole("menuitem", { name: "Make owner" }).click();
  await owner
    .getByRole("alertdialog", { name: "Make Ben Ionescu an owner?" })
    .getByRole("button", { name: "Make owner" })
    .click();
  await expect(owner.getByText("Ben Ionescu is now an owner")).toBeVisible();

  await menuFor("Ana Pop").click();
  await owner.getByRole("menuitem", { name: "Leave workspace" }).click();
  await owner
    .getByRole("alertdialog", { name: "Leave this workspace?" })
    .getByRole("button", { name: "Leave workspace" })
    .click();
  await expect(owner).toHaveURL(/\/onboarding$/);
});
