import { z } from 'zod';

export const UpdateAllocationDtoSchema = z
  .object({
    employeeId: z.string().min(1, 'employeeId is required').optional(),
    squadId: z.string().min(1, 'squadId is required').optional(),
    percentage: z.number().int('Percentage must be an integer').min(1, 'Percentage must be at least 1').max(100, 'Percentage must be at most 100').optional(),
  })
  .strict();

export type UpdateAllocationDto = z.infer<typeof UpdateAllocationDtoSchema>;
