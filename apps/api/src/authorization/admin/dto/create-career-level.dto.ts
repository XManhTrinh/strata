import { z } from 'zod';

export const CreateCareerLevelSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  displayName: z.string().optional(),
  rank: z.number().int().min(0, 'Rank must be a non-negative integer'),
  track: z.string().optional(),
});

export type CreateCareerLevelDto = z.infer<typeof CreateCareerLevelSchema>;
