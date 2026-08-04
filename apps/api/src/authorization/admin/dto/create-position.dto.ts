import { z } from 'zod';

export const CreatePositionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  careerLevel: z.number().int().min(1).optional(),
  canHaveDirectReports: z.boolean().optional(),
});

export type CreatePositionDto = z.infer<typeof CreatePositionSchema>;
