import { z } from 'zod';
import { UpdatePersonSchema } from '@strata/validation';

export { UpdatePersonSchema };
export type UpdatePersonDto = z.infer<typeof UpdatePersonSchema>;
