import { z } from 'zod';
import { EmploymentStatusEnum } from '@strata/validation';

// Create employee DTO - UIN is auto-generated, not provided by client
export const CreateEmployeeDtoSchema = z
  .object({
    personId: z.string().min(1),
    organizationId: z.string().min(1),
    departmentId: z.string().min(1).nullable().optional(),
    positionId: z.string().min(1).nullable().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().nullable().optional(),
    status: EmploymentStatusEnum.optional(),
  })
  .strict();

export type CreateEmployeeDto = z.infer<typeof CreateEmployeeDtoSchema>;
