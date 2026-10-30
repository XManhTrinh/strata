import { z } from "zod";

const isoDate = z.iso.date({ error: "dateRequired" });
const optionalId = z
  .union([z.uuid(), z.literal("")])
  .default("")
  .transform((value) => value || null);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .default("")
    .transform((value) => value || null);

export const personDetailsSchema = z.object({
  fullName: z.string().trim().min(1, { error: "personNameRequired" }).max(200),
  email: z
    .union([z.email({ error: "emailInvalid" }), z.literal("")])
    .default("")
    .transform((value) => value || null),
  personKey: optionalText(100),
  startDate: z
    .union([isoDate, z.literal("")])
    .default("")
    .transform((value) => value || null),
});

export const jobSchema = z.object({
  validFrom: isoDate,
  unitId: z.uuid({ error: "unitRequired" }),
  managerId: optionalId,
  positionId: optionalId,
  careerLevelId: optionalId,
  employmentTypeId: optionalId,
});

export const newPersonSchema = personDetailsSchema.extend(
  jobSchema.omit({ validFrom: true }).shape
);

const amount = z
  .union([
    z.coerce.number({ error: "amountInvalid" }).nonnegative({ error: "amountInvalid" }),
    z.literal(""),
  ])
  .default("")
  .transform((value) => (value === "" ? null : value));

export const paySchema = z.object({
  validFrom: isoDate,
  annualSalary: amount,
  dayRate: amount,
  currency: z.string().regex(/^[A-Za-z]{3}$/, { error: "currencyRequired" }),
});
