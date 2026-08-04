import { z } from 'zod';

export const CreateEventTypeSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#3B82F6'),
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

export type CreateEventTypeDto = z.infer<typeof CreateEventTypeSchema>;

export const UpdateEventTypeSchema = CreateEventTypeSchema.partial();
export type UpdateEventTypeDto = z.infer<typeof UpdateEventTypeSchema>;
