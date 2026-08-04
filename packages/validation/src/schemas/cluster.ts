import { z } from "zod";

export const ClusterSchema = z
  .object({
    id: z.string().cuid(),
    name: z.string().min(1),
    tribeId: z.string().cuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const CreateClusterSchema = z
  .object({
    name: z.string().min(1),
    tribeId: z.string().cuid(),
  })
  .strict();

export const UpdateClusterSchema = CreateClusterSchema.partial().strict();

export type Cluster = z.infer<typeof ClusterSchema>;
export type CreateCluster = z.infer<typeof CreateClusterSchema>;
export type UpdateCluster = z.infer<typeof UpdateClusterSchema>;
