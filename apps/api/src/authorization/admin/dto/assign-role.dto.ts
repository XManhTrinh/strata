import { z } from 'zod';

export const AssignRoleSchema = z.object({
  roleId: z.string().min(1),
});

export type AssignRoleDto = z.infer<typeof AssignRoleSchema>;
