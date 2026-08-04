import { z } from 'zod';

export const UpdateClusterDtoSchema = z
  .object({
    name: z.string().min(1),
    tribeId: z.string().min(1),
  })
  .partial()
  .strict();

export type UpdateClusterDto = z.infer<typeof UpdateClusterDtoSchema>;
