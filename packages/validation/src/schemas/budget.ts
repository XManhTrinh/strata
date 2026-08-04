import { z } from "zod";

export const BudgetSchema = z
  .object({
    id: z.string().cuid(),
    departmentId: z.string().cuid(),
    fiscalPeriod: z.string().min(1),
    amount: z.number().positive(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreateBudgetSchema = z
  .object({
    departmentId: z.string().cuid(),
    fiscalPeriod: z.string().min(1),
    amount: z.number().positive(),
  })
  .strict();

export const UpdateBudgetSchema = CreateBudgetSchema.partial().strict();

export type Budget = z.infer<typeof BudgetSchema>;
export type CreateBudget = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudget = z.infer<typeof UpdateBudgetSchema>;
