import { z } from "zod";

export const UserSchema = z
  .object({
    id: z.string().cuid(),
    email: z.string().email(),
    passwordHash: z.string().min(1),
    personId: z.string().cuid(),
    isLocked: z.boolean(),
    lockedUntil: z.string().datetime().nullable(),
    failedAttempts: z.number().int().min(0),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreateUserSchema = z
  .object({
    email: z.string().email(),
    passwordHash: z.string().min(1),
    personId: z.string().cuid(),
    isLocked: z.boolean().optional(),
    lockedUntil: z.string().datetime().nullable().optional(),
    failedAttempts: z.number().int().min(0).optional(),
  })
  .strict();

export const UpdateUserSchema = CreateUserSchema.partial().strict();

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
