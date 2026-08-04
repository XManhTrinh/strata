import { z } from 'zod';

export const UpdatePositionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  careerLevel: z.number().int().min(1).optional(),
  canHaveDirectReports: z.boolean().optional(),
});

export type UpdatePositionDto = z.infer<typeof UpdatePositionSchema>;
