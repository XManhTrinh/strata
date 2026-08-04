import { z } from 'zod';

export const SubmitLeaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notes: z.string().max(2000).optional(),
});

export type SubmitLeaveRequestDto = z.infer<typeof SubmitLeaveRequestSchema>;
