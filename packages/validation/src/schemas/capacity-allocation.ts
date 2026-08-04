import { z } from "zod";

export const CapacityAllocationSchema = z
  .object({
    id: z.string().cuid(),
    employeeId: z.string().cuid(),
    squadId: z.string().cuid(),
    percentage: z.number().int().min(1).max(100),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreateCapacityAllocationSchema = z
  .object({
    employeeId: z.string().cuid(),
    squadId: z.string().cuid(),
    percentage: z.number().int().min(1).max(100),
  })
  .strict();

export const UpdateCapacityAllocationSchema =
  CreateCapacityAllocationSchema.partial().strict();

export type CapacityAllocation = z.infer<typeof CapacityAllocationSchema>;
export type CreateCapacityAllocation = z.infer<
  typeof CreateCapacityAllocationSchema
>;
export type UpdateCapacityAllocation = z.infer<
  typeof UpdateCapacityAllocationSchema
>;
