import { describe, expect, it } from "vitest";
import { policySchema } from "./schemas";

const base = {
  name: "Annual leave",
  timeTypeId: "0b0f8f3e-2c4b-4a7e-9d61-3f1c2a9b8e70",
  daysPerYear: "25",
  accrual: "upfront",
  yearStartMonth: "1",
};

describe("allowance policy form", () => {
  it("reads empty carry-over fields as 'all' and 'never', not 0", () => {
    const parsed = policySchema.parse({ ...base, carryOverMax: "", carryOverExpiresMonths: "" });
    expect(parsed.carryOverMax).toBeNull();
    expect(parsed.carryOverExpiresMonths).toBeNull();
  });

  it("keeps 0 days of carry-over (none) and refuses 0 months", () => {
    expect(policySchema.parse({ ...base, carryOverMax: "0" }).carryOverMax).toBe(0);
    expect(policySchema.safeParse({ ...base, carryOverExpiresMonths: "0" }).success).toBe(false);
  });
});
