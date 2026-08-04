import { z } from 'zod';

const PermissionScopeV2Values = [
  'OWN',
  'DIRECT_REPORTS',
  'ORGANIZATION_UNIT',
  'BRANCH',
  'COMPANY',
  'GLOBAL',
] as const;

const PermissionEntrySchema = z.object({
  featureKey: z.string().min(1),
  permissionKey: z.string().min(1),
  scope: z.enum(PermissionScopeV2Values),
});

export const BulkPermissionsSchema = z.object({
  add: z.array(PermissionEntrySchema).optional().default([]),
  remove: z.array(PermissionEntrySchema).optional().default([]),
});

export type BulkPermissionsDto = z.infer<typeof BulkPermissionsSchema>;
