import { z } from "zod";

export const TribeSchema = z
  .object({
    id: z.string().cuid(),
    name: z.string().min(1),
    organizationId: z.string().cuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreateTribeSchema = z
  .object({
    name: z.string().min(1),
    organizationId: z.string().cuid(),
  })
  .strict();

export const UpdateTribeSchema = CreateTribeSchema.partial().strict();

export type Tribe = z.infer<typeof TribeSchema>;
export type CreateTribe = z.infer<typeof CreateTribeSchema>;
export type UpdateTribe = z.infer<typeof UpdateTribeSchema>;
