import { z } from 'zod';

export const UpdateDepartmentDtoSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable(),
    parentId: z.string().min(1).nullable(),
    organizationId: z.string().min(1),
  })
  .partial()
  .strict();

export type UpdateDepartmentDto = z.infer<typeof UpdateDepartmentDtoSchema>;
