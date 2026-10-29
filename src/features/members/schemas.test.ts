import { describe, expect, it } from "vitest";
import { inviteSchema } from "./schemas";

const roleId = "2b7c1d1e-6a0f-4c38-9f39-0d4f3c0f6a11";

describe("inviteSchema", () => {
  it("splits, trims, lower-cases and de-duplicates emails", () => {
    const result = inviteSchema.parse({ emails: "Ana@x.test, bob@x.test\nana@x.test; ", roleId });
    expect(result.emails).toEqual(["ana@x.test", "bob@x.test"]);
  });

  it("rejects an empty list and invalid addresses", () => {
    expect(inviteSchema.safeParse({ emails: " ", roleId }).success).toBe(false);
    expect(inviteSchema.safeParse({ emails: "not-an-email", roleId }).success).toBe(false);
  });

  it("requires a role", () => {
    expect(inviteSchema.safeParse({ emails: "ana@x.test", roleId: "" }).success).toBe(false);
  });
});
