import { z } from 'zod';

export const CreateOrgUnitTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export type CreateOrgUnitTypeDto = z.infer<typeof CreateOrgUnitTypeSchema>;
