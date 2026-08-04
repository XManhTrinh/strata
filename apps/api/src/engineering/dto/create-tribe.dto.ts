import { z } from 'zod';

export const CreateTribeDtoSchema = z
  .object({
    name: z.string().min(1),
    organizationId: z.string().min(1),
  })
  .strict();

export type CreateTribeDto = z.infer<typeof CreateTribeDtoSchema>;
