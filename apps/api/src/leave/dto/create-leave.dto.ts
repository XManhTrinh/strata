import { z } from 'zod';

export const LeaveTypeEnum = z.enum(['ANNUAL', 'SICK', 'PERSONAL', 'PARENTAL', 'UNPAID']);

export const CreateLeaveDtoSchema = z
  .object({
    employeeId: z.string().min(1, 'employeeId is required'),
    type: LeaveTypeEnum,
    startDate: z.string().min(1, 'startDate is required'),
    endDate: z.string().min(1, 'endDate is required'),
    reason: z.string().nullable().optional(),
  })
  .strict();

export type CreateLeaveDto = z.infer<typeof CreateLeaveDtoSchema>;
