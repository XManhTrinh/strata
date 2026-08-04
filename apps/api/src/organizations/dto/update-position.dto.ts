import { z } from 'zod';

export const UpdatePositionDtoSchema = z
  .object({
    title: z.string().min(1),
    level: z.number().int().min(1),
    description: z.string().nullable(),
    departmentId: z.string().min(1),
  })
  .partial()
  .strict();

export type UpdatePositionDto = z.infer<typeof UpdatePositionDtoSchema>;
