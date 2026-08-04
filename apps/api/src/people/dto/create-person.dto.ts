import { z } from 'zod';
import { CreatePersonSchema } from '@strata/validation';

export { CreatePersonSchema };
export type CreatePersonDto = z.infer<typeof CreatePersonSchema>;
