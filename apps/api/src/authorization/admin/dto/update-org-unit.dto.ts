import { z } from 'zod';

export const UpdateOrgUnitSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
  managerId: z.string().nullable().optional(),
});

export type UpdateOrgUnitDto = z.infer<typeof UpdateOrgUnitSchema>;
