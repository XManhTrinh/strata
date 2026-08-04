import { z } from 'zod';

export const CreateCalendarEventSchema = z.object({
  eventTypeId: z.string().min(1),
  title: z.string().min(1).max(200),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  allDay: z.boolean().optional().default(false),
  visibility: z.enum(['PERSONAL', 'SHARED']).optional().default('SHARED'),
  notes: z.string().max(2000).optional(),
  // Recurrence fields
  isRecurring: z.boolean().optional().default(false),
  recurrenceFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  recurrenceDaysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  recurrenceDayOfMonth: z.number().min(1).max(31).optional(),
  recurrenceEndDate: z.coerce.date().optional(),
  recurrenceCount: z.number().int().min(1).max(365).optional(),
});

export type CreateCalendarEventDto = z.infer<typeof CreateCalendarEventSchema>;
