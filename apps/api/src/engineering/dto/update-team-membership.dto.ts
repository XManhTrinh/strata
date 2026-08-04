import { z } from 'zod';

export const UpdateTeamMembershipDtoSchema = z
  .object({
    role: z.string().nullable(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().nullable(),
  })
  .partial()
  .strict();

export type UpdateTeamMembershipDto = z.infer<typeof UpdateTeamMembershipDtoSchema>;
