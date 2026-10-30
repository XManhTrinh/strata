import { z } from "zod";

const flag = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");
/** An id, or nothing ("" or a Select's "none"). */
const optionalId = z
  .union([z.uuid(), z.literal(""), z.literal("none")])
  .default("")
  .transform((v) => (v === "" || v === "none" ? null : v));
/** A number, or nothing when the field is empty (checked first: coercion would make "" a 0). */
const optionalNumber = (min: number, max: number) =>
  z
    .union([
      z.literal(""),
      z.coerce.number({ error: "amountInvalid" }).min(min, { error: "amountInvalid" }).max(max),
    ])
    .default("")
    .transform((v) => (v === "" ? null : v));

export const timeTypeSchema = z.object({
  name: z.string().trim().min(1, { error: "timeTypeNameRequired" }).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().min(1).max(60),
  usesAllowance: flag,
  needsApproval: flag,
  isAway: flag,
  paid: flag,
  bookForOthers: flag,
  allowsRecurrence: flag,
  visibility: z.enum(["everyone", "team", "private"]),
  bookableBy: z.enum(["everyone", "managers", "admins"]),
  approver: z.enum(["line_manager", "team_lead", "person", "role", "none"]),
  approverMemberId: optionalId,
  approverRoleId: optionalId,
  notifyRoleId: optionalId,
});

export const policySchema = z.object({
  name: z.string().trim().min(1, { error: "policyNameRequired" }).max(80),
  timeTypeId: z.uuid({ error: "timeTypeRequired" }),
  daysPerYear: z.coerce
    .number({ error: "amountInvalid" })
    .min(0, { error: "amountInvalid" })
    .max(366),
  accrual: z.enum(["upfront", "monthly"]),
  yearStartMonth: z.coerce.number().int().min(1).max(12),
  carryOverMax: optionalNumber(0, 366),
  carryOverExpiresMonths: optionalNumber(1, 24),
  prorateBySchedule: flag,
});

export const scheduleSchema = z.object({
  name: z.string().trim().min(1, { error: "scheduleNameRequired" }).max(80),
  days: z.array(z.coerce.number().int().min(1).max(7)).min(1, { error: "scheduleDaysRequired" }),
});

export const calendarSchema = z.object({
  name: z.string().trim().min(1, { error: "calendarNameRequired" }).max(80),
  country: z.union([z.string().regex(/^[A-Z]{2}$/), z.literal("")]).default(""),
  // "all" from the region choice means the whole country.
  region: z
    .string()
    .trim()
    .max(20)
    .default("")
    .transform((v) => (v === "all" ? "" : v)),
});

export const holidaySchema = z.object({
  date: z.iso.date({ error: "dateRequired" }),
  name: z.string().trim().min(1, { error: "holidayNameRequired" }).max(120),
  half: flag,
});
