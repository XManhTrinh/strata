import { z } from 'zod';
import { EmploymentStatusEnum } from '@strata/validation';

export const TransitionStatusDtoSchema = z
  .object({
    status: EmploymentStatusEnum,
  })
  .strict();

export type TransitionStatusDto = z.infer<typeof TransitionStatusDtoSchema>;
