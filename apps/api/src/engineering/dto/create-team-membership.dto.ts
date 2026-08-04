import { z } from 'zod';

export const CreateTeamMembershipDtoSchema = z
  .object({
    employeeId: z.string().min(1),
    squadId: z.string().min(1),
    role: z.string().nullable().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().nullable().optional(),
  })
  .strict();

export type CreateTeamMembershipDto = z.infer<typeof CreateTeamMembershipDtoSchema>;
