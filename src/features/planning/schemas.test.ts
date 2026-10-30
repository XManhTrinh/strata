import { describe, expect, it } from "vitest";
import { rateCardSchema } from "./schemas";

const base = { name: "Contractors", priority: "10", isDefault: "false" };
const condition = { field: "employment_type", operator: "equals", value: " Contractor " };
const rate = { validFrom: "2027-01-01", dayRate: "500", workingDays: "20", currency: "gbp" };

describe("rate card form", () => {
  it("reads conditions and rates from their JSON fields", () => {
    const parsed = rateCardSchema.parse({
      ...base,
      conditions: JSON.stringify([condition]),
      rates: JSON.stringify([rate]),
    });
    expect(parsed.conditions).toEqual([{ ...condition, value: "Contractor" }]);
    expect(parsed.rates[0]).toMatchObject({ dayRate: 500, workingDays: 20 });
  });

  it("needs conditions unless the card is a default", () => {
    const empty = rateCardSchema.safeParse({ ...base, conditions: "[]" });
    expect(empty.error?.issues[0]).toMatchObject({
      path: ["conditions"],
      message: "rateCardNeedsConditions",
    });
    expect(rateCardSchema.safeParse({ ...base, isDefault: "true" }).success).toBe(true);
  });

  it("accepts custom fields by key and refuses unknown built-ins", () => {
    const withField = (field: string) =>
      rateCardSchema.safeParse({ ...base, conditions: JSON.stringify([{ ...condition, field }]) })
        .success;
    expect(withField("custom:band")).toBe(true);
    expect(withField("salary")).toBe(false);
  });

  it("refuses a rate without working days or with a long currency", () => {
    const withRate = (change: object) =>
      rateCardSchema.safeParse({
        ...base,
        isDefault: "true",
        rates: JSON.stringify([{ ...rate, ...change }]),
      }).error?.issues[0]?.message;
    expect(withRate({ workingDays: "0" })).toBe("rateInvalid");
    expect(withRate({ currency: "POUND" })).toBe("rateInvalid");
  });
});
