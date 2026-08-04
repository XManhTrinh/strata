import { z } from 'zod';

export const CreateClusterDtoSchema = z
  .object({
    name: z.string().min(1),
    tribeId: z.string().min(1),
  })
  .strict();

export type CreateClusterDto = z.infer<typeof CreateClusterDtoSchema>;
