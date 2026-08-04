import { z } from "zod";

export const DepartmentSchema = z
  .object({
    id: z.string().cuid(),
    name: z.string().min(1),
    description: z.string().nullable(),
    parentId: z.string().cuid().nullable(),
    organizationId: z.string().cuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreateDepartmentSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    parentId: z.string().cuid().nullable().optional(),
    organizationId: z.string().cuid(),
  })
  .strict();

export const UpdateDepartmentSchema =
  CreateDepartmentSchema.partial().strict();

export type Department = z.infer<typeof DepartmentSchema>;
export type CreateDepartment = z.infer<typeof CreateDepartmentSchema>;
export type UpdateDepartment = z.infer<typeof UpdateDepartmentSchema>;
