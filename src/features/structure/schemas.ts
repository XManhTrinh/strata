import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

export const unitSchema = z.object({
  name: z.string().trim().min(1, { error: "unitNameRequired" }).max(120),
  code: optionalText(60).default(null),
  parentId: z.uuid({ error: "unitParentRequired" }),
  levelId: z.uuid({ error: "unitLevelRequired" }),
});

export const levelSchema = z.object({
  name: z.string().trim().min(1, { error: "levelNameRequired" }).max(60),
});

export const careerLevelSchema = z.object({
  name: z.string().trim().min(1, { error: "careerLevelNameRequired" }).max(60),
  track: optionalText(60).default(null),
});

/** "none" is the Select's "any level" choice. */
const optionalLevel = z
  .union([z.uuid(), z.literal("none"), z.literal("")])
  .default("none")
  .transform((value) => (value === "none" || value === "" ? null : value));

export const positionSchema = z.object({
  name: z.string().trim().min(1, { error: "positionNameRequired" }).max(120),
  description: z.string().trim().max(500).default(""),
  minLevelId: optionalLevel,
  maxLevelId: optionalLevel,
});

export const employmentTypeSchema = z.object({
  name: z.string().trim().min(1, { error: "employmentTypeNameRequired" }).max(60),
  costMethod: z.enum(["annual_salary", "day_rate"], { error: "costMethodRequired" }),
});

const flag = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

export const customFieldSchema = z.object({
  label: z.string().trim().min(1, { error: "fieldLabelRequired" }).max(80),
  key: z
    .string()
    .regex(/^[a-z][a-z0-9_]{0,59}$/, { error: "fieldKeyInvalid" })
    .optional(),
  type: z.enum(["text", "number", "date", "single_choice", "multi_choice", "person"], {
    error: "fieldTypeRequired",
  }),
  sensitive: flag,
  required: flag,
  keepHistory: flag,
});

export const fieldOptionSchema = z.object({
  name: z.string().trim().min(1, { error: "optionLabelRequired" }).max(80),
});
