import { z } from 'zod';

export const CreateAccrualPolicySchema = z.object({
  leaveTypeId: z.string().min(1),
  monthlyAccrual: z.number().min(0).max(31),
  maxAccumulation: z.number().min(0).max(365).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export type CreateAccrualPolicyDto = z.infer<typeof CreateAccrualPolicySchema>;

export const UpdateAccrualPolicySchema = CreateAccrualPolicySchema.partial().omit({ leaveTypeId: true });
export type UpdateAccrualPolicyDto = z.infer<typeof UpdateAccrualPolicySchema>;
