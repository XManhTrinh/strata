import { z } from 'zod';

export const CreatePositionDtoSchema = z
  .object({
    title: z.string().min(1),
    level: z.number().int().min(1),
    description: z.string().nullable().optional(),
    departmentId: z.string().min(1),
  })
  .strict();

export type CreatePositionDto = z.infer<typeof CreatePositionDtoSchema>;
