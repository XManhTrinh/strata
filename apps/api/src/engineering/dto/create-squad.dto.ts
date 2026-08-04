import { z } from 'zod';

export const CreateSquadDtoSchema = z
  .object({
    name: z.string().min(1),
    clusterId: z.string().min(1),
  })
  .strict();

export type CreateSquadDto = z.infer<typeof CreateSquadDtoSchema>;
