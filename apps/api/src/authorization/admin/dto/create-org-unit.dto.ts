import { z } from 'zod';

export const CreateOrgUnitSchema = z.object({
  typeId: z.string().min(1),
  name: z.string().min(1).max(200),
  code: z.string().max(50).optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  managerId: z.string().optional(),
});

export type CreateOrgUnitDto = z.infer<typeof CreateOrgUnitSchema>;
