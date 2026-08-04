import { z } from "zod";

export const EmploymentStatusEnum = z.enum([
  "ACTIVE",
  "ON_LEAVE",
  "TERMINATED",
  "SUSPENDED",
]);

export const EmployeeSchema = z
  .object({
    id: z.string().cuid(),
    uin: z.string().min(1),
    personId: z.string().cuid(),
    organizationId: z.string().cuid(),
    departmentId: z.string().cuid().nullable(),
    positionId: z.string().cuid().nullable(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().nullable(),
    status: EmploymentStatusEnum,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreateEmployeeSchema = z
  .object({
    uin: z.string().min(1),
    personId: z.string().cuid(),
    organizationId: z.string().cuid(),
    departmentId: z.string().cuid().nullable().optional(),
    positionId: z.string().cuid().nullable().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().nullable().optional(),
    status: EmploymentStatusEnum.optional(),
  })
  .strict();

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial().strict();

export type Employee = z.infer<typeof EmployeeSchema>;
export type CreateEmployee = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof UpdateEmployeeSchema>;
