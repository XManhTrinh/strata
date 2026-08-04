import { z } from 'zod';

export const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;
