import { z } from 'zod';

export const CreateDepartmentDtoSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    parentId: z.string().min(1).nullable().optional(),
    organizationId: z.string().min(1),
  })
  .strict();

export type CreateDepartmentDto = z.infer<typeof CreateDepartmentDtoSchema>;
