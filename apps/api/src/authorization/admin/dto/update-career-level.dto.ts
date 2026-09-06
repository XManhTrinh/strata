import { z } from 'zod';

export const UpdateCareerLevelSchema = z.object({
  label: z.string().min(1).optional(),
  displayName: z.string().optional(),
  rank: z.number().int().min(0).optional(),
  track: z.string().optional(),
});

export type UpdateCareerLevelDto = z.infer<typeof UpdateCareerLevelSchema>;
