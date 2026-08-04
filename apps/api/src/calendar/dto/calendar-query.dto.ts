import { z } from 'zod';

export const CalendarQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  userIds: z.array(z.string()).optional(),
  orgUnitIds: z.array(z.string()).optional(),
  eventTypeIds: z.array(z.string()).optional(),
  leaveTypeIds: z.array(z.string()).optional(),
  includePersonal: z.boolean().optional().default(false),
  includeCancelled: z.boolean().optional().default(false),
});

export type CalendarQueryDto = z.infer<typeof CalendarQuerySchema>;
