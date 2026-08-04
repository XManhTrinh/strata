import { z } from "zod";

export const LeaveTypeEnum = z.enum([
  "ANNUAL",
  "SICK",
  "PERSONAL",
  "PARENTAL",
  "UNPAID",
]);

export const LeaveStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const LeaveRequestSchema = z
  .object({
    id: z.string().cuid(),
    employeeId: z.string().cuid(),
    type: LeaveTypeEnum,
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    reason: z.string().nullable(),
    status: LeaveStatusEnum,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreateLeaveRequestSchema = z
  .object({
    employeeId: z.string().cuid(),
    type: LeaveTypeEnum,
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    reason: z.string().nullable().optional(),
  })
  .strict();

export const UpdateLeaveRequestSchema =
  CreateLeaveRequestSchema.partial().strict();

export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;
export type CreateLeaveRequest = z.infer<typeof CreateLeaveRequestSchema>;
export type UpdateLeaveRequest = z.infer<typeof UpdateLeaveRequestSchema>;
