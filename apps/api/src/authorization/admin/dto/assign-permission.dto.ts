import { z } from 'zod';

const PermissionScopeV2Values = [
  'OWN',
  'DIRECT_REPORTS',
  'ORGANIZATION_UNIT',
  'BRANCH',
  'COMPANY',
  'GLOBAL',
] as const;

export const AssignPermissionSchema = z.object({
  featureKey: z.string().min(1),
  permissionKey: z.string().min(1),
  scope: z.enum(PermissionScopeV2Values),
});

export type AssignPermissionDto = z.infer<typeof AssignPermissionSchema>;
