import { z } from 'zod';

export const AssignRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
  scope: z.enum(['SELF', 'TEAM', 'ORGANIZATION']),
});

export type AssignRoleDto = z.infer<typeof AssignRoleSchema>;
