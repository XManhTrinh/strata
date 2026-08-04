import { z } from 'zod';
import { LeaveTypeEnum } from './create-leave.dto';

export const UpdateLeaveDtoSchema = z
  .object({
    type: LeaveTypeEnum.optional(),
    startDate: z.string().min(1).optional(),
    endDate: z.string().min(1).optional(),
    reason: z.string().nullable().optional(),
  })
  .strict();

export type UpdateLeaveDto = z.infer<typeof UpdateLeaveDtoSchema>;
