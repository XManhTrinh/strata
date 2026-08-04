import { z } from "zod";

export const TeamMembershipSchema = z
  .object({
    id: z.string().cuid(),
    employeeId: z.string().cuid(),
    squadId: z.string().cuid(),
    role: z.string().nullable(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreateTeamMembershipSchema = z
  .object({
    employeeId: z.string().cuid(),
    squadId: z.string().cuid(),
    role: z.string().nullable().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().nullable().optional(),
  })
  .strict();

export const UpdateTeamMembershipSchema =
  CreateTeamMembershipSchema.partial().strict();

export type TeamMembership = z.infer<typeof TeamMembershipSchema>;
export type CreateTeamMembership = z.infer<typeof CreateTeamMembershipSchema>;
export type UpdateTeamMembership = z.infer<typeof UpdateTeamMembershipSchema>;
