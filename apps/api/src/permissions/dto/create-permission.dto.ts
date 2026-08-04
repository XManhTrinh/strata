import { z } from 'zod';

export const CreatePermissionSchema = z.object({
  action: z.string().min(1).max(100),
  resource: z.string().min(1).max(100),
});

export type CreatePermissionDto = z.infer<typeof CreatePermissionSchema>;
