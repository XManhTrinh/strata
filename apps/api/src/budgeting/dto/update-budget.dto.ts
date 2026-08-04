import { z } from 'zod';

export const UpdateBudgetDtoSchema = z
  .object({
    departmentId: z.string().min(1, 'departmentId is required').optional(),
    fiscalPeriod: z.string().min(1, 'fiscalPeriod is required').optional(),
    amount: z.number().min(0, 'Amount must be non-negative').optional(),
  })
  .strict();

export type UpdateBudgetDto = z.infer<typeof UpdateBudgetDtoSchema>;
