import { z } from "zod";

export const SquadSchema = z
  .object({
    id: z.string().cuid(),
    name: z.string().min(1),
    clusterId: z.string().cuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreateSquadSchema = z
  .object({
    name: z.string().min(1),
    clusterId: z.string().cuid(),
  })
  .strict();

export const UpdateSquadSchema = CreateSquadSchema.partial().strict();

export type Squad = z.infer<typeof SquadSchema>;
export type CreateSquad = z.infer<typeof CreateSquadSchema>;
export type UpdateSquad = z.infer<typeof UpdateSquadSchema>;
