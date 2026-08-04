import { z } from "zod";

export const PersonSchema = z
  .object({
    id: z.string().cuid(),
    fullName: z.string().min(1),
    dateOfBirth: z.string().datetime(),
    email: z.string().email(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreatePersonSchema = z
  .object({
    fullName: z.string().min(1),
    dateOfBirth: z.string().datetime(),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
  })
  .strict();

export const UpdatePersonSchema = CreatePersonSchema.partial().strict();

export type Person = z.infer<typeof PersonSchema>;
export type CreatePerson = z.infer<typeof CreatePersonSchema>;
export type UpdatePerson = z.infer<typeof UpdatePersonSchema>;
