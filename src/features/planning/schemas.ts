import { z } from "zod";
import { BUILT_IN_FIELDS, RATE_OPERATORS } from "./types";

const flag = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");
/** An id, or nothing ("" or a Select's "none"). */
const optionalId = z
  .union([z.uuid(), z.literal(""), z.literal("none")])
  .default("")
  .transform((v) => (v === "" || v === "none" ? null : v));
/** A list sent as JSON in one hidden field. */
const jsonList = <T extends z.ZodType>(item: T, error: string) =>
  z
    .string()
    .default("[]")
    .transform((text, ctx) => {
      try {
        return JSON.parse(text) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: error });
        return z.NEVER;
      }
    })
    .pipe(z.array(item, { error }));

export const planningSettingsSchema = z.object({
  period: z.enum(["month", "quarter"]),
  horizonYears: z.coerce.number().int().min(1).max(5),
  displayUnit: z.enum(["fte", "percent"]),
  overAllocation: z.enum(["warn", "block"]),
  basis: z.enum(["person", "position"]),
  lifecycle: flag,
  costSplitFieldId: optionalId,
});

const conditionSchema = z.object({
  field: z.union([z.enum(BUILT_IN_FIELDS), z.string().regex(/^custom:[a-z][a-z0-9_]{0,59}$/)]),
  operator: z.enum(RATE_OPERATORS),
  value: z.string().trim().min(1, { error: "conditionValueRequired" }).max(1000),
});

const rateSchema = z.object({
  validFrom: z.iso.date({ error: "rateInvalid" }),
  dayRate: z.coerce.number({ error: "rateInvalid" }).min(0, { error: "rateInvalid" }).max(1e9),
  workingDays: z.coerce
    .number({ error: "rateInvalid" })
    .gt(0, { error: "rateInvalid" })
    .max(31, { error: "rateInvalid" }),
  currency: z.string().regex(/^[A-Za-z]{3}$/, { error: "rateInvalid" }),
});

export const rateCardSchema = z
  .object({
    name: z.string().trim().min(1, { error: "rateCardNameRequired" }).max(120),
    groupId: optionalId,
    priority: z.coerce
      .number({ error: "amountInvalid" })
      .int({ error: "amountInvalid" })
      .min(0, { error: "amountInvalid" })
      .max(100000),
    isDefault: flag,
    conditions: jsonList(conditionSchema, "conditionValueRequired"),
    rates: jsonList(rateSchema, "rateInvalid"),
  })
  .refine((card) => card.isDefault || card.conditions.length > 0, {
    path: ["conditions"],
    error: "rateCardNeedsConditions",
  });

export const rateCardSetSchema = z.object({
  name: z.string().trim().min(1, { error: "rateCardSetNameRequired" }).max(80),
});

export const rateCardGroupSchema = z.object({
  name: z.string().trim().min(1, { error: "rateCardGroupNameRequired" }).max(80),
  setId: optionalId,
});

export const scenarioSchema = z
  .object({
    name: z.string().trim().min(1, { error: "scenarioNameRequired" }).max(100),
    firstPeriod: z.iso.date({ error: "dateRequired" }),
    lastPeriod: z.iso.date({ error: "dateRequired" }),
    fromPeople: flag,
  })
  .refine((s) => s.lastPeriod >= s.firstPeriod, {
    path: ["lastPeriod"],
    error: "scenarioPeriod",
  });

export const scenarioNameSchema = z.object({
  name: z.string().trim().min(1, { error: "scenarioNameRequired" }).max(100),
});
