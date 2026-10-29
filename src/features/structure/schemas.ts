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
