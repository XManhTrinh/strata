import { z } from 'zod';

const PermissionScopeValues = [
  'OWN',
  'DIRECT_REPORTS',
  'ORGANIZATION_UNIT',
  'BRANCH',
  'COMPANY',
  'GLOBAL',
] as const;

export const AssignPermissionSchema = z.union([
  // New format: featurePermissionId (from the frontend)
  z.object({
    featurePermissionId: z.string().min(1),
    scope: z.enum(PermissionScopeValues),
  }),
  // Legacy format: featureKey + permissionKey
  z.object({
    featureKey: z.string().min(1),
    permissionKey: z.string().min(1),
    scope: z.enum(PermissionScopeValues),
  }),
]);

export type AssignPermissionDto = z.infer<typeof AssignPermissionSchema>;
