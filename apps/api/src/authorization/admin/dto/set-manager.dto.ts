import { z } from 'zod';

export const SetManagerSchema = z.object({
  userId: z.string().min(1),
  managerId: z.string().min(1),
});

export type SetManagerDto = z.infer<typeof SetManagerSchema>;
