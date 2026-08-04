import { z } from 'zod';

export const MoveOrgUnitSchema = z.object({
  newParentId: z.string().nullable(),
});

export type MoveOrgUnitDto = z.infer<typeof MoveOrgUnitSchema>;
