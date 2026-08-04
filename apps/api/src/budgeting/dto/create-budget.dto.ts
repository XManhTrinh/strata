import { z } from 'zod';

export const CreateBudgetDtoSchema = z
  .object({
    departmentId: z.string().min(1, 'departmentId is required'),
    fiscalPeriod: z.string().min(1, 'fiscalPeriod is required'),
    amount: z.number().min(0, 'Amount must be non-negative'),
  })
  .strict();

export type CreateBudgetDto = z.infer<typeof CreateBudgetDtoSchema>;
