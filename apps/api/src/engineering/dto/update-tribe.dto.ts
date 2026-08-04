import { z } from 'zod';

export const UpdateTribeDtoSchema = z
  .object({
    name: z.string().min(1),
    organizationId: z.string().min(1),
  })
  .partial()
  .strict();

export type UpdateTribeDto = z.infer<typeof UpdateTribeDtoSchema>;
