import { z } from 'zod';

export const AdjustBalanceSchema = z.object({
  leaveTypeId: z.string().min(1),
  adjustment: z.number().min(-365).max(365),
  reason: z.string().min(1).max(500),
});

export type AdjustBalanceDto = z.infer<typeof AdjustBalanceSchema>;
