import { z } from 'zod';

export const LeaveStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);

export const TransitionLeaveStatusDtoSchema = z
  .object({
    status: LeaveStatusEnum,
  })
  .strict();

export type TransitionLeaveStatusDto = z.infer<typeof TransitionLeaveStatusDtoSchema>;
