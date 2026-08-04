import { z } from 'zod';

export const UpdateSquadDtoSchema = z
  .object({
    name: z.string().min(1),
    clusterId: z.string().min(1),
  })
  .partial()
  .strict();

export type UpdateSquadDto = z.infer<typeof UpdateSquadDtoSchema>;
