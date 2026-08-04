import { z } from "zod";

export const PositionSchema = z
  .object({
    id: z.string().cuid(),
    title: z.string().min(1),
    level: z.number().int().min(1),
    description: z.string().nullable(),
    departmentId: z.string().cuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreatePositionSchema = z
  .object({
    title: z.string().min(1),
    level: z.number().int().min(1),
    description: z.string().nullable().optional(),
    departmentId: z.string().cuid(),
  })
  .strict();

export const UpdatePositionSchema = CreatePositionSchema.partial().strict();

export type Position = z.infer<typeof PositionSchema>;
export type CreatePosition = z.infer<typeof CreatePositionSchema>;
export type UpdatePosition = z.infer<typeof UpdatePositionSchema>;
