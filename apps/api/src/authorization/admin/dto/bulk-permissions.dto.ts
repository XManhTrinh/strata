import { z } from 'zod';

const PermissionScopeValues = [
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
  scope: z.enum(PermissionScopeValues),
});

export const BulkPermissionsSchema = z.object({
  add: z.array(PermissionEntrySchema).optional().default([]),
  remove: z.array(PermissionEntrySchema).optional().default([]),
});

export type BulkPermissionsDto = z.infer<typeof BulkPermissionsSchema>;
