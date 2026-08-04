import { z } from 'zod';

export const CreateLeaveTypeSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#10B981'),
  defaultAllocation: z.number().min(0).max(365),
  requiresApproval: z.boolean().optional().default(true),
  carryOver: z.boolean().optional().default(false),
  maxCarryOverDays: z.number().min(0).max(365).optional().nullable(),
});

export type CreateLeaveTypeDto = z.infer<typeof CreateLeaveTypeSchema>;

export const UpdateLeaveTypeSchema = CreateLeaveTypeSchema.partial();
export type UpdateLeaveTypeDto = z.infer<typeof UpdateLeaveTypeSchema>;
