import { z } from "zod";

export const TEMPLATE_KEYS = ["personal", "team", "company"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const createWorkspaceSchema = z.object({
  template: z.enum(TEMPLATE_KEYS),
  name: z.string().trim().min(1, { error: "workspaceNameRequired" }).max(100),
  // The reserved names are checked by the database, the single source for that list.
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/, { error: "slugInvalid" }),
  country: z.string().regex(/^[A-Z]{2}$/, { error: "countryRequired" }),
  timeZone: z.string().min(1, { error: "timeZoneRequired" }),
  currency: z.string().regex(/^[A-Z]{3}$/, { error: "currencyRequired" }),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
  weekStart: z.coerce.number().int().min(1).max(7),
});
