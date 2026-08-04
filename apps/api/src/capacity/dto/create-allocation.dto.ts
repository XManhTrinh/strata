import { z } from 'zod';

export const CreateAllocationDtoSchema = z
  .object({
    employeeId: z.string().min(1, 'employeeId is required'),
    squadId: z.string().min(1, 'squadId is required'),
    percentage: z.number().int('Percentage must be an integer').min(1, 'Percentage must be at least 1').max(100, 'Percentage must be at most 100'),
  })
  .strict();

export type CreateAllocationDto = z.infer<typeof CreateAllocationDtoSchema>;
