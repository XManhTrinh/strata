import { z } from 'zod';

export const UpdateCalendarEventSchema = z.object({
  eventTypeId: z.string().min(1).optional(),
  title: z.string().min(1).max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  allDay: z.boolean().optional(),
  visibility: z.enum(['PERSONAL', 'SHARED']).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export type UpdateCalendarEventDto = z.infer<typeof UpdateCalendarEventSchema>;
