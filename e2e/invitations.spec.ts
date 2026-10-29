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

  await owner.reload();
  await expect(owner.getByRole("list", { name: "Members" }).getByText("Ben Ionescu")).toBeVisible();
  await expect(owner.getByText("No pending invitations.")).toBeVisible();
});
