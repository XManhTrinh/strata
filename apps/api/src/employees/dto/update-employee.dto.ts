import { z } from 'zod';
import { EmploymentStatusEnum } from '@strata/validation';

// Update employee DTO - UIN cannot be changed, will be rejected if included
export const UpdateEmployeeDtoSchema = z
  .object({
    personId: z.string().min(1).optional(),
    organizationId: z.string().min(1).optional(),
    departmentId: z.string().min(1).nullable().optional(),
    positionId: z.string().min(1).nullable().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().nullable().optional(),
    status: EmploymentStatusEnum.optional(),
  })
  .strict();

export type UpdateEmployeeDto = z.infer<typeof UpdateEmployeeDtoSchema>;
